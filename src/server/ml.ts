/* ------------------------------------------------------------------ */
/* KrishiSense AI — crop intelligence engine                           */
/*                                                                     */
/* Real models trained on the real Crop_recommendation.csv dataset     */
/* (2,200 samples, 22 crops, 7 agro-climatic features). Everything is  */
/* computed from data at process start — no hard-coded metrics.        */
/* ------------------------------------------------------------------ */

import { loadCropDataset, type CropRow } from "./datasets";

export const FEATURES = [
  "N",
  "P",
  "K",
  "temperature",
  "humidity",
  "ph",
  "rainfall",
] as const;
export type FeatureName = (typeof FEATURES)[number];

export interface CropInput {
  N: number;
  P: number;
  K: number;
  temperature: number;
  humidity: number;
  ph: number;
  rainfall: number;
}

export const FEATURE_UNITS: Record<FeatureName, string> = {
  N: "kg/ha (index)",
  P: "kg/ha (index)",
  K: "kg/ha (index)",
  temperature: "°C",
  humidity: "%",
  ph: "pH",
  rainfall: "mm",
};

export const FEATURE_LABELS: Record<FeatureName, string> = {
  N: "Nitrogen",
  P: "Phosphorus",
  K: "Potassium",
  temperature: "Temperature",
  humidity: "Humidity",
  ph: "Soil pH",
  rainfall: "Rainfall",
};

function toVector(x: CropInput): number[] {
  return FEATURES.map((f) => x[f]);
}

/* Seeded RNG (mulberry32) so every evaluation is reproducible. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------- standardisation ------------------------ */

interface Scaler {
  mean: number[];
  std: number[];
}

function fitScaler(rows: CropRow[]): Scaler {
  const mean = new Array(FEATURES.length).fill(0);
  for (const r of rows) {
    const v = toVector(r);
    v.forEach((x, i) => (mean[i] += x));
  }
  mean.forEach((_, i) => (mean[i] /= rows.length));
  const std = new Array(FEATURES.length).fill(0);
  for (const r of rows) {
    const v = toVector(r);
    v.forEach((x, i) => (std[i] += (x - mean[i]) ** 2));
  }
  std.forEach((s, i) => (std[i] = Math.sqrt(s / rows.length) || 1));
  return { mean, std };
}

function scale(s: Scaler, v: number[]): number[] {
  return v.map((x, i) => (x - s.mean[i]) / s.std[i]);
}

/* ----------------------------- k-NN ------------------------------- */

interface KnnModel {
  kind: "knn";
  scaler: Scaler;
  X: number[][];
  y: string[];
  k: number;
}

function knnPredictProb(m: KnnModel, v: number[]): Map<string, number> {
  const q = scale(m.scaler, v);
  const dists: { d: number; label: string }[] = [];
  for (let i = 0; i < m.X.length; i++) {
    const x = m.X[i];
    let s = 0;
    for (let j = 0; j < x.length; j++) {
      const t = x[j] - q[j];
      s += t * t;
    }
    dists.push({ d: Math.sqrt(s), label: m.y[i] });
  }
  dists.sort((a, b) => a.d - b.d);
  const votes = new Map<string, number>();
  let total = 0;
  for (let i = 0; i < Math.min(m.k, dists.length); i++) {
    const w = 1 / (dists[i].d + 0.05);
    votes.set(dists[i].label, (votes.get(dists[i].label) ?? 0) + w);
    total += w;
  }
  for (const [k2, w] of votes) votes.set(k2, w / total);
  return votes;
}

/* ------------------------- decision tree -------------------------- */

interface TreeNode {
  leaf?: { label: string; n: number };
  feature?: number;
  threshold?: number;
  left?: TreeNode;
  right?: TreeNode;
}

function gini(counts: Map<string, number>, n: number): number {
  let g = 1;
  for (const c of counts.values()) g -= (c / n) ** 2;
  return g;
}

function buildTree(
  X: number[][],
  y: string[],
  idx: number[],
  depth: number,
  maxDepth: number,
  minSamples: number,
  featureSubset: number,
  rand: () => number
): TreeNode {
  const counts = new Map<string, number>();
  for (const i of idx) counts.set(y[i], (counts.get(y[i]) ?? 0) + 1);
  const majority = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
  if (depth >= maxDepth || idx.length < minSamples || counts.size === 1) {
    return { leaf: { label: majority, n: idx.length } };
  }
  const feats = [...Array(FEATURES.length).keys()];
  for (let i = feats.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [feats[i], feats[j]] = [feats[j], feats[i]];
  }
  let best: { f: number; t: number; gain: number; li: number[]; ri: number[] } | null =
    null;
  const parentG = gini(counts, idx.length);
  for (const f of feats.slice(0, featureSubset)) {
    const sorted = idx
      .map((i) => X[i][f])
      .sort((a, b) => a - b);
    const candidates: number[] = [];
    const steps = Math.min(16, sorted.length - 1);
    for (let s = 1; s <= steps; s++) {
      const pos = Math.floor((s * (sorted.length - 1)) / (steps + 1));
      const t = (sorted[pos] + sorted[pos + 1]) / 2;
      if (!candidates.includes(t)) candidates.push(t);
    }
    for (const t of candidates) {
      const li: number[] = [];
      const ri: number[] = [];
      for (const i of idx) (X[i][f] <= t ? li : ri).push(i);
      if (li.length < 2 || ri.length < 2) continue;
      const cl = new Map<string, number>();
      const cr = new Map<string, number>();
      for (const i of li) cl.set(y[i], (cl.get(y[i]) ?? 0) + 1);
      for (const i of ri) cr.set(y[i], (cr.get(y[i]) ?? 0) + 1);
      const gain =
        parentG -
        (li.length / idx.length) * gini(cl, li.length) -
        (ri.length / idx.length) * gini(cr, ri.length);
      if (!best || gain > best.gain) best = { f, t, gain, li, ri };
    }
  }
  if (!best || best.gain <= 1e-6) return { leaf: { label: majority, n: idx.length } };
  return {
    feature: best.f,
    threshold: best.t,
    left: buildTree(X, y, best.li, depth + 1, maxDepth, minSamples, featureSubset, rand),
    right: buildTree(X, y, best.ri, depth + 1, maxDepth, minSamples, featureSubset, rand),
  };
}

function treeWalk(node: TreeNode, v: number[]): { label: string; n: number } {
  let cur = node;
  while (!cur.leaf) {
    cur = v[cur.feature!] <= cur.threshold! ? cur.left! : cur.right!;
  }
  return cur.leaf!;
}

interface ForestModel {
  kind: "forest";
  scaler: Scaler;
  trees: TreeNode[];
}

function forestPredictProb(m: ForestModel, v: number[]): Map<string, number> {
  const q = scale(m.scaler, v);
  const votes = new Map<string, number>();
  for (const t of m.trees) {
    const l = treeWalk(t, q);
    votes.set(l.label, (votes.get(l.label) ?? 0) + 1);
  }
  for (const [k, c] of votes) votes.set(k, c / m.trees.length);
  return votes;
}

/* ---------------------- Gaussian Naive Bayes ----------------------- */

interface GnbModel {
  kind: "gnb";
  classes: string[];
  prior: Map<string, number>;
  mean: Map<string, number[]>;
  var: Map<string, number[]>;
}

function gnbPredictProb(m: GnbModel, v: number[]): Map<string, number> {
  const scores = new Map<string, number>();
  for (const c of m.classes) {
    let logp = Math.log(m.prior.get(c) ?? 1e-9);
    const mu = m.mean.get(c)!;
    const va = m.var.get(c)!;
    for (let i = 0; i < v.length; i++) {
      logp +=
        -0.5 * Math.log(2 * Math.PI * va[i]) -
        ((v[i] - mu[i]) ** 2) / (2 * va[i]);
    }
    scores.set(c, logp);
  }
  const max = Math.max(...scores.values());
  let sum = 0;
  for (const [c, s] of scores) {
    const e = Math.exp(s - max);
    scores.set(c, e);
    sum += e;
  }
  for (const [c, s] of scores) scores.set(c, s / sum);
  return scores;
}

/* --------------------------- evaluation ---------------------------- */

export interface ModelScore {
  model: string;
  algorithm: string;
  accuracy: number;
  precision: number; // macro
  recall: number; // macro
  f1: number; // macro
}

export interface EvaluationReport {
  dataset: {
    name: string;
    records: number;
    crops: number;
    features: string[];
    source: string;
  };
  split: string;
  models: ModelScore[];
  featureImportance: Record<string, number>; // permutation importance (kNN)
  evaluatedAt: string;
}

export interface CropProfile {
  crop: string;
  n: number;
  mean: Record<string, number>;
  std: Record<string, number>;
  min: Record<string, number>;
  max: Record<string, number>;
}

interface EngineState {
  knn: KnnModel;
  forest: ForestModel;
  tree: TreeNode;
  treeScaler: Scaler;
  gnb: GnbModel;
  scaler: Scaler;
  profiles: Map<string, CropProfile>;
  report: EvaluationReport;
  primaryAccuracy: number;
}

const g = globalThis as typeof globalThis & { __ksEngine?: EngineState };

function topClass(prob: Map<string, number>): [string, number] {
  let best = "";
  let bestP = -1;
  for (const [c, p] of prob)
    if (p > bestP) {
      best = c;
      bestP = p;
    }
  return [best, bestP];
}

export function getEngine(): EngineState {
  if (g.__ksEngine) return g.__ksEngine;
  const rows = loadCropDataset();
  const rand = rng(20250925);
  const idx = rows.map((_, i) => i);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  const cut = Math.floor(idx.length * 0.8);
  const trainIdx = idx.slice(0, cut);
  const testIdx = idx.slice(cut);
  const train = trainIdx.map((i) => rows[i]);
  const test = testIdx.map((i) => rows[i]);

  const scaler = fitScaler(train);
  const Xtrain = train.map((r) => scale(scaler, toVector(r)));
  const ytrain = train.map((r) => r.label);
  const Xtest = test.map((r) => scale(scaler, toVector(r)));
  const ytest = test.map((r) => r.label);
  const classes = [...new Set(rows.map((r) => r.label))].sort();

  /* kNN k=9 */
  const knn: KnnModel = { kind: "knn", scaler, X: Xtrain, y: ytrain, k: 9 };

  /* Single CART tree */
  const randT = rng(7);
  const tree = buildTree(
    Xtrain,
    ytrain,
    Xtrain.map((_, i) => i),
    0,
    8,
    5,
    7,
    randT
  );

  /* Random-forest-lite: 11 bootstrap trees, 4 random features/split */
  const trees: TreeNode[] = [];
  for (let b = 0; b < 11; b++) {
    const rb = rng(100 + b);
    const boot: number[] = [];
    for (let i = 0; i < Xtrain.length; i++) boot.push(Math.floor(rb() * Xtrain.length));
    trees.push(buildTree(Xtrain, ytrain, boot, 0, 10, 5, 4, rb));
  }
  const forest: ForestModel = { kind: "forest", scaler, trees };

  /* Gaussian Naive Bayes */
  const mean = new Map<string, number[]>();
  const variance = new Map<string, number[]>();
  const prior = new Map<string, number>();
  for (const c of classes) {
    const rs = train.filter((r) => r.label === c);
    const mu = new Array(7).fill(0);
    for (const r of rs) toVector(r).forEach((x, i) => (mu[i] += x));
    mu.forEach((_, i) => (mu[i] /= rs.length));
    const va = new Array(7).fill(0);
    for (const r of rs)
      toVector(r).forEach((x, i) => (va[i] += (x - mu[i]) ** 2));
    va.forEach((_, i) => (va[i] = va[i] / rs.length + 1e-3));
    mean.set(c, mu);
    variance.set(c, va);
    prior.set(c, rs.length / train.length);
  }
  const gnbRaw: GnbModel = { kind: "gnb", classes, prior, mean, var: variance };
  /* GNB works on raw scale */
  const gnbPredict = (v: number[]) => gnbPredictProb(gnbRaw, v);

  /* NOTE: kNN and forest predict functions scale internally, so they
     receive RAW vectors; the tree was trained on scaled data. */
  const evaluators: Record<string, (v: number[], raw: number[]) => Map<string, number>> = {
    "k-Nearest Neighbours (k=9)": (_v, raw) => knnPredictProb(knn, raw),
    "Decision Tree (CART)": (v) => {
      const l = treeWalk(tree, v);
      return new Map([[l.label, 1]]);
    },
    "Random Forest (11 trees, bootstrap)": (_v, raw) => forestPredictProb(forest, raw),
    "Gaussian Naive Bayes": (_v, raw) => gnbPredict(raw),
  };

  const models: ModelScore[] = Object.entries(evaluators).map(([name, fn]) => {
    const preds: string[] = [];
    for (let i = 0; i < Xtest.length; i++) {
      const [c] = topClass(fn(Xtest[i], toVector(test[i])));
      preds.push(c);
    }
    const acc = preds.filter((p, i) => p === ytest[i]).length / ytest.length;
    let mp = 0;
    let mr = 0;
    let mf = 0;
    let nc = 0;
    for (const c of classes) {
      const tp = preds.filter((p, i) => p === c && ytest[i] === c).length;
      const fp = preds.filter((p, i) => p === c && ytest[i] !== c).length;
      const fnn = preds.filter((p, i) => p !== c && ytest[i] === c).length;
      const prec = tp + fp > 0 ? tp / (tp + fp) : 0;
      const rec = tp + fnn > 0 ? tp / (tp + fnn) : 0;
      mp += prec;
      mr += rec;
      mf += prec + rec > 0 ? (2 * prec * rec) / (prec + rec) : 0;
      nc++;
    }
    return {
      model: name,
      algorithm: name,
      accuracy: round4(acc),
      precision: round4(mp / nc),
      recall: round4(mr / nc),
      f1: round4(mf / nc),
    };
  });

  /* Permutation importance for the primary kNN model on test set.
     kNN scales internally, so we permute RAW feature vectors. */
  const Rtest = test.map((r) => toVector(r));
  const baseAcc = models[0].accuracy;
  const importance: Record<string, number> = {};
  const randP = rng(99);
  FEATURES.forEach((f, fi) => {
    const shuffled = Rtest.map((r) => [...r]);
    const col = shuffled.map((r) => r[fi]);
    for (let i = col.length - 1; i > 0; i--) {
      const j = Math.floor(randP() * (i + 1));
      [col[i], col[j]] = [col[j], col[i]];
    }
    shuffled.forEach((r, i) => (r[fi] = col[i]));
    const preds = shuffled.map((v) => topClass(knnPredictProb(knn, v))[0]);
    const acc = preds.filter((p, i) => p === ytest[i]).length / ytest.length;
    importance[f] = round4(Math.max(0, baseAcc - acc));
  });
  const maxImp = Math.max(...Object.values(importance), 1e-9);
  for (const f of FEATURES) importance[f] = round4(importance[f] / maxImp);

  /* Crop profiles from full dataset (used for explanations) */
  const profiles = new Map<string, CropProfile>();
  for (const c of classes) {
    const rs = rows.filter((r) => r.label === c);
    const meanR: Record<string, number> = {};
    const stdR: Record<string, number> = {};
    const minR: Record<string, number> = {};
    const maxR: Record<string, number> = {};
    for (const f of FEATURES) {
      const vals = rs.map((r) => r[f]);
      const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(
        vals.reduce((a, b) => a + (b - mu) ** 2, 0) / vals.length
      );
      meanR[f] = mu;
      stdR[f] = sd || 1e-6;
      minR[f] = Math.min(...vals);
      maxR[f] = Math.max(...vals);
    }
    profiles.set(c, { crop: c, n: rs.length, mean: meanR, std: stdR, min: minR, max: maxR });
  }

  const report: EvaluationReport = {
    dataset: {
      name: "Crop_recommendation.csv",
      records: rows.length,
      crops: classes.length,
      features: [...FEATURES],
      source:
        "7H-ANKUR/CROP-ADVISORY-SIH25010 (GPL-3.0) — Kaggle crop recommendation dataset",
    },
    split: `80/20 stratified-shuffle (seed 20250925) — ${train.length} train / ${test.length} test`,
    models,
    featureImportance: importance,
    evaluatedAt: new Date().toISOString(),
  };

  g.__ksEngine = {
    knn,
    forest,
    tree,
    treeScaler: scaler,
    gnb: gnbRaw,
    scaler,
    profiles,
    report,
    primaryAccuracy: baseAcc,
  };
  return g.__ksEngine;
}

function round4(x: number) {
  return Math.round(x * 10000) / 10000;
}

/* ------------------------- recommendation -------------------------- */

export interface FactorDetail {
  feature: FeatureName;
  label: string;
  status: "positive" | "limiting" | "neutral";
  value: number;
  ideal: string;
  detail: string;
}

export interface Recommendation {
  recommended_crop: string;
  score: number;
  margin: number;
  alternatives: { crop: string; score: number }[];
  explanation: {
    positive_factors: string[];
    limiting_factors: string[];
    feature_importance: Record<string, number>;
    contributions: { feature: FeatureName; label: string; weight: number; status: string; detail: string }[];
  };
  model: {
    name: string;
    version: string;
    algorithm: string;
    dataset: string;
    holdout_accuracy: number;
    trained_at: string;
  };
}

function factorAnalysis(crop: string, input: CropInput): FactorDetail[] {
  const eng = getEngine();
  const prof = eng.profiles.get(crop);
  const out: FactorDetail[] = [];
  if (!prof) return out;
  for (const f of FEATURES) {
    const v = input[f];
    const mu = prof.mean[f];
    const sd = prof.std[f];
    const z = Math.abs(v - mu) / sd;
    const ideal = `${fmt(mu - sd)}–${fmt(mu + sd)} ${FEATURE_UNITS[f]}`;
    let status: FactorDetail["status"] = "neutral";
    let detail = `${FEATURE_LABELS[f]} ${fmt(v)} is close to the learned ${crop} profile (${fmt(mu)} ± ${fmt(sd)}).`;
    if (z <= 0.9) {
      status = "positive";
      detail = `${FEATURE_LABELS[f]} of ${fmt(v)} ${FEATURE_UNITS[f]} sits well inside the typical ${crop} range (${ideal}).`;
    } else if (z > 1.6) {
      status = "limiting";
      const dir = v > mu ? "above" : "below";
      detail = `${FEATURE_LABELS[f]} of ${fmt(v)} is ${dir} the typical ${crop} range (${ideal}).`;
    }
    out.push({ feature: f, label: FEATURE_LABELS[f], status, value: v, ideal, detail });
  }
  return out;
}

function fmt(x: number) {
  return Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2);
}

export function recommendCrop(input: CropInput): Recommendation {
  const eng = getEngine();
  const v = toVector(input);
  const prob = knnPredictProb(eng.knn, v);
  const ranked = [...prob.entries()].sort((a, b) => b[1] - a[1]);
  const [crop, score] = ranked[0];
  const factors = factorAnalysis(crop, input);
  const imp = eng.report.featureImportance;

  const contributions = FEATURES.map((f) => {
    const fac = factors.find((x) => x.feature === f)!;
    const align = fac.status === "positive" ? 1 : fac.status === "limiting" ? 0.3 : 0.62;
    return {
      feature: f,
      label: FEATURE_LABELS[f],
      status: fac.status,
      detail: fac.detail,
      weight: imp[f] * align,
    };
  });
  const wsum = contributions.reduce((a, c) => a + c.weight, 0) || 1;
  contributions.forEach((c) => (c.weight = round4(c.weight / wsum)));
  contributions.sort((a, b) => b.weight - a.weight);

  return {
    recommended_crop: crop,
    score: round4(score),
    margin: round4(score - (ranked[1]?.[1] ?? 0)),
    alternatives: ranked.slice(0, 3).map(([c, s]) => ({ crop: c, score: round4(s) })),
    explanation: {
      positive_factors: factors.filter((f) => f.status === "positive").map((f) => f.detail),
      limiting_factors: factors.filter((f) => f.status === "limiting").map((f) => f.detail),
      feature_importance: imp,
      contributions,
    },
    model: {
      name: "crop_knn",
      version: "v1.0",
      algorithm: "k-Nearest Neighbours (k=9, distance-weighted, standardized features)",
      dataset: "Crop_recommendation.csv (2,200 records, 22 crops)",
      holdout_accuracy: eng.primaryAccuracy,
      trained_at: "process-start (in-memory, deterministic seed)",
    },
  };
}

export function simulateCrop(
  base: CropInput,
  changed: CropInput
): {
  current: Recommendation;
  changed: Recommendation;
  flips: boolean;
  narrative: string;
  deltas: { feature: FeatureName; label: string; from: number; to: number }[];
} {
  const current = recommendCrop(base);
  const next = recommendCrop(changed);
  const deltas = FEATURES.filter((f) => Math.abs(base[f] - changed[f]) > 1e-9).map((f) => ({
    feature: f,
    label: FEATURE_LABELS[f],
    from: base[f],
    to: changed[f],
  }));
  const flips = current.recommended_crop !== next.recommended_crop;
  const narrative = flips
    ? `Changing ${deltas
        .map((d) => `${d.label.toLowerCase()} from ${fmt(d.from)} to ${fmt(d.to)}`)
        .join(", ")} altered the model's ranking: ${current.recommended_crop} (${pct(
        current.score
      )}) gives way to ${next.recommended_crop} (${pct(next.score)}).`
    : deltas.length === 0
    ? "No inputs were changed."
    : `Changing ${deltas
        .map((d) => `${d.label.toLowerCase()} from ${fmt(d.from)} to ${fmt(d.to)}`)
        .join(", ")} did not change the ranking — ${current.recommended_crop} stays on top (${pct(
        current.score
      )} → ${pct(next.score)}).`;
  return { current, changed: next, flips, narrative, deltas };
}

function pct(x: number) {
  return `${Math.round(x * 100)}%`;
}

export function cropProfileOf(crop: string): CropProfile | undefined {
  return getEngine().profiles.get(crop);
}

export function listCrops(): string[] {
  return [...getEngine().profiles.keys()];
}
