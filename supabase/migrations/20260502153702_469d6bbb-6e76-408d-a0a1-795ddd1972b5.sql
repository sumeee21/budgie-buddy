ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'budget'
  CHECK (mode IN ('budget','tracking'));