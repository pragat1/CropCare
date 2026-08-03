import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { ShieldAlert, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsAdmin } from "@/hooks/use-admin";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { isAdmin, isLoading } = useIsAdmin();

  if (isLoading) {
    return (
      <AppShell>
        <Skeleton className="h-10 w-64 rounded-xl" />
        <Skeleton className="mt-6 h-64 w-full rounded-2xl" />
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <ShieldAlert className="mx-auto h-7 w-7 text-destructive" />
          <h1 className="mt-3 font-serif text-2xl font-semibold">Admins only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This area manages the shared content library. Your account doesn’t have the administrator role,
            so the database also blocks any changes from here.
          </p>
          <Link to="/dashboard" className="mt-5 inline-block">
            <Button className="rounded-full">Back to dashboard</Button>
          </Link>
        </Card>
      </AppShell>
    );
  }

  return (
    <>
      <span className="sr-only" role="status">
        <ShieldCheck className="h-4 w-4" /> Administrator session
      </span>
      <Outlet />
    </>
  );
}