import { describe, expect, it } from "vitest";
import type { AdminOrganization } from "@/hooks/use-admin-organizations";
import {
  organizationCacheTtlMs,
  getOrganizationQueryKey,
  isOrganizationCacheFresh,
  matchesOrganizationFilters,
} from "./organization-cache";

const organization = {
  id: "org-1",
  name: "Athletic Studio",
  type: "studio",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "owner-1", name: "Owner", email: "owner@example.com" },
  subscription: { status: "active" },
  plan: { id: "plan-1", code: "starter", name: "Starter", clientLimit: 10 },
  clientsUsed: 2,
} satisfies AdminOrganization;

describe("organization cache", () => {
  it("uses the same key for equivalent current filters", () => {
    expect(getOrganizationQueryKey({ search: "  studio ", status: "active" })).toBe(
      getOrganizationQueryKey({ search: "studio", status: "active" }),
    );
  });

  it("keeps recent cache fresh and marks old data stale", () => {
    expect(isOrganizationCacheFresh(Date.now() - 1_000, Date.now())).toBe(true);
    expect(isOrganizationCacheFresh(Date.now() - organizationCacheTtlMs - 1, Date.now())).toBe(false);
  });

  it("matches the organization and owner email filters", () => {
    expect(matchesOrganizationFilters(organization, { search: "athletic", status: "all" })).toBe(true);
    expect(matchesOrganizationFilters(organization, { search: "owner@example.com", status: "all" })).toBe(true);
    expect(matchesOrganizationFilters(organization, { search: "cancelled", status: "all" })).toBe(false);
    expect(matchesOrganizationFilters(organization, { search: "", status: "suspended" })).toBe(false);
  });
});
