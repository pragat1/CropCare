import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AppShell } from "@/components/app-shell";
import { DISEASES } from "@/lib/data/diseases";
import { Search, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { useOfflineData } from "@/hooks/use-offline";
import { useLibrary, mapDiseases } from "@/lib/admin/library";

export const Route = createFileRoute("/_authenticated/diseases")({ component: DiseasesPage });

function DiseasesPage() {
  const [q, setQ] = useState("");
  const [crop, setCrop] = useState<string>("all");
  const source = useLibrary("disease", DISEASES, mapDiseases);
  const { data: diseases } = useOfflineData("diseases", source);
  const crops = useMemo(() => Array.from(new Set(diseases.map(d => d.crop))).sort(), [diseases]);
  const filtered = useMemo(() => diseases.filter(d =>
    (crop === "all" || d.crop === crop) &&
    (q.trim() === "" || d.name.toLowerCase().includes(q.toLowerCase()) || d.summary.toLowerCase().includes(q.toLowerCase()))
  ), [q, crop, diseases]);

  return (
    <AppShell>
      <PageHeader
        icon={BookOpen}
        eyebrow="Reference"
        title="Disease database"
        description={`Browse ${diseases.length} common crop diseases with organic and chemical treatments. Available offline.`}
      />

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search diseases…" className="pl-9" aria-label="Search diseases" />
        </div>
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger className="sm:w-48" aria-label="Filter by crop"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All crops</SelectItem>
            {crops.map(c => <SelectItem key={c} value={c}>{c[0].toUpperCase() + c.slice(1)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-8 mt-6 text-center text-muted-foreground border-dashed">No diseases match your search.</Card>
      ) : (
        <Stagger className="mt-6 grid gap-5 md:grid-cols-2">
          {filtered.map(d => (
            <StaggerItem key={d.id}>
            <Card className="h-full p-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl" aria-hidden>{d.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold">{d.name}</h2>
                    <Badge variant={d.severity === "high" ? "destructive" : "secondary"}>{d.severity}</Badge>
                    <Badge variant="outline">{d.crop}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{d.summary}</p>
                  <details className="mt-3 text-sm">
                    <summary className="cursor-pointer font-medium">Symptoms & treatment</summary>
                    <div className="mt-2 grid gap-2">
                      <div><span className="font-medium">Symptoms:</span> <span className="text-muted-foreground">{d.symptoms.join("; ")}</span></div>
                      <div><span className="font-medium">Organic:</span> <span className="text-muted-foreground">{d.organic.join("; ")}</span></div>
                      <div><span className="font-medium">Chemical:</span> <span className="text-muted-foreground">{d.chemical.join("; ")}</span></div>
                      <div><span className="font-medium">Prevention:</span> <span className="text-muted-foreground">{d.preventive.join("; ")}</span></div>
                    </div>
                  </details>
                </div>
              </div>
            </Card>
            </StaggerItem>
          ))}
        </Stagger>
      )}
    </AppShell>
  );
}