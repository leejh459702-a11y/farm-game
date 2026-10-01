// PWA 아이콘 생성 (외부 의존성 없이 PNG 인코딩)
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

// 32×32 픽셀 디자인 → 확대
const S = 32;
const px = new Array(S * S).fill(null);
const set = (x, y, c) => { if (x >= 0 && y >= 0 && x < S && y < S) px[y * S + x] = c; };
const rect = (x, y, w, h, c) => { for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c); };
// 배경: 하늘 + 들판
rect(0, 0, 32, 18, [138, 200, 240]);
rect(0, 18, 32, 14, [140, 195, 90]);
// 해
rect(24, 3, 5, 5, [247, 200, 52]);
// 밭
for (let r = 0; r < 2; r++) for (let c = 0; c < 3; c++) {
  rect(3 + c * 6, 22 + r * 5, 5, 4, [154, 106, 68]);
  rect(4 + c * 6, 21 + r * 5, 1, 2, [90, 168, 60]);
  rect(6 + c * 6, 21 + r * 5, 1, 2, [124, 191, 74]);
}
// 집
rect(19, 15, 10, 9, [242, 226, 196]);
for (let i = 0; i < 6; i++) rect(18 + i, 14 - i, 12 - i * 2, 1, [200, 66, 58]);
rect(22, 19, 3, 5, [138, 90, 58]);
rect(26, 17, 2, 2, [154, 208, 240]);
// 당근 (전경)
rect(9, 12, 4, 2, [240, 138, 44]); rect(10, 14, 2, 2, [240, 138, 44]); rect(10, 16, 1, 1, [240, 138, 44]);
rect(10, 9, 1, 3, [90, 168, 60]); rect(12, 10, 1, 2, [124, 191, 74]);

for (const size of [192, 512]) {
  const buf = Buffer.alloc(size * size * 4);
  const pad = Math.round(size * 0.08); // maskable 안전영역
  const scale = (size - pad * 2) / S;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const sx = Math.floor((x - pad) / scale), sy = Math.floor((y - pad) / scale);
    let c = [59, 42, 34];
    if (sx >= 0 && sy >= 0 && sx < S && sy < S && px[sy * S + sx]) c = px[sy * S + sx];
    buf[i] = c[0]; buf[i + 1] = c[1]; buf[i + 2] = c[2]; buf[i + 3] = 255;
  }
  mkdirSync('public/icons', { recursive: true });
  writeFileSync(`public/icons/icon-${size}.png`, png(size, size, buf));
}
console.log('icons ok');
