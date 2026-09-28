import Link from "next/link";
import {
  Leaf,
  Sprout,
  ScanLine,
  CloudSun,
  Store,
  Wheat,
  Coins,
  ArrowRight,
  Map,
  FlaskConical,
  Gauge as GaugeIcon,
  Radar,
  BrainCircuit,
  Eye,
  ChartColumn,
  Lightbulb,
  Database,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
} from "lucide-react";

export default function LandingPage() {
  return (
    <main className="bg-husk text-ink">
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-line bg-husk/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-leaf text-husk">
              <Leaf size={18} />
            </span>
            <span className="font-display text-lg font-bold tracking-tight">
              Krishi<span className="text-leaf">Sense</span> <span className="text-soil">AI</span>
            </span>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="rounded-lg px-4 py-2 text-sm font-bold text-inksoft hover:text-leaf">
              Sign in
            </Link>
            <Link href="/register" className="rounded-lg bg-leaf px-4 py-2 text-sm font-bold text-husk transition-colors hover:bg-leafdark">
              Start Farm Analysis
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-14 lg:grid-cols-2">
        <div className="animate-rise">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-line bg-card px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-soil">
            <Radar size={12} /> Explainable Smart Crop Advisory · SIH25010
          </p>
          <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Smarter decisions
            <br />
            for every field.
          </h1>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-inksoft">
            AI-powered insights for soil, crops, weather and markets — trained on real
            agricultural datasets, and built to explain <em>why</em>, not just <em>what</em>.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/register" className="inline-flex items-center gap-2 rounded-xl bg-leaf px-6 py-3 text-[15px] font-bold text-husk transition-colors hover:bg-leafdark">
              Start Farm Analysis <ArrowRight size={16} />
            </Link>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-6 py-3 text-[15px] font-bold text-ink transition-colors hover:border-leaf/50">
              Explore Platform
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs font-semibold text-inksoft">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-leaf" /> Real datasets, live-evaluated models</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-leaf" /> Free-first, no paid AI APIs</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-leaf" /> English + हिन्दी</span>
          </div>
        </div>

        <div className="relative animate-rise-1">
          <img
            src="/images/hero-farm.jpg"
            alt="Aerial view of Indian farmland with green crop plots"
            className="aspect-[4/3] w-full rounded-2xl border border-line object-cover shadow-lg"
          />
          {/* floating sample insight card */}
          <div className="absolute -bottom-6 left-4 right-4 rounded-xl border border-line bg-card/95 p-4 shadow-xl backdrop-blur sm:left-8 sm:right-auto sm:w-80">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-soil">Sample recommendation</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="font-display text-2xl font-bold">Rice <span className="text-base font-semibold text-leaf">· 91% suitability</span></p>
            </div>
            <div className="mt-2 space-y-1">
              {[
                ["Rainfall 182 mm", 92, "positive"],
                ["Humidity 72%", 74, "positive"],
                ["Nitrogen 82", 48, "neutral"],
              ].map(([label, w, status]) => (
                <div key={label as string} className="flex items-center gap-2 text-[11px]">
                  <span className="w-24 shrink-0 font-semibold text-inksoft">{label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-linesoft">
                    <div className="h-full rounded-full" style={{ width: `${w}%`, background: status === "positive" ? "#2d6a3f" : "#9a6a3c" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-y border-line bg-card py-16">
        <div className="mx-auto max-w-6xl px-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">Platform modules</p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">One command center for the whole farm</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Sprout, title: "Crop Intelligence", text: "k-NN model ranks the best crop from soil N-P-K, pH and weather — with factor-by-factor reasoning." },
              { icon: ScanLine, title: "Disease Vision", text: "Upload a leaf photo for colour-signature screening of blight, rust, mildew and virus conditions." },
              { icon: CloudSun, title: "Weather Intelligence", text: "Open-Meteo forecasts converted into drainage, spraying and irrigation advisories." },
              { icon: Store, title: "Market Insights", text: "agmarknet price history, trend direction and a transparent 3-month planning estimate." },
              { icon: Wheat, title: "Yield Prediction", text: "Reference yields adjusted by agro-climatic suitability — always labelled as estimates." },
              { icon: Coins, title: "Profit Planning", text: "Revenue, cost structure and breakeven yield with market-linked price defaults." },
            ].map((f) => (
              <div key={f.title} className="group rounded-xl border border-line bg-husk p-5 transition-all hover:-translate-y-0.5 hover:border-leaf/40 hover:shadow-md">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sproutsoft text-leaf transition-colors group-hover:bg-leaf group-hover:text-husk">
                  <f.icon size={19} />
                </span>
                <h3 className="mt-3 font-display text-[17px] font-bold">{f.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-inksoft">{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">How it works</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">From field to decision in four steps</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { n: "01", icon: Map, title: "Add your field", text: "Soil test values, location, crops and area — your field becomes the context for everything." },
            { n: "02", icon: FlaskConical, title: "Analyze conditions", text: "Weather is fetched, soil is checked against learned crop profiles, pest risk is screened." },
            { n: "03", icon: GaugeIcon, title: "Get recommendations", text: "Ranked crops with suitability scores, explanations and alternatives — plus a What-If simulator." },
            { n: "04", icon: Radar, title: "Monitor results", text: "Smart alerts, market movement and your full prediction history keep you updated daily." },
          ].map((s) => (
            <div key={s.n} className="relative rounded-xl border border-line bg-card p-5">
              <span className="font-display text-3xl font-bold text-line">{s.n}</span>
              <s.icon size={18} className="absolute right-5 top-5 text-soil" />
              <h3 className="mt-2 font-display text-[16px] font-bold">{s.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-inksoft">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Explainability */}
      <section className="bg-leafdeep py-16 text-husk">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sprout">The core differentiator</p>
            <h2 className="mt-2 font-display text-4xl font-semibold leading-tight">
              Not just a prediction.
              <br />
              <span className="text-sprout">A reason.</span>
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-husk/70">
              Most advisory tools output a label. KrishiSense answers three questions for every
              recommendation — and shows the live model evaluation behind them.
            </p>
            <div className="mt-6 space-y-3">
              {[
                { icon: Lightbulb, q: "What?", a: "Recommended crop: Rice — 91% suitability score." },
                { icon: Eye, q: "Why?", a: "Rainfall and temperature strongly matched the learned rice profile; feature-importance bars show each factor's weight." },
                { icon: SlidersHorizontal, q: "What if?", a: "Drop rainfall to 110 mm and the simulator re-ranks the model: maize takes the lead." },
              ].map((x) => (
                <div key={x.q} className="flex gap-3 rounded-xl border border-husk/15 bg-husk/5 px-4 py-3">
                  <x.icon size={17} className="mt-0.5 shrink-0 text-sprout" />
                  <p className="text-[13px] leading-relaxed text-husk/85">
                    <span className="font-bold text-husk">{x.q} </span>
                    {x.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-husk/15 bg-husk/5 p-6">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-sprout">Explainability panel (live app)</p>
              <span className="rounded-full bg-sprout/20 px-2.5 py-0.5 text-[10px] font-bold text-sprout">why this crop</span>
            </div>
            <div className="mt-4 space-y-2.5">
              {[
                { ok: true, text: "Rainfall of 182 mm sits well inside the typical rice range (87–272 mm)." },
                { ok: true, text: "Temperature 26°C matches the rice profile (24 ± 3.4°C)." },
                { ok: true, text: "Humidity 72% is within the preferred band." },
                { ok: false, text: "Phosphorus 28 is below the typical rice range (47–71)." },
              ].map((r, i) => (
                <div key={i} className="flex gap-2.5 rounded-lg bg-leafdark/60 px-3.5 py-2.5 text-[13px] leading-snug">
                  {r.ok ? <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-sprout" /> : <AlertCircle size={15} className="mt-0.5 shrink-0 text-harvest" />}
                  {r.text}
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-leafdark/60 px-3.5 py-3">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-husk/60">Feature contribution</p>
              {[
                ["Rainfall", 86],
                ["Humidity", 72],
                ["Temperature", 64],
                ["Nitrogen", 44],
                ["pH", 31],
              ].map(([label, w]) => (
                <div key={label} className="mb-1.5 flex items-center gap-2 text-[11px]">
                  <span className="w-20 shrink-0 text-husk/70">{label}</span>
                  <div className="h-1.5 flex-1 rounded-full bg-husk/10">
                    <div className="h-full rounded-full bg-sprout" style={{ width: `${w}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Academic / tech */}
      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid items-start gap-10 lg:grid-cols-2">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">Academic core</p>
            <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight">
              A research-grade pipeline behind a farmer-friendly app
            </h2>
            <p className="mt-4 text-[14px] leading-relaxed text-inksoft">
              The same pipeline used by the web platform is documented for the academic report:
              dataset analysis, preprocessing, four model families compared on an identical
              holdout split, permutation feature importance, and locally-explained predictions.
              A Python/scikit-learn training script (<code className="rounded bg-linesoft px-1.5 py-0.5 text-xs">scripts/train_crop_model.py</code>) ships with the repo.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { icon: BrainCircuit, label: "Machine Learning", text: "k-NN, decision tree, forest, Naive Bayes" },
                { icon: Eye, label: "Computer Vision", text: "Leaf colour-signature screening" },
                { icon: ChartColumn, label: "Data Analytics", text: "agmarknet prices, weather trends" },
                { icon: Lightbulb, label: "Explainable AI", text: "Permutation importance + factor checks" },
              ].map((t) => (
                <div key={t.label} className="rounded-xl border border-line bg-card p-4">
                  <t.icon size={18} className="text-leaf" />
                  <p className="mt-2 text-sm font-bold">{t.label}</p>
                  <p className="mt-0.5 text-[12px] leading-snug text-inksoft">{t.text}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6">
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-soil">
              <Database size={13} /> Datasets bundled with the project
            </p>
            <ul className="mt-4 space-y-3">
              {[
                ["Crop_recommendation.csv", "2,200 samples · 22 crops · trains the crop model"],
                ["agmarknet_india_historical_prices_2024–25", "state-level mandi prices → market module"],
                ["india_crop_pest_knowledge_base_v1.json", "45 crops · ICAR-based pest advisories"],
                ["fertlizer_recommendation_dataset.csv", "nutrient targets for the rule-based advisor"],
                ["state_crop_recommendations.json", "state-wise crop & season guidance"],
                ["yield_state_districts.json", "state → district lookup for yield pages"],
              ].map(([name, desc]) => (
                <li key={name} className="rounded-lg bg-husk px-3.5 py-2.5">
                  <p className="text-[13px] font-bold">{name}</p>
                  <p className="text-[12px] text-inksoft">{desc}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-[11px] leading-relaxed text-inkfaint">
              Source: 7H-ANKUR/CROP-ADVISORY-SIH25010 (GPL-3.0) — reused with attribution under the same licence terms.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-line bg-card py-16 text-center">
        <div className="mx-auto max-w-2xl px-5">
          <h2 className="font-display text-3xl font-semibold tracking-tight">
            Try the full demo farm in one click
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-inksoft">
            A pre-configured demo account (2 fields, soil data, history) is available for
            presentations — or create your own account in 30 seconds.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href="/login" className="rounded-xl bg-leaf px-6 py-3 text-[15px] font-bold text-husk hover:bg-leafdark">
              Open demo login
            </Link>
            <Link href="/register" className="rounded-xl border border-line bg-husk px-6 py-3 text-[15px] font-bold hover:border-leaf/50">
              Create account
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-line bg-husk py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 text-xs text-inkfaint">
          <p className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded bg-leaf text-husk"><Leaf size={12} /></span>
            KrishiSense AI · B.Tech AIML academic project · decision support, not guarantees
          </p>
          <p>Datasets © their respective owners · reference repo GPL-3.0 · weather: Open-Meteo · geocoding: OpenStreetMap</p>
        </div>
      </footer>
    </main>
  );
}
