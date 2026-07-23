// Server-only Lovable AI helper for soil analysis.
import { aiChatCompletion, safeJsonParse } from "./ai-gateway.server";
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
  const text = await aiChatCompletion({
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
  });
  const parsed = safeJsonParse<SoilResult>(text);

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