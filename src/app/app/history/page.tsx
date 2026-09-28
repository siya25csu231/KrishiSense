"use client";

import { useCallback, useEffect, useState } from "react";
import { History, Bookmark, Trash2, Sprout, ScanLine, Wheat, Coins, Repeat, SlidersHorizontal } from "lucide-react";
import { historyApi, ApiError, fmtDateTime } from "@/lib/api";
import { Card, CardBody, Button, Skeleton, EmptyState, ErrorState, Tag } from "@/components/ui";
import { PageHeader } from "@/components/layout";

/* eslint-disable @typescript-eslint/no-explicit-any */

const KIND_ICON: Record<string, React.ElementType> = {
  crop: Sprout,
  disease: ScanLine,
  yield: Wheat,
  profit: Coins,
  rotation: Repeat,
  whatif: SlidersHorizontal,
};

export default function HistoryPage() {
  const [history, setHistory] = useState<any[] | null>(null);
  const [saved, setSaved] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"history" | "saved">("history");

  const load = useCallback(async () => {
    try {
      const [h, s] = await Promise.all([historyApi.list(), historyApi.saved()]);
      setHistory(h.history);
      setSaved(s.saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not load history.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        kicker="Records"
        title="Prediction history & saved advisories"
        sub="Every crop analysis, disease scan, yield estimate and profit plan is logged here for your records."
        right={
          <div className="flex rounded-xl border border-line bg-card p-1">
            {(["history", "saved"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold ${tab === t ? "bg-leaf text-husk" : "text-inksoft hover:bg-linesoft"}`}
              >
                {t === "history" ? <History size={13} /> : <Bookmark size={13} />}
                {t === "history" ? `History (${history?.length ?? 0})` : `Saved (${saved?.length ?? 0})`}
              </button>
            ))}
          </div>
        }
      />

      {error && <ErrorState message={error} retry={load} />}
      {!history && !error && <Card><CardBody><Skeleton className="h-48 w-full" /></CardBody></Card>}

      {tab === "history" && history && history.length === 0 && (
        <EmptyState title="Your prediction history will appear here" sub="Run a crop analysis, disease scan or yield estimate to see it logged." />
      )}

      {tab === "saved" && saved && saved.length === 0 && (
        <EmptyState title="No saved advisories yet" sub="Use the Save button on any recommendation to keep it here." />
      )}

      {tab === "history" && (
        <div className="space-y-2.5">
          {history?.map((h) => {
            const Icon = KIND_ICON[h.kind] ?? History;
            return (
              <Card key={h.id} className="animate-rise">
                <CardBody className="flex items-center gap-4 py-3.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sproutsoft text-leaf">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{h.title}</p>
                    <p className="truncate text-xs text-inkfaint">{h.summary}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Tag>{h.kind}</Tag>
                    <span className="text-[11px] font-semibold text-inkfaint">{fmtDateTime(h.createdAt)}</span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}

      {tab === "saved" && (
        <div className="space-y-2.5">
          {saved?.map((s) => (
            <Card key={s.id} className="animate-rise">
              <CardBody className="flex items-center gap-4 py-3.5">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-harvestsoft text-harvest">
                  <Bookmark size={16} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{s.title}</p>
                  {s.note && <p className="truncate text-xs text-inkfaint">{s.note}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Tag>{s.kind}</Tag>
                  <span className="text-[11px] font-semibold text-inkfaint">{fmtDateTime(s.createdAt)}</span>
                  <button
                    onClick={async () => {
                      await historyApi.remove(s.id);
                      load();
                    }}
                    className="rounded-lg border border-line p-1.5 text-inkfaint hover:text-clay"
                    aria-label="Delete saved advisory"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
