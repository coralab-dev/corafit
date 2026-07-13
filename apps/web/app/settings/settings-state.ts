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

export function getUsagePercent(used: number | null, limit: number) {
  if (!used || limit <= 0) {
    return 0;
  }

  return Math.min(Math.round((used / limit) * 100), 100);
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
  const clientLimit = billing?.plan.clientLimit ?? profileSubscription.subscriptionPlan.clientLimit;
  const usedClients = billing?.clientUsage?.used ?? billing?.usedClients ?? null;
  const isUsageStale = Boolean(billingError) && !billing;
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
    planName: billing?.plan.name ?? profileSubscription.subscriptionPlan.name,
    renewsAt: billing?.renewsAt ?? null,
    subscriptionStatus: billing?.status ?? profileSubscription.status,
    usedClients,
    usageLabel,
    usagePercent: getUsagePercent(usedClients, clientLimit),
  };
}
