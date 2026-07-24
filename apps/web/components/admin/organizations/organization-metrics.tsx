"use client";

import {
  CheckCircle2Icon,
  ListFilterIcon,
  PauseCircleIcon,
  UsersIcon,
} from "lucide-react";
import type { OrganizationMetrics as OrganizationMetricsValue } from "./organization-formatters";

export function OrganizationMetrics({ metrics }: { metrics: OrganizationMetricsValue }) {
  const cards = [
    { icon: ListFilterIcon, label: "Resultados", tone: "bg-accent text-primary", value: metrics.results },
    { icon: CheckCircle2Icon, label: "Activas", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300", value: metrics.active },
    { icon: PauseCircleIcon, label: "Suspendidas", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300", value: metrics.suspended },
    { icon: UsersIcon, label: "Clientes en vista", tone: "bg-secondary text-secondary-foreground", value: metrics.clientsUsed },
  ] as const;

  return (
    <div className="space-y-2">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ icon: Icon, label, tone, value }) => (
          <div
            key={label}
            className="flex min-w-0 items-start gap-3 rounded-2xl bg-card p-4 shadow-[var(--surface-shadow-soft)]"
          >
            <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${tone}`}>
              <Icon aria-hidden="true" className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>
      <p className="px-1 text-xs text-muted-foreground">Según los filtros actuales.</p>
    </div>
  );
}

export function OrganizationMetricsSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Cargando métricas">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl bg-card p-4 shadow-[var(--surface-shadow-soft)]">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-7 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
