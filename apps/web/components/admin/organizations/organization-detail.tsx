"use client";

import { Building2Icon, ShieldCheckIcon, UsersIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { StatusBadge } from "@/components/shared/status-badge";
import { WorkspacePanel } from "@/components/layout/workspace-shell";
import type {
  AdminOrganization,
  AdminOrganizationStatusAction,
  AdminSubscriptionPlan,
  OrganizationMutation,
} from "@/hooks/use-admin-organizations";
import {
  formatDateTime,
  formatOrganizationType,
  formatPlanLabel,
  formatSubscriptionStatus,
  getStatusBadgeProps,
  getUsagePresentation,
} from "./organization-formatters";
import { OrganizationActions } from "./organization-actions";

type OrganizationDetailProps = {
  detailError: string;
  isLoading: boolean;
  isPlansLoading: boolean;
  plansError: string;
  organization: AdminOrganization | null;
  subscriptionPlans: AdminSubscriptionPlan[];
  mutation: OrganizationMutation | null;
  onRetryPlans: () => void;
  onChangePlan: (organizationId: string, planCode: string) => Promise<AdminOrganization>;
  onChangeStatus: (
    organizationId: string,
    action: AdminOrganizationStatusAction,
  ) => Promise<AdminOrganization>;
};

export function OrganizationDetail({
  detailError,
  isLoading,
  isPlansLoading,
  plansError,
  organization,
  subscriptionPlans,
  mutation,
  onRetryPlans,
  onChangePlan,
  onChangeStatus,
}: OrganizationDetailProps) {
  if (detailError) {
    return <div className="p-4"><ErrorState message={detailError} /></div>;
  }

  if (!organization) {
    if (isLoading) {
      return <OrganizationDetailSkeleton />;
    }

    return (
      <div className="p-4">
        <EmptyState
          icon={ShieldCheckIcon}
          title="Selecciona una organización"
          description="El detalle operativo aparecerá aquí."
        />
      </div>
    );
  }

  const status = getStatusBadgeProps(organization.status);
  const usage = getUsagePresentation(organization);

  return (
    <div className="space-y-4 p-4">
      <WorkspacePanel>
        <div className="flex items-start gap-3 p-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-primary">
            <Building2Icon aria-hidden="true" className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <h2 className="min-w-0 truncate text-lg font-semibold">{organization.name}</h2>
              <StatusBadge {...status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatOrganizationType(organization.type)} · creada {formatDateTime(organization.createdAt)}
            </p>
          </div>
        </div>
        <div className="divide-y border-t">
          <DetailRow label="Tipo" value={formatOrganizationType(organization.type)} />
          <DetailRow label="Creada" value={formatDateTime(organization.createdAt)} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Owner" icon={<UsersIcon aria-hidden="true" className="size-4" />}>
        <div className="divide-y">
          <DetailRow label="Nombre" value={organization.owner.name} />
          <DetailRow label="Email" value={organization.owner.email} />
        </div>
      </WorkspacePanel>

      <WorkspacePanel title="Plan y uso" icon={<ShieldCheckIcon aria-hidden="true" className="size-4" />}>
        <div className="divide-y">
          <DetailRow label="Suscripción" value={formatSubscriptionStatus(organization.subscription?.status)} />
          <DetailRow label="Plan" value={formatPlanLabel(organization)} />
          <DetailRow label="Código" value={organization.plan?.code ?? "N/A"} />
          <DetailRow label="Clientes usados" value={`${usage.used}`} />
          <DetailRow label="Límite" value={usage.limit ?? "Sin plan"} />
        </div>
        <UsageProgress organization={organization} />
        <OrganizationActions
          key={`${organization.id}-${organization.plan?.code ?? "none"}`}
          organization={organization}
          subscriptionPlans={subscriptionPlans}
          isPlansLoading={isPlansLoading}
          plansError={plansError}
          mutation={mutation}
          onRetryPlans={onRetryPlans}
          onChangePlan={onChangePlan}
          onChangeStatus={onChangeStatus}
        />
      </WorkspacePanel>
    </div>
  );
}

function UsageProgress({ organization }: { organization: AdminOrganization }) {
  const usage = getUsagePresentation(organization);
  const label = usage.state === "no-plan"
    ? "Sin plan"
    : usage.state === "over-limit"
      ? "Sobre el límite"
      : usage.state === "at-limit"
        ? "En el límite"
        : "Dentro del límite";

  return (
    <div className="space-y-2 border-t p-4">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium">Uso de clientes</span>
        <span className="text-muted-foreground">{label}</span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-label="Uso de clientes"
        aria-valuemin={0}
        aria-valuemax={usage.limit ?? 0}
        aria-valuenow={usage.limit ? Math.min(usage.used, usage.limit) : 0}
      >
        <div
          className={
            usage.state === "over-limit"
              ? "h-full rounded-full bg-destructive"
              : usage.state === "at-limit"
                ? "h-full rounded-full bg-amber-500"
                : "h-full rounded-full bg-primary"
          }
          style={{ width: `${usage.percent}%` }}
        />
      </div>
      {usage.state === "no-plan" ? (
        <p className="text-xs text-muted-foreground">No hay una suscripción activa para calcular el límite.</p>
      ) : usage.state === "over-limit" ? (
        <p className="text-xs font-medium text-destructive">El uso actual supera el límite del plan.</p>
      ) : usage.state === "at-limit" ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Se alcanzó el límite del plan.</p>
      ) : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[112px,minmax(0,1fr)] gap-3 px-4 py-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <div className="min-w-0 break-words text-right text-sm font-medium sm:text-left">{value}</div>
    </div>
  );
}

function OrganizationDetailSkeleton() {
  return (
    <div className="space-y-4 p-4" role="status" aria-label="Cargando detalle">
      {[0, 1, 2].map((section) => (
        <div key={section} className="space-y-3 rounded-2xl bg-card p-4 shadow-[var(--surface-shadow-soft)]">
          <div className="h-5 w-40 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
          <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
