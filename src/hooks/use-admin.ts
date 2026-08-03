import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in user holds the admin role (enforced again by RLS server-side). */
export function useIsAdmin() {
  const q = useQuery({
    queryKey: ["is-admin"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase.rpc("has_role", { _user_id: auth.user.id, _role: "admin" });
      if (error) throw error;
      return Boolean(data);
    },
  });
  return { isAdmin: q.data === true, isLoading: q.isLoading, isError: q.isError };
}