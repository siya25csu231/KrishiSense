"use client";

import { useCallback, useEffect, useState } from "react";
import { FlaskConical, Leaf, Info } from "lucide-react";
import { agroApi, fieldsApi, ApiError } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Field, TextInput, Select, Badge, ErrorState, Skeleton } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CROPS = ["Wheat", "Rice", "Maize", "Cotton", "Sugarcane", "Soybean", "Mustard", "Potato", "Onion", "Groundnut"];

export default function FertilizerPage() {
  const [form, setForm] = useState({ N: "80", P: "45", K: "40", ph: "6.8", crop: "Wheat" });
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const f = await fieldsApi.list();
        const x = f.fields[0];
        if (x) {
          setForm((p) => ({
            ...p,
            N: x.nitrogen != null ? String(x.nitrogen) : p.N,
            P: x.phosphorus != null ? String(x.phosphorus) : p.P,
            K: x.potassium != null ? String(x.potassium) : p.K,
            ph: x.ph != null ? String(x.ph) : p.ph,
            crop: x.currentCrop ?? p.crop,
          }));
        }
      } catch {
        /* optional */
      }
    })();
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res: any = await agroApi.call("fertilizer", {
        N: Number(form.N), P: Number(form.P), K: Number(form.K), ph: Number(form.ph), crop: form.crop,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not compute advice.");
    } finally {
      setBusy(false);
    }
  }, [form]);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <div>
      <PageHeader
        kicker="Fertilizer Guide"
        title="Soil nutrient advisor"
        sub="A transparent rule-based system that flags nutrient gaps from your soil test values — no dosage claims, no fake AI."
        right={<Badge tone="soil">rule-based advisor</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="lg:col-span-2 animate-rise">
          <CardHeader title="Soil test values" sub="from your Soil Health Card" icon={<FlaskConical size={16} />} />
          <CardBody>
            <div className="grid grid-cols-2 gap-3">
              <Field label="N (kg/ha)"><TextInput type="number" min={0} max={300} value={form.N} onChange={set("N")} /></Field>
              <Field label="P (kg/ha)"><TextInput type="number" min={0} max={300} value={form.P} onChange={set("P")} /></Field>
              <Field label="K (kg/ha)"><TextInput type="number" min={0} max={300} value={form.K} onChange={set("K")} /></Field>
              <Field label="pH"><TextInput type="number" step="0.1" min={0} max={14} value={form.ph} onChange={set("ph")} /></Field>
              <div className="col-span-2">
                <Field label="Target crop">
                  <Select value={form.crop} onChange={set("crop")}>
                    {CROPS.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
            <Button onClick={run} busy={busy} className="mt-4 w-full" size="lg">Get nutrient advice</Button>
          </CardBody>
        </Card>

        <div className="space-y-5 lg:col-span-3">
          {error && <ErrorState message={error} retry={run} />}
          {busy && <Card><CardBody><Skeleton className="h-56 w-full" /></CardBody></Card>}

          {result && (
            <>
              <div className="grid gap-3 sm:grid-cols-3">
                {result.advices.map((a: any) => (
                  <Card key={a.nutrient} className="animate-rise">
                    <CardBody className="text-center">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">{a.nutrient}</p>
                      <p className={`font-display text-2xl font-bold capitalize ${a.level === "low" ? "text-clay" : a.level === "high" ? "text-harvest" : "text-leaf"}`}>
                        {a.level}
                      </p>
                    </CardBody>
                  </Card>
                ))}
              </div>

              <Card className="animate-rise-1">
                <CardHeader title="Interpretation" />
                <CardBody>
                  <ul className="space-y-2.5">
                    {result.advices.map((a: any) => (
                      <li key={a.nutrient} className="rounded-lg bg-husk px-3.5 py-2.5 text-[13px] leading-relaxed">{a.detail}</li>
                    ))}
                    <li className="rounded-lg bg-husk px-3.5 py-2.5 text-[13px] leading-relaxed">{result.phAdvice}</li>
                  </ul>
                </CardBody>
              </Card>

              {result.organicOptions?.length > 0 && (
                <Card className="animate-rise-2">
                  <CardHeader title="Organic options" sub="from the bundled organic fertilizer lookup" icon={<Leaf size={16} />} />
                  <CardBody>
                    <ul className="space-y-2.5">
                      {result.organicOptions.map((o: any) => (
                        <li key={o.nutrient} className="rounded-lg border border-linesoft px-3.5 py-2.5">
                          <p className="text-sm font-bold capitalize">{o.nutrient.replace(/_/g, " ")} deficit · {o.condition}</p>
                          {o.options?.map((opt: any) => (
                            <p key={opt.name} className="mt-1 text-[13px] leading-relaxed text-inksoft">
                              <span className="font-semibold text-soil">{opt.name}</span> — {opt.how_it_helps}
                              {opt.approximate_cost ? <span className="text-inkfaint"> · cost: {opt.approximate_cost}</span> : null}
                            </p>
                          ))}
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}

              <div className="flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
                <Info size={15} className="mt-0.5 shrink-0" />
                <p>{result.note}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
