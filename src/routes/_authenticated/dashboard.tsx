import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  Activity, AlertTriangle, CalendarDays, CheckCircle2, LayoutDashboard, Leaf,
  LineChart as LineChartIcon, ScanLine, Sprout, Bell, ArrowRight, Brain,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · LeafScan Crop Health" },
      { name: "description", content: "Track scans, crop health score, disease trends and treatment reminders in one AI-powered farming dashboard." },
      { property: "og:title", content: "Dashboard · LeafScan Crop Health" },
      { property: "og:description", content: "Track scans, crop health score, disease trends and treatment reminders in one AI-powered farming dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Detection = {
  id: string; crop: string; disease: string | null; is_healthy: boolean;
  confidence: number | null; severity: string | null; created_at: string;
};
type Tracker = { id: string; crop: string | null; created_at: string };

const DAY = 86_400_000;

function useDashboardData() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const [det, trk] = await Promise.all([
        supabase
          .from("detections")
          .select("id, crop, disease, is_healthy, confidence, severity, created_at")
          .order("created_at", { ascending: false })
          .limit(500),
        supabase
          .from("treatment_progress")
          .select("id, crop, created_at")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);
      if (det.error) throw det.error;
      if (trk.error) throw trk.error;
      return {
        detections: (det.data ?? []) as Detection[],
        trackers: (trk.data ?? []) as Tracker[],
      };
    },
  });
}

function StatCard({
  icon: Icon, label, value, hint, tone = "default",
}: {
  icon: typeof Leaf; label: string; value: string | number; hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneCls =
    tone === "success" ? "bg-success/15 text-success"
    : tone === "danger" ? "bg-destructive/10 text-destructive"
    : "bg-primary/10 text-primary";
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
          <p className="mt-2 font-serif text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneCls}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
    </Card>
  );
}

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

function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDashboardData();

  const stats = useMemo(() => {
    const detections = data?.detections ?? [];
    const total = detections.length;
    const healthy = detections.filter((d) => d.is_healthy).length;
    const diseased = total - healthy;

    const counts = new Map<string, number>();
    for (const d of detections) {
      if (d.is_healthy || !d.disease) continue;
      counts.set(d.disease, (counts.get(d.disease) ?? 0) + 1);
    }
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];

    // Health score: share of healthy scans, penalised by high-severity findings.
    const highSeverity = detections.filter(
      (d) => !d.is_healthy && (d.severity ?? "").toLowerCase() === "high",
    ).length;
    const score = total
      ? Math.max(0, Math.min(100, Math.round((healthy / total) * 100 - (highSeverity / total) * 15)))
      : null;

    const now = Date.now();
    const weekly = Array.from({ length: 7 }, (_, idx) => {
      const day = new Date(now - (6 - idx) * DAY);
      const key = day.toDateString();
      const rows = detections.filter((d) => new Date(d.created_at).toDateString() === key);
      return {
        name: day.toLocaleDateString(undefined, { weekday: "short" }),
        healthy: rows.filter((r) => r.is_healthy).length,
        diseased: rows.filter((r) => !r.is_healthy).length,
      };
    });

    const monthly = Array.from({ length: 6 }, (_, idx) => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (5 - idx));
      const rows = detections.filter((r) => {
        const c = new Date(r.created_at);
        return c.getMonth() === d.getMonth() && c.getFullYear() === d.getFullYear();
      });
      return { name: d.toLocaleDateString(undefined, { month: "short" }), scans: rows.length };
    });

    // Reminders: diseased crops from the last 21 days with no follow-up tracker entry after the scan.
    const trackers = data?.trackers ?? [];
    const reminders = detections
      .filter((d) => !d.is_healthy && now - new Date(d.created_at).getTime() < 21 * DAY)
      .filter((d) => !trackers.some(
        (t) => (t.crop ?? "").toLowerCase() === d.crop.toLowerCase()
          && new Date(t.created_at).getTime() > new Date(d.created_at).getTime(),
      ))
      .slice(0, 4);

    return { total, healthy, diseased, top, score, weekly, monthly, reminders, recent: detections.slice(0, 5) };
  }, [data]);

  if (isError) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h2 className="mt-3 font-serif text-xl font-semibold">Couldn’t load your dashboard</h2>
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
        icon={LayoutDashboard}
        eyebrow="Overview"
        title="Farm dashboard"
        description="Your crop health at a glance — scans, trends, and what needs attention next."
        actions={
          <Link to="/app">
            <Button className="gap-2 rounded-full"><ScanLine className="h-4 w-4" /> New scan</Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[122px] rounded-2xl" />)}
        </div>
      ) : (
        <>
          <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StaggerItem><StatCard icon={ScanLine} label="Total scans" value={stats.total} hint="All-time leaf analyses" /></StaggerItem>
            <StaggerItem><StatCard icon={CheckCircle2} tone="success" label="Healthy crops" value={stats.healthy} hint={stats.total ? `${Math.round((stats.healthy / stats.total) * 100)}% of scans` : "No scans yet"} /></StaggerItem>
            <StaggerItem><StatCard icon={AlertTriangle} tone="danger" label="Diseased crops" value={stats.diseased} hint={stats.total ? `${Math.round((stats.diseased / stats.total) * 100)}% of scans` : "No scans yet"} /></StaggerItem>
            <StaggerItem>
              <StatCard
                icon={Activity}
                label="Most common disease"
                value={stats.top ? stats.top[0] : "—"}
                hint={stats.top ? `${stats.top[1]} detection${stats.top[1] > 1 ? "s" : ""}` : "No diseases detected"}
              />
            </StaggerItem>
          </Stagger>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.6fr]">
            <FadeIn delay={0.05}>
              <Card className="flex h-full flex-col items-center justify-center p-6 text-center">
                <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">Crop health score</p>
                <div
                  className="relative mt-5 grid h-40 w-40 place-items-center rounded-full"
                  style={{
                    background: `conic-gradient(var(--primary) ${(stats.score ?? 0) * 3.6}deg, var(--muted) 0deg)`,
                  }}
                  role="img"
                  aria-label={`Crop health score ${stats.score ?? 0} out of 100`}
                >
                  <div className="grid h-32 w-32 place-items-center rounded-full bg-card">
                    <span className="font-serif text-4xl font-semibold">{stats.score ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">out of 100</span>
                  </div>
                </div>
                <p className="mt-5 max-w-xs text-sm text-muted-foreground">
                  {stats.score === null
                    ? "Run your first scan to generate a health score."
                    : stats.score >= 80 ? "Excellent — your fields are largely healthy."
                    : stats.score >= 50 ? "Moderate — a few crops need treatment."
                    : "At risk — several diseased crops detected."}
                </p>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2">
                  <LineChartIcon className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Weekly activity</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Healthy vs diseased scans over the last 7 days.</p>
                <div className="mt-4 h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={stats.weekly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gHealthy" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gDiseased" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.45} />
                          <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip {...chartTooltip} />
                      <Area type="monotone" dataKey="healthy" stroke="var(--primary)" fill="url(#gHealthy)" strokeWidth={2} />
                      <Area type="monotone" dataKey="diseased" stroke="var(--destructive)" fill="url(#gDiseased)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </FadeIn>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <FadeIn delay={0.05}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Monthly scans</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Scan volume over the last 6 months.</p>
                <div className="mt-4 h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stats.monthly} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                      <Tooltip {...chartTooltip} />
                      <Bar dataKey="scans" radius={[8, 8, 0, 0]} fill="var(--primary)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" />
                  <h2 className="font-serif text-lg font-semibold">Treatment reminders</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Diseased crops with no follow-up logged yet.</p>
                <div className="mt-4 space-y-3">
                  {stats.reminders.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-success" />
                      Nothing pending — all treated crops are up to date.
                    </div>
                  ) : (
                    stats.reminders.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                          <AlertTriangle className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.disease ?? "Unknown disease"}</p>
                          <p className="text-xs text-muted-foreground">
                            {r.crop} · scanned {new Date(r.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Link to="/tracker">
                          <Button size="sm" variant="secondary" className="rounded-lg">Log</Button>
                        </Link>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </FadeIn>
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <FadeIn delay={0.05}>
              <Card className="h-full p-6">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-serif text-lg font-semibold">Recent scans</h2>
                  <Link to="/history">
                    <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground">
                      View all <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
                <div className="mt-4 space-y-3">
                  {stats.recent.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                      <Leaf className="mx-auto mb-2 h-5 w-5 opacity-60" />
                      No scans yet. Start with your first leaf analysis.
                    </div>
                  ) : (
                    stats.recent.map((d) => (
                      <Link key={d.id} to="/detection/$id" params={{ id: d.id }} className="block">
                        <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/30">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${d.is_healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                            {d.is_healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.is_healthy ? "Healthy" : (d.disease ?? "Unknown")}</p>
                            <p className="text-xs text-muted-foreground">{d.crop} · {new Date(d.created_at).toLocaleDateString()}</p>
                          </div>
                          <Badge variant="secondary">{d.confidence ?? 0}%</Badge>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </Card>
            </FadeIn>

            <FadeIn delay={0.1}>
              <Card className="h-full p-6">
                <h2 className="font-serif text-lg font-semibold">Quick actions</h2>
                <p className="mt-1 text-sm text-muted-foreground">Jump straight into the tools you use most.</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {([
                    { to: "/app", label: "New scan", icon: ScanLine },
                    { to: "/soil", label: "Soil test", icon: Sprout },
                    { to: "/tracker", label: "Tracker", icon: LineChartIcon },
                    { to: "/quiz", label: "Quiz", icon: Brain },
                  ] as const).map(({ to, label, icon: Icon }) => (
                    <Link key={to} to={to}>
                      <Button variant="secondary" className="h-24 w-full flex-col gap-2 rounded-2xl">
                        <Icon className="h-5 w-5 text-primary" />
                        <span className="text-sm">{label}</span>
                      </Button>
                    </Link>
                  ))}
                </div>
              </Card>
            </FadeIn>
          </div>
        </>
      )}
    </AppShell>
  );
}