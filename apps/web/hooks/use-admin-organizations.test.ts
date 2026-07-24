import { describe, expect, it } from "vitest";
import { createLatestRequestController } from "@/components/admin/organizations/organization-state";

describe("useAdminOrganizations request protection", () => {
  it("prevents an old list or detail response from being current", () => {
    const requests = createLatestRequestController();
    const listRequest = requests.begin();
    const detailRequest = requests.begin();

    expect(requests.isCurrent(listRequest.id)).toBe(false);
    expect(requests.isCurrent(detailRequest.id)).toBe(true);
  });
});
