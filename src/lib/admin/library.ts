// Reads the editable content library and converts entries back into the shapes
// the public pages already render. Falls back to the built-in library when a
// category has no published entries yet.
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Category, ContentItem } from "./schema";

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