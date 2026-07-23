// Shared server-only helper for Lovable AI Gateway chat completions.
// Handles auth, timeouts, retries with exponential backoff, and JSON parsing.

export type ChatContent =
  | string
  | Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string } }
    >;

export type ChatMessage = { role: "system" | "user" | "assistant"; content: ChatContent };

export type AiGatewayError = Error & { status?: number; retryable?: boolean };

const DEFAULT_MODEL = "google/gemini-3-flash-preview";
const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

function makeError(msg: string, status?: number, retryable = false): AiGatewayError {
  const e = new Error(msg) as AiGatewayError;
  e.status = status;
  e.retryable = retryable;
  return e;
}

/** Extract the first JSON object from a possibly noisy string. */
export function safeJsonParse<T = unknown>(text: string): T {
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as T;
      } catch {
        /* fallthrough */
      }
    }
    throw makeError("AI returned an unreadable response. Please retry.");
  }
}

export type CompletionOptions = {
  model?: string;
  messages: ChatMessage[];
  /** ms per attempt (aborts the fetch) */
  timeoutMs?: number;
  /** total attempts including the first */
  attempts?: number;
  /** enforce JSON response */
  json?: boolean;
};

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Call the Lovable AI Gateway with retry on transient failures.
 * Retries on 5xx, network errors, and timeouts. Never retries on 4xx auth/quota errors.
 */
export async function aiChatCompletion(opts: CompletionOptions): Promise<string> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw makeError("Missing LOVABLE_API_KEY", 500);

  const attempts = Math.max(1, opts.attempts ?? 3);
  const timeoutMs = opts.timeoutMs ?? 45_000;
  const body = JSON.stringify({
    model: opts.model ?? DEFAULT_MODEL,
    messages: opts.messages,
    ...(opts.json !== false ? { response_format: { type: "json_object" } } : {}),
  });

  let lastError: AiGatewayError | undefined;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const res = await fetch(GATEWAY_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body,
        signal: ac.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        // Non-retryable client errors.
        if (res.status === 429) throw makeError("Rate limit exceeded — please try again in a moment.", 429);
        if (res.status === 402) throw makeError("AI credits exhausted. Please add credits to continue.", 402);
        if (res.status === 401 || res.status === 403) throw makeError("AI provider rejected the request.", res.status);
        if (res.status >= 500) {
          lastError = makeError(`AI upstream error [${res.status}]: ${text.slice(0, 200)}`, res.status, true);
        } else {
          throw makeError(`AI request failed [${res.status}]: ${text.slice(0, 200)}`, res.status);
        }
      } else {
        const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = payload.choices?.[0]?.message?.content;
        if (!content) {
          lastError = makeError("AI returned an empty response.", 502, true);
        } else {
          return content;
        }
      }
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") {
        lastError = makeError("AI request timed out.", 504, true);
      } else if ((err as AiGatewayError).retryable !== undefined) {
        if (!(err as AiGatewayError).retryable) throw err;
        lastError = err as AiGatewayError;
      } else {
        lastError = makeError((err as Error).message ?? "AI network error", 502, true);
      }
    }

    if (attempt < attempts) await sleep(300 * 2 ** (attempt - 1));
  }
  throw lastError ?? makeError("AI request failed after retries.", 502);
}
