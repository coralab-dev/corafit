import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const webRoot = resolve(scriptDirectory, "..");
const sourcePath = join(webRoot, "public/brand/isotipo-color.svg");
const outputPath = join(webRoot, "app/icon.svg");
const sourceSvg = readFileSync(sourcePath, "utf8");

const sourceViewBox = sourceSvg.match(/<svg\b[^>]*\bviewBox="([^"]+)"/i)?.[1];
const sourceGroupTransforms = Array.from(
  sourceSvg.matchAll(/<g\b[^>]*\btransform="([^"]+)"/g),
  ([, transform]) => transform,
);
const pathFragments = sourceSvg.match(/<path\b[^>]*\/>/g) ?? [];

if (sourceViewBox !== "0 0 768 578" || sourceGroupTransforms.length !== 2 || pathFragments.length !== 3) {
  throw new Error("Unexpected isotipo-color.svg structure; refusing to generate icon.svg");
}

const canvasSize = 100;
const padding = 12.5;
const [sourceWidth, sourceHeight] = sourceViewBox.split(" ").slice(2).map(Number);
const scale = (canvasSize - padding * 2) / sourceWidth;
const renderedHeight = sourceHeight * scale;
const translateY = (canvasSize - renderedHeight) / 2;

const [outerTransform, innerTransform] = sourceGroupTransforms;
const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img" aria-label="CoraFit">
  <g transform="translate(${padding} ${translateY}) scale(${scale})">
    <g transform="${outerTransform}">
      <g transform="${innerTransform}">
${pathFragments.map((path) => `        ${path}`).join("\n")}
      </g>
    </g>
  </g>
</svg>
`;

writeFileSync(outputPath, iconSvg, "utf8");
