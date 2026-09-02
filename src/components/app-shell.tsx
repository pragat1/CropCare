import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, MapPin } from "lucide-react";
import { useMemo } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar, initialsOf } from "@/components/app-sidebar";
import { SyncStatus } from "@/components/sync-status";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useApplyTheme, useProfile } from "@/lib/profile";
import { isOverdue, useReminders } from "@/lib/reminders";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useProfile();
  const { data: reminders } = useReminders();
  useApplyTheme(profile?.theme);

  // Real notification count: reminders that are overdue or due within 24h.
  const dueCount = useMemo(() => {
    const soon = Date.now() + 86_400_000;
    return (reminders ?? []).filter(
      (r) => !r.done && (isOverdue(r) || new Date(r.due_at).getTime() <= soon),
    ).length;
  }, [reminders]);

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full bg-background bg-mesh">
        <AppSidebar onSignOut={signOut} />
        <SidebarInset className="min-w-0 bg-transparent">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border/50 bg-background/70 px-3 backdrop-blur-xl md:px-6">
            <SidebarTrigger className="min-h-10 min-w-10" />
            <Link
              to="/settings"
              className="flex min-w-0 items-center gap-1.5 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden />
              <span className="truncate">{profile?.farm_place ?? "Add farm location"}</span>
            </Link>
            <div className="ml-auto flex items-center gap-2">
              <SyncStatus className="hidden sm:flex" />
              <Link to="/reminders" className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="min-h-10 min-w-10 rounded-full"
                  aria-label={dueCount > 0 ? `${dueCount} reminders need attention` : "Reminders"}
                >
                  <Bell className="h-4.5 w-4.5" aria-hidden />
                </Button>
                {dueCount > 0 && (
                  <span className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-4.5 min-w-4.5 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {dueCount}
                  </span>
                )}
              </Link>
              <Link
                to="/settings"
                aria-label="Profile settings"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-brand text-xs font-semibold text-primary-foreground"
              >
                {initialsOf(profile?.display_name)}
              </Link>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-6 md:py-10">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
