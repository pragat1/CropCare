
CREATE TABLE public.soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  image_path text NOT NULL,
  soil_type text,
  fertility text,
  water_retention text,
  ph_range text,
  recommended_crops jsonb DEFAULT '[]'::jsonb,
  maintenance text,
  tips jsonb DEFAULT '[]'::jsonb,
  summary text,
  raw jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.soil_analyses TO authenticated;
GRANT ALL ON public.soil_analyses TO service_role;
ALTER TABLE public.soil_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own soil select" ON public.soil_analyses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own soil insert" ON public.soil_analyses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own soil update" ON public.soil_analyses FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own soil delete" ON public.soil_analyses FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.treatment_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  crop text,
  before_image_path text NOT NULL,
  after_image_path text NOT NULL,
  status text,
  improvement_percent integer,
  notes text,
  analysis jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.treatment_progress TO authenticated;
GRANT ALL ON public.treatment_progress TO service_role;
ALTER TABLE public.treatment_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tp select" ON public.treatment_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tp insert" ON public.treatment_progress FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tp update" ON public.treatment_progress FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own tp delete" ON public.treatment_progress FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL,
  total integer NOT NULL,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.quiz_attempts TO authenticated;
GRANT ALL ON public.quiz_attempts TO service_role;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quiz select" ON public.quiz_attempts FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own quiz insert" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own quiz delete" ON public.quiz_attempts FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Storage policies for new buckets
CREATE POLICY "soil read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'soil-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "soil insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'soil-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "soil delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'soil-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "tp read own" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'treatment-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "tp insert own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'treatment-images' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "tp delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'treatment-images' AND auth.uid()::text = (storage.foldername(name))[1]);
