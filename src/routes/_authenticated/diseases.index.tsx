import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowRight, BookOpen, Camera, Search, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DiseaseReferenceImage } from "@/components/disease-reference-image";
import { useContentItems } from "@/lib/admin/library";
import { toDiseaseReference } from "@/lib/disease-references";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/diseases/")({
  head: () =>
    pageHead(
      "Disease Database | LeafScan",
      "Explore crop disease references, compare visible symptoms and learn how to identify them.",
    ),
  component: DiseasesPage,
});

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function DiseasesPage() {
  const { data: entries, isPending, isError, refetch } = useContentItems("disease");
  const [search, setSearch] = useState("");
  const [crop, setCrop] = useState("all");
  const [type, setType] = useState("all");
  const diseases = useMemo(() => (entries ?? []).map(toDiseaseReference), [entries]);
  const crops = useMemo(() => [...new Set(diseases.map((d) => d.crop).filter(Boolean))].sort(), [diseases]);
  const types = useMemo(() => [...new Set(diseases.map((d) => d.type).filter(Boolean))].sort(), [diseases]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return diseases.filter((d) =>
      (crop === "all" || d.crop === crop) &&
      (type === "all" || d.type === type) &&
      (!query || [d.name, d.crop, d.type, d.scientificName, ...d.symptoms]
        .some((value) => value.toLocaleLowerCase().includes(query))),
    );
  }, [diseases, search, crop, type]);
  const hasFilters = search !== "" || crop !== "all" || type !== "all";
  const clearFilters = () => { setSearch(""); setCrop("all"); setType("all"); };

  return (
    <AppShell>
      <div className="-mx-4 -mt-8 min-h-screen bg-field-canvas px-4 pb-14 pt-9 md:-mx-6 md:-mt-10 md:px-6 md:pt-12">
        <div className="mx-auto max-w-6xl">
          <header className="flex flex-col gap-5 border-b border-border/70 pb-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase text-primary">
                <BookOpen className="h-4 w-4" aria-hidden /> Disease reference
              </div>
              <h1 className="mt-3 font-field-serif text-4xl leading-tight text-foreground sm:text-5xl">Disease database</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Explore crop diseases, compare visible symptoms, and learn how to identify them.
              </p>
            </div>
            <Button asChild variant="outline" className="w-fit shrink-0 gap-2 border-primary/20 bg-card text-primary hover:bg-secondary hover:text-primary">
              <Link to="/app">Start a scan <ArrowRight className="h-4 w-4" aria-hidden /></Link>
            </Button>
          </header>

          <section aria-label="Find disease references" className="py-7">
            <div className="relative max-w-2xl">
              <Search aria-hidden className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                aria-label="Search diseases or crops"
                placeholder="Search diseases or crops..."
                className="h-12 bg-card pl-12 pr-11 text-sm shadow-sm"
              />
              {search && <Button variant="ghost" size="icon" onClick={() => setSearch("")} aria-label="Clear search" className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground"><X className="h-4 w-4" /></Button>}
            </div>
            {!isPending && !isError && diseases.length > 0 && (
              <div className="mt-5 space-y-3">
                {crops.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="w-12 shrink-0 pt-2 text-xs font-semibold text-field-muted">Crop</span>
                    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" aria-label="Filter by crop">
                      {["all", ...crops].map((value) => (
                        <Button key={value} variant={crop === value ? "default" : "outline"} size="sm" aria-pressed={crop === value} onClick={() => setCrop(value)} className="shrink-0 rounded-full px-4 shadow-none">
                          {value === "all" ? "All crops" : titleCase(value)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {types.length > 0 && (
                  <div className="flex items-start gap-3">
                    <span className="w-12 shrink-0 pt-2 text-xs font-semibold text-field-muted">Type</span>
                    <div className="flex min-w-0 gap-2 overflow-x-auto pb-1" aria-label="Filter by disease type">
                      {["all", ...types].map((value) => (
                        <Button key={value} variant={type === value ? "default" : "outline"} size="sm" aria-pressed={type === value} onClick={() => setType(value)} className="shrink-0 rounded-full px-4 shadow-none">
                          {value === "all" ? "All types" : titleCase(value)}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>

          <section aria-labelledby="library-heading">
            <div className="mb-5 flex items-center justify-between gap-3 border-t border-border/70 pt-6">
              <h2 id="library-heading" className="font-field-serif text-2xl text-foreground sm:text-3xl">Disease library</h2>
              {!isPending && !isError && <span className="text-sm text-field-muted">{filtered.length} {filtered.length === 1 ? "reference" : "references"}</span>}
            </div>
            {isPending ? (
              <div className="grid gap-5 md:grid-cols-2" role="status" aria-label="Loading disease references">
                {[0, 1, 2, 3].map((item) => <div key={item} className="overflow-hidden rounded-lg border border-border bg-card"><Skeleton className="aspect-[16/10] w-full rounded-none" /><div className="space-y-3 p-5"><Skeleton className="h-6 w-1/2" /><Skeleton className="h-4 w-1/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-3/4" /></div></div>)}
              </div>
            ) : isError ? (
              <div role="alert" className="border-y border-border py-14 text-center"><h3 className="font-field-serif text-2xl">Unable to load disease references</h3><p className="mt-2 text-sm text-muted-foreground">Please try again.</p><Button onClick={() => void refetch()} className="mt-5">Retry</Button></div>
            ) : diseases.length === 0 ? (
              <div className="border-y border-border py-14 text-center"><BookOpen className="mx-auto h-8 w-8 text-primary" aria-hidden /><h3 className="mt-4 font-field-serif text-2xl">No disease references yet</h3><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Your disease library will appear here once disease information is available.</p></div>
            ) : filtered.length === 0 ? (
              <div className="border-y border-border py-14 text-center"><Search className="mx-auto h-8 w-8 text-primary" aria-hidden /><h3 className="mt-4 font-field-serif text-2xl">No diseases found</h3><p className="mt-2 text-sm text-muted-foreground">Try another spelling, search by crop, or remove a filter.</p><Button variant="outline" onClick={clearFilters} className="mt-5">Clear filters</Button></div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {filtered.map((disease, index) => (
                  <Link key={disease.id} to="/diseases/$slug" params={{ slug: disease.slug }} className="group min-w-0 overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-[border-color,box-shadow] duration-300 hover:border-primary/35 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`View symptoms of ${disease.name}`}>
                    <DiseaseReferenceImage src={disease.imageUrl} name={disease.name} crop={disease.crop} priority={index < 2} />
                    <div className="flex min-h-48 flex-col p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-semibold leading-snug text-foreground group-hover:text-primary">{disease.name}</h3>{disease.type && <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">{titleCase(disease.type)}</span>}</div>
                      {disease.crop && <p className="mt-1 text-xs font-semibold uppercase text-primary">{titleCase(disease.crop)}</p>}
                      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{disease.symptoms[0] || "Symptoms information unavailable."}</p>
                      <span className="mt-auto inline-flex items-center gap-2 pt-5 text-sm font-semibold text-primary">View symptoms <ArrowRight className="h-4 w-4 transition-transform motion-safe:group-hover:translate-x-1" aria-hidden /></span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <aside className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border py-8 sm:flex-row sm:items-center">
            <div><h2 className="font-field-serif text-2xl">Have a leaf photo?</h2><p className="mt-1 text-sm text-muted-foreground">Let LeafScan analyze it for possible disease symptoms.</p></div>
            <Button asChild className="shrink-0 gap-2"><Link to="/app"><Camera className="h-4 w-4" aria-hidden /> Detect disease <ArrowRight className="h-4 w-4" aria-hidden /></Link></Button>
          </aside>
        </div>
      </div>
    </AppShell>
  );
}