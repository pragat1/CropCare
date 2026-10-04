import { createFileRoute, Link } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, Leaf, CloudOff, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { History as HistoryIcon } from "lucide-react";
import { readScans, saveScans, type CachedScan } from "@/lib/offline/scan-cache";
import { usePendingQueue, useSyncStatus } from "@/hooks/use-offline";

export const Route = createFileRoute("/_authenticated/history")({
  head: () =>
    pageHead(
      "Scan History | CropCare",
      "Review every past leaf scan, its diagnosis, severity and treatment plan, including scans queued while offline.",
    ),
  component: HistoryPage,
});

function HistoryPage() {
  const { online } = useSyncStatus();
  const queued = usePendingQueue();
  const [cached, setCached] = useState<CachedScan[]>([]);

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
    retry: online ? 2 : false,
  });

  useEffect(() => {
    if (q.data) void saveScans(q.data as CachedScan[]);
  }, [q.data]);

  useEffect(() => {
    void readScans().then(setCached);
  }, []);

  const usingCache = (!q.data || q.isError) && cached.length > 0;
  const items: CachedScan[] = (q.data as CachedScan[] | undefined) ?? (usingCache ? cached : []);

  return (
    <AppShell>
      <PageHeader
        icon={HistoryIcon}
        eyebrow="Archive"
        title="History"
        description="All your past leaf scans and diagnoses."
      />

      {usingCache && (
        <Card className="mt-6 flex items-start gap-2 border-warning/30 bg-warning/5 p-4 text-sm">
          <CloudOff className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
          <span className="text-muted-foreground">
            Showing your locally saved scans. This list refreshes once you're back online.
          </span>
        </Card>
      )}

      {queued.length > 0 && (
        <Card className="mt-6 p-5">
          <div className="flex items-center gap-2 font-medium">
            <Clock className="h-4 w-4 text-warning" aria-hidden /> Waiting to sync ({queued.length})
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {queued.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="truncate">
                  {item.crop} · {new Date(item.createdAt).toLocaleString()}
                </span>
                <Badge variant={item.lastError ? "destructive" : "secondary"}>
                  {item.lastError ? "Retry pending" : "Queued"}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Stagger className="mt-8 space-y-3">
        {q.isLoading && !usingCache && (
          <Card className="p-4 text-sm text-muted-foreground">Loading…</Card>
        )}
        {!q.isLoading && items.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground border-dashed">
            <Leaf className="h-8 w-8 mx-auto mb-3 opacity-60" />
            <p>No scans yet.</p>
            <Link to="/app" className="text-primary hover:underline text-sm mt-2 inline-block">
              Run your first scan →
            </Link>
          </Card>
        )}
        {items.map((d) => (
          <StaggerItem key={d.id}>
            <Link to="/detection/$id" params={{ id: d.id }}>
              <Card className="flex items-center gap-4 p-4">
                <div
                  className={`grid place-items-center w-11 h-11 rounded-lg ${d.is_healthy ? "bg-success/15 text-success" : "bg-destructive/10 text-destructive"}`}
                >
                  {d.is_healthy ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">
                    {d.is_healthy ? "Healthy leaf" : (d.disease ?? "Unknown")}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5 truncate">{d.summary}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {d.crop} · {new Date(d.created_at).toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="secondary">{d.confidence ?? 0}%</Badge>
                  {d.severity && !d.is_healthy && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {d.severity}
                    </Badge>
                  )}
                </div>
              </Card>
            </Link>
          </StaggerItem>
        ))}
      </Stagger>
    </AppShell>
  );
}
