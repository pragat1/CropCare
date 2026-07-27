import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, AlertTriangle, Leaf } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { History as HistoryIcon } from "lucide-react";

export const Route = createFileRoute("/_authenticated/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const q = useQuery({
    queryKey: ["history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("detections")
        .select("id, crop, disease, is_healthy, confidence, severity, summary, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <AppShell>
      <PageHeader
        icon={HistoryIcon}
        eyebrow="Archive"
        title="History"
        description="All your past leaf scans and diagnoses."
      />

      <Stagger className="mt-8 space-y-3">
        {q.isLoading && <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>}
        {q.data && q.data.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground border-dashed">
            <Leaf className="h-8 w-8 mx-auto mb-3 opacity-60" />
            <p>No scans yet.</p>
            <Link to="/app" className="text-primary hover:underline text-sm mt-2 inline-block">Run your first scan →</Link>
          </Card>
        )}
        {q.data?.map((d) => (
          <StaggerItem key={d.id}>
          <Link to="/detection/$id" params={{ id: d.id }}>
            <Card className="flex items-center gap-4 p-4">
              <div className={`grid place-items-center w-11 h-11 rounded-lg ${d.is_healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}>
                {d.is_healthy ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium">{d.is_healthy ? "Healthy leaf" : (d.disease ?? "Unknown")}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.summary}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.crop} · {new Date(d.created_at).toLocaleString()}</div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant="secondary">{d.confidence ?? 0}%</Badge>
                {d.severity && !d.is_healthy && <Badge variant="outline" className="text-xs capitalize">{d.severity}</Badge>}
              </div>
            </Card>
          </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </AppShell>
  );
}