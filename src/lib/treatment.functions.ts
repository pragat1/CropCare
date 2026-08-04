import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  assertOwnedPath,
  downloadImageAsDataUrl,
  enforceRateLimit,
  withAudit,
} from "./server-utils.server";

const PathSchema = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .regex(/^[a-zA-Z0-9/_.-]+$/, "Invalid path characters");
const InputSchema = z.object({
  crop: z.string().trim().min(1).max(80),
  beforePath: PathSchema,
  afterPath: PathSchema,
  notes: z.string().trim().max(1000).optional(),
});

export const compareTreatment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    return withAudit(
      { userId, action: "treatment.compare", metadata: { crop: data.crop } },
      async () => {
        assertOwnedPath(data.beforePath, userId);
        assertOwnedPath(data.afterPath, userId);
        await enforceRateLimit(userId, "treatment.compare", 6);

        const [before, after] = await Promise.all([
          downloadImageAsDataUrl(supabase, "treatment-images", data.beforePath),
          downloadImageAsDataUrl(supabase, "treatment-images", data.afterPath),
        ]);

        const { compareTreatmentImages } = await import("./ai-treatment.server");
        const result = await compareTreatmentImages(before.dataUrl, after.dataUrl, data.crop);

        const { data: row, error: insErr } = await supabase
          .from("treatment_progress")
          .insert({
            user_id: userId,
            crop: data.crop,
            before_image_path: data.beforePath,
            after_image_path: data.afterPath,
            status: result.status,
            improvement_percent: result.improvement_percent,
            notes: data.notes ?? null,
            analysis: JSON.parse(JSON.stringify(result)),
          })
          .select("id")
          .single();
        if (insErr || !row) throw new Error(insErr?.message ?? "Failed to save comparison");
        return { id: row.id as string };
      },
    );
  });
