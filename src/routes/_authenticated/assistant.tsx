import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Mic, Square, Send, Volume2, Loader2, MessageCircle, Sparkles, StopCircle } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn } from "@/components/motion";
import { DISEASES } from "@/lib/data/diseases";
import { askAssistant, speakText, transcribeVoice } from "@/lib/assistant.functions";
import { startRecording, blobToBase64, type Recorder } from "@/lib/audio-client";

export const Route = createFileRoute("/_authenticated/assistant")({
  component: AssistantPage,
  head: () => ({
    meta: [
      { title: "Voice Assistant — LeafScan Crop Care" },
      { name: "description", content: "Ask about crop diseases by voice in English, Hindi or Punjabi and hear grounded treatment advice." },
      { property: "og:title", content: "Voice Assistant — LeafScan Crop Care" },
      { property: "og:description", content: "Speak your crop problem and get disease diagnosis and treatment advice in your language." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Lang = "en" | "hi" | "pa";
type Msg = { role: "user" | "assistant"; content: string; diseaseIds?: string[] };

const LANGS: Array<{ value: Lang; label: string }> = [
  { value: "en", label: "English" },
  { value: "hi", label: "हिन्दी" },
  { value: "pa", label: "ਪੰਜਾਬੀ" },
];

const SAMPLES: Record<Lang, string[]> = {
  en: ["My tomato leaves have yellow spots.", "White powder on my grape leaves.", "How do I prevent rice blast?"],
  hi: ["मेरे टमाटर के पत्तों पर पीले धब्बे हैं।", "अंगूर की पत्तियों पर सफेद पाउडर है।", "धान के ब्लास्ट रोग से कैसे बचें?"],
  pa: ["ਮੇਰੇ ਟਮਾਟਰ ਦੇ ਪੱਤਿਆਂ ਉੱਤੇ ਪੀਲੇ ਧੱਬੇ ਹਨ।", "ਅੰਗੂਰ ਦੇ ਪੱਤਿਆਂ ਉੱਤੇ ਚਿੱਟਾ ਪਾਊਡਰ ਹੈ।", "ਝੋਨੇ ਦੇ ਬਲਾਸਟ ਤੋਂ ਕਿਵੇਂ ਬਚੀਏ?"],
};

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const speak = useServerFn(speakText);
  const transcribe = useServerFn(transcribeVoice);

  const [lang, setLang] = useState<Lang>("en");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null);
  const [followUps, setFollowUps] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<Recorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, thinking]);
  useEffect(() => () => { audioRef.current?.pause(); }, []);

  async function send(question: string) {
    const q = question.trim();
    if (!q || thinking) return;
    setError(null);
    setText("");
    setFollowUps([]);
    const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
    setMessages((m) => [...m, { role: "user", content: q }]);
    setThinking(true);
    try {
      const res = await ask({ data: { question: q, lang, history } });
      setMessages((m) => [...m, { role: "assistant", content: res.answer, diseaseIds: res.diseaseIds }]);
      setFollowUps(res.followUps);
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
        if (blob.size < 4000) { toast.error("That recording was too short — please try again."); return; }
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

  const busy = thinking || transcribing;

  return (
    <AppShell>
      <PageHeader
        icon={MessageCircle}
        eyebrow="Voice assistant"
        title="Ask about your crop"
        description="Speak or type in English, Hindi or Punjabi. Answers come from the LeafScan disease database and are read aloud."
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
                    <p className="mt-4 font-medium">Try asking a question</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {SAMPLES[lang].map((s) => (
                        <Button key={s} variant="outline" size="sm" className="rounded-full" onClick={() => send(s)}>
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {messages.map((m, i) => (
                <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-gradient-brand text-primary-foreground" : "glass-panel"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.role === "assistant" && (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 gap-1.5 rounded-full px-2 text-xs"
                          onClick={() => (speakingIdx === i ? stopAudio() : play(m.content, i))}
                          aria-label={speakingIdx === i ? "Stop audio" : "Play answer aloud"}
                        >
                          {speakingIdx === i ? <StopCircle className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
                          {speakingIdx === i ? "Stop" : "Listen"}
                        </Button>
                        {(m.diseaseIds ?? []).map((id) => {
                          const d = DISEASES.find((x) => x.id === id);
                          if (!d) return null;
                          return (
                            <Link key={id} to="/diseases">
                              <Badge variant="outline" className="cursor-pointer">{d.emoji} {d.name}</Badge>
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
                  {transcribing ? "Transcribing your voice…" : "Thinking…"}
                </div>
              )}

              {error && (
                <Card className="border-destructive/40 p-4 text-sm">
                  <p className="text-destructive">{error}</p>
                  <Button size="sm" variant="outline" className="mt-3 rounded-full" onClick={() => {
                    const last = [...messages].reverse().find((m) => m.role === "user");
                    if (last) send(last.content);
                  }}>
                    Retry
                  </Button>
                </Card>
              )}
              <div ref={bottomRef} />
            </div>

            {followUps.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {followUps.map((f) => (
                  <Button key={f} variant="outline" size="sm" className="rounded-full" onClick={() => send(f)}>{f}</Button>
                ))}
              </div>
            )}

            <form
              className="mt-5 flex items-center gap-2"
              onSubmit={(e) => { e.preventDefault(); send(text); }}
            >
              <Button
                type="button"
                variant={recording ? "destructive" : "secondary"}
                size="icon"
                className="min-h-11 min-w-11 shrink-0 rounded-xl"
                onClick={toggleRecord}
                disabled={transcribing || thinking}
                aria-label={recording ? "Stop recording" : "Start voice recording"}
              >
                {recording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={recording ? "Listening…" : "Describe the problem…"}
                aria-label="Your question"
                disabled={recording || busy}
              />
              <Button type="submit" size="icon" className="min-h-11 min-w-11 shrink-0 rounded-xl" disabled={!text.trim() || busy} aria-label="Send question">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </Card>
        </FadeIn>

        <FadeIn delay={0.05}>
          <Card className="p-5">
            <h2 className="text-sm font-semibold">Language</h2>
            <Select value={lang} onValueChange={(v) => setLang(v as Lang)}>
              <SelectTrigger className="mt-3" aria-label="Assistant language"><SelectValue /></SelectTrigger>
              <SelectContent>
                {LANGS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="mt-3 text-xs text-muted-foreground">
              Speech recognition, answers and spoken replies all follow this language.
            </p>
            <div className="mt-5 border-t border-border/50 pt-4 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Tips</p>
              <ul className="mt-2 space-y-1.5">
                <li>• Name the crop and what you see.</li>
                <li>• Mention leaf, stem, fruit or root.</li>
                <li>• Speak close to the mic in a quiet spot.</li>
              </ul>
            </div>
          </Card>
        </FadeIn>
      </div>
    </AppShell>
  );
}
