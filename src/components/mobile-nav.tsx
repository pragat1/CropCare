import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, LayoutDashboard, Menu, MessageCircle, ScanLine } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// Thumb-reachable bottom bar for phones: the four places a farmer opens most,
// with Detect Disease as the raised center action and Menu opening the sidebar.
export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { setOpenMobile } = useSidebar();

  const isActive = (to: string) => (to === "/app" ? path === "/app" : path.startsWith(to));

  const linkClass = (active: boolean) =>
    `flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[10px] font-medium transition-colors ${
      active ? "text-primary" : "text-muted-foreground hover:text-foreground"
    }`;

  const IconHome = LayoutDashboard;

  return (
    <nav
      aria-label="Primary mobile"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-1">
        <Link to="/dashboard" className={linkClass(isActive("/dashboard"))}>
          <IconHome className="h-5 w-5" aria-hidden />
          <span>Home</span>
        </Link>
        <Link to="/assistant" className={linkClass(isActive("/assistant"))}>
          <MessageCircle className="h-5 w-5" aria-hidden />
          <span>Assistant</span>
        </Link>
        <Link
          to="/app"
          aria-label="Detect disease"
          className="mx-auto -mt-5 grid h-14 w-14 place-items-center rounded-full bg-gradient-brand text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
        >
          <ScanLine className="h-6 w-6" aria-hidden />
        </Link>
        <Link to="/diseases" className={linkClass(isActive("/diseases"))}>
          <BookOpen className="h-5 w-5" aria-hidden />
          <span>Guide</span>
        </Link>
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          className={linkClass(false)}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" aria-hidden />
          <span>Menu</span>
        </button>
      </div>
    </nav>
  );
}
