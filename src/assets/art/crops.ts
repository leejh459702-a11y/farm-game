import { CROPS, type CropData } from '../../data/crops';
import { Painter, shade, sheet, type Color } from '../painter';

export const CROP_FW = 32;
export const CROP_FH = 44;

const SOIL_MOUND = 0x7a5034;

/** 공통: 씨앗 단계 */
function seedStage(p: Painter) {
  const by = CROP_FH - 10;
  p.ellipse(16, by, 5, 2, SOIL_MOUND);
  p.px(14, by - 1, 0xd9c08a).px(17, by, 0xd9c08a).px(16, by - 1, 0xe8d4a0);
}

function sprout(p: Painter, leaf: Color) {
  const by = CROP_FH - 10;
  p.ellipse(16, by + 1, 4, 1, SOIL_MOUND);
  p.rect(16, by - 5, 1, 5, shade(leaf, -0.2));
  p.ellipse(13, by - 6, 2, 1, leaf).ellipse(19, by - 6, 2, 1, leaf);
  p.px(12, by - 7, shade(leaf, 0.2)).px(20, by - 7, shade(leaf, 0.2));
}

function leafTuft(p: Painter, cx: number, by: number, h: number, leaf: Color, n = 5) {
  for (let i = 0; i < n; i++) {
    const dx = (i - (n - 1) / 2) * 2.2;
    const tx = cx + dx * 1.6;
    const ty = by - h + Math.abs(dx) * 0.8;
    p.line(cx + dx * 0.3, by, tx, ty, i % 2 ? leaf : shade(leaf, -0.15));
    p.line(cx + dx * 0.3 + 1, by, tx + 1, ty + 1, shade(leaf, 0.15));
  }
}

function drawRoot(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, color2, leaf } = c.art;
  if (stage === 2) leafTuft(p, 16, by, 9, leaf, 4);
  if (stage >= 3) leafTuft(p, 16, by - 1, 14, leaf, 6);
  if (stage === 4) {
    p.ellipse(16, by + 1, 5, 3, color);
    p.ellipse(15, by, 2, 1, shade(color, 0.3));
    if (color2) p.rect(13, by - 2, 7, 2, color2);
  } else p.ellipse(16, by + 1, 5, 2, SOIL_MOUND);
}

function drawLeafy(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const size = stage === 2 ? 5 : stage === 3 ? 8 : 10;
  p.ellipse(16, by + 1, size + 1, 2, SOIL_MOUND);
  p.ellipse(16, by - size / 2, size, Math.round(size * 0.75), shade(leaf, -0.1));
  if (stage === 4) {
    p.ellipse(16, by - size / 2 - 1, size - 2, Math.round(size * 0.6), color);
    p.line(16, by - size, 16, by - 2, shade(color, -0.2));
    p.line(12, by - size / 2, 16, by - 2, shade(color, -0.15)).line(20, by - size / 2, 16, by - 2, shade(color, -0.15));
    p.ellipse(13, by - size + 1, 2, 1, shade(color, 0.3));
  } else {
    p.ellipse(15, by - size / 2 - 1, size - 3, Math.round(size * 0.5), leaf);
    p.ellipse(13, by - size / 2 - 2, 2, 1, shade(leaf, 0.25));
  }
}

function stake(p: Painter, x: number, top: number, by: number) {
  p.rect(x, top, 2, by - top + 2, 0xa0784e).rect(x, top, 1, by - top + 2, 0xc0966a);
}

function drawVine(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const top = stage === 2 ? by - 14 : by - 26;
  stake(p, 15, top, by);
  p.ellipse(16, by + 1, 5, 2, SOIL_MOUND);
  const leaves = stage === 2 ? 3 : 6;
  for (let i = 0; i < leaves; i++) {
    const y = by - 3 - i * 4;
    const left = i % 2 === 0;
    p.ellipse(left ? 12 : 20, y, 4, 2, i % 3 ? leaf : shade(leaf, -0.15));
    p.px(left ? 10 : 22, y - 1, shade(leaf, 0.2));
  }
  if (stage === 4) {
    const spots: [number, number][] = [[11, by - 8], [21, by - 12], [12, by - 18], [20, by - 21]];
    for (const [x, y] of spots) {
      if (c.id === 'cucumber') p.rect(x - 1, y - 3, 3, 7, color).px(x, y - 3, shade(color, 0.3));
      else if (c.id === 'pea') p.ellipse(x, y, 1, 3, color).px(x, y - 2, shade(color, 0.3));
      else if (c.id === 'grape') {
        for (let k = 0; k < 4; k++) p.circle(x - 1 + (k % 2) * 2, y - 2 + Math.floor(k / 2) * 2 + (k === 3 ? 1 : 0), 1, k % 2 ? color : shade(color, 0.15));
        p.circle(x, y + 3, 1, shade(color, -0.1));
      } else p.circle(x, y, 2, color).px(x - 1, y - 1, shade(color, 0.4)).px(x, y - 3, leaf);
    }
  } else if (stage === 3 && c.id === 'tomato') {
    p.circle(11, by - 8, 2, 0x8ccf5a).circle(21, by - 12, 2, 0x8ccf5a);
  }
}

function drawBush(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const s = stage === 2 ? 5 : 8;
  p.ellipse(16, by + 1, s + 1, 2, SOIL_MOUND);
  p.ellipse(16, by - s + 1, s + 1, s, shade(leaf, -0.18));
  p.ellipse(15, by - s, s, s - 1, leaf);
  p.ellipse(13, by - s - 2, 2, 2, shade(leaf, 0.2));
  if (stage === 4) {
    if (c.id === 'broccoli') {
      p.ellipse(16, by - s - 2, 5, 4, color).ellipse(14, by - s - 4, 2, 2, shade(color, 0.2));
      for (let i = 0; i < 6; i++) p.px(12 + i * 2, by - s - 3 + (i % 2), shade(color, -0.3));
    } else {
      const pts: [number, number][] = [[10, by - 6], [20, by - 8], [14, by - 12], [22, by - 3], [17, by - 5], [11, by - 13]];
      for (const [x, y] of pts) {
        if (c.id === 'pepper') p.rect(x, y - 2, 2, 5, color).px(x, y - 3, 0x3f8f3a);
        else if (c.id === 'blueberry') p.circle(x, y, 1, color).px(x, y - 1, shade(color, 0.4));
        else p.ellipse(x, y, 2, 2, color).px(x - 1, y - 1, shade(color, 0.35)).px(x, y - 3, 0x3f8f3a).px(x + 1, y + 1, 0xf7e08a);
      }
    }
  } else if (stage === 3) {
    for (const [x, y] of [[11, by - 8], [19, by - 10]] as [number, number][]) p.px(x, y, 0xffffff).px(x + 1, y, 0xf7e08a);
  }
}

function drawTall(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const h = stage === 2 ? 16 : 30;
  for (const x of [12, 16, 20]) {
    p.rect(x, by - h, 2, h, shade(leaf, -0.15));
    p.line(x, by - h / 2, x - 4, by - h / 2 - 5, leaf).line(x + 1, by - h / 3, x + 5, by - h / 3 - 4, leaf);
    p.px(x, by - h - 1, 0xe8d48a);
  }
  if (stage === 4) {
    for (const x of [13, 21]) {
      p.ellipse(x + 1, by - 14, 2, 5, color).px(x, by - 17, shade(color, 0.3));
      p.line(x - 1, by - 10, x - 1, by - 18, 0x8cbf4a);
    }
  }
  p.ellipse(16, by + 1, 7, 2, SOIL_MOUND);
}

function drawMelon(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, color2, leaf } = c.art;
  p.ellipse(16, by, 9, 3, shade(leaf, -0.25));
  for (const [x, y] of [[9, by - 3], [22, by - 4], [15, by - 6]] as [number, number][]) {
    p.ellipse(x, y, 4, 3, leaf).px(x - 1, y - 1, shade(leaf, 0.25));
  }
  p.line(6, by, 26, by - 2, shade(leaf, -0.1));
  if (stage >= 3) {
    const r = stage === 4 ? 6 : 3;
    const fc = stage === 4 ? color : shade(0x8ccf5a, 0);
    p.ellipse(17, by - r + 2, r + 1, r, fc);
    if (stage === 4 && color2) {
      if (c.id === 'pumpkin') for (const x of [13, 17, 21]) p.line(x, by - 9, x, by + 1, color2);
      else if (c.id === 'melon') {
        p.line(12, by - 6, 22, by, color2).line(12, by, 22, by - 6, color2);
      } else for (const x of [13, 17, 21]) p.line(x, by - 9, x + 1, by + 1, color2);
      p.ellipse(14, by - 6, 2, 1, shade(color, 0.35));
      p.rect(17, by - 12, 1, 3, 0x6a4a2a);
    }
  }
}

function drawTree(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 8;
  const { color, leaf } = c.art;
  const h = stage === 2 ? 14 : 22;
  p.ellipse(16, by + 1, 6, 2, 0x000000, 0.2);
  p.rect(15, by - h + 4, 3, h - 2, 0x7a5236).rect(15, by - h + 4, 1, h - 2, 0x94683f);
  const cr = stage === 2 ? 6 : 11;
  p.ellipse(16, by - h, cr, cr - 2, shade(leaf, -0.2));
  p.ellipse(15, by - h - 1, cr - 1, cr - 3, leaf);
  p.ellipse(12, by - h - 4, 3, 2, shade(leaf, 0.22));
  if (stage === 4) {
    for (const [x, y] of [[10, by - h + 1], [20, by - h - 3], [14, by - h + 4], [22, by - h + 3], [17, by - h - 6]] as [number, number][])
      p.circle(x, y, 2, color).px(x - 1, y - 1, shade(color, 0.4));
  } else if (stage === 3) {
    for (const [x, y] of [[11, by - h], [20, by - h - 2]] as [number, number][]) p.px(x, y, 0xffffff).px(x + 1, y + 1, 0xf7c0d0);
  }
}

function drawFlower(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, color2, leaf } = c.art;
  const h = stage === 2 ? 12 : 24;
  p.ellipse(16, by + 1, 4, 2, SOIL_MOUND);
  p.rect(16, by - h, 1, h, shade(leaf, -0.2));
  p.ellipse(13, by - h / 2, 3, 1, leaf).ellipse(19, by - h / 3, 3, 1, leaf);
  if (stage >= 3) {
    if (c.id === 'sunflower') {
      const r = stage === 4 ? 6 : 3;
      p.circle(16, by - h, r, color);
      if (stage === 4) for (let a = 0; a < 8; a++) p.px(16 + Math.round(Math.cos(a) * 7), by - h + Math.round(Math.sin(a) * 7), shade(color, 0.2));
      p.circle(16, by - h, Math.max(1, r - 3), color2 ?? 0x7a4a24);
    } else {
      const r = stage === 4 ? 4 : 2;
      p.circle(16, by - h, r, color);
      if (stage === 4 && color2) {
        p.circle(14, by - h - 1, 2, color2).circle(18, by - h + 1, 2, 0xf7e08a);
        p.px(16, by - h, 0xffffff);
      }
    }
  }
}

function drawGrain(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const h = stage === 2 ? 10 : 20;
  const col = stage === 4 ? color : leaf;
  for (let i = 0; i < 7; i++) {
    const x = 9 + i * 2.4;
    const top = by - h + (i % 2) * 2;
    p.line(x, by, x + (i - 3) * 0.6, top, shade(col, -0.15));
    if (stage >= 3) p.ellipse(Math.round(x + (i - 3) * 0.6), top - 1, 1, 2, col).px(Math.round(x + (i - 3) * 0.6), top - 3, shade(col, 0.3));
  }
  p.ellipse(16, by + 1, 8, 2, c.id === 'rice' ? 0x5e7a8a : SOIL_MOUND);
}

function drawStalk(p: Painter, c: CropData, stage: number) {
  const by = CROP_FH - 10;
  const { color, leaf } = c.art;
  const h = stage === 2 ? 9 : stage === 3 ? 14 : 18;
  p.ellipse(16, by + 1, 6, 2, SOIL_MOUND);
  for (const [x, off] of [[11, 2], [14, 0], [17, 3], [20, 1]] as [number, number][]) {
    p.rect(x, by - h + off, 2, h - off, c.id === 'greenonion' ? color : leaf);
    p.rect(x, by - h + off, 1, h - off, shade(c.id === 'greenonion' ? color : leaf, 0.2));
    if (c.id === 'greenonion') p.rect(x, by - h + off, 2, Math.round(h / 2), leaf);
    else p.px(x, by - h + off - 1, shade(color, -0.25));
  }
}

const DRAW: Record<CropData['art']['kind'], (p: Painter, c: CropData, stage: number) => void> = {
  root: drawRoot,
  leafy: drawLeafy,
  vine: drawVine,
  bush: drawBush,
  tall: drawTall,
  tree: drawTree,
  melon: drawMelon,
  flower: drawFlower,
  grain: drawGrain,
  stalk: drawStalk,
};

/** 작물 5단계 스프라이트시트 */
export function buildCropSheets(): { key: string; canvas: HTMLCanvasElement }[] {
  return CROPS.map((c) => {
    const frames: Painter[] = [];
    for (let stage = 0; stage < 5; stage++) {
      const p = new Painter(CROP_FW, CROP_FH);
      if (stage === 0) seedStage(p);
      else if (stage === 1) sprout(p, c.art.leaf);
      else DRAW[c.art.kind](p, c, stage);
      if (stage >= 1) p.outline(0x2f3a24);
      frames.push(p);
    }
    return { key: c.spriteKey, canvas: sheet(frames) };
  });
}
