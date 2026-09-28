import { db } from "@/db";
import { predictions } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";
import { detectDisease, type LeafStats } from "@/server/services";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;
  const stats = (b.stats ?? b) as Record<string, unknown>;

  type NumKey = Exclude<keyof LeafStats, "selectedCrop">;
  const bounds: [NumKey, number, number][] = [
    ["greenFrac", 0, 1],
    ["yellowFrac", 0, 1],
    ["brownFrac", 0, 1],
    ["darkFrac", 0, 1],
    ["avgSaturation", 0, 1],
    ["avgBrightness", 0, 1],
    ["hueSpread", 0, 1],
    ["spotScore", 0, 1],
  ];
  const s = {} as LeafStats;
  for (const [key, mn, mx] of bounds) {
    const r = num(stats[key], key, mn, mx);
    if (!r.ok) return jsonError(`Image analysis incomplete (${r.error}) — please re-upload a clear leaf photo.`);
    s[key] = r.value;
  }
  if (stats.selectedCrop) s.selectedCrop = String(stats.selectedCrop);

  const result = detectDisease(s);
  const user = await currentUser();
  if (user) {
    await db.insert(predictions).values({
      userId: user.id,
      kind: "disease",
      title: `Disease scan: ${result.detected}`,
      summary: `${result.crop} · ${result.confidenceLabel} (${Math.round(result.score * 100)}%)`,
      result,
    });
  }
  return Response.json(result);
}
