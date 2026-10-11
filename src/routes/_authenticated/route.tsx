import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { clearPasswordRecoveryMarker, getPasswordRecoveryUserId } from "@/lib/password-recovery";

export const Route = createFileRoute("/_authenticated")({
  staticData: { sitemap: "exclude-subtree" },
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    const recoveryUserId = getPasswordRecoveryUserId();
    if (recoveryUserId) {
      if (error || data.user?.id === recoveryUserId) {
        throw redirect({ to: "/reset-password" });
      }
      clearPasswordRecoveryMarker();
    }
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: () => <Outlet />,
});
