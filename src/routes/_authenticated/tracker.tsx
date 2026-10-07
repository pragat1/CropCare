import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, LineChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { compareTreatment } from "@/lib/treatment.functions";
import { AppShell } from "@/components/app-shell";
import { UploadZone } from "@/components/upload-zone";
import { CROP_LIST } from "@/lib/data/crops";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_authenticated/tracker")({
  staticData: { sitemap: false },
  head: () =>
    pageHead(
      "Treatment Progress Tracker | CropCare",
      "Compare before and after leaf photos to measure recovery and confirm whether a treatment is working.",
    ),
  component: TrackerPage,
});

function TrackerPage() {
  const qc = useQueryClient();
  const compare = useServerFn(compareTreatment);
  const [crop, setCrop] = useState<string>("Tomato");
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [notes, setNotes] = useState("");

  const history = useQuery({
    queryKey: ["treatment-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("treatment_progress")
        .select("id, crop, status, improvement_percent, created_at, analysis")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  async function uploadOne(f: File, uid: string) {
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${uid}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("treatment-images").upload(path, f, {
      contentType: f.type || "image/jpeg",
      upsert: false,
    });
    if (error) throw error;
    return path;
  }

  const mut = useMutation({
    mutationFn: async () => {
      if (!before || !after) throw new Error("Please provide both before and after images");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const beforePath = await uploadOne(before, uid);
      const afterPath = await uploadOne(after, uid);
      await compare({ data: { crop, beforePath, afterPath, notes: notes || undefined } });
    },
    onSuccess: () => {
      toast.success("Comparison saved");
      setBefore(null);
      setAfter(null);
      setNotes("");
      qc.invalidateQueries({ queryKey: ["treatment-history"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Comparison failed"),
  });

  function statusIcon(s: string) {
    if (s === "Improved") return <TrendingUp className="h-4 w-4 text-primary" />;
    if (s === "Worse") return <TrendingDown className="h-4 w-4 text-destructive" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }

  return (
    <AppShell>
      <PageHeader
        icon={LineChart}
        eyebrow="Progress"
        title="Treatment tracker"
        description="Compare before and after images to measure recovery."
      />

      <Card className="mt-8 p-6 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Before treatment</label>
            <div className="mt-2">
              <UploadZone
                label="Upload before photo"
                file={before}
                onFile={setBefore}
                disabled={mut.isPending}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">After treatment</label>
            <div className="mt-2">
              <UploadZone
                label="Upload after photo"
                file={after}
                onFile={setAfter}
                disabled={mut.isPending}
              />
            </div>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
          <div>
            <label className="text-sm font-medium">Crop</label>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CROP_LIST.map((c) => (
                  <SelectItem key={c.key} value={c.name}>
                    {c.emoji} {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Notes (optional)</label>
            <Textarea
              className="mt-2"
              value={notes}
              maxLength={1000}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Treatment applied, timing, weather…"
            />
          </div>
        </div>
        <Button
          size="lg"
          className="w-full gap-2"
          disabled={!before || !after || mut.isPending}
          onClick={() => mut.mutate()}
        >
          {mut.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Comparing…
            </>
          ) : (
            <>
              <LineChart className="h-4 w-4" /> Compare progress
            </>
          )}
        </Button>
      </Card>

      <h2 className="font-serif text-xl font-semibold mt-8">Progress history</h2>
      <div className="mt-4 grid gap-3">
        {history.isLoading && <Card className="p-4 text-muted-foreground text-sm">Loading…</Card>}
        {history.data && history.data.length === 0 && (
          <Card className="p-6 text-center text-muted-foreground border-dashed">
            No comparisons yet.
          </Card>
        )}
        {history.data?.map((h) => {
          const a = (h.analysis ?? {}) as { summary?: string };
          return (
            <Card key={h.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="grid place-items-center w-10 h-10 rounded-lg bg-primary/10">
                  {statusIcon(h.status ?? "")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{h.crop}</span>
                    <Badge variant="secondary">{h.status}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {(h.improvement_percent ?? 0) > 0 ? "+" : ""}
                      {h.improvement_percent ?? 0}%
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">{a.summary}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {new Date(h.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
