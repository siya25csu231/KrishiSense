import { getMarketSnapshot, findCommodity } from "@/server/services";
import { jsonError, readJson } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getMarketSnapshot());
}

export async function POST(req: Request) {
  const parsed = await readJson(req);
  if (!parsed.ok) return jsonError("Invalid JSON body");
  const commodity = String(parsed.body.commodity ?? "");
  if (!commodity) return jsonError("commodity is required.");
  const found = findCommodity(commodity);
  if (!found)
    return Response.json(
      {
        error: `No bundled market series for "${commodity}".`,
        available: getMarketSnapshot().commodities.map((c) => c.commodity),
      },
      { status: 404 }
    );
  return Response.json({
    ...found,
    source: getMarketSnapshot().source,
    note: "Latest-available bundled dataset (monthly state averages) — not a live feed. Forecast is a simple linear estimate for planning only.",
  });
}
