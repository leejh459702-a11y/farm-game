import { Painter, hashRand, shade, type Color } from '../painter';

/** 타일셋 인덱스 */
export const TILE = {
  perSeason: 12,
  grassA: 0,
  grassB: 1,
  grassFlower: 2,
  wildA: 3,
  wildB: 4,
  forestFloor: 5,
  treeA: 6,
  treeB: 7,
  decorBush: 8,
  decorFlowers: 9,
  decorTall: 10,
  decorTree: 11,
  soilDry: 48,
  soilWet: 49,
  path: 50,
  decorRock: 51,
  decorStump: 52,
  decorMushroom: 53,
  count: 54,
} as const;

interface SeasonPal {
  base: Color;
  dark: Color;
  light: Color;
  flowers: Color[];
  wild: Color;
  tree: Color;
  treeDark: Color;
  treeLight: Color;
  snow?: boolean;
}

const PALS: SeasonPal[] = [
  { base: 0x8cc35a, dark: 0x72ad48, light: 0xa6d66c, flowers: [0xf7a8c4, 0xfff4d6, 0xf7d84a], wild: 0x7dad4e, tree: 0x4f9a46, treeDark: 0x3a7a3a, treeLight: 0x74bf5a },
  { base: 0x79ba4c, dark: 0x5fa03e, light: 0x95cc5e, flowers: [0xf7d84a, 0xe8584a, 0xffffff], wild: 0x689f42, tree: 0x3f8a3c, treeDark: 0x2e6a32, treeLight: 0x62ad4a },
  { base: 0xb2b75c, dark: 0x989a48, light: 0xcac670, flowers: [0xe0822f, 0xc4552e, 0xf2c14a], wild: 0xa09c50, tree: 0xd9822f, treeDark: 0xa8521e, treeLight: 0xf0b04a },
  { base: 0xe9eff4, dark: 0xcbd8e2, light: 0xffffff, flowers: [0xa9bccb, 0x8aa87a, 0xffffff], wild: 0xd5e0e8, tree: 0x4a7a5a, treeDark: 0x355a46, treeLight: 0xf4f8fb, snow: true },
];

const TS = 32;

function grass(p: Painter, pal: SeasonPal, seed: number, flowers: boolean, lift = 0) {
  p.rect(0, 0, TS, TS, lift ? shade(pal.base, lift) : pal.base);
  const r = hashRand(seed);
  // 부드러운 명암 패치
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * TS);
    const y = Math.floor(r() * TS);
    p.ellipse(x, y, 3 + Math.floor(r() * 3), 2, r() < 0.5 ? pal.dark : pal.light, 0.35);
  }
  // 풀잎 V자
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(r() * (TS - 2)) + 1;
    const y = Math.floor(r() * (TS - 3)) + 2;
    const c = r() < 0.6 ? pal.dark : pal.light;
    p.px(x, y, c).px(x - 1, y - 1, c).px(x + 1, y - 1, c);
  }
  if (flowers) {
    for (let i = 0; i < 5; i++) {
      const x = 3 + Math.floor(r() * (TS - 6));
      const y = 3 + Math.floor(r() * (TS - 6));
      const c = pal.flowers[Math.floor(r() * pal.flowers.length)];
      p.px(x, y, c).px(x + 1, y, c).px(x, y + 1, c).px(x + 1, y + 1, shade(c, -0.15)).px(x, y - 1, c);
    }
  }
}

function wild(p: Painter, pal: SeasonPal, seed: number) {
  p.rect(0, 0, TS, TS, pal.wild);
  const r = hashRand(seed);
  for (let i = 0; i < 6; i++) p.ellipse(Math.floor(r() * TS), Math.floor(r() * TS), 3, 2, shade(pal.wild, -0.08), 0.45);
  // 키 큰 풀
  for (let i = 0; i < 6; i++) {
    const x = Math.floor(r() * (TS - 4)) + 2;
    const y = Math.floor(r() * (TS - 6)) + 5;
    const c = pal.snow ? shade(pal.wild, -0.1) : shade(pal.wild, -0.16);
    p.line(x, y, x - 1, y - 4, c).line(x + 1, y, x + 2, y - 3, c).px(x, y - 2, shade(pal.wild, 0.15));
  }
  // 작은 돌멩이
  if (r() < 0.6) {
    const x = Math.floor(r() * 26) + 3;
    const y = Math.floor(r() * 26) + 3;
    p.rect(x, y, 3, 2, 0x9a958c).px(x, y, 0xb8b2a8);
  }
}

function forestFloor(p: Painter, pal: SeasonPal, seed: number) {
  p.rect(0, 0, TS, TS, shade(pal.wild, -0.25));
  p.speckle(0, 0, TS, TS, shade(pal.wild, -0.35), 0.12, seed);
  p.speckle(0, 0, TS, TS, shade(pal.wild, -0.1), 0.06, seed + 3);
}

function treeCrown(p: Painter, pal: SeasonPal, seed: number) {
  forestFloor(p, pal, seed);
  const r = hashRand(seed);
  const cx = 16 + Math.floor(r() * 3) - 1;
  // 줄기
  p.rect(cx - 2, 22, 4, 8, 0x6a4a32).rect(cx - 2, 22, 1, 8, 0x58392a);
  // 수관
  p.ellipse(cx, 13, 13, 11, pal.treeDark);
  p.ellipse(cx - 1, 12, 12, 10, pal.tree);
  p.ellipse(cx - 4, 9, 6, 5, pal.treeLight, 0.85);
  for (let i = 0; i < 10; i++) p.px(cx - 10 + Math.floor(r() * 20), 4 + Math.floor(r() * 16), pal.treeDark);
  if (pal.snow) p.ellipse(cx - 2, 6, 8, 3, 0xffffff);
}

function decorBush(p: Painter, pal: SeasonPal) {
  p.shadow(16, 25, 11, 3, 0.25);
  p.ellipse(16, 18, 11, 8, pal.treeDark).ellipse(15, 17, 10, 7, pal.tree).ellipse(12, 14, 4, 3, pal.treeLight, 0.9);
  if (pal.snow) p.ellipse(15, 12, 8, 3, 0xffffff);
  else p.px(19, 16, 0xf7a8c4).px(10, 19, 0xffffff).px(21, 20, 0xf7d84a);
  p.outline(0x2f3a24);
}

function decorFlowers(p: Painter, pal: SeasonPal, seed: number) {
  const r = hashRand(seed);
  for (let i = 0; i < 7; i++) {
    const x = 6 + Math.floor(r() * 20);
    const y = 8 + Math.floor(r() * 18);
    const c = pal.flowers[i % pal.flowers.length];
    p.rect(x, y + 1, 1, 3, shade(pal.wild, -0.3)).px(x, y, c).px(x - 1, y, c).px(x + 1, y, c).px(x, y - 1, c).px(x, y, shade(c, 0.4));
  }
}

function decorTall(p: Painter, pal: SeasonPal, seed: number) {
  const r = hashRand(seed);
  for (let i = 0; i < 14; i++) {
    const x = 6 + Math.floor(r() * 20);
    const h = 8 + Math.floor(r() * 9);
    const c = i % 3 ? shade(pal.wild, -0.25) : shade(pal.wild, 0.18);
    p.line(x, 27, x + Math.round((r() - 0.5) * 6), 27 - h, c);
  }
  if (pal.snow) p.speckle(4, 10, 24, 10, 0xffffff, 0.15, seed);
}

function decorTree(p: Painter, pal: SeasonPal) {
  p.shadow(16, 28, 9, 2, 0.28);
  p.rect(15, 18, 3, 10, 0x6a4a32).rect(15, 18, 1, 10, 0x8a6040);
  p.tri(4, 22, 28, 22, 16, 6, pal.treeDark).tri(6, 16, 26, 16, 16, 1, pal.tree).tri(9, 10, 23, 10, 16, -2, shade(pal.tree, 0.12));
  if (pal.snow) p.tri(10, 9, 22, 9, 16, 1, 0xffffff).rect(8, 15, 16, 1, 0xffffff);
  p.outline(0x2f3a24);
}

function decorRock(p: Painter) {
  p.shadow(16, 24, 10, 3, 0.25);
  p.ellipse(16, 19, 10, 6, 0x8a857c).ellipse(14, 17, 8, 4, 0xa8a298).ellipse(12, 15, 3, 2, 0xcac4ba);
  p.ellipse(24, 23, 4, 2, 0x8a857c);
  p.outline(0x3b3530);
}

function decorStump(p: Painter) {
  p.shadow(16, 25, 9, 3, 0.25);
  p.rect(9, 15, 14, 9, 0x7a5236).ellipse(16, 15, 7, 3, 0xc8945a).ellipse(16, 15, 4, 2, 0xa8743a).px(16, 15, 0x7a5236);
  p.rect(9, 15, 2, 9, 0x5a3a26).line(22, 22, 26, 25, 0x7a5236);
  p.outline(0x3b2a22);
}

function decorMushroom(p: Painter) {
  for (const [x, y, s2] of [[12, 20, 4], [20, 22, 3], [17, 16, 2]] as [number, number, number][]) {
    p.rect(x - 1, y, 2, s2 + 1, 0xf2ece0);
    p.ellipse(x, y, s2, Math.max(1, s2 - 1), 0xd8443a).px(x - 1, y - 1, 0xffffff).px(x + 1, y, 0xffffff);
  }
  p.outline(0x3b2a22);
}

function soil(p: Painter, wet: boolean) {
  const base = wet ? 0x6a4430 : 0x9a6a44;
  const dark = wet ? 0x50321f : 0x7e5434;
  const light = wet ? 0x7e5438 : 0xb07c52;
  p.rect(0, 0, TS, TS, base);
  // 고랑
  for (let y = 5; y < TS; y += 7) {
    p.rect(2, y, TS - 4, 1, dark);
    p.rect(2, y - 1, TS - 4, 1, light);
  }
  p.speckle(1, 1, TS - 2, TS - 2, dark, 0.06, wet ? 9 : 7);
  // 밭 테두리 (둑)
  p.frame(0, 0, TS, TS, shade(base, -0.3));
  p.rect(1, 1, TS - 2, 1, shade(base, 0.15));
  if (wet) p.speckle(2, 2, TS - 4, TS - 4, 0x4a6a8a, 0.02, 11);
}

function path(p: Painter) {
  p.rect(0, 0, TS, TS, 0xc9a67a);
  p.speckle(0, 0, TS, TS, 0xb08e64, 0.12, 21);
  p.speckle(0, 0, TS, TS, 0xdcbc90, 0.08, 23);
}

/** 1px 익스트루전 포함 타일셋 캔버스 (margin 1, spacing 2) */
export function buildTileset(): { canvas: HTMLCanvasElement; tileW: number; margin: number; spacing: number } {
  const tiles: Painter[] = [];
  for (let s = 0; s < 4; s++) {
    const pal = PALS[s];
    const mk = (fn: (p: Painter) => void) => {
      const p = new Painter(TS, TS);
      fn(p);
      tiles.push(p);
    };
    mk((p) => grass(p, pal, 101 + s * 17, false, 0.05));
    mk((p) => grass(p, pal, 202 + s * 17, false, -0.03));
    mk((p) => grass(p, pal, 303 + s * 17, true));
    mk((p) => wild(p, pal, 404 + s * 17));
    mk((p) => wild(p, pal, 505 + s * 17));
    mk((p) => forestFloor(p, pal, 606 + s * 17));
    mk((p) => treeCrown(p, pal, 707 + s * 17));
    mk((p) => treeCrown(p, pal, 808 + s * 17));
    mk((p) => decorBush(p, pal));
    mk((p) => decorFlowers(p, pal, 909 + s * 17));
    mk((p) => decorTall(p, pal, 1010 + s * 17));
    mk((p) => decorTree(p, pal));
  }
  const soilDry = new Painter(TS, TS);
  soil(soilDry, false);
  const soilWet = new Painter(TS, TS);
  soil(soilWet, true);
  const pth = new Painter(TS, TS);
  path(pth);
  const rock = new Painter(TS, TS);
  decorRock(rock);
  const stump = new Painter(TS, TS);
  decorStump(stump);
  const mush = new Painter(TS, TS);
  decorMushroom(mush);
  tiles.push(soilDry, soilWet, pth, rock, stump, mush);

  const cell = TS + 2;
  const c = document.createElement('canvas');
  c.width = cell * tiles.length;
  c.height = cell;
  const ctx = c.getContext('2d')!;
  tiles.forEach((t, i) => {
    const x = i * cell + 1;
    ctx.drawImage(t.canvas, x, 1);
    // 익스트루전
    ctx.drawImage(t.canvas, 0, 0, TS, 1, x, 0, TS, 1);
    ctx.drawImage(t.canvas, 0, TS - 1, TS, 1, x, TS + 1, TS, 1);
    ctx.drawImage(t.canvas, 0, 0, 1, TS, x - 1, 1, 1, TS);
    ctx.drawImage(t.canvas, TS - 1, 0, 1, TS, x + TS, 1, 1, TS);
  });
  return { canvas: c, tileW: TS, margin: 1, spacing: 2 };
}

/** 개별 타일 미리보기 (DOM 용) */
export function soilIcon(wet: boolean): HTMLCanvasElement {
  const p = new Painter(TS, TS);
  soil(p, wet);
  return p.canvas;
}
