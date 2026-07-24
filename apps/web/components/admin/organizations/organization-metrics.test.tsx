import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OrganizationMetrics } from "./organization-metrics";

describe("OrganizationMetrics", () => {
  it("renders four Athletic Warm metrics with the current-filter clarification", () => {
    const markup = renderToStaticMarkup(
      <OrganizationMetrics metrics={{ results: 4, active: 2, suspended: 1, clientsUsed: 10 }} />,
    );

    expect(markup).toContain("Resultados");
    expect(markup).toContain("Activas");
    expect(markup).toContain("Suspendidas");
    expect(markup).toContain("Clientes en vista");
    expect(markup).toContain("Según los filtros actuales.");
    expect(markup).toContain("rounded-2xl");
    expect(markup).toContain("surface-shadow-soft");
  });
});
