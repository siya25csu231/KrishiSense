"use client";

import { useCallback, useEffect, useState } from "react";
import { MapPinned, Plus, Trash2, Pencil, Search, X } from "lucide-react";
import { fieldsApi, weatherApi, ApiError, type FieldRecord } from "@/lib/api";
import {
  Card, CardBody, Button, Field, TextInput, Select, Badge, Skeleton, EmptyState, ErrorState,
} from "@/components/ui";
import { PageHeader } from "@/components/layout";

const SOILS = ["Loamy", "Clay", "Clay loam", "Sandy", "Sandy loam", "Silt", "Black (Regur)", "Red", "Laterite", "Alluvial"];
const SEASONS = ["Kharif", "Rabi", "Zaid"];
const CROPS = ["Rice", "Wheat", "Maize", "Cotton", "Sugarcane", "Soybean", "Groundnut", "Mustard", "Potato", "Onion", "Banana", "Chickpea", "Pigeonpea", "Jute", "Tomato", "Coffee"];

const empty = {
  name: "", areaAcres: "1", location: "", soilType: "Loamy",
  nitrogen: "80", phosphorus: "45", potassium: "40", ph: "6.8",
  currentCrop: "", previousCrop: "", season: "Kharif",
};

export default function FieldsPage() {
  const [list, setList] = useState<FieldRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<FieldRecord | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fieldsApi.list();
      setList(res.fields);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load fields.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        kicker="Field management"
        title="Your fields"
        sub="Each field stores soil test values, location and cropping history. Every intelligence module personalizes around these."
        right={
          <Button onClick={() => setEditing("new")}>
            <Plus size={15} /> Add field
          </Button>
        }
      />

      {error && <ErrorState message={error} retry={load} />}
      {!list && !error && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <Card key={i}><CardBody><Skeleton className="h-36 w-full" /></CardBody></Card>
          ))}
        </div>
      )}

      {list && list.length === 0 && !editing && (
        <EmptyState
          title="Create your first field to unlock personalized recommendations"
          sub="Enter soil test values (N, P, K, pH) from your Soil Health Card and the platform will tailor crop, fertilizer, pest and market advice to it."
          action={<Button size="sm" onClick={() => setEditing("new")}><Plus size={14} /> Create field</Button>}
        />
      )}

      {list && list.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          {list.map((f) => (
            <Card key={f.id} className="animate-rise">
              <CardBody>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-display text-lg font-bold">{f.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-inkfaint">
                      <MapPinned size={12} /> {f.location ?? "No location"} · {f.areaAcres} acres · {f.season ?? "—"}
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => setEditing(f)} className="rounded-lg border border-line p-1.5 text-inksoft hover:border-leaf/50" aria-label="Edit">
                      <Pencil size={13} />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`Delete field "${f.name}"?`)) {
                          await fieldsApi.remove(f.id);
                          load();
                        }
                      }}
                      className="rounded-lg border border-line p-1.5 text-clay hover:border-clay/50"
                      aria-label="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center">
                  {[
                    ["N", f.nitrogen], ["P", f.phosphorus], ["K", f.potassium], ["pH", f.ph],
                  ].map(([label, v]) => (
                    <div key={label as string} className="rounded-lg bg-husk px-2 py-2">
                      <p className="text-[10px] font-bold uppercase text-inkfaint">{label}</p>
                      <p className="tabular text-sm font-bold">{v ?? "—"}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {f.soilType && <Badge tone="soil">{f.soilType}</Badge>}
                  {f.currentCrop && <Badge tone="green">Now: {f.currentCrop}</Badge>}
                  {f.previousCrop && <Badge>Prev: {f.previousCrop}</Badge>}
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {editing && (
        <FieldForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function FieldForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: FieldRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(() =>
    initial
      ? {
          name: initial.name,
          areaAcres: String(initial.areaAcres),
          location: initial.location ?? "",
          soilType: initial.soilType ?? "Loamy",
          nitrogen: initial.nitrogen != null ? String(initial.nitrogen) : "",
          phosphorus: initial.phosphorus != null ? String(initial.phosphorus) : "",
          potassium: initial.potassium != null ? String(initial.potassium) : "",
          ph: initial.ph != null ? String(initial.ph) : "",
          currentCrop: initial.currentCrop ?? "",
          previousCrop: initial.previousCrop ?? "",
          season: initial.season ?? "Kharif",
          latitude: initial.latitude,
          longitude: initial.longitude,
        }
      : { ...empty, latitude: null as number | null, longitude: null as number | null }
  );
  const [busy, setBusy] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoResults, setGeoResults] = useState<{ name: string; lat: number; lon: number }[] | null>(null);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const locate = async () => {
    if (!form.location) return;
    setSearching(true);
    setGeoResults(null);
    try {
      const res = await weatherApi.geocode(form.location);
      setGeoResults(res.results);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Location search failed.");
    } finally {
      setSearching(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload: Record<string, unknown> = {
      name: form.name,
      areaAcres: Number(form.areaAcres),
      location: form.location || null,
      soilType: form.soilType || null,
      nitrogen: form.nitrogen ? Number(form.nitrogen) : null,
      phosphorus: form.phosphorus ? Number(form.phosphorus) : null,
      potassium: form.potassium ? Number(form.potassium) : null,
      ph: form.ph ? Number(form.ph) : null,
      currentCrop: form.currentCrop || null,
      previousCrop: form.previousCrop || null,
      season: form.season || null,
      latitude: form.latitude,
      longitude: form.longitude,
    };
    try {
      if (initial) await fieldsApi.update(initial.id, payload);
      else await fieldsApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save field.");
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 sm:items-center" role="dialog" aria-modal>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-line bg-card p-6 sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-xl font-bold">{initial ? "Edit field" : "New field"}</h3>
          <button onClick={onClose} aria-label="Close"><X size={18} /></button>
        </div>

        {error && <div className="mb-4"><ErrorState message={error} /></div>}

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Field name">
            <TextInput value={form.name} onChange={set("name")} placeholder="e.g. North Farm" required />
          </Field>
          <Field label="Area (acres)">
            <TextInput type="number" step="0.1" min="0.1" value={form.areaAcres} onChange={set("areaAcres")} required />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Location" hint="Type a city/district, then press Locate to fetch coordinates (OpenStreetMap)">
              <div className="flex gap-2">
                <TextInput value={form.location} onChange={set("location")} placeholder="e.g. Faridabad, Haryana" />
                <Button variant="secondary" onClick={locate} busy={searching}>
                  <Search size={14} /> Locate
                </Button>
              </div>
            </Field>
            {geoResults && geoResults.length > 0 && (
              <div className="mt-2 space-y-1">
                {geoResults.map((r) => (
                  <button
                    key={r.name}
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, latitude: r.lat, longitude: r.lon, location: r.name.split(",").slice(0, 2).join(",") }));
                      setGeoResults(null);
                    }}
                    className="block w-full truncate rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-leaf/50"
                  >
                    {r.name}
                  </button>
                ))}
              </div>
            )}
            {(form.latitude ?? form.longitude) && (
              <p className="mt-1 text-[11px] text-leaf">
                ✓ Coordinates set: {form.latitude?.toFixed(3)}, {form.longitude?.toFixed(3)}
              </p>
            )}
          </div>

          <Field label="Soil type">
            <Select value={form.soilType} onChange={set("soilType")}>
              {SOILS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Season">
            <Select value={form.season} onChange={set("season")}>
              {SEASONS.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <Field label="N (kg/ha)"><TextInput type="number" step="1" min="0" max="300" value={form.nitrogen} onChange={set("nitrogen")} /></Field>
            <Field label="P (kg/ha)"><TextInput type="number" step="1" min="0" max="300" value={form.phosphorus} onChange={set("phosphorus")} /></Field>
            <Field label="K (kg/ha)"><TextInput type="number" step="1" min="0" max="300" value={form.potassium} onChange={set("potassium")} /></Field>
            <Field label="pH"><TextInput type="number" step="0.1" min="0" max="14" value={form.ph} onChange={set("ph")} /></Field>
          </div>

          <Field label="Current crop">
            <Select value={form.currentCrop} onChange={set("currentCrop")}>
              <option value="">Select…</option>
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>
          <Field label="Previous crop">
            <Select value={form.previousCrop} onChange={set("previousCrop")}>
              <option value="">Select…</option>
              {CROPS.map((c) => <option key={c}>{c}</option>)}
            </Select>
          </Field>

          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" busy={busy} className="flex-1">{initial ? "Save changes" : "Create field"}</Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
