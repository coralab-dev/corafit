"use client";

import { Building2Icon, SearchIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { AdminOrganization, AdminOrganizationStatus } from "@/hooks/use-admin-organizations";
import { cn } from "@/lib/utils";
import {
  formatClientUsage,
  formatDate,
  formatOrganizationType,
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
    <section className="overflow-hidden rounded-2xl border !border-transparent bg-card shadow-[var(--surface-shadow)]">
      <div className="space-y-3 border-b p-4 sm:p-5">
        <div className="relative">
          <SearchIcon aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-11 border-border/90 bg-background pl-11 shadow-none"
            placeholder="Buscar por organización o email del owner"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              aria-pressed={status === option.value}
              className={cn(
                "h-9 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
                status === option.value
                  ? "border-primary/45 bg-primary/10 text-primary"
                  : "border-border/55 bg-card text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
              onClick={() => onStatusChange(option.value)}
            >
              {option.label}
            </button>
          ))}
          {hasFilters ? (
            <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={onClearFilters}>
              Limpiar filtros
            </Button>
          ) : null}
        </div>
      </div>

      <span className="sr-only" role="status" aria-live="polite">
        {isRefreshing ? "Actualizando resultados." : ""}
      </span>

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
        <>
          <div className="space-y-3 p-4 md:hidden">
            {items.map((organization) => (
              <OrganizationMobileRow
                key={organization.id}
                organization={organization}
                selected={organization.id === selectedId}
                onSelect={() => onSelect(organization.id)}
              />
            ))}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-secondary/55">
                <tr className="border-b text-left text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Organización</th>
                  <th className="px-4 py-3 font-semibold">Owner</th>
                  <th className="px-4 py-3 font-semibold">Uso</th>
                  <th className="px-4 py-3 font-semibold">Plan</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {items.map((organization) => (
                  <OrganizationDesktopRow
                    key={organization.id}
                    organization={organization}
                    selected={organization.id === selectedId}
                    onSelect={() => onSelect(organization.id)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function OrganizationMobileRow({
  onSelect,
  organization,
  selected,
}: {
  onSelect: () => void;
  organization: AdminOrganization;
  selected: boolean;
}) {
  const status = getStatusBadgeProps(organization.status);
  const needsReview = Boolean(organization.plan && organization.clientsUsed >= organization.plan.clientLimit);

  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "w-full rounded-2xl border !border-transparent bg-background p-4 text-left shadow-[var(--surface-shadow-soft)] transition-colors hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35",
        selected && "bg-accent/55 shadow-[inset_3px_0_0_var(--primary),0_12px_28px_rgba(217,95,73,0.08)]",
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <OrganizationAvatar name={organization.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-semibold">{organization.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatOrganizationType(organization.type)} · creada {formatDate(organization.createdAt)}
              </p>
              <p className="mt-1 truncate text-xs text-muted-foreground">{organization.owner.email}</p>
            </div>
            <StatusBadge {...status} />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-card p-3 shadow-[var(--surface-shadow-soft)]">
              <p className="text-xs font-medium text-muted-foreground">Plan</p>
              <p className="mt-1 truncate font-medium">{organization.plan?.name ?? "Sin plan"}</p>
            </div>
            <div className="rounded-xl bg-card p-3 shadow-[var(--surface-shadow-soft)]">
              <p className="text-xs font-medium text-muted-foreground">Clientes</p>
              <p className="mt-1 font-medium">{formatClientUsage(organization)}</p>
              {needsReview ? <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Revisión</p> : null}
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

function OrganizationDesktopRow({
  onSelect,
  organization,
  selected,
}: {
  onSelect: () => void;
  organization: AdminOrganization;
  selected: boolean;
}) {
  const status = getStatusBadgeProps(organization.status);
  const needsReview = Boolean(organization.plan && organization.clientsUsed >= organization.plan.clientLimit);

  return (
    <tr>
      <td colSpan={5} className="p-0">
        <button
          type="button"
          aria-pressed={selected}
          className={cn(
            "grid w-full grid-cols-[minmax(220px,1.35fr)_minmax(190px,1fr)_120px_minmax(140px,1fr)_120px] items-center gap-3 border-b px-4 py-4 text-left transition-colors last:border-b-0 hover:bg-secondary/45 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/35 focus-visible:ring-inset",
            selected && "bg-accent/55 shadow-[inset_3px_0_0_var(--primary)] hover:bg-accent/65",
          )}
          onClick={onSelect}
        >
          <div className="flex min-w-0 items-center gap-3">
            <OrganizationAvatar name={organization.name} small />
            <div className="min-w-0">
              <p className="truncate font-semibold">{organization.name}</p>
              <p className="truncate text-xs text-muted-foreground">
                {formatOrganizationType(organization.type)} · creada {formatDate(organization.createdAt)}
              </p>
            </div>
          </div>
          <div className="min-w-0">
            <p className="truncate">{organization.owner.name}</p>
            <p className="truncate text-xs text-muted-foreground">{organization.owner.email}</p>
          </div>
          <div className="min-w-0">
            <p className="font-semibold">{formatClientUsage(organization)}</p>
            {needsReview ? <p className="mt-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300">Revisión</p> : null}
          </div>
          <div className="min-w-0">
            <p className="truncate">{organization.plan?.name ?? "Sin plan"}</p>
            {organization.plan ? <p className="truncate text-xs text-muted-foreground">{organization.plan.code}</p> : null}
            {organization.subscription ? <p className="truncate text-xs text-muted-foreground">{formatSubscriptionStatus(organization.subscription.status)}</p> : null}
          </div>
          <div className="min-w-0">
            <StatusBadge {...status} />
          </div>
        </button>
      </td>
    </tr>
  );
}

function OrganizationAvatar({ name, small = false }: { name: string; small?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "OR";

  return (
    <div className={cn(
      "flex shrink-0 items-center justify-center rounded-xl bg-accent text-xs font-semibold text-primary",
      small ? "size-9" : "size-11 rounded-2xl",
    )}>
      {initials}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y" role="status" aria-label="Cargando organizaciones">
      {Array.from({ length: 5 }, (_, index) => (
        <div key={index} className="grid gap-3 px-4 py-5 md:grid-cols-5">
          <div className="h-4 w-40 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
          <div className="h-4 w-32 max-w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-20 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
