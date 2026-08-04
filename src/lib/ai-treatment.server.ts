// Server-only Lovable AI helper for before/after treatment comparison.
import { aiChatCompletion, safeJsonParse } from "./ai-gateway.server";
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

export async function compareTreatmentImages(
  beforeUrl: string,
  afterUrl: string,
  crop: string,
): Promise<TreatmentComparison> {
  const text = await aiChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Crop: ${crop}. First image is BEFORE treatment, second image is AFTER. Return the JSON.`,
          },
          { type: "image_url", image_url: { url: beforeUrl } },
          { type: "image_url", image_url: { url: afterUrl } },
        ],
      },
    ],
  });
  const parsed = safeJsonParse<TreatmentComparison>(text);

  const pct = Math.max(-100, Math.min(100, Math.round(Number(parsed.improvement_percent) || 0)));
  const status: TreatmentComparison["status"] = ["Improved", "No Change", "Worse"].includes(
    parsed.status,
  )
    ? parsed.status
    : pct > 10
      ? "Improved"
      : pct < -10
        ? "Worse"
        : "No Change";
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
