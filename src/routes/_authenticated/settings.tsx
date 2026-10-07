import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, MapPin, Settings as SettingsIcon, Save, AlertTriangle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { FadeIn } from "@/components/motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CROP_LIST } from "@/lib/data/crops";
import { pageHead } from "@/lib/seo";
import {
  LANGUAGES,
  THEMES,
  UNITS,
  useProfile,
  useUpdateProfile,
  type ProfileUpdate,
} from "@/lib/profile";

export const Route = createFileRoute("/_authenticated/settings")({
  staticData: { sitemap: false },
  component: SettingsPage,
  head: () =>
    pageHead(
      "Settings — Profile, Farm Location & Preferences | CropCare",
      "Manage your farmer profile, farm location, language, theme, units, notification preferences and privacy choices.",
    ),
});

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <FadeIn>
      <Card className="p-6">
        <h2 className="font-serif text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 space-y-4">{children}</div>
      </Card>
    </FadeIn>
  );
}

function ToggleRow({
  id,
  label,
  hint,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 bg-card/40 p-4">
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function SettingsPage() {
  const { data: profile, isLoading, isError, error, refetch } = useProfile();
  const update = useUpdateProfile();
  const [form, setForm] = useState<ProfileUpdate>({});
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const set = <K extends keyof ProfileUpdate>(key: K, value: ProfileUpdate[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  function detectLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast.error("Location isn't supported by this browser.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        set("farm_lat", +pos.coords.latitude.toFixed(4));
        set("farm_lng", +pos.coords.longitude.toFixed(4));
        toast.success("Coordinates captured — remember to save.");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't read your location. Allow access or enter it manually.");
      },
      { timeout: 10_000, maximumAge: 600_000 },
    );
  }

  function save() {
    update.mutate(
      {
        display_name: form.display_name?.trim() || null,
        farm_place: form.farm_place?.trim() || null,
        farm_lat: form.farm_lat ?? null,
        farm_lng: form.farm_lng ?? null,
        primary_crop: form.primary_crop ?? null,
        language: form.language ?? "en",
        theme: form.theme ?? "system",
        units: form.units ?? "metric",
        notify_reminders: form.notify_reminders ?? true,
        notify_weather: form.notify_weather ?? true,
        notify_scans: form.notify_scans ?? true,
        share_analytics: form.share_analytics ?? true,
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Couldn't save settings"),
      },
    );
  }

  if (isError) {
    return (
      <AppShell>
        <Card className="mx-auto max-w-lg p-8 text-center">
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
          <h2 className="mt-3 font-serif text-xl font-semibold">Couldn’t load your settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {error instanceof Error ? error.message : "Something went wrong."}
          </p>
          <Button className="mt-4 rounded-xl" onClick={() => refetch()}>
            Try again
          </Button>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        icon={SettingsIcon}
        eyebrow="Account"
        title="Settings"
        description="Your profile, farm location and app preferences — used across weather, reminders and reports."
        actions={
          <Button className="gap-2 rounded-full" onClick={save} disabled={update.isPending}>
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Save changes
          </Button>
        }
      />

      {isLoading ? (
        <div className="mt-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <Section title="Profile" description="How CropCare greets you across the app.">
            <div>
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                className="mt-2"
                value={form.display_name ?? ""}
                onChange={(e) => set("display_name", e.target.value)}
                placeholder="e.g. Harpreet Singh"
              />
            </div>
            <div>
              <Label htmlFor="primary-crop">Primary crop</Label>
              <Select value={form.primary_crop ?? ""} onValueChange={(v) => set("primary_crop", v)}>
                <SelectTrigger id="primary-crop" className="mt-2">
                  <SelectValue placeholder="Choose a crop" />
                </SelectTrigger>
                <SelectContent>
                  {CROP_LIST.map((c) => (
                    <SelectItem key={c.key} value={c.name}>
                      {c.emoji} {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Pre-selected for weather risk and seasonal recommendations.
              </p>
            </div>
          </Section>

          <Section
            title="Farm location"
            description="Powers live weather, disease risk and local alerts without asking every visit."
          >
            <div>
              <Label htmlFor="farm-place">Place name</Label>
              <Input
                id="farm-place"
                className="mt-2"
                value={form.farm_place ?? ""}
                onChange={(e) => set("farm_place", e.target.value)}
                placeholder="e.g. Ludhiana, Punjab"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="farm-lat">Latitude</Label>
                <Input
                  id="farm-lat"
                  className="mt-2"
                  inputMode="decimal"
                  value={form.farm_lat ?? ""}
                  onChange={(e) =>
                    set("farm_lat", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
              <div>
                <Label htmlFor="farm-lng">Longitude</Label>
                <Input
                  id="farm-lng"
                  className="mt-2"
                  inputMode="decimal"
                  value={form.farm_lng ?? ""}
                  onChange={(e) =>
                    set("farm_lng", e.target.value === "" ? null : Number(e.target.value))
                  }
                />
              </div>
            </div>
            <Button
              variant="secondary"
              className="w-full gap-2 rounded-xl"
              onClick={detectLocation}
              disabled={locating}
            >
              {locating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="h-4 w-4" />
              )}
              Use my current location
            </Button>
          </Section>

          <Section title="Appearance & language" description="Applies instantly once saved.">
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={form.language ?? "en"} onValueChange={(v) => set("language", v)}>
                <SelectTrigger id="language" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="mt-2 text-xs text-muted-foreground">
                Used as the default language for the AI assistant.
              </p>
            </div>
            <div>
              <Label htmlFor="theme">Theme</Label>
              <Select value={form.theme ?? "system"} onValueChange={(v) => set("theme", v)}>
                <SelectTrigger id="theme" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="units">Units</Label>
              <Select value={form.units ?? "metric"} onValueChange={(v) => set("units", v)}>
                <SelectTrigger id="units" className="mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNITS.map((u) => (
                    <SelectItem key={u.value} value={u.value}>
                      {u.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          <Section
            title="Notifications & privacy"
            description="Choose what CropCare surfaces on your dashboard and what it stores."
          >
            <ToggleRow
              id="notify-reminders"
              label="Task reminders"
              hint="Show watering, spraying, fertilizer and harvest reminders."
              checked={form.notify_reminders ?? true}
              onChange={(v) => set("notify_reminders", v)}
            />
            <ToggleRow
              id="notify-weather"
              label="Weather risk alerts"
              hint="Highlight high disease-risk weather for your crop."
              checked={form.notify_weather ?? true}
              onChange={(v) => set("notify_weather", v)}
            />
            <ToggleRow
              id="notify-scans"
              label="Follow-up scan prompts"
              hint="Nudge you to re-scan treated crops."
              checked={form.notify_scans ?? true}
              onChange={(v) => set("notify_scans", v)}
            />
            <ToggleRow
              id="share-analytics"
              label="Include my scans in analytics"
              hint="Turn off to keep your scans out of the analytics dashboard aggregates."
              checked={form.share_analytics ?? true}
              onChange={(v) => set("share_analytics", v)}
            />
          </Section>
        </div>
      )}
    </AppShell>
  );
}
