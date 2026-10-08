-- ==============================================================================
-- Raastha Civic Safety Platform - Supabase Database Schema & Storage Setup
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

-- Create helpful indexes for performance
create index if not exists idx_issues_status on public.issues(status);
create index if not exists idx_issues_created_at on public.issues(created_at desc);
create index if not exists idx_issues_tracking_id on public.issues(tracking_id);
create index if not exists idx_status_events_issue_id on public.status_events(issue_id);

-- 6. REALTIME: Enable Supabase Realtime for live cross-device incident updates
alter publication supabase_realtime add table public.issues;
alter publication supabase_realtime add table public.status_events;

-- 7. ROW LEVEL SECURITY (RLS) POLICIES
alter table public.issues enable row level security;
alter table public.status_events enable row level security;

-- Policy: Anyone (citizens, officers, guests) can view issues
create policy "Anyone can select issues"
  on public.issues
  for select
  using (true);

-- Policy: Anyone can report an issue, but only with initial status 'reported'
create policy "Anyone can insert reported issues"
  on public.issues
  for insert
  with check (status = 'reported');

-- DEMO POLICY (Civic Hackathon Mode):
-- Allows anonymous updates so demonstration dispatch & AI fix verification
-- can be tested directly from the admin dashboard without configuring full Supabase Auth.
create policy "DEMO: Anyone can update issues for hackathon testing"
  on public.issues
  for update
  using (true)
  with check (true);

-- PRODUCTION POLICY (Commented out for hackathon demo):
-- In strict production deployment, only authenticated GHMC officers can update status:
/*
create policy "Officers can update issues in production"
  on public.issues
  for update
  to authenticated
  using (true)
  with check (true);
*/

-- Status Events RLS
create policy "Anyone can select status events"
  on public.status_events
  for select
  using (true);

create policy "Anyone can insert status events"
  on public.status_events
  for insert
  with check (true);

-- 8. STORAGE BUCKET: issue-photos
-- Insert bucket record if it doesn't already exist
insert into storage.buckets (id, name, public)
values ('issue-photos', 'issue-photos', true)
on conflict (id) do update set public = true;

-- Storage Policy: Anyone can view issue photos
create policy "Public can view issue photos"
  on storage.objects
  for select
  using (bucket_id = 'issue-photos');

-- Storage Policy: Anyone can upload photos to issue-photos
create policy "Public can upload issue photos"
  on storage.objects
  for insert
  with check (bucket_id = 'issue-photos');
