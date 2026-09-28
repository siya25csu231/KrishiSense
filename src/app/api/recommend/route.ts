import { db } from "@/db";
import { predictions } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";
import { recommendCrop, simulateCrop, type CropInput } from "@/server/ml";

export const dynamic = "force-dynamic";

const BOUNDS: [keyof CropInput, string, number, number][] = [
  ["N", "Nitrogen", 0, 300],
  ["P", "Phosphorus", 0, 300],
  ["K", "Potassium", 0, 300],
  ["temperature", "Temperature", -10, 55],
  ["humidity", "Humidity", 0, 100],
  ["ph", "pH", 0, 14],
  ["rainfall", "Rainfall", 0, 3000],
];

async function parseInput(b: Record<string, unknown>, prefix = "") {
  const out = {} as CropInput;
  for (const [key, label, mn, mx] of BOUNDS) {
    const raw = b[key] ?? b[key.toLowerCase()] ?? b[label.toLowerCase()];
    const r = num(raw, `${prefix}${label}`, mn, mx);
    if (!r.ok) return { ok: false as const, error: r.error };
    out[key] = r.value;
  }
  return { ok: true as const, input: out };
}

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;
  const user = await currentUser();

  const base = await parseInput(b);
  if (!base.ok) return jsonError(base.error);

  if (b.whatIf) {
    if (typeof b.whatIf !== "object" || b.whatIf === null)
      return jsonError("whatIf must be an object of changed inputs");
    const changed = await parseInput({ ...b, ...(b.whatIf as Record<string, unknown>) });
    if (!changed.ok) return jsonError(changed.error);
    const result = simulateCrop(base.input, changed.input);
    if (user) {
      await db.insert(predictions).values({
        userId: user.id,
        kind: "whatif",
        title: `What-If: ${result.current.recommended_crop} → ${result.changed.recommended_crop}`,
        summary: result.narrative,
        result,
      });
    }
    return Response.json(result);
  }

  const rec = recommendCrop(base.input);
  if (user) {
    await db.insert(predictions).values({
      userId: user.id,
      kind: "crop",
      title: `Crop recommendation: ${rec.recommended_crop}`,
      summary: `Suitability ${Math.round(rec.score * 100)}% · alternatives: ${rec.alternatives
        .slice(1)
        .map((a) => `${a.crop} ${Math.round(a.score * 100)}%`)
        .join(", ")}`,
      result: { input: base.input, rec },
    });
  }
  return Response.json(rec);
}
