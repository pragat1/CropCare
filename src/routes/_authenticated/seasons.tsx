import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { SEASONS, SEASON_LIST } from "@/lib/data/seasons";

export const Route = createFileRoute("/_authenticated/seasons")({ component: SeasonsPage });

function SeasonsPage() {
  return (
    <AppShell>
      <h1 className="font-serif text-3xl font-semibold">Seasonal calendar</h1>
      <p className="text-muted-foreground mt-1">What to plant and watch out for through the year.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {SEASON_LIST.map(s => {
          const data = SEASONS[s.key];
          return (
            <Card key={s.key} className="p-5">
              <h2 className="font-semibold text-lg">{s.label}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {data.crops.map((c, i) => (
                  <span key={i} className="px-2 py-1 rounded-md bg-muted text-sm">{c.e} {c.n}</span>
                ))}
              </div>
              <p className="mt-3 text-sm"><span className="font-medium">Tip:</span> <span className="text-muted-foreground">{data.tip}</span></p>
              <p className="mt-2 text-sm"><span className="font-medium">Watch for:</span> <span className="text-muted-foreground">{data.disease}</span></p>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}