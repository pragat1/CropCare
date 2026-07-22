// Server-only Lovable AI helper for before/after treatment comparison.
export type TreatmentComparison = {
  status: "Improved" | "No Change" | "Worse";
  improvement_percent: number; // -100..100
  before_health: string;
  after_health: string;
  observations: string[];
  next_steps: string[];
  summary: string;
};

const SYSTEM_PROMPT = `You are a plant pathologist reviewing treatment progress. Given a BEFORE and AFTER image of the same crop area, compare them and return ONLY JSON:
{
  "status": "Improved" | "No Change" | "Worse",
  "improvement_percent": number,     // -100..100, positive = better
  "before_health": string,           // 1 sentence describing the before image
  "after_health": string,            // 1 sentence describing the after image
  "observations": string[],          // 2-5 concrete visual differences
  "next_steps": string[],            // 2-4 recommended actions
  "summary": string                  // 1-2 sentence farmer summary
}
No markdown, no commentary — JSON only.`;

export async function compareTreatmentImages(beforeUrl: string, afterUrl: string, crop: string): Promise<TreatmentComparison> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: `Crop: ${crop}. First image is BEFORE treatment, second image is AFTER. Return the JSON.` },
            { type: "image_url", image_url: { url: beforeUrl } },
            { type: "image_url", image_url: { url: afterUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`AI request failed [${res.status}]`);
  }
  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = (payload.choices?.[0]?.message?.content ?? "").replace(/^```json\s*|\s*```$/g, "").trim();
  let parsed: TreatmentComparison;
  try { parsed = JSON.parse(text) as TreatmentComparison; }
  catch { throw new Error("AI returned an unreadable response. Please retry."); }

  const pct = Math.max(-100, Math.min(100, Math.round(Number(parsed.improvement_percent) || 0)));
  const status: TreatmentComparison["status"] = ["Improved", "No Change", "Worse"].includes(parsed.status)
    ? parsed.status : (pct > 10 ? "Improved" : pct < -10 ? "Worse" : "No Change");
  return {
    status,
    improvement_percent: pct,
    before_health: String(parsed.before_health ?? "").slice(0, 300),
    after_health: String(parsed.after_health ?? "").slice(0, 300),
    observations: Array.isArray(parsed.observations) ? parsed.observations.slice(0, 6) : [],
    next_steps: Array.isArray(parsed.next_steps) ? parsed.next_steps.slice(0, 6) : [],
    summary: String(parsed.summary ?? "").slice(0, 500),
  };
}