export type CropInfo = {
  soil: string;
  season: string;
  water: string;
  fertilizer: string;
  growth: string;
  ph: string;
  spacing: string;
};
export const CROP_INFO: Record<string, CropInfo> = {
  tomato: {
    soil: "Loamy",
    season: "Spring/Summer",
    water: "High (60-80mm/week)",
    fertilizer: "Nitrogen + Potash",
    growth: "70-80 days",
    ph: "6.0-6.8",
    spacing: "45-60cm",
  },
  rice: {
    soil: "Clay",
    season: "Monsoon",
    water: "Very High (flooding)",
    fertilizer: "Nitrogen + Phosphorus",
    growth: "120-150 days",
    ph: "6.5-7.5",
    spacing: "20×15cm",
  },
  wheat: {
    soil: "Loamy",
    season: "Winter",
    water: "Medium (400-500mm)",
    fertilizer: "Nitrogen + Phosphorus",
    growth: "120-140 days",
    ph: "6.5-7.5",
    spacing: "22-25cm rows",
  },
  potato: {
    soil: "Loamy",
    season: "Spring/Autumn",
    water: "High (50-60mm/week)",
    fertilizer: "Potash + Nitrogen",
    growth: "70-90 days",
    ph: "5.2-6.5",
    spacing: "25×15cm",
  },
  corn: {
    soil: "Loamy",
    season: "Summer",
    water: "High (60mm/week)",
    fertilizer: "Nitrogen heavy",
    growth: "90-120 days",
    ph: "6.0-7.0",
    spacing: "75×20cm",
  },
  cotton: {
    soil: "Loamy/Clay",
    season: "Summer",
    water: "Medium-High",
    fertilizer: "Phosphorus + Potash",
    growth: "160-180 days",
    ph: "6.0-7.0",
    spacing: "60×45cm",
  },
  grape: {
    soil: "Loamy",
    season: "Year-round",
    water: "Medium (300-400mm)",
    fertilizer: "Potash + Nitrogen",
    growth: "3-4 years",
    ph: "6.0-7.5",
    spacing: "2-3m",
  },
  mango: {
    soil: "Sandy loam",
    season: "Spring",
    water: "Low-Medium",
    fertilizer: "Organic + Potash",
    growth: "5-7 years",
    ph: "5.5-7.5",
    spacing: "10-12m",
  },
};
export const CROP_LIST: Array<{ key: string; name: string; emoji: string }> = [
  { key: "tomato", name: "Tomato", emoji: "🍅" },
  { key: "rice", name: "Rice", emoji: "🌾" },
  { key: "wheat", name: "Wheat", emoji: "🌿" },
  { key: "potato", name: "Potato", emoji: "🥔" },
  { key: "corn", name: "Corn", emoji: "🌽" },
  { key: "cotton", name: "Cotton", emoji: "☁️" },
  { key: "grape", name: "Grape", emoji: "🍇" },
  { key: "mango", name: "Mango", emoji: "🥭" },
  { key: "apple", name: "Apple", emoji: "🍎" },
  { key: "soybean", name: "Soybean", emoji: "🌱" },
  { key: "sugarcane", name: "Sugarcane", emoji: "🎋" },
  { key: "pepper", name: "Pepper", emoji: "🫑" },
];
