import { CloudOff, RefreshCw, Cloud, Loader2 } from "lucide-react";
import { useSyncStatus } from "@/hooks/use-offline";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact connectivity + sync indicator for the app header. */
export function SyncStatus({ className }: { className?: string }) {
  const { online, syncing, pending, lastSyncedAt, syncNow } = useSyncStatus();

  const label = !online
    ? pending > 0
      ? `Offline · ${pending} queued`
      : "Offline"
    : syncing
      ? "Syncing…"
      : pending > 0
        ? `${pending} to sync`
        : "Synced";

  const tone = !online
    ? "border-warning/40 bg-warning/10 text-warning"
    : pending > 0 || syncing
      ? "border-primary/40 bg-primary/10 text-primary"
      : "border-border/50 bg-card/40 text-muted-foreground";

  const title = lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : label;

  return (
    <div
      role="status"
      aria-live="polite"
      title={title}
      className={cn(
        "flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium backdrop-blur-md",
        tone,
        className,
      )}
    >
      {!online ? (
        <CloudOff className="h-3.5 w-3.5" aria-hidden />
      ) : syncing ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      ) : (
        <Cloud className="h-3.5 w-3.5" aria-hidden />
      )}
      <span className="whitespace-nowrap">{label}</span>
      {online && pending > 0 && !syncing && (
        <Button
          variant="ghost"
          size="sm"
          className="ml-0.5 h-6 gap-1 rounded-full px-2 text-xs"
          onClick={() => void syncNow()}
          aria-label="Sync queued scans now"
        >
          <RefreshCw className="h-3 w-3" /> Sync
        </Button>
      )}
    </div>
  );
}
