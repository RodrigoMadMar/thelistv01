-- ============================================================
-- Migration: Create candidates table for scouting agent
-- ============================================================

CREATE TABLE public.candidates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  category        text,
  location        text,
  description     text,
  instagram       text,
  website         text,
  email           text,
  phone           text,
  score           numeric(3,1) DEFAULT 0,
  reason          text,
  source_query    text,
  status          text DEFAULT 'new'
                    CHECK (status IN ('new', 'contacted', 'interested', 'rejected', 'onboarded')),
  contacted_at    timestamptz,
  outreach_email  text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access" ON public.candidates
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Index for common queries
CREATE INDEX idx_candidates_status ON public.candidates(status);
CREATE INDEX idx_candidates_score  ON public.candidates(score DESC);
