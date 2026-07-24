import { renderToStaticMarkup } from "react-dom/server";
import { ActivityIcon } from "lucide-react";
import { describe, expect, it } from "vitest";
import { NavigationSections } from "./navigation-sections";

describe("NavigationSections", () => {
  it("does not render empty sections and uses discreet section labels", () => {
    const markup = renderToStaticMarkup(
      <NavigationSections
        sections={[
          { key: "empty", label: "Vacia", items: [] },
          {
            key: "operation",
            label: "Operación",
            items: [{ href: "/", icon: ActivityIcon, label: "Dashboard" }],
          },
        ]}
      />,
    );

    expect(markup).not.toContain("Vacia");
    expect(markup).toContain("Operación");
    expect(markup).toContain("uppercase");
    expect(markup).toContain("tracking");
  });
});
