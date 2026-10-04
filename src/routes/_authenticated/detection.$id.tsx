import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { pageHead } from "@/lib/seo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sprout,
  FlaskConical,
  ShieldCheck,
  Trash2,
  Zap,
  Clock,
  GitCompare,
  Leaf,
  CloudSun,
  FileDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import type { DiseaseCandidate, Differential, TreatmentPlan } from "@/lib/ai.server";
import { RISK_STYLES, type RiskLevel, type WeatherSnapshot } from "@/lib/weather-types";
import { generateDetectionPdf } from "@/lib/report-pdf";
import { useProfile } from "@/lib/profile";

function WeatherAtScan({
  weather,
  risk,
}: {
  weather: WeatherSnapshot;
  risk: { level: RiskLevel; score: number; top: Array<{ name: string; score: number }> } | null;
}) {
  return (
    <Card className="p-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-muted">
          <CloudSun className="h-4 w-4" />
        </span>
        <h2 className="font-serif text-lg font-semibold">Weather at scan time</h2>
      </div>
      <p className="text-sm text-muted-foreground">
        {weather.place ?? `${weather.latitude.toFixed(2)}, ${weather.longitude.toFixed(2)}`} ·{" "}
        {weather.condition}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["Temp", `${weather.temperature}°C`],
          ["Humidity", `${weather.humidity}%`],
          ["Rain 24h", `${weather.rainfall} mm`],
          ["Wind", `${weather.wind} km/h`],
          ["UV", `${weather.uvIndex}`],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/50 bg-card/40 p-3">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-0.5 font-semibold tabular-nums">{value}</div>
          </div>
        ))}
      </div>
      {risk && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`capitalize ${RISK_STYLES[risk.level]}`}>
            Weather risk: {risk.level} · {risk.score}%
          </Badge>
          {risk.top?.map((t) => (
            <Badge key={t.name} variant="secondary">
              {t.name} {t.score}%
            </Badge>
          ))}
        </div>
      )}
    </Card>
  );
}

export const Route = createFileRoute("/_authenticated/detection/$id")({
  head: () =>
    pageHead(
      "Detection Report | CropCare",
      "Full AI diagnosis report with confidence ranking, symptoms, causes, organic and chemical treatments and prevention steps.",
    ),
  component: DetectionPage,
});

function DetectionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["detection", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("detections").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  const imgUrl = useSignedUrl("leaf-images", q.data?.image_path);
  const { data: profile } = useProfile();
  const [exporting, setExporting] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      if (q.data?.image_path)
        await supabase.storage.from("leaf-images").remove([q.data.image_path]);
      const { error } = await supabase.from("detections").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["history"] });
      qc.invalidateQueries({ queryKey: ["recent-detections"] });
      toast.success("Detection deleted");
      navigate({ to: "/history" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  if (q.isLoading)
    return (
      <AppShell>
        <Card className="p-6 text-muted-foreground">Loading…</Card>
      </AppShell>
    );
  if (q.error || !q.data)
    return (
      <AppShell>
        <Card className="p-6 text-destructive">Not found.</Card>
      </AppShell>
    );

  const d = q.data;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const asAlts = (v: unknown): DiseaseCandidate[] =>
    Array.isArray(v) ? (v as DiseaseCandidate[]) : [];
  const asDiffs = (v: unknown): Differential[] => (Array.isArray(v) ? (v as Differential[]) : []);
  const asPlans = (v: unknown): TreatmentPlan[] => (Array.isArray(v) ? (v as TreatmentPlan[]) : []);
  const healthy = !!d.is_healthy;
  const alternatives = asAlts(d.alternatives);
  const differentials = asDiffs(d.differentials);
  const organic = asPlans(d.treatment_organic_detailed);
  const chemical = asPlans(d.treatment_chemical_detailed);
  const immediate = arr(d.immediate_actions);

  async function downloadReport() {
    setExporting(true);
    try {
      await generateDetectionPdf({
        crop: d.crop,
        isHealthy: healthy,
        disease: d.disease,
        confidence: d.confidence,
        severity: d.severity,
        plantPart: d.plant_part,
        summary: d.summary,
        symptoms: arr(d.symptoms),
        causes: arr(d.causes),
        organic: arr(d.treatment_organic),
        chemical: arr(d.treatment_chemical),
        prevention: arr(d.prevention),
        weather: (d.weather as WeatherSnapshot | null) ?? null,
        createdAt: d.created_at,
        imageUrl: imgUrl,
        location: profile?.farm_place ?? null,
      });
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn’t generate the report");
    } finally {
      setExporting(false);
    }
  }

  return (
    <AppShell>
      <Link
        to="/history"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> Back to history
      </Link>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <Card className="overflow-hidden border-border">
          <div className="aspect-square bg-muted">
            {imgUrl && <img src={imgUrl} alt="Leaf" className="w-full h-full object-cover" />}
          </div>
          <div className="p-4 space-y-2">
            <div className="text-sm text-muted-foreground">Crop</div>
            <div className="font-medium">{d.crop}</div>
            <div className="text-xs text-muted-foreground pt-2">
              {new Date(d.created_at).toLocaleString()}
            </div>
            <Button
              size="sm"
              className="w-full mt-3 gap-2"
              onClick={downloadReport}
              disabled={exporting}
            >
              <FileDown className="h-4 w-4" /> {exporting ? "Preparing…" : "Download report"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 gap-2"
              onClick={() => del.mutate()}
              disabled={del.isPending}
            >
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div
                className={`grid place-items-center w-12 h-12 rounded-xl ${healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
              >
                {healthy ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-serif text-2xl font-semibold">
                  {healthy ? "Healthy leaf" : (d.disease ?? "Unknown")}
                </h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">Confidence: {d.confidence ?? 0}%</Badge>
                  {d.severity && !healthy && (
                    <Badge variant="outline" className="capitalize">
                      Severity: {d.severity}
                    </Badge>
                  )}
                  {d.plant_part && (
                    <Badge variant="outline" className="capitalize gap-1">
                      <Leaf className="h-3 w-3" /> {d.plant_part}
                    </Badge>
                  )}
                  {d.recovery_time && !healthy && (
                    <Badge variant="outline" className="gap-1">
                      <Clock className="h-3 w-3" /> {d.recovery_time}
                    </Badge>
                  )}
                </div>
                {d.summary && <p className="text-muted-foreground mt-3">{d.summary}</p>}
                {d.reasoning && !healthy && (
                  <p className="text-sm mt-3">
                    <span className="font-medium">Why this diagnosis: </span>
                    <span className="text-muted-foreground">{d.reasoning}</span>
                  </p>
                )}
              </div>
            </div>
          </Card>

          {d.weather && (
            <WeatherAtScan
              weather={d.weather as unknown as WeatherSnapshot}
              risk={
                (d.weather_risk as unknown as {
                  level: RiskLevel;
                  score: number;
                  top: Array<{ name: string; score: number }>;
                }) ?? null
              }
            />
          )}
          {!healthy && (
            <>
              {(alternatives.length > 0 || d.disease) && (
                <Card className="p-6">
                  <h2 className="font-serif text-lg font-semibold mb-4">Top possible diseases</h2>
                  <div className="space-y-4">
                    <CandidateRow
                      rank={1}
                      disease={d.disease ?? "Unknown"}
                      confidence={d.confidence ?? 0}
                      reasoning={d.reasoning ?? ""}
                      primary
                    />
                    {alternatives.map((c, i) => (
                      <CandidateRow
                        key={i}
                        rank={i + 2}
                        disease={c.disease}
                        confidence={c.confidence}
                        reasoning={c.reasoning}
                      />
                    ))}
                  </div>
                </Card>
              )}
              {immediate.length > 0 && (
                <Section
                  title="Do this now"
                  items={immediate}
                  icon={<Zap className="h-4 w-4" />}
                  tone="warning"
                />
              )}
              <Section title="Observed symptoms" items={arr(d.symptoms)} />
              <Section title="Likely causes" items={arr(d.causes)} />
              <TreatmentSection
                title="Organic treatment"
                plans={organic}
                fallback={arr(d.treatment_organic)}
                icon={<Sprout className="h-4 w-4" />}
                tone="success"
              />
              <TreatmentSection
                title="Chemical treatment"
                plans={chemical}
                fallback={arr(d.treatment_chemical)}
                icon={<FlaskConical className="h-4 w-4" />}
                tone="warning"
              />
              <Section
                title="Prevention"
                items={arr(d.prevention)}
                icon={<ShieldCheck className="h-4 w-4" />}
              />
              {differentials.length > 0 && (
                <Card className="p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="grid place-items-center w-7 h-7 rounded-md bg-muted">
                      <GitCompare className="h-4 w-4" />
                    </span>
                    <h2 className="font-serif text-lg font-semibold">Similar diseases</h2>
                  </div>
                  <ul className="space-y-3">
                    {differentials.map((diff, i) => (
                      <li key={i} className="text-sm">
                        <div className="font-medium">{diff.disease}</div>
                        <div className="text-muted-foreground">{diff.differentiator}</div>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function CandidateRow({
  rank,
  disease,
  confidence,
  reasoning,
  primary,
}: {
  rank: number;
  disease: string;
  confidence: number;
  reasoning: string;
  primary?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`grid place-items-center w-6 h-6 rounded-full text-xs font-semibold ${primary ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}
          >
            {rank}
          </span>
          <span className="font-medium truncate">{disease}</span>
        </div>
        <Badge variant={primary ? "default" : "secondary"}>{confidence}%</Badge>
      </div>
      <Progress value={confidence} className="h-1.5 mt-2" />
      {reasoning && <p className="text-xs text-muted-foreground mt-2">{reasoning}</p>}
    </div>
  );
}

function TreatmentSection({
  title,
  plans,
  fallback,
  icon,
  tone,
}: {
  title: string;
  plans: TreatmentPlan[];
  fallback: string[];
  icon?: React.ReactNode;
  tone?: "success" | "warning";
}) {
  const toneCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-foreground";
  if (!plans.length && !fallback.length) return null;
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-4">
        {icon && (
          <span className={`grid place-items-center w-7 h-7 rounded-md ${toneCls}`}>{icon}</span>
        )}
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
      </div>
      {plans.length > 0 ? (
        <div className="space-y-4">
          {plans.map((p, i) => (
            <div key={i} className="rounded-lg border border-border p-4">
              <div className="font-medium">
                {p.name}
                {p.active_ingredient ? (
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {p.active_ingredient}
                  </span>
                ) : null}
              </div>
              <dl className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">Dosage</dt>
                  <dd>{p.dosage || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Frequency
                  </dt>
                  <dd>{p.frequency || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                    Precautions
                  </dt>
                  <dd>{p.precautions || "—"}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {fallback.map((it, i) => (
            <li key={i} className="flex gap-2 text-sm">
              <span className="text-primary mt-1">•</span>
              <span>{it}</span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Section({
  title,
  items,
  icon,
  tone,
}: {
  title: string;
  items: string[];
  icon?: React.ReactNode;
  tone?: "success" | "warning";
}) {
  if (!items.length) return null;
  const toneCls =
    tone === "success"
      ? "bg-success/10 text-success"
      : tone === "warning"
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-foreground";
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-3">
        {icon && (
          <span className={`grid place-items-center w-7 h-7 rounded-md ${toneCls}`}>{icon}</span>
        )}
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
      </div>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="text-primary mt-1">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
