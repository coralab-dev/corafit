"use client";

import { type KeyboardEvent, useId, useState } from "react";
import {
  ArchiveIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  DumbbellIcon,
  EditIcon,
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
import { clientDetailTabs, type ClientDetailTab } from "./client-detail-navigation";
import {
  resolveAssignedPlanStructure,
  resolveClientPageAccessSummary,
  resolveClientPagePlanSummary,
} from "./client-page-summary";
import { clientStatusActionsFor } from "./client-status-state";

type ClientDetailProps = {
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
  onStatusChange: (clientId: string, status: OperationalStatus) => Promise<boolean> | void;
  pendingStatus?: OperationalStatus | null;
  variant?: "drawer" | "page";
};

export function ClientDetail(props: ClientDetailProps) {
  return <ClientDetailContent key={props.client.id} {...props} />;
}

function ClientDetailContent({
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
}: ClientDetailProps) {
  const isPage = variant === "page";
  const tabsId = useId();
  const [activeTab, setActiveTab] = useState<ClientDetailTab>("summary");
  const [isStatusActionsOpen, setIsStatusActionsOpen] = useState(false);
  const visibleActiveTab = activeTab;

  function selectTab(tab: ClientDetailTab) {
    setActiveTab(tab);
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const currentIndex = clientDetailTabs.findIndex((tab) => tab.key === visibleActiveTab);
    const lastIndex = clientDetailTabs.length - 1;
    let nextIndex: number | null = null;

    if (event.key === "ArrowRight") {
      nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
    }

    if (event.key === "ArrowLeft") {
      nextIndex = currentIndex === 0 ? lastIndex : currentIndex - 1;
    }

    if (event.key === "Home") {
      nextIndex = 0;
    }

    if (event.key === "End") {
      nextIndex = lastIndex;
    }

    if (nextIndex === null) {
      return;
    }

    const nextTab = clientDetailTabs[nextIndex].key;

    event.preventDefault();
    setActiveTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`${tabsId}-${nextTab}-tab`)?.focus();
    });
  }

  function renderTabs(className: string) {
    return (
      <div className={className} role="tablist" aria-label="Detalle del cliente">
        {clientDetailTabs.map((tab) => (
          <button
            key={tab.key}
            aria-controls={`${tabsId}-${tab.key}-panel`}
            aria-selected={visibleActiveTab === tab.key}
            className={cn(
              "rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              visibleActiveTab === tab.key &&
                "bg-card text-foreground shadow-[var(--surface-shadow-soft)]",
            )}
            id={`${tabsId}-${tab.key}-tab`}
            role="tab"
            tabIndex={visibleActiveTab === tab.key ? 0 : -1}
            type="button"
            onClick={() => selectTab(tab.key)}
            onKeyDown={handleTabKeyDown}
          >
            {tab.label}
          </button>
        ))}
      </div>
    );
  }

  function renderActivePanel() {
    return (
      <div
        aria-labelledby={`${tabsId}-${visibleActiveTab}-tab`}
        id={`${tabsId}-${visibleActiveTab}-panel`}
        role="tabpanel"
      >
        {visibleActiveTab === "summary" ? (
          isPage ? (
            <PageSummaryPanel
              assignment={assignment}
              client={client}
              isClientEditDisabled={isClientEditDisabled}
              isPlanLoading={isPlanLoading}
              isStatusMutationPending={isStatusMutationPending}
              pendingStatus={pendingStatus}
              planError={planError}
              showActions={isStatusActionsOpen}
              onArchiveStatusChange={onArchiveStatusChange}
              onEditNotes={() => onEdit(client)}
              onEndPlan={onEndPlan}
              onRetryPlan={onRetryPlan}
              onStatusChange={onStatusChange}
              onToggleActions={() => setIsStatusActionsOpen((current) => !current)}
            />
          ) : (
            <SummaryPanel
              assignment={assignment}
              client={client}
              isPlanLoading={isPlanLoading}
              isStatusMutationPending={isStatusMutationPending}
              pendingStatus={pendingStatus}
              planError={planError}
              onEditNotes={() => onEdit(client)}
              onArchiveStatusChange={onArchiveStatusChange}
              onRetryPlan={onRetryPlan}
              onStatusChange={onStatusChange}
              onToggleStatusActions={() => setIsStatusActionsOpen((current) => !current)}
              showStatusActions={isStatusActionsOpen}
            />
          )
        ) : null}
        {visibleActiveTab === "plan" ? (
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
        {visibleActiveTab === "progress" ? (
          <ClientProgressPanel clientId={client.id} variant={variant} />
        ) : null}
        {visibleActiveTab === "access" ? (
          <AccessPanel client={client} variant={variant} />
        ) : null}
        {visibleActiveTab === "notes" ? (
          <ClientNotesPanel
            client={client}
            isEditDisabled={isClientEditDisabled}
            onEdit={() => onEdit(client)}
            variant={variant}
          />
        ) : null}
      </div>
    );
  }

  if (isPage) {
    return (
      <section className="flex min-h-0 flex-col gap-4">
        <div className="rounded-2xl border !border-transparent bg-card p-5 shadow-[var(--surface-shadow)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 items-center gap-4 md:flex-1">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary/15 text-lg font-semibold text-primary">
                {initials(client.name)}
              </div>
              <div className="min-w-0">
                <h2 className="truncate text-xl font-semibold tracking-tight">
                  {client.name}
                </h2>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {client.phone || "Sin teléfono"}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {client.mainGoal} / {typeLabels[client.clientType]}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:justify-end">
              <StatusBadge
                label={`Estado: ${statusLabels[client.operationalStatus]}`}
                variant={client.operationalStatus}
              />
              <StatusBadge
                label={`Acceso: ${getAccessLabel(client.access.status)}`}
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
        </div>

        <div className="overflow-x-auto rounded-2xl border !border-transparent bg-muted/25 p-1 shadow-[var(--surface-shadow-soft)]">
          {renderTabs(
            "grid min-w-max grid-flow-col auto-cols-[minmax(6.25rem,1fr)] gap-2 sm:min-w-0 sm:grid-cols-5",
          )}
        </div>

        {renderActivePanel()}
      </section>
    );
  }

  return (
    <aside className="flex h-full min-h-0 flex-col bg-background">
      <div className="sticky top-0 z-20 flex items-start justify-between gap-4 border-b border-border/60 bg-card/95 px-5 py-6 pr-28 backdrop-blur sm:px-6 sm:pr-28">
        <div className="flex min-w-0 items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-accent text-lg font-semibold text-primary shadow-[var(--surface-shadow-soft)]">
            {initials(client.name)}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xl font-bold tracking-normal">
              {client.name}
            </h2>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {client.phone || "Sin teléfono"}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {client.mainGoal} / {typeLabels[client.clientType]}
            </p>
          </div>
        </div>
        <Button
          aria-label="Editar cliente"
          className="absolute right-16 top-5 z-30 size-9 shrink-0 shadow-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          disabled={isClientEditDisabled}
          size="icon"
          type="button"
          variant="ghost"
          onClick={() => onEdit(client)}
        >
          <EditIcon className="size-4" />
        </Button>
      </div>

      <div className="sticky top-0 z-10 border-b border-border/60 bg-background/95 px-4 py-3 backdrop-blur sm:px-5">
        {renderTabs(
          "grid grid-flow-col auto-cols-[minmax(5.75rem,1fr)] gap-2 overflow-x-auto rounded-2xl border !border-transparent bg-muted/25 p-1 shadow-[var(--surface-shadow-soft)]",
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
        {renderActivePanel()}
      </div>
    </aside>
  );
}

function AccessPanel({
  client,
  variant = "drawer",
}: {
  client: Client;
  variant?: "drawer" | "page";
}) {
  if (variant === "page") {
    const accessSummary = resolveClientPageAccessSummary(client.access.status);

    return (
      <WorkspacePanel className="p-5">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Acceso del cliente</p>
                <h3 className="mt-2 text-lg font-semibold">{accessSummary.label}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {getAccessDescription(client.access.status)}
                </p>
              </div>
              <StatusBadge
                label={accessSummary.label}
                variant={accessSummary.variant}
              />
            </div>

            {client.access.lastAccessAt ? (
              <div className="mt-5">
                <DetailStat
                  label="Último acceso"
                  value={formatDate(client.access.lastAccessAt) ?? "Sin fecha"}
                />
              </div>
            ) : null}
          </section>

          <section className="min-w-0 rounded-xl bg-muted/25 p-4">
            <h3 className="text-sm font-semibold">Credenciales</h3>
            <div className="mt-3 space-y-3">
              {client.access.link ? (
                <CredentialBlock label="Link" value={client.access.link} />
              ) : null}
              {client.access.pin ? (
                <CredentialBlock label="PIN" value={client.access.pin} />
              ) : null}
              {!client.access.link && !client.access.pin ? (
                <p className="rounded-xl border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
                  Genera un acceso para crear link y PIN.
                </p>
              ) : null}
            </div>
            <Button asChild className="mt-4 w-full shadow-none">
              <Link href={`/clients/${client.id}/access`}>
                <KeyRoundIcon className="size-4" />
                {accessSummary.ctaLabel}
              </Link>
            </Button>
          </section>
        </div>
      </WorkspacePanel>
    );
  }

  const accessSummary = resolveClientPageAccessSummary(client.access.status);

  return (
    <WorkspacePanel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Acceso del cliente</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Link y PIN para que el cliente entre a su portal.
          </p>
        </div>
        <StatusBadge
          label={getAccessLabel(client.access.status)}
          variant={getAccessVariant(client.access.status)}
        />
      </div>
      <div className="mt-4 overflow-hidden break-all rounded-xl bg-muted/35 px-3 py-3 text-sm text-muted-foreground">
        {client.access.link ?? "Genera un acceso para compartir link y PIN."}
      </div>
      <Button asChild className="mt-4 w-full shadow-none">
        <Link href={`/clients/${client.id}/access`}>
          <KeyRoundIcon className="size-4" />
          {accessSummary.ctaLabel}
        </Link>
      </Button>
    </WorkspacePanel>
  );
}

function CredentialBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-background px-3 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-all text-sm font-semibold">{value}</p>
    </div>
  );
}

function getAccessDescription(status: Client["access"]["status"]) {
  const descriptions: Record<Client["access"]["status"], string> = {
    active: "El cliente puede entrar a su portal con sus credenciales actuales.",
    disabled: "El acceso existe, pero está desactivado para el cliente.",
    none: "Todavía no hay credenciales generadas para este cliente.",
    temporarily_locked: "El acceso está bloqueado temporalmente y puede gestionarse desde Acceso.",
  };

  return descriptions[status];
}

function PageSummaryPanel({
  assignment,
  client,
  isClientEditDisabled,
  isPlanLoading,
  isStatusMutationPending,
  onEditNotes,
  onEndPlan,
  onRetryPlan,
  pendingStatus,
  planError,
  showActions,
  onArchiveStatusChange,
  onStatusChange,
  onToggleActions,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isClientEditDisabled: boolean;
  isPlanLoading: boolean;
  isStatusMutationPending: boolean;
  onEditNotes: () => void;
  onEndPlan: () => void;
  onRetryPlan?: () => void;
  pendingStatus?: OperationalStatus | null;
  planError?: string | null;
  showActions: boolean;
  onArchiveStatusChange: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => Promise<boolean> | void;
  onToggleActions: () => void;
}) {
  const planSummary = resolveClientPagePlanSummary(
    assignment,
    isPlanLoading,
    planError,
  );
  const accessSummary = resolveClientPageAccessSummary(client.access.status);
  const hasPlan = planSummary.state === "assigned";
  const canUsePlanAction = planSummary.state !== "unknown" && planSummary.state !== "error";

  return (
    <WorkspacePanel className="p-5">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <section className="min-w-0 border-b border-border/60 pb-6 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Plan actual</p>
              <h3 className="mt-2 truncate text-lg font-semibold">
                {planSummary.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {planSummary.detail}
              </p>
            </div>
            <StatusBadge
              label={planSummary.badgeLabel}
              variant={
                planSummary.state === "assigned"
                  ? "with-plan"
                  : planSummary.state === "error"
                    ? "error"
                    : "no-plan"
              }
            />
          </div>

          {hasPlan ? (
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <DetailStat
                label="Duración"
                value={`${planSummary.durationWeeks} sem.`}
              />
              <DetailStat
                label="Sesiones"
                value={`${planSummary.sessionCount}`}
              />
            </div>
          ) : null}

          <div className="mt-5 flex flex-wrap gap-2">
            {canUsePlanAction ? (
              <Button asChild className="shadow-none">
                <Link href={`/clients/${client.id}/plan-assignment${hasPlan ? "/edit" : ""}`}>
                  <DumbbellIcon className="size-4" />
                  {hasPlan ? "Editar plan" : "Asignar plan"}
                </Link>
              </Button>
            ) : null}
            {planSummary.state === "error" && onRetryPlan ? (
              <Button className="shadow-none" variant="outline" onClick={onRetryPlan}>
                Reintentar
              </Button>
            ) : null}
            {hasPlan ? (
              <Button
                className="border-destructive/30 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
                variant="outline"
                onClick={onEndPlan}
              >
                <ArchiveIcon className="size-4" />
                Finalizar plan
              </Button>
            ) : null}
          </div>
        </section>

        <section className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold">Acceso</p>
              <p className="mt-2 break-all text-sm text-muted-foreground">
                {client.access.link ?? "Aún no hay un link de acceso para compartir."}
              </p>
            </div>
            <StatusBadge
              label={accessSummary.label}
              variant={accessSummary.variant}
            />
          </div>
          <Button asChild className="mt-5 shadow-none" variant="outline">
            <Link href={`/clients/${client.id}/access`}>
              <KeyRoundIcon className="size-4" />
              {accessSummary.ctaLabel}
            </Link>
          </Button>
        </section>

        <section className="min-w-0 border-t border-border/60 pt-6 lg:col-span-2">
          <h3 className="text-sm font-semibold">Datos del cliente</h3>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <DetailStat label="Edad" value={formatNullableStat(client.age, "años")} />
            <DetailStat label="Altura" value={formatNullableStat(client.heightCm, "cm")} />
            <DetailStat
              label="Peso inicial"
              value={formatNullableStat(client.initialWeightKg, "kg")}
            />
            <DetailStat label="Nivel" value={client.trainingLevel || "Sin nivel"} />
            <DetailStat label="Objetivo" value={client.mainGoal || "Sin objetivo"} />
            <DetailStat label="Modalidad" value={typeLabels[client.clientType]} />
            <DetailStat label="Teléfono" value={client.phone || "Sin teléfono"} />
          </div>
        </section>

        <section className="min-w-0 border-t border-border/60 pt-6">
          <OperationalStatusControls
            client={client}
            isStatusMutationPending={isStatusMutationPending}
            pendingStatus={pendingStatus}
            showActions={showActions}
            onArchiveStatusChange={onArchiveStatusChange}
            onStatusChange={onStatusChange}
            onToggleActions={onToggleActions}
            variant="page"
          />
        </section>

        <section className="min-w-0 border-t border-border/60 pt-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-sm font-semibold">Notas y restricciones</h3>
            <Button
              className="shadow-none"
              disabled={isClientEditDisabled}
              size="sm"
              type="button"
              variant="outline"
              onClick={onEditNotes}
            >
              <NotebookPenIcon className="size-4" />
              Editar notas
            </Button>
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
        </section>
      </div>
    </WorkspacePanel>
  );
}

function SummaryPanel({
  assignment,
  client,
  isPlanLoading,
  isStatusMutationPending,
  onEditNotes,
  pendingStatus,
  planError,
  showStatusActions,
  onArchiveStatusChange,
  onRetryPlan,
  onStatusChange,
  onToggleStatusActions,
}: {
  assignment: CurrentPlanAssignment | null | undefined;
  client: Client;
  isPlanLoading: boolean;
  isStatusMutationPending: boolean;
  onEditNotes: () => void;
  pendingStatus?: OperationalStatus | null;
  planError?: string | null;
  showStatusActions: boolean;
  onArchiveStatusChange: (client: Client) => void;
  onRetryPlan?: () => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => Promise<boolean> | void;
  onToggleStatusActions: () => void;
}) {
  const hasKnownAssignment = assignment !== undefined;
  const hasPlan = Boolean(assignment?.assignedPlan);
  const totalSessions = assignment?.assignedPlan
    ? countSessions(assignment.assignedPlan)
    : 0;

  return (
    <div className="space-y-4">
      <WorkspacePanel className="p-4">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <DetailStat label="Edad" value={formatNullableStat(client.age, "años")} />
          <DetailStat label="Altura" value={formatNullableStat(client.heightCm, "cm")} />
          <DetailStat
            label="Peso inicial"
            value={formatNullableStat(client.initialWeightKg, "kg")}
          />
          <DetailStat label="Nivel" value={client.trainingLevel || "Sin nivel"} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Plan actual</p>
            {!hasKnownAssignment && isPlanLoading ? (
              <p className="mt-2 flex items-center text-sm text-muted-foreground">
                <Loader2Icon className="mr-2 size-4 animate-spin" />
                Cargando plan actual
              </p>
            ) : !hasKnownAssignment && planError ? (
              <div className="mt-2 text-sm text-destructive">
                <p className="font-medium">No se pudo cargar el plan actual</p>
                <p className="mt-1 leading-5">{planError}</p>
              </div>
            ) : !hasKnownAssignment ? (
              <p className="mt-2 text-sm text-muted-foreground">
                Plan todavía no disponible.
              </p>
            ) : hasPlan && assignment?.assignedPlan ? (
              <>
                <h3 className="mt-2 truncate text-base font-semibold">
                  {assignment.assignedPlan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {assignment.assignedPlan.durationWeeks} sem. / {totalSessions} sesiones
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Sin plan asignado.</p>
            )}
          </div>
          {hasKnownAssignment ? (
            <StatusBadge
              label={hasPlan ? "Activo" : "Sin plan"}
              variant={hasPlan ? "with-plan" : "no-plan"}
            />
          ) : null}
        </div>
        {!hasKnownAssignment && planError && onRetryPlan ? (
          <Button className="mt-4 w-full shadow-none" variant="outline" onClick={onRetryPlan}>
            Reintentar
          </Button>
        ) : null}
        {hasKnownAssignment ? (
          <Button asChild className="mt-4 w-full shadow-none">
            <Link href={`/clients/${client.id}/plan-assignment${hasPlan ? "/edit" : ""}`}>
              <DumbbellIcon className="size-4" />
              {hasPlan ? "Editar plan" : "Asignar plan"}
            </Link>
          </Button>
        ) : null}
      </WorkspacePanel>

      <ClientNotesPanel
        client={client}
        isEditDisabled={false}
        onEdit={onEditNotes}
        previewOnly
      />

      <OperationalPanel
        client={client}
        isStatusMutationPending={isStatusMutationPending}
        pendingStatus={pendingStatus}
        showActions={showStatusActions}
        onArchiveStatusChange={onArchiveStatusChange}
        onStatusChange={onStatusChange}
        onToggleActions={onToggleStatusActions}
      />
    </div>
  );
}

function OperationalPanel({
  client,
  isStatusMutationPending,
  pendingStatus,
  showActions,
  onArchiveStatusChange,
  onStatusChange,
  onToggleActions,
}: {
  client: Client;
  isStatusMutationPending: boolean;
  pendingStatus?: OperationalStatus | null;
  showActions: boolean;
  onArchiveStatusChange: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => Promise<boolean> | void;
  onToggleActions: () => void;
}) {
  return (
    <WorkspacePanel className="p-4">
      <OperationalStatusControls
        client={client}
        isStatusMutationPending={isStatusMutationPending}
        pendingStatus={pendingStatus}
        showActions={showActions}
        onArchiveStatusChange={onArchiveStatusChange}
        onStatusChange={onStatusChange}
        onToggleActions={onToggleActions}
      />
    </WorkspacePanel>
  );
}

function OperationalStatusControls({
  client,
  isStatusMutationPending,
  pendingStatus,
  showActions,
  onArchiveStatusChange,
  onStatusChange,
  onToggleActions,
  variant = "drawer",
}: {
  client: Client;
  isStatusMutationPending: boolean;
  pendingStatus?: OperationalStatus | null;
  showActions: boolean;
  onArchiveStatusChange: (client: Client) => void;
  onStatusChange: (clientId: string, status: OperationalStatus) => Promise<boolean> | void;
  onToggleActions: () => void;
  variant?: "drawer" | "page";
}) {
  const statusActions = clientStatusActionsFor(client.operationalStatus);
  const normalStatusActions = statusActions.filter((action) => !action.isDestructive);
  const archiveAction = statusActions.find((action) => action.status === "archived");
  const isArchivePending = pendingStatus === archiveAction?.status;
  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">Estado operativo</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Situación actual para seguimiento interno.
          </p>
        </div>
        <StatusBadge
          label={statusLabels[client.operationalStatus]}
          variant={client.operationalStatus}
        />
      </div>
      <Button
        aria-expanded={showActions}
        className="mt-4 w-full justify-between shadow-none"
        disabled={isStatusMutationPending}
        type="button"
        variant="outline"
        onClick={onToggleActions}
      >
        Cambiar estado
        <ChevronDownIcon
          className={cn("size-4 transition-transform", showActions && "rotate-180")}
        />
      </Button>

      {showActions ? (
        <div className="mt-3 grid gap-2">
          {normalStatusActions.map((action) => {
            const isCurrentActionPending = pendingStatus === action.status;

            return (
              <Button
                key={action.status}
                className="justify-start shadow-none"
                disabled={isStatusMutationPending}
                size="sm"
                type="button"
                variant="ghost"
                onClick={() => {
                  const result = onStatusChange(client.id, action.status);
                  void Promise.resolve(result).then((didChange) => {
                    if (didChange !== false) {
                      onToggleActions();
                    }
                  });
                }}
              >
                {isCurrentActionPending ? (
                  <Loader2Icon className="size-4 animate-spin" />
                ) : (
                  <CheckCircle2Icon className="size-4" />
                )}
                {action.label}
              </Button>
            );
          })}
        </div>
      ) : null}

      {archiveAction ? (
        <div className="mt-4 border-t border-border/60 pt-4">
          <Button
            className={cn(
              "justify-start shadow-none",
              variant === "page" ? "text-destructive" : "w-full",
            )}
            disabled={isStatusMutationPending}
            size="sm"
            type="button"
            variant={variant === "page" ? "ghost" : "destructive"}
            onClick={() => {
              onArchiveStatusChange(client);
            }}
          >
            {isArchivePending ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : (
              <ArchiveIcon className="size-4" />
            )}
            {archiveAction.label}
          </Button>
        </div>
      ) : null}
    </>
  );
}

function ClientNotesPanel({
  client,
  isEditDisabled,
  onEdit,
  previewOnly = false,
  variant = "drawer",
}: {
  client: Client;
  isEditDisabled: boolean;
  onEdit: () => void;
  previewOnly?: boolean;
  variant?: "drawer" | "page";
}) {
  if (variant === "page") {
    return (
      <WorkspacePanel className="p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Notas y restricciones</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Observaciones operativas para adaptar el entrenamiento.
            </p>
          </div>
          <Button
            className="shadow-none"
            disabled={isEditDisabled}
            type="button"
            variant="outline"
            onClick={onEdit}
          >
            <EditIcon className="size-4" />
            Editar notas
          </Button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <section className="min-w-0 rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="text-sm font-semibold">Lesiones y restricciones</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {client.injuriesNotes || "Sin lesiones o restricciones registradas."}
            </p>
          </section>
          <section className="min-w-0 rounded-xl border bg-background p-4">
            <p className="text-sm font-semibold">Notas generales</p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {client.generalNotes || "Sin notas generales registradas."}
            </p>
          </section>
        </div>
      </WorkspacePanel>
    );
  }

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
          previewOnly={previewOnly}
        />
        <NotePreview
          label="Notas generales"
          value={client.generalNotes || "Sin notas generales."}
          previewOnly={previewOnly}
        />
      </div>
      {!previewOnly ? (
        <Button
          className="mt-4 w-full shadow-none"
          disabled={isEditDisabled}
          type="button"
          onClick={onEdit}
        >
          <EditIcon className="size-4" />
          Editar notas
        </Button>
      ) : null}
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
  const isPage = variant === "page";

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
      <section className="flex min-h-48 items-center justify-center rounded-2xl border !border-transparent bg-card p-6 text-center text-sm text-muted-foreground shadow-[var(--surface-shadow)]">
        Plan todavía no disponible.
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
    if (isPage) {
      return (
        <WorkspacePanel className="p-6">
          {planLoadNotice}
          <div className="flex min-h-52 flex-col items-center justify-center gap-4 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
              <UserRoundIcon className="size-5" />
            </div>
            <div>
              <p className="text-lg font-semibold">Sin plan asignado</p>
              <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">
                Asigna un plan para definir duración, semanas y sesiones planificadas.
              </p>
            </div>
            <Button asChild className="shadow-none">
              <Link href={`/clients/${clientId}/plan-assignment`}>
                <DumbbellIcon className="size-4" />
                Asignar plan
              </Link>
            </Button>
          </div>
        </WorkspacePanel>
      );
    }

    return (
      <WorkspacePanel className="p-4">
        {planLoadNotice}
        <div className="flex min-h-40 flex-col items-center justify-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-accent text-primary">
            <UserRoundIcon className="size-5" />
          </div>
          <div>
            <p className="font-semibold">Sin plan asignado</p>
            <p className="mt-1 max-w-72 text-sm leading-5 text-muted-foreground">
              Selecciona un template y crea una copia editable para este cliente.
            </p>
          </div>
          <Button asChild className="shadow-none">
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

  if (isPage) {
    const structure = resolveAssignedPlanStructure(assignment.assignedPlan);

    return (
      <WorkspacePanel className="p-5">
        {planLoadNotice}
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.75fr)]">
          <section className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">Plan actual</p>
                <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight">
                  {assignment.assignedPlan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Desde {formatDate(assignment.assignment.startDate) ?? "sin fecha"}
                </p>
              </div>
              <StatusBadge label="Activo" variant="with-plan" />
            </div>

            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <DetailStat
                label="Objetivo"
                value={assignment.assignedPlan.goal || "Sin objetivo"}
              />
              <DetailStat
                label="Nivel"
                value={assignment.assignedPlan.level || "Sin nivel"}
              />
              <DetailStat
                label="Duración"
                value={`${assignment.assignedPlan.durationWeeks} sem.`}
              />
              <DetailStat
                label="Semanas configuradas"
                value={`${structure.weekCount}`}
              />
              <DetailStat
                label="Días de entrenamiento"
                value={`${structure.trainingDayCount}`}
              />
              <DetailStat
                label="Sesiones planificadas"
                value={`${structure.sessionCount}`}
              />
            </div>
          </section>

          <section className="min-w-0 rounded-xl bg-muted/25 p-4">
            <div className="grid gap-2">
              <Button asChild className="shadow-none">
                <Link href={`/clients/${clientId}/plan-assignment/edit`}>
                  <DumbbellIcon className="size-4" />
                  Editar plan
                </Link>
              </Button>
              <Button
                className="justify-start border-destructive/30 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
                size="sm"
                variant="outline"
                onClick={onEndPlan}
              >
                <ArchiveIcon className="size-4" />
                Finalizar plan
              </Button>
            </div>

            <h3 className="mt-5 text-sm font-semibold">Estructura semanal</h3>
            {structure.weeklyBreakdown.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {structure.weeklyBreakdown.map((week) => (
                  <div
                    key={week}
                    className="rounded-xl border bg-background px-3 py-2 text-sm"
                  >
                    {week}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 rounded-xl border border-dashed bg-background/60 p-3 text-sm text-muted-foreground">
                El plan todavía no tiene semanas configuradas.
              </p>
            )}

          </section>
        </div>
      </WorkspacePanel>
    );
  }

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
          label="Duración"
          value={`${assignment.assignedPlan.durationWeeks} sem.`}
        />
        <DetailStat label="Sesiones" value={`${totalSessions}`} />
        <DetailStat label="Progreso" value={`0/${totalSessions}`} />
      </div>

      <div className="mt-4 grid gap-2">
        <Button asChild className="w-full shadow-none">
          <Link href={`/clients/${clientId}/plan-assignment/edit`}>
            <DumbbellIcon className="size-4" />
            Editar plan
          </Link>
        </Button>
        <Button
          className="w-full border-destructive/30 text-destructive shadow-none hover:bg-destructive/10 hover:text-destructive"
          variant="outline"
          onClick={onEndPlan}
        >
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

function NotePreview({
  label,
  previewOnly = false,
  value,
}: {
  label: string;
  previewOnly?: boolean;
  value: string;
}) {
  return (
    <div className="border-b border-border/60 pb-3 last:border-b-0 last:pb-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 whitespace-pre-wrap text-foreground",
          previewOnly && "line-clamp-2",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function formatNullableStat(value: number | null, suffix: string) {
  return value === null ? "Sin dato" : `${value} ${suffix}`;
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
