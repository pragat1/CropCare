import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BarChart3, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { CATEGORIES, CATEGORY_DEFS } from "@/lib/admin/schema";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
  head: () => ({
    meta: [
      { title: "Admin · CropCare Content Library" },
      {
        name: "description",
        content:
          "Administrator dashboard to manage diseases, treatments, quizzes, growth tips, seasonal guides, crops and the soil database.",
      },
      { property: "og:title", content: "Admin · CropCare Content Library" },
      {
        property: "og:description",
        content:
          "Manage the CropCare content library: diseases, treatments, quizzes, tips, seasons, crops and soil.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function AdminHome() {
  const { data: counts } = useQuery({
    queryKey: ["admin-counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("content_items").select("category, published");
      if (error) throw error;
      const map: Record<string, { total: number; published: number }> = {};
      for (const row of data ?? []) {
        const c = row.category as string;
        map[c] ??= { total: 0, published: 0 };
        map[c].total += 1;
        if (row.published) map[c].published += 1;
      }
      return map;
    },
  });

  return (
    <AppShell>
      <PageHeader
        icon={ShieldCheck}
        eyebrow="Administration"
        title="Content library"
        description="Create, edit, publish and delete the reference content the whole app reads from."
      />
      <Stagger className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CATEGORIES.map((key) => {
          const def = CATEGORY_DEFS[key];
          const c = counts?.[key];
          return (
            <StaggerItem key={key}>
              <Link to="/admin/$category" params={{ category: key }} className="block h-full">
                <Card className="flex h-full flex-col p-6 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-3xl" aria-hidden>
                      {def.emoji}
                    </span>
                    <Badge variant="secondary">
                      {c ? `${c.published}/${c.total} live` : "empty"}
                    </Badge>
                  </div>
                  <h2 className="mt-4 font-serif text-lg font-semibold">{def.plural}</h2>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{def.description}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 gap-1 self-start rounded-full text-primary"
                  >
                    Manage <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </Card>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Link to="/admin/users" className="block">
          <Card className="flex h-full items-center gap-4 p-6 transition-colors hover:border-primary/40">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-semibold">Users</h2>
              <p className="text-sm text-muted-foreground">
                Review accounts, activity and grant or revoke administrator access.
              </p>
            </div>
          </Card>
        </Link>
        <Link to="/analytics" className="block">
          <Card className="flex h-full items-center gap-4 p-6 transition-colors hover:border-primary/40">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <BarChart3 className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <h2 className="font-serif text-lg font-semibold">Analytics</h2>
              <p className="text-sm text-muted-foreground">
                Detection volume, crop distribution, treatment success and exportable reports.
              </p>
            </div>
          </Card>
        </Link>
      </div>
    </AppShell>
  );
}
