
-- Indexes for common query patterns (user + recency)
CREATE INDEX IF NOT EXISTS idx_detections_user_created ON public.detections (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_soil_user_created ON public.soil_analyses (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_treatment_user_created ON public.treatment_progress (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_user_created ON public.quiz_attempts (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_detections_crop ON public.detections (user_id, crop);

-- Audit logs: append-only record of privileged actions and AI calls
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  action TEXT NOT NULL,           -- e.g. "detection.analyze", "soil.analyze", "auth.signin"
  resource TEXT,                  -- optional resource identifier (row id, path)
  status TEXT NOT NULL DEFAULT 'success',  -- success | error | denied
  latency_ms INTEGER,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
-- Users can read only their own audit rows; only service role writes.
CREATE POLICY "own audit read" ON public.audit_logs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_audit_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON public.audit_logs (action, created_at DESC);

-- Rate limit counters (per user + action, minute bucket)
CREATE TABLE IF NOT EXISTS public.rate_limits (
  user_id UUID NOT NULL,
  action TEXT NOT NULL,
  bucket TIMESTAMPTZ NOT NULL,   -- truncated to the minute
  count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, action, bucket)
);
GRANT ALL ON public.rate_limits TO service_role;
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
-- No authenticated policies: only service role writes/reads.
CREATE INDEX IF NOT EXISTS idx_rate_limits_bucket ON public.rate_limits (bucket);

-- Atomic increment-and-check rate limiter. Returns TRUE when under limit.
CREATE OR REPLACE FUNCTION public.rate_limit_hit(
  _user UUID,
  _action TEXT,
  _limit INTEGER,
  _window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _bucket TIMESTAMPTZ := date_trunc('minute', now());
  _count INTEGER;
BEGIN
  INSERT INTO public.rate_limits (user_id, action, bucket, count)
  VALUES (_user, _action, _bucket, 1)
  ON CONFLICT (user_id, action, bucket)
  DO UPDATE SET count = public.rate_limits.count + 1
  RETURNING count INTO _count;

  -- Opportunistic cleanup of buckets older than 1 day.
  DELETE FROM public.rate_limits WHERE bucket < now() - interval '1 day';

  RETURN _count <= _limit;
END;
$$;
REVOKE ALL ON FUNCTION public.rate_limit_hit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(UUID, TEXT, INTEGER, INTEGER) TO service_role;
