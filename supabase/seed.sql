-- ==============================================================================
-- Optional Database Seeding Script for Raastha Civic Safety (Hyderabad GHMC)
-- Run this script in the Supabase SQL Editor if you wish to populate initial demo data.
-- ==============================================================================

insert into public.issues (
  id,
  tracking_id,
  type,
  severity,
  severity_source,
  description,
  lat,
  lng,
  ward,
  photo_url,
  ai_summary,
  status,
  is_sample,
  commuter_estimate
) values
(
  '3e0c0001-0000-4000-8000-000000000001',
  'SAMPLE-GHMC-01',
  'pothole',
  5,
  'ai',
  'Deep pothole at Cyber Towers Incline bottlenecking evening traffic.',
  17.4504,
  78.3808,
  'Circle 20 - Serilingampally (Madhapur & Hitec City)',
  'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80',
  'Severe road cavity detected. 2-wheeler spill hazard during evening rush hour.',
  'reported',
  true,
  6500
),
(
  '3e0c0002-0000-4000-8000-000000000002',
  'SAMPLE-GHMC-02',
  'streetlight',
  4,
  'ai',
  'Extinguished luminaire pole array near Road No. 36 approach.',
  17.4259,
  78.4215,
  'Circle 18 - Jubilee Hills & Banjara Hills',
  'https://images.unsplash.com/photo-1509114397022-ed747cca3f65?w=600&auto=format&fit=crop&q=80',
  'Unlit dark stretch. Low illumination along pedestrian path.',
  'dispatched',
  true,
  4000
),
(
  '3e0c0003-0000-4000-8000-000000000003',
  'SAMPLE-GHMC-03',
  'other',
  5,
  'manual',
  'Damaged drainage chamber opening near Charminar South Gate.',
  17.3616,
  78.4747,
  'Circle 10 - Charminar & Old City',
  'https://images.unsplash.com/photo-1584467735871-8e85353a8413?w=600&auto=format&fit=crop&q=80',
  'Exposed opening on pedestrian carriageway.',
  'in_progress',
  true,
  5000
)
on conflict (id) do nothing;
