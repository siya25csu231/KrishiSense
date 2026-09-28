"use client";

import { useCallback, useEffect, useState } from "react";
import { Store, TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { marketApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Badge, Skeleton, ErrorState, EmptyState } from "@/components/ui";
import { LineAreaChart, Sparkline } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

export default function MarketPage() {
  const [snap, setSnap] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailBusy, setDetailBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res: any = await marketApi.snapshot();
      setSnap(res);
      if (res.commodities?.length) setSelected(res.commodities[0].commodity);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Market data unavailable.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) return;
    (async () => {
      setDetailBusy(true);
      try {
        const res: any = await marketApi.detail(selected);
        setDetail(res);
      } catch {
        setDetail(null);
      } finally {
        setDetailBusy(false);
      }
    })();
  }, [selected]);

  return (
    <div>
      <PageHeader
        kicker="Market Insights"
        title="Price intelligence"
        sub="Monthly modal prices from the bundled agmarknet 2024–25 dataset, with trend analysis and a simple linear planning estimate."
        right={snap ? <Badge tone="harvest">latest available data · {snap.asOf}</Badge> : undefined}
      />

      {error && <ErrorState message={error} retry={load} />}
      {!snap && !error && (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => <Card key={i}><CardBody><Skeleton className="h-24 w-full" /></CardBody></Card>)}
        </div>
      )}

      {snap && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {snap.commodities.map((c: any) => {
              const Icon = c.trend === "up" ? TrendingUp : c.trend === "down" ? TrendingDown : Minus;
              const active = selected === c.commodity;
              return (
                <button
                  key={c.commodity}
                  onClick={() => setSelected(c.commodity)}
                  className={`rounded-xl border p-4 text-left transition-all animate-rise ${
                    active ? "border-leaf bg-sproutsoft shadow-sm" : "border-line bg-card hover:border-leaf/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <p className="font-display text-base font-bold">{c.commodity}</p>
                    <Icon size={16} className={c.trend === "down" ? "text-clay" : c.trend === "up" ? "text-leaf" : "text-inkfaint"} />
                  </div>
                  <p className="tabular mt-1 text-lg font-bold">₹{c.latest.price.toLocaleString("en-IN")}<span className="text-xs font-semibold text-inkfaint">/qtl</span></p>
                  <div className="mt-2 flex items-end justify-between">
                    <span className={`text-[11px] font-bold ${c.change90 < 0 ? "text-clay" : "text-leaf"}`}>
                      {c.change90 > 0 ? "+" : ""}{c.change90}% · 3 mo
                    </span>
                    <Sparkline values={c.points.slice(-10).map((p: any) => p.price)} width={80} height={26} stroke={c.trend === "down" ? "#be4b2d" : "#2d6a3f"} />
                  </div>
                  <p className="mt-1.5 text-[10px] text-inkfaint">{c.bestState} · {c.latest.label}</p>
                </button>
              );
            })}
          </div>

          {detailBusy && <Card className="mt-5"><CardBody><Skeleton className="h-64 w-full" /></CardBody></Card>}

          {detail && !detailBusy && (
            <div className="mt-5 grid gap-5 lg:grid-cols-3">
              <Card className="animate-rise lg:col-span-2">
                <CardHeader
                  title={`${detail.commodity} — monthly modal price (₹/qtl)`}
                  sub={`national average across reporting states · solid = recorded, dashed = linear estimate`}
                  icon={<Store size={16} />}
                />
                <CardBody>
                  <LineAreaChart
                    data={detail.points.map((p: any) => ({ label: p.label, value: p.price }))}
                    forecast={detail.forecast.map((f: any) => ({ label: f.label, value: f.price }))}
                    height={250}
                  />
                </CardBody>
              </Card>

              <div className="space-y-5">
                <Card className="animate-rise-1">
                  <CardHeader title="Signals" />
                  <CardBody>
                    <dl className="space-y-2.5 text-sm">
                      {[
                        ["Latest price", `₹${detail.latest.price.toLocaleString("en-IN")}/qtl`],
                        ["1-month change", `${detail.change30 > 0 ? "+" : ""}${detail.change30}%`],
                        ["3-month change", `${detail.change90 > 0 ? "+" : ""}${detail.change90}%`],
                        ["Trend", detail.trend === "up" ? "Rising ↑" : detail.trend === "down" ? "Falling ↓" : "Stable →"],
                        ["Slope", `~₹${detail.slopePerMonth}/qtl per month`],
                        ["Top reporting state", detail.bestState],
                        ["Observations", `${detail.points.length} monthly points`],
                      ].map(([k, v]) => (
                        <div key={k as string} className="flex justify-between border-b border-linesoft pb-2 last:border-0">
                          <dt className="text-inksoft">{k}</dt>
                          <dd className="tabular font-bold">{v}</dd>
                        </div>
                      ))}
                    </dl>
                  </CardBody>
                </Card>
                <div className="flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
                  <Info size={15} className="mt-0.5 shrink-0" />
                  <p>{detail.note}</p>
                </div>
              </div>
            </div>
          )}

          {snap.commodities.length === 0 && (
            <div className="mt-5">
              <EmptyState title="Market data is temporarily unavailable" sub="The bundled dataset could not be loaded." />
            </div>
          )}

          <p className="mt-5 text-[11px] text-inkfaint">Source: {snap.source}</p>
        </>
      )}
    </div>
  );
}
