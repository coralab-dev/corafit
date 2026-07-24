import { describe, expect, it } from "vitest";
import {
  createDataRevisionController,
  createLatestRequestController,
} from "@/components/admin/organizations/organization-state";

describe("useAdminOrganizations request protection", () => {
  it("prevents an old list or detail response from being current", () => {
    const requests = createLatestRequestController();
    const listRequest = requests.begin();
    const detailRequest = requests.begin();

    expect(requests.isCurrent(listRequest.id)).toBe(false);
    expect(requests.isCurrent(detailRequest.id)).toBe(true);
  });

  it("keeps a successful suspension when the old list response resolves afterwards", () => {
    const revision = createDataRevisionController();
    let organization = { status: "active" };
    const oldListRevision = revision.capture();

    revision.invalidate();
    organization = { status: "suspended" };
    if (revision.isCurrent(oldListRevision)) {
      organization = { status: "active" };
    }

    expect(organization.status).toBe("suspended");
  });

  it("keeps a successful plan change when the old list response resolves afterwards", () => {
    const revision = createDataRevisionController();
    let organization = { plan: "starter" };
    const oldListRevision = revision.capture();

    revision.invalidate();
    organization = { plan: "pro" };
    if (revision.isCurrent(oldListRevision)) {
      organization = { plan: "starter" };
    }

    expect(organization.plan).toBe("pro");
  });
});
