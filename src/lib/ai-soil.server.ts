// Server-only Lovable AI helper for soil analysis.
export type SoilResult = {
  soil_type: "Clay" | "Loamy" | "Sandy" | "Silt" | "Unknown";
  fertility: "Low" | "Medium" | "High" | "Very High" | "Unknown";
  water_retention: string;
  ph_range: string;
  recommended_crops: string[];
  maintenance: string;
  tips: string[];
  summary: string;
};

const SYSTEM_PROMPT = `You are an agricultural soil scientist. Analyze the soil image and return ONLY JSON matching:
{
  "soil_type": "Clay" | "Loamy" | "Sandy" | "Silt" | "Unknown",
  "fertility": "Low" | "Medium" | "High" | "Very High" | "Unknown",
  "water_retention": string,       // e.g. "High (50-75%)"
  "ph_range": string,              // e.g. "6.0-7.0"
  "recommended_crops": string[],   // 3-6 crops suitable for this soil
  "maintenance": string,           // 1-2 sentences of care advice
  "tips": string[],                // 3-5 actionable tips
  "summary": string                // 1-2 sentence farmer summary
}
If the image is not soil, return soil_type "Unknown" and summary "Please upload a clear photo of soil.".
No markdown, no commentary — JSON only.`;

export async function analyzeSoilImage(imageDataUrl: string): Promise<SoilResult> {
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
            { type: "text", text: "Analyze this soil sample and return the JSON." },
            { type: "image_url", image_url: { url: imageDataUrl } },
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
  let parsed: SoilResult;
  try { parsed = JSON.parse(text) as SoilResult; }
  catch { throw new Error("AI returned an unreadable response. Please retry."); }

  return {
    soil_type: parsed.soil_type ?? "Unknown",
    fertility: parsed.fertility ?? "Unknown",
    water_retention: String(parsed.water_retention ?? ""),
    ph_range: String(parsed.ph_range ?? ""),
    recommended_crops: Array.isArray(parsed.recommended_crops) ? parsed.recommended_crops.slice(0, 8) : [],
    maintenance: String(parsed.maintenance ?? "").slice(0, 500),
    tips: Array.isArray(parsed.tips) ? parsed.tips.slice(0, 6) : [],
    summary: String(parsed.summary ?? "").slice(0, 500),
  };
}