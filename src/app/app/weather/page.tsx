"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudSun, Locate, Search, Droplets, Wind, Umbrella, Info } from "lucide-react";
import { weatherApi, fieldsApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, TextInput, Badge, Skeleton, ErrorState } from "@/components/ui";
import { LineAreaChart } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function WeatherPage() {
  const [loc, setLoc] = useState<{ lat: number; lon: number; place: string } | null>(null);
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const load = useCallback(async (l: { lat: number; lon: number; place: string }) => {
    setBusy(true);
    setError(null);
    try {
      const res: any = await weatherApi.get(l.lat, l.lon, l.place);
      setData(res);
      setLoc(l);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Weather service unavailable.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const f = await fieldsApi.list();
        const withCoords = f.fields.find((x) => x.latitude != null && x.longitude != null);
        if (withCoords) {
          load({ lat: withCoords.latitude!, lon: withCoords.longitude!, place: withCoords.location ?? withCoords.name });
          return;
        }
      } catch {
        /* not fatal */
      }
      load({ lat: 28.4089, lon: 77.3178, place: "Faridabad, Haryana (default)" });
    })();
  }, [load]);

  const useBrowser = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => load({ lat: pos.coords.latitude, lon: pos.coords.longitude, place: "Your location" }),
      () => setError("Browser location was denied — search for a place instead.")
    );
  };

  const doSearch = async () => {
    if (!search.trim()) return;
    setSearching(true);
    setResults([]);
    try {
      const res = await weatherApi.geocode(search);
      setResults(res.results ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Weather Intelligence"
        title="Weather & agro-advisory"
        sub="Live data from Open-Meteo (free, no API key), converted into farm decisions — drainage, spray windows, irrigation."
        right={data && !data.live && data.ok ? <Badge tone="harvest">cached · {new Date(data.cachedAt).toLocaleTimeString()}</Badge> : undefined}
      />

      {/* location controls */}
      <Card className="mb-5 animate-rise">
        <CardBody className="flex flex-wrap items-center gap-2 py-3">
          <span className="mr-1 text-xs font-bold uppercase tracking-wide text-inksoft">Location:</span>
          {loc && <Badge tone="green">{loc.place}</Badge>}
          <Button variant="secondary" size="sm" onClick={useBrowser}>
            <Locate size={13} /> Use my location
          </Button>
          <div className="flex min-w-[220px] flex-1 gap-2">
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search city / district (India)" onKeyDown={(e) => e.key === "Enter" && doSearch()} />
            <Button variant="secondary" size="sm" onClick={doSearch} busy={searching}>
              <Search size={13} />
            </Button>
          </div>
        </CardBody>
        {results.length > 0 && (
          <div className="space-y-1 border-t border-linesoft px-5 py-3">
            {results.map((r) => (
              <button key={r.name} onClick={() => { load({ lat: r.lat, lon: r.lon, place: r.name.split(",").slice(0, 2).join(",") }); setResults([]); }} className="block w-full truncate rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-leaf/50">
                {r.name}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && <div className="mb-5"><ErrorState message={error} retry={() => loc && load(loc)} /></div>}
      {busy && !data && (
        <div className="grid gap-5 lg:grid-cols-3">
          {[0, 1, 2].map((i) => <Card key={i}><CardBody><Skeleton className="h-44 w-full" /></CardBody></Card>)}
        </div>
      )}

      {data?.ok && (
        <>
          <div className="grid gap-5 lg:grid-cols-3">
            <Card className="animate-rise">
              <CardHeader title="Right now" sub={data.place} icon={<CloudSun size={16} />} />
              <CardBody>
                <p className="font-display text-5xl font-bold">{Math.round(data.current.temperature)}°C</p>
                <p className="mt-1 text-sm font-semibold text-inksoft">{data.current.description}</p>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-husk py-2">
                    <Droplets size={14} className="mx-auto mb-1 text-sky" />
                    <p className="tabular font-bold">{data.current.humidity}%</p>
                    <p className="text-[10px] text-inkfaint">humidity</p>
                  </div>
                  <div className="rounded-lg bg-husk py-2">
                    <Umbrella size={14} className="mx-auto mb-1 text-sky" />
                    <p className="tabular font-bold">{data.current.precipitation} mm</p>
                    <p className="text-[10px] text-inkfaint">rain</p>
                  </div>
                  <div className="rounded-lg bg-husk py-2">
                    <Wind size={14} className="mx-auto mb-1 text-sky" />
                    <p className="tabular font-bold">{Math.round(data.current.wind)}</p>
                    <p className="text-[10px] text-inkfaint">km/h wind</p>
                  </div>
                </div>
                <p className="mt-3 text-[10px] text-inkfaint">Source: Open-Meteo · fetched {new Date(data.fetchedAt).toLocaleTimeString()}</p>
              </CardBody>
            </Card>

            <Card className="animate-rise-1 lg:col-span-2">
              <CardHeader title="7-day rainfall & temperature" sub="precipitation forecast (mm)" />
              <CardBody>
                <LineAreaChart
                  data={data.daily.map((d: any) => ({ label: new Date(d.date).toLocaleDateString("en-IN", { weekday: "short" }), value: d.rain }))}
                  height={190}
                  unit=""
                  color="#46708f"
                />
                <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[10px]">
                  {data.daily.map((d: any) => (
                    <div key={d.date}>
                      <p className="tabular font-bold">{Math.round(d.tmin)}–{Math.round(d.tmax)}°</p>
                      <p className="text-inkfaint">{d.rainProb}% rain</p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-2">
            <Card className="animate-rise-1">
              <CardHeader title="7-day outlook" />
              <CardBody>
                <ul className="divide-y divide-linesoft">
                  {data.daily.map((d: any) => (
                    <li key={d.date} className="flex items-center justify-between py-2 text-sm">
                      <span className="w-24 font-semibold">{new Date(d.date).toLocaleDateString("en-IN", { weekday: "long" })}</span>
                      <span className="flex-1 truncate px-3 text-xs text-inksoft">{d.description}</span>
                      <span className="tabular text-xs font-bold">{d.rain} mm</span>
                      <span className="tabular w-20 text-right text-xs text-inksoft">{Math.round(d.tmin)}–{Math.round(d.tmax)}°C</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="animate-rise-2">
              <CardHeader title="Farm advisories" sub="rule-based interpretation of the forecast" right={<Badge tone="soil">rule engine</Badge>} />
              <CardBody>
                <ul className="space-y-2.5">
                  {(data.advisories ?? []).map((a: any, i: number) => (
                    <li key={i} className={`flex gap-2.5 rounded-lg px-3.5 py-3 text-[13px] leading-relaxed ${
                      a.level === "warning" ? "bg-claysoft text-clay" : a.level === "caution" ? "bg-harvestsoft text-[#8a6112]" : "bg-sproutsoft text-leafdark"
                    }`}>
                      <Info size={15} className="mt-0.5 shrink-0" />
                      {a.text}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-[11px] text-inkfaint">Advisories are heuristic guidance, not causal guarantees.</p>
              </CardBody>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
