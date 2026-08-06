-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  display_name TEXT,
  farm_place TEXT,
  farm_lat DOUBLE PRECISION,
  farm_lng DOUBLE PRECISION,
  primary_crop TEXT,
  language TEXT NOT NULL DEFAULT 'en',
  theme TEXT NOT NULL DEFAULT 'system',
  units TEXT NOT NULL DEFAULT 'metric',
  notify_reminders BOOLEAN NOT NULL DEFAULT true,
  notify_weather BOOLEAN NOT NULL DEFAULT true,
  notify_scans BOOLEAN NOT NULL DEFAULT true,
  share_analytics BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile delete" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Backfill existing users
INSERT INTO public.profiles (id, display_name)
SELECT id, COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)) FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- REMINDERS
CREATE TABLE public.reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  kind TEXT NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  notes TEXT,
  crop TEXT,
  detection_id UUID REFERENCES public.detections(id) ON DELETE SET NULL,
  due_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  repeat_days INTEGER,
  done BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.reminders TO authenticated;
GRANT ALL ON public.reminders TO service_role;

ALTER TABLE public.reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own reminders select" ON public.reminders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reminders insert" ON public.reminders FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders update" ON public.reminders FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reminders delete" ON public.reminders FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX reminders_user_due_idx ON public.reminders (user_id, done, due_at);

CREATE TRIGGER reminders_updated_at BEFORE UPDATE ON public.reminders
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ADMIN USER LISTING
CREATE OR REPLACE FUNCTION public.admin_list_users()
RETURNS TABLE (
  id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  roles TEXT[],
  scan_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.email::TEXT,
    u.created_at,
    u.last_sign_in_at,
    COALESCE(ARRAY(SELECT ur.role::TEXT FROM public.user_roles ur WHERE ur.user_id = u.id), '{}'::TEXT[]),
    (SELECT COUNT(*) FROM public.detections d WHERE d.user_id = u.id)
  FROM auth.users u
  ORDER BY u.created_at DESC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_list_users() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_users() TO authenticated;