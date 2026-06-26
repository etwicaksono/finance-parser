"use client";

import * as React from "react";

interface SelectionStats {
  sum: number;
  count: number;
  numericCount: number;
  avg: number;
  min: number;
  max: number;
}

export type StatMode = "sum" | "avg" | "min" | "max" | "count";

const formatCurrency = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 2 }).format(n);

export function SelectionStatusBar({ stats, mode, onModeChange }: { stats: SelectionStats; mode: StatMode; onModeChange: (m: StatMode) => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const allStats: { key: StatMode; label: string; value: string }[] = [
    { key: "sum", label: "Sum", value: formatCurrency(stats.sum) },
    { key: "avg", label: "Avg", value: stats.numericCount > 0 ? formatCurrency(stats.avg) : "-" },
    { key: "min", label: "Min", value: stats.numericCount > 0 ? formatCurrency(stats.min) : "-" },
    { key: "max", label: "Max", value: stats.numericCount > 0 ? formatCurrency(stats.max) : "-" },
    { key: "count", label: "Count", value: String(stats.count) },
  ];

  const selected = allStats.find(s => s.key === mode) ?? allStats[0]!;
  const displayText = `${selected.label}: ${selected.value}`;
  const truncated = displayText.length > 28 ? displayText.slice(0, 26) + "..." : displayText;

  return (
    <div className="absolute bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-2" ref={ref}>
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800 text-sm px-4 py-2 rounded-md shadow-sm font-medium flex items-center gap-2 cursor-pointer hover:bg-emerald-100 dark:hover:bg-emerald-950/60 transition-colors"
        >
          <span>{truncated}</span>
          <svg className="h-3 w-3 opacity-60 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={open ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"} />
          </svg>
        </button>
        {open && (
          <div className="absolute bottom-full right-0 mb-1 bg-popover border rounded-md shadow-lg py-1 min-w-[220px]">
            {allStats.map((opt) => (
              <button
                key={opt.key}
                onClick={() => { onModeChange(opt.key); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors flex justify-between items-center gap-4 ${mode === opt.key ? "bg-muted/60 font-medium" : ""}`}
              >
                <span>{opt.label}:</span>
                <span className="font-mono text-xs">{opt.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
