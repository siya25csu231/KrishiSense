/* ------------------------------------------------------------------ */
/* KrishiSense AI — advisory services                                  */
/* Separation of concerns: external data (Open-Meteo, Nominatim),      */
/* bundled datasets (agmarknet prices, pest KB) and rule-based advice  */
/* live here; ML lives in ml.ts.                                       */
/* ------------------------------------------------------------------ */

import {
  loadMarketMonthly,
  loadPestKB,
  loadStateCrops,
  loadOrganicFertilizers,
  districtsOf,
} from "./datasets";
import { cropProfileOf, listCrops, type CropInput, FEATURES, FEATURE_LABELS } from "./ml";

const g = globalThis as typeof globalThis & {
  __ksCache?: Map<string, { at: number; data: unknown }>;
};
const cache: Map<string, { at: number; data: unknown }> = g.__ksCache ?? new Map();
g.__ksCache = cache;

function cached<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return Promise.resolve(hit.data as T);
  return fn().then((data) => {
    cache.set(key, { at: Date.now(), data });
    return data;
  });
}

function stale<T>(key: string): { data: T; at: number } | null {
  const hit = cache.get(key);
  return hit ? ({ data: hit.data as T, at: hit.at } as const) : null;
}

/* ----------------------------- weather ----------------------------- */

export interface WeatherBundle {
  ok: boolean;
  live: boolean;
  fetchedAt?: string;
  cachedAt?: string;
  latitude?: number;
  longitude?: number;
  place?: string;
  current?: {
    temperature: number;
    humidity: number;
    precipitation: number;
    wind: number;
    code: number;
    description: string;
  };
  daily?: {
    date: string;
    tmax: number;
    tmin: number;
    rain: number;
    rainProb: number;
    code: number;
    description: string;
  }[];
  advisories?: { level: "info" | "caution" | "warning"; text: string }[];
  error?: string;
}

const WMO: Record<number, string> = {
  0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow",
  75: "Heavy snow", 80: "Rain showers", 81: "Heavy showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Severe thunderstorm",
};

export function describeCode(code: number): string {
  return WMO[code] ?? "Mixed conditions";
}

export async function getWeather(
  lat: number,
  lon: number,
  place?: string
): Promise<WeatherBundle> {
  const key = `weather:${lat.toFixed(2)}:${lon.toFixed(2)}`;
  try {
    return await cached(key, 15 * 60 * 1000, async () => {
      const url =
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,wind_speed_10m,weather_code` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,weather_code` +
        `&forecast_days=7&timezone=auto`;
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 9000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) throw new Error(`open-meteo ${res.status}`);
      const j = await res.json();
      const bundle: WeatherBundle = {
        ok: true,
        live: true,
        fetchedAt: new Date().toISOString(),
        latitude: lat,
        longitude: lon,
        place,
        current: {
          temperature: j.current.temperature_2m,
          humidity: j.current.relative_humidity_2m,
          precipitation: j.current.precipitation,
          wind: j.current.wind_speed_10m,
          code: j.current.weather_code,
          description: describeCode(j.current.weather_code),
        },
        daily: j.daily.time.map((d: string, i: number) => ({
          date: d,
          tmax: j.daily.temperature_2m_max[i],
          tmin: j.daily.temperature_2m_min[i],
          rain: j.daily.precipitation_sum[i] ?? 0,
          rainProb: j.daily.precipitation_probability_max?.[i] ?? 0,
          code: j.daily.weather_code[i],
          description: describeCode(j.daily.weather_code[i]),
        })),
      };
      bundle.advisories = weatherAdvisories(bundle);
      return bundle;
    });
  } catch (e) {
    const hit = stale<WeatherBundle>(key);
    if (hit) {
      return {
        ...hit.data,
        live: false,
        cachedAt: new Date(hit.at).toISOString(),
        error: "Live weather unavailable — showing the most recent cached reading.",
      };
    }
    return {
      ok: false,
      live: false,
      error:
        "Weather service is temporarily unavailable. Your saved field data is unaffected — try again in a moment.",
    };
  }
}

function weatherAdvisories(w: WeatherBundle) {
  const out: { level: "info" | "caution" | "warning"; text: string }[] = [];
  if (!w.daily) return out;
  const next24 = w.daily[0];
  if (next24 && next24.rain >= 50)
    out.push({
      level: "warning",
      text: `Heavy rainfall expected today (~${next24.rain.toFixed(0)} mm). Ensure field drainage and postpone spraying.`,
    });
  else if (next24 && next24.rain >= 15)
    out.push({
      level: "caution",
      text: `Rain likely today (~${next24.rain.toFixed(0)} mm). Skip irrigation and delay fertilizer application.`,
    });
  const weekRain = w.daily.reduce((a, d) => a + d.rain, 0);
  if (weekRain < 5)
    out.push({
      level: "caution",
      text: `Little rain expected this week (${weekRain.toFixed(1)} mm). Plan irrigation for moisture-sensitive crops.`,
    });
  const hot = w.daily.find((d) => d.tmax >= 40);
  if (hot)
    out.push({
      level: "caution",
      text: `Temperature may touch ${hot.tmax.toFixed(0)}°C on ${hot.date}. Irrigate early morning or evening.`,
    });
  const windy = w.daily.find((d) => w.current && (w.current.wind ?? 0) >= 40);
  if (windy)
    out.push({ level: "info", text: "Strong winds expected — stake tall crops and avoid spraying." });
  if (out.length === 0)
    out.push({ level: "info", text: "Conditions look favourable for routine field work this week." });
  return out;
}

/* ---------------------------- geocoding ---------------------------- */

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

export async function geocode(query: string): Promise<GeoResult[]> {
  return cached(`geo:${query.toLowerCase()}`, 24 * 3600 * 1000, async () => {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=3&q=${encodeURIComponent(query)}&countrycodes=in`;
    const res = await fetch(url, {
      headers: { "User-Agent": "KrishiSenseAI/1.0 (academic demo)" },
    });
    if (!res.ok) throw new Error(`nominatim ${res.status}`);
    return (await res.json()) as GeoResult[];
  });
}

/* ------------------------------ market ----------------------------- */

export interface MarketSeriesPoint {
  label: string;
  year: number;
  month: number;
  price: number;
}

export interface MarketCommodity {
  commodity: string;
  points: MarketSeriesPoint[];
  latest: MarketSeriesPoint;
  change30: number; // % vs ~1 month prior
  change90: number;
  trend: "up" | "down" | "flat";
  slopePerMonth: number;
  forecast: { label: string; price: number }[];
  bestState: string;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function getMarketSnapshot(): {
  commodities: MarketCommodity[];
  source: string;
  asOf: string;
} {
  const rows = loadMarketMonthly();
  const byCommodity = new Map<string, typeof rows>();
  for (const r of rows) {
    const arr = byCommodity.get(r.commodity) ?? [];
    arr.push(r);
    byCommodity.set(r.commodity, arr);
  }
  const commodities: MarketCommodity[] = [];
  for (const [commodity, rs] of byCommodity) {
    /* national monthly average */
    const byMonth = new Map<string, { sum: number; n: number; y: number; m: number }>();
    const stateCount = new Map<string, number>();
    for (const r of rs) {
      const k = `${r.year}-${r.month}`;
      const e = byMonth.get(k) ?? { sum: 0, n: 0, y: r.year, m: r.month };
      e.sum += r.price;
      e.n += 1;
      byMonth.set(k, e);
      stateCount.set(r.state, (stateCount.get(r.state) ?? 0) + 1);
    }
    const points = [...byMonth.entries()]
      .map(([k, e]) => ({
        label: `${MONTHS[e.m - 1]} ${String(e.y).slice(2)}`,
        year: e.y,
        month: e.m,
        price: Math.round(e.sum / e.n),
      }))
      .sort((a, b) => a.year - b.year || a.month - b.month);
    if (points.length < 3) continue;
    /* linear regression over month index */
    const n = points.length;
    const xs = points.map((_, i) => i);
    const xbar = xs.reduce((a, b) => a + b, 0) / n;
    const ybar = points.reduce((a, p) => a + p.price, 0) / n;
    let num = 0;
    let den = 0;
    for (let i = 0; i < n; i++) {
      num += (xs[i] - xbar) * (points[i].price - ybar);
      den += (xs[i] - xbar) ** 2;
    }
    const slope = den ? num / den : 0;
    const intercept = ybar - slope * xbar;
    const latest = points[n - 1];
    const prev1 = points[Math.max(0, n - 2)];
    const prev3 = points[Math.max(0, n - 4)];
    const forecast = [1, 2, 3].map((h) => ({
      label: `+${h} mo`,
      price: Math.max(0, Math.round(intercept + slope * (n - 1 + h))),
    }));
    const bestState = [...stateCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
    commodities.push({
      commodity,
      points,
      latest,
      change30: pctChange(latest.price, prev1.price),
      change90: pctChange(latest.price, prev3.price),
      trend: Math.abs(slope) < ybar * 0.005 ? "flat" : slope > 0 ? "up" : "down",
      slopePerMonth: Math.round(slope),
      forecast,
      bestState,
    });
  }
  commodities.sort((a, b) => b.latest.price * b.points.length - a.latest.price * a.points.length);
  const lastDate = commodities.reduce(
    (acc, c) => Math.max(acc, c.latest.year * 100 + c.latest.month),
    0
  );
  return {
    commodities,
    source:
      "agmarknet India historical prices 2024–25 (bundled dataset, monthly state averages). Not a live feed.",
    asOf: `${MONTHS[(lastDate % 100) - 1]} ${Math.floor(lastDate / 100)}`,
  };
}

function pctChange(now: number, before: number) {
  return before ? Math.round(((now - before) / before) * 1000) / 10 : 0;
}

export function findCommodity(name: string): MarketCommodity | undefined {
  const snap = getMarketSnapshot();
  const q = name.toLowerCase();
  return snap.commodities.find(
    (c) => c.commodity.toLowerCase() === q || c.commodity.toLowerCase().includes(q) || q.includes(c.commodity.toLowerCase())
  );
}

/* ------------------------------- yield ----------------------------- */

/* Reference yields (t/ha) compiled from public Indian agricultural
   statistics — approximate averages, labelled as reference values.   */
const REFERENCE_YIELD: Record<string, { base: number; lo: number; hi: number; note: string }> = {
  rice: { base: 2.8, lo: 1.9, hi: 4.0, note: "National average ~2.8 t/ha; irrigated Punjab/Haryana can exceed 4 t/ha" },
  wheat: { base: 3.4, lo: 2.4, hi: 4.6, note: "National average ~3.4 t/ha" },
  maize: { base: 3.1, lo: 2.0, hi: 4.5, note: "National average ~3.1 t/ha" },
  cotton: { base: 0.5, lo: 0.3, hi: 0.8, note: "Lint yield; national average ~450 kg/ha" },
  sugarcane: { base: 70, lo: 55, hi: 85, note: "National average ~70 t/ha cane" },
  soybean: { base: 1.1, lo: 0.7, hi: 1.6, note: "National average ~1.1 t/ha" },
  groundnut: { base: 1.5, lo: 1.0, hi: 2.2, note: "National average ~1.5 t/ha pods" },
  mustard: { base: 1.3, lo: 0.9, hi: 1.8, note: "Rapeseed-mustard national average ~1.3 t/ha" },
  potato: { base: 22, lo: 16, hi: 30, note: "National average ~22 t/ha" },
  onion: { base: 18, lo: 12, hi: 25, note: "National average ~18 t/ha" },
  banana: { base: 35, lo: 25, hi: 50, note: "National average ~35 t/ha" },
  apple: { base: 9, lo: 5, hi: 14, note: "Himachal/J&K averages" },
  chickpea: { base: 1.0, lo: 0.6, hi: 1.4, note: "Gram national average ~1.0 t/ha" },
  pigeonpea: { base: 0.9, lo: 0.6, hi: 1.3, note: "Tur national average ~0.9 t/ha" },
  moong: { base: 0.8, lo: 0.5, hi: 1.1, note: "Moong national average ~0.8 t/ha" },
  jute: { base: 2.4, lo: 1.8, hi: 3.2, note: "Fibre yield" },
};

function matchRef(crop: string) {
  const q = crop.toLowerCase();
  for (const key of Object.keys(REFERENCE_YIELD)) {
    if (q.includes(key) || key.includes(q)) return REFERENCE_YIELD[key];
  }
  if (q.includes("paddy")) return REFERENCE_YIELD.rice;
  if (q.includes("gram") || q.includes("chana")) return REFERENCE_YIELD.chickpea;
  if (q.includes("tur") || q.includes("arhar")) return REFERENCE_YIELD.pigeonpea;
  return null;
}

export function estimateYield(input: {
  crop: string;
  state?: string;
  district?: string;
  season?: string;
  areaHa: number;
  agro: Partial<CropInput>;
}) {
  const ref = matchRef(input.crop);
  const profile = cropProfileOf(normalizeCrop(input.crop));
  if (!ref) {
    return {
      ok: false as const,
      error: `No reference yield available for "${input.crop}". Try one of: ${Object.keys(REFERENCE_YIELD).join(", ")}.`,
    };
  }
  let factor = 1;
  const assumptions: string[] = [];
  if (profile && input.agro.rainfall != null) {
    const z = Math.abs(input.agro.rainfall - profile.mean.rainfall) / profile.std.rainfall;
    const f = z <= 1 ? 1.06 - 0.06 * z : Math.max(0.72, 1 - 0.1 * (z - 1));
    factor *= f;
    assumptions.push(`Rainfall suitability factor ×${f.toFixed(2)} (vs learned ${profile.crop} profile)`);
  }
  if (profile && input.agro.temperature != null) {
    const z = Math.abs(input.agro.temperature - profile.mean.temperature) / profile.std.temperature;
    const f = z <= 1 ? 1.04 - 0.04 * z : Math.max(0.75, 1 - 0.08 * (z - 1));
    factor *= f;
    assumptions.push(`Temperature suitability factor ×${f.toFixed(2)}`);
  }
  if (input.agro.ph != null) {
    const d = Math.abs(input.agro.ph - 6.75);
    const f = d <= 0.75 ? 1 : Math.max(0.8, 1 - 0.06 * (d - 0.75));
    factor *= f;
    assumptions.push(`Soil pH factor ×${f.toFixed(2)} (ideal ≈ 6.0–7.5)`);
  }
  factor = Math.min(1.18, Math.max(0.55, factor));
  const tHa = ref.base * factor;
  return {
    ok: true as const,
    crop: input.crop,
    state: input.state ?? null,
    district: input.district ?? null,
    season: input.season ?? null,
    areaHa: input.areaHa,
    estimatedTonsPerHa: round2(tHa),
    estimatedTotalTons: round2(tHa * input.areaHa),
    referenceRange: `${ref.lo}–${ref.hi} t/ha`,
    referenceBase: ref.base,
    suitabilityFactor: round2(factor),
    assumptions,
    note: ref.note,
    disclaimer:
      "Estimate for planning only — actual yield depends on variety, management, weather shocks and pest pressure.",
    districtsAvailable: input.state ? districtsOf(input.state).length : 0,
  };
}

function round2(x: number) {
  return Math.round(x * 100) / 100;
}

function normalizeCrop(c: string) {
  const q = c.toLowerCase();
  const crops = listCrops();
  return (
    crops.find((x) => x.toLowerCase() === q) ??
    crops.find((x) => q.includes(x.toLowerCase()) || x.toLowerCase().includes(q)) ??
    c
  );
}

/* ---------------------------- fertilizer --------------------------- */

export interface FertilizerAdvice {
  nutrient: string;
  level: "low" | "adequate" | "high";
  detail: string;
}

export function fertilizerAdvice(input: {
  N: number;
  P: number;
  K: number;
  ph: number;
  crop: string;
}) {
  const advices: FertilizerAdvice[] = [];
  const rules: { name: string; v: number; low: number; high: number }[] = [
    { name: "Nitrogen (N)", v: input.N, low: 60, high: 100 },
    { name: "Phosphorus (P)", v: input.P, low: 35, high: 60 },
    { name: "Potassium (K)", v: input.K, low: 35, high: 55 },
  ];
  for (const r of rules) {
    const level = r.v < r.low ? "low" : r.v > r.high ? "high" : "adequate";
    advices.push({
      nutrient: r.name,
      level,
      detail:
        level === "low"
          ? `${r.name} availability appears low (${fmtN(r.v)} vs target ≥ ${r.low}). Consider a soil-test-based ${r.name.split(" ")[0].toLowerCase()} management plan for ${input.crop}.`
          : level === "high"
          ? `${r.name} is above the typical target band (> ${r.high}). Avoid additional ${r.name.split(" ")[0].toLowerCase()} this season to save cost and protect soil health.`
          : `${r.name} is within the adequate band (${r.low}–${r.high}). Maintain current practice.`,
    });
  }
  let phAdvice: string;
  if (input.ph < 5.8) phAdvice = `Soil is acidic (pH ${fmtN(input.ph)}). Consider consulting your soil-test report about liming before the next sowing.`;
  else if (input.ph > 7.8) phAdvice = `Soil is alkaline (pH ${fmtN(input.ph)}). Organic matter addition can help nutrient availability.`;
  else phAdvice = `Soil pH ${fmtN(input.ph)} is in the ideal 5.8–7.8 band for most crops.`;

  const organic = loadOrganicFertilizers();
  const lowNutrients = advices.filter((a) => a.level === "low");
  const organicOptions = organic.rules
    .filter((r) =>
      lowNutrients.some(
        (a) => a.nutrient.toLowerCase().startsWith(r.nutrient.slice(0, 1).toLowerCase()) || r.condition.toLowerCase().includes(a.nutrient.split(" ")[1]?.toLowerCase().replace(/[()]/g, "") ?? "@")
      )
    )
    .slice(0, 3);

  return {
    ruleBased: true,
    crop: input.crop,
    advices,
    phAdvice,
    organicOptions,
    note: "Rule-based advisor (not AI). Doses must come from a soil test and local agronomist — this tool only flags nutrient gaps.",
  };
}

function fmtN(x: number) {
  return Number.isInteger(x) ? String(x) : x.toFixed(1);
}

/* ------------------------------- pests ------------------------------ */

export function currentSeason(month = new Date().getMonth() + 1): "kharif" | "rabi" | "zaid" {
  if (month >= 6 && month <= 10) return "kharif";
  if (month >= 11 || month <= 2) return "rabi";
  return "zaid";
}

export function pestAlerts(input: {
  crop: string;
  state?: string;
  temperature?: number;
  humidity?: number;
  rainfallWeek?: number;
}) {
  const kb = loadPestKB();
  const crop = normalizeCrop(input.crop);
  const season = currentSeason();
  const alias = Object.entries(kb.crop_aliases ?? {}).find(
    ([, target]) => target.toLowerCase() === crop.toLowerCase()
  )?.[0];
  const libEntry =
    kb.pest_library[crop] ??
    kb.pest_library[alias ?? ""] ??
    Object.values(kb.pest_library).find((e) =>
      e.common_name.toLowerCase().includes(crop.toLowerCase())
    );

  const items: {
    pest: string;
    risk: "high" | "medium" | "low";
    symptoms: string;
    firstResponse: string;
    reason: string;
  }[] = [];

  if (libEntry) {
    for (const p of libEntry.top_pests.slice(0, 3)) {
      let risk: "high" | "medium" | "low" = "medium";
      const reasons: string[] = [`${capitalize(season)} season is active for ${crop}.`];
      const warmHumid =
        input.temperature != null && input.humidity != null &&
        input.temperature >= 20 && input.temperature <= 34 && input.humidity >= 70;
      if (warmHumid) {
        risk = "high";
        reasons.push(`Warm (${input.temperature}°C) + humid (${input.humidity}%) weather favours pest/disease cycles.`);
      } else if (input.humidity != null && input.humidity < 45) {
        risk = "low";
        reasons.push("Dry air reduces fungal pressure (sucking pests may still appear).");
      }
      if ((input.rainfallWeek ?? 0) > 60) reasons.push("Frequent rainfall keeps foliage wet — fungal conditions.");
      items.push({
        pest: p.pest,
        risk,
        symptoms: p.symptoms,
        firstResponse: p.first_response,
        reason: reasons.join(" "),
      });
    }
  }

  /* generic weather-driven risks */
  if ((input.humidity ?? 0) > 80 && (input.temperature ?? 25) >= 22) {
    items.push({
      pest: "Fungal disease conditions",
      risk: "high",
      symptoms: "Leaf spots, mildew or blight can develop rapidly in wet canopies.",
      firstResponse: "Improve drainage and aeration; avoid overhead irrigation in the evening.",
      reason: `High humidity (${input.humidity}%) with warm temperatures — classic fungal window.`,
    });
  }

  return {
    ruleBased: true,
    crop,
    season,
    basis: libEntry?.basis ?? kb.meta.important_note ?? "Curated pest knowledge base",
    kbNote: kb.meta.important_note,
    items,
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* ------------------------------ rotation ---------------------------- */

const ROTATION_FAMILIES: { family: string; crops: string[] }[] = [
  { family: "Cereals (grasses)", crops: ["rice", "wheat", "maize", "jowar", "bajra", "barley"] },
  { family: "Legumes (pulses)", crops: ["moong", "pigeonpea", "chickpea", "lentil", "soybean", "groundnut", "peas", "kidneybeans"] },
  { family: "Brassicas / oilseeds", crops: ["mustard", "rapeseed"] },
  { family: "Malvaceae (fibre)", crops: ["cotton"] },
  { family: "Tubers", crops: ["potato"] },
  { family: "Vegetables (Solanaceae)", crops: ["tomato", "chilli", "brinjal"] },
  { family: "Alliums", crops: ["onion", "garlic"] },
];

function familyOf(crop: string): string {
  const q = crop.toLowerCase();
  return ROTATION_FAMILIES.find((f) => f.crops.some((c) => q.includes(c)))?.family ?? "Other";
}

export function rotationPlan(input: { previousCrop: string; currentCrop: string; seasons?: number }) {
  const kb = loadPestKB();
  const famPrev = familyOf(input.previousCrop);
  const famCur = familyOf(input.currentCrop);
  const seasons = input.seasons ?? 4;
  const steps: { slot: string; crop: string; why: string }[] = [];
  const now = new Date();
  const year = now.getFullYear();

  const sameFamily = famPrev === famCur;
  const isCereal = famCur.includes("Cereal");
  const isLegume = famCur.includes("Legume");

  let nextPick: { crop: string; why: string };
  if (isCereal || sameFamily) {
    nextPick = {
      crop: "Moong / Pigeonpea (legume)",
      why: "A legume after cereals can contribute soil nitrogen through biological nitrogen fixation and breaks cereal pest cycles.",
    };
  } else if (isLegume) {
    nextPick = {
      crop: "Wheat / Maize (cereal)",
      why: "Cereals use the nitrogen left by legumes efficiently and diversify market risk.",
    };
  } else {
    nextPick = {
      crop: "Mustard (oilseed)",
      why: "Oilseeds fit low-input windows and help break disease cycles of vegetable families.",
    };
  }

  const seasonOrder: { name: string; sownIn: string }[] = [
    { name: "Kharif", sownIn: "Jun–Jul" },
    { name: "Rabi", sownIn: "Oct–Dec" },
  ];
  let slotYear = year;
  let idx = now.getMonth() >= 5 && now.getMonth() <= 10 ? 1 : 0; // next sowing window
  if (now.getMonth() > 10 || now.getMonth() < 5) idx = 1;
  if (now.getMonth() >= 2 && now.getMonth() <= 4) idx = 0; // zaid-ish → kharif next
  const crops = [input.currentCrop, nextPick.crop, isLegume ? "Maize (cereal)" : "Chickpea (legume)", "Green manure / mustard"];
  for (let i = 0; i < seasons; i++) {
    const s = seasonOrder[idx % 2];
    steps.push({
      slot: `${slotYear} ${s.name} (sow ${s.sownIn})`,
      crop: crops[i % crops.length],
      why:
        i === 0
          ? "Current crop."
          : i % 2 === 1
          ? nextPick.why
          : "Alternating families keeps pest and disease pressure low and spreads labour and market risk.",
    });
    idx++;
    if (idx % 2 === 0) slotYear++;
  }

  return {
    ruleBased: true,
    previousCrop: input.previousCrop,
    currentCrop: input.currentCrop,
    currentFamily: famCur,
    warning: sameFamily
      ? `Previous and current crop belong to the same family (${famCur}). Repeating families tends to build up shared pests.`
      : null,
    kharifCrops: kb.season_crops.kharif ?? [],
    rabiCrops: kb.season_crops.rabi ?? [],
    plan: steps,
    note: "Suggested sequence for planning — verify variety and sowing windows with your district agriculture office.",
  };
}

/* ------------------------------- profit ----------------------------- */

export function profitPlan(input: {
  crop: string;
  areaAcres: number;
  expectedYieldTons: number;
  pricePerQuintal: number;
  seedCost: number;
  fertilizerCost: number;
  irrigationCost: number;
  labourCost: number;
  otherCost: number;
}) {
  const revenue = input.expectedYieldTons * 10 * input.pricePerQuintal; // 1 ton = 10 quintal
  const totalCost =
    input.seedCost + input.fertilizerCost + input.irrigationCost + input.labourCost + input.otherCost;
  const profit = revenue - totalCost;
  const perAcre = input.areaAcres > 0 ? profit / input.areaAcres : profit;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const market = findCommodity(input.crop);
  return {
    estimate: true,
    crop: input.crop,
    revenue: Math.round(revenue),
    costs: {
      seed: input.seedCost,
      fertilizer: input.fertilizerCost,
      irrigation: input.irrigationCost,
      labour: input.labourCost,
      other: input.otherCost,
      total: Math.round(totalCost),
    },
    profit: Math.round(profit),
    profitPerAcre: Math.round(perAcre),
    marginPct: Math.round(margin * 10) / 10,
    marketContext: market
      ? `Latest available market price for ${market.commodity}: ₹${market.latest.price}/qtl (${market.bestState}, ${market.latest.label}). Trend: ${market.trend}.`
      : null,
    breakevenYieldTons:
      input.pricePerQuintal > 0 ? round2(totalCost / (10 * input.pricePerQuintal)) : null,
    disclaimer:
      "All figures are estimates based on your inputs. Market prices and yields vary — treat this as planning support, not a financial guarantee.",
  };
}

/* ---------------------------- disease scan --------------------------- */

export interface LeafStats {
  greenFrac: number;
  yellowFrac: number;
  brownFrac: number;
  darkFrac: number;
  avgSaturation: number;
  avgBrightness: number;
  hueSpread: number;
  spotScore: number; // 0..1 variance of non-green pixels
  selectedCrop?: string;
}

interface DiseaseClass {
  key: string;
  crop: string;
  disease: string;
  healthy?: boolean;
  symptoms: string;
  cause: string;
  prevention: string;
  management: string;
  sig: { green: number; yellow: number; brown: number; dark: number; sat: number; spot: number };
}

const DISEASE_CLASSES: DiseaseClass[] = [
  {
    key: "healthy", crop: "Most crops", disease: "Healthy leaf", healthy: true,
    symptoms: "Uniform green colour, no visible lesions or discolouration.",
    cause: "No disease signature detected above threshold.",
    prevention: "Continue routine monitoring, balanced nutrition and field hygiene.",
    management: "No action needed. Re-scan if symptoms appear.",
    sig: { green: 0.75, yellow: 0.08, brown: 0.04, dark: 0.1, sat: 0.5, spot: 0.15 },
  },
  {
    key: "early_blight", crop: "Tomato / Potato", disease: "Early blight (Alternaria)",
    symptoms: "Dark concentric 'target-board' spots on older leaves, yellow halo around lesions.",
    cause: "Alternaria solani fungus — favoured by warm humid weather and wet foliage.",
    prevention: "Crop rotation, avoid overhead irrigation, remove infected debris.",
    management: "Consult local agricultural authorities / agronomists for product-specific treatment.",
    sig: { green: 0.45, yellow: 0.2, brown: 0.25, dark: 0.1, sat: 0.4, spot: 0.6 },
  },
  {
    key: "late_blight", crop: "Tomato / Potato", disease: "Late blight (Phytophthora)",
    symptoms: "Water-soaked dark patches that spread quickly; white mould underside of leaves.",
    cause: "Phytophthora infestans — explosive in cool wet conditions.",
    prevention: "Resistant varieties, wide spacing, good drainage.",
    management: "This is a fast-moving disease — contact your Krishi Vigyan Kendra immediately.",
    sig: { green: 0.3, yellow: 0.12, brown: 0.33, dark: 0.25, sat: 0.35, spot: 0.7 },
  },
  {
    key: "leaf_rust", crop: "Wheat / Cereals", disease: "Leaf rust",
    symptoms: "Orange-brown powdery pustules scattered on leaf blades.",
    cause: "Puccinia fungi — spread by wind, favoured by humid mornings.",
    prevention: "Timely sowing, resistant varieties, avoid excess nitrogen.",
    management: "Consult agronomist for approved fungicide options if severity crosses economic threshold.",
    sig: { green: 0.42, yellow: 0.18, brown: 0.32, dark: 0.08, sat: 0.45, spot: 0.55 },
  },
  {
    key: "powdery_mildew", crop: "Many crops", disease: "Powdery mildew",
    symptoms: "White-grey powdery coating on leaves and stems.",
    cause: "Erysiphaceae fungi — warm dry days with humid nights.",
    prevention: "Air circulation, avoid dense canopies, sulphur-based preventive options with expert advice.",
    management: "Prune heavily coated leaves; consult agronomist for treatment options.",
    sig: { green: 0.4, yellow: 0.15, brown: 0.08, dark: 0.07, sat: 0.18, spot: 0.5 },
  },
  {
    key: "bacterial_blight", crop: "Rice / Paddy", disease: "Bacterial leaf blight",
    symptoms: "Water-soaked yellow-white stripes along leaf edges that dry to straw colour.",
    cause: "Xanthomonas oryzae — enters through wounds, spreads with irrigation water.",
    prevention: "Certified seed, balanced nitrogen, drain field if severe.",
    management: "Avoid urea top-dressing during outbreak; consult KVK for bactericide guidance.",
    sig: { green: 0.4, yellow: 0.35, brown: 0.1, dark: 0.05, sat: 0.3, spot: 0.4 },
  },
  {
    key: "mosaic_virus", crop: "Vegetables / Pulses", disease: "Mosaic virus",
    symptoms: "Light and dark green mottling, curled or stunted leaves.",
    cause: "Virus transmitted by aphids/whiteflies.",
    prevention: "Vector control, resistant varieties, rogue out infected plants early.",
    management: "No cure once infected — remove infected plants and control sap-sucking insects.",
    sig: { green: 0.6, yellow: 0.28, brown: 0.04, dark: 0.06, sat: 0.55, spot: 0.45 },
  },
  {
    key: "spot_disease", crop: "Groundnut / Soybean", disease: "Leaf spot (Cercospora)",
    symptoms: "Round brown/black spots with yellow rings on leaves.",
    cause: "Cercospora fungi in warm humid weather.",
    prevention: "Rotation, debris removal, balanced spacing.",
    management: "Consult agronomist if spots exceed 10% of canopy.",
    sig: { green: 0.5, yellow: 0.15, brown: 0.28, dark: 0.07, sat: 0.42, spot: 0.65 },
  },
];

export function detectDisease(stats: LeafStats) {
  /* Colour-signature screening model: each class has an expected colour
     histogram signature; similarity is a weighted absolute-difference
     score. This is a heuristic screening tool, clearly labelled. */
  const scored = DISEASE_CLASSES.map((c) => {
    const d =
      0.24 * Math.abs(stats.greenFrac - c.sig.green) +
      0.2 * Math.abs(stats.yellowFrac - c.sig.yellow) +
      0.2 * Math.abs(stats.brownFrac - c.sig.brown) +
      0.1 * Math.abs(stats.darkFrac - c.sig.dark) +
      0.1 * Math.abs(stats.avgSaturation - c.sig.sat) +
      0.16 * Math.abs(stats.spotScore - c.sig.spot);
    return { cls: c, similarity: Math.max(0, 1 - d * 1.35) };
  });
  if (stats.selectedCrop) {
    const q = stats.selectedCrop.toLowerCase();
    for (const s of scored) {
      if (s.cls.crop.toLowerCase().split(/[\/ ]/).some((w) => q.includes(w))) {
        s.similarity *= 1.15;
      }
    }
  }
  scored.sort((a, b) => b.similarity - a.similarity);
  const top = scored[0];
  const c = top.cls;
  const cropMatch = stats.selectedCrop && c.crop.toLowerCase().includes(stats.selectedCrop.toLowerCase());
  return {
    model: "colour-signature screening v0.9 (heuristic, rule-graded CNN stand-in)",
    detected: c.disease,
    crop: c.crop,
    healthy: !!c.healthy,
    score: round4(top.similarity),
    confidenceLabel:
      top.similarity > 0.75 ? "Strong match" : top.similarity > 0.55 ? "Moderate match" : "Weak match — verify visually",
    symptoms: c.symptoms,
    cause: c.cause,
    prevention: c.prevention,
    management: c.management,
    alternatives: scored.slice(1, 3).map((s) => ({ disease: s.cls.disease, crop: s.cls.crop, score: round4(s.similarity) })),
    cropMatched: !!cropMatch,
    disclaimer:
      "Screening aid only. Field diagnosis should be confirmed by a Krishi Vigyan Kendra / State Agricultural University. Product-specific treatment must come from qualified agronomists.",
  };
}

function round4(x: number) {
  return Math.round(x * 10000) / 10000;
}

/* ------------------------------ assistant ---------------------------- */

const ASSISTANT_KB: { intents: string[]; answer: string; link?: string }[] = [
  {
    intents: ["which crop", "what crop", "crop recommend", "best crop", "kaun si fasal", "suggest crop"],
    answer:
      "Use the Crop Recommendation module: enter your soil N-P-K, pH and local weather (temperature, humidity, rainfall). The k-NN model trained on 2,200 agro-climatic samples will rank the top 3 crops and explain why. For a quick start, create a Field and run Analyze from there.",
    link: "/app/recommend",
  },
  {
    intents: ["fertilizer", "urea", "npk", "nutrient", "khad"],
    answer:
      "The Fertilizer Guide is rule-based: it compares your soil N, P, K and pH against target bands and flags low/adequate/high status, plus organic options from the bundled lookup. Actual doses must come from a soil-test report and your local agronomist.",
    link: "/app/fertilizer",
  },
  {
    intents: ["irrigation", "water", "sinchai"],
    answer:
      "Check the Weather page for the 7-day rain forecast. As a rule of thumb: skip irrigation if >15 mm rain is expected within 24h, irrigate early morning when max temperature crosses 35°C, and prefer light frequent irrigation in sandy soils.",
    link: "/app/weather",
  },
  {
    intents: ["weather", "rain", "mausam", "barish"],
    answer:
      "The Weather page pulls live data from Open-Meteo (free, no API key) for your field location and converts it into farm advisories — drainage alerts, spray windows and irrigation guidance.",
    link: "/app/weather",
  },
  {
    intents: ["disease", "spot", "blight", "leaf", "rog"],
    answer:
      "Upload a clear photo of the affected leaf on the Disease Scan page. The colour-signature screening flags likely conditions (blight, rust, mildew, virus, or healthy) and shares prevention steps. Confirm with your KVK before treatment.",
    link: "/app/disease",
  },
  {
    intents: ["pest", "insect", "kida", "aphid", "borer"],
    answer:
      "Pest Alerts combine the bundled ICAR-based pest knowledge base (45 crops) with your weather. Warm + humid conditions raise fungal and borer risk; the alert shows symptoms and first-response steps.",
    link: "/app/alerts",
  },
  {
    intents: ["price", "market", "mandi", "bhav", "sell"],
    answer:
      "Market Insights shows monthly modal prices from the bundled agmarknet 2024–25 dataset (clearly labelled as latest-available, not live), trend direction and a simple linear estimate for the next 3 months.",
    link: "/app/market",
  },
  {
    intents: ["rotation", "rotate", "next crop"],
    answer:
      "The Rotation Planner alternates crop families (cereal → legume → oilseed) to break pest cycles and support soil nitrogen. Legume rotation can contribute nitrogen through biological nitrogen fixation.",
    link: "/app/rotation",
  },
  {
    intents: ["scheme", "subsidy", "pm-kisan", "insurance", "loan"],
    answer:
      "See the Schemes page for PM-KISAN, PMFBY crop insurance, KCC, Soil Health Card, e-NAM and more — with eligibility and official portals. Applications must be filed on the official portals.",
    link: "/app/schemes",
  },
  {
    intents: ["profit", "cost", "income", "kamai"],
    answer:
      "The Profit Planner multiplies your expected yield × market price and subtracts seed/fertilizer/irrigation/labour costs to show an estimated margin and breakeven yield. Everything is labelled as an estimate.",
    link: "/app/profit",
  },
  {
    intents: ["yield", "production", "how much"],
    answer:
      "Yield Prediction uses reference yields from public agricultural statistics, adjusted by rainfall/temperature suitability and soil pH. It outputs t/ha plus total tonnes for your area — an estimate, never a guarantee.",
    link: "/app/yield",
  },
  {
    intents: ["explain", "why", "how does it work", "model"],
    answer:
      "KrishiSense explains every crop recommendation three ways: (1) factor checks against the learned crop profile, (2) global permutation feature importance from the real model, and (3) a What-If simulator that re-ranks when you change inputs. See Model Lab for the live evaluation table.",
    link: "/app/models",
  },
];

export function assistantReply(message: string): { answer: string; intent: string; link?: string } {
  const q = message.toLowerCase();
  let best: { hit: number; entry: (typeof ASSISTANT_KB)[number] } | null = null;
  for (const entry of ASSISTANT_KB) {
    let hit = 0;
    for (const kw of entry.intents) {
      if (q.includes(kw)) hit += kw.split(" ").length;
    }
    if (hit > 0 && (!best || hit > best.hit)) best = { hit, entry };
  }
  if (best) return { answer: best.entry.answer, intent: best.entry.intents[0], link: best.entry.link };
  return {
    answer:
      "I'm the rule-based KrishiSense assistant (no external AI service required). Ask me about crop selection, fertilizer, irrigation, weather, diseases, pests, market prices, rotation, schemes, profit or yield — or use the modules in the sidebar directly.",
    intent: "fallback",
  };
}

/* ------------------------------ schemes ------------------------------ */

export const SCHEMES = [
  {
    name: "PM-KISAN",
    tagline: "₹6,000/year income support",
    description:
      "Direct income support of ₹6,000 per year in three instalments to landholding farmer families.",
    eligibility: "Landholding farmer families (subject to exclusion criteria such as income-tax payers).",
    benefits: "₹2,000 × 3 instalments per year, directly to bank account.",
    portal: "https://pmkisan.gov.in",
  },
  {
    name: "PMFBY — Pradhan Mantri Fasal Bima Yojana",
    tagline: "Crop insurance",
    description:
      "Insurance against non-preventable natural risks from pre-sowing to post-harvest, with low farmer premiums.",
    eligibility: "All farmers growing notified crops in notified areas, including share-croppers.",
    benefits: "Premium ~1.5–2% of sum insured for food/oilseed crops; claims on yield loss.",
    portal: "https://pmfby.gov.in",
  },
  {
    name: "Kisan Credit Card (KCC)",
    tagline: "Short-term farm credit",
    description: "Affordable credit for cultivation, post-harvest expenses and farm working capital.",
    eligibility: "Farmers, including tenant farmers and SHGs, via banks/cooperatives.",
    benefits: "Credit limit based on land and cropping pattern; interest subvention available.",
    portal: "https://www.myscheme.gov.in/schemes/kcc",
  },
  {
    name: "Soil Health Card",
    tagline: "Free soil testing",
    description:
      "Soil nutrient status (N, P, K, pH, micronutrients) with fertilizer recommendations every cycle.",
    eligibility: "All farmers — cards issued through state agriculture departments.",
    benefits: "Targeted fertilizer use — lower cost and better soil health.",
    portal: "https://soilhealth.dac.gov.in",
  },
  {
    name: "e-NAM",
    tagline: "National electronic market",
    description: "Online trading platform connecting APMC mandis for transparent price discovery.",
    eligibility: "Farmers and traders in integrated mandis.",
    benefits: "Wider buyer access, real-time price discovery, direct payment.",
    portal: "https://enam.gov.in",
  },
  {
    name: "RKVY-RAFTAAR",
    tagline: "Agri infrastructure & agri-business",
    description:
      "Central assistance to states for agriculture infrastructure, crop development and agri-entrepreneurship.",
    eligibility: "States/UTs and eligible agri entrepreneurs through state channels.",
    benefits: "Funding for infrastructure, value addition and startup incubation.",
    portal: "https://rkvy.nic.in",
  },
];
