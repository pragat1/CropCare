import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { ArrowLeft, ArrowRight, CloudSun, Droplets, Sun, Thermometer, Layers, FlaskConical } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useContentItems } from "@/lib/admin/library";
import { toDiseaseReference } from "@/lib/disease-references";
import { findCropProfile } from "@/lib/data/crop-profiles";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/crops/$crop")({
  head: () =>
    pageHead(
      "Crop Profile | CropCare",
      "Growth stages, ideal climate and your symptoms timeline for this crop.",
    ),
  component: CropProfilePage,
});

function CropProfilePage() {
  const { crop } = Route.useParams();
  const profile = findCropProfile(crop);
  const key = profile?.key ?? crop.toLowerCase();

  const scans = useQuery({
    queryKey: ["crop-scans", key],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detections")
        .select("id, crop, disease, is_healthy, severity, symptoms, created_at")
        .ilike("crop", `%${key}%`)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
  const { data: refs } = useContentItems("disease");
  const diseases = useMemo(
    () => (refs ?? []).map(toDiseaseReference).filter((d) => d.crop.toLowerCase() === key),
    [refs, key],
  );

  if (!profile)
    return (
      <AppShell>
        <div className="py-16 text-center">
          <h1 className="font-serif text-3xl">Crop profile not found</h1>
          <Button asChild className="mt-5">
            <Link to="/crops">Browse crops</Link>
          </Button>
        </div>
      </AppShell>
    );

  const c = profile.climate;
  const climate = [
    { icon: Thermometer, label: "Temperature", value: c.temp },
    { icon: CloudSun, label: "Rainfall", value: c.rainfall },
    { icon: Droplets, label: "Humidity", value: c.humidity },
    { icon: Sun, label: "Sunlight", value: c.sunlight },
    { icon: Layers, label: "Soil", value: c.soil },
    { icon: FlaskConical, label: "Soil pH", value: c.ph },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <Link
          to="/crops"
          className="mb-5 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All crops
        </Link>
        <header className="flex items-center gap-4">
          <span className="text-5xl" aria-hidden>
            {profile.emoji}
          </span>
          <div>
            <p className="text-xs font-semibold uppercase text-primary">Crop profile</p>
            <h1 className="font-serif text-4xl">{profile.name}</h1>
          </div>
        </header>

        <section className="mt-8" aria-labelledby="climate">
          <h2 id="climate" className="font-serif text-2xl">Ideal climate</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {climate.map(({ icon: Icon, label, value }) => (
              <Card key={label} className="flex items-start gap-3 p-4">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-primary">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">{label}</div>
                  <div className="text-sm font-medium">{value}</div>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Typical ranges — local varieties and conditions vary.
          </p>
        </section>

        <section className="mt-10" aria-labelledby="stages">
          <h2 id="stages" className="font-serif text-2xl">Growth stages</h2>
          <ol className="mt-4 grid gap-3 md:grid-cols-5">
            {profile.stages.map((s, i) => (
              <li key={s.name} className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {i + 1}
                  </span>
                  <span className="text-xs text-muted-foreground">Day {s.days}</span>
                </div>
                <div className="mt-2 font-semibold">{s.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">{s.focus}</p>
              </li>
            ))}
          </ol>
        </section>

        <div className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <section aria-labelledby="timeline">
            <h2 id="timeline" className="font-serif text-2xl">Your symptoms timeline</h2>
            {scans.isPending ? (
              <Skeleton className="mt-4 h-40 w-full" />
            ) : scans.isError ? (
              <p className="mt-4 text-sm text-destructive">Couldn't load your scans.</p>
            ) : scans.data.length === 0 ? (
              <Card className="mt-4 p-6 text-sm text-muted-foreground">
                No {profile.name.toLowerCase()} scans yet. Scan a leaf to start this timeline.
                <div>
                  <Button asChild size="sm" className="mt-4">
                    <Link to="/app">Scan a leaf</Link>
                  </Button>
                </div>
              </Card>
            ) : (
              <ol className="mt-4 space-y-0 border-l-2 border-border pl-6">
                {scans.data.map((s) => {
                  const sym = Array.isArray(s.symptoms) ? (s.symptoms as string[]) : [];
                  return (
                    <li key={s.id} className="relative pb-6">
                      <span
                        className={`absolute -left-[31px] top-1 h-3 w-3 rounded-full ring-4 ring-background ${s.is_healthy ? "bg-success" : "bg-destructive"}`}
                        aria-hidden
                      />
                      <time className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString(undefined, { dateStyle: "medium" })}
                      </time>
                      <Link
                        to="/detection/$id"
                        params={{ id: s.id }}
                        className="block font-semibold hover:text-primary"
                      >
                        {s.is_healthy ? "Healthy" : (s.disease ?? "Unidentified issue")}
                        {s.severity && !s.is_healthy && (
                          <span className="ml-2 text-xs font-normal capitalize text-muted-foreground">
                            · {s.severity}
                          </span>
                        )}
                      </Link>
                      {sym.length > 0 && (
                        <p className="mt-1 text-sm text-muted-foreground">{sym.slice(0, 2).join(" · ")}</p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>

          <section aria-labelledby="known">
            <h2 id="known" className="font-serif text-2xl">Known diseases</h2>
            {diseases.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">
                No Disease Database entries for this crop yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {diseases.map((d) => (
                  <li key={d.id}>
                    <Link
                      to="/diseases/$slug"
                      params={{ slug: d.slug }}
                      className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2 pr-3 hover:border-primary/40"
                    >
                      <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
                        {d.imageUrl && (
                          <img src={d.imageUrl} alt="" loading="lazy" className="h-full w-full object-cover" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium group-hover:text-primary">
                          {d.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {d.symptoms[0] ?? d.type}
                        </span>
                      </span>
                      <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
