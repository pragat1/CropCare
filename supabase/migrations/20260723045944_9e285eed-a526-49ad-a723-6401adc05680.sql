
ALTER TABLE public.detections
  ADD COLUMN IF NOT EXISTS plant_part text,
  ADD COLUMN IF NOT EXISTS reasoning text,
  ADD COLUMN IF NOT EXISTS immediate_actions jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS recovery_time text,
  ADD COLUMN IF NOT EXISTS alternatives jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS differentials jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS treatment_organic_detailed jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS treatment_chemical_detailed jsonb DEFAULT '[]'::jsonb;
