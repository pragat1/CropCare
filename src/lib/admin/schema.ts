// Field definitions that drive the generic admin CRUD editor, plus the
// built-in library used to seed each category on first import.
import { DISEASES } from "@/lib/data/diseases";
import { TIPS } from "@/lib/data/tips";
import { SEASONS, SEASON_LIST } from "@/lib/data/seasons";
import { QUIZZES } from "@/lib/data/quizzes";
import { CROP_INFO, CROP_LIST } from "@/lib/data/crops";
import { SOIL_GUIDE } from "@/lib/data/soil-guide";

export const CATEGORIES = [
  "disease",
  "treatment",
  "quiz",
  "tip",
  "season",
  "crop",
  "soil",
] as const;
export type Category = (typeof CATEGORIES)[number];

export type FieldType = "text" | "textarea" | "number" | "list" | "select";
export type FieldDef = {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[];
  help?: string;
  required?: boolean;
};

export type ContentItem = {
  id: string;
  category: Category;
  slug: string;
  title: string;
  data: Record<string, unknown>;
  sort_order: number;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type SeedItem = {
  slug: string;
  title: string;
  data: Record<string, unknown>;
  sort_order: number;
};

export type CategoryDef = {
  key: Category;
  label: string;
  plural: string;
  description: string;
  emoji: string;
  fields: FieldDef[];
  seed: () => SeedItem[];
};

export function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 60) || "item"
  );
}

export const CATEGORY_DEFS: Record<Category, CategoryDef> = {
  disease: {
    key: "disease",
    label: "Disease",
    plural: "Diseases",
    description:
      "Crop disease entries shown in the disease library and used to ground the assistant.",
    emoji: "🦠",
    fields: [
      { key: "crop", label: "Crop", type: "text", required: true },
      { key: "emoji", label: "Emoji", type: "text" },
      { key: "type", label: "Disease type", type: "text", help: "Only enter a verified classification." },
      { key: "scientific_name", label: "Scientific name", type: "text" },
      { key: "image_url", label: "Reference image URL", type: "text", help: "Verified HTTPS photo of this disease; leave blank if unavailable." },
      { key: "severity", label: "Severity", type: "select", options: ["low", "medium", "high"] },
      { key: "confidence", label: "Typical confidence (%)", type: "number" },
      { key: "summary", label: "Summary", type: "textarea", required: true },
      { key: "symptoms", label: "Symptoms", type: "list" },
      { key: "causes", label: "Causes", type: "list" },
      { key: "organic", label: "Organic treatment", type: "list" },
      { key: "chemical", label: "Chemical treatment", type: "list" },
      { key: "preventive", label: "Prevention", type: "list" },
    ],
    seed: () =>
      DISEASES.map((d, i) => ({
        slug: `${d.crop}-${slugify(d.name)}`,
        title: d.name,
        sort_order: i,
        data: {
          crop: d.crop,
          emoji: d.emoji,
          severity: d.severity,
          confidence: d.confidence,
          summary: d.summary,
          symptoms: d.symptoms,
          causes: d.causes,
          organic: d.organic,
          chemical: d.chemical,
          preventive: d.preventive,
        },
      })),
  },
  treatment: {
    key: "treatment",
    label: "Treatment",
    plural: "Treatments",
    description: "Standalone treatment protocols with dosage, timing and safety notes.",
    emoji: "💊",
    fields: [
      { key: "type", label: "Type", type: "select", options: ["organic", "chemical", "cultural"] },
      { key: "target", label: "Target disease / pest", type: "text" },
      { key: "crop", label: "Crop", type: "text" },
      { key: "dosage", label: "Dosage", type: "text", help: "e.g. Mancozeb 75% WP @ 2.5 g/L" },
      { key: "interval", label: "Application interval", type: "text" },
      { key: "notes", label: "Notes", type: "textarea" },
      { key: "safety", label: "Safety precautions", type: "list" },
    ],
    seed: () => {
      const seen = new Set<string>();
      const out: SeedItem[] = [];
      DISEASES.forEach((d) => {
        (
          [
            ["organic", d.organic],
            ["chemical", d.chemical],
          ] as const
        ).forEach(([type, list]) => {
          list.forEach((entry) => {
            const slug = slugify(`${d.crop}-${type}-${entry}`);
            if (seen.has(slug)) return;
            seen.add(slug);
            out.push({
              slug,
              title: entry,
              sort_order: out.length,
              data: {
                type,
                target: d.name,
                crop: d.crop,
                dosage: entry,
                interval: "",
                notes: "",
                safety: [],
              },
            });
          });
        });
      });
      return out;
    },
  },
  quiz: {
    key: "quiz",
    label: "Quiz question",
    plural: "Quizzes",
    description: "Multiple-choice questions used by the farming knowledge quiz.",
    emoji: "🧠",
    fields: [
      { key: "opts", label: "Options", type: "list", required: true, help: "One option per line." },
      { key: "ans", label: "Correct option index (0-based)", type: "number", required: true },
      { key: "explanation", label: "Explanation", type: "textarea" },
    ],
    seed: () =>
      QUIZZES.map((q, i) => ({
        slug: slugify(q.q),
        title: q.q,
        sort_order: i,
        data: { opts: q.opts, ans: q.ans, explanation: q.explanation },
      })),
  },
  tip: {
    key: "tip",
    label: "Growth tip group",
    plural: "Growth tips",
    description: "Grouped farming tips shown on the tips page.",
    emoji: "💡",
    fields: [
      {
        key: "cat",
        label: "Category key",
        type: "text",
        required: true,
        help: "e.g. water, soil, pest",
      },
      { key: "icon", label: "Icon (emoji)", type: "text" },
      { key: "tips", label: "Tips", type: "list", required: true },
    ],
    seed: () =>
      TIPS.map((t, i) => ({
        slug: slugify(t.cat),
        title: t.title,
        sort_order: i,
        data: { cat: t.cat, cls: t.cls, icon: t.icon, tips: t.tips },
      })),
  },
  season: {
    key: "season",
    label: "Seasonal guide",
    plural: "Seasonal guides",
    description: "Season-by-season crop plans, tips and disease warnings.",
    emoji: "📅",
    fields: [
      {
        key: "label",
        label: "Display label",
        type: "text",
        required: true,
        help: "e.g. 🌸 Spring",
      },
      {
        key: "crops",
        label: "Recommended crops",
        type: "list",
        help: "One per line, e.g. 🍅 Tomato",
      },
      { key: "tip", label: "Season tip", type: "textarea" },
      { key: "disease", label: "Disease watch", type: "textarea" },
    ],
    seed: () =>
      SEASON_LIST.map((s, i) => {
        const season = SEASONS[s.key]!;
        return {
          slug: s.key,
          title: s.key,
          sort_order: i,
          data: {
            label: s.label,
            crops: season.crops.map((c) => `${c.e} ${c.n}`),
            tip: season.tip,
            disease: season.disease,
          },
        };
      }),
  },
  crop: {
    key: "crop",
    label: "Crop",
    plural: "Crops",
    description: "Crop reference data — soil, season, water, fertiliser and spacing.",
    emoji: "🌱",
    fields: [
      { key: "emoji", label: "Emoji", type: "text" },
      { key: "soil", label: "Preferred soil", type: "text" },
      { key: "season", label: "Season", type: "text" },
      { key: "water", label: "Water needs", type: "text" },
      { key: "fertilizer", label: "Fertiliser", type: "text" },
      { key: "growth", label: "Growth duration", type: "text" },
      { key: "ph", label: "Ideal pH", type: "text" },
      { key: "spacing", label: "Spacing", type: "text" },
    ],
    seed: () =>
      CROP_LIST.map((c, i) => {
        const info = CROP_INFO[c.key];
        return {
          slug: c.key,
          title: c.name,
          sort_order: i,
          data: { emoji: c.emoji, ...(info ?? {}) },
        };
      }),
  },
  soil: {
    key: "soil",
    label: "Soil type",
    plural: "Soil database",
    description: "Soil types with fertility, retention, suited crops and maintenance advice.",
    emoji: "🪨",
    fields: [
      { key: "summary", label: "Summary", type: "textarea", required: true },
      { key: "texture", label: "Texture", type: "text" },
      { key: "fertility", label: "Fertility", type: "text" },
      { key: "retention", label: "Water retention", type: "text" },
      { key: "crops", label: "Recommended crops", type: "list" },
      { key: "maintenance", label: "Maintenance", type: "textarea" },
      { key: "tips", label: "Tips", type: "list" },
    ],
    seed: () =>
      Object.entries(SOIL_GUIDE).map(([name, entry], i) => ({
        slug: slugify(name),
        title: name,
        sort_order: i,
        data: { ...entry },
      })),
  },
};

export function isCategory(value: string): value is Category {
  return (CATEGORIES as readonly string[]).includes(value);
}
