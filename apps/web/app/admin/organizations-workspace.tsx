"use client";

import {
  Building2Icon,
  RefreshCwIcon,
  SearchIcon,
  ShieldCheckIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DetailSkeleton, TableSkeleton } from "@/components/shared/skeletons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  WorkspaceFrame,
  WorkspaceHeader,
  WorkspacePanel,
  WorkspaceSplit,
} from "@/components/layout/workspace-shell";
import { useAuth } from "@/components/providers/auth-provider";
import {
  type AdminOrganization,
  type AdminOrganizationStatus,
  useAdminOrganizations,
} from "@/hooks/use-admin-organizations";
import { cn } from "@/lib/utils";

const organizationStatusLabels: Record<AdminOrganizationStatus, string> = {
  active: "Activa",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

const organizationTypeLabels: Record<string, string> = {
  individual: "Individual",
  studio: "Estudio",
};

const subscriptionStatusLabels: Record<string, string> = {
  active: "Activa",
  cancelled: "Cancelada",
  expired: "Expirada",
  past_due: "Pago pendiente",
  suspended: "Suspendida",
  trial: "Trial",
};

export function AdminOrganizationsWorkspace() {
  const { profile, status: authStatus } = useAuth();
  const isAdmin = profile?.user.platformRole === "admin_saas";
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<AdminOrganizationStatus | "all">("all");

  const {
    detailError,
    error,
    isDetailLoading,
    isLoading,
    items,
    refresh,
    selectOrganization,
    selectedId,
    selectedOrganization,
  } = useAdminOrganizations({ search, status });

  const totals = useMemo(
    () => ({
      active: items.filter((item) => item.status === "active").length,
      clientsUsed: items.reduce((sum, item) => sum + item.clientsUsed, 0),
      organizations: items.length,
    }),
    [items],
  );
  const isInitialLoading = isLoading && items.length === 0;

  if (authStatus === "loading") {
    return (
      <WorkspaceFrame
        header={<WorkspaceHeader title="Admin" description="Validando permisos." />}
      >
        <AdminOrganizationsSkeleton />
      </WorkspaceFrame>
    );
  }

  if (!isAdmin) {
    return (
      <WorkspaceFrame
        header={
          <WorkspaceHeader
            title="Admin"
            description="Herramientas internas para operacion beta."
          />
        }
      >
        <div className="flex flex-1 items-center justify-center bg-background p-6">
          <ErrorState
            title="Acceso denegado"
            message="Tu usuario no tiene permisos de administrador SaaS."
          />
        </div>
      </WorkspaceFrame>
    );
  }

  return (
    <WorkspaceFrame
      header={
        <WorkspaceHeader
          title="Admin / Organizaciones"
          description="Vista minima de operacion beta para soporte y revision tecnica."
          actions={
            <>
              <Button variant="outline" className="shadow-none" onClick={() => void refresh()}>
                <RefreshCwIcon className="size-4" />
                Actualizar
              </Button>
            </>
          }
        />
      }
    >
      <WorkspaceSplit
        main={
          <section className="min-w-0 bg-background p-4 md:p-5">
            {isInitialLoading ? (
              <AdminMetricsSkeleton />
            ) : (
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <Metric label="Organizaciones" value={totals.organizations} />
                <Metric label="Activas" value={totals.active} />
                <Metric label="Clientes usados" value={totals.clientsUsed} />
              </div>
            )}

            <WorkspacePanel className="overflow-hidden" title="Organizaciones beta">
              <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(240px,1fr)_180px]">
                <label className="relative block">
                  <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar por organizacion u owner"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <Select
                  value={status}
                  onChange={(value) => setStatus(value as AdminOrganizationStatus | "all")}
                >
                  <option value="all">Todos los estados</option>
                  {Object.entries(organizationStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </div>

              {error ? (
                <div className="p-4">
                  <ErrorState message={error} onRetry={() => void refresh()} />
                </div>
              ) : isInitialLoading ? (
                <div className="p-4">
                  <TableSkeleton rows={6} />
                </div>
              ) : items.length === 0 ? (
                <div className="p-4">
                  <EmptyState
                    icon={Building2Icon}
                    title="Sin organizaciones"
                    description="No hay organizaciones que coincidan con los filtros actuales."
                  />
                </div>
              ) : (
                <div className="divide-y">
                  {items.map((organization) => (
                    <OrganizationRow
                      key={organization.id}
                      organization={organization}
                      selected={organization.id === selectedId}
                      onSelect={() => selectOrganization(organization.id)}
                    />
                  ))}
                </div>
              )}
            </WorkspacePanel>
          </section>
        }
        side={
          <OrganizationDetail
            detailError={detailError}
            isLoading={isDetailLoading}
            organization={selectedOrganization}
          />
        }
        sideClassName="xl:w-[380px] xl:min-w-[340px]"
      />
    </WorkspaceFrame>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-card px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function AdminMetricsSkeleton() {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-3" role="status" aria-label="Cargando metricas admin">
      {[0, 1, 2].map((item) => (
        <div key={item} className="rounded-md border bg-card px-4 py-3">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="mt-3 h-7 w-16" />
        </div>
      ))}
    </div>
  );
}

function AdminOrganizationsSkeleton() {
  return (
    <WorkspaceSplit
      main={
        <section className="min-w-0 bg-background p-4 md:p-5">
          <AdminMetricsSkeleton />
          <WorkspacePanel className="overflow-hidden">
            <div className="grid gap-3 border-b p-4 lg:grid-cols-[minmax(240px,1fr)_180px]">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="p-4">
              <TableSkeleton rows={6} />
            </div>
          </WorkspacePanel>
        </section>
      }
      side={
        <aside className="p-4">
          <DetailSkeleton />
        </aside>
      }
      sideClassName="xl:w-[380px] xl:min-w-[340px]"
    />
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
  return (
    <button
      type="button"
      className={cn(
        "grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/60 lg:grid-cols-[minmax(220px,1.3fr)_minmax(180px,1fr)_120px_150px]",
        selected && "bg-muted",
      )}
      onClick={onSelect}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <p className="truncate text-sm font-semibold">{organization.name}</p>
          <StatusBadge status={organization.status} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {organizationTypeLabels[organization.type] ?? organization.type} · creada {formatDate(organization.createdAt)}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm">{organization.owner.name}</p>
        <p className="truncate text-xs text-muted-foreground">{organization.owner.email}</p>
      </div>
      <div>
        <p className="text-xs text-muted-foreground">Clientes</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">
            {formatClientUsage(organization)}
          </p>
          {needsPlanReview(organization) ? (
            <Badge variant="secondary">Revision</Badge>
          ) : null}
        </div>
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm">{formatPlan(organization)}</p>
        <p className="truncate text-xs text-muted-foreground">
          {formatSubscriptionStatus(organization.subscription?.status)}
        </p>
      </div>
    </button>
  );
}

function OrganizationDetail({
  detailError,
  isLoading,
  organization,
}: {
  detailError: string;
  isLoading: boolean;
  organization: AdminOrganization | null;
}) {
  if (detailError) {
    return (
      <aside className="p-4">
        <ErrorState message={detailError} />
      </aside>
    );
  }

  if (!organization) {
    if (isLoading) {
      return (
        <aside className="p-4">
          <DetailSkeleton />
        </aside>
      );
    }

    return (
      <aside className="p-4">
        <EmptyState
          icon={ShieldCheckIcon}
          title="Selecciona una organizacion"
          description="El detalle mostrara solo datos operativos basicos."
        />
      </aside>
    );
  }

  return (
    <aside className="space-y-4 p-4">
      <WorkspacePanel
        title="Detalle operativo"
        description="Solo lectura para soporte beta."
        icon={<Building2Icon className="size-4" />}
      >
        <div className="divide-y">
          <DetailRow label="Organizacion" value={organization.name} />
          <DetailRow
            label="Tipo"
            value={organizationTypeLabels[organization.type] ?? organization.type}
          />
          <DetailRow label="Estado" value={<StatusBadge status={organization.status} />} />
          <DetailRow label="Creada" value={formatDateTime(organization.createdAt)} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Owner" icon={<UsersIcon className="size-4" />}>
        <div className="divide-y">
          <DetailRow label="Nombre" value={organization.owner.name} />
          <DetailRow label="Email" value={organization.owner.email} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Plan y uso" icon={<ShieldCheckIcon className="size-4" />}>
        <div className="divide-y">
          <DetailRow
            label="Suscripcion"
            value={formatSubscriptionStatus(organization.subscription?.status)}
          />
          <DetailRow label="Plan" value={organization.plan?.name ?? "Sin plan"} />
          <DetailRow label="Codigo" value={organization.plan?.code ?? "N/A"} />
          <DetailRow
            label="Limite clientes"
            value={organization.plan ? organization.plan.clientLimit : "N/A"}
          />
          <DetailRow
            label="Clientes usados"
            value={
              <div className="flex flex-wrap items-center gap-2">
                <span>{formatClientUsage(organization)}</span>
                {needsPlanReview(organization) ? (
                  <Badge variant="secondary">Revision manual</Badge>
                ) : null}
              </div>
            }
          />
        </div>
      </WorkspacePanel>
    </aside>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px,minmax(0,1fr)] gap-3 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="min-w-0 text-sm font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: AdminOrganizationStatus }) {
  const variant = status === "active" ? "default" : status === "suspended" ? "secondary" : "muted";

  return (
    <Badge variant={variant}>
      {organizationStatusLabels[status] ?? status}
    </Badge>
  );
}

function Select({
  children,
  onChange,
  value,
}: {
  children: React.ReactNode;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <select
      className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/25"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {children}
    </select>
  );
}

function formatPlan(organization: AdminOrganization) {
  if (!organization.plan) {
    return "Sin plan";
  }

  return `${organization.plan.code} · ${organization.plan.name} · ${organization.plan.clientLimit}`;
}

function formatClientUsage(organization: AdminOrganization) {
  if (!organization.plan) {
    return organization.clientsUsed;
  }

  return `${organization.clientsUsed} / ${organization.plan.clientLimit}`;
}

function needsPlanReview(organization: AdminOrganization) {
  return Boolean(
    organization.plan && organization.clientsUsed >= organization.plan.clientLimit,
  );
}

function formatSubscriptionStatus(status: string | null | undefined) {
  if (!status) {
    return "Sin suscripcion";
  }

  return subscriptionStatusLabels[status] ?? status;
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
