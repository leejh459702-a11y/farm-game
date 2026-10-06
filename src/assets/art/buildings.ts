/**
 * 건물 픽셀아트. 캔버스 크기 = (w*32) × (h*32 + ROOF_EXTRA). 바닥 정렬.
 * 회전 가능한 건물은 `_r` 접미사 텍스처를 추가로 생성한다.
 */
import { BUILDINGS, type BuildingData } from '../../data/buildings';
import { Painter, hashRand, shade, type Color } from '../painter';

export const ROOF_EXTRA = 20;
const T = 32;

interface Style {
  wall: Color;
  wallDark?: Color;
  roof: Color;
  trim?: Color;
  door?: Color;
  window?: boolean;
  sign?: (p: Painter, x: number, y: number) => void;
  roofKind?: 'gable' | 'flat' | 'glass' | 'barn';
  planks?: boolean;
  chimney?: boolean;
  awning?: Color;
}

/** 범용 3/4 뷰 건물: 위쪽은 지붕, 아래쪽은 정면 벽 */
function building(p: Painter, W: number, H: number, s: Style, seed = 1) {
  const r = hashRand(seed);
  const top = 2;
  const wallH = Math.max(18, Math.round(H * 0.42));
  const wallY = H - wallH - 2;
  const roofBottom = wallY + 4;
  const wall = s.wall;
  const wallDark = s.wallDark ?? shade(wall, -0.18);
  // 그림자
  p.shadow(W / 2, H - 2, W / 2 - 2, 3, 0.22);
  // 벽
  p.rect(3, wallY, W - 6, wallH, wall);
  if (s.planks) for (let y = wallY + 3; y < wallY + wallH; y += 4) p.rect(3, y, W - 6, 1, wallDark);
  else p.speckle(3, wallY, W - 6, wallH, wallDark, 0.06, seed + 5);
  p.rect(3, H - 4, W - 6, 2, shade(wall, -0.3));
  // 지붕
  const kind = s.roofKind ?? 'gable';
  const roof = s.roof;
  if (kind === 'glass') {
    p.rect(2, top, W - 4, roofBottom - top, 0xbfe4f0);
    for (let x = 2; x < W - 2; x += 8) p.rect(x, top, 1, roofBottom - top, 0xe8f6fb);
    for (let y = top; y < roofBottom; y += 7) p.rect(2, y, W - 4, 1, 0xe8f6fb);
    p.frame(2, top, W - 4, roofBottom - top, 0x8ab8c8);
    p.rect(6, top + 3, 6, 3, 0xffffff, 0.6);
  } else if (kind === 'flat') {
    p.rect(1, top + 6, W - 2, roofBottom - top - 6, roof);
    p.rect(1, top + 6, W - 2, 2, shade(roof, 0.2));
    p.rect(1, roofBottom - 2, W - 2, 2, shade(roof, -0.25));
  } else {
    // 박공 지붕 (위에서 내려다본 사다리꼴)
    const ridge = top + Math.round((roofBottom - top) * 0.28);
    p.rect(1, ridge, W - 2, roofBottom - ridge, roof);
    p.tri(1, ridge, W / 2, top, W - 2, ridge, shade(roof, 0.1));
    p.rect(W / 2 - 1, top, 2, roofBottom - top, shade(roof, -0.12));
    // 기와 줄
    for (let y = ridge + 3; y < roofBottom - 1; y += 4) {
      p.rect(1, y, W - 2, 1, shade(roof, -0.2));
      for (let x = 3 + ((y / 4) % 2) * 3; x < W - 2; x += 6) p.px(x, y - 1, shade(roof, 0.18));
    }
    p.rect(0, roofBottom - 2, W, 2, shade(roof, -0.32));
    if (kind === 'barn') {
      p.rect(W / 2 - 6, ridge + 2, 12, 6, 0xf6efe0).frame(W / 2 - 6, ridge + 2, 12, 6, shade(roof, -0.35));
      p.line(W / 2 - 6, ridge + 2, W / 2 + 5, ridge + 7, shade(roof, -0.35));
    }
  }
  if (s.chimney) {
    p.rect(W - 14, top - 1, 6, 10, 0x9a6a5a).rect(W - 15, top - 2, 8, 2, 0x7a4a3a);
  }
  // 문
  const doorW = Math.min(12, Math.max(8, Math.round(W / 6)));
  const doorX = Math.round(W / 2 - doorW / 2);
  const doorH = Math.min(wallH - 4, 16);
  p.rect(doorX, H - 4 - doorH, doorW, doorH, s.door ?? 0x8a5a3a);
  p.rect(doorX, H - 4 - doorH, doorW, 2, shade(s.door ?? 0x8a5a3a, -0.25));
  p.px(doorX + doorW - 3, H - 4 - doorH / 2, 0xf2c83a);
  if (kind === 'barn') {
    p.line(doorX, H - 4 - doorH, doorX + doorW - 1, H - 5, 0xf6efe0).line(doorX + doorW - 1, H - 4 - doorH, doorX, H - 5, 0xf6efe0);
  }
  // 창문
  if (s.window !== false) {
    const wy = wallY + 4;
    const spots = W >= 96 ? [10, W - 22, 26, W - 38] : [8, W - 18];
    for (const wx of spots) {
      if (wx + 10 > doorX && wx < doorX + doorW) continue;
      p.rect(wx, wy, 10, 8, 0x5a3e2e).rect(wx + 1, wy + 1, 8, 6, 0x9ad0f0).rect(wx + 1, wy + 1, 3, 2, 0xd8f0fb).rect(wx + 4, wy + 1, 1, 6, 0x5a3e2e);
      p.rect(wx - 1, wy + 8, 12, 2, s.trim ?? 0xa0784e);
      if (r() < 0.6) p.px(wx + 2, wy + 9, 0xf7a8c4).px(wx + 7, wy + 9, 0xf7d84a);
    }
  }
  if (s.awning) {
    for (let x = 4; x < W - 4; x += 4) p.rect(x, wallY - 1, 4, 5, ((x / 4) % 2 === 0 ? s.awning : 0xffffff));
  }
  if (s.sign) s.sign(p, W / 2, wallY - 6);
  p.outline(0x3b2a22);
}

function signBoard(p: Painter, cx: number, y: number, draw: (p: Painter, x: number, y: number) => void) {
  p.rect(cx - 7, y, 14, 9, 0xe8d4a8).frame(cx - 7, y, 14, 9, 0x6a4a2e);
  draw(p, cx - 4, y + 1);
}

// ───────────── 집 6단계 ─────────────
function house(level: number): Painter {
  const W = 64;
  const H = 64 + ROOF_EXTRA;
  const p = new Painter(W, H);
  const styles: Style[] = [
    { wall: 0xb8946a, roof: 0xd9b866, planks: true, door: 0x7a5236, roofKind: 'gable' },
    { wall: 0xe8d4b0, roof: 0xc8584a, planks: true, door: 0x8a5a3a, chimney: true },
    { wall: 0xf2e2c4, roof: 0xc8423a, door: 0x6a8a4a, chimney: true, trim: 0x8a5a3a },
    { wall: 0xf6ecd8, roof: 0x5a7ab8, door: 0x8a4a3a, chimney: true, trim: 0x6a4a2e },
    { wall: 0xfaf2e2, roof: 0x4a5a8a, door: 0x6a3a2a, chimney: true, trim: 0xc8a050 },
    { wall: 0xfdf8ec, roof: 0x3a4a6a, door: 0x5a2a20, chimney: true, trim: 0xd9b050 },
  ];
  building(p, W, H, styles[level - 1], 100 + level);
  // 레벨별 장식
  if (level >= 3) {
    p.rect(4, H - 8, 6, 4, 0x5aa83c).px(5, H - 9, 0xf7a8c4).px(8, H - 9, 0xf7d84a);
    p.rect(W - 10, H - 8, 6, 4, 0x5aa83c).px(W - 9, H - 9, 0xf7a8c4).px(W - 6, H - 9, 0xffffff);
  }
  if (level >= 4) {
    // 2층 창
    p.rect(W / 2 - 5, 10, 10, 8, 0x5a3e2e).rect(W / 2 - 4, 11, 8, 6, 0x9ad0f0).rect(W / 2 - 4, 11, 3, 2, 0xd8f0fb);
  }
  if (level >= 5) {
    p.rect(2, H - 30, 2, 26, 0xf6f0e0).rect(W - 4, H - 30, 2, 26, 0xf6f0e0);
    p.rect(W / 2 - 3, 3, 6, 4, 0xd9b050);
  }
  if (level >= 6) {
    p.rect(14, H - 30, 2, 26, 0xf6f0e0).rect(W - 16, H - 30, 2, 26, 0xf6f0e0);
    p.circle(W / 2, 6, 2, 0xffe066);
    p.rect(W / 2 - 8, H - 3, 16, 3, 0xc8b8a0);
  }
  p.outline(0x3b2a22);
  return p;
}

// ───────────── 소형 오브젝트 ─────────────
function small(type: string): Painter {
  const p = new Painter(T, T + ROOF_EXTRA);
  const B = T + ROOF_EXTRA; // bottom
  switch (type) {
    case 'chest':
      p.shadow(16, B - 3, 12, 3);
      p.rect(4, B - 20, 24, 16, 0xb8844a).rect(4, B - 20, 24, 6, 0xa0703a).rect(4, B - 14, 24, 1, 0x6a4a2e);
      p.rect(3, B - 21, 26, 2, 0x8a5a3a).rect(14, B - 16, 4, 5, 0xf2c83a).px(15, B - 14, 0x6a4a2e);
      p.rect(6, B - 20, 2, 16, 0x8a5a3a).rect(24, B - 20, 2, 16, 0x8a5a3a);
      break;
    case 'compost':
      p.shadow(16, B - 3, 12, 3);
      p.rect(5, B - 24, 22, 20, 0x4f8a4a).rect(5, B - 24, 22, 3, 0x6aaa5a);
      for (let x = 8; x < 26; x += 5) p.rect(x, B - 20, 2, 14, 0x3f7a3a);
      p.ellipse(16, B - 25, 9, 2, 0x5e4026).px(13, B - 26, 0x8ccf5a).px(18, B - 26, 0x7cbf4a);
      break;
    case 'well':
      p.shadow(16, B - 3, 13, 3);
      p.ellipse(16, B - 10, 12, 7, 0x9a958c).ellipse(16, B - 11, 9, 4, 0x3a5a7a).ellipse(14, B - 12, 3, 1, 0x6a9ad8);
      for (const [x, y] of [[6, B - 9], [12, B - 5], [20, B - 5], [26, B - 9]] as [number, number][]) p.rect(x - 2, y - 1, 4, 3, 0xb8b2a8);
      p.rect(5, B - 34, 2, 24, 0x8a5a3a).rect(25, B - 34, 2, 24, 0x8a5a3a);
      p.tri(1, B - 32, 31, B - 32, 16, B - 44, 0xc8584a).rect(1, B - 33, 30, 2, 0xa0443a);
      p.rect(14, B - 30, 4, 6, 0x8a5a3a).line(16, B - 24, 16, B - 15, 0xd9c8a8);
      break;
    case 'fence':
      for (const x of [3, 14, 25]) p.rect(x, B - 22, 4, 18, 0xc8a070).rect(x, B - 22, 4, 2, 0xe0c090).px(x + 1, B - 23, 0xc8a070);
      p.rect(2, B - 18, 28, 3, 0xb8905a).rect(2, B - 11, 28, 3, 0xb8905a);
      break;
    case 'flowerpot':
      p.shadow(16, B - 3, 8, 2);
      p.tri(9, B - 14, 23, B - 14, 20, B - 4, 0xc8743a).tri(9, B - 14, 12, B - 4, 20, B - 4, 0xc8743a).rect(8, B - 16, 16, 3, 0xb8642a);
      p.rect(16, B - 26, 1, 10, 0x3f8f3a).ellipse(12, B - 20, 3, 1, 0x5aa83c).ellipse(20, B - 22, 3, 1, 0x5aa83c);
      p.circle(16, B - 28, 3, 0xf7a8c4).circle(11, B - 24, 2, 0xf7d84a).circle(21, B - 25, 2, 0xffffff).px(16, B - 28, 0xf7d84a);
      break;
    case 'flowerbed':
      p.ellipse(16, B - 9, 13, 6, 0x7a5034).ellipse(16, B - 10, 12, 5, 0x8a6040);
      for (let i = 0; i < 9; i++) {
        const x = 7 + (i % 3) * 9 + (i % 2);
        const y = B - 16 + Math.floor(i / 3) * 4;
        p.rect(x, y, 1, 3, 0x3f8f3a).circle(x, y - 1, 1, [0xf7a8c4, 0xf7d84a, 0xffffff, 0xe8584a, 0xb8a0f0][i % 5]);
      }
      break;
    case 'lamp':
      p.shadow(16, B - 3, 6, 2);
      p.rect(15, B - 40, 3, 37, 0x4a4a52).rect(12, B - 5, 9, 2, 0x4a4a52);
      p.rect(11, B - 46, 11, 9, 0x3a3a42).rect(12, B - 45, 9, 7, 0xffe8a0).rect(13, B - 44, 3, 3, 0xffffff);
      p.tri(10, B - 46, 23, B - 46, 16, B - 51, 0x3a3a42);
      break;
    case 'bench':
      p.shadow(16, B - 3, 13, 2);
      p.rect(3, B - 20, 26, 4, 0xb8844a).rect(3, B - 13, 26, 4, 0xc8945a).rect(3, B - 13, 26, 1, 0xe0b070);
      for (const x of [5, 25]) p.rect(x, B - 20, 2, 17, 0x6a4a2e);
      break;
    case 'scarecrow':
      p.shadow(16, B - 3, 6, 2);
      p.rect(15, B - 34, 2, 31, 0x8a5a3a).rect(5, B - 28, 22, 2, 0x8a5a3a);
      p.rect(10, B - 28, 12, 12, 0x5a8ad8).rect(10, B - 22, 12, 1, 0x3a5a98).rect(13, B - 26, 2, 2, 0xe8584a);
      p.circle(16, B - 33, 5, 0xe8d4a0).px(14, B - 34, 0x3b2a22).px(18, B - 34, 0x3b2a22).line(14, B - 31, 18, B - 31, 0x3b2a22);
      p.rect(9, B - 39, 14, 2, 0xd9b866).rect(12, B - 42, 8, 3, 0xd9b866);
      p.line(5, B - 27, 3, B - 24, 0xe3c065).line(27, B - 27, 29, B - 24, 0xe3c065);
      break;
    case 'haybale':
      p.shadow(16, B - 3, 13, 3);
      p.rect(3, B - 18, 26, 14, 0xe3c065).rect(3, B - 18, 26, 3, 0xf2d88a);
      for (let x = 5; x < 28; x += 3) p.line(x, B - 15, x - 1, B - 5, 0xc9a24a);
      p.rect(3, B - 12, 26, 2, 0xa0784e);
      break;
    case 'stonepath':
      for (const [x, y, w, h] of [[4, B - 26, 10, 7], [17, B - 28, 11, 8], [6, B - 16, 11, 8], [19, B - 15, 9, 7]] as [number, number, number, number][]) {
        p.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0xb8b2a8).ellipse(x + w / 2 - 1, y + h / 2 - 1, w / 2 - 2, h / 2 - 2, 0xcac4ba);
      }
      break;
    case 'signpost':
      p.shadow(16, B - 3, 5, 2);
      p.rect(15, B - 30, 3, 27, 0x8a5a3a).rect(5, B - 32, 22, 10, 0xc8945a).frame(5, B - 32, 22, 10, 0x6a4a2e);
      p.line(8, B - 28, 23, B - 28, 0x6a4a2e).line(8, B - 25, 19, B - 25, 0x6a4a2e);
      break;
    case 'mailbox':
      p.shadow(16, B - 3, 5, 2);
      p.rect(15, B - 18, 3, 15, 0x8a5a3a);
      p.rect(8, B - 30, 16, 12, 0xd8342c).ellipse(16, B - 30, 8, 3, 0xd8342c).rect(8, B - 26, 16, 1, 0xa0241c);
      p.rect(24, B - 32, 2, 8, 0x4a4a52).rect(24, B - 32, 4, 3, 0xf2c83a);
      break;
    case 'sapling':
    case 'cherrytree': {
      const pink = type === 'cherrytree';
      p.shadow(16, B - 3, 9, 3);
      p.rect(14, B - 22, 4, 19, 0x7a5236).rect(14, B - 22, 1, 19, 0x94683f);
      p.ellipse(16, B - 30, 13, 11, pink ? 0xe88aa8 : 0x3f8a3c).ellipse(15, B - 31, 11, 9, pink ? 0xf6b8cc : 0x5aa83c);
      p.ellipse(11, B - 35, 4, 3, pink ? 0xffe0ea : 0x7cbf4a);
      if (pink) p.speckle(4, B - 42, 24, 20, 0xffffff, 0.05, 99);
      break;
    }
    case 'goldstatue':
      p.shadow(16, B - 3, 11, 3);
      p.rect(6, B - 12, 20, 9, 0xb8b2a8).rect(6, B - 12, 20, 2, 0xd8d2c8);
      p.ellipse(16, B - 22, 8, 7, 0xe8b830).ellipse(14, B - 24, 4, 3, 0xfff0a0);
      p.circle(20, B - 31, 4, 0xe8b830).rect(20, B - 37, 3, 3, 0xd9342c).tri(24, B - 31, 28, B - 30, 24, B - 29, 0xf09a2c);
      p.tri(6, B - 26, 10, B - 18, 6, B - 16, 0xd9a020);
      break;
  }
  p.outline(0x3b2a22);
  return p;
}

/** 양식장 3×3 — 나무 테두리 연못, 수초와 물고기 그림자 */
function fishpond(): Painter {
  const W = 96;
  const H = 96 + ROOF_EXTRA;
  const p = new Painter(W, H);
  const top = ROOF_EXTRA;
  p.shadow(W / 2, H - 4, W / 2 - 4, 5);
  p.rect(2, top + 6, W - 4, H - top - 10, 0x8a5a34).rect(2, top + 6, W - 4, 3, 0xb07c4a);
  p.rect(7, top + 12, W - 14, H - top - 22, 0x3f7fb8).rect(7, top + 12, W - 14, 4, 0x2f6aa0);
  p.speckle(8, top + 16, W - 16, H - top - 28, 0x6aa8d8, 0.06, 41);
  for (const [x, y] of [[18, top + 30], [62, top + 50], [40, top + 62]]) p.ellipse(x, y, 6, 2, 0x2a5a88).tri(x + 5, y, x + 9, y - 2, x + 9, y + 2, 0x2a5a88);
  for (const [x, y] of [[12, top + 64], [80, top + 24], [78, top + 66], [14, top + 22]]) p.line(x, y, x, y - 8, 0x4a9a4a).line(x + 2, y, x + 3, y - 6, 0x5aa83c);
  p.ellipse(68, top + 34, 5, 3, 0x5aa83c).ellipse(28, top + 52, 4, 2, 0x5aa83c).px(68, top + 32, 0xf7a8c4);
  for (let x = 6; x < W - 6; x += 12) p.rect(x, top + 6, 2, 3, 0x6a4428);
  p.rect(W / 2 - 10, top - 2, 20, 9, 0xb07c4a).frame(W / 2 - 10, top - 2, 20, 9, 0x6a4428).ellipse(W / 2, top + 2, 5, 2, 0x5a9ad8);
  p.outline(0x3b2a22);
  return p;
}

function fountain(): Painter {
  const p = new Painter(64, 64 + ROOF_EXTRA);
  const B = 64 + ROOF_EXTRA;
  p.shadow(32, B - 6, 28, 6);
  p.ellipse(32, B - 18, 28, 14, 0xb8b2a8).ellipse(32, B - 19, 24, 11, 0x5a9ad8).ellipse(26, B - 22, 8, 3, 0x9ad0f0);
  p.rect(28, B - 46, 8, 28, 0xcac4ba).ellipse(32, B - 46, 12, 4, 0xb8b2a8).ellipse(32, B - 47, 9, 2, 0x5a9ad8);
  for (const dx of [-10, 10]) p.line(32, B - 52, 32 + dx, B - 40, 0x9ad0f0);
  p.line(32, B - 58, 32, B - 48, 0xbfe4f0).circle(32, B - 59, 2, 0xd8f0fb);
  p.outline(0x3b2a22);
  return p;
}

const SIGN_DRAW: Record<string, (p: Painter, x: number, y: number) => void> = {
  egg: (p, x, y) => p.ellipse(x + 4, y + 4, 2, 3, 0xf6efe0),
  milk: (p, x, y) => p.rect(x + 2, y + 1, 4, 6, 0xffffff).rect(x + 3, y, 2, 1, 0x5a8ad8),
  wool: (p, x, y) => p.circle(x + 4, y + 4, 3, 0xf6f0e4),
  heart: (p, x, y) => p.circle(x + 2, y + 3, 2, 0xe8586a).circle(x + 6, y + 3, 2, 0xe8586a).tri(x, y + 4, x + 8, y + 4, x + 4, y + 8, 0xe8586a),
  jar: (p, x, y) => p.rect(x + 1, y + 2, 6, 5, 0xd8343c).rect(x + 2, y + 1, 4, 1, 0xa0784e),
  pot: (p, x, y) => p.rect(x, y + 3, 8, 4, 0x5a5a62).line(x + 2, y, x + 3, y + 2, 0xffffff),
  meat: (p, x, y) => p.ellipse(x + 4, y + 4, 3, 3, 0xc84848).px(x + 6, y + 2, 0xffffff),
  box: (p, x, y) => p.rect(x + 1, y + 1, 6, 6, 0xb8844a).frame(x + 1, y + 1, 6, 6, 0x6a4a2e),
  snow: (p, x, y) => p.line(x + 4, y, x + 4, y + 7, 0x5a9ad8).line(x, y + 4, x + 7, y + 4, 0x5a9ad8),
  dna: (p, x, y) => {
    for (let i = 0; i < 7; i++) p.px(x + 2 + Math.round(Math.sin(i) * 2), y + i, 0x5a8ad8).px(x + 5 - Math.round(Math.sin(i) * 2), y + i, 0xe8586a);
  },
};

const STYLE: Record<string, Style> = {
  coop: { wall: 0xe8c890, roof: 0xc8423a, planks: true, roofKind: 'barn', sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.egg) },
  duckhouse: { wall: 0xd8e0e8, roof: 0x4a8ab8, planks: true, roofKind: 'barn', sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.egg) },
  rabbithutch: { wall: 0xe8d8c0, roof: 0x8a6a4a, planks: true, door: 0xc8b8a0 },
  sheepbarn: { wall: 0xd8b890, roof: 0x8a5a3a, planks: true, roofKind: 'barn', sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.wool) },
  cowbarn: { wall: 0xc8483a, roof: 0x6a4a3a, planks: true, roofKind: 'barn', trim: 0xffffff, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.milk) },
  pigsty: { wall: 0xe8b8a8, roof: 0x8a5a4a, planks: true, roofKind: 'barn' },
  bigbarn: { wall: 0xb8382e, roof: 0x5a3e30, planks: true, roofKind: 'barn', trim: 0xffffff },
  warehouse: { wall: 0xc8a070, roof: 0x7a6a5a, planks: true, window: false, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.box) },
  fridge: { wall: 0xe8f0f6, roof: 0x5a9ad8, roofKind: 'flat', window: false, door: 0x8ab8d8, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.snow) },
  bigwarehouse: { wall: 0xb8905a, roof: 0x6a5a4a, planks: true, window: false, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.box) },
  coldstorage: { wall: 0xdce8f0, roof: 0x3a6ab8, roofKind: 'flat', window: false, door: 0x7aa8c8, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.snow) },
  processor: { wall: 0xc8b8a0, roof: 0x7a5a3a, chimney: true, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.jar) },
  kitchen: { wall: 0xf2e2c4, roof: 0xd86a3a, chimney: true, awning: 0xe8584a, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.pot) },
  loom: { wall: 0xe0d0e8, roof: 0x8a5ab8, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.wool) },
  butcher: { wall: 0xf2e8dc, roof: 0x8a3a3a, awning: 0xc8342c, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.meat) },
  breeding: { wall: 0xf6e0e4, roof: 0xd86a8a, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.heart) },
  greenhouse: { wall: 0xdcecf2, roof: 0xbfe4f0, roofKind: 'glass', door: 0x8ab8c8 },
  cellar: { wall: 0xb8b0a4, roof: 0x5a4a3a, planks: false, window: false, door: 0x6a4a2e, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.jar) },
  breedlab: { wall: 0xf0f2f6, roof: 0x4a5a8a, roofKind: 'flat', chimney: false, sign: (p, x, y) => signBoard(p, x, y, SIGN_DRAW.dna) },
};

export interface BuildingTex {
  key: string;
  canvas: HTMLCanvasElement;
}

function drawFootprint(d: BuildingData, w: number, h: number): Painter {
  const W = w * T;
  const H = h * T + ROOF_EXTRA;
  const p = new Painter(W, H);
  building(p, W, H, STYLE[d.id] ?? { wall: 0xe8d4b0, roof: 0x8a5a3a }, d.id.length * 13 + w);
  if (d.id === 'greenhouse') {
    // 내부 작물 줄
    for (let x = 8; x < W - 8; x += 10) p.rect(x, H - 30, 6, 4, 0x5aa83c).px(x + 2, H - 31, 0xe8584a);
  }
  return p;
}

export function buildBuildingTextures(): BuildingTex[] {
  const out: BuildingTex[] = [];
  for (let lv = 1; lv <= 6; lv++) out.push({ key: `bld_house_${lv}`, canvas: house(lv).canvas });
  for (const d of BUILDINGS) {
    if (d.id === 'house') continue;
    if (d.id === 'fishpond') {
      out.push({ key: d.spriteKey, canvas: fishpond().canvas });
      continue;
    }
    if (d.id === 'fountain') {
      out.push({ key: d.spriteKey, canvas: fountain().canvas });
      continue;
    }
    if (d.w === 1 && d.h === 1) {
      out.push({ key: d.spriteKey, canvas: small(d.id).canvas });
      continue;
    }
    out.push({ key: d.spriteKey, canvas: drawFootprint(d, d.w, d.h).canvas });
    if (d.rotatable) out.push({ key: `${d.spriteKey}_r`, canvas: drawFootprint(d, d.h, d.w).canvas });
  }
  return out;
}

/** 빛 번짐 (밤 조명) */
export function buildGlow(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,220,140,0.9)');
  g.addColorStop(0.4, 'rgba(255,190,100,0.35)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  return c;
}
