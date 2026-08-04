import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Resolve a private storage object to a temporary signed URL.
 * Shared by every report screen so signing/expiry logic lives in one place.
 */
export function useSignedUrl(bucket: string, path: string | null | undefined, expiresIn = 3600) {
  const query = useQuery({
    queryKey: ["signed-url", bucket, path],
    enabled: Boolean(path),
    staleTime: (expiresIn - 60) * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrl(path as string, expiresIn);
      if (error) throw error;
      return data?.signedUrl ?? null;
    },
  });
  return query.data ?? null;
}
