REVOKE EXECUTE ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rate_limit_hit(uuid, text, integer, integer) TO service_role;
CREATE INDEX IF NOT EXISTS idx_assistant_messages_user_created ON public.assistant_messages (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON public.audit_logs (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_category_sort ON public.content_items (category, published, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_items_category_slug ON public.content_items (category, slug);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user_created ON public.quiz_attempts (user_id, created_at DESC);