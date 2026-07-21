-- Detections table for storing crop disease analyses
CREATE TABLE public.detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crop text NOT NULL,
  image_path text NOT NULL,
  is_healthy boolean NOT NULL DEFAULT false,
  disease text,
  confidence integer,
  severity text,
  symptoms jsonb DEFAULT '[]'::jsonb,
  causes jsonb DEFAULT '[]'::jsonb,
  treatment_organic jsonb DEFAULT '[]'::jsonb,
  treatment_chemical jsonb DEFAULT '[]'::jsonb,
  prevention jsonb DEFAULT '[]'::jsonb,
  summary text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.detections TO authenticated;
GRANT ALL ON public.detections TO service_role;

ALTER TABLE public.detections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own detections" ON public.detections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own detections" ON public.detections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own detections" ON public.detections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own detections" ON public.detections
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX detections_user_created_idx ON public.detections (user_id, created_at DESC);
