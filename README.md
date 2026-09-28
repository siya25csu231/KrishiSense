# KrishiSense AI — Explainable Smart Crop Advisory & Farm Intelligence Platform

An intelligent agricultural decision-support platform for Indian farmers, students and researchers. Based on the **SIH25010** Smart Crop Advisory problem statement  (GPL-3.0 — datasets and knowledge bases reused with attribution).

> **Core idea:** don't just tell the farmer *what* to grow — explain *why*, show *alternatives*, and let them test *what-if*.

## ✨ Features

| Module | What it does |
|---|---|
| **Crop Intelligence** | k-NN model (trained on the real 2,200-sample dataset at server start) ranks crops with suitability scores, factor-by-factor explanations, feature-contribution bars, top-3 alternatives and a **What-If simulator** |
| **Disease Scan** | Leaf photo → in-browser colour-signature analysis → screening of blight/rust/mildew/virus/healthy with symptoms, causes, prevention (clearly labelled screening aid) |
| **Weather** | Open-Meteo live forecast (no API key) converted into farm advisories — drainage, spray windows, irrigation |
| **Market Insights** | Bundled agmarknet 2024–25 mandi prices, trend analysis, transparent 3-month planning estimate |
| **Yield Prediction** | Reference yields adjusted by agro-climatic suitability, with every assumption listed |
| **Profit Planner** | Revenue/cost/margin, donut cost structure, breakeven yield, market-linked price defaults |
| **Rotation Planner** | Family-aware multi-season timeline with reasons (legume nitrogen fixation etc.) |
| **Fertilizer Guide** | Rule-based N-P-K/pH status + organic options from the bundled lookup |
| **Pest Alerts** | ICAR-based pest knowledge base (45 crops) + weather-condition risk engine |
| **Smart Alerts** | Weather + pest + market aggregated daily with severity ranking |
| **Community / Schemes / History / Profile / Model Lab** | Posts & comments, government scheme directory, prediction history + saved advisories, live model-evaluation dashboard |
| **Assistant** | Rule-based agricultural knowledge bot (no external AI dependency) |
| **i18n** | English + हिन्दी |

## 🧱 Tech Stack

- **Next.js (App Router) + React + TypeScript + Tailwind CSS v4**
- **PostgreSQL + Drizzle ORM**
- **ML**: k-NN (primary), Decision Tree, Random-Forest-lite, Gaussian Naive Bayes — evaluated live, seed-reproducible
- **External**: Open-Meteo (weather, keyless), OpenStreetMap Nominatim (geocoding, keyless)
- **Academic**: `scripts/train_crop_model.py` — identical scikit-learn pipeline for the report/notebook

## 📁 Datasets (bundled in `datasets/`)

All from the reference repository (GPL-3.0):

- `Crop_recommendation.csv` — 2,200 samples, 22 crops → crop model
- `market_monthly.csv` — agmarknet 2024–25 monthly state averages → market module
- `india_crop_pest_knowledge_base_v1.json` — 45 crops, pest advisories
- `state_crop_recommendations.json`, `yield_state_districts.json`, `organic_fertilizer_lookup_v1.json`

## 🚀 Quick Start

```bash
npm install
cp .env.example .env          # set DATABASE_URL
npx drizzle-kit push          # create tables
npm run dev                   # http://localhost:3000
```

One-click demo: login page → **"Explore the live demo farm"** (`demo@krishisense.in` / `demo1234`).

📄 **`setup.txt`** — exhaustive from-scratch installation guide (tools, DB options, API keys, deployment, troubleshooting).
📄 **`architecture.txt`** — deep architecture + pitch document (every flow, every API, every feature explained).

## 🧪 API (summary)

```
POST /api/recommend   POST /api/disease    GET  /api/weather
GET  /api/market      POST /api/agro       GET  /api/alerts
GET/POST /api/fields  GET  /api/history    GET  /api/models
POST /api/assistant   GET/PATCH /api/profile   …(see architecture.txt)
```

## 🔒 Honesty policy

Suitability scores are never called guarantees · market data is "latest available", never "live" · rule-based modules are labelled rule-based · disease screening is labelled a screening aid · yield outputs are estimates with assumptions.

## 📜 License & Attribution

Datasets and knowledge bases © their original authors via `7H-ANKUR/CROP-ADVISORY-SIH25010` (GPL-3.0). This academic project reuses them with attribution under the same licence terms.
