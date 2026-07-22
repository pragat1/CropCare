import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const InputSchema = z.object({
  crop: z.string().trim().min(1).max(80),
  beforePath: z.string().trim().min(1).max(500),
  afterPath: z.string().trim().min(1).max(500),
  notes: z.string().trim().max(1000).optional(),
});

export const compareTreatment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (!data.beforePath.startsWith(`${userId}/`) || !data.afterPath.startsWith(`${userId}/`)) {
      throw new Error("Invalid image path");
    }

    async function toDataUrl(path: string) {
      const { data: blob, error } = await supabase.storage.from("treatment-images").download(path);
      if (error || !blob) throw new Error(error?.message ?? "Failed to read image");
      const b64 = Buffer.from(await blob.arrayBuffer()).toString("base64");
      return `data:${blob.type || "image/jpeg"};base64,${b64}`;
    }
    const beforeUrl = await toDataUrl(data.beforePath);
    const afterUrl = await toDataUrl(data.afterPath);

    const { compareTreatmentImages } = await import("./ai-treatment.server");
    const result = await compareTreatmentImages(beforeUrl, afterUrl, data.crop);

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
  });