import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertOwnedPath,
  downloadImageAsDataUrl,
  enforceRateLimit,
  withAudit,
} from "./server-utils.server";

const InputSchema = z.object({
  crop: z.string().trim().min(1).max(80),
  imagePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9/_.-]+$/, "Invalid path characters"),
  weather: z
    .object({
      temperature: z.number(),
      humidity: z.number(),
      rainfall: z.number(),
      wind: z.number(),
      uvIndex: z.number(),
      condition: z.string().max(80),
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
      place: z.string().max(120).nullable().optional(),
      observedAt: z.string().max(40),
    })
    .optional(),
  weatherRisk: z
    .object({
      level: z.enum(["low", "moderate", "high"]),
      score: z.number().min(0).max(100),
      top: z
        .array(z.object({ name: z.string().max(80), level: z.string().max(20), score: z.number() }))
        .max(5),
    })
    .optional(),
});

export const analyzeDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return withAudit(
      {
        userId,
        action: "detection.analyze",
        resource: data.imagePath,
        metadata: { crop: data.crop },
      },
      async () => {
        assertOwnedPath(data.imagePath, userId);
        await enforceRateLimit(userId, "detection.analyze", 8);

        const { dataUrl } = await downloadImageAsDataUrl(supabase, "leaf-images", data.imagePath);
        const { analyzeLeafImage } = await import("./ai.server");
        const result = await analyzeLeafImage(dataUrl, data.crop);

        const { data: row, error: insErr } = await supabase
          .from("detections")
          .insert({
            user_id: userId,
            crop: data.crop,
            image_path: data.imagePath,
            is_healthy: result.is_healthy,
            disease: result.is_healthy ? null : result.top.disease,
            weather: data.weather ? JSON.parse(JSON.stringify(data.weather)) : null,
            weather_risk: data.weatherRisk ? JSON.parse(JSON.stringify(data.weatherRisk)) : null,
            confidence: result.top.confidence,
            severity: result.severity,
            symptoms: result.symptoms,
            causes: result.causes,
            treatment_organic: result.treatment_organic.map(
              (t) => `${t.name} — ${t.dosage}, ${t.frequency}`,
            ),
            treatment_chemical: result.treatment_chemical.map(
              (t) =>
                `${t.name}${t.active_ingredient ? ` (${t.active_ingredient})` : ""} — ${t.dosage}, ${t.frequency}`,
            ),
            treatment_organic_detailed: JSON.parse(JSON.stringify(result.treatment_organic)),
            treatment_chemical_detailed: JSON.parse(JSON.stringify(result.treatment_chemical)),
            prevention: result.prevention,
            plant_part: result.plant_part,
            reasoning: result.top.reasoning,
            immediate_actions: result.immediate_actions,
            recovery_time: result.recovery_time,
            alternatives: JSON.parse(JSON.stringify(result.alternatives)),
            differentials: JSON.parse(JSON.stringify(result.differentials)),
            summary: result.summary,
            raw: JSON.parse(JSON.stringify(result)),
          })
          .select("id")
          .single();

        if (insErr || !row) throw new Error(insErr?.message ?? "Failed to save detection");
        return { id: row.id as string };
      },
    );
  });
