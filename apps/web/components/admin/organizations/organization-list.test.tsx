import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { AdminOrganization } from "@/hooks/use-admin-organizations";
import { OrganizationList } from "./organization-list";

const item: AdminOrganization = {
  id: "org-1",
  name: "Una organización con un nombre largo",
  type: "studio",
  status: "active",
  createdAt: "2026-01-01T00:00:00.000Z",
  owner: { id: "owner-1", name: "Owner", email: "owner@example.com" },
  subscription: { status: "active" },
  plan: { id: "plan-1", code: "starter", name: "Starter", clientLimit: 10 },
  clientsUsed: 10,
};

describe("OrganizationList", () => {
  it("renders visual columns, compact row data, selected aria state, and focus styling", () => {
    const markup = renderToStaticMarkup(
      <OrganizationList
        items={[item]}
        selectedId="org-1"
        isInitialLoading={false}
        isRefreshing={false}
        search=""
        status="all"
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(markup).toContain("Organización");
    expect(markup).toContain("Owner");
    expect(markup).toContain("Clientes");
    expect(markup).toContain("Plan / suscripción");
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain("focus-visible:ring");
    expect(markup).toContain("Revisión");
  });

  it("offers a clear-filters action for a filtered empty result", () => {
    const markup = renderToStaticMarkup(
      <OrganizationList
        items={[]}
        selectedId=""
        isInitialLoading={false}
        isRefreshing={false}
        search="studio"
        status="suspended"
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onClearFilters={vi.fn()}
      />,
    );

    expect(markup).toContain("Sin resultados");
    expect(markup).toContain("Limpiar filtros");
  });

  it("keeps previous results visible when a refresh reports an error", () => {
    const markup = renderToStaticMarkup(
      <OrganizationList
        items={[item]}
        selectedId="org-1"
        isInitialLoading={false}
        isRefreshing={false}
        listError="No se pudo actualizar"
        search=""
        status="all"
        onSelect={vi.fn()}
        onSearchChange={vi.fn()}
        onStatusChange={vi.fn()}
        onClearFilters={vi.fn()}
        onRetry={vi.fn()}
      />,
    );

    expect(markup).toContain("No se pudo actualizar");
    expect(markup).toContain(item.name);
    expect(markup).toContain("Reintentar");
  });
});
