import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { posts, comments } from "@/db/schema";
import { currentUser, jsonError, readJson } from "@/server/route-utils";
import { ensureDemoAccount } from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureDemoAccount();
  const rows = await db
    .select({
      id: posts.id,
      author: posts.author,
      title: posts.title,
      body: posts.body,
      reports: posts.reports,
      createdAt: posts.createdAt,
      commentCount: sql<number>`count(${comments.id})::int`,
    })
    .from(posts)
    .leftJoin(comments, eq(comments.postId, posts.id))
    .groupBy(posts.id)
    .orderBy(desc(posts.createdAt))
    .limit(100);
  return Response.json({ posts: rows });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const title = String(parsed.body.title ?? "").trim();
  const body = String(parsed.body.body ?? "").trim();
  if (title.length < 5) return jsonError("Title must be at least 5 characters.");
  if (body.length < 10) return jsonError("Post body must be at least 10 characters.");
  if (title.length > 160) return jsonError("Title too long (max 160 chars).");
  const [post] = await db
    .insert(posts)
    .values({ userId: user.id, author: user.name, title, body })
    .returning();
  return Response.json({ post }, { status: 201 });
}
