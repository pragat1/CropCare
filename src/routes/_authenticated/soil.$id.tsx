import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { pageHead } from "@/lib/seo";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, Sprout, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { SOIL_GUIDE } from "@/lib/data/soil-guide";

export const Route = createFileRoute("/_authenticated/soil/$id")({
  head: () =>
    pageHead(
      "Soil Report | LeafScan",
      "Detailed soil analysis report with fertility, pH range, recommended crops and maintenance guidance.",
    ),
  component: SoilDetail,
});

function SoilDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["soil", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("soil_analyses")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const imgUrl = useSignedUrl("soil-images", q.data?.image_path);

  const del = useMutation({
    mutationFn: async () => {
      if (q.data?.image_path)
        await supabase.storage.from("soil-images").remove([q.data.image_path]);
      const { error } = await supabase.from("soil_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-soil"] });
      toast.success("Soil analysis deleted");
      navigate({ to: "/soil" });
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
  const s = q.data;
  const arr = (v: unknown): string[] => (Array.isArray(v) ? (v as string[]) : []);
  const guide = s.soil_type ? SOIL_GUIDE[s.soil_type as keyof typeof SOIL_GUIDE] : undefined;

  return (
    <AppShell>
      <div className="flex items-center justify-between">
        <Link to="/soil">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2 text-destructive"
          onClick={() => del.mutate()}
          disabled={del.isPending}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      <div className="mt-4 grid gap-6 md:grid-cols-[300px_1fr]">
        <div>
          <div className="aspect-square rounded-xl overflow-hidden bg-muted">
            {imgUrl ? (
              <img src={imgUrl} alt="Soil sample" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full grid place-items-center text-muted-foreground">
                Loading image…
              </div>
            )}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-3">
            <Sprout className="h-6 w-6 text-primary" />
            <h1 className="font-serif text-3xl font-semibold">{s.soil_type ?? "Unknown"}</h1>
          </div>
          <p className="text-muted-foreground mt-2">{s.summary}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge variant="secondary">Fertility: {s.fertility ?? "—"}</Badge>
            <Badge variant="secondary">Water: {s.water_retention ?? "—"}</Badge>
            <Badge variant="secondary">pH: {s.ph_range ?? "—"}</Badge>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Recommended crops</h3>
              <ul className="text-sm space-y-1">
                {arr(s.recommended_crops).map((c, i) => (
                  <li key={i}>• {c}</li>
                ))}
                {arr(s.recommended_crops).length === 0 && (
                  <li className="text-muted-foreground">No suggestions.</li>
                )}
              </ul>
            </Card>
            <Card className="p-4">
              <h3 className="font-semibold mb-2">Care tips</h3>
              <ul className="text-sm space-y-1">
                {arr(s.tips).map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
                {arr(s.tips).length === 0 && <li className="text-muted-foreground">No tips.</li>}
              </ul>
            </Card>
          </div>

          {s.maintenance && (
            <Card className="p-4 mt-4">
              <h3 className="font-semibold mb-2">Maintenance</h3>
              <p className="text-sm text-muted-foreground">{s.maintenance}</p>
            </Card>
          )}

          {guide && (
            <Card className="p-4 mt-4 border-primary/30">
              <h3 className="font-semibold mb-2">Reference guide · {s.soil_type}</h3>
              <p className="text-sm text-muted-foreground">{guide.maintenance}</p>
            </Card>
          )}
        </div>
      </div>
    </AppShell>
  );
}
