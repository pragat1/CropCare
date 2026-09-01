import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Suspense, lazy, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Brain,
  Bell,
  CheckCircle2,
  CloudSun,
  History,
  LayoutDashboard,
  Leaf,
  LineChart as LineChartIcon,
  MapPin,
  ScanLine,
  Sprout,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { farmCoords, useProfile } from "@/lib/profile";
import { isOverdue, kindMeta, useReminders, useToggleReminder } from "@/lib/reminders";
import { getWeatherIntel } from "@/lib/weather.functions";
import { RISK_STYLES, type WeatherIntel } from "@/lib/weather-types";

const ActivityChart = lazy(() =>
  import("@/components/dashboard/charts").then((m) => ({ default: m.ActivityChart })),
);
const DistributionChart = lazy(() =>
  import("@/components/dashboard/charts").then((m) => ({ default: m.DistributionChart })),
);

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Dashboard · LeafScan Crop Health" },
      {
        name: "description",
        content:
          "Track scans, healthy scan rate, disease trends, farm weather and treatment reminders in one AI-powered farming dashboard.",
      },
      { property: "og:title", content: "Dashboard · LeafScan Crop Health" },
      {
        property: "og:description",
        content:
          "Track scans, healthy scan rate, disease trends, farm weather and treatment reminders in one AI-powered farming dashboard.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

type Detection = {
  id: string;
  crop: string;
  disease: string | null;
  is_healthy: boolean;
  confidence: number | null;
  severity: string | null;
  image_path: string | null;
  created_at: string;
};

const DAY = 86_400_000;

/** All dashboard numbers come from this single scan query — nothing is synthesised. */
function useDetections() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: async (): Promise<Detection[]> => {
      const { data, error } = await supabase
        .from("detections")
        .select("id, crop, disease, is_healthy, confidence, severity, image_path, created_at")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as Detection[];
    },
  });
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
}

const QUICK_ACTIONS = [
  { to: "/app", label: "New scan", hint: "Detect disease", icon: ScanLine },
  { to: "/soil", label: "Soil analysis", hint: "Check soil health", icon: Sprout },
  { to: "/weather", label: "Weather", hint: "Field conditions", icon: CloudSun },
  { to: "/assistant", label: "AI assistant", hint: "Ask anything", icon: Brain },
  { to: "/history", label: "History", hint: "All past scans", icon: History },
  { to: "/diseases", label: "Disease library", hint: "Browse diseases", icon: BookOpen },
] as const;

function QuickActions() {
  return (
    <Card className="p-6">
      <h2 className="font-serif text-lg font-semibold">Quick actions</h2>
      <Stagger className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {QUICK_ACTIONS.map(({ to, label, hint, icon: Icon }) => (
          <StaggerItem key={to}>
            <Link
              to={to}
              className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{label}</span>
                <span className="block truncate text-xs text-muted-foreground">{hint}</span>
              </span>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </Card>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
}: {
  icon: typeof Leaf;
  label: string;
  value: string | number;
  hint?: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneCls =
    tone === "success"
      ? "bg-success/15 text-success"
      : tone === "danger"
        ? "bg-destructive/10 text-destructive"
        : "bg-primary/10 text-primary";
  return (
    <Card className="h-full p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 truncate font-serif text-3xl font-semibold tracking-tight">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${toneCls}`}>
          <Icon className="h-5 w-5" aria-hidden />
        </span>
      </div>
    </Card>
  );
}

function ScanThumb({ path, alt }: { path: string | null; alt: string }) {
  const url = useSignedUrl("leaf-images", path);
  if (!url) {
    return (
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
        <Leaf className="h-5 w-5" aria-hidden />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      className="h-12 w-12 shrink-0 rounded-lg object-cover"
    />
  );
}

function EmptyOnboarding() {
  return (
    <FadeIn className="mt-6">
      <Card className="mx-auto max-w-2xl p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Leaf className="h-7 w-7" aria-hidden />
        </span>
        <h2 className="mt-4 font-serif text-2xl font-semibold">Welcome to LeafScan</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          You haven’t scanned any crops yet. Start your first scan to begin monitoring your farm —
          stats, trends and insights appear here automatically.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link to="/app">
            <Button className="gap-2 rounded-full">
              <ScanLine className="h-4 w-4" /> Scan a crop
            </Button>
          </Link>
          <Link to="/settings">
            <Button variant="outline" className="gap-2 rounded-full">
              <MapPin className="h-4 w-4" /> Add farm location
            </Button>
          </Link>
        </div>
      </Card>
    </FadeIn>
  );
}

function DashboardPage() {
  const { data: detections, isLoading, isError, error, refetch, isFetching } = useDetections();
  const { data: profile } = useProfile();
  const { data: reminderRows } = useReminders();
  const toggleReminder = useToggleReminder();
  const [range, setRange] = useState<7 | 30 | 90>(7);

  const stats = useMemo(() => {
    const rows = detections ?? [];
    const total = rows.length;
    const healthy = rows.filter((d) => d.is_healthy).length;
    const diseased = total - healthy;

    const counts = new Map<string, number>();
    for (const d of rows) {
      if (d.is_healthy || !d.disease) continue;
      counts.set(d.disease, (counts.get(d.disease) ?? 0) + 1);
    }
    const distribution = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value]) => ({ name, value }));
    const diseaseTotal = distribution.reduce((sum, d) => sum + d.value, 0);

    const crops = new Map<string, { scans: number; healthy: number }>();
    for (const d of rows) {
      const cur = crops.get(d.crop) ?? { scans: 0, healthy: 0 };
      cur.scans += 1;
      if (d.is_healthy) cur.healthy += 1;
      crops.set(d.crop, cur);
    }
    const topCrops = [...crops.entries()]
      .sort((a, b) => b[1].scans - a[1].scans)
      .slice(0, 5)
      .map(([name, v]) => ({
        name,
        scans: v.scans,
        health: Math.round((v.healthy / v.scans) * 100),
      }));

    const weekAgo = Date.now() - 7 * DAY;
    const lastWeek = rows.filter((d) => new Date(d.created_at).getTime() >= weekAgo).length;

    return {
      total,
      healthy,
      diseased,
      top: distribution[0] ?? null,
      diseaseTotal,
      healthyRate: total ? Math.round((healthy / total) * 100) : null,
      last: rows[0] ?? null,
      recent: rows.slice(0, 5),
      distribution: distribution.slice(0, 6),
      topCrops,
      lastWeek,
    };
  }, [detections]);

  const activity = useMemo(() => {
    const rows = detections ?? [];
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const buckets = new Map<string, { healthy: number; diseased: number }>();
    for (const d of rows) {
      const day = new Date(d.created_at);
      day.setHours(0, 0, 0, 0);
      if (start.getTime() - day.getTime() > (range - 1) * DAY) continue;
      const key = day.toDateString();
      const cur = buckets.get(key) ?? { healthy: 0, diseased: 0 };
      if (d.is_healthy) cur.healthy += 1;
      else cur.diseased += 1;
      buckets.set(key, cur);
    }
    const points = Array.from({ length: range }, (_, idx) => {
      const day = new Date(start.getTime() - (range - 1 - idx) * DAY);
      const b = buckets.get(day.toDateString()) ?? { healthy: 0, diseased: 0 };
      return {
        name:
          range === 7
            ? day.toLocaleDateString(undefined, { weekday: "short" })
            : day.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
        ...b,
      };
    });
    const healthy = points.reduce((s, p) => s + p.healthy, 0);
    const diseased = points.reduce((s, p) => s + p.diseased, 0);
    return { points, hasData: healthy + diseased > 0, healthy, diseased, total: healthy + diseased };
  }, [detections, range]);

  const pendingReminders = useMemo(
    () =>
      (reminderRows ?? [])
        .filter((r) => !r.done)
        .sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)))
        .slice(0, 5),
    [reminderRows],
  );

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  }, []);

  if (isError) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
          <h2 className="mt-3 font-serif text-xl font-semibold">Couldn’t load your dashboard</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => refetch()} disabled={isFetching}>
            Try again
          </Button>
        </Card>
      </AppShell>
    );
  }

  const empty = !isLoading && stats.total === 0 && (reminderRows ?? []).length === 0;

  return (
    <AppShell>
      <PageHeader
        icon={LayoutDashboard}
        eyebrow="Overview"
        title={`${greeting}${profile?.display_name ? `, ${profile.display_name}` : ""}`}
        description="Here’s what’s happening with your farm today."
        actions={
          <Link to="/app">
            <Button className="gap-2 rounded-full">
              <ScanLine className="h-4 w-4" /> New scan
            </Button>
          </Link>
        }
      />

      {isLoading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-[122px] rounded-2xl" />
          ))}
          <Skeleton className="h-[320px] rounded-2xl sm:col-span-2 lg:col-span-3" />
          <Skeleton className="h-[320px] rounded-2xl sm:col-span-2 lg:col-span-1" />
          <span className="sr-only">Loading scan statistics…</span>
        </div>
      ) : empty ? (
        <EmptyOnboarding />
      ) : (
        <>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StaggerItem>
              <StatCard
                icon={ScanLine}
                label="Total scans"
                value={stats.total}
                hint={
                  stats.total
                    ? `${stats.lastWeek} in the last 7 days`
                    : "Start by scanning your first crop."
                }
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={CheckCircle2}
                tone="success"
                label="Healthy scans"
                value={stats.healthy}
                hint={
                  stats.total
                    ? `${Math.round((stats.healthy / stats.total) * 100)}% of scans`
                    : "No healthy scan data yet."
                }
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={AlertTriangle}
                tone="danger"
                label="Diseased scans"
                value={stats.diseased}
                hint={
                  stats.total
                    ? `${Math.round((stats.diseased / stats.total) * 100)}% of scans`
                    : "No diagnosis data yet."
                }
              />
            </StaggerItem>
            <StaggerItem>
              <StatCard
                icon={Activity}
                label="Healthy scan rate"
                value={stats.healthyRate === null ? "—" : `${stats.healthyRate}%`}
                hint={
                  stats.healthyRate === null
                    ? "Complete a few crop scans."
                    : `${stats.healthy} healthy of ${stats.total} scans`
                }
              />
            </StaggerItem>
          </Stagger>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            {/* Main column */}
            <div className="min-w-0 space-y-6">
              <FadeIn delay={0.04}>
                <Card className="p-6">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 sm:flex sm:flex-wrap sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <LineChartIcon className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                        <h2 className="truncate font-serif text-lg font-semibold">Scan activity</h2>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Daily healthy vs diseased scans.
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1 rounded-full bg-muted p-1">
                      {([7, 30, 90] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setRange(r)}
                          aria-pressed={range === r}
                          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                            range === r
                              ? "bg-card text-foreground shadow-sm"
                              : "text-muted-foreground"
                          }`}
                        >
                          {r}d
                        </button>
                      ))}
                    </div>
                  </div>
                  {activity.hasData ? (
                    <>
                      <Suspense
                        fallback={<Skeleton className="mt-4 h-[260px] w-full rounded-xl" />}
                      >
                        <div className="mt-4">
                          <ActivityChart data={activity.points} />
                        </div>
                      </Suspense>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Last {range} days — total scans: {activity.total}. Healthy:{" "}
                        {activity.healthy}. Diseased: {activity.diseased}.
                      </p>
                    </>
                  ) : (
                    <div className="mt-4 grid h-[260px] place-items-center rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      <div>
                        <Leaf className="mx-auto mb-2 h-5 w-5 opacity-60" aria-hidden />
                        <p className="font-medium text-foreground">No scan activity available</p>
                        <p className="mt-1">
                          Scan your first crop to start building your history.
                        </p>
                      </div>
                    </div>
                  )}
                </Card>
              </FadeIn>

              <FadeIn delay={0.06}>
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card className="min-w-0 p-6">
                    <h2 className="font-serif text-lg font-semibold">Disease distribution</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Breakdown of detected diseases.
                    </p>
                    {stats.distribution.length === 0 ? (
                      <div className="mt-6 rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                        No diseases detected yet. Your disease distribution appears after disease
                        detections.
                      </div>
                    ) : (
                      <>
                        <Suspense
                          fallback={<Skeleton className="mt-4 h-[260px] w-full rounded-xl" />}
                        >
                          <div className="mt-4">
                            <DistributionChart data={stats.distribution} />
                          </div>
                        </Suspense>
                        <ul className="mt-3 space-y-1.5 text-sm">
                          {stats.distribution.map((d) => (
                            <li key={d.name} className="flex items-center justify-between gap-3">
                              <span className="min-w-0 truncate text-muted-foreground">
                                {d.name}
                              </span>
                              <span className="shrink-0 tabular-nums">
                                {Math.round((d.value / stats.diseaseTotal) * 100)}%
                              </span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </Card>

                  <Card className="min-w-0 p-6">
                    <h2 className="font-serif text-lg font-semibold">Crops you scan most</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Healthy scan rate per crop.
                    </p>
                    {stats.topCrops.length === 0 ? (
                      <div className="mt-6 rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                        No crop data yet.
                      </div>
                    ) : (
                      <ul className="mt-4 space-y-4">
                        {stats.topCrops.map((c) => (
                          <li key={c.name}>
                            <div className="flex items-center justify-between gap-3 text-sm">
                              <span className="min-w-0 truncate font-medium">{c.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                                {c.scans} scan{c.scans === 1 ? "" : "s"} · {c.health}% healthy
                              </span>
                            </div>
                            <Progress
                              value={c.health}
                              className="mt-2 h-2"
                              aria-label={`${c.name}: ${c.health}% of scans healthy`}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              </FadeIn>

              <FadeIn delay={0.08}>
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="font-serif text-lg font-semibold">Recent scans</h2>
                    <Link to="/history">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 rounded-full text-muted-foreground"
                      >
                        View all <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {stats.recent.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                        <Leaf className="mx-auto mb-2 h-5 w-5 opacity-60" aria-hidden />
                        <p className="font-medium text-foreground">No scans yet</p>
                        <p className="mt-1">
                          Scan a crop leaf to see your diagnosis history here.
                        </p>
                        <Link to="/app" className="mt-4 inline-flex">
                          <Button size="sm" className="rounded-full">
                            Scan a crop
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      stats.recent.map((d) => (
                        <Link
                          key={d.id}
                          to="/detection/$id"
                          params={{ id: d.id }}
                          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3 transition-colors hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          <ScanThumb path={d.image_path} alt={`${d.crop} leaf scan`} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{d.crop}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {d.is_healthy ? "Healthy" : (d.disease ?? "Disease detected")}
                              {d.severity ? ` · ${d.severity} severity` : ""}
                              {d.confidence != null ? ` · ${d.confidence}% confidence` : ""}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {relativeTime(d.created_at)}
                            </span>
                          </span>
                          <ArrowRight
                            className="h-4 w-4 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                        </Link>
                      ))
                    )}
                  </div>
                </Card>
              </FadeIn>

              <FadeIn delay={0.1}>
                <QuickActions />
              </FadeIn>
            </div>

            {/* Right rail */}
            <div className="min-w-0 space-y-6">
              <FadeIn delay={0.04}>
                <FarmWeatherCard crop={stats.last?.crop ?? profile?.primary_crop ?? null} />
              </FadeIn>

              <FadeIn delay={0.06}>
                <Card className="p-6">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <Bell className="h-4 w-4 shrink-0 text-primary" aria-hidden />
                      <h2 className="truncate font-serif text-lg font-semibold">
                        Upcoming reminders
                      </h2>
                    </div>
                    <Link to="/reminders">
                      <Button size="sm" variant="ghost" className="rounded-full">
                        View all
                      </Button>
                    </Link>
                  </div>
                  <div className="mt-4 space-y-3">
                    {pendingReminders.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                        <p>No upcoming reminders.</p>
                        <p className="mt-1">Create a reminder to stay on top of crop care.</p>
                        <Link to="/reminders" className="mt-4 inline-flex">
                          <Button size="sm" variant="secondary" className="rounded-full">
                            Create reminder
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      pendingReminders.map((r) => {
                        const Icon = kindMeta(r.kind).icon;
                        const due = new Date(r.due_at);
                        return (
                          <div
                            key={r.id}
                            className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/40 p-3"
                          >
                            <Checkbox
                              checked={r.done}
                              aria-label={`Mark ${r.title} as done`}
                              onCheckedChange={() => toggleReminder.mutate(r)}
                            />
                            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                              <Icon className="h-4 w-4" aria-hidden />
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{r.title}</p>
                              <p className="truncate text-xs text-muted-foreground">
                                {due.toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}
                                {r.crop ? ` · ${r.crop}` : ""}
                              </p>
                            </div>
                            {isOverdue(r) && (
                              <Badge
                                variant="outline"
                                className="shrink-0 border-destructive/30 bg-destructive/10 text-destructive"
                              >
                                Overdue
                              </Badge>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </Card>
              </FadeIn>

              <FadeIn delay={0.08}>
                <Card className="p-6">
                  <h2 className="font-serif text-lg font-semibold">Disease insights</h2>
                  {stats.diseaseTotal === 0 ? (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {stats.total === 0
                        ? "Complete a crop scan to unlock insights from your own data."
                        : "No diseases detected in your scans so far."}
                    </p>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">
                      Based on your scans: {stats.diseaseTotal} disease detection
                      {stats.diseaseTotal === 1 ? "" : "s"} across {stats.total} scan
                      {stats.total === 1 ? "" : "s"}
                      {stats.top
                        ? `, most often ${stats.top.name} (${stats.top.value} time${
                            stats.top.value === 1 ? "" : "s"
                          })`
                        : ""}
                      .
                    </p>
                  )}
                  <Link to="/diseases" className="mt-3 inline-flex">
                    <Button variant="ghost" size="sm" className="gap-1 rounded-full px-0">
                      View disease library <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </Card>
              </FadeIn>

              <FadeIn delay={0.1}>
                <AssistantCard />
              </FadeIn>
            </div>
          </div>
        </>
      )}
    </AppShell>
  );
}

/** Live weather + weather-driven risk. Rendered only when a farm location is saved. */
function FarmWeatherCard({ crop }: { crop: string | null }) {
  const { data: profile } = useProfile();
  const coords = farmCoords(profile);
  const call = useServerFn(getWeatherIntel);

  const weather = useQuery({
    queryKey: ["weather-intel", coords?.lat, coords?.lon, crop],
    enabled: Boolean(coords && crop),
    staleTime: 10 * 60 * 1000,
    queryFn: () =>
      call({
        data: { lat: coords!.lat, lon: coords!.lon, crop: crop as string },
      }) as Promise<WeatherIntel>,
  });

  if (!coords) {
    return (
      <Card className="p-6 text-center">
        <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden />
        <h2 className="font-serif text-lg font-semibold">Weather unavailable</h2>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Add your farm location to see local weather.
        </p>
        <Link to="/settings" className="mt-4 inline-flex">
          <Button variant="outline" size="sm" className="rounded-full">
            Add location
          </Button>
        </Link>
      </Card>
    );
  }

  if (!crop) {
    return (
      <Card className="p-6">
        <h2 className="font-serif text-lg font-semibold">Today’s weather</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Set a primary crop in Settings, or complete a scan, to load weather and crop disease risk.
        </p>
        <Link to="/settings" className="mt-3 inline-flex">
          <Button variant="outline" size="sm" className="rounded-full">
            Open settings
          </Button>
        </Link>
      </Card>
    );
  }

  if (weather.isLoading) return <Skeleton className="h-[280px] w-full rounded-2xl" />;

  const intel = weather.data;
  if (!intel) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        <h2 className="font-serif text-lg font-semibold text-foreground">Unable to load weather</h2>
        <p className="mt-1">
          {typeof navigator !== "undefined" && navigator.onLine === false
            ? "Weather requires an internet connection."
            : "Please try again."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 rounded-full"
          onClick={() => weather.refetch()}
        >
          Try again
        </Button>
      </Card>
    );
  }

  const w = intel.weather;
  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">
              {profile?.farm_place ??
                w.place ??
                `${w.latitude.toFixed(2)}, ${w.longitude.toFixed(2)}`}
            </span>
          </div>
          <h2 className="mt-0.5 font-serif text-lg font-semibold">{w.condition}</h2>
        </div>
        <span className="font-serif text-3xl font-semibold tabular-nums">{w.temperature}°C</span>
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Humidity</dt>
          <dd className="font-medium tabular-nums">{w.humidity}%</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Rainfall 24h</dt>
          <dd className="font-medium tabular-nums">{w.rainfall} mm</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Wind</dt>
          <dd className="font-medium tabular-nums">{w.wind} km/h</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">UV index</dt>
          <dd className="font-medium tabular-nums">{w.uvIndex}</dd>
        </div>
      </dl>
      <div className="mt-5 rounded-xl border border-border/50 bg-card/40 p-4">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Weather-based disease risk for {intel.crop}
        </p>
        <Badge variant="outline" className={`mt-2 capitalize ${RISK_STYLES[intel.overall.level]}`}>
          {intel.overall.level} risk · {intel.overall.score}/100
        </Badge>
        {intel.risks[0] && (
          <p className="mt-2 text-xs text-muted-foreground">{intel.risks[0].reason}</p>
        )}
        <Link to="/weather" className="mt-3 inline-flex">
          <Button variant="ghost" size="sm" className="gap-1 rounded-full px-0">
            Prevention tips <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

/** No canned answers — the assistant only responds after the user submits a prompt. */
function AssistantCard() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-primary" aria-hidden />
        <h2 className="font-serif text-lg font-semibold">AI farming assistant</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Have a question about your crop? The assistant answers from your scan history and the
        disease library — always verify serious cases with an agronomist.
      </p>
      <Link to="/assistant" className="mt-4 inline-flex">
        <Button variant="secondary" size="sm" className="gap-1 rounded-full">
          Ask the AI assistant <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </Link>
    </Card>
  );
}
