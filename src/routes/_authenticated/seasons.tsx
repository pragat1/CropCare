import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { SEASONS, SEASON_LIST } from "@/lib/data/seasons";
import { useOfflineData } from "@/hooks/use-offline";
import { useLibrary, mapSeasons, mapSeasonList } from "@/lib/admin/library";

export const Route = createFileRoute("/_authenticated/seasons")({
  staticData: { sitemap: false },
  head: () =>
    pageHead(
      "Seasonal Crop Calendar | CropCare",
      "Season-by-season sowing, care and harvest guidance with the disease risks to watch for in each period.",
    ),
  component: SeasonsPage,
});

function SeasonsPage() {
  const seasonSource = useLibrary("season", SEASONS, mapSeasons);
  const listSource = useLibrary(
    "season",
    SEASON_LIST as Array<{ key: string; label: string }>,
    mapSeasonList,
  );
  const { data: seasons } = useOfflineData("seasons", seasonSource);
  const { data: seasonList } = useOfflineData("seasonList", listSource);
  return (
    <AppShell>
      <PageHeader
        icon={CalendarDays}
        eyebrow="Planning"
        title="Seasonal calendar"
        description="What to plant and watch out for through the year. Available offline."
      />
      <Stagger className="mt-8 grid gap-5 md:grid-cols-2">
        {seasonList.map((s) => {
          const data = seasons[s.key];
          if (!data) return null;
          return (
            <StaggerItem key={s.key}>
              <Card className="h-full p-6">
                <h2 className="font-semibold text-lg">{s.label}</h2>
                <div className="mt-3 flex flex-wrap gap-2">
                  {data.crops.map((c, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-primary/8 border border-border/50 text-sm"
                    >
                      {c.e} {c.n}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-sm">
                  <span className="font-medium">Tip:</span>{" "}
                  <span className="text-muted-foreground">{data.tip}</span>
                </p>
                <p className="mt-2 text-sm">
                  <span className="font-medium">Watch for:</span>{" "}
                  <span className="text-muted-foreground">{data.disease}</span>
                </p>
              </Card>
            </StaggerItem>
          );
        })}
      </Stagger>
    </AppShell>
  );
}
