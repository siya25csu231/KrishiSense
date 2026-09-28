"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sprout,
  CheckCircle2,
  AlertCircle,
  BookmarkPlus,
  BookmarkCheck,
  SlidersHorizontal,
  FlaskConical,
  Thermometer,
  MapPin,
} from "lucide-react";
import { cropApi, fieldsApi, historyApi, ApiError, pct } from "@/lib/api";
import {
  Card, CardHeader, CardBody, Button, Field, TextInput, Select, Badge,
  Skeleton, EmptyState, ErrorState, RangeInput,
} from "@/components/ui";
import { Gauge, HBarChart } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const STATES = ["Haryana", "Punjab", "Uttar Pradesh", "Madhya Pradesh", "Rajasthan", "Gujarat", "Maharashtra", "Andhra Pradesh", "West Bengal", "Bihar"];

const DEFAULTS = { N: 80, P: 45, K: 40, temperature: 26, humidity: 68, ph: 6.8, rainfall: 150 };

export default function RecommendPage() {
  const [tab, setTab] = useState<"analyze" | "whatif">("analyze");
  const [inputs, setInputs] = useState({ ...DEFAULTS });
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /* What-if */
  const [changed, setChanged] = useState({ ...DEFAULTS });
  const [sim, setSim] = useState<any>(null);
  const [simBusy, setSimBusy] = useState(false);
  const [simError, setSimError] = useState<string | null>(null);

  const hydrateFromField = useCallback(async () => {
    try {
      const res = await fieldsApi.list();
      const f = res.fields[0];
      if (f && f.nitrogen != null && f.phosphorus != null && f.potassium != null && f.ph != null) {
        const next = { ...inputs, N: f.nitrogen, P: f.phosphorus, K: f.potassium, ph: f.ph };
        setInputs(next);
        setChanged(next);
      }
    } catch {
      /* optional convenience */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    hydrateFromField();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const res: any = await cropApi.recommend(inputs);
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  };

  const runSim = async () => {
    setSimBusy(true);
    setSimError(null);
    try {
      const res: any = await cropApi.whatIf(inputs, changed);
      setSim(res);
    } catch (e) {
      setSimError(e instanceof ApiError ? e.message : "Simulation failed.");
    } finally {
      setSimBusy(false);
    }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    try {
      await historyApi.save({
        title: `${result.recommended_crop} recommendation (${pct(result.score)})`,
        kind: "crop",
        note: `Inputs: N ${inputs.N}, P ${inputs.P}, K ${inputs.K}, pH ${inputs.ph}, ${inputs.temperature}°C, ${inputs.humidity}% RH, ${inputs.rainfall} mm rain${state ? `, ${state}` : ""}`,
        data: result,
      });
      setSaved(true);
    } catch {
      setSimError("Could not save advisory.");
    } finally {
      setSaving(false);
    }
  };

  const setNum = (k: keyof typeof DEFAULTS) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputs((v) => ({ ...v, [k]: Number(e.target.value) }));

  return (
    <div>
      <PageHeader
        kicker="Crop Intelligence"
        title="Explainable crop recommendation"
        sub="A k-NN model trained on 2,200 real agro-climatic samples ranks the best crop for your soil and weather — and explains the reasoning factor by factor."
        right={
          <div className="flex rounded-xl border border-line bg-card p-1">
            {(["analyze", "whatif"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold transition-colors ${
                  tab === t ? "bg-leaf text-husk" : "text-inksoft hover:bg-linesoft"
                }`}
              >
                {t === "analyze" ? <Sprout size={13} /> : <SlidersHorizontal size={13} />}
                {t === "analyze" ? "Analyze" : "What-If Simulator"}
              </button>
            ))}
          </div>
        }
      />

      {tab === "analyze" ? (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* inputs */}
          <Card className="lg:col-span-2 animate-rise">
            <CardHeader title="Field conditions" sub="from your soil test & local weather" icon={<FlaskConical size={16} />} />
            <CardBody>
              <div className="space-y-4">
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-soil">Soil nutrients (kg/ha)</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="N"><TextInput type="number" min={0} max={300} value={inputs.N} onChange={setNum("N")} /></Field>
                    <Field label="P"><TextInput type="number" min={0} max={300} value={inputs.P} onChange={setNum("P")} /></Field>
                    <Field label="K"><TextInput type="number" min={0} max={300} value={inputs.K} onChange={setNum("K")} /></Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-sky">Environment</p>
                  <div className="grid grid-cols-3 gap-3">
                    <Field label="Temp °C"><TextInput type="number" min={-10} max={55} value={inputs.temperature} onChange={setNum("temperature")} /></Field>
                    <Field label="Humidity %"><TextInput type="number" min={0} max={100} value={inputs.humidity} onChange={setNum("humidity")} /></Field>
                    <Field label="Rain mm"><TextInput type="number" min={0} max={3000} value={inputs.rainfall} onChange={setNum("rainfall")} /></Field>
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-leaf">Soil pH</p>
                  <RangeInput value={inputs.ph} onChange={(v) => setInputs((x) => ({ ...x, ph: v }))} min={3} max={10} step={0.1} label="pH" unit="" />
                </div>
                <div>
                  <p className="mb-2 flex items-center gap-1 text-[11px] font-bold uppercase tracking-[0.14em] text-inksoft"><MapPin size={11} /> Location (optional)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="State">
                      <Select value={state} onChange={(e) => setState(e.target.value)}>
                        <option value="">—</option>
                        {STATES.map((s) => <option key={s}>{s}</option>)}
                      </Select>
                    </Field>
                    <Field label="District">
                      <TextInput value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="Optional" />
                    </Field>
                  </div>
                </div>
                <Button onClick={run} busy={busy} className="w-full" size="lg">
                  Analyze Field
                </Button>
              </div>
            </CardBody>
          </Card>

          {/* result */}
          <div className="space-y-5 lg:col-span-3">
            {error && <ErrorState message={error} retry={run} />}
            {!result && !error && (
              <Card>
                <CardBody>
                  {busy ? (
                    <Skeleton className="h-72 w-full" />
                  ) : (
                    <EmptyState
                      title="Run an analysis to see the recommendation"
                      sub="The model returns a suitability score, top-3 alternatives and a factor-by-factor explanation."
                    />
                  )}
                </CardBody>
              </Card>
            )}

            {result && (
              <>
                <Card className="animate-rise">
                  <CardBody className="flex flex-wrap items-center gap-6 py-6">
                    <Gauge value={result.score} label="Suitability" size={180} />
                    <div className="min-w-[200px] flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">{state || "Your field"} · recommended crop</p>
                      <p className="font-display text-4xl font-bold capitalize">{result.recommended_crop}</p>
                      <p className="mt-2 max-w-md text-[13px] leading-relaxed text-inksoft">
                        {result.explanation.positive_factors[0] ?? "Suitability score is a model agreement measure, not a guaranteed probability."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone="green">model: {result.model.name} {result.model.version}</Badge>
                        <Badge tone="sky">holdout acc. {pct(result.model.holdout_accuracy)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button variant="secondary" size="sm" onClick={save} busy={saving} disabled={saved}>
                        {saved ? <BookmarkCheck size={14} /> : <BookmarkPlus size={14} />} {saved ? "Saved" : "Save advisory"}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setChanged(inputs); setTab("whatif"); }}>
                        Try What-If →
                      </Button>
                    </div>
                  </CardBody>
                </Card>

                <div className="grid gap-5 md:grid-cols-2">
                  <Card className="animate-rise-1">
                    <CardHeader title="Why this recommendation?" sub="factor checks vs the learned crop profile" />
                    <CardBody>
                      <ul className="space-y-2.5">
                        {result.explanation.positive_factors.map((f: string, i: number) => (
                          <li key={i} className="flex gap-2 text-[13px] leading-snug">
                            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf" /> {f}
                          </li>
                        ))}
                        {result.explanation.limiting_factors.map((f: string, i: number) => (
                          <li key={`l${i}`} className="flex gap-2 text-[13px] leading-snug">
                            <AlertCircle size={15} className="mt-0.5 shrink-0 text-clay" /> {f}
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>

                  <Card className="animate-rise-2">
                    <CardHeader title="Feature contribution" sub="permutation importance × factor alignment" />
                    <CardBody>
                      <HBarChart
                        items={result.explanation.contributions.map((c: any) => ({
                          label: c.label,
                          value: c.weight,
                          status: c.status,
                        }))}
                        format={(v) => `${Math.round(v * 100)}%`}
                      />
                    </CardBody>
                  </Card>
                </div>

                <Card className="animate-rise-2">
                  <CardHeader title="Alternatives" sub="model ranking, top 3" />
                  <CardBody>
                    <ol className="grid gap-3 sm:grid-cols-3">
                      {result.alternatives.map((a: any, i: number) => (
                        <li key={a.crop} className={`rounded-xl border px-4 py-3 ${i === 0 ? "border-leaf/40 bg-sproutsoft" : "border-linesoft"}`}>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">#{i + 1}</p>
                          <p className="font-display text-lg font-bold capitalize">{a.crop}</p>
                          <p className="tabular text-sm font-semibold text-leaf">{pct(a.score)} suitability</p>
                        </li>
                      ))}
                    </ol>
                  </CardBody>
                </Card>
              </>
            )}
          </div>
        </div>
      ) : (
        /* ------------------------------ WHAT-IF ------------------------------ */
        <div className="grid gap-5 lg:grid-cols-2">
          <Card className="animate-rise">
            <CardHeader title="Change the conditions" sub="drag sliders to test hypothetical field states" icon={<SlidersHorizontal size={16} />} />
            <CardBody>
              <div className="space-y-4">
                <RangeInput label="Nitrogen" unit="kg/ha" min={0} max={160} value={changed.N} onChange={(v) => setChanged((c) => ({ ...c, N: v }))} />
                <RangeInput label="Phosphorus" unit="kg/ha" min={0} max={150} value={changed.P} onChange={(v) => setChanged((c) => ({ ...c, P: v }))} />
                <RangeInput label="Potassium" unit="kg/ha" min={0} max={210} value={changed.K} onChange={(v) => setChanged((c) => ({ ...c, K: v }))} />
                <RangeInput label="Temperature" unit="°C" min={8} max={45} step={0.5} value={changed.temperature} onChange={(v) => setChanged((c) => ({ ...c, temperature: v }))} />
                <RangeInput label="Humidity" unit="%" min={10} max={100} value={changed.humidity} onChange={(v) => setChanged((c) => ({ ...c, humidity: v }))} />
                <RangeInput label="pH" unit="" min={4} max={9.5} step={0.1} value={changed.ph} onChange={(v) => setChanged((c) => ({ ...c, ph: v }))} />
                <RangeInput label="Rainfall" unit="mm" min={20} max={350} step={5} value={changed.rainfall} onChange={(v) => setChanged((c) => ({ ...c, rainfall: v }))} />
                <Button onClick={runSim} busy={simBusy} className="w-full" size="lg">Re-run model with changes</Button>
                <button
                  className="w-full text-center text-xs font-bold text-inkfaint hover:text-leaf"
                  onClick={() => setChanged(inputs)}
                >
                  Reset to current inputs
                </button>
              </div>
            </CardBody>
          </Card>

          <div className="space-y-5">
            {simError && <ErrorState message={simError} retry={runSim} />}
            {!sim && !simError && (
              <Card><CardBody>{simBusy ? <Skeleton className="h-72 w-full" /> : <EmptyState title="Simulate to compare rankings" sub="The current ranking (from the Analyze tab inputs) will appear beside the changed scenario." />}</CardBody></Card>
            )}
            {sim && (
              <>
                <Card tone={sim.flips ? "green" : "default"} className="animate-rise">
                  <CardBody>
                    <p className="text-sm leading-relaxed">
                      <Thermometer size={0} className="hidden" />
                      {sim.narrative}
                    </p>
                  </CardBody>
                </Card>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Card className="animate-rise-1">
                    <CardHeader title="Current" sub="original inputs" />
                    <CardBody>
                      <p className="font-display text-2xl font-bold capitalize">{sim.current.recommended_crop}</p>
                      <p className="tabular text-sm font-semibold text-leaf">{pct(sim.current.score)}</p>
                      <ul className="mt-3 space-y-1.5">
                        {sim.current.alternatives.slice(1).map((a: any) => (
                          <li key={a.crop} className="flex justify-between text-xs text-inksoft">
                            <span className="capitalize">{a.crop}</span><span className="tabular">{pct(a.score)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                  <Card className="animate-rise-2">
                    <CardHeader title="Changed" sub="simulated inputs" right={sim.flips ? <Badge tone="harvest">ranking flipped</Badge> : <Badge tone="green">stable</Badge>} />
                    <CardBody>
                      <p className="font-display text-2xl font-bold capitalize">{sim.changed.recommended_crop}</p>
                      <p className="tabular text-sm font-semibold text-leaf">{pct(sim.changed.score)}</p>
                      <ul className="mt-3 space-y-1.5">
                        {sim.changed.alternatives.slice(1).map((a: any) => (
                          <li key={a.crop} className="flex justify-between text-xs text-inksoft">
                            <span className="capitalize">{a.crop}</span><span className="tabular">{pct(a.score)}</span>
                          </li>
                        ))}
                      </ul>
                    </CardBody>
                  </Card>
                </div>
                {sim.deltas?.length > 0 && (
                  <Card className="animate-rise-2">
                    <CardHeader title="What you changed" />
                    <CardBody>
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                        {sim.deltas.map((d: any) => (
                          <div key={d.feature} className="rounded-lg bg-husk px-3 py-2 text-xs">
                            <p className="font-bold uppercase tracking-wide text-inkfaint">{d.label}</p>
                            <p className="tabular font-semibold">{d.from} → {d.to}</p>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
