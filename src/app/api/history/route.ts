import { desc, eq, and } from "drizzle-orm";
import { db } from "@/db";
import { predictions, savedAdvisories } from "@/db/schema";
import { currentUser, jsonError, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const url = new URL(req.url);
  if (url.searchParams.get("saved") === "1") {
    const rows = await db
      .select()
      .from(savedAdvisories)
      .where(eq(savedAdvisories.userId, user.id))
      .orderBy(desc(savedAdvisories.createdAt))
      .limit(100);
    return Response.json({ saved: rows });
  }
  const rows = await db
    .select()
    .from(predictions)
    .where(eq(predictions.userId, user.id))
    .orderBy(desc(predictions.createdAt))
    .limit(100);
  return Response.json({ history: rows });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const title = String(parsed.body.title ?? "").trim();
  const kind = String(parsed.body.kind ?? "advisory");
  if (!title) return jsonError("Title is required.");
  const [row] = await db
    .insert(savedAdvisories)
    .values({
      userId: user.id,
      title,
      kind,
      note: parsed.body.note ? String(parsed.body.note) : null,
      data: parsed.body.data ?? null,
    })
    .returning();
  return Response.json({ saved: row }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return jsonError("id is required.");
  await db
    .delete(savedAdvisories)
    .where(and(eq(savedAdvisories.id, id), eq(savedAdvisories.userId, user.id)));
  return Response.json({ ok: true });
}
