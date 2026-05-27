"use client";

import { ActivityIcon, ClockIcon, KeyRoundIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { MetricStrip } from "@/components/shared/metric-strip";
import { Card, CardContent } from "@/components/ui/card";

export function ClientMetrics({
  accessCount,
  activeCount,
  assignmentCount,
  totalCount,
}: {
  accessCount: number;
  activeCount: number;
  assignmentCount: number;
  totalCount: number;
}) {
  return (
    <MetricStrip
      items={[
        {
          helper: totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}% del total` : "-",
          icon: <UsersIcon className="size-4" />,
          label: "Clientes activos",
          value: activeCount,
        },
        {
          helper: "Requieren seguimiento",
          icon: <ClockIcon className="size-4" />,
          label: "En pausa",
          tone: "amber",
          value: totalCount - activeCount,
        },
        {
          helper: totalCount > 0 ? `${Math.round((accessCount / totalCount) * 100)}% del total` : "-",
          icon: <KeyRoundIcon className="size-4" />,
          label: "Accesos activos",
          tone: "green",
          value: accessCount,
        },
        {
          helper: "Pendientes de asignar",
          icon: <ActivityIcon className="size-4" />,
          label: "Sin plan",
          value: totalCount - assignmentCount,
        },
      ]}
    />
  );
}

export function ClientActivityPanel() {
  return (
    <aside className="flex min-h-full flex-col p-5">
      <WorkspacePanel
        description="Historial operativo del workspace."
        icon={<ClockIcon className="size-4" />}
        title="Actividad reciente"
      >
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
          <div className="flex size-11 items-center justify-center rounded-full border bg-background text-muted-foreground">
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
  return (
    <Card>
      <CardContent className="flex min-h-44 items-center justify-center p-6 text-sm text-muted-foreground">
        Cargando ficha
      </CardContent>
    </Card>
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
