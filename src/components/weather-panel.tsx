import { useCallback, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  Sun,
  MapPin,
  Loader2,
  AlertTriangle,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getWeatherIntel } from "@/lib/weather.functions";
import { RISK_STYLES, type WeatherIntel } from "@/lib/weather-types";
import { Stagger, StaggerItem } from "@/components/motion";

const LS_KEY = "leafscan.geo";

type Coords = { lat: number; lon: number };

function readCached(): Coords | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return typeof p?.lat === "number" && typeof p?.lon === "number"
      ? { lat: p.lat, lon: p.lon }
      : null;
  } catch {
    return null;
  }
}

export function useWeatherIntel(crop: string) {
  const call = useServerFn(getWeatherIntel);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [asked, setAsked] = useState(false);

  const mutation = useMutation({
    mutationFn: async (c: Coords) =>
      call({ data: { lat: c.lat, lon: c.lon, crop } }) as Promise<WeatherIntel>,
  });

  const requestLocation = useCallback(() => {
    setGeoError(null);
    setAsked(true);
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoError("Location isn't supported by this browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const c = { lat: +pos.coords.latitude.toFixed(4), lon: +pos.coords.longitude.toFixed(4) };
        try {
          localStorage.setItem(LS_KEY, JSON.stringify(c));
        } catch {
          /* ignore */
        }
        setCoords(c);
        mutation.mutate(c);
      },
      (err) => {
        setGeoError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied. Allow location access to get weather intelligence."
            : "Couldn't determine your location. Please try again.",
        );
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60 * 1000 },
    );
  }, [mutation]);

  // Reuse a previously granted location without re-prompting.
  useEffect(() => {
    const cached = readCached();
    if (cached && !coords) {
      setCoords(cached);
      setAsked(true);
      mutation.mutate(cached);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh when the crop changes and we already have a location.
  useEffect(() => {
    if (coords) mutation.mutate(coords);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crop]);

  return {
    intel: mutation.data ?? null,
    isLoading: mutation.isPending,
    error: geoError ?? (mutation.isError ? (mutation.error as Error).message : null),
    asked,
    coords,
    requestLocation,
    retry: () => (coords ? mutation.mutate(coords) : requestLocation()),
  };
}

function Metric({ icon: Icon, label, value }: { icon: typeof Sun; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/50 bg-card/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden /> {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

export function WeatherPanel({
  crop,
  intel,
  isLoading,
  error,
  asked,
  onRequest,
  onRetry,
  compact = false,
}: {
  crop: string;
  intel: WeatherIntel | null;
  isLoading: boolean;
  error: string | null;
  asked: boolean;
  onRequest: () => void;
  onRetry: () => void;
  compact?: boolean;
}) {
  if (!asked && !intel) {
    return (
      <Card className="p-6 text-center">
        <MapPin className="mx-auto mb-2 h-6 w-6 text-primary" aria-hidden />
        <h3 className="font-medium">Weather intelligence</h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Allow location access to see live conditions and the weather-driven disease risk for your{" "}
          {crop.toLowerCase()} crop.
        </p>
        <Button className="mt-4 gap-2" onClick={onRequest}>
          <MapPin className="h-4 w-4" /> Use my location
        </Button>
      </Card>
    );
  }

  if (isLoading && !intel) {
    return (
      <Card className="p-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" aria-hidden /> Reading local weather…
      </Card>
    );
  }

  if (error && !intel) {
    return (
      <Card className="border-destructive/30 bg-destructive/5 p-5 text-sm">
        <div className="flex items-start gap-2 text-destructive">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div>
            <div className="font-medium">Weather unavailable</div>
            <p className="mt-1 text-muted-foreground">{error}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="mt-3 gap-2" onClick={onRetry}>
          <RotateCcw className="h-3.5 w-3.5" /> Try again
        </Button>
      </Card>
    );
  }

  if (!intel) return null;
  const w = intel.weather;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {w.place ?? `${w.latitude.toFixed(2)}, ${w.longitude.toFixed(2)}`}
            </div>
            <h3 className="mt-0.5 font-serif text-lg font-semibold">{w.condition}</h3>
          </div>
          <Badge variant="outline" className={`capitalize ${RISK_STYLES[intel.overall.level]}`}>
            {intel.overall.level} risk · {intel.overall.score}%
          </Badge>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <Metric icon={Thermometer} label="Temperature" value={`${w.temperature}°C`} />
          <Metric icon={Droplets} label="Humidity" value={`${w.humidity}%`} />
          <Metric icon={CloudRain} label="Rainfall 24h" value={`${w.rainfall} mm`} />
          <Metric icon={Wind} label="Wind" value={`${w.wind} km/h`} />
          <Metric icon={Sun} label="UV index" value={`${w.uvIndex}`} />
        </div>
        {isLoading && <p className="mt-3 text-xs text-muted-foreground">Refreshing…</p>}
      </Card>

      <Card className="p-5">
        <h3 className="font-medium">Disease risk for {intel.crop}</h3>
        <Stagger className="mt-3 space-y-2.5">
          {intel.risks.map((r) => (
            <StaggerItem key={r.name}>
              <div className="rounded-xl border border-border/50 bg-card/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{r.name}</span>
                  <Badge variant="outline" className={`capitalize ${RISK_STYLES[r.level]}`}>
                    {r.level} · {r.score}%
                  </Badge>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-brand"
                    style={{ width: `${r.score}%` }}
                  />
                </div>
                {!compact && <p className="mt-2 text-xs text-muted-foreground">{r.reason}</p>}
              </div>
            </StaggerItem>
          ))}
        </Stagger>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" aria-hidden />
          <h3 className="font-medium">Preventive recommendations</h3>
        </div>
        <ul className="mt-3 space-y-1.5 text-sm text-muted-foreground">
          {intel.recommendations.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
