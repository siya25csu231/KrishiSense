import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { currentUser, jsonError, num, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { passwordHash: _ph, ...rest } = user;
  return Response.json({ user: rest });
}

export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const b = parsed.body;

  const patch: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
  for (const key of ["name", "state", "district", "village", "language", "soilType", "preferredCrops"]) {
    if (b[key] !== undefined) {
      const v = String(b[key] ?? "").trim();
      if (key === "name" && v.length < 2) return jsonError("Name is too short.");
      (patch as Record<string, unknown>)[key] = v || null;
    }
  }
  if (b.farmSizeAcres !== undefined) {
    if (b.farmSizeAcres === null || b.farmSizeAcres === "") patch.farmSizeAcres = null;
    else {
      const r = num(b.farmSizeAcres, "Farm size", 0.1, 500);
      if (!r.ok) return jsonError(r.error);
      patch.farmSizeAcres = r.value;
    }
  }

  const rows = await db.update(users).set(patch).where(eq(users.id, user.id)).returning();
  const { passwordHash: _ph, ...rest } = rows[0];
  return Response.json({ user: rest });
}
