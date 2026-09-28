"use client";

import { useState } from "react";
import { Wheat, Info, BookmarkPlus, BookmarkCheck } from "lucide-react";
import { agroApi, historyApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, TextInput, Select, Badge, ErrorState, Skeleton } from "@/components/ui";
import { Gauge } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Groundnut", "Mustard", "Potato", "Onion", "Banana", "Chickpea", "Pigeonpea", "Jute"];
const STATES = ["Haryana", "Punjab", "Uttar Pradesh", "Madhya Pradesh", "Rajasthan", "Gujarat", "Maharashtra", "Andhra Pradesh", "West Bengal", "Bihar", "Karnataka", "Tamil Nadu"];

export default function YieldPage() {
  const [form, setForm] = useState({
    crop: "Wheat", state: "Haryana", district: "", season: "Rabi",
    areaAcres: "2.5", rainfall: "120", temperature: "24", ph: "6.8",
  });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const run = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res: any = await agroApi.call("yield", {
        crop: form.crop, state: form.state || undefined, district: form.district || undefined,
        season: form.season, areaAcres: Number(form.areaAcres),
        rainfall: Number(form.rainfall), temperature: Number(form.temperature), ph: Number(form.ph),
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Yield estimate failed.");
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!result) return;
    await historyApi.save({
      title: `Yield estimate — ${form.crop} (${result.estimatedTonsPerHa} t/ha)`,
      kind: "yield",
      note: `${form.state} · ${form.season} · ${form.areaAcres} acres`,
      data: result,
    });
    setSaved(true);
  };

  return (
    <div>
      <PageHeader
        kicker="Yield Prediction"
        title="Expected yield estimate"
        sub="Reference yields from public agricultural statistics, adjusted by rainfall, temperature and soil pH suitability. Always an estimate — never a guarantee."
        right={<Badge tone="soil">reference-adjusted model</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2 animate-rise">
          <CardHeader title="Crop & conditions" icon={<Wheat size={16} />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Crop">
                <Select value={form.crop} onChange={set("crop")}>{CROPS.map((c) => <option key={c}>{c}</option>)}</Select>
              </Field>
              <Field label="Season">
                <Select value={form.season} onChange={set("season")}>{["Kharif", "Rabi", "Zaid"].map((s) => <option key={s}>{s}</option>)}</Select>
              </Field>
              <Field label="State">
                <Select value={form.state} onChange={set("state")}>{STATES.map((s) => <option key={s}>{s}</option>)}</Select>
              </Field>
              <Field label="District"><TextInput value={form.district} onChange={set("district")} placeholder="Optional" /></Field>
              <Field label="Area (acres)"><TextInput type="number" step="0.1" min="0.1" value={form.areaAcres} onChange={set("areaAcres")} /></Field>
              <Field label="Rainfall (mm)"><TextInput type="number" min="0" value={form.rainfall} onChange={set("rainfall")} /></Field>
              <Field label="Temperature (°C)"><TextInput type="number" min="-10" max="55" value={form.temperature} onChange={set("temperature")} /></Field>
              <Field label="Soil pH"><TextInput type="number" step="0.1" min="0" max="14" value={form.ph} onChange={set("ph")} /></Field>
            </div>
            <Button onClick={run} busy={busy} className="mt-4 w-full" size="lg">Estimate yield</Button>
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          {error && <ErrorState message={error} retry={run} />}
          {busy && <Card><CardBody><Skeleton className="h-56 w-full" /></CardBody></Card>}

          {result && (
            <>
              <Card className="animate-rise">
                <CardBody className="flex flex-wrap items-center gap-8 py-6">
                  <Gauge value={result.suitabilityFactor / 1.18} label="Suitability" size={160} />
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">Estimated yield</p>
                    <p className="font-display text-4xl font-bold">
                      {result.estimatedTonsPerHa} <span className="text-lg font-semibold text-inkfaint">tonnes/hectare</span>
                    </p>
                    <p className="mt-1 text-sm text-inksoft">
                      ≈ <span className="tabular font-bold">{result.estimatedTotalTons} tonnes</span> total on {result.areaHa} ha ({form.areaAcres} acres)
                    </p>
                    <p className="mt-2 text-xs text-inkfaint">
                      Reference range: {result.referenceRange} · base {result.referenceBase} t/ha · {result.note}
                    </p>
                  </div>
                  <div className="ml-auto">
                    <Button variant="secondary" size="sm" onClick={save} disabled={saved} busy={false}>
                      {saved ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />} {saved ? "Saved" : "Save"}
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="animate-rise-1">
                <CardHeader title="How this estimate was built" sub="input assumptions, fully transparent" />
                <CardBody>
                  <ul className="space-y-2">
                    {result.assumptions.map((a: string, i: number) => (
                      <li key={i} className="rounded-lg bg-husk px-3.5 py-2.5 text-[13px]">{a}</li>
                    ))}
                  </ul>
                  <div className="mt-3 flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
                    <Info size={15} className="mt-0.5 shrink-0" />
                    <p>{result.disclaimer}</p>
                  </div>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
