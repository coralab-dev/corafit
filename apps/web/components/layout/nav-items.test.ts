import { describe, expect, it } from "vitest";
import type { CurrentAuthProfile } from "@/lib/auth/types";
import { getVisibleNavSections } from "./nav-items";

function profile(
  platformRole: "user" | "admin_saas",
  hasOrganization: boolean,
): CurrentAuthProfile {
  return {
    user: { platformRole },
    organization: hasOrganization ? { id: "org-1" } : null,
  } as CurrentAuthProfile;
}

describe("getVisibleNavSections", () => {
  it("shows operation and account to a coach with an organization", () => {
    expect(getVisibleNavSections(profile("user", true))).toMatchObject([
      { label: "Operación", items: expect.any(Array) },
      { label: "Cuenta", items: expect.any(Array) },
    ]);
  });

  it("shows only SaaS administration to an admin without an organization", () => {
    expect(getVisibleNavSections(profile("admin_saas", false))).toMatchObject([
      { label: "Administración SaaS", items: expect.any(Array) },
    ]);
  });

  it("keeps operation, SaaS administration, and account separated for an admin with an organization", () => {
    expect(getVisibleNavSections(profile("admin_saas", true)).map((section) => section.label)).toEqual([
      "Operación",
      "Administración SaaS",
      "Cuenta",
    ]);
  });

  it("never shows admin items to a normal user", () => {
    const items = getVisibleNavSections(profile("user", true)).flatMap((section) =>
      section.items.map((item) => item.href),
    );

    expect(items).not.toContain("/admin/organizations");
    expect(items).not.toContain("/admin/exercises");
  });

  it("omits organization-dependent sections when no organization exists", () => {
    expect(getVisibleNavSections(profile("user", false))).toEqual([]);
  });
});
