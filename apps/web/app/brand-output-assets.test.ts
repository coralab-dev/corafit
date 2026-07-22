import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

describe("official brand output assets", () => {
  it("uses a square SVG wrapper with the official isotipo and safe whitespace", () => {
    const iconSvg = readFileSync(new URL("./icon.svg", import.meta.url), "utf8");

    expect(iconSvg).toContain('viewBox="0 0 100 100"');
    expect(iconSvg).toContain('href="/brand/isotipo-color.svg"');
    expect(iconSvg).toContain('preserveAspectRatio="xMidYMid meet"');
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
