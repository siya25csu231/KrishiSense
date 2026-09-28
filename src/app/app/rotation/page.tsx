"use client";

import { useState } from "react";
import { Repeat, AlertTriangle, Sprout, Snowflake, Sun } from "lucide-react";
import { agroApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, Select, Badge, ErrorState, Skeleton, Tag } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Mustard", "Soybean", "Groundnut", "Chickpea", "Pigeonpea", "Moong", "Potato", "Onion", "Tomato", "Sugarcane", "Jute"];

export default function RotationPage() {
  const [form, setForm] = useState({ previousCrop: "Rice", currentCrop: "Wheat" });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res: any = await agroApi.call("rotation", form);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not build a plan.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Rotation Planner"
        title="Crop rotation plan"
        sub="Family-aware sequencing that breaks pest cycles and supports soil nitrogen — with reasons for every step."
        right={<Badge tone="soil">rule-based planner</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2 animate-rise">
          <CardHeader title="Your sequence" icon={<Repeat size={16} />} />
          <CardBody>
            <div className="space-y-3">
              <Field label="Previous crop">
                <Select value={form.previousCrop} onChange={(e) => setForm((f) => ({ ...f, previousCrop: e.target.value }))}>
                  {CROPS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Field label="Current crop">
                <Select value={form.currentCrop} onChange={(e) => setForm((f) => ({ ...f, currentCrop: e.target.value }))}>
                  {CROPS.map((c) => <option key={c}>{c}</option>)}
                </Select>
              </Field>
              <Button onClick={run} busy={busy} className="w-full" size="lg">Build rotation plan</Button>
            </div>

            {result && (
              <div className="mt-5 space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-soil">Season crop lists (bundled KB)</p>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-bold"><Sun size={12} className="text-harvest" /> Kharif</p>
                  <div className="flex flex-wrap gap-1">{result.kharifCrops?.slice(0, 8).map((c: string) => <Tag key={c}>{c}</Tag>)}</div>
                </div>
                <div>
                  <p className="mb-1 flex items-center gap-1 text-xs font-bold"><Snowflake size={12} className="text-sky" /> Rabi</p>
                  <div className="flex flex-wrap gap-1">{result.rabiCrops?.slice(0, 8).map((c: string) => <Tag key={c}>{c}</Tag>)}</div>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          {error && <ErrorState message={error} retry={run} />}
          {busy && <Card><CardBody><Skeleton className="h-64 w-full" /></CardBody></Card>}

          {result && (
            <>
              {result.warning && (
                <div className="flex gap-2 rounded-xl border border-harvest/40 bg-harvestsoft px-4 py-3 text-[13px] leading-relaxed text-[#8a6112] animate-rise">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                  {result.warning}
                </div>
              )}

              <Card className="animate-rise-1">
                <CardHeader
                  title="Suggested sequence"
                  sub={`${result.previousCrop} → ${result.currentCrop} → next windows`}
                  icon={<Sprout size={16} />}
                />
                <CardBody>
                  <ol className="relative space-y-0 border-l-2 border-linesoft pl-6">
                    {result.plan.map((step: any, i: number) => (
                      <li key={i} className="relative pb-6 last:pb-0">
                        <span className={`absolute -left-[31px] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${i === 0 ? "bg-leaf text-husk" : "bg-soilsoft text-soil"}`}>
                          {i + 1}
                        </span>
                        <p className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">{step.slot}</p>
                        <p className="font-display text-lg font-bold">{step.crop}</p>
                        <p className="mt-0.5 max-w-md text-[13px] leading-relaxed text-inksoft">{step.why}</p>
                      </li>
                    ))}
                  </ol>
                  <p className="mt-4 rounded-lg bg-husk px-3.5 py-2.5 text-[12px] leading-relaxed text-inksoft">{result.note}</p>
                </CardBody>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
