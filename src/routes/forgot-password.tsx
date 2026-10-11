import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { pageHead } from "@/lib/seo";
import { supabase } from "@/integrations/supabase/client";

const emailSchema = z.string().trim().email("Enter a valid email address").max(255);

export const Route = createFileRoute("/forgot-password")({
  staticData: { sitemap: false },
  head: () => pageHead("Reset your CropCare password", "Request a password reset link."),
  ssr: false,
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "error" | "sent";
    message: string;
  } | null>(null);

  async function requestReset(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const parsedEmail = emailSchema.safeParse(email);
    if (!parsedEmail.success) {
      setFeedback({ kind: "error", message: "Enter a valid email address." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
        redirectTo: new URL("/reset-password", window.location.origin).toString(),
      });
      if (error) throw error;
      setFeedback({
        kind: "sent",
        message:
          "If an account matches that email, password reset instructions will arrive shortly.",
      });
    } catch {
      setFeedback({
        kind: "error",
        message: "We couldn't submit the request. Check your connection and try again.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-5 py-10">
      <section className="w-full max-w-sm">
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
          Back to sign in
        </Link>
        <h1 className="mt-6 font-serif text-3xl font-semibold">Forgot password?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Enter your account email and we’ll send a password reset link if it matches an account.
        </p>

        <form className="mt-6 space-y-4" onSubmit={requestReset}>
          <div className="space-y-2">
            <Label htmlFor="recovery-email">Email</Label>
            <Input
              id="recovery-email"
              type="email"
              autoComplete="email"
              required
              maxLength={255}
              value={email}
              disabled={submitting}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send reset link"}
          </Button>
          {feedback && (
            <p
              role={feedback.kind === "error" ? "alert" : "status"}
              aria-live="polite"
              className={`text-sm ${feedback.kind === "error" ? "text-destructive" : "text-muted-foreground"}`}
            >
              {feedback.message}
            </p>
          )}
        </form>
      </section>
    </main>
  );
}
