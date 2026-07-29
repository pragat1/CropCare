import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CloudSun } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/page-header";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WeatherPanel, useWeatherIntel } from "@/components/weather-panel";
import { CROP_LIST } from "@/lib/data/crops";

export const Route = createFileRoute("/_authenticated/weather")({
  component: WeatherPage,
  head: () => ({
    meta: [
      { title: "Weather Intelligence & Crop Disease Risk | LeafScan" },
      { name: "description", content: "Live temperature, humidity, rainfall, wind and UV for your farm, with weather-driven disease risk and preventive actions for your crop." },
      { property: "og:title", content: "Weather Intelligence & Crop Disease Risk | LeafScan" },
      { property: "og:description", content: "Local weather conditions plus predicted disease risk and prevention tips for your selected crop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
});

function WeatherPage() {
  const [crop, setCrop] = useState("Tomato");
  const weather = useWeatherIntel(crop);

  return (
    <AppShell>
      <PageHeader
        icon={CloudSun}
        eyebrow="Field conditions"
        title="Weather intelligence"
        description="Local conditions, weather-driven disease risk and preventive actions for your crop."
      />

      <div className="mt-8 max-w-xs">
        <label htmlFor="weather-crop" className="mb-2 block text-sm font-medium">Crop</label>
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger id="weather-crop"><SelectValue /></SelectTrigger>
          <SelectContent>
            {CROP_LIST.map((c) => <SelectItem key={c.key} value={c.name}>{c.emoji} {c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="mt-6">
        <WeatherPanel
          crop={crop}
          intel={weather.intel}
          isLoading={weather.isLoading}
          error={weather.error}
          asked={weather.asked}
          onRequest={weather.requestLocation}
          onRetry={weather.retry}
        />
      </div>
    </AppShell>
  );
}
