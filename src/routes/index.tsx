import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { Leaf, ShieldCheck, Sparkles, Camera, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { FadeIn, Stagger, StaggerItem, GlassCard } from "@/components/motion";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "LeafScan — AI Crop Disease Detection for Farmers",
      "Snap a leaf photo and get an instant AI diagnosis with organic and chemical treatment plans, weather risk and soil insights.",
    ),
  ssr: false,
  beforeLoad: async () => {
    // getUser() revalidates: a stale localStorage session must not bounce
    // between "/" and the auth gate forever.
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user) throw redirect({ to: "/dashboard" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-dvh bg-background bg-mesh text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-2.5 font-serif text-xl font-semibold tracking-tight">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground ring-glow">
              <Leaf className="h-4 w-4" />
            </span>
            <span className="truncate">LeafScan</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link to="/auth">
              <Button variant="ghost" className="rounded-full">
                Sign in
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="rounded-full">Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 pb-24 pt-20 md:px-6 md:pt-28">
        <div className="max-w-3xl">
          <FadeIn>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/50 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered agriculture
            </div>
          </FadeIn>
          <FadeIn delay={0.08}>
            <h1 className="font-serif text-5xl font-semibold leading-[1.03] tracking-tight md:text-6xl">
              Diagnose crop disease from <span className="text-gradient">a single leaf photo.</span>
            </h1>
          </FadeIn>
          <FadeIn delay={0.16}>
            <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
              Upload a photo, pick your crop, and get an instant diagnosis with symptoms, likely
              causes, and a treatment plan — organic and chemical options included.
            </p>
          </FadeIn>
          <FadeIn delay={0.24} className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="gap-2 rounded-full px-6 ring-glow">
                <Camera className="h-4 w-4" /> Scan a leaf
              </Button>
            </Link>
            <Link to="/auth">
              <Button
                size="lg"
                variant="outline"
                className="gap-2 rounded-full border-border/60 bg-card/40 px-6 backdrop-blur-md"
              >
                Create free account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </FadeIn>
        </div>

        <Stagger className="mt-20 grid gap-5 md:grid-cols-3">
          {[
            {
              icon: Camera,
              title: "Snap & upload",
              body: "Take a clear photo of the affected leaf. That's it — no forms, no waiting.",
            },
            {
              icon: Sparkles,
              title: "AI diagnosis",
              body: "Gemini-powered vision identifies disease, severity, and confidence.",
            },
            {
              icon: ShieldCheck,
              title: "Treatment plan",
              body: "Actionable organic and chemical treatments plus prevention tips.",
            },
          ].map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <GlassCard className="h-full">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </span>
                <h2 className="mt-5 font-serif text-xl font-semibold">{title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </GlassCard>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <footer className="border-t border-border/50 py-8 text-center text-sm text-muted-foreground">
        LeafScan · Sign in to save your detection history.
      </footer>
    </div>
  );
}
