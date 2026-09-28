import { eq, and, asc, sql, not } from "drizzle-orm";
import { db } from "@/db";
import { posts, comments } from "@/db/schema";
import { currentUser, jsonError, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { id } = await params;
  const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (post.length === 0) return jsonError("Post not found", 404);
  const rows = await db
    .select()
    .from(comments)
    .where(eq(comments.postId, id))
    .orderBy(asc(comments.createdAt));
  return Response.json({ post: post[0], comments: rows });
}

export async function POST(req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const post = await db.select().from(posts).where(eq(posts.id, id)).limit(1);
  if (post.length === 0) return jsonError("Post not found", 404);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const body = String(parsed.body.body ?? "").trim();
  if (body.length < 2) return jsonError("Comment cannot be empty.");
  if (body.length > 1000) return jsonError("Comment too long (max 1000 chars).");
  const [comment] = await db
    .insert(comments)
    .values({ postId: id, userId: user.id, author: user.name, body })
    .returning();
  return Response.json({ comment }, { status: 201 });
}

export async function PATCH(_req: Request, { params }: Params) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const { id } = await params;
  const rows = await db
    .update(posts)
    .set({ reports: sql`${posts.reports} + 1` })
    .where(and(eq(posts.id, id), not(eq(posts.userId, user.id))))
    .returning();
  if (rows.length === 0)
    return jsonError("You cannot report your own post, or the post was not found.", 400);
  return Response.json({ ok: true, reports: rows[0].reports });
}
