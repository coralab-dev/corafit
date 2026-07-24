"use client";

import { MailIcon, UsersIcon } from "lucide-react";
import { StatusBadge } from "@/components/shared/status-badge";
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
  isPlansLoading,
  plansError,
  organization,
  subscriptionPlans,
  mutation,
  onRetryPlans,
  onChangePlan,
  onChangeStatus,
}: OrganizationDetailProps) {
  if (!organization) {
    return null;
  }

  const status = getStatusBadgeProps(organization.status);
  const usage = getUsagePresentation(organization);

  return (
    <div className="flex min-h-full flex-col bg-card">
      <header className="border-b px-5 pb-5 pt-7">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-sm font-semibold text-primary">
            {getOrganizationInitials(organization.name)}
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
      </header>

      <div className="divide-y">
        <section className="space-y-4 px-5 py-5" aria-label="Resumen">
          <SectionHeading icon={<UsersIcon aria-hidden="true" className="size-4" />} title="Resumen" />
          <div className="space-y-3">
            <DetailRow label="Owner" value={organization.owner.name} />
            <DetailRow label="Email" value={organization.owner.email} icon={<MailIcon aria-hidden="true" className="size-3.5" />} />
            <DetailRow label="Tipo" value={formatOrganizationType(organization.type)} />
            <DetailRow label="Clientes" value={`${usage.used}${usage.limit === null ? "" : ` de ${usage.limit}`}`} />
          </div>
        </section>

        <section className="space-y-4 px-5 py-5" aria-label="Uso y suscripción">
          <SectionHeading title="Suscripción" />
          <div className="space-y-3">
            <DetailRow label="Estado" value={formatSubscriptionStatus(organization.subscription?.status)} />
            <DetailRow label="Plan" value={formatPlanLabel(organization)} />
            {organization.plan ? <DetailRow label="Código" value={organization.plan.code} /> : null}
          </div>
          <UsageProgress organization={organization} />
        </section>

        <OrganizationActions
          organization={organization}
          subscriptionPlans={subscriptionPlans}
          isPlansLoading={isPlansLoading}
          plansError={plansError}
          mutation={mutation}
          onRetryPlans={onRetryPlans}
          onChangePlan={onChangePlan}
          onChangeStatus={onChangeStatus}
        />
      </div>
    </div>
  );
}

function SectionHeading({ icon, title }: { icon?: React.ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2">
      {icon ? <span className="text-primary">{icon}</span> : null}
      <h3 className="text-sm font-semibold">{title}</h3>
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
        : `${usage.percent}% del límite`;

  return (
    <div className="space-y-2 rounded-xl bg-muted/40 p-3">
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
        <p className="text-xs text-muted-foreground">Sin plan para calcular el límite.</p>
      ) : usage.state === "over-limit" ? (
        <p className="text-xs font-medium text-destructive">El uso actual supera el límite del plan.</p>
      ) : usage.state === "at-limit" ? (
        <p className="text-xs font-medium text-amber-700 dark:text-amber-300">Se alcanzó el límite del plan.</p>
      ) : null}
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 text-sm">
      <p className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </p>
      <div className="min-w-0 truncate text-right font-medium">{value}</div>
    </div>
  );
}

function getOrganizationInitials(name: string) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return initials || "OR";
}
