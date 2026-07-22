import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("official brand output assets", () => {
  it("embeds the official isotipo in a square SVG without external references", () => {
    const iconSvg = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");
    const masterSvg = readFileSync(
      new URL("../public/brand/isotipo-color.svg", import.meta.url),
      "utf8",
    );

    expect(iconSvg).toContain('viewBox="0 0 100 100"');
    expect(iconSvg).not.toContain('href="/brand/');
    expect(iconSvg).not.toMatch(/\b(?:href|xlink:href)\s*=\s*["']https?:\/\//);
    expect(iconSvg).not.toMatch(/\bhref\s*=/);
    expect(extractGroupTransforms(iconSvg)).toEqual([
      "translate(12.5 21.77734375) scale(0.09765625)",
      ...extractGroupTransforms(masterSvg),
    ]);
    expect(extractPathAttributes(iconSvg)).toEqual(extractPathAttributes(masterSvg));
  });

  it("stores a real multi-size ICO with PNG image entries", () => {
    const ico = readFileSync(new URL("./favicon.ico", import.meta.url));

    expect(ico.readUInt16LE(0)).toBe(0);
    expect(ico.readUInt16LE(2)).toBe(1);
    expect(ico.subarray(0, 8)).not.toEqual(pngSignature);

    const entryCount = ico.readUInt16LE(4);
    expect(entryCount).toBeGreaterThanOrEqual(3);

    const sizes = Array.from({ length: entryCount }, (_, index) => {
      const offset = 6 + index * 16;
      const width = ico[offset] || 256;
      const height = ico[offset + 1] || 256;
      const bytesInRes = ico.readUInt32LE(offset + 8);
      const imageOffset = ico.readUInt32LE(offset + 12);
      const image = ico.subarray(imageOffset, imageOffset + bytesInRes);

      expect(image.subarray(0, 8)).toEqual(pngSignature);
      return `${width}x${height}`;
    });

    expect(sizes).toEqual(expect.arrayContaining(["16x16", "32x32", "48x48"]));
  });

  it("stores a square 180px PNG for Apple devices", () => {
    const appleIcon = readFileSync(new URL("./apple-icon.png", import.meta.url));

    expect(appleIcon.subarray(0, 8)).toEqual(pngSignature);
    expect(appleIcon.readUInt32BE(16)).toBe(180);
    expect(appleIcon.readUInt32BE(20)).toBe(180);
  });
});

function extractPathAttributes(svg: string) {
  return Array.from(
    svg.matchAll(/<path\s+d="([^"]+)"\s+style="([^"]+)"\s*\/>/g),
    ([, d, style]) => ({ d, style }),
  );
}

function extractGroupTransforms(svg: string) {
  return Array.from(
    svg.matchAll(/<g\b[^>]*\btransform="([^"]+)"/g),
    ([, transform]) => transform,
  );
}
