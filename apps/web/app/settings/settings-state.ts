import type { AuthProfile } from "@/lib/auth/types";

export type SettingsBillingData = {
  status: string;
  renewsAt: string | null;
  usedClients: number;
  clientUsage?: {
    used: number;
    limit: number;
    warningLevel: "ok" | "near_limit" | "at_limit" | "over_limit";
  };
  plan: {
    name: string;
    clientLimit: number;
  };
};

export type SettingsProfileSubscription = {
  status: string;
  subscriptionPlan: {
    name: string;
    clientLimit: number;
  };
};

export type SettingsPlanTone = "ok" | "warning" | "notice" | "critical" | "stale";

export function mergeOrganizationSnapshot(
  current: AuthProfile | null,
  visibleProfile: AuthProfile,
  organization: AuthProfile["organization"],
) {
  return {
    ...(current ?? visibleProfile),
    organization,
  };
}

export function getUsagePercent(used: number | null, limit: number) {
  if (!used || limit <= 0) {
    return 0;
  }

  return Math.round((used / limit) * 100);
}

function getLimitState(
  warningLevel?: NonNullable<SettingsBillingData["clientUsage"]>["warningLevel"],
): {
  limitMessage: string | null;
  tone: SettingsPlanTone;
} {
  switch (warningLevel) {
    case "near_limit":
      return { limitMessage: "Cerca del límite", tone: "warning" };
    case "at_limit":
      return { limitMessage: "Límite alcanzado", tone: "notice" };
    case "over_limit":
      return { limitMessage: "Límite superado", tone: "critical" };
    case "ok":
    default:
      return { limitMessage: null, tone: "ok" };
  }
}

export function getSettingsPlanSummary({
  billing,
  billingError,
  billingLoading,
  profileSubscription,
}: {
  billing: SettingsBillingData | null;
  billingError: string | null;
  billingLoading: boolean;
  profileSubscription: SettingsProfileSubscription;
}) {
  const clientLimit =
    billing?.clientUsage?.limit ??
    billing?.plan.clientLimit ??
    profileSubscription.subscriptionPlan.clientLimit;
  const usedClients = billing?.clientUsage?.used ?? billing?.usedClients ?? null;
  const isUsageStale = Boolean(billingError) && !billing;
  const limitState = isUsageStale
    ? { limitMessage: "Uso no actualizado", tone: "stale" as const }
    : getLimitState(billing?.clientUsage?.warningLevel);
  const usageLabel = billingLoading
    ? "Actualizando uso"
    : isUsageStale
      ? "Uso no actualizado"
      : usedClients === null
        ? "Uso no disponible"
        : `${usedClients} de ${clientLimit} clientes`;

  return {
    canRetry: isUsageStale,
    clientLimit,
    isUsageStale,
    limitMessage: limitState.limitMessage,
    planName: billing?.plan.name ?? profileSubscription.subscriptionPlan.name,
    renewsAt: billing?.renewsAt ?? null,
    subscriptionStatus: billing?.status ?? profileSubscription.status,
    tone: limitState.tone,
    usedClients,
    usageLabel,
    usagePercent: getUsagePercent(usedClients, clientLimit),
  };
}
