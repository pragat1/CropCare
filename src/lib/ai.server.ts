// Server-only Lovable AI helper for leaf disease analysis.
import type { Database } from "@/integrations/supabase/types";

export type DetectionResult = {
  is_healthy: boolean;
  disease: string | null;
  confidence: number;
  severity: "low" | "medium" | "high" | null;
  symptoms: string[];
  causes: string[];
  treatment_organic: string[];
  treatment_chemical: string[];
  prevention: string[];
  summary: string;
};

const SYSTEM_PROMPT = `You are an expert agronomist and plant pathologist. Analyze the leaf image and identify any disease.
Respond ONLY as JSON matching this exact schema:
{
  "is_healthy": boolean,
  "disease": string | null,           // null if healthy; otherwise the common disease name
  "confidence": number,                // 0-100
  "severity": "low" | "medium" | "high" | null,
  "symptoms": string[],                // 2-5 short observed symptoms
  "causes": string[],                  // 2-4 likely causes (pathogen, conditions)
  "treatment_organic": string[],       // 2-4 organic treatment steps
  "treatment_chemical": string[],      // 2-4 chemical treatment steps (name active ingredient)
  "prevention": string[],              // 2-4 prevention tips
  "summary": string                    // 1-2 sentence farmer-friendly summary
}
If the image is not a plant leaf, return { "is_healthy": false, "disease": "Not a leaf", "confidence": 0, "severity": null, "symptoms": [], "causes": ["Image does not appear to be a crop leaf"], "treatment_organic": [], "treatment_chemical": [], "prevention": [], "summary": "Please upload a clear photo of a crop leaf." }.
Do not include markdown fences, commentary, or any text outside the JSON.`;

export async function analyzeLeafImage(imageDataUrl: string, crop: string): Promise<DetectionResult> {
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
            { type: "text", text: `Crop: ${crop}. Analyze this leaf image and return the JSON.` },
            { type: "image_url", image_url: { url: imageDataUrl } },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    if (res.status === 429) throw new Error("Rate limit exceeded — please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`AI request failed [${res.status}]: ${body.slice(0, 300)}`);
  }

  const payload = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = payload.choices?.[0]?.message?.content ?? "";
  const cleaned = text.replace(/^```json\s*|\s*```$/g, "").trim();

  let parsed: DetectionResult;
  try {
    parsed = JSON.parse(cleaned) as DetectionResult;
  } catch {
    throw new Error("AI returned an unreadable response. Please retry.");
  }

  return {
    is_healthy: !!parsed.is_healthy,
    disease: parsed.disease ?? null,
    confidence: Math.max(0, Math.min(100, Math.round(Number(parsed.confidence) || 0))),
    severity: parsed.severity ?? null,
    symptoms: Array.isArray(parsed.symptoms) ? parsed.symptoms.slice(0, 8) : [],
    causes: Array.isArray(parsed.causes) ? parsed.causes.slice(0, 8) : [],
    treatment_organic: Array.isArray(parsed.treatment_organic) ? parsed.treatment_organic.slice(0, 8) : [],
    treatment_chemical: Array.isArray(parsed.treatment_chemical) ? parsed.treatment_chemical.slice(0, 8) : [],
    prevention: Array.isArray(parsed.prevention) ? parsed.prevention.slice(0, 8) : [],
    summary: String(parsed.summary ?? "").slice(0, 600),
  };
}

export type { Database };