/**
 * gen-icons.mjs — generate PWA PNG icons from icon.svg
 * Run once: node scripts/gen-icons.mjs
 * Output: static/icon-192.png, static/icon-512.png
 */
import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const svgPath = join(root, 'static', 'icon.svg');
const svgBuffer = readFileSync(svgPath);

const sizes = [192, 512];

for (const size of sizes) {
  const outPath = join(root, 'static', `icon-${size}.png`);
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`✓ static/icon-${size}.png`);
}

console.log('Done.');
