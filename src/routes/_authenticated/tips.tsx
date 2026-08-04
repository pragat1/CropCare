import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { Lightbulb } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Stagger, StaggerItem } from "@/components/motion";
import { TIPS, CROP_TIPS } from "@/lib/data/tips";
import { useOfflineData } from "@/hooks/use-offline";
import { useLibrary, mapTips } from "@/lib/admin/library";

export const Route = createFileRoute("/_authenticated/tips")({
  head: () =>
    pageHead(
      "Farming Tips & Best Practices | LeafScan",
      "Practical crop care tips covering irrigation, nutrition, pest pressure and disease prevention for every crop.",
    ),
  component: TipsPage,
});

function TipsPage() {
  const source = useLibrary("tip", TIPS, mapTips);
  const { data: tips } = useOfflineData("tips", source);
  const { data: cropTips } = useOfflineData("cropTips", CROP_TIPS);
  return (
    <AppShell>
      <PageHeader
        icon={Lightbulb}
        eyebrow="Knowledge"
        title="Farming tips"
        description="Best practices across watering, soil, sunlight, pests, fertilizer and harvest. Available offline."
      />

      <Stagger className="mt-8 grid gap-5 md:grid-cols-2">
        {tips.map((g) => (
          <StaggerItem key={g.cat}>
            <Card className="h-full p-6">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden>
                  {g.icon}
                </span>
                <h2 className="font-semibold">{g.title}</h2>
              </div>
              <ul className="mt-3 text-sm space-y-1.5 text-muted-foreground">
                {g.tips.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </Card>
          </StaggerItem>
        ))}
      </Stagger>

      <h2 className="font-serif text-2xl font-semibold mt-12">Crop-specific guides</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {Object.values(cropTips).map((c) => (
          <Card key={c.name} className="p-6">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden>
                {c.emoji}
              </span>
              <h3 className="font-semibold">{c.name}</h3>
            </div>
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-medium">Watering</summary>
              <ul className="mt-2 text-muted-foreground space-y-1">
                {c.watering.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </details>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">Soil</summary>
              <ul className="mt-2 text-muted-foreground space-y-1">
                {c.soil.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </details>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">Sunlight</summary>
              <ul className="mt-2 text-muted-foreground space-y-1">
                {c.sunlight.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </details>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">Fertilizer</summary>
              <ul className="mt-2 text-muted-foreground space-y-1">
                {c.fertilizer.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </details>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium">Harvest</summary>
              <ul className="mt-2 text-muted-foreground space-y-1">
                {c.harvest.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            </details>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
