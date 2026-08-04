import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useContentItems } from "@/lib/admin/library";
import {
  CATEGORY_DEFS,
  isCategory,
  slugify,
  type ContentItem,
  type FieldDef,
} from "@/lib/admin/schema";

export const Route = createFileRoute("/_authenticated/admin/$category")({
  beforeLoad: ({ params }) => {
    if (!isCategory(params.category)) throw notFound();
  },
  component: AdminCategoryPage,
  head: ({ params }) => {
    const def = isCategory(params.category) ? CATEGORY_DEFS[params.category] : null;
    const title = `Manage ${def?.plural ?? "content"} · LeafScan Admin`;
    return {
      meta: [
        { title },
        {
          name: "description",
          content: def?.description ?? "Administrator content management for LeafScan.",
        },
        { property: "og:title", content: title },
        {
          property: "og:description",
          content: def?.description ?? "Administrator content management for LeafScan.",
        },
        { property: "og:type", content: "website" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  notFoundComponent: () => (
    <AppShell>
      <Card className="mx-auto max-w-lg p-8 text-center">
        <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
        <h1 className="mt-3 font-serif text-xl font-semibold">Unknown content type</h1>
        <Link to="/admin" className="mt-4 inline-block">
          <Button className="rounded-full">Back to admin</Button>
        </Link>
      </Card>
    </AppShell>
  ),
});

type Draft = {
  id: string | null;
  title: string;
  slug: string;
  sort_order: number;
  published: boolean;
  data: Record<string, unknown>;
};

function emptyDraft(): Draft {
  return { id: null, title: "", slug: "", sort_order: 0, published: true, data: {} };
}

function AdminCategoryPage() {
  const { category } = Route.useParams();
  const def = CATEGORY_DEFS[category as keyof typeof CATEGORY_DEFS];
  const qc = useQueryClient();
  const {
    data: items,
    isLoading,
    isError,
    error,
    refetch,
  } = useContentItems(def.key, { includeUnpublished: true });

  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [pendingDelete, setPendingDelete] = useState<ContentItem | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = items ?? [];
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q) ||
        JSON.stringify(r.data).toLowerCase().includes(q),
    );
  }, [items, search]);

  function invalidate() {
    void qc.invalidateQueries({ queryKey: ["content", def.key] });
    void qc.invalidateQueries({ queryKey: ["admin-counts"] });
  }

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const title = d.title.trim();
      if (!title) throw new Error("Title is required.");
      for (const f of def.fields) {
        if (!f.required) continue;
        const v = d.data[f.key];
        const empty = v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
        if (empty) throw new Error(`${f.label} is required.`);
      }
      const payload = {
        category: def.key,
        title,
        slug: d.slug.trim() || slugify(title),
        sort_order: Number.isFinite(d.sort_order) ? d.sort_order : 0,
        published: d.published,
        data: d.data as unknown as Json,
      };
      if (d.id) {
        const { error: e } = await supabase.from("content_items").update(payload).eq("id", d.id);
        if (e) throw e;
      } else {
        const { data: auth } = await supabase.auth.getUser();
        const { error: e } = await supabase
          .from("content_items")
          .insert({ ...payload, created_by: auth.user?.id ?? null });
        if (e) throw e;
      }
    },
    onSuccess: (_r, d) => {
      toast.success(d.id ? "Entry updated" : "Entry created");
      setDraft(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t save this entry."),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error: e } = await supabase.from("content_items").delete().eq("id", id);
      if (e) throw e;
    },
    onSuccess: () => {
      toast.success("Entry deleted");
      setPendingDelete(null);
      invalidate();
    },
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t delete this entry."),
  });

  const togglePublish = useMutation({
    mutationFn: async (row: ContentItem) => {
      const { error: e } = await supabase
        .from("content_items")
        .update({ published: !row.published })
        .eq("id", row.id);
      if (e) throw e;
    },
    onSuccess: () => invalidate(),
    onError: (e: unknown) =>
      toast.error(e instanceof Error ? e.message : "Couldn’t update visibility."),
  });

  const importBuiltIn = useMutation({
    mutationFn: async () => {
      const seeds = def.seed();
      const { data: auth } = await supabase.auth.getUser();
      const rows = seeds.map((s) => ({
        category: def.key,
        slug: s.slug,
        title: s.title,
        data: s.data as unknown as Json,
        sort_order: s.sort_order,
        published: true,
        created_by: auth.user?.id ?? null,
      }));
      for (let i = 0; i < rows.length; i += 100) {
        const { error: e } = await supabase
          .from("content_items")
          .upsert(rows.slice(i, i + 100), { onConflict: "category,slug" });
        if (e) throw e;
      }
      return rows.length;
    },
    onSuccess: (n) => {
      toast.success(`Imported ${n} built-in ${def.plural.toLowerCase()}`);
      invalidate();
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Import failed."),
  });

  function startEdit(row: ContentItem) {
    setDraft({
      id: row.id,
      title: row.title,
      slug: row.slug,
      sort_order: row.sort_order,
      published: row.published,
      data: { ...row.data },
    });
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="Administration"
        title={def.plural}
        description={def.description}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link to="/admin">
              <Button variant="ghost" className="gap-2 rounded-full">
                <ArrowLeft className="h-4 w-4" /> Admin
              </Button>
            </Link>
            <Button
              variant="secondary"
              className="gap-2 rounded-full"
              onClick={() => importBuiltIn.mutate()}
              disabled={importBuiltIn.isPending}
            >
              <Download className="h-4 w-4" />{" "}
              {importBuiltIn.isPending ? "Importing…" : "Import built-in"}
            </Button>
            <Button className="gap-2 rounded-full" onClick={() => setDraft(emptyDraft())}>
              <Plus className="h-4 w-4" /> New {def.label.toLowerCase()}
            </Button>
          </div>
        }
      />

      {draft && (
        <FadeIn className="mt-8">
          <Card className="p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-serif text-lg font-semibold">
                {draft.id ? `Edit ${def.label.toLowerCase()}` : `New ${def.label.toLowerCase()}`}
              </h2>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Close editor"
                onClick={() => setDraft(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <Label htmlFor="f-title">
                  Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="f-title"
                  value={draft.title}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      title: e.target.value,
                      slug: draft.id ? draft.slug : slugify(e.target.value),
                    })
                  }
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="f-slug">Key</Label>
                <Input
                  id="f-slug"
                  value={draft.slug}
                  onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="f-sort">Sort order</Label>
                <Input
                  id="f-sort"
                  type="number"
                  value={draft.sort_order}
                  onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })}
                  className="mt-1.5"
                />
              </div>

              {def.fields.map((f) => (
                <FieldInput
                  key={f.key}
                  field={f}
                  value={draft.data[f.key]}
                  onChange={(v) => setDraft({ ...draft, data: { ...draft.data, [f.key]: v } })}
                />
              ))}

              <div className="flex items-center gap-3 md:col-span-2">
                <Switch
                  id="f-pub"
                  checked={draft.published}
                  onCheckedChange={(v) => setDraft({ ...draft, published: v })}
                />
                <Label htmlFor="f-pub">Published (visible to all users)</Label>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button
                className="gap-2 rounded-full"
                onClick={() => save.mutate(draft)}
                disabled={save.isPending}
              >
                <Save className="h-4 w-4" /> {save.isPending ? "Saving…" : "Save entry"}
              </Button>
              <Button variant="ghost" className="rounded-full" onClick={() => setDraft(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </FadeIn>
      )}

      <div className="mt-8">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${def.plural.toLowerCase()}…`}
            aria-label={`Search ${def.plural}`}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="mt-6 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="mt-6 p-8 text-center">
            <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
            <p className="mt-2 text-sm text-muted-foreground">
              {error instanceof Error ? error.message : "Couldn’t load entries."}
            </p>
            <Button className="mt-4 rounded-xl" onClick={() => refetch()}>
              Try again
            </Button>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="mt-6 border-dashed p-10 text-center text-sm text-muted-foreground">
            {items && items.length === 0
              ? `No ${def.plural.toLowerCase()} yet — create one, or import the built-in library.`
              : "No entries match your search."}
          </Card>
        ) : (
          <div className="mt-6 space-y-3">
            {filtered.map((row) => (
              <Card key={row.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{row.title}</p>
                    {!row.published && <Badge variant="secondary">Draft</Badge>}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {row.slug} · updated {new Date(row.updated_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={row.published}
                    onCheckedChange={() => togglePublish.mutate(row)}
                    aria-label={`${row.published ? "Unpublish" : "Publish"} ${row.title}`}
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 rounded-lg"
                    onClick={() => startEdit(row)}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    aria-label={`Delete ${row.title}`}
                    onClick={() => setPendingDelete(row)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{pendingDelete?.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the entry for every user. You can re-import the built-in library later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => pendingDelete && remove.mutate(pendingDelete.id)}
              disabled={remove.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldDef;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const id = `f-${field.key}`;
  const label = (
    <Label htmlFor={id}>
      {field.label} {field.required && <span className="text-destructive">*</span>}
    </Label>
  );
  const wide = field.type === "textarea" || field.type === "list";

  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      {label}
      {field.type === "textarea" && (
        <Textarea
          id={id}
          rows={3}
          className="mt-1.5"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "list" && (
        <Textarea
          id={id}
          rows={4}
          className="mt-1.5"
          value={Array.isArray(value) ? value.join("\n") : ""}
          onChange={(e) =>
            onChange(
              e.target.value
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean),
            )
          }
        />
      )}
      {field.type === "number" && (
        <Input
          id={id}
          type="number"
          className="mt-1.5"
          value={typeof value === "number" ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      )}
      {field.type === "text" && (
        <Input
          id={id}
          className="mt-1.5"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
      {field.type === "select" && (
        <Select value={typeof value === "string" ? value : ""} onValueChange={onChange}>
          <SelectTrigger id={id} className="mt-1.5">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        {field.help ?? (field.type === "list" ? "One item per line." : "")}
      </p>
    </div>
  );
}
