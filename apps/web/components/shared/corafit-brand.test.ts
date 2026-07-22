import { describe, expect, it } from "vitest";
import { getCoraFitBrandSources } from "./corafit-brand";

describe("getCoraFitBrandSources", () => {
  it("resolves the color isotipo without changing its native ratio", () => {
    expect(getCoraFitBrandSources("isotipo", "color")).toEqual({
      light: {
        src: "/brand/isotipo-color.svg",
        width: 768,
        height: 578,
      },
      dark: {
        src: "/brand/isotipo-claro.svg",
        width: 768,
        height: 578,
      },
    });
  });

  it("resolves the full imagotipo with the appropriate text contrast", () => {
    expect(getCoraFitBrandSources("imagotipo", "color")).toEqual({
      light: {
        src: "/brand/imagotipo-texto-negro.svg",
        width: 1150,
        height: 241,
      },
      dark: {
        src: "/brand/imagotipo-texto-blanco.svg",
        width: 1150,
        height: 241,
      },
    });
  });

  it("exposes monochrome logotype and imagotipo masters", () => {
    expect(getCoraFitBrandSources("logotipo", "monochrome")).toEqual({
      light: {
        src: "/brand/logotipo-negro.svg",
        width: 788,
        height: 185,
      },
      dark: {
        src: "/brand/logotipo-claro.svg",
        width: 788,
        height: 185,
      },
    });

    expect(getCoraFitBrandSources("imagotipo", "monochrome")).toEqual({
      light: {
        src: "/brand/imagotipo-negro.svg",
        width: 1150,
        height: 241,
      },
      dark: {
        src: "/brand/imagotipo-claro.svg",
        width: 1150,
        height: 241,
      },
    });
  });
});
