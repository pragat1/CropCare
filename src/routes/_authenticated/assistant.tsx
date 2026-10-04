import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Mic,
  Square,
  Send,
  Volume2,
  Loader2,
  MessageCircle,
  Sparkles,
  StopCircle,
  ImagePlus,
  X,
  History,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn } from "@/components/motion";
import { DISEASES } from "@/lib/data/diseases";
import { supabase } from "@/integrations/supabase/client";
import { compressImage, validateImageFile } from "@/lib/image-client";
import {
  askAssistant,
  speakText,
  transcribeVoice,
  getAssistantHistory,
  clearAssistantHistory,
} from "@/lib/assistant.functions";
import type { AssistantRisk } from "@/lib/assistant.server";
import { startRecording, blobToBase64, type Recorder } from "@/lib/audio-client";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "Voice Assistant — CropCare Crop Care" },
      {
        name: "description",
        content:
          "Ask about crop diseases by voice or photo in English, Hindi or Punjabi and review your saved answers.",
      },
      { property: "og:title", content: "Voice Assistant — CropCare Crop Care" },
      {
        property: "og:description",
        content:
          "Speak or snap a leaf photo and get disease risk, causes and treatment advice in your language.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Lang = "en" | "hi" | "pa";
type Msg = {
  role: "user" | "assistant";
  content: string;
  diseaseIds?: string[];
  risk?: AssistantRisk | null;
  imageUrl?: string | null;
};

const LANGS: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "pa", label: "ਪੰਜਾਬੀ" },
];

const SAMPLES: Record<Lang, string[]> = {
  en: [
    "My tomato leaves have yellow spots.",
    "White powder on my grape leaves.",
    "How do I prevent rice blast?",
  ],
  hi: [
    "मेरे टमाटर के पत्तों पर पीले धब्बे हैं।",
    "अंगूर की पत्तियों पर सफेद पाउडर है।",
    "धान के ब्लास्ट रोग से कैसे बचें?",
  ],
  pa: [
    "ਮੇਰੇ ਟਮਾਟਰ ਦੇ ਪੱਤਿਆਂ ਉੱਤੇ ਪੀਲੇ ਧੱਬੇ ਹਨ।",
    "ਅੰਗੂਰ ਦੇ ਪੱਤਿਆਂ ਉੱਤੇ ਚਿੱਟਾ ਪਾਊਡਰ ਹੈ।",
    "ਝੋਨੇ ਦੇ ਬਲਾਸਟ ਤੋਂ ਕਿਵੇਂ ਬਚੀਏ?",
  ],
};

const RISK_STYLE: Record<AssistantRisk["level"], string> = {
  low: "border-primary/40 text-primary",
  medium: "border-amber-500/50 text-amber-600 dark:text-amber-400",
  high: "border-destructive/50 text-destructive",
};

function RiskCard({ risk }: { risk: AssistantRisk }) {
  return (
    <div className={`mt-3 rounded-xl border bg-background/40 p-3 ${RISK_STYLE[risk.level]}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <AlertTriangle className="h-3.5 w-3.5" />
        {risk.level} disease risk
        {risk.crop && <span className="text-muted-foreground normal-case">· {risk.crop}</span>}
        {risk.plantPart && (
          <span className="text-muted-foreground normal-case">· {risk.plantPart}</span>
        )}
      </div>
      {risk.causes.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {risk.causes.map((c, i) => (
            <li key={i}>• {c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const speak = useServerFn(speakText);
  const transcribe = useServerFn(transcribeVoice);
  const loadHistory = useServerFn(getAssistantHistory);
  const clearHistory = useServerFn(clearAssistantHistory);
  const qc = useQueryClient();

  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const recorderRef = useRef<Recorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ["assistant-history"],
    queryFn: () => loadHistory({}),
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);
  useEffect(
    () => () => {
      audioRef.current?.pause();
    },
    [],
  );

  function pickPhoto(f: File | null) {
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setPhoto(f);
    setPhotoPreview(URL.createObjectURL(f));
  }

  function clearPhoto() {
    setPhoto(null);
    setPhotoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadPhoto(): Promise<string | undefined> {
    if (!photo) return undefined;
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) throw new Error("You need to be signed in.");
    setUploading(true);
    try {
      const compressed = await compressImage(photo);
      const path = `${auth.user.id}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await supabase.storage
        .from("assistant-images")
        .upload(path, compressed, { contentType: compressed.type || "image/jpeg" });
      if (upErr) throw new Error(upErr.message);
      return path;
    } finally {
      setUploading(false);
    }
  }

  async function send(question: string) {
    const q = question.trim();
    if ((!q && !photo) || thinking) return;
    setError(null);
    setText("");
    setFollowUps([]);
    const asked =
      q ||
      (lang === "hi"
        ? "इस पत्ते की तस्वीर देखकर बीमारी का जोखिम और कारण बताइए।"
        : lang === "pa"
          ? "ਇਸ ਪੱਤੇ ਦੀ ਤਸਵੀਰ ਵੇਖ ਕੇ ਬਿਮਾਰੀ ਦਾ ਜੋਖਮ ਅਤੇ ਕਾਰਨ ਦੱਸੋ।"
          : "Look at this leaf photo and tell me the disease risk and causes.");
    const localPreview = photoPreview;
    const history6 = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));

    setThinking(true);
    try {
      const imagePath = await uploadPhoto();
      setMessages((m) => [...m, { role: "user", content: asked, imageUrl: localPreview }]);
      clearPhoto();
      const res = await ask({
        data: { question: asked, lang, history: history6, ...(imagePath ? { imagePath } : {}) },
      });
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: res.answer,
          diseaseIds: res.diseaseIds,
          risk: res.risk ?? null,
        },
      ]);
      setFollowUps(res.followUps);
      void qc.invalidateQueries({ queryKey: ["assistant-history"] });
      void play(res.answer, messages.length + 1);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Something went wrong.";
      setError(msg);
      toast.error(msg);
    } finally {
      setThinking(false);
    }
  }

  async function play(content: string, idx: number) {
    try {
      audioRef.current?.pause();
      setSpeakingIdx(idx);
      const { audioBase64 } = await speak({ data: { text: content, lang } });
      const audio = new Audio(`data:audio/mpeg;base64,${audioBase64}`);
      audioRef.current = audio;
      audio.onended = () => setSpeakingIdx(null);
      await audio.play();
    } catch (e) {
      setSpeakingIdx(null);
      toast.error(e instanceof Error ? e.message : "Could not play audio");
    }
  }

  function stopAudio() {
    audioRef.current?.pause();
    setSpeakingIdx(null);
  }

  async function toggleRecord() {
    if (recording) {
      setRecording(false);
      const rec = recorderRef.current;
      recorderRef.current = null;
      if (!rec) return;
      try {
        const blob = await rec.stop();
        if (blob.size < 4000) {
          toast.error("That recording was too short — please try again.");
          return;
        }
        setTranscribing(true);
        const audioBase64 = await blobToBase64(blob);
        const { text: heard } = await transcribe({ data: { audioBase64, lang } });
        await send(heard);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not transcribe your recording");
      } finally {
        setTranscribing(false);
      }
      return;
    }
    try {
      recorderRef.current = await startRecording();
      setRecording(true);
    } catch {
      toast.error("Microphone access is needed to speak to the assistant.");
    }
  }

  async function onClearHistory() {
    try {
      await clearHistory({});
      await qc.invalidateQueries({ queryKey: ["assistant-history"] });
      toast.success("History cleared");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not clear history");
    }
  }

  const busy = thinking || transcribing || uploading;

  return (
    <AppShell>
      <PageHeader
        icon={MessageCircle}
        eyebrow="Voice assistant"
        title="Ask about your crop"
        description="Speak, type or snap a leaf photo in English, Hindi or Punjabi. Answers come from the CropCare disease database, are read aloud, and are saved to your history."
      />

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_18rem]">
        <FadeIn>
          <Card className="flex min-h-[26rem] flex-col p-5 md:p-6">
            <div className="flex-1 space-y-4">
              {messages.length === 0 && !busy && (
                <div className="grid h-full place-items-center py-10 text-center">
                  <div>
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-brand text-primary-foreground ring-glow">
                      <Sparkles className="h-6 w-6" />
                    </span>
                    <p className="mt-4 font-medium">
                      Try asking a question — or attach a leaf photo
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {SAMPLES[lang].map((s) => (
                        <Button
                          key={s}
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          onClick={() => send(s)}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div
                  key={i}
                  className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user"
                        ? "bg-gradient-brand text-primary-foreground"
                        : "glass-panel"
                    }`}
                  >
                    {m.imageUrl && (
                      <img
                        src={m.imageUrl}
                        alt="Leaf photo you shared"
                        className="mb-2 max-h-52 rounded-xl object-cover"
                        loading="lazy"
                      />
                    )}
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === "assistant" && m.risk && <RiskCard risk={m.risk} />}
                    {m.role === "assistant" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-full px-2 text-xs"
                          onClick={() => (speakingIdx === i ? stopAudio() : play(m.content, i))}
                          aria-label={speakingIdx === i ? "Stop audio" : "Play answer aloud"}
                        >
                          {speakingIdx === i ? (
                            <StopCircle className="h-3.5 w-3.5" />
                          ) : (
                            <Volume2 className="h-3.5 w-3.5" />
                          )}
                          {speakingIdx === i ? "Stop" : "Listen"}
                        </Button>
                        {(m.diseaseIds ?? []).map((id) => {
                          const d = DISEASES.find((x) => x.id === id);
                          if (!d) return null;
                          return (
                            <Link key={id} to="/diseases">
                              <Badge variant="outline" className="cursor-pointer">
                                {d.emoji} {d.name}
                              </Badge>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {busy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploading
                    ? "Uploading photo…"
                    : transcribing
                      ? "Transcribing your voice…"
                      : "Thinking…"}
                </div>
              )}

              {error && (
                <Card className="border-destructive/40 p-4 text-sm">
                  <p className="text-destructive">{error}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-3 rounded-full"
                    onClick={() => {
                      const last = [...messages].reverse().find((m) => m.role === "user");
                      if (last) send(last.content);
                    }}
                  >
                    Retry
                  </Button>
                </Card>
              )}
              <div ref={bottomRef} />
            </div>

            {followUps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {followUps.map((f) => (
                  <Button
                    key={f}
                    variant="outline"
                    size="sm"
                    className="rounded-full"
                    onClick={() => send(f)}
                  >
                    {f}
                  </Button>
                ))}
              </div>
            )}

            {photoPreview && (
              <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/50 bg-background/40 p-2">
                <img
                  src={photoPreview}
                  alt="Selected leaf preview"
                  className="h-14 w-14 rounded-lg object-cover"
                />
                <span className="flex-1 truncate text-xs text-muted-foreground">
                  Photo attached — ask a question or just send.
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-lg"
                  onClick={clearPhoto}
                  aria-label="Remove photo"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            <form
              className="mt-4 flex items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                send(text);
              }}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={(e) => pickPhoto(e.target.files?.[0] ?? null)}
              />
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="min-h-11 min-w-11 shrink-0 rounded-xl"
                onClick={() => fileRef.current?.click()}
                disabled={busy || recording}
                aria-label="Attach or take a leaf photo"
              >
                <ImagePlus className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={recording ? "destructive" : "secondary"}
                size="icon"
                className="min-h-11 min-w-11 shrink-0 rounded-xl"
                onClick={toggleRecord}
                disabled={busy}
                aria-label={recording ? "Stop recording" : "Start voice recording"}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={
                  recording
                    ? "Listening…"
                    : photo
                      ? "Add a note about the photo…"
                      : "Describe the problem…"
                }
                aria-label="Your question"
                disabled={recording || busy}
              />
              <Button
                type="submit"
                size="icon"
                className="min-h-11 min-w-11 shrink-0 rounded-xl"
                disabled={(!text.trim() && !photo) || busy}
                aria-label="Send question"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05} className="space-y-6">
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Language</h2>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="mt-3" aria-label="Assistant language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-3 text-xs text-muted-foreground">
              Speech recognition, answers and spoken replies all follow this language.
            </p>
            <div className="mt-5 border-t border-border/50 pt-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Tips</p>
              <ul className="mt-2 space-y-1.5">
                <li>• Photograph the affected leaf in daylight, filling the frame.</li>
                <li>• Name the crop and what you see.</li>
                <li>• Speak close to the mic in a quiet spot.</li>
              </ul>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <History className="h-4 w-4" /> Saved history
              </h2>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full text-xs"
                onClick={() => setShowHistory((s) => !s)}
              >
                {showHistory ? "Hide" : "Show"}
              </Button>
            </div>

            {showHistory && (
              <div className="mt-4">
                {history.isLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                  </div>
                ) : history.isError ? (
                  <div className="text-xs">
                    <p className="text-destructive">Could not load history.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 rounded-full"
                      onClick={() => history.refetch()}
                    >
                      Retry
                    </Button>
                  </div>
                ) : (history.data?.length ?? 0) === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No saved questions yet. Your Q&amp;A will appear here.
                  </p>
                ) : (
                  <>
                    <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
                      {history
                        .data!.slice()
                        .reverse()
                        .map((h) => (
                          <div
                            key={h.id}
                            className="rounded-xl border border-border/50 bg-background/40 p-3"
                          >
                            <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                              <span>{h.role === "user" ? "You" : "Assistant"}</span>
                              <span>{new Date(h.createdAt).toLocaleDateString()}</span>
                            </div>
                            {h.imageUrl && (
                              <img
                                src={h.imageUrl}
                                alt="Saved leaf photo"
                                className="mt-2 h-20 w-20 rounded-lg object-cover"
                                loading="lazy"
                              />
                            )}
                            <p className="mt-1.5 line-clamp-4 text-xs text-foreground/90">
                              {h.content}
                            </p>
                            {h.risk && (
                              <Badge variant="outline" className="mt-2 text-[10px]">
                                {h.risk.level} risk
                              </Badge>
                            )}
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3 w-full gap-2 rounded-full text-xs text-muted-foreground"
                      onClick={onClearHistory}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Clear history
                    </Button>
                  </>
                )}
              </div>
            )}
          </Card>
        </FadeIn>
      </div>
    </AppShell>
  );
}
