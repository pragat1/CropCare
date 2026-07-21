import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Upload, ScanLine, Loader2, CheckCircle2, AlertTriangle, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { analyzeDetection } from "@/lib/detect.functions";
import { AppShell } from "@/components/app-shell";

const CROPS = [
  "Tomato", "Potato", "Rice", "Wheat", "Corn", "Cotton",
  "Grape", "Apple", "Mango", "Sugarcane", "Soybean", "Pepper", "Other",
];

export const Route = createFileRoute("/_authenticated/app")({
  component: DetectPage,
});

function DetectPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const analyze = useServerFn(analyzeDetection);
  const [crop, setCrop] = useState<string>("Tomato");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const recent = useQuery({
    queryKey: ["recent-detections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detections")
        .select("id, crop, disease, is_healthy, confidence, created_at, image_path")
        .order("created_at", { ascending: false })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Please choose a leaf image");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("leaf-images")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      const res = await analyze({ data: { crop, imagePath: path } });
      return res.id;
    },
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: ["recent-detections"] });
      qc.invalidateQueries({ queryKey: ["history"] });
      navigate({ to: "/detection/$id", params: { id } });
    },
    onError: (e) => {
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    },
  });

  function onPick(f: File | null) {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Please pick an image file");
      return;
    }
    if (f.size > 8 * 1024 * 1024) {
      toast.error("Image is larger than 8MB");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  return (
    <AppShell>
      <div className="grid gap-8 md:grid-cols-[1fr_1fr] items-start">
        <div>
          <h1 className="font-serif text-3xl font-semibold">New scan</h1>
          <p className="text-muted-foreground mt-1">Upload a clear photo of the affected leaf and pick your crop.</p>

          <Card className="mt-6 p-6 border-border shadow-[var(--shadow-soft)]">
            <label className="block text-sm font-medium mb-2">Crop</label>
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>

            <div
              className="mt-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted/40 aspect-video grid place-items-center cursor-pointer overflow-hidden relative"
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0] ?? null); }}
            >
              {preview ? (
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-muted-foreground p-6">
                  <Upload className="h-6 w-6 mx-auto mb-2" />
                  <p className="text-sm">Click or drop a leaf photo</p>
                  <p className="text-xs mt-1">JPG or PNG, up to 8MB</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPick(e.target.files?.[0] ?? null)}
              />
            </div>

            <Button
              className="mt-4 w-full gap-2"
              size="lg"
              disabled={!file || mutation.isPending}
              onClick={() => mutation.mutate()}
            >
              {mutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><ScanLine className="h-4 w-4" /> Analyze leaf</>}
            </Button>
          </Card>
        </div>

        <div>
          <h2 className="font-serif text-xl font-semibold">Recent scans</h2>
          <p className="text-muted-foreground text-sm mt-1">Your last three detections.</p>
          <div className="mt-4 space-y-3">
            {recent.isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>}
            {recent.data && recent.data.length === 0 && (
              <Card className="p-6 text-center text-muted-foreground border-dashed">
                <Leaf className="h-6 w-6 mx-auto mb-2 opacity-60" />
                No scans yet. Your first analysis will appear here.
              </Card>
            )}
            {recent.data?.map((d) => (
              <Link key={d.id} to="/detection/$id" params={{ id: d.id }}>
                <Card className="p-4 flex items-center gap-3 hover:shadow-[var(--shadow-soft)] transition-shadow">
                  <div className={`grid place-items-center w-10 h-10 rounded-lg ${d.is_healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                    {d.is_healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.is_healthy ? "Healthy" : (d.disease ?? "Unknown")}</div>
                    <div className="text-xs text-muted-foreground">{d.crop} · {new Date(d.created_at).toLocaleDateString()}</div>
                  </div>
                  <Badge variant="secondary">{d.confidence ?? 0}%</Badge>
                </Card>
              </Link>
            ))}
            <Link to="/history"><Button variant="ghost" className="w-full">View all history →</Button></Link>
          </div>
        </div>
      </div>
    </AppShell>
  );
}