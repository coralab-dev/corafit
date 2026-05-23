"use client";

import { ActivityIcon, ClockIcon, KeyRoundIcon, UserRoundIcon, UsersIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="bg-card/80">
        <CardContent className="flex min-h-24 items-center gap-4 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-primary/10 text-primary">
            <UsersIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clientes totales</p>
            <p className="text-2xl font-bold">{totalCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/80">
        <CardContent className="flex min-h-24 items-center gap-4 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-emerald-500/10 text-emerald-600">
            <ActivityIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Clientes activos</p>
            <p className="text-2xl font-bold">{activeCount}</p>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}% del total` : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/80">
        <CardContent className="flex min-h-24 items-center gap-4 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-blue-500/10 text-blue-600">
            <KeyRoundIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Accesos activos</p>
            <p className="text-2xl font-bold">{accessCount}</p>
            <p className="text-xs text-muted-foreground">
              {totalCount > 0 ? `${Math.round((accessCount / totalCount) * 100)}% del total` : "-"}
            </p>
          </div>
        </CardContent>
      </Card>
      <Card className="bg-card/80">
        <CardContent className="flex min-h-24 items-center gap-4 p-4">
          <div className="flex size-10 items-center justify-center rounded-lg border bg-orange-500/10 text-orange-600">
            <UsersIcon className="size-5" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Sin plan asignado</p>
            <p className="text-2xl font-bold">{totalCount - assignmentCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ClientActivityPanel() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Actividad reciente</CardTitle>
        <CardDescription>Historial de acciones del sistema.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex min-h-56 flex-col items-center justify-center gap-2 text-center">
          <ClockIcon className="size-7 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">Proximamente</p>
          <p className="max-w-52 text-xs text-muted-foreground/70">
            El historial de actividad estara disponible proximamente.
          </p>
        </div>
      </CardContent>
    </Card>
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
