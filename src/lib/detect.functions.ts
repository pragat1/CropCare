import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  crop: z.string().trim().min(1).max(80),
  imagePath: z.string().trim().min(1).max(500),
});

export const analyzeDetection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Verify the uploaded object belongs to the caller's folder.
    if (!data.imagePath.startsWith(`${userId}/`)) {
      throw new Error("Invalid image path");
    }

    // Download the image server-side (RLS enforced as this user).
    const { data: blob, error: dlErr } = await supabase.storage
      .from("leaf-images")
      .download(data.imagePath);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "Failed to read uploaded image");

    const arrayBuf = await blob.arrayBuffer();
    const b64 = Buffer.from(arrayBuf).toString("base64");
    const mime = blob.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${b64}`;

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
        confidence: result.top.confidence,
        severity: result.severity,
        symptoms: result.symptoms,
        causes: result.causes,
        treatment_organic: result.treatment_organic.map((t) => `${t.name} — ${t.dosage}, ${t.frequency}`),
        treatment_chemical: result.treatment_chemical.map((t) => `${t.name}${t.active_ingredient ? ` (${t.active_ingredient})` : ""} — ${t.dosage}, ${t.frequency}`),
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
  });