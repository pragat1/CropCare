import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CROP_PROFILES } from "@/lib/data/crop-profiles";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/crops/")({
  head: () =>
    pageHead(
      "Crop Profiles | CropCare",
      "Growth stages, ideal climate and disease timelines for the crops you grow.",
    ),
  component: CropsPage,
});

function CropsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold uppercase text-primary">Crop profiles</p>
        <h1 className="mt-2 font-serif text-4xl">Know your crops</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Growth stages, ideal climate and a symptoms timeline built from your own scans.
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CROP_PROFILES.map((c) => (
            <Link
              key={c.key}
              to="/crops/$crop"
              params={{ crop: c.key }}
              className="group flex items-center gap-4 rounded-lg border border-border bg-card p-5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-3xl" aria-hidden>
                {c.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold group-hover:text-primary">{c.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {c.climate.temp}
                </span>
              </span>
              <ArrowRight className="h-4 w-4 text-primary" aria-hidden />
            </Link>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
