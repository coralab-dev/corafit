import { describe, expect, it } from "vitest";
import { getSettingsPlanSummary } from "./settings-state";

describe("settings plan summary", () => {
  const profileSubscription = {
    status: "active",
    subscriptionPlan: {
      clientLimit: 5,
      name: "Beta Coach",
    },
  };

  it("uses current billing usage when billing is available", () => {
    const summary = getSettingsPlanSummary({
      billing: {
        clientUsage: {
          limit: 5,
          used: 2,
          warningLevel: "ok",
        },
        plan: {
          clientLimit: 5,
          name: "Warm Pro",
        },
        renewsAt: "2026-08-01T00:00:00.000Z",
        status: "trial",
        usedClients: 2,
      },
      billingError: null,
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      canRetry: false,
      clientLimit: 5,
      isUsageStale: false,
      planName: "Warm Pro",
      renewsAt: "2026-08-01T00:00:00.000Z",
      subscriptionStatus: "trial",
      usedClients: 2,
      usageLabel: "2 de 5 clientes",
    });
  });

  it("keeps the profile plan and marks usage stale when billing fails", () => {
    const summary = getSettingsPlanSummary({
      billing: null,
      billingError: "No se pudo cargar billing",
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      canRetry: true,
      clientLimit: 5,
      isUsageStale: true,
      planName: "Beta Coach",
      subscriptionStatus: "active",
      usedClients: null,
      usageLabel: "Uso no actualizado",
      usagePercent: 0,
    });
  });
});
