import type { AdminOrganization, AdminOrganizationStatus } from "@/hooks/use-admin-organizations";

export type OrganizationMetrics = {
  results: number;
  active: number;
  suspended: number;
  clientsUsed: number;
};

export type OrganizationUsageState = "no-plan" | "healthy" | "at-limit" | "over-limit";

export type OrganizationUsagePresentation = {
  state: OrganizationUsageState;
  percent: number;
  used: number;
  limit: number | null;
};

const organizationStatusLabels: Record<AdminOrganizationStatus, string> = {
  active: "Activa",
  suspended: "Suspendida",
  cancelled: "Cancelada",
};

const organizationStatusVariants = {
  active: "success",
  suspended: "warning",
  cancelled: "danger",
} as const;

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

export function getOrganizationMetrics(items: AdminOrganization[]): OrganizationMetrics {
  return {
    results: items.length,
    active: items.filter((item) => item.status === "active").length,
    suspended: items.filter((item) => item.status === "suspended").length,
    clientsUsed: items.reduce((total, item) => total + item.clientsUsed, 0),
  };
}

export function getUsagePresentation(
  organization: AdminOrganization,
): OrganizationUsagePresentation {
  const used = organization.clientsUsed;
  const limit = organization.plan?.clientLimit ?? null;

  if (!limit || limit < 1) {
    return { state: "no-plan", percent: 0, used, limit };
  }

  const percent = Math.min(100, Math.round((used / limit) * 100));
  const state = used > limit ? "over-limit" : used === limit ? "at-limit" : "healthy";

  return { state, percent, used, limit };
}

export function formatClientUsage(organization: AdminOrganization) {
  return organization.plan
    ? `${organization.clientsUsed} / ${organization.plan.clientLimit}`
    : `${organization.clientsUsed}`;
}

export function formatPlanLabel(organization: AdminOrganization) {
  return organization.plan ? `${organization.plan.code} · ${organization.plan.name}` : "Sin plan";
}

export function getStatusBadgeProps(status: AdminOrganizationStatus) {
  return {
    label: organizationStatusLabels[status] ?? status,
    variant: organizationStatusVariants[status],
  } as const;
}

export function formatOrganizationType(type: string) {
  return organizationTypeLabels[type] ?? type;
}

export function formatSubscriptionStatus(status: string | null | undefined) {
  return status ? subscriptionStatusLabels[status] ?? status : "Sin suscripción";
}

export function formatDate(value: string) {
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

export function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatPlanPrice(plan: { betaPrice: number; currency: string }) {
  return new Intl.NumberFormat("es-MX", {
    currency: plan.currency,
    style: "currency",
  }).format(plan.betaPrice);
}
