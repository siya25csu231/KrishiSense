import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { fields } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const rows = await db
    .select()
    .from(fields)
    .where(eq(fields.userId, user.id))
    .orderBy(desc(fields.createdAt));
  return Response.json({ fields: rows });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;
  const name = String(b.name ?? "").trim();
  if (!name) return jsonError("Field name is required.");
  const checks: [string, unknown, number, number][] = [
    ["areaAcres", b.areaAcres ?? 1, 0.1, 500],
    ["nitrogen", b.nitrogen ?? 0, 0, 300],
    ["phosphorus", b.phosphorus ?? 0, 0, 300],
    ["potassium", b.potassium ?? 0, 0, 300],
    ["ph", b.ph ?? 7, 0, 14],
  ];
  const vals: Record<string, number> = {};
  for (const [key, v, mn, mx] of checks) {
    const r = num(v, key, mn, mx);
    if (!r.ok) return jsonError(r.error);
    vals[key] = r.value;
  }
  const [field] = await db
    .insert(fields)
    .values({
      userId: user.id,
      name,
      areaAcres: vals.areaAcres,
      location: b.location ? String(b.location) : null,
      latitude: b.latitude != null ? Number(b.latitude) : null,
      longitude: b.longitude != null ? Number(b.longitude) : null,
      soilType: b.soilType ? String(b.soilType) : null,
      nitrogen: vals.nitrogen,
      phosphorus: vals.phosphorus,
      potassium: vals.potassium,
      ph: vals.ph,
      currentCrop: b.currentCrop ? String(b.currentCrop) : null,
      previousCrop: b.previousCrop ? String(b.previousCrop) : null,
      season: b.season ? String(b.season) : null,
    })
    .returning();
  return Response.json({ field }, { status: 201 });
}
