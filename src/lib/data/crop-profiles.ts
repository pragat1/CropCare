// General agronomic reference ranges (FAO / extension-service style guidance).
// Values are typical ranges; local varieties and conditions vary.
export type GrowthStage = { name: string; days: string; focus: string };
export type CropProfile = {
  key: string;
  name: string;
  emoji: string;
  climate: {
    temp: string;
    rainfall: string;
    humidity: string;
    sunlight: string;
    soil: string;
    ph: string;
  };
  stages: GrowthStage[];
};

export const CROP_PROFILES: CropProfile[] = [
  {
    key: "tomato",
    name: "Tomato",
    emoji: "🍅",
    climate: {
      temp: "20–27 °C day, 15–20 °C night",
      rainfall: "600–1,300 mm / season (irrigated)",
      humidity: "60–70%; high humidity favours blight",
      sunlight: "Full sun, 6–8 h",
      soil: "Well-drained loam",
      ph: "6.0–6.8",
    },
    stages: [
      { name: "Seedling", days: "0–25", focus: "Nursery hygiene; watch damping-off" },
      { name: "Vegetative", days: "25–45", focus: "Staking, balanced N; scout for early blight" },
      {
        name: "Flowering",
        days: "45–65",
        focus: "Steady watering; calcium to prevent blossom-end rot",
      },
      { name: "Fruiting", days: "65–90", focus: "Late blight risk in cool wet spells" },
      { name: "Harvest", days: "75–110", focus: "Pick at breaker stage; remove crop debris" },
    ],
  },
  {
    key: "rice",
    name: "Rice",
    emoji: "🌾",
    climate: {
      temp: "20–35 °C (optimum 25–30 °C)",
      rainfall: "1,000–2,000 mm",
      humidity: "High; prolonged leaf wetness raises blast risk",
      sunlight: "Full sun",
      soil: "Clay / clay loam that holds water",
      ph: "5.5–7.0",
    },
    stages: [
      { name: "Nursery & transplanting", days: "0–25", focus: "Healthy seedlings; seed treatment" },
      { name: "Tillering", days: "25–55", focus: "Split N doses; watch leaf blast and BLB" },
      {
        name: "Panicle initiation",
        days: "55–75",
        focus: "Maintain water; sheath blight scouting",
      },
      { name: "Flowering", days: "75–95", focus: "Neck blast risk; avoid water stress" },
      { name: "Ripening & harvest", days: "95–135", focus: "Drain field 10 days before harvest" },
    ],
  },
  {
    key: "wheat",
    name: "Wheat",
    emoji: "🌿",
    climate: {
      temp: "15–25 °C; cool winters",
      rainfall: "375–875 mm",
      humidity: "Moderate; cool humid weather favours rusts",
      sunlight: "Full sun",
      soil: "Well-drained loam / clay loam",
      ph: "6.0–7.5",
    },
    stages: [
      { name: "Germination & emergence", days: "0–15", focus: "Seed treatment; timely sowing" },
      { name: "Tillering", days: "15–45", focus: "First irrigation at crown-root stage" },
      { name: "Jointing & booting", days: "45–80", focus: "Scout for yellow / leaf rust" },
      { name: "Heading & flowering", days: "80–100", focus: "Powdery mildew and rust peak" },
      { name: "Grain fill & harvest", days: "100–140", focus: "Avoid late irrigation lodging" },
    ],
  },
  {
    key: "potato",
    name: "Potato",
    emoji: "🥔",
    climate: {
      temp: "15–20 °C; tubers form best below 21 °C",
      rainfall: "500–700 mm",
      humidity: "Cool humid nights raise late-blight risk",
      sunlight: "Full sun",
      soil: "Loose sandy loam",
      ph: "5.2–6.5",
    },
    stages: [
      { name: "Sprouting", days: "0–20", focus: "Certified disease-free seed tubers" },
      { name: "Vegetative", days: "20–40", focus: "Earthing up; early blight scouting" },
      { name: "Tuber initiation", days: "40–55", focus: "Even moisture; late blight forecasts" },
      { name: "Tuber bulking", days: "55–90", focus: "Protective sprays in blight weather" },
      { name: "Maturation & harvest", days: "90–120", focus: "Haulm cutting; cure tubers" },
    ],
  },
  {
    key: "corn",
    name: "Corn (Maize)",
    emoji: "🌽",
    climate: {
      temp: "21–30 °C",
      rainfall: "500–800 mm",
      humidity: "Moderate; humid weather favours leaf blights",
      sunlight: "Full sun",
      soil: "Deep fertile loam",
      ph: "5.8–7.0",
    },
    stages: [
      { name: "Emergence", days: "0–10", focus: "Uniform stand; seed treatment" },
      { name: "Vegetative (V-stages)", days: "10–55", focus: "Fall armyworm whorl scouting" },
      { name: "Tasseling & silking", days: "55–70", focus: "Critical water need" },
      { name: "Grain fill", days: "70–100", focus: "Leaf blight / gray leaf spot watch" },
      { name: "Maturity & harvest", days: "100–120", focus: "Harvest at black layer" },
    ],
  },
  {
    key: "cotton",
    name: "Cotton",
    emoji: "☁️",
    climate: {
      temp: "21–30 °C; frost-free",
      rainfall: "500–1,000 mm",
      humidity: "Low–moderate at boll opening",
      sunlight: "Full sun",
      soil: "Deep black / alluvial soil",
      ph: "6.0–7.5",
    },
    stages: [
      { name: "Emergence", days: "0–15", focus: "Seed treatment; thinning" },
      { name: "Squaring", days: "15–55", focus: "Whitefly control (leaf curl vector)" },
      { name: "Flowering", days: "55–90", focus: "Bollworm and leaf spot scouting" },
      { name: "Boll development", days: "90–140", focus: "Balanced potash" },
      { name: "Boll opening & picking", days: "140–180", focus: "Clean, dry picking" },
    ],
  },
  {
    key: "grape",
    name: "Grape",
    emoji: "🍇",
    climate: {
      temp: "15–35 °C; dry ripening season",
      rainfall: "500–900 mm",
      humidity: "Low; wet weather drives downy mildew",
      sunlight: "Full sun",
      soil: "Well-drained loam",
      ph: "6.0–7.5",
    },
    stages: [
      { name: "Bud break", days: "0–15", focus: "Dormant sprays; pruning hygiene" },
      { name: "Shoot growth", days: "15–45", focus: "Canopy thinning for airflow" },
      { name: "Flowering & fruit set", days: "45–70", focus: "Downy & powdery mildew peak" },
      { name: "Berry development", days: "70–110", focus: "Bunch thinning; mildew control" },
      {
        name: "Ripening & harvest",
        days: "110–150",
        focus: "Stop sprays per pre-harvest interval",
      },
    ],
  },
  {
    key: "mango",
    name: "Mango",
    emoji: "🥭",
    climate: {
      temp: "24–30 °C; dry spell before flowering",
      rainfall: "750–2,500 mm",
      humidity: "Humid flowering season favours anthracnose & mildew",
      sunlight: "Full sun",
      soil: "Deep well-drained loam",
      ph: "5.5–7.5",
    },
    stages: [
      { name: "Vegetative flush", days: "Post-harvest", focus: "Pruning; nutrient top-up" },
      { name: "Flowering", days: "Winter–spring", focus: "Powdery mildew and hopper control" },
      { name: "Fruit set", days: "2–6 weeks after bloom", focus: "Irrigation; anthracnose sprays" },
      { name: "Fruit development", days: "3–4 months", focus: "Fruit fly traps" },
      { name: "Harvest", days: "Summer", focus: "Hot-water treatment against anthracnose" },
    ],
  },
  {
    key: "banana",
    name: "Banana",
    emoji: "🍌",
    climate: {
      temp: "26–30 °C; no frost",
      rainfall: "1,200–2,500 mm",
      humidity: "High",
      sunlight: "Full sun",
      soil: "Deep, well-drained loam",
      ph: "6.0–7.5",
    },
    stages: [
      { name: "Establishment", days: "0–60", focus: "Disease-free tissue-culture suckers" },
      { name: "Vegetative", days: "60–180", focus: "Desuckering; Panama wilt checks" },
      { name: "Shooting", days: "180–270", focus: "Propping; potash" },
      { name: "Bunch development", days: "270–330", focus: "Bunch covers" },
      { name: "Harvest", days: "330–420", focus: "Remove and destroy wilted plants" },
    ],
  },
  {
    key: "sugarcane",
    name: "Sugarcane",
    emoji: "🎋",
    climate: {
      temp: "20–35 °C",
      rainfall: "1,100–1,500 mm",
      humidity: "High during growth, dry at ripening",
      sunlight: "Full sun",
      soil: "Deep loam / clay loam",
      ph: "6.5–7.5",
    },
    stages: [
      { name: "Germination", days: "0–45", focus: "Healthy, treated setts (red rot)" },
      { name: "Tillering", days: "45–120", focus: "Irrigation and N" },
      { name: "Grand growth", days: "120–270", focus: "Earthing up; scout for red rot" },
      { name: "Maturity", days: "270–365", focus: "Withhold water before harvest" },
    ],
  },
  {
    key: "apple",
    name: "Apple",
    emoji: "🍎",
    climate: {
      temp: "21–24 °C in season; winter chill needed",
      rainfall: "1,000–1,250 mm",
      humidity: "Wet springs drive scab",
      sunlight: "Full sun",
      soil: "Well-drained loam",
      ph: "5.5–6.5",
    },
    stages: [
      { name: "Dormancy", days: "Winter", focus: "Prune; clear fallen leaves (scab source)" },
      { name: "Bud break", days: "Early spring", focus: "Primary scab infection period" },
      { name: "Bloom", days: "Spring", focus: "Protective sprays in wet weather" },
      { name: "Fruit development", days: "Summer", focus: "Thinning; secondary scab" },
      { name: "Harvest", days: "Autumn", focus: "Cool storage" },
    ],
  },
  {
    key: "soybean",
    name: "Soybean",
    emoji: "🌱",
    climate: {
      temp: "20–30 °C",
      rainfall: "450–700 mm",
      humidity: "Long leaf wetness favours rust",
      sunlight: "Full sun",
      soil: "Well-drained loam",
      ph: "6.0–7.0",
    },
    stages: [
      { name: "Emergence", days: "0–10", focus: "Rhizobium seed inoculation" },
      { name: "Vegetative", days: "10–45", focus: "Weed control" },
      { name: "Flowering", days: "45–65", focus: "Rust scouting begins" },
      { name: "Pod fill", days: "65–100", focus: "Fungicide if rust detected" },
      { name: "Maturity", days: "100–120", focus: "Harvest at 13–15% moisture" },
    ],
  },
];

export function findCropProfile(key: string): CropProfile | undefined {
  const k = key.toLowerCase().trim();
  return CROP_PROFILES.find(
    (c) => c.key === k || c.name.toLowerCase() === k || c.name.toLowerCase().startsWith(k),
  );
}
