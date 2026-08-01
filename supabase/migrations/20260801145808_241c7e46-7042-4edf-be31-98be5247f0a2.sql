CREATE TABLE public.assistant_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user','assistant')),
  content TEXT NOT NULL,
  lang TEXT NOT NULL DEFAULT 'en',
  disease_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  image_path TEXT,
  risk JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;

ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own assistant messages select" ON public.assistant_messages
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own assistant messages insert" ON public.assistant_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own assistant messages delete" ON public.assistant_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX assistant_messages_user_created_idx
  ON public.assistant_messages (user_id, created_at DESC);