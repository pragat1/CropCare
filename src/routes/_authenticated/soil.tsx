import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Sprout, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { analyzeSoil } from "@/lib/soil.functions";
import { AppShell } from "@/components/app-shell";
import { UploadZone } from "@/components/upload-zone";
import { SOIL_GUIDE } from "@/lib/data/soil-guide";

export const Route = createFileRoute("/_authenticated/soil")({
  component: SoilPage,
});

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
        .limit(5);
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
      const { error } = await supabase.storage.from("soil-images")
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
      <div className="grid gap-8 md:grid-cols-[1fr_1fr] items-start">
        <div>
          <h1 className="font-serif text-3xl font-semibold">Soil analysis</h1>
          <p className="text-muted-foreground mt-1">Upload a photo of your soil — get type, fertility, and recommended crops.</p>

          <Card className="mt-6 p-6">
            <UploadZone
              label="Upload soil photo"
              hint="A close-up in natural light works best"
              file={file}
              onFile={setFile}
              disabled={mutation.isPending}
            />
            <Button
              className="mt-4 w-full gap-2"
              size="lg"
              disabled={!file || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sprout className="h-4 w-4" /> Analyze soil</>}
            </Button>
          </Card>

          <h2 className="font-serif text-xl font-semibold mt-8">Soil type reference</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {Object.entries(SOIL_GUIDE).map(([type, g]) => (
              <Card key={type} className="p-4">
                <div className="font-semibold">{type}</div>
                <p className="text-xs text-muted-foreground mt-1">{g.summary}</p>
                <div className="mt-2 text-xs"><span className="text-muted-foreground">Fertility:</span> {g.fertility}</div>
              </Card>
            ))}
          </div>
        </div>

        <div>
          <h2 className="font-serif text-xl font-semibold">Recent soil scans</h2>
          <div className="mt-4 space-y-3">
            {recent.isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>}
            {recent.error && <Card className="p-4 text-sm text-destructive">Couldn't load recent scans.</Card>}
            {recent.data && recent.data.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground border-dashed">
                No soil analyses yet. Upload your first sample.
              </Card>
            )}
            {recent.data?.map((s) => (
              <Link key={s.id} to="/soil/$id" params={{ id: s.id }}>
                <Card className="p-4 flex items-center gap-3 hover:shadow-[var(--shadow-soft)] transition-shadow">
                  <div className="grid place-items-center w-10 h-10 rounded-lg bg-primary/10 text-primary">
                    <Sprout className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.soil_type ?? "Unknown"}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.summary}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{new Date(s.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge variant="secondary">{s.fertility ?? "—"}</Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}