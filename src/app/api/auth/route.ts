import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createSession,
  destroySession,
  getUserFromToken,
  hashPassword,
  verifyPassword,
  sessionCookieOptions,
  SESSION_COOKIE,
  ensureDemoAccount,
  DEMO_EMAIL,
  DEMO_PASSWORD,
} from "@/server/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const store = await cookies();
  const user = await getUserFromToken(store.get(SESSION_COOKIE)?.value);
  return Response.json({
    user: user ? sanitize(user) : null,
  });
}

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const action = String(body.action ?? "");
  const store = await cookies();

  if (action === "logout") {
    const token = store.get(SESSION_COOKIE)?.value;
    if (token) await destroySession(token);
    const res = NextResponse.json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  }

  if (action === "demo") {
    await ensureDemoAccount();
    return loginAs(DEMO_EMAIL, DEMO_PASSWORD);
  }

  if (action === "login") {
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (!email || !password)
      return Response.json({ error: "Email and password are required." }, { status: 400 });
    return loginAs(email, password);
  }

  if (action === "register") {
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "").trim().toLowerCase();
    const password = String(body.password ?? "");
    if (name.length < 2)
      return Response.json({ error: "Please enter your name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (password.length < 6)
      return Response.json({ error: "Password must be at least 6 characters." }, { status: 400 });
    const existing = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (existing.length > 0)
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    const [user] = await db
      .insert(users)
      .values({
        name,
        email,
        passwordHash: hashPassword(password),
        state: body.state ? String(body.state) : null,
        district: body.district ? String(body.district) : null,
        village: body.village ? String(body.village) : null,
        farmSizeAcres: body.farmSizeAcres ? Number(body.farmSizeAcres) : null,
        soilType: body.soilType ? String(body.soilType) : null,
        language: "en",
      })
      .returning();
    const token = await createSession(user.id);
    const res = NextResponse.json({ ok: true, user: sanitize(user) });
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return res;
  }

  return Response.json({ error: "Unknown action" }, { status: 400 });
}

async function loginAs(email: string, password: string) {
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  const user = rows[0];
  if (!user || !verifyPassword(password, user.passwordHash))
    return Response.json({ error: "Incorrect email or password." }, { status: 401 });
  const token = await createSession(user.id);
  const res = NextResponse.json({ ok: true, user: sanitize(user) });
  res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
  return res;
}

function sanitize(u: typeof users.$inferSelect) {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}
