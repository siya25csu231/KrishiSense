import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { alerts, fields } from "@/db/schema";
import { currentUser, jsonError, readJson } from "@/server/route-utils";
import { getWeather, pestAlerts, getMarketSnapshot } from "@/server/services";

export const dynamic = "force-dynamic";

interface DraftAlert {
  key: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  title: string;
  message: string;
}

export async function GET() {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);

  const myFields = await db.select().from(fields).where(eq(fields.userId, user.id)).limit(1);
  const drafts: DraftAlert[] = [];
  const day = new Date().toISOString().slice(0, 10);

  const field = myFields[0];
  if (field) {
    /* weather-driven alerts */
    if (field.latitude != null && field.longitude != null) {
      const w = await getWeather(field.latitude, field.longitude, field.location ?? undefined);
      if (w.ok && w.daily) {
        const heavy = w.daily.find((d) => d.rain >= 50);
        const moderate = w.daily.find((d) => d.rain >= 15);
        const hot = w.daily.find((d) => d.tmax >= 40);
        const dryWeek = w.daily.reduce((a, d) => a + d.rain, 0) < 5;
        if (heavy)
          drafts.push({
            key: `weather:heavy:${day}`,
            severity: "critical",
            category: "weather",
            title: "Heavy rainfall alert",
            message: `${heavy.rain.toFixed(0)} mm expected on ${heavy.date} near ${field.location ?? "your field"}. Check drainage; avoid spraying and irrigation.`,
          });
        else if (moderate)
          drafts.push({
            key: `weather:rain:${day}`,
            severity: "high",
            category: "weather",
            title: "Rain expected within the week",
            message: `${moderate.rain.toFixed(0)} mm likely on ${moderate.date}. Postpone fertilizer application and skip irrigation that day.`,
          });
        if (hot)
          drafts.push({
            key: `weather:heat:${day}`,
            severity: "medium",
            category: "weather",
            title: "Heat stress watch",
            message: `Max temperature ~${hot.tmax.toFixed(0)}°C on ${hot.date}. Irrigate early morning for moisture-sensitive crops.`,
          });
        if (dryWeek)
          drafts.push({
            key: `weather:dry:${day}`,
            severity: "medium",
            category: "agronomy",
            title: "Dry week ahead",
            message: "Less than 5 mm of rain expected this week — plan irrigation rounds.",
          });
      }
    }

    /* pest risk alerts */
    if (field.currentCrop) {
      const pests = pestAlerts({
        crop: field.currentCrop,
        state: user.state ?? undefined,
        temperature: 27,
        humidity: 72,
      });
      const high = pests.items.filter((i) => i.risk === "high").slice(0, 1);
      for (const h of high) {
        drafts.push({
          key: `pest:${field.currentCrop}:${h.pest}:${day}`,
          severity: "high",
          category: "pest",
          title: `Pest watch: ${h.pest}`,
          message: `${h.reason} Symptom check: ${h.symptoms} First response: ${h.firstResponse}`,
        });
      }
    }
  }

  /* market movement alerts */
  const market = getMarketSnapshot();
  for (const c of market.commodities.slice(0, 8)) {
    if (c.change90 <= -6)
      drafts.push({
        key: `market:down:${c.commodity}:${day}`,
        severity: "medium",
        category: "market",
        title: `${c.commodity} price declining`,
        message: `${c.commodity} modal price fell ${Math.abs(c.change90)}% over ~3 months (latest ₹${c.latest.price}/qtl, ${c.bestState}). Review selling strategy.`,
      });
    else if (c.change90 >= 8)
      drafts.push({
        key: `market:up:${c.commodity}:${day}`,
        severity: "low",
        category: "market",
        title: `${c.commodity} price rising`,
        message: `${c.commodity} modal price rose ${c.change90}% over ~3 months (latest ₹${c.latest.price}/qtl). Could favour planning for next season.`,
      });
  }

  if (!field) {
    drafts.push({
      key: `onboarding:field:${day}`,
      severity: "low",
      category: "agronomy",
      title: "Add your first field",
      message: "Create a field with soil test values to unlock personalized weather, pest and market alerts.",
    });
  }

  /* upsert (dedupe by user+key) */
  for (const d of drafts) {
    const existing = await db
      .select()
      .from(alerts)
      .where(and(eq(alerts.userId, user.id), eq(alerts.key, d.key)))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(alerts).values({ userId: user.id, ...d });
    }
  }

  const rows = await db
    .select()
    .from(alerts)
    .where(eq(alerts.userId, user.id))
    .orderBy(desc(alerts.createdAt))
    .limit(40);

  const sevRank = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  rows.sort((a, b) => sevRank[a.severity as keyof typeof sevRank] - sevRank[b.severity as keyof typeof sevRank]);
  return Response.json({ alerts: rows });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return jsonError("Not authenticated", 401);
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const id = String(parsed.body.id ?? "");
  if (!id) return jsonError("id is required.");
  await db
    .update(alerts)
    .set({ dismissed: true })
    .where(and(eq(alerts.id, id), eq(alerts.userId, user.id)));
  return Response.json({ ok: true });
}
