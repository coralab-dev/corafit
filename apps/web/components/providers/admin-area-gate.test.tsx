import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminAreaGate } from "./admin-area-gate";

const mockUseAuth = vi.hoisted(() => vi.fn());

vi.mock("./auth-provider", () => ({
  useAuth: mockUseAuth,
}));

function ChildrenThatMustNotMount(): never {
  throw new Error("admin workspace mounted");
}

describe("AdminAreaGate", () => {
  it("waits for auth loading without mounting admin children", () => {
    mockUseAuth.mockReturnValue({ profile: null, status: "loading" });

    const markup = renderToStaticMarkup(
      <AdminAreaGate>
        <ChildrenThatMustNotMount />
      </AdminAreaGate>,
    );

    expect(markup).toContain("Validando permisos");
  });

  it("denies non-admin users without mounting admin children", () => {
    mockUseAuth.mockReturnValue({
      profile: { user: { platformRole: "user" }, organization: { id: "org-1" } },
      status: "authenticated",
    });

    const markup = renderToStaticMarkup(
      <AdminAreaGate>
        <ChildrenThatMustNotMount />
      </AdminAreaGate>,
    );

    expect(markup).toContain("Acceso denegado");
    expect(markup).toContain("administrador SaaS");
  });

  it("mounts children for an authenticated SaaS admin", () => {
    mockUseAuth.mockReturnValue({
      profile: { user: { platformRole: "admin_saas" }, organization: null },
      status: "authenticated",
    });

    const markup = renderToStaticMarkup(
      <AdminAreaGate>
        <p>Admin workspace</p>
      </AdminAreaGate>,
    );

    expect(markup).toContain("Admin workspace");
  });
});
