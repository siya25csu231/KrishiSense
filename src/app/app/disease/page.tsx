"use client";

import { useRef, useState } from "react";
import { UploadCloud, ScanLine, Leaf, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import { diseaseApi, ApiError, pct } from "@/lib/api";
import { Card, CardHeader, CardBody, Button, Select, Field, Badge, ErrorState, Skeleton } from "@/components/ui";
import { Gauge } from "@/components/charts";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CROPS = ["", "Tomato", "Potato", "Wheat", "Rice", "Maize", "Groundnut", "Soybean", "Cotton", "Vegetables"];

export default function DiseasePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState("");
  const [result, setResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);

  const analyzeFile = async (file: File) => {
    setError(null);
    if (!["image/jpeg", "image/jpg", "image/png"].includes(file.type)) {
      setError("Please upload a JPG or PNG image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image is larger than the 10 MB limit.");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    setResult(null);
    setBusy(true);
    try {
      const s = await computeLeafStats(url);
      setStats(s);
      const res: any = await diseaseApi.detect({ ...s, selectedCrop: crop || undefined });
      setResult(res);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Analysis failed — try a clearer, well-lit leaf photo.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        kicker="Disease Vision"
        title="Leaf disease screening"
        sub="Upload a leaf photo. A colour-signature screening model compares it against known disease profiles and explains symptoms, causes and next steps."
        right={<Badge tone="soil">screening aid — not a lab diagnosis</Badge>}
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="animate-rise">
          <CardHeader title="Upload leaf photo" sub="JPG/PNG · max 10 MB · fill the frame with one leaf" icon={<UploadCloud size={16} />} />
          <CardBody>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && analyzeFile(e.target.files[0])}
            />
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) analyzeFile(f);
              }}
              className="flex min-h-52 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-husk/60 p-6 text-center transition-colors hover:border-leaf/50"
              role="button"
              aria-label="Upload image"
            >
              {preview ? (
                <img src={preview} alt="Uploaded leaf" className="max-h-64 rounded-lg object-contain" />
              ) : (
                <>
                  <ScanLine size={30} className="text-inkfaint" />
                  <p className="text-sm font-semibold">Drop a leaf photo here or click to browse</p>
                  <p className="text-xs text-inkfaint">For best results: natural light, single leaf, visible symptoms.</p>
                </>
              )}
            </div>
            <div className="mt-4">
              <Field label="Expected crop (optional — improves matching)">
                <Select value={crop} onChange={(e) => setCrop(e.target.value)}>
                  {CROPS.map((c) => (
                    <option key={c} value={c}>{c || "Not sure"}</option>
                  ))}
                </Select>
              </Field>
            </div>
            {preview && (
              <Button onClick={() => fileRef.current?.click()} variant="secondary" className="mt-4 w-full">
                Choose a different photo
              </Button>
            )}
            {error && <div className="mt-4"><ErrorState message={error} /></div>}
          </CardBody>
        </Card>

        <div className="space-y-5">
          {busy && <Card><CardBody><Skeleton className="h-80 w-full" /></CardBody></Card>}

          {!busy && !result && !error && (
            <Card>
              <CardBody>
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Leaf size={26} className="text-inkfaint" />
                  <p className="text-sm text-inksoft">Results will appear here after the scan.</p>
                </div>
              </CardBody>
            </Card>
          )}

          {result && (
            <>
              <Card tone={result.healthy ? "green" : "default"} className="animate-rise">
                <CardBody className="flex flex-wrap items-center gap-6 py-6">
                  <Gauge value={result.score} label="Match" size={150} color={result.healthy ? "#2d6a3f" : "#be4b2d"} />
                  <div className="min-w-[220px] flex-1">
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-soil">Detected condition</p>
                    <p className="font-display text-3xl font-bold">{result.detected}</p>
                    <p className="mt-1 text-sm text-inksoft">Likely host: {result.crop} · {result.confidenceLabel}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {result.healthy ? <Badge tone="green"><ShieldCheck size={11} /> healthy signature</Badge> : <Badge tone="clay"><AlertTriangle size={11} /> action advised</Badge>}
                      <Badge tone="neutral">model {result.model}</Badge>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <div className="grid gap-5 sm:grid-cols-2">
                {[
                  ["Symptoms", result.symptoms],
                  ["Possible cause", result.cause],
                  ["Prevention", result.prevention],
                  ["Management", result.management],
                ].map(([title, text]) => (
                  <Card key={title as string} className="animate-rise-1">
                    <CardBody>
                      <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-soil">{title}</p>
                      <p className="text-[13px] leading-relaxed">{text}</p>
                    </CardBody>
                  </Card>
                ))}
              </div>

              {result.alternatives?.length > 0 && (
                <Card className="animate-rise-2">
                  <CardHeader title="Other possible matches" />
                  <CardBody>
                    <ul className="space-y-2">
                      {result.alternatives.map((a: any) => (
                        <li key={a.disease} className="flex items-center justify-between rounded-lg border border-linesoft px-3 py-2 text-sm">
                          <span>{a.disease} <span className="text-xs text-inkfaint">({a.crop})</span></span>
                          <span className="tabular font-bold">{pct(a.score)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardBody>
                </Card>
              )}

              <div className="flex gap-2 rounded-xl border border-sky/30 bg-skysoft px-4 py-3 text-[12px] leading-relaxed text-sky">
                <Info size={15} className="mt-0.5 shrink-0" />
                <p>{result.disclaimer}</p>
              </div>

              {stats && (
                <Card className="animate-rise-2">
                  <CardHeader title="Image colour signature" sub="what the screening model measured" />
                  <CardBody>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        ["Green", stats.greenFrac, "#2d6a3f"],
                        ["Yellow", stats.yellowFrac, "#d9992b"],
                        ["Brown", stats.brownFrac, "#9a6a3c"],
                        ["Dark", stats.darkFrac, "#444"],
                      ].map(([label, v, color]) => (
                        <div key={label as string} className="rounded-lg bg-husk px-3 py-2">
                          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-inkfaint">
                            <span className="h-2 w-2 rounded-full" style={{ background: color as string }} /> {label}
                          </p>
                          <p className="tabular text-sm font-bold">{Math.round((v as number) * 100)}%</p>
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
    </div>
  );
}

/* -------- colour histogram extraction (runs in the browser) --------- */

async function computeLeafStats(url: string) {
  const img = await loadImage(url);
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);

  let green = 0, yellow = 0, brown = 0, dark = 0, other = 0;
  let satSum = 0, briSum = 0;
  const hues: number[] = [];
  const tiles = new Array(16).fill(0);
  const tileTotals = new Array(16).fill(0);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      const r = data[i], gg = data[i + 1], b = data[i + 2];
      const [h, s, l] = rgbToHsl(r, gg, b);
      satSum += s;
      briSum += l;
      hues.push(h);
      const tile = Math.floor(y / 32) * 4 + Math.floor(x / 32);
      tileTotals[tile]++;
      if (l < 0.14) dark++;
      else if (h >= 60 && h <= 175 && s > 0.14 && l > 0.13) green++;
      else if (h >= 35 && h < 60 && s > 0.18) { yellow++; tiles[tile]++; }
      else if ((h >= 8 && h < 35 && s > 0.15 && l < 0.62) || (h >= 0 && h < 8 && l < 0.45)) { brown++; tiles[tile]++; }
      else other++;
    }
  }
  const total = size * size;
  const tileFrac = tiles.map((t, i) => t / (tileTotals[i] || 1));
  const meanTile = tileFrac.reduce((a, b) => a + b, 0) / tileFrac.length;
  const variance = tileFrac.reduce((a, v) => a + (v - meanTile) ** 2, 0) / tileFrac.length;
  const hueMean = hues.reduce((a, b) => a + b, 0) / hues.length;
  const hueVar = hues.reduce((a, h) => a + Math.min((h - hueMean) ** 2, 4000), 0) / hues.length;

  return {
    greenFrac: round(green / total),
    yellowFrac: round(yellow / total),
    brownFrac: round(brown / total),
    darkFrac: round(dark / total),
    otherFrac: round(other / total),
    avgSaturation: round(satSum / total),
    avgBrightness: round(briSum / total),
    hueSpread: round(Math.min(1, Math.sqrt(hueVar) / 120)),
    spotScore: round(Math.min(1, Math.sqrt(variance) * 2.4)),
  };
}

function round(x: number) {
  return Math.round(x * 1000) / 1000;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not read image"));
    img.src = url;
  });
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}
