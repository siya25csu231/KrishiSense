"use client";

import React from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";

/* ------------------------------ Card ------------------------------- */

export function Card({
  children,
  className = "",
  tone = "default",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "default" | "green" | "soil" | "dark";
}) {
  const tones: Record<string, string> = {
    default: "bg-card border-line",
    green: "bg-leafdeep text-husk border-leafdark",
    soil: "bg-soilsoft border-soil/30",
    dark: "bg-ink text-husk border-ink",
  };
  return (
    <div className={`rounded-xl border shadow-[0_1px_2px_rgba(36,42,32,0.05)] ${tones[tone]} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  sub,
  icon,
  right,
}: {
  title: string;
  sub?: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-linesoft px-5 py-4">
      <div className="flex items-center gap-2.5">
        {icon && <span className="text-leaf">{icon}</span>}
        <div>
          <h3 className="font-display text-[15px] font-semibold tracking-tight">{title}</h3>
          {sub && <p className="mt-0.5 text-xs text-inkfaint">{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export function CardBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-5 py-4 ${className}`}>{children}</div>;
}

/* ----------------------------- Buttons ----------------------------- */

export function Button({
  children,
  onClick,
  type = "button",
  variant = "primary",
  size = "md",
  disabled,
  busy,
  className = "",
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  variant?: "primary" | "secondary" | "ghost" | "danger" | "harvest";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  busy?: boolean;
  className?: string;
  title?: string;
}) {
  const variants: Record<string, string> = {
    primary: "bg-leaf text-husk hover:bg-leafdark border-transparent",
    secondary: "bg-card text-ink border-line hover:border-leaf/50 hover:bg-sproutsoft",
    ghost: "bg-transparent text-inksoft border-transparent hover:bg-linesoft",
    danger: "bg-clay text-husk border-transparent hover:bg-clay/90",
    harvest: "bg-harvest text-ink border-transparent hover:brightness-95",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-[15px]",
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border font-semibold transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-55 ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {busy && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

/* ------------------------------ Badges ----------------------------- */

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "green" | "harvest" | "clay" | "sky" | "soil";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-linesoft text-inksoft",
    green: "bg-sproutsoft text-leafdark",
    harvest: "bg-harvestsoft text-[#8a6112]",
    clay: "bg-claysoft text-clay",
    sky: "bg-skysoft text-sky",
    soil: "bg-soilsoft text-soil",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, { tone: "clay" | "harvest" | "sky" | "neutral"; label: string }> = {
    critical: { tone: "clay", label: "Critical" },
    high: { tone: "harvest", label: "High" },
    medium: { tone: "sky", label: "Medium" },
    low: { tone: "neutral", label: "Low" },
  };
  const m = map[severity] ?? map.low;
  return <Badge tone={m.tone}>{m.label}</Badge>;
}

/* ------------------------------ Inputs ----------------------------- */

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold uppercase tracking-wide text-inksoft">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-inkfaint">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-card px-3 py-2 text-sm text-ink placeholder:text-inkfaint focus:border-leaf focus:outline-none focus:ring-2 focus:ring-leaf/20 transition-colors";

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className ?? ""}`} />;
}

export function RangeInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit: string;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-bold uppercase tracking-wide text-inksoft">{label}</span>
        <span className="tabular rounded bg-linesoft px-2 py-0.5 font-semibold text-ink">
          {value} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        aria-label={label}
      />
    </div>
  );
}

/* ---------------------------- Feedback ----------------------------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-lg ${className}`} aria-hidden />;
}

export function SkeletonRows({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-card/60 px-6 py-10 text-center">
      <Inbox className="text-inkfaint" size={26} />
      <p className="font-display text-sm font-semibold">{title}</p>
      {sub && <p className="max-w-sm text-xs leading-relaxed text-inkfaint">{sub}</p>}
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-clay/30 bg-claysoft/60 px-6 py-8 text-center">
      <AlertTriangle className="text-clay" size={24} />
      <p className="max-w-md text-sm leading-relaxed text-ink">{message}</p>
      {retry && (
        <Button variant="secondary" size="sm" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/* ------------------------------ Misc ------------------------------- */

export function SectionTitle({
  kicker,
  title,
  sub,
}: {
  kicker?: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mb-5">
      {kicker && (
        <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-soil">{kicker}</p>
      )}
      <h2 className="font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {sub && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-inksoft">{sub}</p>}
    </div>
  );
}

export function StatPill({ label, value, tone = "neutral" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-linesoft bg-card px-3 py-2">
      <span className="text-[11px] font-bold uppercase tracking-wide text-inkfaint">{label}</span>
      <span className={`tabular text-sm font-bold ${tone === "green" ? "text-leaf" : tone === "clay" ? "text-clay" : "text-ink"}`}>
        {value}
      </span>
    </div>
  );
}

export function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-md border border-line bg-husk px-2 py-0.5 text-[11px] font-semibold text-inksoft">
      {children}
    </span>
  );
}
