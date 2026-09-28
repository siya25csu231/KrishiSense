import { db } from "@/db";
import { predictions } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";
import {
  estimateYield,
  fertilizerAdvice,
  pestAlerts,
  rotationPlan,
  profitPlan,
  currentSeason,
} from "@/server/services";

export const dynamic = "force-dynamic";

/* Unified advisory endpoint:
   POST /api/agro  { tool: "yield" | "fertilizer" | "pests" | "rotation" | "profit" | "season" } */

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;
  const tool = String(b.tool ?? "");
  const user = await currentUser();

  if (tool === "season") {
    return Response.json({ season: currentSeason() });
  }

  if (tool === "yield") {
    const crop = String(b.crop ?? "").trim();
    if (!crop) return jsonError("Crop is required.");
    const areaR = num(b.areaAcres ?? 1, "Area", 0.1, 500);
    if (!areaR.ok) return jsonError(areaR.error);
    const agro: Record<string, number> = {};
    for (const k of ["rainfall", "temperature", "humidity", "ph"]) {
      if (b[k] != null && b[k] !== "") {
        const r = num(b[k], k, -100, 5000);
        if (!r.ok) return jsonError(r.error);
        agro[k] = r.value;
      }
    }
    const result = estimateYield({
      crop,
      state: b.state ? String(b.state) : undefined,
      district: b.district ? String(b.district) : undefined,
      season: b.season ? String(b.season) : undefined,
      areaHa: Math.round(areaR.value * 0.404686 * 100) / 100,
      agro,
    });
    if (!result.ok) return jsonError(result.error, 422);
    if (user) {
      await db.insert(predictions).values({
        userId: user.id,
        kind: "yield",
        title: `Yield estimate: ${crop}`,
        summary: `${result.estimatedTonsPerHa} t/ha (${result.estimatedTotalTons} t on ${result.areaHa} ha)`,
        result,
      });
    }
    return Response.json(result);
  }

  if (tool === "fertilizer") {
    const checks: [string, string, number, number][] = [
      ["N", "Nitrogen", 0, 300],
      ["P", "Phosphorus", 0, 300],
      ["K", "Potassium", 0, 300],
      ["ph", "pH", 0, 14],
    ];
    const vals: Record<string, number> = {};
    for (const [key, label, mn, mx] of checks) {
      const r = num(b[key], label, mn, mx);
      if (!r.ok) return jsonError(r.error);
      vals[key] = r.value;
    }
    const crop = String(b.crop ?? "general crop");
    return Response.json(fertilizerAdvice({ ...vals, crop } as {
      N: number; P: number; K: number; ph: number; crop: string;
    }));
  }

  if (tool === "pests") {
    const crop = String(b.crop ?? "").trim();
    if (!crop) return jsonError("Crop is required.");
    const payload: Record<string, unknown> = {
      crop,
      state: b.state ? String(b.state) : undefined,
    };
    for (const k of ["temperature", "humidity", "rainfallWeek"]) {
      if (b[k] != null && b[k] !== "") {
        const r = num(b[k], k, -100, 5000);
        if (!r.ok) return jsonError(r.error);
        payload[k] = r.value;
      }
    }
    return Response.json(pestAlerts(payload as Parameters<typeof pestAlerts>[0]));
  }

  if (tool === "rotation") {
    const previousCrop = String(b.previousCrop ?? "").trim();
    const currentCrop = String(b.currentCrop ?? "").trim();
    if (!previousCrop || !currentCrop)
      return jsonError("previousCrop and currentCrop are required.");
    return Response.json(
      rotationPlan({ previousCrop, currentCrop, seasons: b.seasons ? Number(b.seasons) : 4 })
    );
  }

  if (tool === "profit") {
    const crop = String(b.crop ?? "").trim() || "Crop";
    const keys: [string, string, number, number, boolean][] = [
      ["areaAcres", "Area", 0.1, 500, true],
      ["expectedYieldTons", "Expected yield", 0, 500, false],
      ["pricePerQuintal", "Price", 0, 200000, false],
      ["seedCost", "Seed cost", 0, 10000000, false],
      ["fertilizerCost", "Fertilizer cost", 0, 10000000, false],
      ["irrigationCost", "Irrigation cost", 0, 10000000, false],
      ["labourCost", "Labour cost", 0, 10000000, false],
      ["otherCost", "Other cost", 0, 10000000, false],
    ];
    const vals: Record<string, number> = {};
    for (const [key, label, mn, mx, required] of keys) {
      const v = b[key] ?? (required ? undefined : 0);
      const r = num(v, label, mn, mx);
      if (!r.ok) return jsonError(r.error);
      vals[key] = r.value;
    }
    const result = profitPlan({ crop, ...vals } as Parameters<typeof profitPlan>[0]);
    if (user) {
      await db.insert(predictions).values({
        userId: user.id,
        kind: "profit",
        title: `Profit plan: ${crop}`,
        summary: `Est. margin ₹${result.profit.toLocaleString("en-IN")} (${result.marginPct}%)`,
        result,
      });
    }
    return Response.json(result);
  }

  return jsonError(`Unknown tool "${tool}". Use yield | fertilizer | pests | rotation | profit | season.`);
}
