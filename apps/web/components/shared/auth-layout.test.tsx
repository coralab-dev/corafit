import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AuthLayout } from "./auth-layout";

describe("AuthLayout brand API", () => {
  it("uses CoraFit as the default accessible brand label without a visible duplicate wordmark", () => {
    const markup = renderToStaticMarkup(
      <AuthLayout>
        <div>Auth card</div>
      </AuthLayout>,
    );

    expect(markup).toContain('aria-label="CoraFit"');
    expect(markup).not.toMatch(/>\s*CoraFit\s*</);
  });

  it("propagates brandAlt to the reusable brand component", () => {
    const markup = renderToStaticMarkup(
      <AuthLayout brandAlt="Marca alternativa">
        <div>Auth card</div>
      </AuthLayout>,
    );

    expect(markup).toContain('aria-label="Marca alternativa"');
  });

  it("exposes brandAlt instead of the removed title prop", () => {
    const source = readFileSync(new URL("./auth-layout.tsx", import.meta.url), "utf8");

    expect(source).toContain("brandAlt?: string;");
    expect(source).not.toMatch(/^\s+title\?: string;$/m);
  });
});
