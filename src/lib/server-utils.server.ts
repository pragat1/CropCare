// Shared server-only helpers for image validation, rate limiting, and audit logging.
// Import only from server-fn handlers or other *.server modules.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Sb = SupabaseClient<Database>;

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

/** Throws if the path does not start with `${userId}/` — prevents cross-user reads. */
export function assertOwnedPath(path: string, userId: string): void {
  if (!path || typeof path !== "string" || !path.startsWith(`${userId}/`)) {
    throw new Error("Invalid image path");
  }
  if (path.includes("..") || path.includes("//")) {
    throw new Error("Invalid image path");
  }
}

/**
 * Download an image from a private bucket, validate mime + size, and return a data URL.
 * RLS applies because we use the caller's supabase client.
 */
export async function downloadImageAsDataUrl(
  supabase: Sb,
  bucket: string,
  path: string,
): Promise<{ dataUrl: string; bytes: number; mime: string }> {
  const { data: blob, error } = await supabase.storage.from(bucket).download(path);
  if (error || !blob) throw new Error(error?.message ?? "Failed to read image");

  const mime = blob.type || "image/jpeg";
  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error(`Unsupported image type: ${mime}`);
  }
  const bytes = blob.size;
  if (bytes > MAX_IMAGE_BYTES) {
    throw new Error(`Image is too large (${(bytes / 1024 / 1024).toFixed(1)} MB, max 8 MB).`);
  }
  if (bytes < 500) {
    throw new Error("Image is empty or corrupt.");
  }
  const buf = await blob.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  return { dataUrl: `data:${mime};base64,${b64}`, bytes, mime };
}

/**
 * Atomic per-user rate limit check. Uses SECURITY DEFINER function via service-role client.
 * Throws with a friendly message when the caller is over the limit.
 */
export async function enforceRateLimit(
  userId: string,
  action: string,
  limitPerMinute: number,
): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("rate_limit_hit", {
    _user: userId,
    _action: action,
    _limit: limitPerMinute,
    _window_seconds: 60,
  });
  if (error) {
    // Fail-open on rate-limit infra errors — log and continue.
    console.error("[rate-limit] rpc error", error);
    return;
  }
  if (data === false) {
    throw new Error(`You've hit the limit for this action. Please wait a minute and try again.`);
  }
}

/** Append an audit-log row via service role. Never throws. */
export async function auditLog(entry: {
  userId: string | null;
  action: string;
  resource?: string | null;
  status?: "success" | "error" | "denied";
  latencyMs?: number;
  error?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("audit_logs").insert({
      user_id: entry.userId,
      action: entry.action,
      resource: entry.resource ?? null,
      status: entry.status ?? "success",
      latency_ms: entry.latencyMs ?? null,
      error: entry.error ?? null,
      metadata: JSON.parse(JSON.stringify(entry.metadata ?? {})),
    });
  } catch (err) {
    console.error("[audit] failed to write audit log", err);
  }
}

/**
 * Wrap a server-fn handler body with timing, structured logging, and audit-log writes.
 * The handler receives its normal args; this helper only observes.
 */
export async function withAudit<T>(
  ctx: { userId: string; action: string; resource?: string; metadata?: Record<string, unknown> },
  fn: () => Promise<T>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    const latencyMs = Date.now() - start;
    console.log(
      JSON.stringify({ level: "info", action: ctx.action, userId: ctx.userId, latencyMs, status: "success" }),
    );
    void auditLog({
      userId: ctx.userId,
      action: ctx.action,
      resource: ctx.resource,
      status: "success",
      latencyMs,
      metadata: ctx.metadata,
    });
    return result;
  } catch (err) {
    const latencyMs = Date.now() - start;
    const message = err instanceof Error ? err.message : String(err);
    console.error(
      JSON.stringify({ level: "error", action: ctx.action, userId: ctx.userId, latencyMs, error: message }),
    );
    void auditLog({
      userId: ctx.userId,
      action: ctx.action,
      resource: ctx.resource,
      status: "error",
      latencyMs,
      error: message.slice(0, 500),
      metadata: ctx.metadata,
    });
    throw err;
  }
}
