// Client-safe shared types for weather intelligence.
export type WeatherSnapshot = {
  temperature: number;      // °C
  humidity: number;         // %
  rainfall: number;         // mm (last 24h)
  wind: number;             // km/h
  uvIndex: number;
  condition: string;
  latitude: number;
  longitude: number;
  place?: string | null;
  observedAt: string;       // ISO
};

export type RiskLevel = "low" | "moderate" | "high";

export type DiseaseRisk = {
  name: string;
  level: RiskLevel;
  score: number;            // 0-100
  reason: string;
};

export type WeatherIntel = {
  weather: WeatherSnapshot;
  crop: string;
  overall: { level: RiskLevel; score: number };
  risks: DiseaseRisk[];
  recommendations: string[];
};

export const RISK_STYLES: Record<RiskLevel, string> = {
  low: "bg-success/15 text-success border-success/30",
  moderate: "bg-warning/15 text-warning border-warning/30",
  high: "bg-destructive/10 text-destructive border-destructive/30",
};
