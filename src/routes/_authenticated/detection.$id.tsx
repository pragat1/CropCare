import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, AlertTriangle, Sprout, FlaskConical, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";

export const Route = createFileRoute("/_authenticated/detection/$id")({
  component: DetectionPage,
});

function DetectionPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [imgUrl, setImgUrl] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["detection", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("detections").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!q.data?.image_path) return;
      const { data } = await supabase.storage.from("leaf-images").createSignedUrl(q.data.image_path, 60 * 60);
      if (alive) setImgUrl(data?.signedUrl ?? null);
    })();
    return () => { alive = false; };
  }, [q.data?.image_path]);

  const del = useMutation({
    mutationFn: async () => {
      if (q.data?.image_path) await supabase.storage.from("leaf-images").remove([q.data.image_path]);
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

  if (q.isLoading) return <AppShell><Card className="p-6 text-muted-foreground">Loading…</Card></AppShell>;
  if (q.error || !q.data) return <AppShell><Card className="p-6 text-destructive">Not found.</Card></AppShell>;

  const d = q.data;
  const arr = (v: unknown): string[] => Array.isArray(v) ? (v as string[]) : [];
  const healthy = !!d.is_healthy;

  return (
    <AppShell>
      <Link to="/history" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4">
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
            <div className="text-xs text-muted-foreground pt-2">{new Date(d.created_at).toLocaleString()}</div>
            <Button variant="outline" size="sm" className="w-full mt-3 gap-2" onClick={() => del.mutate()} disabled={del.isPending}>
              <Trash2 className="h-4 w-4" /> Delete
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-6">
            <div className="flex items-start gap-4">
              <div className={`grid place-items-center w-12 h-12 rounded-xl ${healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                {healthy ? <CheckCircle2 className="h-6 w-6" /> : <AlertTriangle className="h-6 w-6" />}
              </div>
              <div className="flex-1">
                <h1 className="font-serif text-2xl font-semibold">{healthy ? "Healthy leaf" : (d.disease ?? "Unknown")}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">Confidence: {d.confidence ?? 0}%</Badge>
                  {d.severity && !healthy && <Badge variant="outline" className="capitalize">Severity: {d.severity}</Badge>}
                </div>
                {d.summary && <p className="text-muted-foreground mt-3">{d.summary}</p>}
              </div>
            </div>
          </Card>

          {!healthy && (
            <>
              <Section title="Observed symptoms" items={arr(d.symptoms)} />
              <Section title="Likely causes" items={arr(d.causes)} />
              <Section title="Organic treatment" items={arr(d.treatment_organic)} icon={<Sprout className="h-4 w-4" />} tone="success" />
              <Section title="Chemical treatment" items={arr(d.treatment_chemical)} icon={<FlaskConical className="h-4 w-4" />} tone="warning" />
              <Section title="Prevention" items={arr(d.prevention)} icon={<ShieldCheck className="h-4 w-4" />} />
            </>
          )}
        </div>
      </div>
    </AppShell>
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
    tone === "success" ? "bg-success/10 text-success" :
    tone === "warning" ? "bg-amber-500/10 text-amber-700 dark:text-amber-400" :
    "bg-muted text-foreground";
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-3">
        {icon && <span className={`grid place-items-center w-7 h-7 rounded-md ${toneCls}`}>{icon}</span>}
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