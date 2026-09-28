"use client";

import { useCallback, useEffect, useState } from "react";
import { BellRing, X, CloudRain, Bug, Store, Sprout } from "lucide-react";
import { alertsApi, ApiError, fmtDate } from "@/lib/api";
import { Card, CardBody, SeverityBadge, Skeleton, EmptyState, ErrorState, Badge, Button } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const CAT_ICON: Record<string, React.ElementType> = {
  weather: CloudRain,
  pest: Bug,
  market: Store,
  agronomy: Sprout,
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDismissed, setShowDismissed] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res: any = await alertsApi.list();
      setAlerts(res.alerts ?? []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load alerts.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = (alerts ?? []).filter((a) => showDismissed || !a.dismissed);

  return (
    <div>
      <PageHeader
        kicker="Smart Alert Engine"
        title="Farm alerts"
        sub="Aggregated from weather forecasts, pest risk rules and market movement — ranked Critical → Low."
        right={
          <Button variant="secondary" size="sm" onClick={() => setShowDismissed((s) => !s)}>
            {showDismissed ? "Hide dismissed" : "Show dismissed"}
          </Button>
        }
      />

      {error && <ErrorState message={error} retry={load} />}
      {!alerts && !error && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Card key={i}><CardBody><Skeleton className="h-14 w-full" /></CardBody></Card>
          ))}
        </div>
      )}

      {alerts && visible.length === 0 && (
        <EmptyState
          title="No active alerts"
          sub="Alerts regenerate daily from your field, weather forecast and market trends."
        />
      )}

      <div className="space-y-3">
        {visible.map((a: any) => {
          const Icon = CAT_ICON[a.category] ?? BellRing;
          return (
            <Card key={a.id} className={`animate-rise ${a.dismissed ? "opacity-55" : ""}`}>
              <CardBody className="flex items-start gap-4 py-4">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-husk text-soil">
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-display text-[15px] font-bold">{a.title}</p>
                    <SeverityBadge severity={a.severity} />
                    <Badge tone="neutral">{a.category}</Badge>
                    <span className="ml-auto text-[11px] text-inkfaint">{fmtDate(a.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[13px] leading-relaxed text-inksoft">{a.message}</p>
                </div>
                {!a.dismissed && (
                  <button
                    onClick={async () => {
                      await alertsApi.dismiss(a.id);
                      load();
                    }}
                    className="rounded-lg border border-line p-1.5 text-inkfaint hover:text-clay"
                    aria-label="Dismiss alert"
                  >
                    <X size={14} />
                  </button>
                )}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
