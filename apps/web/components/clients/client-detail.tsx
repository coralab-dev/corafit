"use client";

import { ArchiveIcon, CheckCircle2Icon, DumbbellIcon, EditIcon, EyeIcon, KeyRoundIcon, Loader2Icon } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/shared/status-badge";
import { countSessions, formatDate, initials, statusLabels, typeLabels } from "@/lib/clients/api";
import type { Client, CurrentPlanAssignment, OperationalStatus } from "@/lib/clients/types";
import { EmptyState } from "./empty-loading";

export function ClientDetail({
  assignment,
  client,
  isPlanLoading,
  onEndPlan,
  onEdit,
  onOpenAssignPlan,
  onOpenCurrentPlan,
  onStatusChange,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isPlanLoading: boolean;
  onEndPlan: () => void;
  onEdit: (client: Client) => void;
  onOpenAssignPlan: () => void;
  onOpenCurrentPlan: () => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
}) {
  const hasActivePlan = Boolean(assignment?.assignedPlan);

  const statusVariantMap: Record<OperationalStatus, Parameters<typeof StatusBadge>[0]["variant"]> = {
    active: "active",
    archived: "archived",
    inactive: "inactive",
    paused: "paused",
  };

  return (
    <div className="flex min-w-0 flex-col gap-4">
      {/* Header de ficha: resumen + acciones jerarquizadas */}
      <Card>
        <CardHeader className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-semibold text-primary">
              {initials(client.name)}
            </div>
            <div className="min-w-0">
              <CardTitle className="truncate text-2xl">{client.name}</CardTitle>
              <CardDescription>
                {client.mainGoal} / {typeLabels[client.clientType]}
              </CardDescription>
              <div className="mt-3 flex flex-wrap gap-2">
                <StatusBadge variant={statusVariantMap[client.operationalStatus]} label={statusLabels[client.operationalStatus]} />
                {hasActivePlan ? (
                  <StatusBadge variant="with-plan" label="Con plan" />
                ) : (
                  <StatusBadge variant="no-plan" label="Sin plan" />
                )}
                <StatusBadge variant={client.canRegisterWeight ? "active" : "inactive"} label={client.canRegisterWeight ? "Peso habilitado" : "Peso por coach"} />
              </div>
            </div>
          </div>

          {/* Acciones jerarquizadas */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Primaria: plan */}
            {hasActivePlan ? (
              <Button asChild>
                <Link href={`/clients/${client.id}/plan-assignment/edit`}>
                  <EditIcon className="mr-2 size-4" />
                  Editar plan
                </Link>
              </Button>
            ) : (
              <Button onClick={onOpenAssignPlan}>
                <DumbbellIcon className="mr-2 size-4" />
                Asignar plan
              </Button>
            )}

            {/* Secundarias */}
            <Button variant="outline" onClick={() => onEdit(client)}>
              <EditIcon className="mr-2 size-4" />
              Editar
            </Button>
            <Button asChild variant="outline">
              <Link href={`/clients/${client.id}/access`}>
                <KeyRoundIcon className="mr-2 size-4" />
                Acceso
              </Link>
            </Button>

            {/* Destructiva */}
            <Button variant="destructive" size="sm" onClick={() => onStatusChange(client.id, "archived")}>
              <ArchiveIcon className="mr-2 size-4" />
              Archivar
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Indicadores compactos */}
      <div className="grid gap-4 md:grid-cols-3">
        <InfoCard label="Edad" value={`${client.age} anos`} />
        <InfoCard label="Altura" value={`${client.heightCm} cm`} />
        <InfoCard label="Peso inicial" value={`${client.initialWeightKg} kg`} />
      </div>

      {/* Tabs de detalle */}
      <Card>
        <CardHeader>
          <CardTitle>Ficha operativa</CardTitle>
          <CardDescription>Datos base, notas y estado.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="datos">
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="plan">Plan actual</TabsTrigger>
              <TabsTrigger value="notas">Notas</TabsTrigger>
              <TabsTrigger value="estado">Estado</TabsTrigger>
            </TabsList>
            <TabsContent value="datos" className="mt-4">
              <div className="grid gap-3 md:grid-cols-2">
                <DetailRow label="Telefono" value={client.phone || "Sin telefono"} />
                <DetailRow label="Sexo" value={client.sex || "No especificado"} />
                <DetailRow label="Nivel" value={client.trainingLevel || "Sin nivel"} />
                <DetailRow label="Tipo" value={typeLabels[client.clientType]} />
              </div>
            </TabsContent>
            <TabsContent value="plan" className="mt-4">
              <CurrentPlanPanel
                assignment={assignment}
                isLoading={isPlanLoading}
                onEndPlan={onEndPlan}
                onOpenAssignPlan={onOpenAssignPlan}
                onOpenCurrentPlan={onOpenCurrentPlan}
                clientId={client.id}
              />
            </TabsContent>
            <TabsContent value="notas" className="mt-4">
              <div className="grid gap-3">
                <DetailBlock label="Lesiones" value={client.injuriesNotes || "Sin lesiones registradas"} />
                <DetailBlock label="Notas generales" value={client.generalNotes || "Sin notas generales"} />
              </div>
            </TabsContent>
            <TabsContent value="estado" className="mt-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => onStatusChange(client.id, "active")}>
                  <CheckCircle2Icon className="mr-2 size-4" />
                  Activar
                </Button>
                <Button variant="outline" onClick={() => onStatusChange(client.id, "paused")}>
                  <Loader2Icon className="mr-2 size-4" />
                  Pausar
                </Button>
                <Button variant="destructive" onClick={() => onStatusChange(client.id, "archived")}>
                  <ArchiveIcon className="mr-2 size-4" />
                  Archivar
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

export function CurrentPlanPanel({
  assignment,
  clientId,
  isLoading,
  onEndPlan,
  onOpenAssignPlan,
  onOpenCurrentPlan,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  clientId: string;
  isLoading: boolean;
  onEndPlan: () => void;
  onOpenAssignPlan: () => void;
  onOpenCurrentPlan: () => void;
}) {
  if (isLoading) {
    return (
      <div className="flex min-h-44 items-center justify-center rounded-lg border bg-background p-6 text-sm text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando plan actual
      </div>
    );
  }

  if (!assignment?.assignedPlan) {
    return (
      <EmptyState
        actionLabel="Asignar plan"
        description="Selecciona un template y crea una copia editable para este cliente."
        title="Sin plan asignado"
        onAction={onOpenAssignPlan}
      />
    );
  }

  const totalSessions = countSessions(assignment.assignedPlan);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]">
      <div className="rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground">Plan actual</p>
            <p className="mt-1 truncate text-lg font-semibold">
              {assignment.assignedPlan.name}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Inicio: {formatDate(assignment.assignment.startDate) ?? "Sin fecha"}
            </p>
          </div>
          <Badge>Activo</Badge>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <DetailRow
            label="Duracion"
            value={`${assignment.assignedPlan.durationWeeks} semanas`}
          />
          <DetailRow label="Sesiones" value={`${totalSessions} programadas`} />
          <DetailRow label="Progreso" value={`0 / ${totalSessions}`} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Button className="w-full" variant="outline" onClick={onOpenCurrentPlan}>
          <EyeIcon data-icon="inline-start" />
          Ver plan actual
        </Button>
        <Button asChild className="w-full" variant="outline">
          <Link href={`/clients/${clientId}/plan-assignment/edit`}>
            <EditIcon data-icon="inline-start" />
            Editar plan actual
          </Link>
        </Button>
        <Button className="w-full" variant="outline" onClick={onEndPlan}>
          <ArchiveIcon data-icon="inline-start" />
          Finalizar plan actual
        </Button>
      </div>
    </div>
  );
}

export function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle>{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  );
}

export function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background p-4">
      <p className="text-sm font-semibold">{label}</p>
      <p className="mt-2 text-sm text-muted-foreground">{value}</p>
    </div>
  );
}
