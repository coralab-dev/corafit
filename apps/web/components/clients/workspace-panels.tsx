"use client";

import type { ReactNode } from "react";
import {
  ActivityIcon,
  ClockIcon,
  KeyRoundIcon,
  PauseCircleIcon,
  TargetIcon,
  UserCheckIcon,
  UserRoundIcon,
  UsersIcon,
} from "lucide-react";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { DetailSkeleton, PanelSkeleton } from "@/components/shared/skeletons";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ClientMetrics({
  accessCount,
  activeCount,
  assignmentCount,
  pausedInactiveCount,
  totalCount,
}: {
  accessCount: number;
  activeCount: number;
  assignmentCount: number;
  pausedInactiveCount: number;
  totalCount: number;
}) {
  const withoutPlanCount = totalCount - assignmentCount;

  return (
    <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
      <ClientMetricCard
        helper="Directorio completo"
        icon={<UsersIcon className="size-4" />}
        label="Total"
        value={totalCount}
      />
      <ClientMetricCard
        helper={formatRatio(activeCount, totalCount)}
        icon={<UserCheckIcon className="size-4" />}
        label="Activos"
        tone="success"
        value={activeCount}
      />
      <ClientMetricCard
        helper={formatRatio(assignmentCount, totalCount)}
        icon={<ActivityIcon className="size-4" />}
        label="Con plan"
        tone="success"
        value={assignmentCount}
      />
      <ClientMetricCard
        helper="Pendientes"
        icon={<TargetIcon className="size-4" />}
        label="Sin plan"
        tone="warning"
        value={withoutPlanCount}
      />
      <ClientMetricCard
        helper={formatRatio(accessCount, totalCount)}
        icon={<KeyRoundIcon className="size-4" />}
        label="Accesos activos"
        tone="info"
        value={accessCount}
      />
      <ClientMetricCard
        helper="Pausa o baja"
        icon={<PauseCircleIcon className="size-4" />}
        label="Pausa/inactivos"
        tone="muted"
        value={pausedInactiveCount}
      />
    </section>
  );
}

function ClientMetricCard({
  helper,
  icon,
  label,
  tone = "default",
  value,
}: {
  helper: string;
  icon: ReactNode;
  label: string;
  tone?: "default" | "success" | "warning" | "info" | "muted";
  value: number;
}) {
  return (
    <article className="rounded-2xl border !border-transparent bg-card p-3 shadow-[var(--surface-shadow-soft)]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={cn("flex size-8 items-center justify-center rounded-xl", metricToneStyles[tone])}>
          {icon}
        </span>
      </div>
      <p className="mt-3 text-2xl font-bold tracking-normal">{value}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{helper}</p>
    </article>
  );
}

const metricToneStyles = {
  default: "bg-accent text-primary",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/45 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/45 dark:text-amber-300",
  info: "bg-sky-50 text-sky-700 dark:bg-sky-950/45 dark:text-sky-300",
  muted: "bg-muted text-muted-foreground",
};

function formatRatio(value: number, total: number) {
  return total > 0 ? `${Math.round((value / total) * 100)}% del total` : "-";
}

export function ClientActivityPanel() {
  return (
    <aside className="flex min-h-full flex-col p-4 xl:pl-2 xl:pr-5">
      <WorkspacePanel
        description="Historial operativo del workspace."
        icon={<ClockIcon className="size-4" />}
        title="Actividad reciente"
      >
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border border-border/60 bg-background text-muted-foreground">
            <ActivityIcon className="size-5" />
          </div>
          <div>
            <p className="text-sm font-medium">Proximamente</p>
            <p className="mt-1 max-w-56 text-xs leading-5 text-muted-foreground">
              Aqui apareceran cambios de planes, accesos generados y notas del coach.
            </p>
          </div>
        </div>
      </WorkspacePanel>
    </aside>
  );
}

export function ClientErrorCard({ error }: { error: string }) {
  return (
    <Card>
      <CardContent className="p-6 text-sm text-destructive">{error}</CardContent>
    </Card>
  );
}

export function ClientDetailLoadingCard() {
  return <DetailSkeleton />;
}

export function ClientActivitySkeletonPanel() {
  return (
    <aside className="flex min-h-full flex-col p-4 xl:pl-2 xl:pr-5">
      <PanelSkeleton rows={4} titleWidth="w-36" />
    </aside>
  );
}

export function ClientNotFoundCard() {
  return (
    <Card>
      <CardContent className="flex min-h-44 flex-col items-center justify-center gap-2 p-6 text-center">
        <UserRoundIcon className="size-8 text-muted-foreground/50" />
        <p className="text-sm font-medium">Cliente no encontrado</p>
        <p className="text-xs text-muted-foreground">
          No existe un cliente con ese identificador en la lista cargada.
        </p>
      </CardContent>
    </Card>
  );
}
