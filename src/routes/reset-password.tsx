import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPasswordRecoveryMarker,
  getPasswordRecoveryUserId,
  markPasswordRecovery,
} from "@/lib/password-recovery";
import { pageHead } from "@/lib/seo";

const passwordSchema = z
  .object({
    password: z
      .string()
      .min(12, "Use at least 12 characters")
      .max(72, "Use no more than 72 characters"),
    confirmation: z.string(),
  })
  .refine((value) => value.password === value.confirmation, {
    path: ["confirmation"],
    message: "Passwords do not match",
  });

type PageState = "checking" | "invalid" | "ready" | "success";

export const Route = createFileRoute("/reset-password")({
  staticData: { sitemap: false },
  head: () => pageHead("Choose a new CropCare password", "Set a new password for your account."),
  ssr: false,
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const [pageState, setPageState] = useState<PageState>("checking");
  const [recoveryUserId, setRecoveryUserId] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;

    async function verifyStoredRecoverySession() {
      const expectedUserId = getPasswordRecoveryUserId();
      if (!expectedUserId) {
        if (!disposed) setPageState("invalid");
        return;
      }

      let data: Awaited<ReturnType<typeof supabase.auth.getUser>>["data"];
      let sessionError: Error | null = null;
      try {
        const response = await supabase.auth.getUser();
        data = response.data;
        sessionError = response.error;
      } catch {
        if (!disposed) setPageState("invalid");
        return;
      }
      if (disposed) return;

      const currentExpectedUserId = getPasswordRecoveryUserId();
      if (currentExpectedUserId !== expectedUserId) return;
      if (sessionError || !data.user || data.user.id !== expectedUserId) {
        clearPasswordRecoveryMarker();
        setRecoveryUserId(null);
        setPageState("invalid");
        return;
      }
      setRecoveryUserId(expectedUserId);
      setPageState("ready");
    }

    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session?.user.id) {
        markPasswordRecovery(session.user.id);
        setRecoveryUserId(session.user.id);
        setError(null);
        setPageState("ready");
      } else if (event === "SIGNED_OUT") {
        clearPasswordRecoveryMarker();
        setRecoveryUserId(null);
        setPageState((current) => (current === "success" ? current : "invalid"));
      } else if (event === "SIGNED_IN") {
        const expectedUserId = getPasswordRecoveryUserId();
        if (!session?.user.id || session.user.id !== expectedUserId) {
          clearPasswordRecoveryMarker();
          setRecoveryUserId(null);
          setPageState("invalid");
        }
      }
    });

    void verifyStoredRecoverySession();
    return () => {
      disposed = true;
      data.subscription.unsubscribe();
    };
  }, []);

  async function updatePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || pageState !== "ready") return;

    const parsed = passwordSchema.safeParse({ password, confirmation });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check your password and try again.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const expectedUserId = getPasswordRecoveryUserId();
      const { data, error: sessionError } = await supabase.auth.getUser();
      if (
        !recoveryUserId ||
        expectedUserId !== recoveryUserId ||
        sessionError ||
        !data.user ||
        data.user.id !== recoveryUserId
      ) {
        clearPasswordRecoveryMarker();
        setRecoveryUserId(null);
        setPageState("invalid");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });
      if (updateError) throw updateError;

      clearPasswordRecoveryMarker();
      setPassword("");
      setConfirmation("");
      setPageState("success");
      await supabase.auth.signOut({ scope: "local" });
    } catch {
      setError("We couldn't update your password. Request a new reset link and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-sm">
        {pageState === "checking" && (
          <p role="status" aria-live="polite" className="text-sm text-muted-foreground">
            Checking your password reset link…
          </p>
        )}

        {pageState === "invalid" && (
          <>
            <h1 className="font-serif text-3xl font-semibold">Reset link unavailable</h1>
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              This reset link is invalid, expired, or has already been used. Request a new link to
              continue.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/forgot-password">Request a new link</Link>
            </Button>
            <p className="mt-4 text-center text-sm">
              <Link to="/auth" className="text-primary underline-offset-4 hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        )}

        {pageState === "ready" && (
          <>
            <h1 className="font-serif text-3xl font-semibold">Choose a new password</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Use at least 12 characters. You’ll need to sign in again after updating it.
            </p>
            <form className="mt-6 space-y-4" onSubmit={updatePassword}>
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={password}
                  disabled={submitting}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm new password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={12}
                  maxLength={72}
                  value={confirmation}
                  disabled={submitting}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
              {error && (
                <p role="alert" aria-live="polite" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Updating password…" : "Update password"}
              </Button>
            </form>
          </>
        )}

        {pageState === "success" && (
          <>
            <h1 className="font-serif text-3xl font-semibold">Password updated</h1>
            <p role="status" className="mt-2 text-sm text-muted-foreground">
              Your password has been changed. Sign in with your new password to continue.
            </p>
            <Button asChild className="mt-6 w-full">
              <Link to="/auth">Back to sign in</Link>
            </Button>
          </>
        )}
      </section>
    </main>
  );
}
