-- =========================================================================
-- RAASTHA CIVIC SAFETY PLATFORM - SUPABASE DATABASE SCHEMA
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql
-- =========================================================================

-- 1. Create reports table
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  tracking_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  severity INT NOT NULL CHECK (severity BETWEEN 1 AND 5),
  exposure_count INT NOT NULL DEFAULT 3000,
  priority_score INT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  ward TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Resolved')),
  before_photo TEXT NOT NULL,
  after_photo TEXT,
  ai_classification JSONB,
  clarifications JSONB,
  resolution_notes TEXT,
  confirmations_count INT NOT NULL DEFAULT 1,
  is_clustered BOOLEAN NOT NULL DEFAULT false,
  assigned_officer TEXT,
  sla_minutes INT NOT NULL DEFAULT 240,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create status_events table for audit trail
CREATE TABLE IF NOT EXISTS status_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  event_by TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create route_requests table for real commuter exposure calculation
CREATE TABLE IF NOT EXISTS route_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  dest_name TEXT NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lng DOUBLE PRECISION NOT NULL,
  chosen_route_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS) & Public Policies for Demo
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE status_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to reports" ON reports FOR SELECT USING (true);
CREATE POLICY "Allow public insert to reports" ON reports FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update to reports" ON reports FOR UPDATE USING (true);

CREATE POLICY "Allow public read to status_events" ON status_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert to status_events" ON status_events FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read to route_requests" ON route_requests FOR SELECT USING (true);
CREATE POLICY "Allow public insert to route_requests" ON route_requests FOR INSERT WITH CHECK (true);

-- 5. Enable Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE reports;
