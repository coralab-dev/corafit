"use client";

import {
  ArchiveIcon,
  CheckCircle2Icon,
  DumbbellIcon,
  EditIcon,
  EyeIcon,
  KeyRoundIcon,
  Loader2Icon,
  NotebookPenIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/status-badge";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import { cn } from "@/lib/utils";
import {
  countSessions,
  formatDate,
  initials,
  statusLabels,
  typeLabels,
} from "@/lib/clients/api";
import type {
  Client,
  CurrentPlanAssignment,
  OperationalStatus,
} from "@/lib/clients/types";
import { EmptyState } from "./empty-loading";

export function ClientDetail({
  assignment,
  client,
  isPlanLoading,
  onEndPlan,
  onEdit,
  onStatusChange,
  variant = "drawer",
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isPlanLoading: boolean;
  onEndPlan: () => void;
  onEdit: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
  variant?: "drawer" | "page";
}) {
  const isPage = variant === "page";

  return (
    <aside className={cn("flex min-h-0 flex-col", isPage ? "gap-5" : "bg-card")}>
      <div
        className={cn(
          "flex items-start justify-between gap-4",
          isPage ? "rounded-md border bg-card p-5" : "border-b px-6 py-7 pr-14",
        )}
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-semibold tracking-tight">
              {client.name}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {client.phone || "Sin telefono"}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {client.mainGoal} / {typeLabels[client.clientType]}
            </p>
          </div>
        </div>
        <Button
          aria-label="Editar cliente"
          className="size-9 shrink-0 shadow-none"
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => onEdit(client)}
        >
          <EditIcon className="size-4" />
        </Button>
      </div>

      <div className={cn("flex flex-1 flex-col gap-4", isPage ? "" : "overflow-y-auto p-5")}>
        <CurrentPlanPanel
          assignment={assignment}
          clientId={client.id}
          isLoading={isPlanLoading}
          onEndPlan={onEndPlan}
          variant={variant}
        />

        <WorkspacePanel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Acceso del cliente</h3>
            <StatusBadge
              label={getAccessLabel(client.access.status)}
              variant={getAccessVariant(client.access.status)}
            />
          </div>
          <div className="rounded-md border bg-muted/25 px-3 py-2 text-sm text-muted-foreground">
            {client.access.link ?? "Genera un acceso para compartir link y PIN."}
          </div>
          <Button asChild className="mt-3 w-full shadow-none" variant="outline">
            <Link href={`/clients/${client.id}/access`}>
              <KeyRoundIcon className="size-4" />
              {client.access.status === "active" ? "Gestionar acceso" : "Generar acceso"}
            </Link>
          </Button>
        </WorkspacePanel>

        <WorkspacePanel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Ficha operativa</h3>
            <StatusBadge
              label={statusLabels[client.operationalStatus]}
              variant={client.operationalStatus}
            />
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <DetailStat label="Edad" value={`${client.age} anos`} />
            <DetailStat label="Altura" value={`${client.heightCm} cm`} />
            <DetailStat label="Peso inicial" value={`${client.initialWeightKg} kg`} />
            <DetailStat label="Nivel" value={client.trainingLevel || "Sin nivel"} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              className="shadow-none"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onStatusChange(client.id, "active")}
            >
              <CheckCircle2Icon className="size-4" />
              Activar
            </Button>
            <Button
              className="shadow-none"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onStatusChange(client.id, "paused")}
            >
              Pausar
            </Button>
            <Button
              className="shadow-none"
              size="sm"
              type="button"
              variant="outline"
              onClick={() => onStatusChange(client.id, "archived")}
            >
              <ArchiveIcon className="size-4" />
              Archivar
            </Button>
          </div>
        </WorkspacePanel>

        <WorkspacePanel className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Notas recientes</h3>
            <NotebookPenIcon className="size-4 text-muted-foreground" />
          </div>
          <div className="space-y-3 text-sm">
            <NotePreview
              label="Lesiones"
              value={client.injuriesNotes || "Sin lesiones registradas."}
            />
            <NotePreview
              label="Notas generales"
              value={client.generalNotes || "Sin notas generales."}
            />
          </div>
          <Button
            className="mt-4 w-full shadow-none"
            type="button"
            variant="outline"
            onClick={() => onEdit(client)}
          >
            <EditIcon className="size-4" />
            Editar notas
          </Button>
        </WorkspacePanel>
      </div>
    </aside>
  );
}

export function CurrentPlanPanel({
  assignment,
  clientId,
  isLoading,
  onEndPlan,
  variant = "drawer",
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  clientId: string;
  isLoading: boolean;
  onEndPlan: () => void;
  variant?: "drawer" | "page";
}) {
  if (isLoading) {
    return (
      <section className="flex min-h-48 items-center justify-center rounded-md border bg-card p-6 text-sm text-muted-foreground">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando plan actual
      </section>
    );
  }

  if (!assignment?.assignedPlan) {
    return (
      <WorkspacePanel className="p-4">
        <EmptyState
          actionHref={`/clients/${clientId}/plan-assignment`}
          actionLabel="Asignar plan"
          description="Selecciona un template y crea una copia editable para este cliente."
          title="Sin plan asignado"
        />
      </WorkspacePanel>
    );
  }

  const totalSessions = countSessions(assignment.assignedPlan);

  return (
    <WorkspacePanel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold">Plan actual</p>
          <h3 className="mt-3 truncate text-lg font-semibold">
            {assignment.assignedPlan.name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Desde {formatDate(assignment.assignment.startDate) ?? "sin fecha"}
          </p>
        </div>
        <StatusBadge label="Activo" variant="with-plan" />
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3 border-t pt-4">
        <DetailStat
          label="Duracion"
          value={`${assignment.assignedPlan.durationWeeks} sem.`}
        />
        <DetailStat label="Sesiones" value={`${totalSessions}`} />
        <DetailStat label="Progreso" value={`0/${totalSessions}`} />
      </div>

      <div className={cn("mt-4 grid gap-2", variant === "page" && "sm:grid-cols-3")}>
        <Button asChild className="w-full shadow-none" variant="outline">
          <Link href={`/clients/${clientId}/plan-assignment/edit`}>
            <EyeIcon className="size-4" />
            Ver plan
          </Link>
        </Button>
        <Button asChild className="w-full shadow-none" variant="outline">
          <Link href={`/clients/${clientId}/plan-assignment/edit`}>
            <DumbbellIcon className="size-4" />
            Editar plan
          </Link>
        </Button>
        <Button className="w-full shadow-none" variant="outline" onClick={onEndPlan}>
          <ArchiveIcon className="size-4" />
          Finalizar plan
        </Button>
      </div>
    </WorkspacePanel>
  );
}

export function InfoCard({ label, value }: { label: string; value: string }) {
  return <DetailStat label={label} value={value} />;
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  return <DetailStat label={label} value={value} />;
}

export function DetailBlock({ label, value }: { label: string; value: string }) {
  return <NotePreview label={label} value={value} />;
}

function DetailStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function NotePreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 line-clamp-2 text-foreground">{value}</p>
    </div>
  );
}

function getAccessLabel(status: Client["access"]["status"]) {
  const labels: Record<Client["access"]["status"], string> = {
    active: "Activo",
    disabled: "Desactivado",
    none: "Sin acceso",
    temporarily_locked: "Bloqueado",
  };

  return labels[status];
}

function getAccessVariant(status: Client["access"]["status"]) {
  if (status === "active") {
    return "access-active";
  }

  if (status === "temporarily_locked") {
    return "access-pending";
  }

  if (status === "disabled") {
    return "inactive";
  }

  return "no-plan";
}
