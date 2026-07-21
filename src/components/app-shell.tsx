import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Leaf, LogOut, ScanLine, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReactNode } from "react";

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const path = useRouterState({ select: (s) => s.location.pathname });

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("Signed out");
    navigate({ to: "/auth", replace: true });
  }

  const tabs = [
    { to: "/app", label: "Detect", icon: ScanLine },
    { to: "/app/history", label: "History", icon: History },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-5xl px-4 md:px-6 h-16 flex items-center justify-between">
          <Link to="/app" className="flex items-center gap-2 font-serif text-lg font-semibold">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            LeafScan
          </Link>
          <nav className="flex items-center gap-1">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = to === "/app" ? path === "/app" : path.startsWith(to);
              return (
                <Link key={to} to={to}>
                  <Button variant={active ? "secondary" : "ghost"} size="sm" className="gap-2">
                    <Icon className="h-4 w-4" /> {label}
                  </Button>
                </Link>
              );
            })}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 ml-2">
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 md:px-6 py-8">{children}</main>
    </div>
  );
}