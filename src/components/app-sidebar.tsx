import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  CalendarDays,
  CloudSun,
  History,
  Info,
  LayoutDashboard,
  Leaf,
  LineChart,
  Lightbulb,
  LogOut,
  ScanLine,
  Settings,
  ShieldCheck,
  Sprout,
  MessageCircle,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { useIsAdmin } from "@/hooks/use-admin";
import { useProfile } from "@/lib/profile";

type NavItem = { to: string; label: string; icon: typeof Info };

const MONITOR: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/app", label: "Detect Disease", icon: ScanLine },
  { to: "/assistant", label: "AI Assistant", icon: MessageCircle },
  { to: "/soil", label: "Soil Analysis", icon: Sprout },
  { to: "/weather", label: "Weather", icon: CloudSun },
  { to: "/tracker", label: "Treatment Tracker", icon: LineChart },
  { to: "/reminders", label: "Reminders", icon: Bell },
];

const LEARN: NavItem[] = [
  { to: "/diseases", label: "Diseases", icon: BookOpen },
  { to: "/crops", label: "Crop profiles", icon: Leaf },
  { to: "/tips", label: "Tips", icon: Lightbulb },
  { to: "/seasons", label: "Seasons", icon: CalendarDays },
  { to: "/quiz", label: "Quiz", icon: Brain },
];

const ACCOUNT: NavItem[] = [
  { to: "/history", label: "History", icon: History },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/about", label: "About", icon: Info },
];

export function initialsOf(name: string | null | undefined) {
  const source = (name ?? "").trim();
  if (!source) return "LS";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function AppSidebar({ onSignOut }: { onSignOut: () => void }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (to: string) => (to === "/app" ? path === "/app" : path.startsWith(to));
  const close = () => isMobile && setOpenMobile(false);

  const groups: Array<{ label: string; items: NavItem[] }> = [
    { label: "Monitor", items: MONITOR },
    { label: "Learn", items: LEARN },
    {
      label: "Account",
      items: isAdmin ? [...ACCOUNT, { to: "/admin", label: "Admin", icon: ShieldCheck }] : ACCOUNT,
    },
  ];

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link
          to="/dashboard"
          onClick={close}
          className="flex items-center gap-2.5 px-1.5 py-1.5"
          aria-label="CropCare dashboard"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground">
            <Leaf className="h-4.5 w-4.5" aria-hidden />
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-serif text-base font-semibold tracking-tight">
                CropCare
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                Smart Agriculture
              </span>
            </span>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map(({ to, label, icon: Icon }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton asChild isActive={isActive(to)} tooltip={label}>
                      <Link to={to} onClick={close}>
                        <Icon aria-hidden />
                        <span>{label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {!collapsed && (
          <div className="mb-1 rounded-xl border border-border/60 bg-primary/5 p-3">
            <p className="text-sm font-medium">Go Premium</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Advanced analytics and priority support are coming soon.
            </p>
            <Button size="sm" variant="secondary" className="mt-3 w-full rounded-full" disabled>
              Upgrade Now
            </Button>
          </div>
        )}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Settings">
              <Link to="/settings" onClick={close}>
                <span
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary"
                  aria-hidden
                >
                  {initialsOf(profile?.display_name)}
                </span>
                <span className="truncate">{profile?.display_name ?? "Your profile"}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={onSignOut} tooltip="Sign out">
              <LogOut aria-hidden />
              <span>Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
