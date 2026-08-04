// Server-only weather fetching (Open-Meteo, no API key) + rule-based disease risk model.
import type { DiseaseRisk, RiskLevel, WeatherIntel, WeatherSnapshot } from "./weather-types";

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";

function levelOf(score: number): RiskLevel {
  if (score >= 66) return "high";
  if (score >= 35) return "moderate";
  return "low";
}

const WMO: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Heavy drizzle",
  61: "Light rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Light snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Severe thunderstorm",
};

export async function fetchWeather(lat: number, lon: number): Promise<WeatherSnapshot> {
  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
    `&daily=precipitation_sum,uv_index_max&timezone=auto&forecast_days=1`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12_000);
  let json: Record<string, unknown> = {};
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
    json = (await res.json()) as Record<string, unknown>;
  } catch (err) {
    throw new Error(
      err instanceof Error && err.name === "AbortError"
        ? "Weather service timed out. Please retry."
        : "Could not reach the weather service. Please retry.",
    );
  } finally {
    clearTimeout(t);
  }

  const cur = (json["current"] ?? {}) as Record<string, unknown>;
  const daily = (json["daily"] ?? {}) as Record<string, number[] | undefined>;
  const num = (v: unknown, fallback = 0) =>
    typeof v === "number" && Number.isFinite(v) ? v : fallback;

  let place: string | null = null;
  try {
    const g = await fetch(`${GEO_URL}?latitude=${lat}&longitude=${lon}&count=1`);
    if (g.ok) {
      const gj = (await g.json()) as {
        results?: Array<{ name?: string; country_code?: string }>;
      };
      const r = gj?.results?.[0];
      if (r?.name) place = [r.name, r.country_code].filter(Boolean).join(", ");
    }
  } catch {
    /* place is optional */
  }

  return {
    temperature: Math.round(num(cur.temperature_2m) * 10) / 10,
    humidity: Math.round(num(cur.relative_humidity_2m)),
    rainfall: Math.round(num(daily?.precipitation_sum?.[0], num(cur.precipitation)) * 10) / 10,
    wind: Math.round(num(cur.wind_speed_10m) * 10) / 10,
    uvIndex: Math.round(num(daily?.uv_index_max?.[0]) * 10) / 10,
    condition: WMO[num(cur.weather_code, -1)] ?? "Unknown",
    latitude: lat,
    longitude: lon,
    place,
    observedAt: new Date().toISOString(),
  };
}

type Rule = {
  name: string;
  crops?: string[]; // lowercase crop keys; omitted = all crops
  score: (w: WeatherSnapshot) => number;
  reason: (w: WeatherSnapshot) => string;
};

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const RULES: Rule[] = [
  {
    name: "Fungal leaf blight",
    score: (w) =>
      clamp(
        (w.humidity - 60) * 1.8 +
          (w.rainfall > 5 ? 25 : 0) +
          (w.temperature >= 18 && w.temperature <= 28 ? 20 : 0),
      ),
    reason: (w) =>
      `Humidity ${w.humidity}% with ${w.rainfall}mm rain and ${w.temperature}°C favours spore germination on wet leaves.`,
  },
  {
    name: "Powdery mildew",
    score: (w) =>
      clamp(
        (w.temperature >= 20 && w.temperature <= 30 ? 45 : 10) +
          (w.humidity >= 50 && w.humidity <= 75 ? 30 : 0) +
          (w.rainfall < 2 ? 15 : -10),
      ),
    reason: (w) =>
      `Warm ${w.temperature}°C days with moderate humidity (${w.humidity}%) and little rain suit powdery mildew.`,
  },
  {
    name: "Downy mildew",
    score: (w) =>
      clamp(
        (w.humidity > 80 ? 45 : w.humidity > 70 ? 25 : 0) +
          (w.temperature >= 12 && w.temperature <= 22 ? 30 : 5) +
          (w.rainfall > 2 ? 20 : 0),
      ),
    reason: (w) =>
      `Cool, wet air (${w.temperature}°C, ${w.humidity}% RH) keeps foliage damp overnight.`,
  },
  {
    name: "Bacterial wilt / soft rot",
    score: (w) =>
      clamp(
        (w.temperature > 28 ? 40 : 5) + (w.humidity > 75 ? 30 : 0) + (w.rainfall > 10 ? 25 : 0),
      ),
    reason: (w) =>
      `Hot (${w.temperature}°C) and waterlogged conditions spread bacteria through soil splash.`,
  },
  {
    name: "Late blight",
    crops: ["tomato", "potato"],
    score: (w) =>
      clamp(
        (w.temperature >= 10 && w.temperature <= 24 ? 40 : 0) +
          (w.humidity > 85 ? 40 : w.humidity > 75 ? 20 : 0) +
          (w.rainfall > 3 ? 20 : 0),
      ),
    reason: (w) =>
      `Classic late-blight window: ${w.temperature}°C with ${w.humidity}% humidity and recent rain.`,
  },
  {
    name: "Rice blast",
    crops: ["rice"],
    score: (w) =>
      clamp(
        (w.humidity > 85 ? 45 : 15) +
          (w.temperature >= 20 && w.temperature <= 30 ? 35 : 0) +
          (w.rainfall > 5 ? 15 : 0),
      ),
    reason: (w) => `Prolonged leaf wetness at ${w.temperature}°C strongly favours blast infection.`,
  },
  {
    name: "Wheat rust",
    crops: ["wheat"],
    score: (w) =>
      clamp(
        (w.temperature >= 15 && w.temperature <= 24 ? 40 : 5) +
          (w.humidity > 70 ? 35 : 10) +
          (w.wind > 15 ? 15 : 0),
      ),
    reason: (w) => `Mild temperatures with ${w.wind} km/h wind help rust spores travel and settle.`,
  },
  {
    name: "Heat & UV stress",
    score: (w) =>
      clamp(
        (w.temperature > 35 ? 45 : w.temperature > 30 ? 25 : 0) +
          (w.uvIndex >= 8 ? 35 : w.uvIndex >= 6 ? 18 : 0) +
          (w.rainfall < 1 ? 10 : 0),
      ),
    reason: (w) =>
      `UV index ${w.uvIndex} at ${w.temperature}°C can scorch foliage and stress young plants.`,
  },
];

function buildRecommendations(w: WeatherSnapshot, risks: DiseaseRisk[]): string[] {
  const out: string[] = [];
  const top = risks.filter((r) => r.level !== "low").map((r) => r.name);

  if (w.humidity > 80)
    out.push(
      "Humidity is high — improve canopy airflow by pruning dense growth and widen plant spacing.",
    );
  if (w.rainfall > 5)
    out.push(
      `${w.rainfall}mm of rain recorded — check drainage and avoid working in wet fields to limit disease spread.`,
    );
  if (w.rainfall < 1 && w.temperature > 30)
    out.push("Hot and dry — irrigate early morning and mulch to conserve soil moisture.");
  if (w.uvIndex >= 8)
    out.push("Very high UV — use shade netting for seedlings and avoid midday foliar sprays.");
  if (w.wind > 25)
    out.push("Strong wind — postpone spraying to prevent drift and stake tall or fruiting plants.");
  if (w.wind < 5 && w.humidity > 75)
    out.push("Still, humid air keeps leaves wet longer — water at the base, never overhead.");
  if (w.temperature < 10)
    out.push(
      "Cold conditions — protect sensitive crops with covers and reduce irrigation frequency.",
    );
  if (top.length)
    out.push(
      `Apply a preventive treatment targeting ${top.slice(0, 2).join(" and ")} before the next rain event.`,
    );
  out.push("Scan a leaf today so any early symptoms are logged with these weather conditions.");
  return out.slice(0, 6);
}

export function assessRisk(w: WeatherSnapshot, crop: string): WeatherIntel {
  const key = crop.trim().toLowerCase();
  const risks: DiseaseRisk[] = RULES.filter((r) => !r.crops || r.crops.includes(key))
    .map((r) => {
      const score = clamp(r.score(w));
      return { name: r.name, score, level: levelOf(score), reason: r.reason(w) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const overallScore = risks.length
    ? clamp(risks[0].score * 0.6 + (risks[1]?.score ?? 0) * 0.4)
    : 0;

  return {
    weather: w,
    crop,
    overall: { score: overallScore, level: levelOf(overallScore) },
    risks,
    recommendations: buildRecommendations(w, risks),
  };
}
