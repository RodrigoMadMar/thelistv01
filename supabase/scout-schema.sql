-- ============================================================
-- thelist.cl — Scout Schema
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT,
  source TEXT NOT NULL,
  source_id TEXT,
  category TEXT[],
  city TEXT NOT NULL,
  commune TEXT,
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rating DOUBLE PRECISION,
  review_count INTEGER,
  price_level INTEGER,
  website TEXT,
  phone TEXT,
  instagram TEXT,
  email TEXT,
  email_source TEXT,
  email_confidence DOUBLE PRECISION,
  fit_score INTEGER,
  fit_reasoning TEXT,
  status TEXT DEFAULT 'new',
  photos TEXT[],
  google_types TEXT[],
  description TEXT,
  generated_email_subject TEXT,
  generated_email_body TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_city ON leads(city);
CREATE INDEX IF NOT EXISTS idx_leads_source ON leads(source);
CREATE INDEX IF NOT EXISTS idx_leads_source_id ON leads(source_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_source_dedup ON leads(source, source_id);

CREATE TABLE IF NOT EXISTS scrape_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source TEXT NOT NULL,
  city TEXT,
  category TEXT,
  leads_found INTEGER DEFAULT 0,
  leads_new INTEGER DEFAULT 0,
  leads_enriched INTEGER DEFAULT 0,
  leads_emailed INTEGER DEFAULT 0,
  duration_seconds DOUBLE PRECISION,
  errors JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- If leads table already exists without email columns, run:
-- ALTER TABLE leads ADD COLUMN IF NOT EXISTS generated_email_subject TEXT;
-- ALTER TABLE leads ADD COLUMN IF NOT EXISTS generated_email_body TEXT;
