import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit, assertOwnedPath, downloadImageAsDataUrl } from "./server-utils.server";
import type { AssistantAnswer, AssistantLang, AssistantRisk } from "./assistant.server";

const Lang = z.enum(["en", "hi", "pa"]);
const PathSchema = z.string().regex(/^[0-9a-f-]{36}\/[A-Za-z0-9._-]+$/, "Invalid image path");

const AskSchema = z.object({
  question: z.string().trim().min(2).max(1000),
  lang: Lang.default("en"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(10)
    .default([]),
  imagePath: PathSchema.optional(),
});

export type AssistantTurn = AssistantAnswer & { imageUrl?: string | null };

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssistantTurn> => {
    await enforceRateLimit(context.userId, "assistant.ask", 20);
    const { askAssistantAi } = await import("./assistant.server");

    let imageDataUrl: string | undefined;
    if (data.imagePath) {
      assertOwnedPath(data.imagePath, context.userId);
      const img = await downloadImageAsDataUrl(context.supabase, "assistant-images", data.imagePath);
      imageDataUrl = img.dataUrl;
    }

    const res = await askAssistantAi(data.question, data.lang as AssistantLang, data.history, imageDataUrl);

    const { error } = await context.supabase.from("assistant_messages").insert([
      {
        user_id: context.userId,
        role: "user",
        content: data.question,
        lang: data.lang,
        image_path: data.imagePath ?? null,
      },
      {
        user_id: context.userId,
        role: "assistant",
        content: res.answer,
        lang: data.lang,
        disease_ids: res.diseaseIds,
        risk: (res.risk ?? null) as never,
      },
    ]);
    if (error) console.error("[assistant] failed to save history", error);

    return res;
  });

export type AssistantHistoryItem = {
  id: string;
  role: "user" | "assistant";
  content: string;
  lang: string;
  diseaseIds: string[];
  risk: AssistantRisk | null;
  imageUrl: string | null;
  createdAt: string;
};

export const getAssistantHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AssistantHistoryItem[]> => {
    const { data, error } = await context.supabase
      .from("assistant_messages")
      .select("id, role, content, lang, disease_ids, risk, image_path, created_at")
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);

    const rows = data ?? [];
    const paths = rows.map((r) => r.image_path).filter((p): p is string => !!p);
    const signed = new Map<string, string>();
    if (paths.length) {
      const { data: urls } = await context.supabase.storage
        .from("assistant-images")
        .createSignedUrls(paths, 3600);
      for (const u of urls ?? []) {
        if (u.path && u.signedUrl) signed.set(u.path, u.signedUrl);
      }
    }

    return rows.map((r) => ({
      id: r.id,
      role: r.role as "user" | "assistant",
      content: r.content,
      lang: r.lang,
      diseaseIds: Array.isArray(r.disease_ids) ? (r.disease_ids as string[]) : [],
      risk: (r.risk as AssistantRisk | null) ?? null,
      imageUrl: r.image_path ? (signed.get(r.image_path) ?? null) : null,
      createdAt: r.created_at,
    }));
  });

export const clearAssistantHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok: true }> => {
    const { error } = await context.supabase
      .from("assistant_messages")
      .delete()
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const TranscribeSchema = z.object({
  audioBase64: z.string().min(100).max(28_000_000),
  lang: Lang.default("en"),
});

export const transcribeVoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => TranscribeSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ text: string }> => {
    await enforceRateLimit(context.userId, "assistant.stt", 20);
    const { transcribeAudioBase64 } = await import("./assistant.server");
    return { text: await transcribeAudioBase64(data.audioBase64, data.lang as AssistantLang) };
  });

const SpeakSchema = z.object({
  text: z.string().trim().min(1).max(3000),
  lang: Lang.default("en"),
});

export const speakText = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SpeakSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ audioBase64: string }> => {
    await enforceRateLimit(context.userId, "assistant.tts", 20);
    const { synthesizeSpeechBase64 } = await import("./assistant.server");
    return { audioBase64: await synthesizeSpeechBase64(data.text, data.lang as AssistantLang) };
  });
