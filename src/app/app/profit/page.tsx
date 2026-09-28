"use client";

import { useEffect, useState } from "react";
import { Coins, Info } from "lucide-react";
import { agroApi, marketApi, ApiError, inr } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, TextInput, Select, Badge, ErrorState, Skeleton } from "@/components/ui";
import { Donut } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Soybean", "Mustard", "Groundnut", "Potato", "Onion", "Banana", "Apple"];

/* rough per-acre defaults used to pre-fill; clearly editable */
const DEFAULTS: Record<string, { yieldTons: number; seed: number; fert: number; irr: number; labour: number; other: number }> = {
  Wheat:   { yieldTons: 3.4, seed: 1400, fert: 3200, irr: 2200, labour: 4800, other: 1500 },
  Rice:    { yieldTons: 2.8, seed: 1800, fert: 3800, irr: 3600, labour: 7200, other: 1800 },
  Maize:   { yieldTons: 3.1, seed: 1500, fert: 3000, irr: 2000, labour: 4200, other: 1400 },
  Cotton:  { yieldTons: 0.5, seed: 2600, fert: 3500, irr: 3000, labour: 9000, other: 2500 },
  Soybean: { yieldTons: 1.1, seed: 1300, fert: 2200, irr: 1600, labour: 3600, other: 1200 },
  Mustard: { yieldTons: 1.3, seed: 1100, fert: 2400, irr: 1800, labour: 3800, other: 1300 },
  Groundnut: { yieldTons: 1.5, seed: 2200, fert: 2600, irr: 2200, labour: 5200, other: 1600 },
  Potato:  { yieldTons: 22, seed: 12000, fert: 7500, irr: 4200, labour: 15000, other: 4000 },
  Onion:   { yieldTons: 18, seed: 9000, fert: 6500, irr: 3800, labour: 12000, other: 3500 },
  Banana:  { yieldTons: 35, seed: 18000, fert: 9500, irr: 5200, labour: 14000, other: 5000 },
  Apple:   { yieldTons: 9, seed: 6000, fert: 7200, irr: 3200, labour: 11000, other: 4200 },
};

export default function ProfitPage() {
  const [form, setForm] = useState({
    crop: "Wheat", areaAcres: "2.5", expectedYieldTons: "8.5", pricePerQuintal: "2600",
    seedCost: "3500", fertilizerCost: "8000", irrigationCost: "5500", labourCost: "12000", otherCost: "3750",
  });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const applyDefaults = (crop: string, price?: number) => {
    const d = DEFAULTS[crop];
    if (!d) return;
    const area = Number(form.areaAcres) || 1;
    setForm((f) => ({
      ...f,
      crop,
      expectedYieldTons: String(Math.round(d.yieldTons * area * 10) / 10),
      seedCost: String(Math.round(d.seed * area)),
      fertilizerCost: String(Math.round(d.fert * area)),
      irrigationCost: String(Math.round(d.irr * area)),
      labourCost: String(Math.round(d.labour * area)),
      otherCost: String(Math.round(d.other * area)),
      pricePerQuintal: price != null ? String(price) : f.pricePerQuintal,
    }));
  };

  useEffect(() => {
    (async () => {
      try {
        const snap: any = await marketApi.snapshot();
        const w = snap.commodities?.find((c: any) => c.commodity === "Wheat");
        if (w) setForm((f) => ({ ...f, pricePerQuintal: String(w.latest.price) }));
      } catch {
        /* optional */
      }
    })();
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res: any = await agroApi.call("profit", {
        crop: form.crop,
        areaAcres: Number(form.areaAcres),
        expectedYieldTons: Number(form.expectedYieldTons),
        pricePerQuintal: Number(form.pricePerQuintal),
        seedCost: Number(form.seedCost),
        fertilizerCost: Number(form.fertilizerCost),
        irrigationCost: Number(form.irrigationCost),
        labourCost: Number(form.labourCost),
        otherCost: Number(form.otherCost),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Calculation failed.");
    } finally {
      setBusy(false);
    }
  };

  const onCrop = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const c = e.target.value;
    (async () => {
      try {
        const d: any = await marketApi.detail(c);
        applyDefaults(c, d?.latest?.price);
      } catch {
        applyDefaults(c);
      }
    })();
  };

  return (
    <div>
      <PageHeader
        kicker="Profit Planner"
        title="Revenue, cost & margin estimate"
        sub="Expected yield × expected price minus cultivation costs. Every figure is your input — all outputs are clearly estimates."
        right={<Badge tone="harvest">estimate only</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2 animate-rise">
          <CardHeader title="Inputs" sub="pre-filled with typical per-acre costs" icon={<Coins size={16} />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Crop">
                <Select value={form.crop} onChange={onCrop}>{CROPS.map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label="Area (acres)"><TextInput type="number" step="0.1" min="0.1" value={form.areaAcres} onChange={set("areaAcres")} /></Field>
              <Field label="Expected yield (total tons)"><TextInput type="number" step="0.1" min="0" value={form.expectedYieldTons} onChange={set("expectedYieldTons")} /></Field>
              <Field label="Price (₹/quintal)"><TextInput type="number" min="0" value={form.pricePerQuintal} onChange={set("pricePerQuintal")} /></Field>
              <Field label="Seed cost (₹)"><TextInput type="number" min="0" value={form.seedCost} onChange={set("seedCost")} /></Field>
              <Field label="Fertilizer cost (₹)"><TextInput type="number" min="0" value={form.fertilizerCost} onChange={set("fertilizerCost")} /></Field>
              <Field label="Irrigation cost (₹)"><TextInput type="number" min="0" value={form.irrigationCost} onChange={set("irrigationCost")} /></Field>
              <Field label="Labour cost (₹)"><TextInput type="number" min="0" value={form.labourCost} onChange={set("labourCost")} /></Field>
              <div className="col-span-2">
                <Field label="Other costs (₹)"><TextInput type="number" min="0" value={form.otherCost} onChange={set("otherCost")} /></Field>
              </div>
            </div>
            <Button onClick={run} busy={busy} className="mt-4 w-full" size="lg">Calculate estimate</Button>
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          {error && <ErrorState message={error} retry={run} />}
          {busy && <Card><CardBody><Skeleton className="h-60 w-full" /></CardBody></Card>}

          {result && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                <Card className="animate-rise"><CardBody className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">Expected revenue</p>
                  <p className="tabular font-display text-2xl font-bold">{inr(result.revenue)}</p>
                </CardBody></Card>
                <Card className="animate-rise-1"><CardBody className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">Estimated cost</p>
                  <p className="tabular font-display text-2xl font-bold text-soil">{inr(result.costs.total)}</p>
                </CardBody></Card>
                <Card tone={result.profit >= 0 ? "green" : "default"} className="animate-rise-2"><CardBody className="text-center">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-husk/60">Estimated margin</p>
                  <p className={`tabular font-display text-2xl font-bold ${result.profit >= 0 ? "text-sprout" : "text-clay"}`}>{inr(result.profit)}</p>
                  <p className="text-[11px] text-husk/60">{result.marginPct}% · {inr(result.profitPerAcre)}/acre</p>
                </CardBody></Card>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <Card className="animate-rise-1">
                  <CardHeader title="Cost structure" />
                  <CardBody>
                    <Donut
                      size={150}
                      centerLabel={inr(result.costs.total)}
                      centerSub="total"
                      segments={[
                        { label: "Labour", value: result.costs.labour, color: "#2d6a3f" },
                        { label: "Fertilizer", value: result.costs.fertilizer, color: "#9a6a3c" },
                        { label: "Seed", value: result.costs.seed, color: "#d9992b" },
                        { label: "Irrigation", value: result.costs.irrigation, color: "#46708f" },
                        { label: "Other", value: result.costs.other, color: "#8a8f7e" },
                      ]}
                    />
                  </CardBody>
                </Card>
                <Card className="animate-rise-2">
                  <CardHeader title="Planning notes" />
                  <CardBody>
                    <dl className="space-y-2.5 text-sm">
                      <div className="flex justify-between border-b border-linesoft pb-2">
                        <dt className="text-inksoft">Breakeven yield</dt>
                        <dd className="tabular font-bold">{result.breakevenYieldTons ?? "—"} t total</dd>
                      </div>
                      {result.marketContext && (
                        <p className="rounded-lg bg-husk px-3 py-2.5 text-[13px] leading-relaxed">{result.marketContext}</p>
                      )}
                    </dl>
                    <div className="mt-3 flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
                      <Info size={15} className="mt-0.5 shrink-0" />
                      <p>{result.disclaimer}</p>
                    </div>
                  </CardBody>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
