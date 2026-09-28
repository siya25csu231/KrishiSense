"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CloudSun,
  Sprout,
  FlaskConical,
  Store,
  Wheat,
  BellRing,
  Sparkles,
  Send,
  MapPinned,
  Droplets,
  Thermometer,
  Wind,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
  Gauge as GaugeIcon,
  Bot,
} from "lucide-react";
import {
  fieldsApi,
  weatherApi,
  cropApi,
  marketApi,
  agroApi,
  historyApi,
  assistantApi,
  fmtDateTime,
  inr,
  type FieldRecord,
  type CropInputs,
  type HistoryRow,
} from "@/lib/api";
import {
  Card,
  CardHeader,
  CardBody,
  Badge,
  SeverityBadge,
  Skeleton,
  SkeletonRows,
  EmptyState,
  ErrorState,
  Button,
} from "@/components/ui";
import { Gauge, Sparkline, HBarChart } from "@/components/charts";

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DashData {
  field: FieldRecord | null;
  weather: any;
  rec: any;
  market: any;
  pests: any;
  history: HistoryRow[];
  alerts: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hour, setHour] = useState(new Date().getHours());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const f = await fieldsApi.list();
      const field = f.fields[0] ?? null;
      const base: DashData = { field, weather: null, rec: null, market: null, pests: null, history: [], alerts: [] };

      const lat = field?.latitude ?? 28.4089;
      const lon = field?.longitude ?? 77.3178;
      const place = field?.location ?? "Faridabad, Haryana (default)";

      const inputs: CropInputs | null =
        field && field.nitrogen != null && field.phosphorus != null && field.potassium != null && field.ph != null
          ? {
              N: field.nitrogen,
              P: field.phosphorus,
              K: field.potassium,
              temperature: 26,
              humidity: 65,
              ph: field.ph,
              rainfall: 120,
            }
          : null;

      const [w, m, h, a, r, p] = await Promise.allSettled([
        weatherApi.get(lat, lon, place),
        marketApi.snapshot(),
        historyApi.list(),
        fetch("/api/alerts").then((x) => x.json()),
        inputs ? cropApi.recommend(inputs) : Promise.resolve(null),
        field?.currentCrop
          ? agroApi.call("pests", { crop: field.currentCrop, temperature: 26, humidity: 65 })
          : Promise.resolve(null),
      ]);

      base.weather = w.status === "fulfilled" ? w.value : { ok: false, error: "Weather unavailable right now." };
      base.market = m.status === "fulfilled" ? m.value : null;
      base.history = h.status === "fulfilled" ? (h.value.history ?? []) : [];
      base.alerts = a.status === "fulfilled" ? ((a.value.alerts ?? []) as any[]).filter((x: any) => !x.dismissed).slice(0, 4) : [];
      base.rec = r.status === "fulfilled" ? r.value : null;
      base.pests = p.status === "fulfilled" ? p.value : null;
      setData(base);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the dashboard.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setHour(new Date().getHours());
  }, [load]);

  if (loading) return <DashboardSkeleton />;
  if (error) return <ErrorState message={error} retry={load} />;
  if (!data) return null;

  const greeting = hour < 12 ? "app.greeting.morning" : hour < 17 ? "app.greeting.afternoon" : "app.greeting.evening";
  const g = { "app.greeting.morning": "Good morning", "app.greeting.afternoon": "Good afternoon", "app.greeting.evening": "Good evening" }[greeting];
  const health = farmHealth(data);

  return (
    <div className="space-y-5">
      {/* Heading */}
      <div className="animate-rise">
        <p className="text-sm text-inksoft">{g}, {data.field ? "farmer" : "welcome"}</p>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Your Farm Intelligence</h1>
        <p className="mt-1 text-sm text-inkfaint">
          {data.field ? (
            <span className="inline-flex items-center gap-1.5">
              <MapPinned size={13} /> {data.field.name} · {data.field.location ?? "no location"} · {data.field.areaAcres} acres
            </span>
          ) : (
            "Add a field to unlock personalized intelligence."
          )}
        </p>
      </div>

      {!data.field && (
        <EmptyState
          title="Create your first field to unlock personalized recommendations"
          sub="A field stores your soil test values (N, P, K, pH), location and crops — every module then personalizes around it."
          action={
            <a href="/app/fields">
              <Button size="sm">Add a field</Button>
            </a>
          }
        />
      )}

      {/* Row 1: weather / soil / recommendation */}
      <div className="grid gap-5 lg:grid-cols-3">
        <WeatherCard weather={data.weather} />
        <SoilCard field={data.field} />
        <Card className="animate-rise-2">
          <CardHeader title="Recommended crop" sub={data.rec ? "k-NN model on field soil values" : undefined} icon={<Sprout size={16} />} />
          <CardBody>
            {data.rec ? (
              <div className="flex items-center gap-5">
                <Gauge value={data.rec.score} label="Suitability" size={140} />
                <div>
                  <p className="font-display text-2xl font-bold capitalize">{data.rec.recommended_crop}</p>
                  <p className="mt-1 text-xs leading-relaxed text-inkfaint">
                    {data.rec.explanation.positive_factors[0] ?? "Model score shown — not a guaranteed probability."}
                  </p>
                  <a href="/app/recommend" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
                    See full explanation <ChevronRight size={12} />
                  </a>
                </div>
              </div>
            ) : (
              <EmptyState title="No soil values on file" sub="Add N, P, K and pH to your field to run the crop model." />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Row 2: risk / market / yield + health score */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="animate-rise">
          <CardHeader title="Farm risk" sub="pest & disease watch" icon={<BellRing size={16} />} right={health ? undefined : undefined} />
          <CardBody>
            {health && (
              <div className="mb-4 flex items-center gap-4 rounded-lg border border-linesoft bg-husk/60 px-4 py-3">
                <GaugeIcon className="text-leaf" size={18} />
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-inkfaint">Farm health (composite)</p>
                  <p className="font-display text-xl font-bold">
                    {health.overall}
                    <span className="text-sm text-inkfaint">/100</span>
                  </p>
                </div>
                <div className="ml-auto grid grid-cols-2 gap-x-4 gap-y-0.5 text-[11px] text-inksoft">
                  <span>Soil {health.soil}</span>
                  <span>Weather {health.weather}</span>
                  <span>Risk {health.risk}</span>
                  <span>Market {health.market}</span>
                </div>
              </div>
            )}
            {data.pests?.items?.length ? (
              <ul className="space-y-2.5">
                {data.pests.items.slice(0, 3).map((i: any) => (
                  <li key={i.pest} className="flex items-start justify-between gap-2 rounded-lg border border-linesoft px-3 py-2">
                    <div>
                      <p className="text-sm font-semibold">{i.pest}</p>
                      <p className="text-[11px] leading-snug text-inkfaint">{i.reason}</p>
                    </div>
                    <SeverityBadge severity={i.risk === "medium" ? "medium" : i.risk} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="No pest watchlist" sub="Set a current crop on your field to enable pest risk screening." />
            )}
          </CardBody>
        </Card>

        <MarketCard market={data.market} />

        <Card className="animate-rise-2">
          <CardHeader title="Smart alerts" sub="aggregated by priority" icon={<Sparkles size={16} />} />
          <CardBody>
            {data.alerts.length ? (
              <ul className="space-y-2.5">
                {data.alerts.map((a: any) => (
                  <li key={a.id} className="rounded-lg border border-linesoft px-3 py-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{a.title}</p>
                      <SeverityBadge severity={a.severity} />
                    </div>
                    <p className="mt-1 text-[11px] leading-snug text-inkfaint">{a.message}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="All quiet" sub="No active alerts right now." />
            )}
            <a href="/app/alerts" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
              View all alerts <ChevronRight size={12} />
            </a>
          </CardBody>
        </Card>
      </div>

      {/* AI insights + activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AssistantCard />
        </div>
        <Card className="animate-rise-1">
          <CardHeader title="Recent activity" sub="your prediction history" icon={<Wheat size={16} />} />
          <CardBody>
            {data.history.length ? (
              <ul className="space-y-2.5">
                {data.history.slice(0, 5).map((h) => (
                  <li key={h.id} className="flex items-start justify-between gap-2 border-b border-linesoft pb-2 last:border-0">
                    <div>
                      <p className="text-[13px] font-semibold">{h.title}</p>
                      <p className="text-[11px] text-inkfaint">{h.summary}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-bold uppercase text-inkfaint">{fmtDateTime(h.createdAt)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState title="Your prediction history will appear here" />
            )}
            <a href="/app/history" className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
              Full history <ChevronRight size={12} />
            </a>
          </CardBody>
        </Card>
      </div>

      <p className="pb-4 text-center text-[11px] text-inkfaint">
        KrishiSense AI provides decision support based on models and curated datasets — it does not guarantee outcomes.
      </p>
    </div>
  );
}

/* ----------------------------- sub-cards ---------------------------- */

function WeatherCard({ weather }: { weather: any }) {
  return (
    <Card className="animate-rise">
      <CardHeader
        title="Weather"
        sub={weather?.place ?? "location"}
        icon={<CloudSun size={16} />}
        right={!weather?.live && weather?.ok ? <Badge tone="harvest">cached</Badge> : undefined}
      />
      <CardBody>
        {weather?.ok && weather.current ? (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-4xl font-bold">{Math.round(weather.current.temperature)}°C</p>
                <p className="text-xs font-semibold text-inksoft">{weather.current.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-1 text-[11px] text-inksoft">
                <span className="flex items-center gap-1.5"><Droplets size={12} /> {weather.current.humidity}% humidity</span>
                <span className="flex items-center gap-1.5"><Thermometer size={12} /> {weather.current.precipitation} mm rain</span>
                <span className="flex items-center gap-1.5"><Wind size={12} /> {Math.round(weather.current.wind)} km/h wind</span>
              </div>
            </div>
            {weather.advisories?.[0] && (
              <div
                className={`mt-3 rounded-lg px-3 py-2 text-[11px] font-semibold leading-snug ${
                  weather.advisories[0].level === "warning"
                    ? "bg-claysoft text-clay"
                    : weather.advisories[0].level === "caution"
                    ? "bg-harvestsoft text-[#8a6112]"
                    : "bg-sproutsoft text-leafdark"
                }`}
              >
                {weather.advisories[0].text}
              </div>
            )}
            <a href="/app/weather" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
              7-day outlook <ChevronRight size={12} />
            </a>
          </>
        ) : (
          <ErrorState message={weather?.error ?? "Weather unavailable."} />
        )}
      </CardBody>
    </Card>
  );
}

function SoilCard({ field }: { field: FieldRecord | null }) {
  const items = field
    ? [
        { label: "Nitrogen", value: field.nitrogen, band: [60, 100] },
        { label: "Phosphorus", value: field.phosphorus, band: [35, 60] },
        { label: "Potassium", value: field.potassium, band: [35, 55] },
      ]
    : [];
  return (
    <Card className="animate-rise-1">
      <CardHeader title="Soil health" sub={field ? `pH ${field.ph ?? "—"} · ${field.soilType ?? "soil type not set"}` : undefined} icon={<FlaskConical size={16} />} />
      <CardBody>
        {field ? (
          <HBarChart
            items={items.map((i) => ({
              label: `${i.label} (${i.value ?? "—"} kg/ha)`,
              value: Math.min(140, i.value ?? 0),
              status:
                (i.value ?? 0) < i.band[0] ? "limiting" : (i.value ?? 0) > i.band[1] ? "neutral" : "positive",
              sub: `${i.label} target band ${i.band[0]}–${i.band[1]}`,
            }))}
            color="#9a6a3c"
            format={(v) => `${Math.round(v)}`}
          />
        ) : (
          <EmptyState title="No soil data yet" sub="Create a field with soil test values." />
        )}
        <a href="/app/fertilizer" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
          Fertilizer guide <ChevronRight size={12} />
        </a>
      </CardBody>
    </Card>
  );
}

function MarketCard({ market }: { market: any }) {
  const top = market?.commodities?.slice(0, 3) ?? [];
  return (
    <Card className="animate-rise-1">
      <CardHeader title="Market snapshot" sub={market ? `as of ${market.asOf}` : undefined} icon={<Store size={16} />} />
      <CardBody>
        {top.length ? (
          <ul className="space-y-3">
            {top.map((c: any) => {
              const Icon = c.trend === "up" ? TrendingUp : c.trend === "down" ? TrendingDown : Minus;
              return (
                <li key={c.commodity} className="flex items-center justify-between gap-2 border-b border-linesoft pb-2.5 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-semibold">{c.commodity}</p>
                    <p className="text-[11px] text-inkfaint">{c.bestState} · {c.latest.label}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Sparkline values={c.points.slice(-8).map((p: any) => p.price)} width={70} height={26} stroke={c.trend === "down" ? "#be4b2d" : "#2d6a3f"} />
                    <div className="text-right">
                      <p className="tabular text-sm font-bold">{inr(c.latest.price)}<span className="text-[10px] text-inkfaint">/qtl</span></p>
                      <p className={`flex items-center justify-end gap-1 text-[11px] font-bold ${c.trend === "down" ? "text-clay" : c.trend === "up" ? "text-leaf" : "text-inkfaint"}`}>
                        <Icon size={11} /> {c.change90 > 0 ? "+" : ""}{c.change90}% qtr
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Market data is temporarily unavailable" />
        )}
        <a href="/app/market" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-leaf hover:underline">
          Market insights <ChevronRight size={12} />
        </a>
        {market && <p className="mt-2 text-[10px] text-inkfaint">Latest available dataset — not a live feed.</p>}
      </CardBody>
    </Card>
  );
}

function AssistantCard() {
  const [messages, setMessages] = useState<{ q: string; a: string; link?: string }[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    const q = input.trim();
    if (!q || busy) return;
    setBusy(true);
    setInput("");
    try {
      const res = await assistantApi.ask(q);
      setMessages((m) => [...m, { q, a: res.answer, link: res.link }].slice(-4));
    } catch {
      setMessages((m) => [...m, { q, a: "The assistant is unavailable right now — please use the module pages directly." }]);
    } finally {
      setBusy(false);
    }
  };

  const suggestions = ["Which crop suits my soil?", "How to plan irrigation this week?", "Why wheat after rice is a good rotation?"];

  return (
    <Card className="animate-rise">
      <CardHeader
        title="Ask KrishiSense"
        sub="rule-based agricultural knowledge assistant — no external AI service required"
        icon={<Bot size={16} />}
        right={<Badge tone="soil">rule engine</Badge>}
      />
      <CardBody>
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setInput(s)}
                className="rounded-full border border-line bg-husk px-3 py-1.5 text-[11px] font-semibold text-inksoft hover:border-leaf/50"
              >
                {s}
              </button>
            ))}
          </div>
        )}
        <ul className="space-y-3">
          {messages.map((m, i) => (
            <li key={i} className="rounded-lg border border-linesoft bg-husk/50 px-3.5 py-3">
              <p className="text-xs font-bold text-soil">Q · {m.q}</p>
              <p className="mt-1 text-[13px] leading-relaxed">{m.a}</p>
              {m.link && (
                <a href={m.link} className="mt-1.5 inline-block text-xs font-bold text-leaf hover:underline">
                  Open module →
                </a>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ask about crops, fertilizer, weather, market…"
            className="flex-1 rounded-lg border border-line bg-card px-3 py-2 text-sm focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20"
          />
          <Button onClick={ask} busy={busy} aria-label="Send">
            <Send size={14} />
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

/* -------------------------- health score ---------------------------- */

function farmHealth(data: DashData) {
  const f = data.field;
  if (!f) return null;
  const soilScore = (() => {
    const parts: number[] = [];
    const band = (v: number | null, lo: number, hi: number) =>
      v == null ? 60 : v < lo ? Math.max(30, 60 - (lo - v)) : v > hi ? Math.max(40, 75 - (v - hi)) : 92;
    parts.push(band(f.nitrogen, 60, 100), band(f.phosphorus, 35, 60), band(f.potassium, 35, 55));
    if (f.ph != null) parts.push(Math.max(30, 95 - Math.abs(f.ph - 6.75) * 22));
    return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
  })();
  const weatherScore = (() => {
    const adv = data.weather?.advisories ?? [];
    let s = 90;
    for (const a of adv) if (a.level === "warning") s -= 30; else if (a.level === "caution") s -= 12;
    return Math.max(30, Math.min(95, s));
  })();
  const riskScore = (() => {
    const items = data.pests?.items ?? [];
    if (!items.length) return 85;
    const worst = items.reduce((acc: number, i: any) => (i.risk === "high" ? 3 : i.risk === "medium" ? 2 : 1) > acc ? (i.risk === "high" ? 3 : i.risk === "medium" ? 2 : 1) : acc, 0);
    return worst === 3 ? 45 : worst === 2 ? 68 : 84;
  })();
  const marketScore = (() => {
    const cs = data.market?.commodities?.slice(0, 5) ?? [];
    if (!cs.length) return 70;
    const avg = cs.reduce((a: number, c: any) => a + c.change90, 0) / cs.length;
    return Math.max(35, Math.min(95, Math.round(70 + avg)));
  })();
  const overall = Math.round(soilScore * 0.35 + weatherScore * 0.25 + riskScore * 0.2 + marketScore * 0.2);
  return { soil: soilScore, weather: weatherScore, risk: riskScore, market: marketScore, overall };
}

/* ---------------------------- skeleton ------------------------------ */

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <div>
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-2 h-9 w-80" />
        <Skeleton className="mt-2 h-3 w-64" />
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardBody>
              <SkeletonRows rows={4} />
            </CardBody>
          </Card>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Card key={i}>
            <CardBody>
              <SkeletonRows rows={3} />
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
