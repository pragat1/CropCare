import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Leaf, ShieldCheck, Sparkles, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/app" });
  },
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 backdrop-blur-sm bg-background/70 sticky top-0 z-40">
        <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-serif text-xl font-semibold">
            <span className="grid place-items-center w-9 h-9 rounded-lg bg-primary text-primary-foreground">
              <Leaf className="h-4 w-4" />
            </span>
            LeafScan
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
            <Link to="/auth"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground mb-6">
            <Sparkles className="h-3.5 w-3.5 text-primary" /> AI-powered agriculture
          </div>
          <h1 className="font-serif text-5xl md:text-6xl font-semibold leading-[1.05] tracking-tight">
            Diagnose crop disease from a single leaf photo.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground max-w-2xl">
            Upload a photo, pick your crop, and get an instant diagnosis with symptoms, likely causes, and a treatment plan — organic and chemical options included.
          </p>
          <div className="mt-8 flex gap-3">
            <Link to="/auth"><Button size="lg" className="gap-2"><Camera className="h-4 w-4" /> Scan a leaf</Button></Link>
            <Link to="/auth"><Button size="lg" variant="outline">Create free account</Button></Link>
          </div>
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-4">
          {[
            { icon: Camera, title: "Snap & upload", body: "Take a clear photo of the affected leaf. That's it — no forms, no waiting." },
            { icon: Sparkles, title: "AI diagnosis", body: "Gemini-powered vision identifies disease, severity, and confidence." },
            { icon: ShieldCheck, title: "Treatment plan", body: "Actionable organic and chemical treatments plus prevention tips." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-serif text-xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-sm text-muted-foreground">
        LeafScan · Sign in to save your detection history.
      </footer>
    </div>
  );
}