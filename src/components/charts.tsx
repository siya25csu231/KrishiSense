"use client";

import React from "react";

/* Hand-rolled SVG charts — no chart library, deterministic SSR-safe. */

export function Sparkline({
  values,
  width = 120,
  height = 34,
  stroke = "#2d6a3f",
}: {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * (width - 4) + 2;
    const y = height - 3 - ((v - min) / span) * (height - 6);
    return `${x},${y}`;
  });
  return (
    <svg width={width} height={height} className="overflow-visible" aria-hidden>
      <polyline points={pts.join(" ")} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={pts[pts.length - 1].split(",")[0]} cy={pts[pts.length - 1].split(",")[1]} r={2.6} fill={stroke} />
    </svg>
  );
}

export function LineAreaChart({
  data,
  forecast = [],
  height = 220,
  unit = "₹",
  color = "#2d6a3f",
}: {
  data: { label: string; value: number }[];
  forecast?: { label: string; value: number }[];
  height?: number;
  unit?: string;
  color?: string;
}) {
  const all = [...data, ...forecast];
  if (data.length < 2) return <p className="text-xs text-inkfaint">Not enough data to chart.</p>;
  const w = 560;
  const h = height;
  const padL = 46;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const min = Math.min(...all.map((d) => d.value)) * 0.97;
  const max = Math.max(...all.map((d) => d.value)) * 1.03;
  const span = max - min || 1;
  const X = (i: number) => padL + (i / (all.length - 1)) * (w - padL - padR);
  const Y = (v: number) => padT + (1 - (v - min) / span) * (h - padT - padB);

  const solid = data.map((d, i) => `${X(i)},${Y(d.value)}`).join(" ");
  const last = data.length - 1;
  const fc = forecast.map((d, i) => `${X(last + 1 + i)},${Y(d.value)}`).join(" ");
  const area = `${padL},${Y(data[0].value)} ${solid} ${X(last)},${h - padB} ${padL},${h - padB}`;
  const ticks = 4;
  const gid = React.useId().replace(/:/g, "");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label="line chart">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      {Array.from({ length: ticks + 1 }).map((_, i) => {
        const v = min + (span * i) / ticks;
        const y = Y(v);
        return (
          <g key={i}>
            <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#e2ddc9" strokeDasharray="3 4" />
            <text x={padL - 8} y={y + 3.5} textAnchor="end" fontSize={10} fill="#8a8f7e">
              {unit}
              {Math.round(v).toLocaleString("en-IN")}
            </text>
          </g>
        );
      })}
      <polygon points={area} fill={`url(#g${gid})`} />
      <polyline points={solid} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
      {forecast.length > 0 && (
        <polyline
          points={`${X(last)},${Y(data[last].value)} ${fc}`}
          fill="none"
          stroke="#d9992b"
          strokeWidth={2}
          strokeDasharray="5 4"
        />
      )}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={X(i)} cy={Y(d.value)} r={i === last ? 4 : 2.5} fill={color}>
            <title>{`${d.label}: ${unit}${d.value.toLocaleString("en-IN")}`}</title>
          </circle>
          {i % Math.ceil(data.length / 7) === 0 && (
            <text x={X(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="#8a8f7e">
              {d.label}
            </text>
          )}
        </g>
      ))}
      {forecast.map((d, i) => (
        <g key={`f${i}`}>
          <circle cx={X(last + 1 + i)} cy={Y(d.value)} r={3} fill="#d9992b">
            <title>{`Forecast ${d.label}: ~${unit}${d.value.toLocaleString("en-IN")} (estimate)`}</title>
          </circle>
          <text x={X(last + 1 + i)} y={h - 8} textAnchor="middle" fontSize={10} fill="#b08a3e">
            {d.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export function HBarChart({
  items,
  color = "#2d6a3f",
  format = (v: number) => `${Math.round(v * 100)}%`,
}: {
  items: { label: string; value: number; sub?: string; status?: string }[];
  color?: string;
  format?: (v: number) => string;
}) {
  const max = Math.max(...items.map((i) => i.value), 1e-9);
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <div key={it.label}>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold text-ink">{it.label}</span>
            <span className="tabular font-bold text-inksoft">{format(it.value)}</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-linesoft">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.max(2, (it.value / max) * 100)}%`,
                background:
                  it.status === "limiting" ? "#be4b2d" : it.status === "positive" ? color : "#9a6a3c",
              }}
            />
          </div>
          {it.sub && <p className="mt-1 text-[11px] leading-snug text-inkfaint">{it.sub}</p>}
        </div>
      ))}
    </div>
  );
}

export function Gauge({
  value,
  label,
  size = 170,
  color = "#2d6a3f",
}: {
  value: number; // 0..1
  label: string;
  size?: number;
  color?: string;
}) {
  const r = size / 2 - 14;
  const cx = size / 2;
  const cy = size / 2;
  const circ = Math.PI * r;
  const frac = Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex flex-col items-center" style={{ width: size }}>
      <svg width={size} height={size / 2 + 22} viewBox={`0 0 ${size} ${size / 2 + 22}`}>
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e2ddc9"
          strokeWidth={13}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke={color}
          strokeWidth={13}
          strokeLinecap="round"
          strokeDasharray={`${circ * frac} ${circ}`}
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="tabular font-display text-3xl font-bold">{Math.round(frac * 100)}</span>
        <span className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">{label}</span>
      </div>
    </div>
  );
}

export function Donut({
  segments,
  size = 150,
  centerLabel,
  centerSub,
}: {
  segments: { label: string; value: number; color: string }[];
  size?: number;
  centerLabel?: string;
  centerSub?: string;
}) {
  const total = segments.reduce((a, s) => a + s.value, 0) || 1;
  const r = size / 2 - 10;
  const circ = 2 * Math.PI * r;
  let acc = 0;
  return (
    <div className="flex items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ece8d8" strokeWidth={14} />
          {segments.map((s) => {
            const frac = s.value / total;
            const dash = `${circ * frac} ${circ * (1 - frac)}`;
            const off = -circ * acc;
            acc += frac;
            return (
              <circle
                key={s.label}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={s.color}
                strokeWidth={14}
                strokeDasharray={dash}
                strokeDashoffset={off}
              >
                <title>{`${s.label}: ${Math.round(frac * 100)}%`}</title>
              </circle>
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="tabular font-display text-lg font-bold">{centerLabel}</span>
          {centerSub && <span className="text-[10px] font-bold uppercase tracking-wide text-inkfaint">{centerSub}</span>}
        </div>
      </div>
      <ul className="space-y-1.5 text-xs">
        {segments.map((s) => (
          <li key={s.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
            <span className="text-inksoft">
              {s.label} · <span className="tabular font-bold text-ink">{Math.round((s.value / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
