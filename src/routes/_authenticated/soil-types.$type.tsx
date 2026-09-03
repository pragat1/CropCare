import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Droplets, Leaf, Sprout, Wrench } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { SOIL_GUIDE } from "@/lib/data/soil-guide";
import { SOIL_IMAGES, SOIL_SLUGS } from "@/lib/data/soil-images";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/soil-types/$type")({
  head: ({ params }) => {
    const name = SOIL_SLUGS[params.type.toLowerCase()];
    if (!name)
      return pageHead("Soil type | LeafScan", "Soil type reference guide from LeafScan.", {
        robots: "noindex",
      });
    const g = SOIL_GUIDE[name];
    return pageHead(`${name} soil guide | LeafScan`, g?.summary ?? "Soil type reference guide.");
  },
  component: SoilTypePage,
  notFoundComponent: () => (
    <AppShell>
      <Card className="p-6 text-muted-foreground">That soil type doesn't exist.</Card>
    </AppShell>
  ),
});

function SoilTypePage() {
  const { type } = Route.useParams();
  const name = SOIL_SLUGS[type.toLowerCase()];
  if (!name) throw notFound();
  const g = SOIL_GUIDE[name];
  if (!g) throw notFound();
  const img = SOIL_IMAGES[name];

  return (
    <AppShell>
      <Link to="/soil">
        <Button variant="ghost" size="sm" className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to soil analysis
        </Button>
      </Link>

      <div className="mt-4">
        <PageHeader
          icon={Sprout}
          eyebrow="Soil type guide"
          title={`${name} soil`}
          description={g.summary}
        />
      </div>

      {img && (
        <img
          src={img}
          alt={`${name} soil close-up`}
          width={1024}
          height={640}
          className="mt-6 h-56 w-full rounded-xl object-cover sm:h-72"
        />
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="secondary">Texture: {g.texture}</Badge>
        <Badge variant="secondary">Fertility: {g.fertility}</Badge>
        <Badge variant="secondary">Water retention: {g.retention}</Badge>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Leaf className="h-4 w-4 text-primary" /> Best-suited crops
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            {g.crops.map((c) => (
              <li key={c}>• {c}</li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 font-semibold">
            <Droplets className="h-4 w-4 text-primary" /> Water &amp; drainage
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This soil holds water at {g.retention.toLowerCase()}. Plan irrigation and drainage
            around that behaviour to avoid drought stress or waterlogging.
          </p>
        </Card>

        <Card className="p-5 md:col-span-2">
          <h2 className="flex items-center gap-2 font-semibold">
            <Wrench className="h-4 w-4 text-primary" /> Maintenance
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">{g.maintenance}</p>
          <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
            {g.tips.map((t) => (
              <li key={t}>• {t}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-5">
        <p className="text-sm text-muted-foreground">
          Not sure which soil you have? Upload a photo and let LeafScan analyze it.
        </p>
        <Button asChild>
          <Link to="/soil">Analyze my soil</Link>
        </Button>
      </Card>
    </AppShell>
  );
}
