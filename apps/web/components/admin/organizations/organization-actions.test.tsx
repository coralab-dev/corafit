import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type {
  AdminOrganization,
  AdminSubscriptionPlan,
} from "@/hooks/use-admin-organizations";
import { OrganizationActions } from "./organization-actions";

const organization: AdminOrganization = {
  id: "org-1",
  name: "Studio",
  type: "studio",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "owner-1", name: "Owner", email: "owner@example.com" },
  subscription: { status: "active" },
  plan: { id: "plan-1", code: "starter", name: "Starter", clientLimit: 10 },
  clientsUsed: 2,
};

const plans: AdminSubscriptionPlan[] = [
  {
    id: "plan-1",
    code: "starter",
    name: "Starter",
    status: "active",
    isPublic: true,
    betaPrice: 0,
    postBetaPrice: null,
    currency: "MXN",
    clientLimit: 10,
    memberLimit: 3,
    sortOrder: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "plan-2",
    code: "legacy",
    name: "Legacy",
    status: "inactive",
    isPublic: false,
    betaPrice: 100,
    postBetaPrice: null,
    currency: "MXN",
    clientLimit: 20,
    memberLimit: 5,
    sortOrder: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("OrganizationActions", () => {
  it("disables inactive plans and renders the active organization action", () => {
    const markup = renderToStaticMarkup(
      <OrganizationActions
        organization={organization}
        subscriptionPlans={plans}
        isPlansLoading={false}
        mutation={null}
        onChangePlan={vi.fn()}
        onChangeStatus={vi.fn()}
      />,
    );

    expect(markup).toContain("Suspender");
    expect(markup).toContain("Inactivo");
    expect(markup).toMatch(/value="legacy"[^>]*disabled/);
  });

  it("explains cancelled organizations have no state action", () => {
    const markup = renderToStaticMarkup(
      <OrganizationActions
        organization={{ ...organization, status: "cancelled" }}
        subscriptionPlans={plans}
        isPlansLoading={false}
        mutation={null}
        onChangePlan={vi.fn()}
        onChangeStatus={vi.fn()}
      />,
    );

    expect(markup).toContain("no puede cambiar de estado");
    expect(markup).not.toContain("Suspender");
    expect(markup).not.toContain("Reactivar");
  });

  it("shows a recoverable plans error and the selected plan preview", () => {
    const markup = renderToStaticMarkup(
      <OrganizationActions
        organization={organization}
        subscriptionPlans={plans}
        isPlansLoading={false}
        plansError="No se pudieron cargar los planes"
        mutation={null}
        onRetryPlans={vi.fn()}
        onChangePlan={vi.fn()}
        onChangeStatus={vi.fn()}
      />,
    );

    expect(markup).toContain("No se pudieron cargar los planes");
    expect(markup).toContain("Reintentar planes");
    expect(markup).toContain("beta");
    expect(markup).toContain("Clientes: 10");
  });
});
