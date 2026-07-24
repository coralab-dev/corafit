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
    { icon: ListFilterIcon, label: "Resultados", detail: "En esta vista", tone: "bg-accent text-primary", value: metrics.results },
    { icon: CheckCircle2Icon, label: "Activas", detail: "Operando", tone: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300", value: metrics.active },
    { icon: PauseCircleIcon, label: "Suspendidas", detail: "Requieren atención", tone: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300", value: metrics.suspended },
    { icon: UsersIcon, label: "Clientes", detail: "Uso acumulado", tone: "bg-secondary text-secondary-foreground", value: metrics.clientsUsed },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ icon: Icon, label, detail, tone, value }) => (
          <div
            key={label}
            className="flex min-w-0 items-start gap-2.5 rounded-2xl bg-card p-3.5 shadow-[var(--surface-shadow-soft)] sm:gap-3 sm:p-4"
          >
            <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl sm:size-9 ${tone}`}>
              <Icon aria-hidden="true" className="size-3.5 sm:size-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
              <p className="mt-0.5 text-2xl font-semibold tracking-tight">{value}</p>
              <p className="truncate text-[11px] text-muted-foreground">{detail}</p>
            </div>
          </div>
      ))}
    </div>
  );
}

export function OrganizationMetricsSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" role="status" aria-label="Cargando métricas">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="rounded-2xl bg-card p-4 shadow-[var(--surface-shadow-soft)]">
          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
          <div className="mt-3 h-7 w-12 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
