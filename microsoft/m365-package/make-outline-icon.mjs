// Draws outline.png, the 32x32 Microsoft 365 / Teams outline icon: the Hookpost
// "hi" mark in white on a transparent background (Microsoft allows no other
// colours in the outline icon). color.png is the regular logo resized to 192x192
// with `sips -z 192 192 ../../assets/logo-400.png --out color.png`.
//
// Run from this folder: node make-outline-icon.mjs
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 32;
const SAMPLES = 4; // supersampling per axis, for smooth edges

const roundedRect = (x0, y0, x1, y1, r) => (x, y) => {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false;
  const cx = Math.min(Math.max(x, x0 + r), x1 - r);
  const cy = Math.min(Math.max(y, y0 + r), y1 - r);
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
};
const circle = (cx, cy, r) => (x, y) => (x - cx) ** 2 + (y - cy) ** 2 <= r * r;

const stem = roundedRect(6, 6, 11.5, 27, 2.75);
const bowl = roundedRect(10, 15, 23, 27, 4.5);
const bowlHole = roundedRect(14.5, 19, 18.5, 23, 1.5);
const iStem = roundedRect(18.5, 8.5, 23, 17, 2.25);
const dot = circle(23.5, 4.5, 2.25);

const inside = (x, y) =>
  stem(x, y) || (bowl(x, y) && !bowlHole(x, y)) || iStem(x, y) || dot(x, y);

const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
for (let y = 0; y < SIZE; y++) {
  const row = y * (SIZE * 4 + 1);
  raw[row] = 0; // PNG filter type: none
  for (let x = 0; x < SIZE; x++) {
    let hits = 0;
    for (let sy = 0; sy < SAMPLES; sy++) {
      for (let sx = 0; sx < SAMPLES; sx++) {
        if (inside(x + (sx + 0.5) / SAMPLES, y + (sy + 0.5) / SAMPLES)) hits++;
      }
    }
    const i = row + 1 + x * 4;
    raw[i] = raw[i + 1] = raw[i + 2] = 255;
    raw[i + 3] = Math.round((255 * hits) / (SAMPLES * SAMPLES));
  }
}

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};

const header = Buffer.alloc(13);
header.writeUInt32BE(SIZE, 0);
header.writeUInt32BE(SIZE, 4);
header[8] = 8; // bit depth
header[9] = 6; // RGBA
writeFileSync(
  new URL('./outline.png', import.meta.url),
  Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
);
