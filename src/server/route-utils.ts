import { cookies } from "next/headers";
import { SESSION_COOKIE, getUserFromToken } from "./auth";
import type { User } from "@/db/schema";

export async function currentUser(): Promise<User | null> {
  const store = await cookies();
  return getUserFromToken(store.get(SESSION_COOKIE)?.value);
}

export function jsonError(error: string, status = 400) {
  return Response.json({ error }, { status });
}

export function num(
  v: unknown,
  name: string,
  min: number,
  max: number
): { ok: true; value: number } | { ok: false; error: string } {
  const n = typeof v === "string" ? Number(v) : (v as number);
  if (typeof n !== "number" || Number.isNaN(n))
    return { ok: false, error: `${name} must be a number.` };
  if (n < min || n > max)
    return { ok: false, error: `${name} must be between ${min} and ${max}.` };
  return { ok: true, value: n };
}

export async function readJson(req: Request) {
  try {
    return { ok: true as const, body: (await req.json()) as Record<string, unknown> };
  } catch {
    return { ok: false as const, body: null };
  }
}
