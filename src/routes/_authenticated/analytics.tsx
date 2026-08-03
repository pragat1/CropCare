import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle, BarChart3, Download, PieChart as PieIcon, Sprout, TrendingUp,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/analytics")({
  component: AnalyticsPage,
  head: () => ({
    meta: [
      { title: "Analytics · LeafScan Crop Insights" },
      { name: "description", content: "Interactive crop analytics: diseases this month, crop distribution, treatment success, recovery trends, scan frequency and seasonal disease patterns." },
      { property: "og:title", content: "Analytics · LeafScan Crop Insights" },
      { property: "og:description", content: "Interactive crop analytics: diseases this month, crop distribution, treatment success, recovery trends, scan frequency and seasonal disease patterns." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Detection = {
  id: string; crop: string; disease: string | null; is_healthy: boolean;
  confidence: number | null; severity: string | null; created_at: string;
};
type Progress = {
  id: string; crop: string | null; status: string | null;
  improvement_percent: number | null; created_at: string;
};

const DAY = 86_400_000;
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const PIE_COLORS = [
  "var(--primary)", "var(--chart-2, var(--success))", "var(--chart-3, var(--accent))",
  "var(--chart-4, var(--destructive))", "var(--chart-5, var(--muted-foreground))",
];

const chartTooltip = {
  contentStyle: {
    background: "var(--card)",
    border: "1px solid var(--border)",
    borderRadius: "12px",
    fontSize: "12px",
    color: "var(--foreground)",
  },
  cursor: { fill: "var(--muted)", opacity: 0.35 },
} as const;

function useAnalyticsData() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: async () => {
      const [det, trk] = await Promise.all([
        supabase
          .from("detections")
          .select("id, crop, disease, is_healthy, confidence, severity, created_at")
          .order("created_at", { ascending: false })
          .limit(1000),
        supabase
          .from("treatment_progress")
          .select("id, crop, status, improvement_percent, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (det.error) throw det.error;
      if (trk.error) throw trk.error;
      return {
        detections: (det.data ?? []) as Detection[],
        progress: (trk.data ?? []) as Progress[],
      };
    },
  });
}

function download(name: string, mime: string, body: string) {
  const url = URL.createObjectURL(new Blob([body], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]!);
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  return [headers.join(","), ...rows.map((r) => headers.map((h) => esc(r[h] ?? "")).join(","))].join("\n");
}

function AnalyticsPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useAnalyticsData();
  const [range, setRange] = useState<"30" | "90" | "365" | "all">("90");

  const stats = useMemo(() => {
    const all = data?.detections ?? [];
    const progress = data?.progress ?? [];
    const now = Date.now();
    const cutoff = range === "all" ? 0 : now - Number(range) * DAY;
    const detections = all.filter((d) => new Date(d.created_at).getTime() >= cutoff);

    // Diseases detected this month
    const nowDate = new Date();
    const thisMonth = all.filter((d) => {
      const c = new Date(d.created_at);
      return !d.is_healthy && d.disease
        && c.getMonth() === nowDate.getMonth() && c.getFullYear() === nowDate.getFullYear();
    });
    const monthCounts = new Map<string, number>();
    for (const d of thisMonth) monthCounts.set(d.disease!, (monthCounts.get(d.disease!) ?? 0) + 1);
    const monthDiseases = [...monthCounts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // Crop distribution
    const cropCounts = new Map<string, number>();
    for (const d of detections) cropCounts.set(d.crop, (cropCounts.get(d.crop) ?? 0) + 1);
    const crops = [...cropCounts.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    const cropTop = crops.slice(0, 5);
    const cropRest = crops.slice(5).reduce((s, c) => s + c.value, 0);
    const cropDistribution = cropRest > 0 ? [...cropTop, { name: "Other", value: cropRest }] : cropTop;

    // Treatment success
    const recovered = progress.filter((p) => (p.status ?? "").toLowerCase().includes("recover")
      || (p.status ?? "").toLowerCase().includes("improv")
      || (p.improvement_percent ?? 0) >= 50).length;
    const successRate = progress.length ? Math.round((recovered / progress.length) * 100) : null;
    const successSplit = [
      { name: "Improved", value: recovered },
      { name: "Not yet", value: Math.max(0, progress.length - recovered) },
    ].filter((s) => s.value > 0);

    // Recovery trends — avg improvement % per month (last 6 months)
    const recovery = Array.from({ length: 6 }, (_, i) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - i));
      const rows = progress.filter((p) => {
        const c = new Date(p.created_at);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      });
      const vals = rows.map((r) => r.improvement_percent ?? 0);
      return {
        name: MONTHS[d.getMonth()]!,
        improvement: vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 0,
        logs: rows.length,
      };
    });

    // Scan frequency — per day over selected range (capped at 30 buckets)
    const days = range === "all" ? 30 : Math.min(Number(range), 30);
    const frequency = Array.from({ length: days }, (_, i) => {
      const day = new Date(now - (days - 1 - i) * DAY);
      const key = day.toDateString();
      const rows = all.filter((d) => new Date(d.created_at).toDateString() === key);
      return {
        name: day.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        scans: rows.length,
      };
    });

    // Seasonal disease patterns — diseased vs healthy per calendar month (all data)
    const seasonal = MONTHS.map((m, idx) => {
      const rows = all.filter((d) => new Date(d.created_at).getMonth() === idx);
      return {
        name: m,
        diseased: rows.filter((r) => !r.is_healthy).length,
        healthy: rows.filter((r) => r.is_healthy).length,
      };
    });

    const diseasedCount = detections.filter((d) => !d.is_healthy).length;

    return {
      detections, progress, monthDiseases, cropDistribution, successRate, successSplit,
      recovery, frequency, seasonal, diseasedCount,
      totalScans: detections.length,
      thisMonthCount: thisMonth.length,
    };
  }, [data, range]);

  function exportCsv() {
    const rows = stats.detections.map((d) => ({
      date: new Date(d.created_at).toISOString(),
      crop: d.crop,
      status: d.is_healthy ? "healthy" : "diseased",
      disease: d.disease ?? "",
      severity: d.severity ?? "",
      confidence: d.confidence ?? "",
    }));
    if (rows.length === 0) return toast.error("No scans in this range to export.");
    download(`leafscan-scans-${new Date().toISOString().slice(0, 10)}.csv`, "text/csv;charset=utf-8", toCsv(rows));
    toast.success(`Exported ${rows.length} scans as CSV`);
  }

  function exportSummary() {
    const report = {
      generated_at: new Date().toISOString(),
      range_days: range,
      total_scans: stats.totalScans,
      diseased_scans: stats.diseasedCount,
      diseases_this_month: stats.thisMonthCount,
      treatment_success_rate: stats.successRate,
      top_diseases_this_month: stats.monthDiseases,
      crop_distribution: stats.cropDistribution,
      recovery_trend: stats.recovery,
      seasonal_patterns: stats.seasonal,
    };
    download(
      `leafscan-report-${new Date().toISOString().slice(0, 10)}.json`,
      "application/json",
      JSON.stringify(report, null, 2),
    );
    toast.success("Summary report exported");
  }

  if (isError) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h2 className="mt-3 font-serif text-xl font-semibold">Couldn’t load analytics</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => refetch()} disabled={isFetching}>Try again</Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        icon={BarChart3}
        eyebrow="Insights"
        title="Analytics"
        description="Interactive charts across your scans, crops and treatments — with exportable reports."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={range} onValueChange={(v) => setRange(v as typeof range)}>
              <SelectTrigger className="w-[150px] rounded-full" aria-label="Select time range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" className="gap-2 rounded-full" onClick={exportCsv}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button className="gap-2 rounded-full" onClick={exportSummary}>
              <Download className="h-4 w-4" /> Report
            </Button>
          </div>
        }
      />

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[122px] rounded-2xl" />)}
        </div>
      ) : (
        <>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Scans in range", value: stats.totalScans, hint: range === "all" ? "All time" : `Last ${range} days`, icon: BarChart3 },
              { label: "Diseases this month", value: stats.thisMonthCount, hint: `${stats.monthDiseases.length} distinct disease${stats.monthDiseases.length === 1 ? "" : "s"}`, icon: AlertTriangle },
              { label: "Treatment success", value: stats.successRate === null ? "—" : `${stats.successRate}%`, hint: `${stats.progress.length} tracker log${stats.progress.length === 1 ? "" : "s"}`, icon: TrendingUp },
              { label: "Crops tracked", value: stats.cropDistribution.length, hint: "Distinct crops scanned", icon: Sprout },
            ].map(({ label, value, hint, icon: Icon }) => (
              <StaggerItem key={label}>
                <Card className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
                      <p className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>
                    </div>
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </Card>
              </StaggerItem>
            ))}
          </Stagger>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <FadeIn delay={0.05}>
              <Card className="h-full p-6">
                <h2 className="font-serif text-lg font-semibold">Diseases detected this month</h2>
                <p className="mt-1 text-sm text-muted-foreground">Most frequent findings in {MONTHS[new Date().getMonth()]}.</p>
                <div className="mt-4 h-[280px] w-full">
                  {stats.monthDiseases.length === 0 ? (
                    <EmptyChart label="No diseases detected this month." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.monthDiseases} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                        <YAxis type="category" dataKey="name" width={110} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                        <Tooltip {...chartTooltip} />
                        <Bar dataKey="count" radius={[0, 8, 8, 0]} fill="var(--destructive)" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2">
                  <PieIcon className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Crop distribution</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Share of scans by crop in the selected range.</p>
                <div className="mt-4 h-[280px] w-full">
                  {stats.cropDistribution.length === 0 ? (
                    <EmptyChart label="No scans in this range." />
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={stats.cropDistribution} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={3}>
                          {stats.cropDistribution.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip {...chartTooltip} />
                        <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </Card>
            </FadeIn>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <FadeIn delay={0.05}>
              <Card className="flex h-full flex-col p-6">
                <h2 className="font-serif text-lg font-semibold">Treatment success</h2>
                <p className="mt-1 text-sm text-muted-foreground">Share of tracker logs showing improvement.</p>
                <div className="mt-4 flex flex-1 items-center justify-center">
                  {stats.successSplit.length === 0 ? (
                    <EmptyChart label="Log a treatment in the tracker to see success rates." />
                  ) : (
                    <div className="text-center">
                      <div
                        className="mx-auto grid h-40 w-40 place-items-center rounded-full"
                        style={{ background: `conic-gradient(var(--primary) ${(stats.successRate ?? 0) * 3.6}deg, var(--muted) 0deg)` }}
                        role="img"
                        aria-label={`Treatment success rate ${stats.successRate ?? 0} percent`}
                      >
                        <div className="grid h-32 w-32 place-items-center rounded-full bg-card">
                          <span className="font-serif text-4xl font-semibold">{stats.successRate}%</span>
                          <span className="text-xs text-muted-foreground">improved</span>
                        </div>
                      </div>
                      <div className="mt-4 flex justify-center gap-2">
                        {stats.successSplit.map((s) => (
                          <Badge key={s.name} variant="secondary">{s.name}: {s.value}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Recovery trends</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Average recorded improvement per month.</p>
                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={stats.recovery} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis domain={[0, 100]} unit="%" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip {...chartTooltip} />
                      <Line type="monotone" dataKey="improvement" stroke="var(--primary)" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </FadeIn>
          </div>

          <div className="mt-6 grid gap-6">
            <FadeIn delay={0.05}>
              <Card className="p-6">
                <h2 className="font-serif text-lg font-semibold">Scan frequency</h2>
                <p className="mt-1 text-sm text-muted-foreground">Daily scan volume over the recent period.</p>
                <div className="mt-4 h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.frequency} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gScans" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval="preserveStartEnd" minTickGap={20} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip {...chartTooltip} />
                      <Area type="monotone" dataKey="scans" stroke="var(--primary)" fill="url(#gScans)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="p-6">
                <h2 className="font-serif text-lg font-semibold">Seasonal disease patterns</h2>
                <p className="mt-1 text-sm text-muted-foreground">Healthy vs diseased scans grouped by calendar month (all time).</p>
                <div className="mt-4 h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.seasonal} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip {...chartTooltip} />
                      <Legend verticalAlign="top" height={28} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="healthy" stackId="s" fill="var(--primary)" radius={[0, 0, 0, 0]} />
                      <Bar dataKey="diseased" stackId="s" fill="var(--destructive)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </FadeIn>
          </div>
        </>
      )}
    </AppShell>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}