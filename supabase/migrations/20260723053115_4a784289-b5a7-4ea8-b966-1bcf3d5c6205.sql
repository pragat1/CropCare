
REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(UUID, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;

-- Explicit deny policy on rate_limits so RLS-enabled-no-policy linter is satisfied.
-- (service_role bypasses RLS; authenticated should never touch this table.)
DROP POLICY IF EXISTS "no user access" ON public.rate_limits;
CREATE POLICY "no user access" ON public.rate_limits
  FOR ALL TO authenticated, anon USING (false) WITH CHECK (false);
