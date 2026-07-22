import { createFileRoute } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { AppShell } from "@/components/app-shell";
import { Leaf, Sprout, LineChart, BookOpen, Lightbulb, CalendarDays, Brain, ScanLine } from "lucide-react";

export const Route = createFileRoute("/_authenticated/about")({ component: AboutPage });

const FEATURES = [
  { icon: ScanLine, title: "Disease detection", body: "AI-powered leaf analysis with organic and chemical treatment plans." },
  { icon: Sprout, title: "Soil analysis", body: "Identify soil type, fertility, and recommended crops from a photo." },
  { icon: LineChart, title: "Treatment tracker", body: "Compare before/after images to measure recovery." },
  { icon: BookOpen, title: "Disease database", body: "Reference guide for 30+ common crop diseases." },
  { icon: Lightbulb, title: "Farming tips", body: "Best practices for water, soil, sunlight, pests, fertilizer and harvest." },
  { icon: CalendarDays, title: "Seasonal calendar", body: "What to plant and watch out for through the year." },
  { icon: Brain, title: "Knowledge quiz", body: "Test your agricultural know-how and track your scores." },
];

function AboutPage() {
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-10 h-10 rounded-lg bg-primary text-primary-foreground"><Leaf className="h-5 w-5" /></span>
          <h1 className="font-serif text-3xl font-semibold">About LeafScan</h1>
        </div>
        <p className="text-muted-foreground mt-3">A modern crop-care companion combining AI diagnostics with practical agronomy guidance. Your scans and progress are private and stored securely under your account.</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {FEATURES.map(f => (
            <Card key={f.title} className="p-5">
              <div className="flex items-center gap-2"><f.icon className="h-5 w-5 text-primary" /><h2 className="font-semibold">{f.title}</h2></div>
              <p className="text-sm text-muted-foreground mt-2">{f.body}</p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}