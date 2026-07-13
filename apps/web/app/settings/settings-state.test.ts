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
      tone: "ok",
      usedClients: 2,
      usageLabel: "2 de 5 clientes",
    });
  });

  it("uses the client usage limit as the effective limit", () => {
    const summary = getSettingsPlanSummary({
      billing: {
        clientUsage: {
          limit: 4,
          used: 2,
          warningLevel: "ok",
        },
        plan: {
          clientLimit: 5,
          name: "Warm Pro",
        },
        renewsAt: null,
        status: "active",
        usedClients: 2,
      },
      billingError: null,
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      clientLimit: 4,
      usageLabel: "2 de 4 clientes",
      usagePercent: 50,
    });
  });

  it("marks near limit usage as a warning", () => {
    const summary = getSettingsPlanSummary({
      billing: {
        clientUsage: {
          limit: 5,
          used: 4,
          warningLevel: "near_limit",
        },
        plan: {
          clientLimit: 5,
          name: "Warm Pro",
        },
        renewsAt: null,
        status: "active",
        usedClients: 4,
      },
      billingError: null,
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      limitMessage: "Cerca del límite",
      tone: "warning",
      usagePercent: 80,
    });
  });

  it("marks at limit usage as a clear notice", () => {
    const summary = getSettingsPlanSummary({
      billing: {
        clientUsage: {
          limit: 5,
          used: 5,
          warningLevel: "at_limit",
        },
        plan: {
          clientLimit: 5,
          name: "Warm Pro",
        },
        renewsAt: null,
        status: "active",
        usedClients: 5,
      },
      billingError: null,
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      limitMessage: "Límite alcanzado",
      tone: "notice",
      usagePercent: 100,
    });
  });

  it("marks over limit usage as critical without hiding the overflow", () => {
    const summary = getSettingsPlanSummary({
      billing: {
        clientUsage: {
          limit: 5,
          used: 6,
          warningLevel: "over_limit",
        },
        plan: {
          clientLimit: 5,
          name: "Warm Pro",
        },
        renewsAt: null,
        status: "active",
        usedClients: 6,
      },
      billingError: null,
      billingLoading: false,
      profileSubscription,
    });

    expect(summary).toMatchObject({
      limitMessage: "Límite superado",
      tone: "critical",
      usageLabel: "6 de 5 clientes",
      usagePercent: 120,
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
