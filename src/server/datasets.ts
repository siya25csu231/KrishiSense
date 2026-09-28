import fs from "fs";
import path from "path";

/* ------------------------------------------------------------------ */
/* Dataset loaders. All datasets ship from the reference repository    */
/* 7H-ANKUR/CROP-ADVISORY-SIH25010 (GPL-3.0) — see README attribution. */
/* Files are read once per process and cached.                         */
/* ------------------------------------------------------------------ */

const g = globalThis as typeof globalThis & {
  __ksDatasets?: Record<string, unknown>;
};
const cache: Record<string, unknown> = g.__ksDatasets ?? {};
g.__ksDatasets = cache;

function datasetPath(name: string) {
  return path.join(process.cwd(), "datasets", name);
}

function readText(name: string): string {
  return fs.readFileSync(datasetPath(name), "utf-8");
}

/* ---------------- crop recommendation dataset --------------------- */

export interface CropRow {
  N: number;
  P: number;
  K: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
  label: string;
}

export function loadCropDataset(): CropRow[] {
  if (cache.crop) return cache.crop as CropRow[];
  const text = readText("Crop_recommendation.csv");
  const lines = text.trim().split(/\r?\n/);
  const rows: CropRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 8) continue;
    rows.push({
      N: +p[0],
      P: +p[1],
      K: +p[2],
      temperature: +p[3],
      humidity: +p[4],
      ph: +p[5],
      rainfall: +p[6],
      label: p[7].trim(),
    });
  }
  cache.crop = rows;
  return rows;
}

/* ---------------- market price dataset (agmarknet) ---------------- */

export interface MarketMonth {
  commodity: string;
  state: string;
  year: number;
  month: number;
  price: number; // modal Rs/quintal
  observations: number;
}

export function loadMarketMonthly(): MarketMonth[] {
  if (cache.market) return cache.market as MarketMonth[];
  const text = readText("market_monthly.csv");
  const lines = text.trim().split(/\r?\n/);
  const rows: MarketMonth[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 6) continue;
    rows.push({
      commodity: p[0],
      state: p[1],
      year: +p[2],
      month: +p[3],
      price: +p[4],
      observations: +p[5],
    });
  }
  cache.market = rows;
  return rows;
}

/* ---------------- pest knowledge base ------------------------------ */

export interface PestEntry {
  pest: string;
  symptoms: string;
  first_response: string;
}

export interface PestKB {
  meta: { name: string; version: string; important_note?: string };
  season_crops: Record<string, string[]>;
  state_crop_map: Record<string, string[]>;
  pest_library: Record<string, { common_name: string; top_pests: PestEntry[]; basis?: string }>;
  crop_aliases: Record<string, string>;
}

export function loadPestKB(): PestKB {
  if (cache.pest) return cache.pest as PestKB;
  const data = JSON.parse(readText("india_crop_pest_knowledge_base_v1.json")) as PestKB;
  cache.pest = data;
  return data;
}

/* ---------------- state crop guidance ------------------------------ */

export interface StateCropGuidance {
  climate: string;
  soil_types: string[];
  major_seasons: string[];
  top_crops: { name: string; season: string; reason: string }[];
}

export function loadStateCrops(): Record<string, StateCropGuidance> {
  if (cache.stateCrops) return cache.stateCrops as Record<string, StateCropGuidance>;
  const data = JSON.parse(readText("state_crop_recommendations.json"));
  cache.stateCrops = data;
  return data;
}

/* ---------------- organic fertilizer lookup ------------------------ */

export interface OrganicRule {
  nutrient: string;
  condition: string;
  options: { name: string; how_it_helps: string; approximate_cost?: string }[];
}

export function loadOrganicFertilizers(): {
  rules: OrganicRule[];
  notes: string[];
} {
  if (cache.organic) return cache.organic as { rules: OrganicRule[]; notes: string[] };
  const raw = JSON.parse(readText("organic_fertilizer_lookup_v1.json"));
  const rules: OrganicRule[] = [];
  const ruleSrc = raw.rules ?? {};
  for (const key of Object.keys(ruleSrc)) {
    const r = ruleSrc[key];
    rules.push({
      nutrient: key,
      condition: r.condition ?? key,
      options: (r.options ?? r.organic_options ?? []).map(
        (o: Record<string, unknown>) => ({
          name: (o.name as string) ?? key,
          how_it_helps: (o.how_it_helps as string) ?? (o.benefit as string) ?? "",
          approximate_cost: (o.approximate_cost as string) ?? (o.cost as string),
        })
      ),
    });
  }
  const notes = Array.isArray(raw.safety_and_usage_notes)
    ? raw.safety_and_usage_notes
    : Object.values(raw.safety_and_usage_notes ?? {});
  cache.organic = { rules, notes };
  return cache.organic as { rules: OrganicRule[]; notes: string[] };
}

/* ---------------- yield districts ---------------------------------- */

export function loadYieldDistricts(): Record<string, string[]> {
  if (cache.yieldDistricts) return cache.yieldDistricts as Record<string, string[]>;
  const data = JSON.parse(readText("yield_state_districts.json"));
  cache.yieldDistricts = data;
  return data;
}

export function districtsOf(state: string): string[] {
  const map = loadYieldDistricts();
  const key = Object.keys(map).find(
    (k) => k.toLowerCase() === state.toLowerCase()
  );
  return key ? map[key] : [];
}
