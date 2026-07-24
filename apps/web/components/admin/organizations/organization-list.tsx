"use client";

import { Building2Icon, SearchIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import type { AdminOrganization, AdminOrganizationStatus } from "@/hooks/use-admin-organizations";
import { cn } from "@/lib/utils";
import {
  formatClientUsage,
  formatDate,
  formatOrganizationType,
  formatPlanLabel,
  formatSubscriptionStatus,
  getStatusBadgeProps,
} from "./organization-formatters";

type OrganizationListProps = {
  items: AdminOrganization[];
  selectedId: string;
  isInitialLoading: boolean;
  isRefreshing: boolean;
  listError?: string;
  search: string;
  status: AdminOrganizationStatus | "all";
  onSearchChange: (value: string) => void;
  onStatusChange: (value: AdminOrganizationStatus | "all") => void;
  onSelect: (organizationId: string) => void;
  onClearFilters: () => void;
  onRetry?: () => void;
};

const statusOptions: Array<{ value: AdminOrganizationStatus | "all"; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activas" },
  { value: "suspended", label: "Suspendidas" },
  { value: "cancelled", label: "Canceladas" },
];

export function OrganizationList({
  items,
  selectedId,
  isInitialLoading,
  isRefreshing,
  listError = "",
  search,
  status,
  onSearchChange,
  onStatusChange,
  onSelect,
  onClearFilters,
  onRetry,
}: OrganizationListProps) {
  const hasFilters = Boolean(search.trim() || status !== "all");

  return (
    <WorkspacePanel className="overflow-hidden" title="Organizaciones">
      <div className="grid gap-3 border-b p-4 md:grid-cols-[minmax(0,1fr)_180px_auto] md:items-end">
        <label className="relative block min-w-0">
          <span className="sr-only">Buscar organizaciones</span>
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por organización o email del owner"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <label className="block min-w-0">
          <span className="sr-only">Filtrar por estado</span>
          <select
            aria-label="Filtrar por estado"
            className="flex h-10 w-full rounded-xl border bg-card px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as AdminOrganizationStatus | "all")}
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        {hasFilters ? (
          <Button type="button" variant="ghost" className="justify-self-start" onClick={onClearFilters}>
            Limpiar filtros
          </Button>
        ) : null}
      </div>

      {isRefreshing ? (
        <div className="border-b px-4 py-2 text-xs text-muted-foreground" role="status">
          Actualizando resultados…
        </div>
      ) : null}

      {listError && items.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-destructive/5 px-4 py-3 text-sm text-destructive" role="alert">
          <span>{listError}</span>
          {onRetry ? (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {listError && items.length === 0 ? (
        <div className="p-4">
          <ErrorState message={listError} onRetry={onRetry} />
        </div>
      ) : isInitialLoading ? (
        <ListSkeleton />
      ) : items.length === 0 ? (
        <div className="p-4">
          <EmptyState
            icon={Building2Icon}
            title={hasFilters ? "Sin resultados" : "Sin organizaciones en la plataforma"}
            description={
              hasFilters
                ? "No hay organizaciones que coincidan con los filtros actuales."
                : "Todavía no hay organizaciones disponibles para supervisar."
            }
            actionLabel={hasFilters ? "Limpiar filtros" : undefined}
            onAction={hasFilters ? onClearFilters : undefined}
          />
        </div>
      ) : (
        <div>
          <div className="hidden grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_120px_190px] gap-3 border-b px-4 py-3 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground md:grid">
            <span>Organización</span>
            <span>Owner</span>
            <span>Clientes</span>
            <span>Plan / suscripción</span>
          </div>
          <div className="divide-y">
            {items.map((organization) => (
              <OrganizationRow
                key={organization.id}
                organization={organization}
                selected={organization.id === selectedId}
                onSelect={() => onSelect(organization.id)}
              />
            ))}
          </div>
        </div>
      )}
    </WorkspacePanel>
  );
}

function OrganizationRow({
  onSelect,
  organization,
  selected,
}: {
  onSelect: () => void;
  organization: AdminOrganization;
  selected: boolean;
}) {
  const status = getStatusBadgeProps(organization.status);
  const needsReview = Boolean(
    organization.plan && organization.clientsUsed >= organization.plan.clientLimit,
  );

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "grid w-full min-w-0 gap-3 px-4 py-4 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:ring-inset md:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_120px_190px] md:items-center",
        selected && "bg-accent text-accent-foreground",
      )}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="min-w-0 truncate text-sm font-semibold">{organization.name}</p>
          <StatusBadge {...status} />
        </div>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {formatOrganizationType(organization.type)} · creada {formatDate(organization.createdAt)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm">{organization.owner.name}</p>
        <p className="truncate text-xs text-muted-foreground">{organization.owner.email}</p>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Clientes</span>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{formatClientUsage(organization)}</p>
          {needsReview ? (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:bg-amber-950/45 dark:text-amber-300">
              Revisión
            </span>
          ) : null}
        </div>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2 md:block">
        <span className="text-xs text-muted-foreground md:hidden">Plan / suscripción</span>
        <div className="min-w-0 text-right md:text-left">
          <p className="truncate text-sm">{formatPlanLabel(organization)}</p>
          <p className="truncate text-xs text-muted-foreground">
            {formatSubscriptionStatus(organization.subscription?.status)}
          </p>
        </div>
      </div>
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y" role="status" aria-label="Cargando organizaciones">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-3 px-4 py-5 md:grid-cols-4">
          <div className="h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
