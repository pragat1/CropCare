import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { TIPS, CROP_TIPS } from "@/lib/data/tips";

export const Route = createFileRoute("/_authenticated/tips")({ component: TipsPage });

function TipsPage() {
  return (
    <AppShell>
      <h1 className="font-serif text-3xl font-semibold">Farming tips</h1>
      <p className="text-muted-foreground mt-1">Best practices across watering, soil, sunlight, pests, fertilizer and harvest.</p>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {TIPS.map(g => (
          <Card key={g.cat} className="p-5">
            <div className="flex items-center gap-2"><span className="text-xl" aria-hidden>{g.icon}</span><h2 className="font-semibold">{g.title}</h2></div>
            <ul className="mt-3 text-sm space-y-1.5 text-muted-foreground">
              {g.tips.map((t, i) => <li key={i}>• {t}</li>)}
            </ul>
          </Card>
        ))}
      </div>

      <h2 className="font-serif text-2xl font-semibold mt-10">Crop-specific guides</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {Object.values(CROP_TIPS).map(c => (
          <Card key={c.name} className="p-5">
            <div className="flex items-center gap-2"><span className="text-xl" aria-hidden>{c.emoji}</span><h3 className="font-semibold">{c.name}</h3></div>
            <details className="mt-3 text-sm"><summary className="cursor-pointer font-medium">Watering</summary><ul className="mt-2 text-muted-foreground space-y-1">{c.watering.map((t,i)=><li key={i}>• {t}</li>)}</ul></details>
            <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">Soil</summary><ul className="mt-2 text-muted-foreground space-y-1">{c.soil.map((t,i)=><li key={i}>• {t}</li>)}</ul></details>
            <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">Sunlight</summary><ul className="mt-2 text-muted-foreground space-y-1">{c.sunlight.map((t,i)=><li key={i}>• {t}</li>)}</ul></details>
            <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">Fertilizer</summary><ul className="mt-2 text-muted-foreground space-y-1">{c.fertilizer.map((t,i)=><li key={i}>• {t}</li>)}</ul></details>
            <details className="mt-2 text-sm"><summary className="cursor-pointer font-medium">Harvest</summary><ul className="mt-2 text-muted-foreground space-y-1">{c.harvest.map((t,i)=><li key={i}>• {t}</li>)}</ul></details>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}