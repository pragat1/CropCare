import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { DiseaseReferenceImage } from "@/components/disease-reference-image";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useContentItems } from "@/lib/admin/library";
import { toDiseaseReference } from "@/lib/disease-references";
import { pageHead } from "@/lib/seo";

export const Route = createFileRoute("/_authenticated/diseases/$slug")({
  head: () => pageHead("Disease Reference | LeafScan", "Crop disease symptoms, causes, treatment and prevention reference."),
  component: DiseaseDetailsPage,
});

function DiseaseDetailsPage() {
  const { slug } = Route.useParams();
  const { data: entries, isPending, isError, refetch } = useContentItems("disease");
  const entry = entries?.find((item) => item.slug === slug);
  const disease = entry ? toDiseaseReference(entry) : null;

  return (
    <AppShell>
      <div className="-mx-4 -mt-8 min-h-screen bg-background px-4 pb-14 pt-9 md:-mx-6 md:-mt-10 md:px-6 md:pt-12">
        <div className="mx-auto max-w-6xl">
          <Button variant="ghost" asChild className="-ml-3 mb-7 gap-2 text-primary"><Link to="/diseases"><ArrowLeft className="h-4 w-4" /> Back to diseases</Link></Button>
          {isPending ? <div role="status" aria-label="Loading disease reference"><Skeleton className="h-12 w-1/2" /><Skeleton className="mt-6 aspect-[16/7] w-full" /><Skeleton className="mt-8 h-28 w-full" /></div> : isError ? (
             <div role="alert" className="py-14 text-center"><h1 className="font-serif text-3xl">Unable to load disease references</h1><p className="mt-2 text-muted-foreground">Please try again.</p><Button onClick={() => void refetch()} className="mt-5">Retry</Button></div>
          ) : !disease ? (
             <div className="py-14 text-center"><BookOpen className="mx-auto h-8 w-8 text-primary" /><h1 className="mt-4 font-serif text-3xl">Disease reference not found</h1><p className="mt-2 text-muted-foreground">This reference may have been removed or unpublished.</p><Button asChild className="mt-5"><Link to="/diseases">Browse diseases</Link></Button></div>
          ) : (
            <article>
              <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                <div className="pt-2">
                  {disease.type && <span className="inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-secondary-foreground">{disease.type}</span>}
                   <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">{disease.name}</h1>
                  {disease.scientificName && <p className="mt-2 italic text-primary">{disease.scientificName}</p>}
                  {disease.crop && <p className="mt-5 text-sm font-semibold uppercase text-primary">Affected crop · {disease.crop}</p>}
                  {disease.summary && <p className="mt-5 max-w-xl leading-relaxed text-muted-foreground">{disease.summary}</p>}
                </div>
                <div className="group overflow-hidden rounded-lg border border-border"><DiseaseReferenceImage src={disease.imageUrl} name={disease.name} crop={disease.crop} priority /></div>
              </div>
              <div className="mt-10 grid gap-x-12 gap-y-10 border-t border-border pt-9 md:grid-cols-2">
                <ReferenceSection title="Symptoms to look for" items={disease.symptoms} fallback="Symptoms information unavailable." />
                <ReferenceSection title="Causes" items={disease.causes} fallback="Causes information unavailable." />
                <ReferenceSection title="Organic treatment" items={disease.organic} fallback="Organic treatment information unavailable." />
                <ReferenceSection title="Chemical treatment" items={disease.chemical} fallback="Chemical treatment information unavailable." />
                <ReferenceSection title="Prevention" items={disease.preventive} fallback="Prevention information unavailable." />
              </div>
            </article>
          )}
        </div>
      </div>
    </AppShell>
  );
}

function ReferenceSection({ title, items, fallback }: { title: string; items: string[]; fallback: string }) {
   return <section><h2 className="font-serif text-2xl text-foreground">{title}</h2>{items.length ? <ul className="mt-4 space-y-3">{items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-3 text-sm leading-relaxed text-muted-foreground"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />{item}</li>)}</ul> : <p className="mt-4 text-sm text-muted-foreground">{fallback}</p>}</section>;
}