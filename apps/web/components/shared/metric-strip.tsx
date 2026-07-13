"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type MetricStripItem = {
  helper?: string;
  icon?: ReactNode;
  label: string;
  tone?: "amber" | "default" | "green";
  value: ReactNode;
};

export function MetricStrip({
  className,
  items,
}: {
  className?: string;
  items: MetricStripItem[];
}) {
  return (
    <div
      className={cn(
        "grid overflow-hidden rounded-2xl border bg-card shadow-[0_10px_30px_rgba(21,23,26,0.05)] sm:grid-cols-2 xl:grid-cols-4 dark:shadow-none",
        className,
      )}
    >
      {items.map((item) => (
        <MetricCell key={item.label} item={item} />
      ))}
    </div>
  );
}

function MetricCell({ item }: { item: MetricStripItem }) {
  const toneClass = {
    amber: "text-amber-600 dark:text-amber-400",
    default: "text-primary",
    green: "text-emerald-600 dark:text-emerald-400",
  }[item.tone ?? "default"];

  return (
    <div className="flex min-h-24 items-start gap-3 border-b px-4 py-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r xl:border-b-0 xl:border-r xl:last:border-r-0">
      {item.icon ? (
        <div
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/70",
            toneClass,
          )}
        >
          {item.icon}
        </div>
      ) : null}
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{item.label}</p>
        <p className="mt-2 text-2xl font-semibold tracking-tight">{item.value}</p>
        {item.helper ? (
          <p className="mt-1 truncate text-xs text-muted-foreground">{item.helper}</p>
        ) : null}
      </div>
    </div>
  );
}
