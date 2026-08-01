import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enforceRateLimit } from "./server-utils.server";
import type { AssistantAnswer, AssistantLang } from "./assistant.server";

const Lang = z.enum(["en", "hi", "pa"]);

const AskSchema = z.object({
  question: z.string().trim().min(2).max(1000),
  lang: Lang.default("en"),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(2000) }))
    .max(10)
    .default([]),
});

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => AskSchema.parse(input))
  .handler(async ({ data, context }): Promise<AssistantAnswer> => {
    await enforceRateLimit(context.userId, "assistant.ask", 20);
    const { askAssistantAi } = await import("./assistant.server");
    return askAssistantAi(data.question, data.lang as AssistantLang, data.history);
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
