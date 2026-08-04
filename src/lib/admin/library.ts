// Reads the editable content library and converts entries back into the shapes
// the public pages already render. Falls back to the built-in library when a
// category has no published entries yet.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, ContentItem } from "./schema";
import type { Disease } from "@/lib/data/diseases";
import type { TipGroup } from "@/lib/data/tips";
import type { Season } from "@/lib/data/seasons";
import type { Quiz } from "@/lib/data/quizzes";

export function useContentItems(category: Category, opts?: { includeUnpublished?: boolean }) {
  return useQuery({
    queryKey: ["content", category, opts?.includeUnpublished ?? false],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_items")
        .select("id, category, slug, title, data, sort_order, published, created_at, updated_at")
        .eq("category", category)
        .order("sort_order", { ascending: true })
        .order("title", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as unknown as ContentItem[];
      return opts?.includeUnpublished ? rows : rows.filter((r) => r.published);
    },
  });
}

/**
 * Published entries for a category mapped with `map`, or the built-in data when
 * the library is empty (or unreachable, e.g. offline).
 */
export function useLibrary<T>(category: Category, builtin: T, map: (items: ContentItem[]) => T): T {
  const { data } = useContentItems(category);
  return useMemo(() => (data && data.length > 0 ? map(data) : builtin), [data, builtin, map]);
}

export function str(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v : fallback;
}
export function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
export function list(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/* ---- category mappers (module scope so `useMemo` deps stay stable) ---- */

export function mapDiseases(items: ContentItem[]): Disease[] {
  return items.map((it) => {
    const d = it.data;
    const severity = str(d.severity, "medium");
    return {
      id: it.id,
      crop: str(d.crop, "general"),
      emoji: str(d.emoji, "🌿"),
      name: it.title,
      severity: (severity === "low" || severity === "high" ? severity : "medium") as Disease["severity"],
      summary: str(d.summary),
      symptoms: list(d.symptoms),
      causes: list(d.causes),
      organic: list(d.organic),
      chemical: list(d.chemical),
      preventive: list(d.preventive),
      confidence: num(d.confidence, 80),
    };
  });
}

export function mapTips(items: ContentItem[]): TipGroup[] {
  return items.map((it) => ({
    cat: str(it.data.cat, it.slug),
    cls: str(it.data.cls, str(it.data.cat, it.slug)),
    icon: str(it.data.icon, "💡"),
    title: it.title,
    tips: list(it.data.tips),
  }));
}

export function mapSeasons(items: ContentItem[]): Record<string, Season> {
  const out: Record<string, Season> = {};
  for (const it of items) {
    out[it.slug] = {
      crops: list(it.data.crops).map((c) => {
        const [e, ...rest] = c.split(" ");
        return rest.length ? { e, n: rest.join(" ") } : { e: "🌱", n: c };
      }),
      tip: str(it.data.tip),
      disease: str(it.data.disease),
    };
  }
  return out;
}

export function mapSeasonList(items: ContentItem[]): Array<{ key: string; label: string }> {
  return items.map((it) => ({ key: it.slug, label: str(it.data.label, it.title) }));
}

export function mapQuizzes(items: ContentItem[]): Quiz[] {
  return items.map((it) => ({
    q: it.title,
    opts: list(it.data.opts),
    ans: num(it.data.ans, 0),
    explanation: str(it.data.explanation),
  }));
}