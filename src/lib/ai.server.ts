// Server-only Lovable AI helper for crop disease analysis.
import type { Database } from "@/integrations/supabase/types";
import { aiChatCompletion, safeJsonParse } from "./ai-gateway.server";

export type Severity = "low" | "medium" | "high";
export type PlantPart = "leaf" | "stem" | "fruit" | "root" | "flower" | "whole plant" | "unknown";

export type TreatmentPlan = {
  name: string; // product / method name
  active_ingredient?: string; // e.g. "Copper hydroxide" (chemical only)
  dosage: string; // e.g. "2 g/L of water"
  frequency: string; // e.g. "Every 7 days"
  precautions: string; // safety notes
};

export type DiseaseCandidate = {
  disease: string;
  confidence: number; // 0-100
  reasoning: string; // why this disease was predicted
};

export type Differential = {
  disease: string;
  differentiator: string; // how to tell it apart from the top prediction
};

export type DetectionResult = {
  is_healthy: boolean;
  plant_part: PlantPart;
  top: DiseaseCandidate; // best guess
  alternatives: DiseaseCandidate[]; // 2 more candidates (top 3 overall including `top`)
  severity: Severity | null;
  symptoms: string[];
  causes: string[];
  immediate_actions: string[];
  prevention: string[];
  treatment_organic: TreatmentPlan[];
  treatment_chemical: TreatmentPlan[];
  differentials: Differential[];
  recovery_time: string; // e.g. "10-14 days with treatment"
  summary: string;
};

const SYSTEM_PROMPT = `You are an expert agronomist and plant pathologist. Analyze the crop image and diagnose plant disease.
Respond ONLY as JSON matching this EXACT schema (no markdown, no commentary):
{
  "is_healthy": boolean,
  "plant_part": "leaf" | "stem" | "fruit" | "root" | "flower" | "whole plant" | "unknown",
  "top": { "disease": string, "confidence": number, "reasoning": string },
  "alternatives": [
    { "disease": string, "confidence": number, "reasoning": string },
    { "disease": string, "confidence": number, "reasoning": string }
  ],
  "severity": "low" | "medium" | "high" | null,
  "symptoms": string[],
  "causes": string[],
  "immediate_actions": string[],
  "prevention": string[],
  "treatment_organic": [
    { "name": string, "dosage": string, "frequency": string, "precautions": string }
  ],
  "treatment_chemical": [
    { "name": string, "active_ingredient": string, "dosage": string, "frequency": string, "precautions": string }
  ],
  "differentials": [
    { "disease": string, "differentiator": string }
  ],
  "recovery_time": string,
  "summary": string
}
Rules:
- confidence is 0-100 integer. "top" is the most likely disease. "alternatives" MUST contain exactly 2 additional candidates ranked by confidence, all lower than or equal to top.confidence.
- If healthy, set is_healthy=true, top.disease="Healthy", alternatives=[], severity=null, arrays may be empty, recovery_time="N/A", summary explains why it looks healthy.
- If the image is not a plant, set is_healthy=false, top.disease="Not a plant", top.confidence=0, alternatives=[], all arrays empty, recovery_time="N/A", summary="Please upload a clear photo of the affected plant part.".
- treatment_organic: 2-4 items. treatment_chemical: 2-4 items with real active ingredients. Dosage must be concrete (e.g. "3 g/L of water"). Frequency concrete (e.g. "Every 7 days for 3 weeks"). Precautions must mention PPE / re-entry / harvest interval when relevant.
- immediate_actions: 2-4 things the farmer should do TODAY.
- differentials: 2-3 similar diseases and one-sentence differentiators.
- Do NOT include any text outside the JSON.`;

function num(v: unknown, def = 0): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : def;
}
function str(v: unknown, max = 500): string {
  return String(v ?? "").slice(0, max);
}
function arrStr(v: unknown, max = 8): string[] {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, max) : [];
}
function normalizeCandidate(v: unknown): DiseaseCandidate {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    disease: str(o.disease, 120) || "Unknown",
    confidence: num(o.confidence),
    reasoning: str(o.reasoning, 400),
  };
}
function normalizeOrganic(v: unknown): TreatmentPlan {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    name: str(o.name, 120) || "Organic treatment",
    dosage: str(o.dosage, 160),
    frequency: str(o.frequency, 160),
    precautions: str(o.precautions, 300),
  };
}
function normalizeChemical(v: unknown): TreatmentPlan {
  const o = (v ?? {}) as Record<string, unknown>;
  return {
    name: str(o.name, 120) || "Chemical treatment",
    active_ingredient: str(o.active_ingredient, 120),
    dosage: str(o.dosage, 160),
    frequency: str(o.frequency, 160),
    precautions: str(o.precautions, 300),
  };
}
function normalizeDiff(v: unknown): Differential {
  const o = (v ?? {}) as Record<string, unknown>;
  return { disease: str(o.disease, 120) || "Unknown", differentiator: str(o.differentiator, 300) };
}

export async function analyzeLeafImage(
  imageDataUrl: string,
  crop: string,
): Promise<DetectionResult> {
  const text = await aiChatCompletion({
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Crop: ${crop}. Analyze this image and return the JSON described in the system prompt.`,
          },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  });
  const parsed = safeJsonParse<Record<string, unknown>>(text);

  const top = normalizeCandidate(parsed.top);
  const altsRaw = Array.isArray(parsed.alternatives) ? parsed.alternatives : [];
  const alternatives = altsRaw.slice(0, 2).map(normalizeCandidate);
  // Pad to 2 alternatives if the model returned fewer.
  while (alternatives.length < 2) {
    alternatives.push({
      disease: "Unknown",
      confidence: 0,
      reasoning: "No additional candidate provided.",
    });
  }
  const severityRaw = String(parsed.severity ?? "").toLowerCase();
  const severity: Severity | null =
    severityRaw === "low" || severityRaw === "medium" || severityRaw === "high"
      ? severityRaw
      : null;
  const partRaw = String(parsed.plant_part ?? "").toLowerCase() as PlantPart;
  const allowedParts: PlantPart[] = [
    "leaf",
    "stem",
    "fruit",
    "root",
    "flower",
    "whole plant",
    "unknown",
  ];
  const plant_part: PlantPart = allowedParts.includes(partRaw) ? partRaw : "unknown";

  return {
    is_healthy: !!parsed.is_healthy,
    plant_part,
    top,
    alternatives,
    severity,
    symptoms: arrStr(parsed.symptoms),
    causes: arrStr(parsed.causes),
    immediate_actions: arrStr(parsed.immediate_actions),
    prevention: arrStr(parsed.prevention),
    treatment_organic: (Array.isArray(parsed.treatment_organic) ? parsed.treatment_organic : [])
      .slice(0, 6)
      .map(normalizeOrganic),
    treatment_chemical: (Array.isArray(parsed.treatment_chemical) ? parsed.treatment_chemical : [])
      .slice(0, 6)
      .map(normalizeChemical),
    differentials: (Array.isArray(parsed.differentials) ? parsed.differentials : [])
      .slice(0, 4)
      .map(normalizeDiff),
    recovery_time: str(parsed.recovery_time, 160) || "Unknown",
    summary: str(parsed.summary, 600),
  };
}

export type { Database };
