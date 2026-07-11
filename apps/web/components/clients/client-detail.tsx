"use client";

import { useState } from "react";
import {
  ArchiveIcon,
  DumbbellIcon,
  EditIcon,
  EyeIcon,
  KeyRoundIcon,
  Loader2Icon,
  NotebookPenIcon,
  UserRoundIcon,
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
import { ClientProgressPanel } from "./client-progress-panel";
import { clientStatusActionsFor } from "./client-status-state";

type ClientDetailTab = "summary" | "plan" | "progress" | "access" | "notes";

const clientDetailTabs: Array<{ key: ClientDetailTab; label: string }> = [
  { key: "summary", label: "Resumen" },
  { key: "plan", label: "Plan" },
  { key: "progress", label: "Progreso" },
  { key: "access", label: "Acceso" },
  { key: "notes", label: "Notas" },
];

export function ClientDetail({
  assignment,
  client,
  isPlanLoading,
  onRetryPlan,
  planError,
  isClientEditDisabled = false,
  isStatusMutationPending = false,
  onEndPlan,
  onEdit,
  onArchiveStatusChange,
  onStatusChange,
  pendingStatus,
  variant = "drawer",
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isPlanLoading: boolean;
  onRetryPlan?: () => void;
  planError?: string | null;
  isClientEditDisabled?: boolean;
  isStatusMutationPending?: boolean;
  onEndPlan: () => void;
  onEdit: (client: Client) => void;
  onArchiveStatusChange: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
  pendingStatus?: OperationalStatus | null;
  variant?: "drawer" | "page";
}) {
  const isPage = variant === "page";
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("summary");

  if (isPage) {
    return (
      <aside className="flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border !border-transparent bg-card p-5 shadow-[var(--surface-shadow)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                label={statusLabels[client.operationalStatus]}
                variant={client.operationalStatus}
              />
              <StatusBadge
                label={getAccessLabel(client.access.status)}
                variant={getAccessVariant(client.access.status)}
              />
              <Button
                className="shadow-none"
                disabled={isClientEditDisabled}
                type="button"
                variant="outline"
                onClick={() => onEdit(client)}
              >
                <EditIcon className="size-4" />
                Editar cliente
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 rounded-2xl border !border-transparent bg-muted/25 p-1 shadow-[var(--surface-shadow-soft)] sm:grid-cols-5">
            {clientDetailTabs.map((tab) => (
              <button
                key={tab.key}
                className={cn(
                  "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition",
                  activeTab === tab.key && "bg-card text-foreground shadow-[var(--surface-shadow-soft)]",
                )}
                type="button"
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "summary" ? (
          <OperationalPanel
            client={client}
            isStatusMutationPending={isStatusMutationPending}
            pendingStatus={pendingStatus}
            onArchiveStatusChange={onArchiveStatusChange}
            onStatusChange={onStatusChange}
          />
        ) : null}
        {activeTab === "plan" ? (
          <CurrentPlanPanel
            assignment={assignment}
            clientId={client.id}
            isLoading={isPlanLoading}
            onEndPlan={onEndPlan}
            onRetry={onRetryPlan}
            error={planError}
            variant={variant}
          />
        ) : null}
        {activeTab === "progress" ? <ClientProgressPanel clientId={client.id} /> : null}
        {activeTab === "access" ? <AccessPanel client={client} /> : null}
        {activeTab === "notes" ? (
          <ClientNotesPanel
            client={client}
            isEditDisabled={isClientEditDisabled}
            onEdit={() => onEdit(client)}
          />
        ) : null}
      </aside>
    );
  }

  return (
    <aside className="flex min-h-0 flex-col bg-background">
      <div
        className="flex items-start justify-between gap-4 border-b border-border/60 bg-card/80 px-6 py-7 pr-14 backdrop-blur"
      >
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-primary shadow-[var(--surface-shadow-soft)]">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-normal">
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
          disabled={isClientEditDisabled}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => onEdit(client)}
        >
          <EditIcon className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-5">
        <CurrentPlanPanel
          assignment={assignment}
          clientId={client.id}
          isLoading={isPlanLoading}
          onEndPlan={onEndPlan}
          onRetry={onRetryPlan}
          error={planError}
          variant={variant}
        />

        <AccessPanel client={client} />
        <OperationalPanel
          client={client}
          isStatusMutationPending={isStatusMutationPending}
          pendingStatus={pendingStatus}
          onArchiveStatusChange={onArchiveStatusChange}
          onStatusChange={onStatusChange}
        />
        <ClientNotesPanel
          client={client}
          isEditDisabled={isClientEditDisabled}
          onEdit={() => onEdit(client)}
        />
      </div>
    </aside>
  );
}

function AccessPanel({ client }: { client: Client }) {
  return (
    <WorkspacePanel className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Acceso del cliente</h3>
        <StatusBadge
          label={getAccessLabel(client.access.status)}
          variant={getAccessVariant(client.access.status)}
        />
      </div>
      <div className="rounded-xl border !border-transparent bg-muted/35 px-3 py-2 text-sm text-muted-foreground shadow-[var(--surface-shadow-soft)]">
        {client.access.link ?? "Genera un acceso para compartir link y PIN."}
      </div>
      <Button asChild className="mt-3 w-full shadow-none" variant="outline">
        <Link href={`/clients/${client.id}/access`}>
          <KeyRoundIcon className="size-4" />
          {client.access.status === "active" ? "Gestionar acceso" : "Generar acceso"}
        </Link>
      </Button>
    </WorkspacePanel>
  );
}

function OperationalPanel({
  client,
  isStatusMutationPending,
  pendingStatus,
  onArchiveStatusChange,
  onStatusChange,
}: {
  client: Client;
  isStatusMutationPending: boolean;
  pendingStatus?: OperationalStatus | null;
  onArchiveStatusChange: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => void;
}) {
  const statusActions = clientStatusActionsFor(client.operationalStatus);
  return (
    <WorkspacePanel className="p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Ficha operativa</h3>
        <StatusBadge
          label={statusLabels[client.operationalStatus]}
          variant={client.operationalStatus}
        />
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <DetailStat label="Edad" value={`${client.age} anos`} />
        <DetailStat label="Altura" value={`${client.heightCm} cm`} />
        <DetailStat label="Peso inicial" value={`${client.initialWeightKg} kg`} />
        <DetailStat label="Nivel" value={client.trainingLevel || "Sin nivel"} />
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {statusActions.map((action) => {
          const isCurrentActionPending = pendingStatus === action.status;

          return (
            <Button
              key={action.status}
              className="shadow-none"
              disabled={isStatusMutationPending}
              size="sm"
              type="button"
              variant={action.isDestructive ? "destructive" : "outline"}
              onClick={() => {
                if (action.requiresConfirmation) {
                  onArchiveStatusChange(client);
                  return;
                }

                onStatusChange(client.id, action.status);
              }}
            >
              {isCurrentActionPending ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : action.status === "archived" ? (
                <ArchiveIcon className="size-4" />
              ) : null}
              {action.label}
            </Button>
          );
        })}
      </div>
    </WorkspacePanel>
  );
}

function ClientNotesPanel({
  client,
  isEditDisabled,
  onEdit,
}: {
  client: Client;
  isEditDisabled: boolean;
  onEdit: () => void;
}) {
  return (
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
        disabled={isEditDisabled}
        type="button"
        variant="outline"
        onClick={onEdit}
      >
        <EditIcon className="size-4" />
        Editar notas
      </Button>
    </WorkspacePanel>
  );
}

export function CurrentPlanPanel({
  assignment,
  clientId,
  error,
  isLoading,
  onEndPlan,
  onRetry,
  variant = "drawer",
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  clientId: string;
  error?: string | null;
  isLoading: boolean;
  onEndPlan: () => void;
  onRetry?: () => void;
  variant?: "drawer" | "page";
}) {
  const hasKnownAssignment = assignment !== undefined;

  if (isLoading && !hasKnownAssignment) {
    return (
      <section className="flex min-h-48 items-center justify-center rounded-2xl border !border-transparent bg-card p-6 text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando plan actual
      </section>
    );
  }

  if (!hasKnownAssignment && error) {
    return (
      <section
        aria-live="polite"
        className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive"
        role="alert"
      >
        <div>
          <p className="font-semibold">No se pudo cargar el plan actual</p>
          <p className="mt-1 max-w-72 leading-5">{error}</p>
        </div>
        {onRetry ? (
          <Button className="shadow-none" variant="outline" onClick={onRetry}>
            Reintentar
          </Button>
        ) : null}
      </section>
    );
  }

  if (!hasKnownAssignment) {
    return (
      <section className="flex min-h-48 items-center justify-center rounded-2xl border !border-transparent bg-card p-6 text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
        <Loader2Icon className="mr-2 size-4 animate-spin" />
        Cargando plan actual
      </section>
    );
  }

  const planLoadNotice = error ? (
    <div
      aria-live="polite"
      className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-3 text-sm text-destructive"
      role="alert"
    >
      <div>
        <p className="font-semibold">La actualización del plan falló</p>
        <p className="mt-1 leading-5">{error}</p>
      </div>
      {onRetry ? (
        <Button className="shrink-0 shadow-none" size="sm" variant="outline" onClick={onRetry}>
          Reintentar
        </Button>
      ) : null}
    </div>
  ) : null;

  if (!assignment?.assignedPlan) {
    return (
      <WorkspacePanel className="p-4">
        {planLoadNotice}
        <div className="flex min-h-56 flex-col items-center justify-center gap-4 rounded-2xl border !border-transparent bg-background p-6 text-center shadow-[var(--surface-shadow-soft)]">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <UserRoundIcon className="size-5" />
          </div>
          <div>
            <p className="font-semibold">Sin plan asignado</p>
            <p className="mt-1 max-w-72 text-sm leading-5 text-muted-foreground">
              Selecciona un template y crea una copia editable para este cliente.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href={`/clients/${clientId}/plan-assignment`}>
              <DumbbellIcon className="size-4" />
              Asignar plan
            </Link>
          </Button>
        </div>
      </WorkspacePanel>
    );
  }

  const totalSessions = countSessions(assignment.assignedPlan);

  return (
    <WorkspacePanel className="p-4">
      {planLoadNotice}
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

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border/60 pt-4">
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
    <div className="min-w-0 rounded-xl bg-muted/30 p-3">
      <p className="truncate text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold">{value}</p>
    </div>
  );
}

function NotePreview({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
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
