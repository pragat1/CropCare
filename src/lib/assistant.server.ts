// Server-only helpers for the multilingual voice assistant.
import { DISEASES } from "./data/diseases";
import { aiChatCompletion, safeJsonParse, type ChatContent } from "./ai-gateway.server";

export type AssistantLang = "en" | "hi" | "pa";

export const LANG_LABEL: Record<AssistantLang, string> = {
  en: "English",
  hi: "Hindi (हिन्दी)",
  pa: "Punjabi (ਪੰਜਾਬੀ, Gurmukhi script)",
};

export type AssistantAnswer = {
  answer: string;
  diseaseIds: string[];
  followUps: string[];
  risk?: AssistantRisk | null;
};

export type AssistantRisk = {
  level: "low" | "medium" | "high";
  crop: string;
  plantPart: string;
  causes: string[];
};

/** Compact, token-friendly view of the disease database for grounding. */
function diseaseContext(): string {
  return DISEASES.map((d) =>
    [
      `id:${d.id} | crop:${d.crop} | name:${d.name} | severity:${d.severity}`,
      `summary: ${d.summary}`,
      `symptoms: ${d.symptoms.slice(0, 5).join("; ")}`,
      `organic: ${d.organic.slice(0, 4).join("; ")}`,
      `chemical: ${d.chemical.slice(0, 3).join("; ")}`,
      `prevention: ${d.preventive.slice(0, 3).join("; ")}`,
    ].join("\n"),
  ).join("\n---\n");
}

export async function askAssistantAi(
  question: string,
  lang: AssistantLang,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  imageDataUrl?: string,
): Promise<AssistantAnswer> {
  const system = `You are CropCare's farming voice assistant. You ONLY answer using the disease database below plus general safe agronomy advice.

RULES
- Reply entirely in ${LANG_LABEL[lang]}. Use that language's native script. Never mix languages.
- Ground diagnoses in the database. If nothing matches, say so honestly and ask a clarifying question.
- Be spoken-friendly: short sentences, no markdown, no bullets, no emojis, under 130 words.
- Mention likely disease name, why it matches, one organic and one chemical option with dosage if listed, and one prevention tip.
- Always add a short safety note when recommending chemicals.
${imageDataUrl ? `- A photo of the plant is attached. Look at it carefully: describe what you actually see (spot colour, shape, location, wilting), then give the disease risk level and the likely causes. If the photo is not a plant, say so.` : ""}

DISEASE DATABASE
${diseaseContext()}

Return JSON only: {"answer": string, "diseaseIds": string[], "followUps": string[3 short suggested questions in ${LANG_LABEL[lang]}], "risk": {"level":"low"|"medium"|"high","crop": string,"plantPart": string,"causes": string[] } | null}
Set "risk" whenever a plant problem is discussed (always when a photo is attached); "causes" must list the biological/environmental causes in ${LANG_LABEL[lang]}.`;

  const userContent: ChatContent = imageDataUrl
    ? [
        { type: "text", text: question },
        { type: "image_url", image_url: { url: imageDataUrl } },
      ]
    : question;

  const raw = await aiChatCompletion({
    model: "openai/gpt-5.6-sol",
    extraBody: { reasoning_effort: "none" },
    messages: [
      { role: "system", content: system },
      ...history.slice(-6),
      { role: "user", content: userContent },
    ],
  });

  const parsed = safeJsonParse<Partial<AssistantAnswer>>(raw);
  const known = new Set(DISEASES.map((d) => d.id));
  const rawRisk = parsed.risk as Partial<AssistantRisk> | null | undefined;
  const risk: AssistantRisk | null =
    rawRisk &&
    typeof rawRisk === "object" &&
    ["low", "medium", "high"].includes(String(rawRisk.level))
      ? {
          level: rawRisk.level as AssistantRisk["level"],
          crop: typeof rawRisk.crop === "string" ? rawRisk.crop : "",
          plantPart: typeof rawRisk.plantPart === "string" ? rawRisk.plantPart : "",
          causes: Array.isArray(rawRisk.causes)
            ? rawRisk.causes.filter((c) => typeof c === "string").slice(0, 6)
            : [],
        }
      : null;
  return {
    answer:
      typeof parsed.answer === "string" && parsed.answer.trim()
        ? parsed.answer.trim()
        : raw.slice(0, 800),
    diseaseIds: Array.isArray(parsed.diseaseIds)
      ? parsed.diseaseIds.filter((i) => typeof i === "string" && known.has(i)).slice(0, 3)
      : [],
    followUps: Array.isArray(parsed.followUps)
      ? parsed.followUps.filter((f) => typeof f === "string").slice(0, 3)
      : [],
    risk,
  };
}

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

function apiKey(): string {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  return key;
}

/** Speech-to-text. Accepts base64 WAV audio, returns the transcript. */
export async function transcribeAudioBase64(base64: string, lang: AssistantLang): Promise<string> {
  const bytes = Buffer.from(base64, "base64");
  if (bytes.byteLength < 2048) throw new Error("That recording was empty — please try again.");
  if (bytes.byteLength > 20 * 1024 * 1024)
    throw new Error("Recording is too long. Keep it under a minute.");

  const form = new FormData();
  form.append("model", "openai/gpt-4o-transcribe");
  form.append("file", new Blob([new Uint8Array(bytes)], { type: "audio/wav" }), "recording.wav");
  form.append("language", lang);

  const res = await fetch(`${GATEWAY}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}` },
    body: form,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Too many requests — please wait a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`Transcription failed [${res.status}]: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  const text = (json.text ?? "").trim();
  if (!text) throw new Error("Nothing was recognised in that recording.");
  return text;
}

/** Text-to-speech. Returns base64 MP3. */
export async function synthesizeSpeechBase64(text: string, lang: AssistantLang): Promise<string> {
  const res = await fetch(`${GATEWAY}/audio/speech`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini-tts",
      input: text.slice(0, 3000),
      voice: "alloy",
      response_format: "mp3",
      instructions: `Speak naturally in ${LANG_LABEL[lang]} as a friendly agricultural advisor. Calm, clear, moderate pace.`,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    if (res.status === 429) throw new Error("Too many requests — please wait a moment.");
    if (res.status === 402)
      throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`Speech failed [${res.status}]: ${detail.slice(0, 200)}`);
  }
  const buf = await res.arrayBuffer();
  return Buffer.from(buf).toString("base64");
}
