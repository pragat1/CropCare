import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Loader2,
  Sprout,
  ArrowRight,
  Info,
  Leaf,
  Droplets,
  FlaskConical,
  Eye,
  FolderOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSoil } from "@/lib/soil.functions";
import { AppShell } from "@/components/app-shell";
import { UploadZone } from "@/components/upload-zone";
import { SOIL_GUIDE } from "@/lib/data/soil-guide";
import { PageHeader } from "@/components/page-header";
import { FadeIn } from "@/components/motion";

export const Route = createFileRoute("/_authenticated/soil")({
  head: () =>
    pageHead(
      "Soil Analysis | LeafScan",
      "Upload a soil photo for AI analysis of soil type, fertility, water retention, pH range and recommended crops.",
    ),
  component: SoilPage,
});

const CAPABILITIES = [
  {
    icon: Leaf,
    title: "Soil type",
    body: "Identify whether your soil looks like clay, loamy, sandy or silt based on texture and appearance.",
  },
  {
    icon: Eye,
    title: "Visual characteristics",
    body: "Understand colour, structure and visible organic matter from the soil image.",
  },
  {
    icon: FlaskConical,
    title: "Fertility estimate",
    body: "Estimate a fertility level and likely pH range from visual indicators.",
  },
  {
    icon: Droplets,
    title: "Moisture & suitable crops",
    body: "Gauge water retention and get crop suggestions that grow well in this soil.",
  },
];

function fertilityTone(f: string) {
  const v = f.toLowerCase();
  if (v.includes("very high") || v.includes("high"))
    return "bg-primary/10 text-primary border-primary/20";
  if (v.includes("medium")) return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function SoilPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeSoil);
  const [file, setFile] = useState<File | null>(null);

  const recent = useQuery({
    queryKey: ["recent-soil"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soil_analyses")
        .select("id, soil_type, fertility, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a soil image");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("soil-images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (error) throw error;
      const res = await analyze({ data: { imagePath: path } });
      return res.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["recent-soil"] });
      navigate({ to: "/soil/$id", params: { id } });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Analysis failed"),
  });

  return (
    <AppShell>
      <PageHeader
        icon={Sprout}
        eyebrow="Soil analysis"
        title="Soil analysis"
        description="Understand your soil before you plant. Upload a photo to analyze its visible characteristics and get insights from LeafScan."
      />

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h2 className="font-serif text-lg font-semibold">Analyze your soil</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a clear photo of your soil for analysis.
          </p>
          <div className="mt-4">
            <UploadZone
              label="Upload soil photo"
              hint="JPG, PNG or WebP — a close-up in natural light works best"
              file={file}
              onFile={setFile}
              disabled={mutation.isPending}
            />
          </div>
          <Button
            className="mt-4 w-full gap-2"
            size="lg"
            disabled={!file || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
              </>
            ) : (
              <>
                <Sprout className="h-4 w-4" /> Analyze soil
              </>
            )}
          </Button>
        </Card>

        <FadeIn delay={0.1}>
          <Card className="p-6">
            <h2 className="font-serif text-lg font-semibold">What can soil analysis tell you?</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Our AI reviews your soil photo to provide insights on:
            </p>
            <ul className="mt-5 space-y-4">
              {CAPABILITIES.map((c) => (
                <li key={c.title} className="flex gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{c.title}</div>
                    <p className="text-xs text-muted-foreground">{c.body}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-5 flex gap-2 rounded-lg border border-border/60 bg-muted/40 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0 text-primary" />
              <p>
                Photo-based analysis provides an estimate. For precise soil chemistry and nutrient
                measurements, use a laboratory soil test.
              </p>
            </div>
          </Card>
        </FadeIn>
      </div>

      <section className="mt-10">
        <h2 className="font-serif text-xl font-semibold">Soil type reference</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Learn about common soil types and their characteristics.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Object.entries(SOIL_GUIDE).map(([type, g]) => (
            <Card key={type} className="p-5">
              <div className="font-semibold">{type}</div>
              <p className="mt-1 text-xs text-muted-foreground">{g.summary}</p>
              <p className="mt-2 text-xs text-muted-foreground">{g.texture}</p>
              <Badge variant="outline" className={`mt-3 ${fertilityTone(g.fertility)}`}>
                Fertility: {g.fertility}
              </Badge>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl font-semibold">Recent soil analyses</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Review your previous soil analysis results.
            </p>
          </div>
        </div>

        <Card className="mt-4 overflow-hidden">
          {recent.isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
          {recent.error && (
            <div className="p-6 text-sm text-destructive">Couldn't load recent analyses.</div>
          )}
          {recent.data && recent.data.length === 0 && (
            <div className="flex flex-col items-center gap-3 p-10 text-center sm:flex-row sm:justify-center">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-muted text-muted-foreground">
                <FolderOpen className="h-5 w-5" />
              </span>
              <div className="text-sm">
                <div className="font-medium">No soil analyses yet</div>
                <div className="text-muted-foreground">
                  Upload a soil photo to create your first analysis.
                </div>
              </div>
            </div>
          )}
          {recent.data && recent.data.length > 0 && (
            <div className="divide-y divide-border">
              <div className="hidden grid-cols-[1fr_140px_180px_120px] gap-4 bg-muted/40 px-5 py-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground md:grid">
                <span>Soil type &amp; summary</span>
                <span>Fertility</span>
                <span>Analyzed on</span>
                <span className="text-right">Action</span>
              </div>
              {recent.data.map((s) => (
                <div
                  key={s.id}
                  className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_140px_180px_120px] md:items-center md:gap-4"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{s.soil_type ?? "Unknown"}</div>
                    <div className="truncate text-xs text-muted-foreground">{s.summary}</div>
                  </div>
                  <div>
                    <Badge
                      variant="outline"
                      className={fertilityTone(String(s.fertility ?? ""))}
                    >
                      {s.fertility ?? "—"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(s.created_at).toLocaleDateString()}
                    <span className="ml-2">
                      {new Date(s.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div className="md:text-right">
                    <Button asChild size="sm" variant="outline" className="gap-1">
                      <Link to="/soil/$id" params={{ id: s.id }}>
                        View details <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
