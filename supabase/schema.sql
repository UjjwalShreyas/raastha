-- ==============================================================================
-- Raastha Civic Safety Platform - Supabase Database Schema & Storage Setup
--
-- IDEMPOTENT: safe to re-run on an existing project (it drops and recreates
-- policies, adds new columns with IF NOT EXISTS, and replaces functions).
--
-- Security model
--   * Citizens (anon)  : read issues, create issues with status 'reported', upload
--                        report photos to issues/*.
--   * Authorities      : signed-in Supabase Auth users (role 'authenticated').
--                        Only they can update issues, write status_events and
--                        upload repair photos to repairs/*.
--   * Disable public sign-ups in the dashboard (Authentication > Providers >
--     Email > "Allow new users to sign up" OFF) so only users you create by hand
--     are authorities.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- 2. HELPER FUNCTION: Generate 8-character uppercase random tracking ID
create or replace function generate_tracking_id()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := 'RST-';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  end loop;
  return result;
end;
$$ language plpgsql volatile;

-- 3. HELPER FUNCTION & TRIGGER: Auto-update updated_at timestamp
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 4. TABLE: issues
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  tracking_id text unique not null default generate_tracking_id(),
  type text not null check (type in ('pothole', 'streetlight', 'garbage', 'waterlogging', 'other')),
  severity int not null check (severity between 1 and 5),
  severity_source text not null check (severity_source in ('ai', 'manual')),
  description text,
  lat double precision not null,
  lng double precision not null,
  ward text,
  photo_url text not null,
  after_photo_url text,
  ai_summary text,
  status text not null default 'reported' check (status in ('reported', 'dispatched', 'in_progress', 'resolved', 'rejected')),
  is_sample boolean not null default false,
  created_at timestamp with time zone default now() not null,
  updated_at timestamp with time zone default now() not null
);

-- Columns added for authority dispatch (safe on existing tables)
alter table public.issues add column if not exists is_sample boolean not null default false;
-- Reporter's own estimate of daily commuters (NOT measured). Used for exposure ranking.
alter table public.issues add column if not exists commuter_estimate int not null default 3500
  check (commuter_estimate >= 0);
alter table public.issues add column if not exists assignee text;
alter table public.issues add column if not exists sla_due_at timestamp with time zone;

-- Trigger for updated_at on issues
drop trigger if exists set_issues_updated_at on public.issues;
create trigger set_issues_updated_at
before update on public.issues
for each row
execute function update_updated_at_column();

-- 5. TABLE: status_events (Audit Trail)
create table if not exists public.status_events (
  id uuid primary key default gen_random_uuid(),
  issue_id uuid not null references public.issues(id) on delete cascade,
  status text not null,
  note text,
  created_at timestamp with time zone default now() not null
);
alter table public.status_events add column if not exists actor text;

-- Create helpful indexes for performance
create index if not exists idx_issues_status on public.issues(status);
create index if not exists idx_issues_created_at on public.issues(created_at desc);
create index if not exists idx_issues_tracking_id on public.issues(tracking_id);
create index if not exists idx_status_events_issue_id on public.status_events(issue_id);

-- 6. TRIGGER: log the initial 'reported' event server-side, so citizens never
-- need insert rights on status_events.
create or replace function public.log_issue_reported()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.status_events (issue_id, status, note, actor)
  values (new.id, 'reported', 'Citizen report submitted', 'citizen');
  return new;
end;
$$;

drop trigger if exists issues_log_reported on public.issues;
create trigger issues_log_reported
after insert on public.issues
for each row
execute function public.log_issue_reported();

-- 7. RPC: advance_issue_status
-- The ONLY path the app uses to change status. One transaction updates the issue
-- AND writes the status_events row, enforces the allowed transitions
--   reported -> dispatched -> in_progress -> resolved   (reported -> rejected)
-- and runs as the caller (SECURITY INVOKER), so RLS still applies.
create or replace function public.advance_issue_status(
  p_issue_id uuid,
  p_status text,
  p_assignee text default null,
  p_sla_due_at timestamp with time zone default null,
  p_after_photo_url text default null,
  p_note text default null
)
returns public.issues
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_issue public.issues;
  v_actor text := coalesce(auth.jwt() ->> 'email', 'unknown');
begin
  if auth.role() <> 'authenticated' then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into v_issue from public.issues where id = p_issue_id for update;
  if not found then
    raise exception 'Issue not found';
  end if;

  if not (
    (v_issue.status = 'reported'    and p_status in ('dispatched', 'rejected')) or
    (v_issue.status = 'dispatched'  and p_status = 'in_progress') or
    (v_issue.status = 'in_progress' and p_status = 'resolved')
  ) then
    raise exception 'Invalid status transition: % -> %', v_issue.status, p_status;
  end if;

  if p_status = 'dispatched' and (coalesce(trim(p_assignee), '') = '' or p_sla_due_at is null) then
    raise exception 'Dispatch requires an assignee and an SLA deadline';
  end if;

  if p_status = 'resolved' and coalesce(p_after_photo_url, v_issue.after_photo_url) is null then
    raise exception 'Resolving requires an after-repair photo';
  end if;

  update public.issues
     set status          = p_status,
         assignee        = case when p_status = 'dispatched' then trim(p_assignee) else assignee end,
         sla_due_at      = case when p_status = 'dispatched' then p_sla_due_at else sla_due_at end,
         after_photo_url = coalesce(p_after_photo_url, after_photo_url)
   where id = p_issue_id
   returning * into v_issue;

  insert into public.status_events (issue_id, status, note, actor)
  values (p_issue_id, p_status, p_note, v_actor);

  return v_issue;
end;
$$;

revoke all on function public.advance_issue_status(uuid, text, text, timestamp with time zone, text, text) from public, anon;
grant execute on function public.advance_issue_status(uuid, text, text, timestamp with time zone, text, text) to authenticated;

-- 8. REALTIME: Enable Supabase Realtime (idempotent)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'issues'
  ) then
    alter publication supabase_realtime add table public.issues;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'status_events'
  ) then
    alter publication supabase_realtime add table public.status_events;
  end if;
end $$;

-- 9. ROW LEVEL SECURITY
alter table public.issues enable row level security;
alter table public.status_events enable row level security;

-- Remove every policy from earlier versions (including the DEMO anon update policy)
drop policy if exists "Anyone can select issues" on public.issues;
drop policy if exists "Anyone can insert reported issues" on public.issues;
drop policy if exists "DEMO: Anyone can update issues for hackathon testing" on public.issues;
drop policy if exists "Officers can update issues in production" on public.issues;
drop policy if exists "Authorities can update issues" on public.issues;
drop policy if exists "Anyone can select status events" on public.status_events;
drop policy if exists "Anyone can insert status events" on public.status_events;
drop policy if exists "Authorities can insert status events" on public.status_events;

-- issues: everyone can read
create policy "Anyone can select issues"
  on public.issues
  for select
  using (true);

-- issues: anyone can report, but only as a fresh, unassigned, non-sample report
create policy "Anyone can insert reported issues"
  on public.issues
  for insert
  with check (
    status = 'reported'
    and is_sample = false
    and assignee is null
    and sla_due_at is null
    and after_photo_url is null
  );

-- issues: ONLY signed-in authorities can update (status, assignee, SLA, after photo)
create policy "Authorities can update issues"
  on public.issues
  for update
  to authenticated
  using (true)
  with check (true);

-- status_events: everyone can read; only signed-in authorities can write
-- (the initial 'reported' row is written by the issues_log_reported trigger)
create policy "Anyone can select status events"
  on public.status_events
  for select
  using (true);

create policy "Authorities can insert status events"
  on public.status_events
  for insert
  to authenticated
  with check (true);

-- 10. STORAGE BUCKET: issue-photos
insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', true)
on conflict (id) do update set public = true;

drop policy if exists "Public can view issue photos" on storage.objects;
drop policy if exists "Public can upload issue photos" on storage.objects;
drop policy if exists "Anyone can upload report photos" on storage.objects;
drop policy if exists "Authorities can upload repair photos" on storage.objects;

-- Anyone can view photos
create policy "Public can view issue photos"
  on storage.objects
  for select
  using (bucket_id = 'issue-photos');

-- Citizens may only upload into the issues/ folder
create policy "Anyone can upload report photos"
  on storage.objects
  for insert
  with check (
    bucket_id = 'issue-photos'
    and (storage.foldername(name))[1] = 'issues'
  );

-- Only signed-in authorities may upload repair proof into repairs/
create policy "Authorities can upload repair photos"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'issue-photos'
    and (storage.foldername(name))[1] = 'repairs'
  );

-- 11. TABLE: route_requests (Anonymous Corridor Navigation Demand)
-- Logs route requests (no user identity) to measure genuine commuter exposure
create table if not exists public.route_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now() not null,
  origin_lat double precision not null,
  origin_lng double precision not null,
  dest_lat double precision not null,
  dest_lng double precision not null,
  waypoints jsonb, -- simplified array of [lat, lng] points sampled along the route
  distance_meters double precision,
  duration_seconds double precision
);

create index if not exists idx_route_requests_created_at on public.route_requests(created_at desc);

alter table public.route_requests enable row level security;

drop policy if exists "Anyone can insert route requests" on public.route_requests;
create policy "Anyone can insert route requests"
  on public.route_requests
  for insert
  with check (true);

drop policy if exists "Anyone can select route requests" on public.route_requests;
create policy "Anyone can select route requests"
  on public.route_requests
  for select
  using (true);

