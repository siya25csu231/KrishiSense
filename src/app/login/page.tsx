"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Leaf, PlayCircle, ArrowLeft } from "lucide-react";
import { authApi, ApiError } from "@/lib/api";
import { Button, Field, TextInput, ErrorState } from "@/components/ui";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authApi.login(email, password);
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Login failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const demo = async () => {
    setDemoBusy(true);
    setError(null);
    try {
      await authApi.demo();
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Demo login failed.");
    } finally {
      setDemoBusy(false);
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <section className="hidden flex-col justify-between bg-leafdeep p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-husk">
            <Leaf size={18} />
          </span>
          <span className="font-display text-lg font-bold text-husk">
            Krishi<span className="text-sprout">Sense</span> AI
          </span>
        </div>
        <div>
          <h2 className="font-display text-4xl font-semibold leading-tight text-husk">
            Not just a prediction.
            <br />
            <span className="text-sprout">A reason.</span>
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-husk/70">
            Explainable crop recommendation, disease screening, weather and market
            intelligence — trained on real datasets, evaluated live, free-first by design.
          </p>
        </div>
        <p className="text-xs text-husk/40">B.Tech AIML project · SIH25010 line · GPL-3.0 attribution</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-rise">
          <a href="/" className="mb-8 inline-flex items-center gap-1.5 text-xs font-bold text-inkfaint hover:text-leaf">
            <ArrowLeft size={13} /> Back to home
          </a>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1.5 text-sm text-inksoft">Sign in to your farm dashboard.</p>

          {error && (
            <div className="mt-5">
              <ErrorState message={error} />
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email">
              <TextInput
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                required
              />
            </Field>
            <Field label="Password">
              <TextInput
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </Field>
            <Button type="submit" busy={busy} className="w-full" size="lg">
              Sign in
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3 text-[11px] font-bold uppercase tracking-wide text-inkfaint">
            <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
          </div>

          <Button variant="secondary" onClick={demo} busy={demoBusy} className="w-full">
            <PlayCircle size={15} /> Explore the live demo farm
          </Button>

          <p className="mt-6 text-center text-xs text-inksoft">
            New here?{" "}
            <a href="/register" className="font-bold text-leaf hover:underline">
              Create an account
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
