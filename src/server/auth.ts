import crypto from "crypto";
import bcrypt from "bcryptjs";
import { eq, and, gt } from "drizzle-orm";
import { db } from "@/db";
import { users, sessions, fields, posts, comments, type User } from "@/db/schema";

const COOKIE = "ks_session";
const SESSION_DAYS = 30;

export const DEMO_EMAIL = "demo@krishisense.in";
export const DEMO_PASSWORD = "demo1234";

/* --------------------------- password ------------------------------ */

export function hashPassword(pw: string) {
  return bcrypt.hashSync(pw, 10);
}

export function verifyPassword(pw: string, hash: string) {
  return bcrypt.compareSync(pw, hash);
}

/* ---------------------------- sessions ----------------------------- */

export async function createSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600 * 1000);
  await db.insert(sessions).values({ token, userId, expiresAt });
  return token;
}

export async function destroySession(token: string) {
  await db.delete(sessions).where(eq(sessions.token, token));
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 3600,
  };
}

export const SESSION_COOKIE = COOKIE;

export async function getUserFromToken(
  token: string | undefined
): Promise<User | null> {
  if (!token) return null;
  const rows = await db
    .select({ user: users, expiresAt: sessions.expiresAt })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.token, token), gt(sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0]?.user ?? null;
}

/* ------------------------------ demo ------------------------------- */

let demoSeeded = false;

export async function ensureDemoAccount() {
  if (demoSeeded) return;
  const existing = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
  if (existing.length > 0) {
    demoSeeded = true;
    return;
  }
  const [demo] = await db
    .insert(users)
    .values({
      name: "Demo Farmer",
      email: DEMO_EMAIL,
      passwordHash: hashPassword(DEMO_PASSWORD),
      state: "Haryana",
      district: "Faridabad",
      village: "Mohna",
      language: "en",
      farmSizeAcres: 5,
      soilType: "Loamy",
      preferredCrops: "Wheat, Rice, Mustard",
    })
    .returning();

  await db.insert(fields).values([
    {
      userId: demo.id,
      name: "North Farm",
      areaAcres: 2.5,
      location: "Faridabad, Haryana",
      latitude: 28.4089,
      longitude: 77.3178,
      soilType: "Loamy",
      nitrogen: 82,
      phosphorus: 46,
      potassium: 41,
      ph: 6.8,
      currentCrop: "Wheat",
      previousCrop: "Rice",
      season: "Rabi",
    },
    {
      userId: demo.id,
      name: "Riverside Plot",
      areaAcres: 1.8,
      location: "Ballabgarh, Haryana",
      latitude: 28.3397,
      longitude: 77.3313,
      soilType: "Clay loam",
      nitrogen: 95,
      phosphorus: 50,
      potassium: 44,
      ph: 7.1,
      currentCrop: "Rice",
      previousCrop: "Mustard",
      season: "Kharif",
    },
  ]);

  const [p1] = await db
    .insert(posts)
    .values({
      userId: demo.id,
      author: "Demo Farmer",
      title: "Wheat sowing window in Haryana this year?",
      body: "Seeing cooler nights earlier than usual in Faridabad. Is it safe to advance paddy harvest and sow wheat by end of October? Any variety suggestions for late sowing?",
    })
    .returning();
  const [p2] = await db
    .insert(posts)
    .values({
      userId: demo.id,
      author: "Demo Farmer",
      title: "Mustard prices trending up — good rabi bet?",
      body: "Checked the Market page: mustard modal price rose over the last quarter in Gujarat/Rajasthan mandis. Anyone planning more mustard area this rabi? What spacing is working for you?",
    })
    .returning();

  await db.insert(comments).values({
    postId: p1.id,
    userId: demo.id,
    author: "KrishiSense Team",
    body: "Timely sowing (1–15 Nov) usually gives the best wheat yields in Haryana. For late sowing, short-duration varieties are recommended — confirm with your KVK. You can run the Rotation Planner to check cereal-after-cereal advisories.",
  });
  await db.insert(comments).values({
    postId: p2.id,
    userId: demo.id,
    author: "KrishiSense Team",
    body: "The Market page shows latest-available agmarknet data (not a live feed). For planning, combine the trend view with the Profit Planner's breakeven estimate before committing extra area.",
  });

  demoSeeded = true;
}
