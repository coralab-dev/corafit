import { describe, expect, it, vi } from "vitest";
import { createMobileNavigationHandler } from "./mobile-nav";

describe("MobileNav navigation", () => {
  it("closes the drawer after selecting a route", () => {
    const setOpen = vi.fn();

    createMobileNavigationHandler(setOpen)();

    expect(setOpen).toHaveBeenCalledWith(false);
  });
});
