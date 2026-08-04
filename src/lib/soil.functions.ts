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
  imagePath: z
    .string()
    .trim()
    .min(1)
    .max(500)
    .regex(/^[a-zA-Z0-9/_.-]+$/, "Invalid path characters"),
});

export const analyzeSoil = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return withAudit({ userId, action: "soil.analyze", resource: data.imagePath }, async () => {
      assertOwnedPath(data.imagePath, userId);
      await enforceRateLimit(userId, "soil.analyze", 8);

      const { dataUrl } = await downloadImageAsDataUrl(supabase, "soil-images", data.imagePath);
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
  });
