import { renderToStaticMarkup } from "react-dom/server";
import { ActivityIcon } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import { NavItem } from "./nav-item";

vi.mock("next/navigation", () => ({
  usePathname: () => "/clients/client-1/plan",
}));

describe("NavItem", () => {
  it("marks nested routes active and exposes accessible decorative icon behavior", () => {
    const markup = renderToStaticMarkup(
      <NavItem href="/clients" icon={ActivityIcon} label="Clientes con un nombre largo" />,
    );

    expect(markup).toContain('aria-current="page"');
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("truncate");
    expect(markup).toContain("focus-visible:ring");
  });

  it("invokes onNavigate when a route is selected", () => {
    const onNavigate = vi.fn();
    const element = NavItem({
      href: "/clients",
      icon: ActivityIcon,
      label: "Clientes",
      onNavigate,
    });

    element.props.onClick?.({} as never);

    expect(onNavigate).toHaveBeenCalledOnce();
  });
});
