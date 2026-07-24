import { describe, expect, it } from "vitest";
import type { AdminOrganization } from "@/hooks/use-admin-organizations";
import type { AdminSubscriptionPlan } from "@/hooks/use-admin-organizations";
import {
  canSubmitPlan,
  createLatestRequestController,
  getNextSelectedId,
  isMutationFor,
} from "./organization-state";

const items = [
  { id: "org-a" },
  { id: "org-b" },
  { id: "org-c" },
] as AdminOrganization[];

describe("organization state helpers", () => {
  it("selects the next available organization when the current one disappears", () => {
    expect(getNextSelectedId(items, "org-b")).toBe("org-b");
    expect(getNextSelectedId(items.filter((item) => item.id !== "org-b"), "org-b", items)).toBe("org-c");
    expect(getNextSelectedId(items.filter((item) => item.id !== "org-c"), "org-c", items)).toBe("org-a");
    expect(getNextSelectedId([], "org-a")).toBe("");
  });

  it("invalidates an older request when a newer request starts", () => {
    const requests = createLatestRequestController();
    const first = requests.begin();
    const second = requests.begin();

    expect(first.controller.signal.aborted).toBe(true);
    expect(requests.isCurrent(first.id)).toBe(false);
    expect(requests.isCurrent(second.id)).toBe(true);
  });

  it("allows only active plans that differ from the current plan", () => {
    const activePlan = { code: "pro", status: "active" } as AdminSubscriptionPlan;
    const inactivePlan = { code: "legacy", status: "inactive" } as AdminSubscriptionPlan;

    expect(canSubmitPlan("starter", activePlan)).toBe(true);
    expect(canSubmitPlan("starter", inactivePlan)).toBe(false);
    expect(canSubmitPlan("pro", activePlan)).toBe(false);
  });

  it("identifies the organization mutation lock", () => {
    const mutation = { organizationId: "org-a", kind: "plan" } as const;

    expect(isMutationFor(mutation, "org-a", "plan")).toBe(true);
    expect(isMutationFor(mutation, "org-a", "status")).toBe(false);
    expect(isMutationFor(mutation, "org-b", "plan")).toBe(false);
  });
});
