import { getWeather, geocode } from "@/server/services";
import { jsonError, num } from "@/server/route-utils";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);

  /* action=geocode&q=... → Nominatim search (cached 24h, IN-only) */
  if (url.searchParams.get("action") === "geocode") {
    const q = url.searchParams.get("q")?.trim() ?? "";
    if (!q) return jsonError("Query is required.");
    try {
      const results = await geocode(q);
      return Response.json({
        results: results.map((r) => ({
          name: r.display_name,
          lat: Number(r.lat),
          lon: Number(r.lon),
        })),
        source: "OpenStreetMap Nominatim",
      });
    } catch {
      return Response.json(
        { results: [], error: "Location search is temporarily unavailable." },
        { status: 502 }
      );
    }
  }

  const lat = num(url.searchParams.get("lat"), "latitude", -90, 90);
  const lon = num(url.searchParams.get("lon"), "longitude", -180, 180);
  if (!lat.ok) return jsonError(lat.error);
  if (!lon.ok) return jsonError(lon.error);
  const place = url.searchParams.get("place") ?? undefined;
  const bundle = await getWeather(lat.value, lon.value, place);
  if (!bundle.ok) return Response.json(bundle, { status: 502 });
  return Response.json(bundle);
}
