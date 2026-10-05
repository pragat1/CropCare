import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { ArrowRight, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useContentItems } from "@/lib/admin/library";
import { toDiseaseReference, type DiseaseReference } from "@/lib/disease-references";

const STOP = new Set(["leaf", "disease", "the", "of", "and", "spot", "virus", "crop"]);
const tokens = (s: string) =>
  s
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

/** Score Disease Database entries against the AI's candidate names for this crop. */
export function matchDiseases(
  refs: DiseaseReference[],
  crop: string,
  names: string[],
): DiseaseReference[] {
  const c = crop.toLowerCase().trim();
  const wanted = names.filter(Boolean).map((n) => ({ raw: n.toLowerCase(), t: tokens(n) }));
  if (!wanted.length) return [];
  return refs
    .map((r) => {
      const hay = `${r.name} ${r.scientificName}`.toLowerCase();
      const ht = new Set(tokens(hay));
      let score = 0;
      wanted.forEach((w, i) => {
        const weight = i === 0 ? 3 : 1;
        if (hay.includes(w.raw) || w.raw.includes(r.name.toLowerCase())) score += 10 * weight;
        else {
          const hits = w.t.filter((t) => ht.has(t)).length;
          if (w.t.length && hits / w.t.length >= 0.5) score += 4 * hits * weight;
        }
      });
      const cropMatch = r.crop.toLowerCase() === c;
      return { r, score: score > 0 ? score + (cropMatch ? 5 : 0) : 0, cropMatch };
    })
    .filter((x) => x.score > 0 && (x.cropMatch || x.score >= 30))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.r);
}

export function MatchingDiseases({
  crop,
  names,
  compact = false,
}: {
  crop: string;
  names: string[];
  compact?: boolean;
}) {
  const { data, isPending } = useContentItems("disease");
  const matches = useMemo(
    () => matchDiseases((data ?? []).map(toDiseaseReference), crop, names),
    [data, crop, names],
  );
  if (isPending) return null;

  const body = matches.length ? (
    <ul className={compact ? "mt-2 space-y-2" : "mt-4 grid gap-3 sm:grid-cols-2"}>
      {matches.map((m) => (
        <li key={m.id}>
          <Link
            to="/diseases/$slug"
            params={{ slug: m.slug }}
            className="group flex items-center gap-3 rounded-lg border border-border bg-card p-2 pr-3 transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="h-12 w-16 shrink-0 overflow-hidden rounded-md bg-secondary">
              {m.imageUrl && (
                <img
                  src={m.imageUrl}
                  alt={`${m.name} reference`}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium group-hover:text-primary">
                {m.name}
              </span>
              <span className="block truncate text-xs capitalize text-muted-foreground">
                {m.crop}
                {m.type ? ` · ${m.type}` : ""}
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-primary" aria-hidden />
          </Link>
        </li>
      ))}
    </ul>
  ) : (
    <p className="mt-2 text-sm text-muted-foreground">
      No matching entry in the Disease Database yet.
    </p>
  );

  if (compact)
    return (
      <div className="mt-5">
        <h3 className="text-sm font-medium">Matching diseases in the database</h3>
        {body}
      </div>
    );
  return (
    <Card className="p-6">
      <div className="flex items-center gap-2">
        <span className="grid h-7 w-7 place-items-center rounded-md bg-muted">
          <BookOpen className="h-4 w-4" />
        </span>
        <h2 className="font-serif text-lg font-semibold">Matching Disease Database entries</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Compare your leaf with reference photos and full treatment guidance.
      </p>
      {body}
    </Card>
  );
}
