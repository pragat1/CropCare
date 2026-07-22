import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  imagePath: z.string().trim().min(1).max(500),
});

export const analyzeSoil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.imagePath.startsWith(`${userId}/`)) throw new Error("Invalid image path");

    const { data: blob, error: dlErr } = await supabase.storage
      .from("soil-images")
      .download(data.imagePath);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "Failed to read soil image");
    const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
    const mime = blob.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${b64}`;

    const { analyzeSoilImage } = await import("./ai-soil.server");
    const result = await analyzeSoilImage(dataUrl);

    const { data: row, error: insErr } = await supabase
      .from("soil_analyses")
      .insert({
        user_id: userId,
        image_path: data.imagePath,
        soil_type: result.soil_type,
        fertility: result.fertility,
        water_retention: result.water_retention,
        ph_range: result.ph_range,
        recommended_crops: result.recommended_crops,
        maintenance: result.maintenance,
        tips: result.tips,
        summary: result.summary,
        raw: JSON.parse(JSON.stringify(result)),
      })
      .select("id")
      .single();
    if (insErr || !row) throw new Error(insErr?.message ?? "Failed to save soil analysis");
    return { id: row.id as string };
  });