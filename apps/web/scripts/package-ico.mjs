import { readFileSync, writeFileSync } from "node:fs";

const [, , outputPath, ...inputPaths] = process.argv;
const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

if (!outputPath || inputPaths.length === 0) {
  throw new Error("Usage: node package-ico.mjs <output.ico> <16.png> [32.png] [48.png]");
}

const images = inputPaths.map((inputPath) => {
  const data = readFileSync(inputPath);

  if (!data.subarray(0, 8).equals(pngSignature)) {
    throw new Error(`${inputPath} is not a PNG`);
  }

  const width = data.readUInt32BE(16);
  const height = data.readUInt32BE(20);

  if (width > 256 || height > 256) {
    throw new Error(`${inputPath} exceeds the ICO dimension limit`);
  }

  return { data, height, width };
});

const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(images.length, 4);

const entries = Buffer.alloc(images.length * 16);
let imageOffset = header.length + entries.length;

images.forEach(({ data, height, width }, index) => {
  const offset = index * 16;
  entries.writeUInt8(width === 256 ? 0 : width, offset);
  entries.writeUInt8(height === 256 ? 0 : height, offset + 1);
  entries.writeUInt8(0, offset + 2);
  entries.writeUInt8(0, offset + 3);
  entries.writeUInt16LE(1, offset + 4);
  entries.writeUInt16LE(32, offset + 6);
  entries.writeUInt32LE(data.length, offset + 8);
  entries.writeUInt32LE(imageOffset, offset + 12);
  imageOffset += data.length;
});

writeFileSync(outputPath, Buffer.concat([header, entries, ...images.map(({ data }) => data)]));
