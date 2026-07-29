ALTER TABLE public.detections
  ADD COLUMN IF NOT EXISTS weather jsonb,
  ADD COLUMN IF NOT EXISTS weather_risk jsonb;