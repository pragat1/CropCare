import { createFileRoute } from "@tanstack/react-router";
import { pageHead } from "@/lib/seo";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import {
  Leaf,
  Sprout,
  LineChart,
  BookOpen,
  Lightbulb,
  CalendarDays,
  Brain,
  ScanLine,
} from "lucide-react";
import { Stagger, StaggerItem, FadeIn } from "@/components/motion";

export const Route = createFileRoute("/_authenticated/about")({
  head: () =>
    pageHead(
      "About LeafScan | AI Crop Health Platform",
      "How LeafScan combines AI vision, agronomy data and weather intelligence to help farmers catch crop disease early.",
    ),
  component: AboutPage,
});

const FEATURES = [
  {
    icon: ScanLine,
    title: "Disease detection",
    body: "AI-powered leaf analysis with organic and chemical treatment plans.",
  },
  {
    icon: Sprout,
    title: "Soil analysis",
    body: "Identify soil type, fertility, and recommended crops from a photo.",
  },
  {
    icon: LineChart,
    title: "Treatment tracker",
    body: "Compare before/after images to measure recovery.",
  },
  {
    icon: BookOpen,
    title: "Disease database",
    body: "Reference guide for 30+ common crop diseases.",
  },
  {
    icon: Lightbulb,
    title: "Farming tips",
    body: "Best practices for water, soil, sunlight, pests, fertilizer and harvest.",
  },
  {
    icon: CalendarDays,
    title: "Seasonal calendar",
    body: "What to plant and watch out for through the year.",
  },
  {
    icon: Brain,
    title: "Knowledge quiz",
    body: "Test your agricultural know-how and track your scores.",
  },
];

function AboutPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <FadeIn>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-brand text-primary-foreground ring-glow">
              <Leaf className="h-5 w-5" />
            </span>
            <h1 className="font-serif text-3xl font-semibold tracking-tight">
              About <span className="text-gradient">LeafScan</span>
            </h1>
          </div>
          <p className="text-muted-foreground mt-4">
            A modern crop-care companion combining AI diagnostics with practical agronomy guidance.
            Your scans and progress are private and stored securely under your account.
          </p>
        </FadeIn>

        <Stagger className="mt-8 grid gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <StaggerItem key={f.title}>
              <Card className="h-full p-6">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                    <f.icon className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="font-semibold">{f.title}</h2>
                </div>
                <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{f.body}</p>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </AppShell>
  );
}
