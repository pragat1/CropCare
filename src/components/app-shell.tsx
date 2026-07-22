import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Leaf, LogOut, ScanLine, History, Sprout, LineChart, BookOpen, Lightbulb, CalendarDays, Brain, Info, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";

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
    { to: "/soil", label: "Soil", icon: Sprout },
    { to: "/tracker", label: "Tracker", icon: LineChart },
    { to: "/diseases", label: "Diseases", icon: BookOpen },
    { to: "/tips", label: "Tips", icon: Lightbulb },
    { to: "/seasons", label: "Seasons", icon: CalendarDays },
    { to: "/quiz", label: "Quiz", icon: Brain },
    { to: "/history", label: "History", icon: History },
    { to: "/about", label: "About", icon: Info },
  ] as const;

  const [open, setOpen] = useState(false);
  function isActive(to: string) {
    return to === "/app" ? path === "/app" : path.startsWith(to);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-4 md:px-6 h-16 flex items-center justify-between gap-2">
          <Link to="/app" className="flex items-center gap-2 font-serif text-lg font-semibold shrink-0">
            <span className="grid place-items-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            LeafScan
          </Link>
          <nav className="hidden lg:flex items-center gap-1 overflow-x-auto">
            {tabs.map(({ to, label, icon: Icon }) => (
              <Link key={to} to={to}>
                <Button variant={isActive(to) ? "secondary" : "ghost"} size="sm" className="gap-2">
                  <Icon className="h-4 w-4" /> <span className="hidden xl:inline">{label}</span>
                </Button>
              </Link>
            ))}
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2 ml-2" aria-label="Sign out">
              <LogOut className="h-4 w-4" /> <span className="hidden xl:inline">Sign out</span>
            </Button>
          </nav>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden min-h-11 min-w-11">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {tabs.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} onClick={() => setOpen(false)}>
                    <Button variant={isActive(to) ? "secondary" : "ghost"} className="w-full justify-start gap-2">
                      <Icon className="h-4 w-4" /> {label}
                    </Button>
                  </Link>
                ))}
                <Button variant="ghost" onClick={() => { setOpen(false); signOut(); }} className="w-full justify-start gap-2 mt-2">
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 md:px-6 py-8">{children}</main>
    </div>
  );
}