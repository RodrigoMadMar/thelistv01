-- Add sources column to track where candidates were found
ALTER TABLE public.candidates
  ADD COLUMN IF NOT EXISTS sources text[] DEFAULT '{}';
