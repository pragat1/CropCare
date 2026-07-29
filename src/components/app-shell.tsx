import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Leaf, LogOut, ScanLine, History, Sprout, LineChart, BookOpen, Lightbulb, CalendarDays, Brain, Info, Menu, LayoutDashboard, CloudSun } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/app", label: "Detect", icon: ScanLine },
    { to: "/soil", label: "Soil", icon: Sprout },
    { to: "/weather", label: "Weather", icon: CloudSun },
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
    <div className="min-h-screen bg-background bg-mesh">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-4 md:px-6">
          <Link to="/dashboard" className="flex shrink-0 items-center gap-2.5 font-serif text-lg font-semibold tracking-tight">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-brand text-primary-foreground ring-glow">
              <Leaf className="h-4.5 w-4.5" />
            </span>
            LeafScan
          </Link>
          <nav className="hidden items-center gap-0.5 rounded-full border border-border/50 bg-card/40 p-1 backdrop-blur-md lg:flex">
            {tabs.map(({ to, label, icon: Icon }) => {
              const active = isActive(to);
              return (
                <Link key={to} to={to} className="relative">
                  <span
                    className={`relative z-10 flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                      active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden xl:inline">{label}</span>
                  </span>
                  <AnimatePresence>
                    {active && (
                      <motion.span
                        layoutId="nav-pill"
                        className="absolute inset-0 rounded-full bg-gradient-brand"
                        transition={{ type: "spring", stiffness: 380, damping: 32 }}
                      />
                    )}
                  </AnimatePresence>
                </Link>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="ml-1 hidden gap-2 rounded-full text-muted-foreground lg:inline-flex"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" /> <span className="hidden xl:inline">Sign out</span>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu" className="min-h-11 min-w-11 rounded-xl lg:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 glass-strong">
              <SheetHeader><SheetTitle>Menu</SheetTitle></SheetHeader>
              <div className="mt-4 flex flex-col gap-1">
                {tabs.map(({ to, label, icon: Icon }) => (
                  <Link key={to} to={to} onClick={() => setOpen(false)}>
                    <Button variant={isActive(to) ? "secondary" : "ghost"} className="w-full justify-start gap-2 rounded-xl">
                      <Icon className="h-4 w-4" /> {label}
                    </Button>
                  </Link>
                ))}
                <Button variant="ghost" onClick={() => { setOpen(false); signOut(); }} className="mt-2 w-full justify-start gap-2 rounded-xl">
                  <LogOut className="h-4 w-4" /> Sign out
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10 md:px-6 md:py-12">{children}</main>
    </div>
  );
}