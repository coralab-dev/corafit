import { describe, expect, it } from "vitest";
import type { AdminOrganization } from "@/hooks/use-admin-organizations";
import {
  formatClientUsage,
  formatPlanLabel,
  getOrganizationMetrics,
  getStatusBadgeProps,
  getUsagePresentation,
} from "./organization-formatters";

function organization(
  status: AdminOrganization["status"],
  clientsUsed: number,
  plan: AdminOrganization["plan"] = {
    id: "plan-1",
    code: "starter",
    name: "Starter",
    clientLimit: 10,
  },
): AdminOrganization {
  return {
    id: `${status}-${clientsUsed}`,
    name: "CoraFit Studio",
    type: "studio",
    status,
    createdAt: "2026-01-01T00:00:00.000Z",
    owner: { id: "owner-1", name: "Ana Owner", email: "ana@example.com" },
    subscription: plan ? { status: "active" } : null,
    plan,
    clientsUsed,
  };
}

describe("organization formatters", () => {
  it("calculates metrics from the filtered result set", () => {
    expect(
      getOrganizationMetrics([
        organization("active", 4),
        organization("active", 3),
        organization("suspended", 2),
        organization("cancelled", 1),
      ]),
    ).toEqual({ results: 4, active: 2, suspended: 1, clientsUsed: 10 });
  });

  it("handles no plan, below limit, at limit, and over limit usage", () => {
    expect(getUsagePresentation(organization("active", 3, null))).toMatchObject({
      state: "no-plan",
      percent: 0,
    });
    expect(getUsagePresentation(organization("active", 3))).toMatchObject({
      state: "healthy",
      percent: 30,
    });
    expect(getUsagePresentation(organization("active", 10))).toMatchObject({
      state: "at-limit",
      percent: 100,
    });
    expect(getUsagePresentation(organization("active", 12))).toMatchObject({
      state: "over-limit",
      percent: 100,
    });
  });

  it("formats plan, usage, and semantic status badge values", () => {
    const item = organization("suspended", 12);

    expect(formatPlanLabel(item)).toBe("starter · Starter");
    expect(formatClientUsage(item)).toBe("12 / 10");
    expect(getStatusBadgeProps("active")).toEqual({ label: "Activa", variant: "success" });
    expect(getStatusBadgeProps("suspended")).toEqual({ label: "Suspendida", variant: "warning" });
    expect(getStatusBadgeProps("cancelled")).toEqual({ label: "Cancelada", variant: "danger" });
  });
});
