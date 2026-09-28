import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { fields } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const rows = await db
    .select()
    .from(fields)
    .where(and(eq(fields.id, id), eq(fields.userId, user.id)))
    .limit(1);
  if (rows.length === 0) return jsonError("Field not found", 404);
  return Response.json({ field: rows[0] });
}

export async function PUT(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;

  const patch: Partial<typeof fields.$inferInsert> = {};
  if (b.name != null) {
    const name = String(b.name).trim();
    if (!name) return jsonError("Field name is required.");
    patch.name = name;
  }
  const numeric: [keyof typeof fields.$inferInsert, string, number, number][] = [
    ["areaAcres", "areaAcres", 0.1, 500],
    ["nitrogen", "nitrogen", 0, 300],
    ["phosphorus", "phosphorus", 0, 300],
    ["potassium", "potassium", 0, 300],
    ["ph", "ph", 0, 14],
    ["latitude", "latitude", -90, 90],
    ["longitude", "longitude", -180, 180],
  ];
  for (const [col, key, mn, mx] of numeric) {
    if (b[key] != null && b[key] !== "") {
      const r = num(b[key], key, mn, mx);
      if (!r.ok) return jsonError(r.error);
      (patch as Record<string, unknown>)[col] = r.value;
    }
  }
  for (const key of ["location", "soilType", "currentCrop", "previousCrop", "season"]) {
    if (b[key] !== undefined)
      (patch as Record<string, unknown>)[key] = b[key] ? String(b[key]) : null;
  }

  const rows = await db
    .update(fields)
    .set(patch)
    .where(and(eq(fields.id, id), eq(fields.userId, user.id)))
    .returning();
  if (rows.length === 0) return jsonError("Field not found", 404);
  return Response.json({ field: rows[0] });
}

export async function DELETE(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const rows = await db
    .delete(fields)
    .where(and(eq(fields.id, id), eq(fields.userId, user.id)))
    .returning();
  if (rows.length === 0) return jsonError("Field not found", 404);
  return Response.json({ ok: true });
}
