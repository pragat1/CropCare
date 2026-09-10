import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Upload,
  ScanLine,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Leaf,
  RotateCcw,
  ImageIcon,
  Trash2,
  ArrowRight,
  CloudOff,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { analyzeDetection } from "@/lib/detect.functions";
import { AppShell } from "@/components/app-shell";
import { compressImage, validateImageFile } from "@/lib/image-client";
import { PageHeader } from "@/components/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { useWeatherIntel } from "@/components/weather-panel";
import { queueScan } from "@/lib/offline/sync";
import { saveScans } from "@/lib/offline/scan-cache";
import { usePendingQueue, useSyncStatus } from "@/hooks/use-offline";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { RISK_STYLES, type RiskLevel } from "@/lib/weather-types";

const CROPS = [
  "Tomato",
  "Potato",
  "Rice",
  "Wheat",
  "Corn",
  "Cotton",
  "Grape",
  "Apple",
  "Mango",
  "Sugarcane",
  "Soybean",
  "Pepper",
  "Other",
];

export const Route = createFileRoute("/_authenticated/app")({
  head: () =>
    pageHead(
      "Detect Disease — Analyze Your Crop | LeafScan",
      "Upload a leaf photo and review it before running an AI disease analysis with severity, affected plant part and treatment guidance.",
    ),
  component: DetectPage,
});

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

function DetectPage() {
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeDetection);
  const [crop, setCrop] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultId, setResultId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const weather = useWeatherIntel(crop || "Tomato");
  const { online, syncing, pending, syncNow } = useSyncStatus();
  const queued = usePendingQueue();

  const recent = useQuery({
    queryKey: ["recent-detections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detections")
        .select("id, crop, disease, is_healthy, confidence, severity, created_at, image_path")
        .order("created_at", { ascending: false })
        .limit(4);
      if (error) throw error;
      return data;
    },
  });

  // Keep a local copy of the latest scans so they can be read offline.
  useEffect(() => {
    if (recent.data?.length) {
      void saveScans(
        recent.data.map((d) => ({
          id: d.id,
          crop: d.crop,
          disease: d.disease,
          is_healthy: d.is_healthy,
          confidence: d.confidence,
          severity: d.severity ?? null,
          summary: null,
          created_at: d.created_at,
        })),
      );
    }
  }, [recent.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a leaf image");
      if (!crop) throw new Error("Please select a crop");
      const intelForQueue = weather.intel;
      if (!navigator.onLine) {
        await queueScan({
          crop,
          file,
          weather: intelForQueue?.weather,
          weatherRisk: intelForQueue
            ? {
                level: intelForQueue.overall.level,
                score: intelForQueue.overall.score,
                top: intelForQueue.risks
                  .slice(0, 3)
                  .map((r) => ({ name: r.name, level: r.level, score: r.score })),
              }
            : undefined,
        });
        return null;
      }
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const compressed = await compressImage(file);
      const ext = (compressed.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("leaf-images")
        .upload(path, compressed, { contentType: compressed.type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const intel = weather.intel;
      const res = await analyze({
        data: {
          crop,
          imagePath: path,
          weather: intel?.weather,
          weatherRisk: intel
            ? {
                level: intel.overall.level,
                score: intel.overall.score,
                top: intel.risks
                  .slice(0, 3)
                  .map((r) => ({ name: r.name, level: r.level, score: r.score })),
              }
            : undefined,
        },
      });
      return res.id;
    },
    retry: (count, err) => {
      const msg = err instanceof Error ? err.message : "";
      if (/timed out|upstream|network|502|503|504/i.test(msg) && count < 2) return true;
      return false;
    },
    retryDelay: (attempt) => 500 * 2 ** attempt,
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["recent-detections"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      if (!id) {
        reset();
        toast.success("Saved offline — it will upload automatically when you're back online");
        return;
      }
      setResultId(id);
      toast.success("Analysis complete");
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    },
  });

  function reset() {
    setFile(null);
    setPreview(null);
    setResultId(null);
    mutation.reset();
    if (inputRef.current) inputRef.current.value = "";
  }

  function onPick(f: File | null) {
    if (!f) return;
    const err = validateImageFile(f);
    if (err) {
      toast.error(err);
      return;
    }
    setResultId(null);
    mutation.reset();
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const analyzing = mutation.isPending;

  return (
    <AppShell>
      <PageHeader
        icon={ScanLine}
        eyebrow="Detect"
        title="Analyze your crop"
        description="Review your uploaded leaf image before starting the disease analysis."
      />

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        {/* LEFT — image */}
        <FadeIn>
          {preview ? (
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3">
                <h2 className="font-serif text-lg font-semibold">Uploaded leaf</h2>
                {analyzing && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> Analyzing
                  </span>
                )}
              </div>
              <div className="relative bg-muted/30">
                <img
                  src={preview}
                  alt={file ? `Uploaded leaf photo: ${file.name}` : "Uploaded leaf photo"}
                  className="max-h-[460px] w-full object-contain"
                />
                {analyzing && (
                  <>
                    <div
                      className="pointer-events-none absolute inset-0 bg-primary/5"
                      aria-hidden
                    />
                    <motion.div
                      aria-hidden
                      className="pointer-events-none absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-primary/20 to-transparent"
                      initial={{ top: "0%" }}
                      animate={{ top: ["0%", "88%", "0%"] }}
                      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
                    />
                  </>
                )}
              </div>
              {file && (
                <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                  <p className="min-w-0 truncate text-xs text-muted-foreground">
                    {file.name} · {file.type.replace("image/", "").toUpperCase()} ·{" "}
                    {formatSize(file.size)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      disabled={analyzing}
                      onClick={() => inputRef.current?.click()}
                    >
                      <ImageIcon className="h-3.5 w-3.5" /> Change image
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                      disabled={analyzing}
                      onClick={reset}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ) : (
            <Card
              role="button"
              tabIndex={0}
              aria-label="Upload a leaf photo"
              className="grid min-h-[340px] cursor-pointer place-items-center border-2 border-dashed border-border p-8 transition-colors hover:border-primary/50"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  inputRef.current?.click();
                }
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                onPick(e.dataTransfer.files?.[0] ?? null);
              }}
            >
              <div className="text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Upload className="h-6 w-6" aria-hidden />
                </span>
                <h2 className="mt-4 font-serif text-xl font-semibold">Upload a leaf photo</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
                  Use a clear image of the affected leaf for better analysis.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or WebP · up to 8MB</p>
                <Button className="mt-5 gap-2" onClick={() => inputRef.current?.click()}>
                  <Upload className="h-4 w-4" /> Choose image
                </Button>
              </div>
            </Card>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            aria-label="Leaf image file"
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </FadeIn>

        {/* RIGHT — setup / processing / result */}
        <FadeIn delay={0.08}>
          {resultId ? (
            <ResultCard id={resultId} onNewScan={reset} />
          ) : analyzing ? (
            <Card className="p-6">
              <div className="flex items-center gap-3">
                <motion.span
                  className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"
                  animate={{ scale: [1, 1.08, 1], opacity: [0.8, 1, 0.8] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  aria-hidden
                >
                  <Leaf className="h-5 w-5" />
                </motion.span>
                <div>
                  <h2 className="font-serif text-lg font-semibold">Analyzing your leaf…</h2>
                  <p className="text-sm text-muted-foreground">
                    We're examining the uploaded image for visible signs of disease.
                  </p>
                </div>
              </div>
              <div
                className="mt-5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                role="status"
                aria-live="polite"
                aria-label="Analysis in progress"
              >
                <motion.div
                  className="h-full w-1/3 rounded-full bg-primary"
                  animate={{ x: ["-100%", "300%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                This usually takes a few seconds. Please keep this tab open.
              </p>
            </Card>
          ) : mutation.isError ? (
            <Card className="p-6">
              <div className="flex items-start gap-3 text-destructive">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
                <div>
                  <h2 className="font-serif text-lg font-semibold">
                    We couldn't analyze this image
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mutation.error instanceof Error
                      ? mutation.error.message
                      : "The analysis did not complete."}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  className="gap-2"
                  onClick={() => mutation.mutate()}
                  disabled={!file || !crop}
                >
                  <RotateCcw className="h-4 w-4" /> Try again
                </Button>
                <Button variant="outline" onClick={() => inputRef.current?.click()}>
                  Choose another image
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="p-6">
              <h2 className="font-serif text-lg font-semibold">Analysis details</h2>

              <label htmlFor="crop-select" className="mt-5 block text-sm font-medium">
                Crop
              </label>
              <Select value={crop} onValueChange={setCrop}>
                <SelectTrigger id="crop-select" className="mt-2" aria-label="Crop">
                  <SelectValue placeholder="Select crop" />
                </SelectTrigger>
                <SelectContent>
                  {CROPS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="mt-6 rounded-xl border border-border/60 bg-muted/30 p-4">
                <h3 className="text-sm font-medium">What happens next?</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Our disease detection system will analyze the uploaded leaf image for visible
                  signs of plant disease.
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {[
                    "Image quality check",
                    "Leaf analysis",
                    "Disease identification",
                    "Confidence assessment",
                    "Recommendations, if available",
                  ].map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-primary/60" aria-hidden />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <Button
                className="mt-6 w-full gap-2"
                size="lg"
                disabled={!file || !crop}
                onClick={() => mutation.mutate()}
              >
                {online ? (
                  <>
                    <ScanLine className="h-4 w-4" /> Analyze leaf
                  </>
                ) : (
                  <>
                    <CloudOff className="h-4 w-4" /> Save scan for later
                  </>
                )}
              </Button>
              {!file && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Upload a leaf photo to continue.
                </p>
              )}
              {file && !crop && (
                <p className="mt-2 text-center text-xs text-muted-foreground">
                  Select a crop to continue.
                </p>
              )}
              {!online && (
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
                  <CloudOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warning" aria-hidden />
                  You're offline. Scans are stored on this device and analyzed automatically as soon
                  as the connection returns.
                </p>
              )}
            </Card>
          )}

          {queued.length > 0 && (
            <Card className="mt-6 p-5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 font-medium">
                  <Clock className="h-4 w-4 text-warning" aria-hidden />
                  Waiting to sync ({pending})
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={!online || syncing}
                  onClick={() => void syncNow()}
                >
                  {syncing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Syncing…
                    </>
                  ) : (
                    "Sync now"
                  )}
                </Button>
              </div>
              <ul className="mt-3 space-y-2 text-sm">
                {queued.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
                  >
                    <span className="truncate">
                      {item.crop} · {new Date(item.createdAt).toLocaleString()}
                    </span>
                    <Badge variant={item.lastError ? "destructive" : "secondary"}>
                      {item.lastError ? "Retry pending" : "Queued"}
                    </Badge>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </FadeIn>
      </div>

      <RecentScans
        items={recent.data ?? null}
        isLoading={recent.isLoading}
        error={recent.error ? "Couldn't load your previous scans." : null}
      />
    </AppShell>
  );
}

type RecentRow = {
  id: string;
  crop: string;
  disease: string | null;
  is_healthy: boolean | null;
  confidence: number | null;
  severity: string | null;
  created_at: string;
  image_path: string | null;
};

function RecentScans({
  items,
  isLoading,
  error,
}: {
  items: RecentRow[] | null;
  isLoading: boolean;
  error: string | null;
}) {
  return (
    <section className="mt-10">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="font-serif text-xl font-semibold">Recent scans</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your most recent completed analyses.</p>
        </div>
        <Link to="/history">
          <Button variant="ghost" size="sm" className="gap-1">
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {isLoading && <Card className="mt-4 p-5 text-sm text-muted-foreground">Loading…</Card>}
      {error && <Card className="mt-4 p-5 text-sm text-destructive">{error}</Card>}
      {items && items.length === 0 && (
        <Card className="mt-4 border-dashed p-8 text-center text-sm text-muted-foreground">
          <Leaf className="mx-auto mb-2 h-6 w-6 opacity-60" aria-hidden />
          No previous scans yet. Your completed analyses will appear here.
        </Card>
      )}
      {items && items.length > 0 && (
        <Stagger className="mt-4 grid gap-3 sm:grid-cols-2">
          {items.map((d) => (
            <StaggerItem key={d.id}>
              <Link to="/detection/$id" params={{ id: d.id }}>
                <ScanRow row={d} />
              </Link>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </section>
  );
}

function ScanRow({ row }: { row: RecentRow }) {
  const thumb = useSignedUrl("leaf-images", row.image_path);
  return (
    <Card className="flex items-center gap-3 p-3 transition-colors hover:bg-muted/40">
      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
        {thumb ? (
          <img
            src={thumb}
            alt={`${row.crop} leaf scan`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-muted-foreground">
            <Leaf className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium">
          {row.is_healthy ? "Healthy" : (row.disease ?? "Result unavailable")}
        </div>
        <div className="text-xs text-muted-foreground">
          {row.crop} · {new Date(row.created_at).toLocaleDateString()}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {row.severity && !row.is_healthy && (
          <Badge variant="outline" className="capitalize">
            {row.severity}
          </Badge>
        )}
        {typeof row.confidence === "number" && <Badge variant="secondary">{row.confidence}%</Badge>}
      </div>
    </Card>
  );
}

function ResultCard({ id, onNewScan }: { id: string; onNewScan: () => void }) {
  const q = useQuery({
    queryKey: ["detection", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("detections").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  if (q.isLoading)
    return <Card className="p-6 text-sm text-muted-foreground">Loading result…</Card>;
  if (q.error || !q.data)
    return (
      <Card className="p-6">
        <p className="text-sm text-destructive">We couldn't load this result.</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onNewScan}>
          New scan
        </Button>
      </Card>
    );

  const d = q.data;
  const healthy = Boolean(d.is_healthy);
  const actions: string[] = Array.isArray(d.immediate_actions)
    ? (d.immediate_actions as string[])
    : [];
  const weatherRisk = (
    d.weather_risk && typeof d.weather_risk === "object"
      ? (d.weather_risk as { level?: RiskLevel; score?: number })
      : null
  ) as { level?: RiskLevel; score?: number } | null;

  return (
    <Card className="p-6">
      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Detection result
      </span>
      <div className="mt-3 flex items-start gap-3">
        <span
          className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
          aria-hidden
        >
          {healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-2xl font-semibold">
            {healthy ? "Healthy" : (d.disease ?? "Result unavailable")}
          </h2>
          <p className="text-sm text-muted-foreground">{d.crop}</p>
        </div>
      </div>

      {typeof d.confidence === "number" && (
        <div className="mt-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-semibold tabular-nums">{d.confidence}%</span>
          </div>
          <Progress value={d.confidence} className="mt-2 h-2" />
        </div>
      )}

      {d.severity && !healthy && (
        <div className="mt-4 flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Risk level</span>
          <Badge variant="outline" className="capitalize">
            {d.severity}
          </Badge>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-medium">What we found</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          {d.summary ?? d.reasoning ?? "Detailed explanation is not available for this analysis."}
        </p>
      </div>

      {actions.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Recommended next steps</h3>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            {actions.slice(0, 4).map((a) => (
              <li key={a} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary/70" aria-hidden />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}

      {weatherRisk?.level && typeof weatherRisk.score === "number" && (
        <div className="mt-5">
          <h3 className="text-sm font-medium">Weather context</h3>
          <Badge
            variant="outline"
            className={`mt-2 capitalize ${RISK_STYLES[weatherRisk.level] ?? ""}`}
          >
            Weather risk at scan time: {weatherRisk.level} · {weatherRisk.score}%
          </Badge>
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link to="/detection/$id" params={{ id }}>
          <Button className="gap-2">
            View full report <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link to="/tracker">
          <Button variant="outline">View treatment</Button>
        </Link>
        <Button variant="ghost" onClick={onNewScan}>
          New scan
        </Button>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        This analysis is saved to your scan history automatically.
      </p>
    </Card>
  );
}
