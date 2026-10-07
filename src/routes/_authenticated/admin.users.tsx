import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Users, Search, AlertTriangle, ShieldCheck, ShieldOff } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/admin/users")({
  staticData: { sitemap: false },
  component: AdminUsersPage,
  head: () =>
    pageHead("User Management | CropCare Admin", "Administer CropCare accounts and roles."),
});

type AdminUser = {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: string[];
  scan_count: number;
};

function AdminUsersPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");

  const users = useQuery({
    queryKey: ["admin-users"],
    queryFn: async (): Promise<AdminUser[]> => {
      const { data, error } = await supabase.rpc("admin_list_users");
      if (error) throw error;
      return (data ?? []) as AdminUser[];
    },
  });

  const setRole = useMutation({
    mutationFn: async ({ userId, grant }: { userId: string; grant: boolean }) => {
      if (grant) {
        const { error } = await supabase
          .from("user_roles")
          .insert({ user_id: userId, role: "admin" });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId)
          .eq("role", "admin");
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["is-admin"] });
      toast.success("Roles updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't update roles"),
  });

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const all = users.data ?? [];
    return term ? all.filter((u) => u.email.toLowerCase().includes(term)) : all;
  }, [users.data, q]);

  return (
    <AppShell>
      <Link to="/admin" className="mb-4 inline-flex">
        <Button variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Admin
        </Button>
      </Link>

      <PageHeader
        icon={Users}
        eyebrow="Administration"
        title="Users"
        description="Everyone with a CropCare account, their activity and administrator access."
      />

      <div className="relative mt-8 max-w-sm">
        <Search
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          className="pl-9"
          placeholder="Search by email"
          aria-label="Search users by email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <Card className="mt-6 overflow-hidden">
        {users.isLoading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : users.isError ? (
          <div className="p-10 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
            <p className="mt-3 text-sm text-muted-foreground">
              {users.error instanceof Error ? users.error.message : "Couldn’t load users."}
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => users.refetch()}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No users match “{q}”.
          </div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((u) => {
              const isAdmin = u.roles.includes("admin");
              return (
                <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {new Date(u.created_at).toLocaleDateString()} ·{" "}
                      {u.last_sign_in_at
                        ? `last seen ${new Date(u.last_sign_in_at).toLocaleDateString()}`
                        : "never signed in"}{" "}
                      · {u.scan_count} scan{u.scan_count === 1 ? "" : "s"}
                    </p>
                  </div>
                  {isAdmin && (
                    <Badge variant="secondary" className="gap-1">
                      <ShieldCheck className="h-3 w-3" /> Admin
                    </Badge>
                  )}
                  <Button
                    size="sm"
                    variant={isAdmin ? "ghost" : "secondary"}
                    className="gap-1 rounded-lg"
                    disabled={setRole.isPending}
                    onClick={() => setRole.mutate({ userId: u.id, grant: !isAdmin })}
                  >
                    {isAdmin ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5" /> Revoke admin
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5" /> Make admin
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </AppShell>
  );
}
