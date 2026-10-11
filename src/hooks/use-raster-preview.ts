import { useEffect, useRef, useState } from "react";
import { createRasterPreview } from "@/lib/image-client";

export function useRasterPreview() {
  const [preview, setPreview] = useState<string | null>(null);
  const active = useRef<{ generation: number; url: string | null }>({
    generation: 0,
    url: null,
  });

  useEffect(
    () => () => {
      active.current.generation += 1;
      if (active.current.url) URL.revokeObjectURL(active.current.url);
    },
    [],
  );

  async function showPreview(file: File): Promise<boolean> {
    const generation = ++active.current.generation;
    let nextUrl: string;
    try {
      nextUrl = await createRasterPreview(file);
    } catch (error) {
      if (generation !== active.current.generation) return false;
      throw error;
    }
    if (generation !== active.current.generation) {
      URL.revokeObjectURL(nextUrl);
      return false;
    }

    const previousUrl = active.current.url;
    active.current.url = nextUrl;
    setPreview(nextUrl);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
    return true;
  }

  function clearPreview() {
    active.current.generation += 1;
    if (active.current.url) URL.revokeObjectURL(active.current.url);
    active.current.url = null;
    setPreview(null);
  }

  function releasePreview(): string | null {
    active.current.generation += 1;
    const url = active.current.url;
    active.current.url = null;
    setPreview(null);
    return url;
  }

  return { preview, showPreview, clearPreview, releasePreview };
}
