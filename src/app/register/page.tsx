"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, ArrowLeft } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";
import { Button, Field, TextInput, Select, ErrorState } from "@/components/ui";

const STATES = [
  "Andhra Pradesh", "Assam", "Bihar", "Chhattisgarh", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Odisha", "Punjab", "Rajasthan", "Tamil Nadu", "Telangana",
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
];

const SOILS = ["Loamy", "Clay", "Clay loam", "Sandy", "Sandy loam", "Silt", "Black (Regur)", "Red", "Laterite", "Alluvial"];

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    state: "",
    district: "",
    village: "",
    farmSizeAcres: "",
    soilType: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.register({
        ...form,
        farmSizeAcres: form.farmSizeAcres ? Number(form.farmSizeAcres) : undefined,
      });
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Registration failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-lg animate-rise">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-husk">
              <Leaf size={18} />
            </span>
            <span className="font-display text-lg font-bold">
              Krishi<span className="text-leaf">Sense</span> AI
            </span>
          </div>
          <a href="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-inkfaint hover:text-leaf">
            <ArrowLeft size={13} /> Home
          </a>
        </div>

        <h1 className="font-display text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-inksoft">
          Your profile powers personalized advisories — you can refine it anytime.
        </p>

        {error && (
          <div className="mt-5">
            <ErrorState message={error} />
          </div>
        )}

        <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Full name">
              <TextInput value={form.name} onChange={set("name")} placeholder="e.g. Ramesh Kumar" required />
            </Field>
          </div>
          <Field label="Email">
            <TextInput type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" required />
          </Field>
          <Field label="Password" hint="At least 6 characters">
            <TextInput type="password" value={form.password} onChange={set("password")} required />
          </Field>
          <Field label="State">
            <Select value={form.state} onChange={set("state")}>
              <option value="">Select…</option>
              {STATES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </Select>
          </Field>
          <Field label="District">
            <TextInput value={form.district} onChange={set("district")} placeholder="e.g. Faridabad" />
          </Field>
          <Field label="Village / City">
            <TextInput value={form.village} onChange={set("village")} placeholder="Optional" />
          </Field>
          <Field label="Farm size (acres)">
            <TextInput type="number" step="0.1" min="0.1" value={form.farmSizeAcres} onChange={set("farmSizeAcres")} placeholder="e.g. 2.5" />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Soil type">
              <Select value={form.soilType} onChange={set("soilType")}>
                <option value="">Select…</option>
                {SOILS.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" busy={busy} className="w-full" size="lg">
              Create account & open dashboard
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-inksoft">
          Already registered?{" "}
          <a href="/login" className="font-bold text-leaf hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
