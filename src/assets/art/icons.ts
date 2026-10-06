/**
 * 아이템/UI 아이콘 (16×16) — 코드로 그린 플레이스홀더 픽셀아트.
 */
import { CROPS, CROP_BY_ID, type CropData } from '../../data/crops';
import { ITEMS } from '../../data/items';
import { POND_FISH } from '../../data/aquaculture';
import { ARTIFACTS } from '../../data/artifacts';
import { BOOKS } from '../../data/books';
import { INSECTS, type InsectData } from '../../data/insects';
import { SPIRITS } from '../../data/spirits';
import { FISH, type FishData } from '../../data/fish';
import { FORAGE, RESOURCES, type ForageData, type ResourceData } from '../../data/gathering';
import { Painter, shade, type Color } from '../painter';

const S = 16;
const OL = 0x3b2a22;
const LEAF = 0x4f9a3a;

type IconFn = (p: Painter) => void;

// ───────────── 작물 아이콘 ─────────────
function cropIcon(c: CropData): IconFn {
  const { color, color2 } = c.art;
  const id = c.id;
  return (p) => {
    switch (id) {
      case 'carrot':
        p.tri(5, 5, 11, 5, 8, 15, color);
        p.line(6, 7, 8, 7, shade(color, -0.2)).line(7, 10, 9, 10, shade(color, -0.2));
        p.line(8, 5, 6, 1, LEAF).line(8, 5, 8, 0, 0x6fc04a).line(8, 5, 10, 1, LEAF);
        break;
      case 'radish':
      case 'winterradish':
      case 'ginseng':
        p.ellipse(8, 9, 3, 5, color).rect(7, 13, 2, 2, color).px(8, 15, color);
        p.rect(6, 4, 5, 2, color2 ?? 0xa8d68a);
        p.line(8, 4, 5, 0, LEAF).line(8, 4, 11, 0, LEAF).line(8, 4, 8, 0, 0x6fc04a);
        p.px(7, 8, shade(color, 0.4));
        break;
      case 'onion':
      case 'garlic':
        p.ellipse(8, 10, 5, 4, color).ellipse(8, 7, 3, 2, color);
        p.line(8, 5, 8, 1, id === 'onion' ? LEAF : 0xe8e0d0);
        p.line(6, 9, 6, 13, shade(color, -0.15)).line(10, 9, 10, 13, shade(color, -0.15));
        p.px(6, 9, shade(color, 0.4));
        break;
      case 'potato':
      case 'sweetpotato':
      case 'peanut':
        if (id === 'peanut') {
          p.ellipse(6, 9, 3, 4, color).ellipse(10, 7, 3, 4, color);
          p.px(5, 8, shade(color, -0.2)).px(10, 6, shade(color, -0.2)).px(7, 10, shade(color, -0.2));
        } else {
          p.ellipse(8, 9, 6, 4, color);
          p.px(5, 8, shade(color, -0.25)).px(9, 7, shade(color, -0.25)).px(11, 10, shade(color, -0.25));
          p.ellipse(6, 7, 2, 1, shade(color, 0.3));
        }
        break;
      case 'lettuce':
      case 'cabbage':
      case 'spinach':
      case 'wintercabbage':
        p.ellipse(8, 9, 6, 5, shade(color, -0.15));
        p.ellipse(8, 8, 4, 4, color);
        p.line(8, 4, 8, 13, shade(color, -0.3)).line(4, 8, 8, 12, shade(color, -0.25)).line(12, 8, 8, 12, shade(color, -0.25));
        p.px(6, 6, shade(color, 0.35));
        break;
      case 'pea':
        p.ellipse(8, 9, 6, 3, color);
        for (const x of [5, 8, 11]) p.circle(x, 9, 1, shade(color, 0.25));
        p.line(2, 7, 4, 5, LEAF);
        break;
      case 'strawberry':
      case 'winterstrawberry':
        p.ellipse(8, 9, 5, 4, color).tri(4, 10, 12, 10, 8, 15, color);
        for (const [x, y] of [[6, 8], [9, 9], [7, 11], [10, 12], [5, 11]]) p.px(x, y, 0xf7e08a);
        p.rect(5, 4, 7, 2, LEAF).px(8, 3, LEAF);
        p.px(6, 7, shade(color, 0.4));
        break;
      case 'asparagus':
        for (const x of [5, 8, 11]) {
          p.rect(x, 3, 2, 12, color).px(x, 2, shade(color, -0.3)).px(x + 1, 6, shade(color, -0.25)).px(x, 10, shade(color, -0.25));
        }
        p.rect(4, 11, 9, 2, 0xc9a066);
        break;
      case 'wheat':
      case 'rice':
        for (const x of [5, 8, 11]) {
          p.line(x, 15, x + (x - 8) / 3, 6, shade(color, -0.2));
          p.ellipse(Math.round(x + (x - 8) / 3), 5, 1, 3, color);
        }
        p.rect(4, 11, 9, 2, 0xa0784e);
        break;
      case 'tomato':
        p.circle(8, 9, 5, color).px(6, 7, shade(color, 0.4)).px(5, 8, shade(color, 0.3));
        p.rect(6, 4, 5, 1, LEAF).px(8, 3, LEAF).px(5, 5, LEAF).px(11, 5, LEAF);
        break;
      case 'cucumber':
        p.ellipse(8, 8, 3, 7, color);
        for (const [x, y] of [[7, 4], [9, 7], [7, 10], [9, 12]]) p.px(x, y, shade(color, 0.35));
        p.px(8, 0, 0xf7e08a);
        break;
      case 'pepper':
        p.ellipse(8, 9, 3, 5, color).tri(6, 11, 10, 11, 9, 15, color);
        p.rect(7, 3, 2, 2, LEAF).px(6, 7, shade(color, 0.4));
        break;
      case 'corn':
        p.ellipse(8, 8, 3, 6, color);
        for (let y = 4; y < 13; y += 2) p.px(7, y, shade(color, -0.2)).px(9, y + 1, shade(color, -0.2));
        p.tri(3, 15, 7, 6, 7, 15, 0x7cbf4a).tri(13, 15, 9, 6, 9, 15, LEAF);
        break;
      case 'watermelon':
      case 'melon':
      case 'pumpkin':
      case 'goldenmelon':
        p.ellipse(8, 9, 7, 5, color);
        if (id === 'pumpkin') for (const x of [5, 8, 11]) p.line(x, 5, x, 13, color2 ?? shade(color, -0.2));
        else if (id === 'melon') for (let k = 0; k < 4; k++) p.line(3 + k * 3, 5, 5 + k * 3, 13, color2 ?? shade(color, -0.2));
        else for (const x of [4, 8, 12]) p.line(x, 5, x + 1, 13, color2 ?? shade(color, -0.25));
        p.rect(8, 2, 1, 3, 0x6a4a2a);
        p.ellipse(5, 7, 1, 1, shade(color, 0.4));
        if (id === 'goldenmelon') p.px(11, 6, 0xffffff).px(12, 5, 0xffffff);
        break;
      case 'blueberry':
        for (const [x, y] of [[5, 9], [10, 8], [8, 12], [7, 6], [11, 12]]) p.circle(x, y, 2, color).px(x - 1, y - 1, shade(color, 0.4));
        p.line(8, 2, 8, 5, LEAF);
        break;
      case 'grape':
        for (const [x, y] of [[5, 5], [8, 5], [11, 5], [6, 8], [9, 8], [12, 8], [7, 11], [10, 11], [8, 14]]) p.circle(x, y, 1, color).px(x - 1, y - 1, shade(color, 0.35));
        p.line(8, 0, 8, 3, 0x6a4a2a).rect(9, 1, 3, 2, LEAF);
        break;
      case 'sunflower':
        for (let a = 0; a < 10; a++) p.circle(8 + Math.round(Math.cos(a * 0.63) * 5), 8 + Math.round(Math.sin(a * 0.63) * 5), 1, color);
        p.circle(8, 8, 3, color2 ?? 0x7a4a24).px(7, 7, shade(color2 ?? 0x7a4a24, 0.3));
        break;
      case 'rainbowrose':
        p.circle(8, 6, 4, color).circle(7, 5, 2, color2 ?? 0x7ac6f2).px(9, 7, 0xf7e08a);
        p.line(8, 10, 8, 15, LEAF).rect(9, 12, 3, 1, LEAF);
        break;
      case 'apple':
      case 'tangerine':
        p.circle(8, 9, 5, color).px(6, 7, shade(color, 0.4)).px(5, 8, shade(color, 0.3));
        p.line(8, 4, 9, 2, 0x6a4a2a).ellipse(11, 3, 2, 1, LEAF);
        break;
      case 'pear':
        p.ellipse(8, 11, 5, 4, color).ellipse(8, 6, 3, 3, color).px(6, 9, shade(color, 0.4));
        p.line(8, 3, 9, 1, 0x6a4a2a).px(10, 2, LEAF);
        break;
      case 'broccoli':
        p.rect(7, 9, 3, 6, 0x7cbf4a);
        p.circle(5, 6, 3, color).circle(11, 6, 3, color).circle(8, 4, 3, shade(color, 0.1));
        p.px(4, 5, shade(color, 0.3)).px(8, 3, shade(color, 0.3));
        break;
      case 'greenonion':
        p.rect(5, 9, 6, 6, color).rect(5, 1, 2, 9, LEAF).rect(8, 0, 2, 10, 0x6fc04a).rect(10, 2, 2, 8, LEAF);
        p.rect(5, 14, 6, 1, 0xd9cfa8);
        break;
      default:
        p.circle(8, 8, 5, color);
    }
  };
}

function seedIcon(c: CropData): IconFn {
  return (p) => {
    p.rect(3, 3, 10, 12, 0xe8d4a8).rect(3, 3, 10, 2, 0xc9a670).rect(4, 5, 8, 1, 0xd9c08a);
    p.rect(5, 7, 6, 6, shade(c.art.color, 0.1));
    p.rect(5, 7, 6, 1, shade(c.art.color, 0.35));
    p.px(8, 9, c.art.leaf).px(7, 10, c.art.leaf).px(9, 10, c.art.leaf);
    if (c.rare) p.px(12, 4, 0xffe066).px(11, 3, 0xffe066).px(13, 3, 0xffe066);
  };
}

// ───────────── 물고기 / 채집물 / 자원 ─────────────
function fishIcon(f: FishData): IconFn {
  const { body, belly, fin, shape } = f.art;
  return (p) => {
    if (f.id === 'old_boot') {
      p.rect(4, 3, 6, 9, body).rect(4, 10, 10, 4, body).rect(4, 13, 10, 1, fin).rect(5, 4, 1, 6, belly);
      return;
    }
    const len = shape === 'long' ? 7 : shape === 'big' ? 6 : 6;
    const ht = shape === 'round' || shape === 'big' ? 4 : shape === 'long' ? 2 : 3;
    p.ellipse(8, 8, len, ht, body);
    p.ellipse(8, 9, len - 1, Math.max(1, ht - 2), belly);
    p.tri(1, 4, 1, 12, 4, 8, fin); // 꼬리
    p.tri(6, 8 - ht, 10, 8 - ht, 8, 8 - ht - 2, fin); // 등지느러미
    p.px(12, 7, 0x1a1a1a).px(12, 6, 0xffffff);
    if (shape === 'long') p.line(3, 8, 13, 8, belly);
    if (f.rarity === 'legend') p.px(14, 2, 0xffe066).px(13, 1, 0xffe066).px(15, 1, 0xffe066).px(14, 0, 0xffffff);
  };
}

function forageIcon(f: ForageData): IconFn {
  const { shape, color, color2 } = f.art;
  return (p) => {
    switch (shape) {
      case 'berry':
        for (const [x, y] of [[5, 9], [9, 8], [7, 12], [11, 11], [7, 6]]) p.circle(x, y, 2, color).px(x - 1, y - 1, shade(color, 0.4));
        p.rect(7, 2, 4, 2, LEAF);
        break;
      case 'mushroom':
        p.rect(7, 9, 3, 6, color2 ?? 0xf0e6d0).ellipse(8, 8, 6, 4, color).ellipse(6, 6, 2, 1, shade(color, 0.35));
        if (f.id === 'enoki') for (const x of [4, 12]) p.rect(x, 5, 1, 10, color2 ?? 0xfffaf0).circle(x, 4, 1, color);
        break;
      case 'leaf':
        p.ellipse(8, 7, 4, 6, color).line(8, 2, 8, 15, shade(color, -0.3)).line(8, 7, 5, 5, shade(color, -0.3)).line(8, 10, 11, 8, shade(color, -0.3));
        if (color2) p.ellipse(8, 13, 3, 2, color2);
        break;
      case 'flower':
        for (let a = 0; a < 5; a++) p.circle(8 + Math.round(Math.cos(a * 1.26) * 3), 6 + Math.round(Math.sin(a * 1.26) * 3), 2, color);
        p.circle(8, 6, 1, color2 ?? 0xf7d84a).rect(8, 9, 1, 6, LEAF).rect(9, 11, 3, 1, LEAF);
        break;
      case 'nut':
        p.ellipse(8, 9, 5, 5, color).ellipse(6, 7, 2, 2, shade(color, 0.3));
        if (f.id === 'acorn') p.ellipse(8, 5, 5, 2, 0x8a6a3a).px(8, 2, 0x6a4a2a);
        else p.tri(4, 7, 12, 7, 8, 2, color).px(8, 2, 0xe8d8b0);
        break;
      case 'cone':
        p.ellipse(8, 9, 4, 6, color);
        for (let y = 5; y < 15; y += 2) p.line(5, y, 11, y + 1, shade(color, -0.3));
        break;
      case 'shell':
        if (f.id === 'river_snail') {
          p.circle(8, 9, 5, color).circle(8, 9, 3, color2 ?? shade(color, 0.3)).circle(8, 9, 1, color);
        } else {
          p.ellipse(8, 9, 6, 5, color).rect(2, 9, 13, 5, 0x000000, 0);
          for (let x = 4; x < 13; x += 2) p.line(8, 13, x, 5, color2 ?? shade(color, -0.25));
          p.rect(6, 13, 5, 2, color2 ?? shade(color, -0.25));
        }
        break;
      case 'reed':
        for (const x of [5, 8, 11]) p.line(x, 15, x + 1, 4, 0x8a9a4a).ellipse(x + 1, 4, 1, 3, color);
        break;
    }
  };
}

function resourceIcon(r: ResourceData): IconFn {
  const { shape, color, color2 } = r.art;
  return (p) => {
    switch (shape) {
      case 'log':
        p.rect(2, 6, 12, 6, color).ellipse(13, 9, 2, 3, color2 ?? 0xd8b07a).ellipse(13, 9, 1, 1, shade(color, -0.2));
        p.rect(2, 10, 12, 2, shade(color, -0.2)).rect(4, 4, 9, 3, color).ellipse(12, 5, 1, 2, color2 ?? 0xd8b07a);
        break;
      case 'stick':
        p.line(2, 13, 14, 3, color).line(3, 13, 15, 3, shade(color, 0.2)).line(8, 8, 11, 10, color);
        break;
      case 'sap':
        p.ellipse(8, 10, 5, 5, color).tri(8, 2, 4, 9, 12, 9, color).px(6, 8, 0xfff0a0).px(6, 9, 0xfff0a0);
        break;
      case 'stone':
        p.ellipse(8, 10, 6, 4, color).ellipse(7, 9, 4, 2, shade(color, 0.2));
        break;
      case 'clay':
        p.ellipse(8, 10, 6, 4, color).ellipse(6, 8, 3, 2, shade(color, 0.25)).px(10, 11, shade(color, -0.25));
        break;
      case 'coal':
        p.ellipse(8, 9, 5, 4, color).px(6, 7, 0x8a8a90).px(10, 10, 0x6a6a70).px(7, 11, 0x1a1a1a);
        break;
      case 'ore':
        p.ellipse(8, 9, 6, 5, color);
        for (const [x, y] of [[6, 7], [10, 9], [7, 11], [9, 6]]) p.rect(x, y, 2, 2, color2 ?? 0xffffff);
        break;
      case 'gem':
        p.tri(8, 2, 3, 8, 13, 8, shade(color, 0.2)).tri(3, 8, 13, 8, 8, 15, color).line(8, 2, 8, 15, shade(color, 0.4));
        break;
      case 'brick':
        p.rect(2, 6, 12, 7, color).line(2, 9, 13, 9, shade(color, -0.3)).line(8, 6, 8, 9, shade(color, -0.3)).line(5, 9, 5, 12, shade(color, -0.3));
        break;
    }
  };
}

// ───────────── 기타 아이템 템플릿 ─────────────
const egg = (c: Color, big = false, speck = false): IconFn => (p) => {
  const r = big ? 6 : 4;
  p.ellipse(8, 9, r, r + 1, c).px(6, 6, shade(c, 0.5)).px(7, 5, shade(c, 0.5));
  if (speck) for (const [x, y] of [[9, 8], [6, 10], [10, 11], [8, 12]]) p.px(x, y, shade(c, -0.35));
};
const bottle = (c: Color, cap: Color): IconFn => (p) => {
  p.rect(5, 6, 6, 9, c).rect(6, 3, 4, 3, c).rect(6, 2, 4, 1, cap).rect(5, 9, 6, 3, shade(c, -0.08));
  p.rect(6, 7, 1, 6, 0xffffff).rect(7, 10, 2, 1, 0x7aa8d8);
};
const woolBall = (c: Color): IconFn => (p) => {
  p.circle(8, 9, 6, c);
  for (const [x, y] of [[5, 7], [9, 6], [11, 10], [7, 12], [6, 10]]) p.circle(x, y, 1, shade(c, 0.25));
  p.px(4, 9, shade(c, -0.2)).px(12, 8, shade(c, -0.2));
};
const meat = (c: Color, poultry = false): IconFn => (p) => {
  if (poultry) {
    p.ellipse(7, 7, 5, 4, c).rect(10, 10, 2, 4, 0xf3ecdc).circle(12, 14, 1, 0xf3ecdc).circle(10, 14, 1, 0xf3ecdc);
    p.ellipse(5, 6, 2, 1, shade(c, 0.3));
  } else {
    p.ellipse(8, 8, 6, 5, c).ellipse(8, 8, 4, 3, shade(c, 0.12));
    p.line(4, 7, 12, 9, 0xf7e0e0).circle(11, 6, 1, 0xf3ecdc);
  }
};
const jar = (c: Color, label = 0xf3e6c8): IconFn => (p) => {
  p.rect(4, 6, 8, 9, c).rect(5, 4, 6, 2, 0xc9a670).rect(4, 3, 8, 1, 0xa0784e);
  p.rect(5, 9, 6, 3, label).px(5, 7, shade(c, 0.4)).px(5, 8, shade(c, 0.3));
};
const sack = (c: Color, mark: Color): IconFn => (p) => {
  p.ellipse(8, 10, 6, 5, c).rect(5, 3, 6, 4, c).rect(5, 5, 6, 1, 0xa0784e);
  p.circle(8, 10, 2, mark).px(5, 8, shade(c, 0.3));
};
const plate = (food: Color, food2?: Color, garnish?: Color): IconFn => (p) => {
  p.ellipse(8, 11, 7, 3, 0xf6f2ea).ellipse(8, 11, 5, 2, 0xe0d8cc);
  p.ellipse(8, 9, 4, 3, food);
  if (food2) p.ellipse(6, 8, 2, 1, food2).ellipse(10, 9, 2, 1, food2);
  if (garnish) p.px(8, 6, garnish).px(9, 7, garnish);
  p.px(6, 7, shade(food, 0.35));
};
const bowl = (food: Color, food2?: Color, garnish?: Color): IconFn => (p) => {
  p.ellipse(8, 8, 6, 2, food).tri(2, 8, 14, 8, 8, 15, 0xd9c8a8).rect(5, 13, 6, 2, 0xb8a888);
  if (food2) p.px(6, 8, food2).px(10, 7, food2).px(8, 8, food2);
  if (garnish) p.px(7, 7, garnish).px(9, 8, garnish);
  p.line(3, 9, 13, 9, 0xb8a888);
};
const cheese = (c: Color): IconFn => (p) => {
  p.tri(2, 13, 14, 13, 14, 5, c).rect(2, 13, 13, 2, shade(c, -0.15));
  p.circle(9, 10, 1, shade(c, -0.25)).circle(12, 8, 1, shade(c, -0.25)).px(6, 12, shade(c, -0.25));
};
const loaf = (c: Color): IconFn => (p) => {
  p.ellipse(8, 9, 6, 4, c).rect(2, 9, 13, 4, c).rect(2, 12, 13, 2, shade(c, -0.25));
  for (const x of [5, 8, 11]) p.line(x, 6, x + 1, 9, shade(c, 0.3));
};
const yarn = (c: Color): IconFn => (p) => {
  p.rect(4, 4, 8, 9, c).rect(3, 3, 10, 2, 0xa0784e).rect(3, 13, 10, 2, 0xa0784e);
  for (let y = 6; y < 13; y += 2) p.line(4, y, 11, y - 1, shade(c, -0.2));
};
const fabric = (c: Color): IconFn => (p) => {
  p.rect(2, 4, 12, 9, c).ellipse(13, 8, 2, 5, shade(c, -0.2)).ellipse(13, 8, 1, 2, shade(c, 0.2));
  for (let x = 4; x < 12; x += 3) p.line(x, 4, x, 12, shade(c, 0.15));
};
const bag = (c: Color, band: Color): IconFn => (p) => {
  p.rect(3, 4, 10, 11, c).rect(4, 2, 8, 2, shade(c, -0.15)).rect(3, 8, 10, 3, band);
  p.px(4, 5, shade(c, 0.3));
};

/** 희귀 생산물: 기본 아이콘 + 반짝임 */
const sparkle = (fn: IconFn): IconFn => (p) => {
  fn(p);
  p.px(13, 2, 0xfff6a0).px(12, 3, 0xfff6a0).px(14, 3, 0xfff6a0).px(13, 4, 0xfff6a0).px(13, 3, 0xffffff).px(3, 12, 0xfff6a0);
};

const geodeIcon = (shell: Color, inner: Color, gem: Color): IconFn => (p) => {
  p.circle(8, 9, 6, shell).circle(8, 9, 4, inner).tri(6, 10, 8, 6, 10, 10, gem).px(7, 8, 0xffffff).px(4, 6, shade(shell, 0.3));
};
const artifactIcon = (shape: string, c: Color): IconFn => (p) => {
  switch (shape) {
    case 'tool': p.line(4, 13, 10, 5, 0x7a5236).line(5, 13, 11, 5, 0x7a5236).ellipse(11, 4, 4, 2, c); break;
    case 'pouch': p.ellipse(8, 10, 5, 5, c).rect(6, 4, 4, 3, c).line(5, 6, 11, 6, shade(c, -0.3)); break;
    case 'shard': p.tri(3, 12, 8, 3, 13, 11, c).line(5, 9, 11, 9, shade(c, -0.25)); break;
    case 'charm': p.rect(5, 3, 6, 10, c).rect(6, 5, 4, 2, 0xd8343c).px(8, 9, 0xd8343c).line(8, 13, 8, 15, 0xd8343c); break;
    case 'coin': p.circle(8, 8, 5, c).circle(8, 8, 3, shade(c, -0.2)).rect(7, 6, 2, 4, shade(c, 0.3)); break;
    case 'gear': p.circle(8, 8, 5, c).circle(8, 8, 2, 0x3b2a22); for (const [x, y] of [[8, 2], [8, 14], [2, 8], [14, 8]]) p.rect(x - 1, y - 1, 2, 2, c); break;
    case 'tablet': p.rect(4, 3, 8, 11, c).line(6, 6, 10, 6, shade(c, -0.3)).line(6, 9, 9, 9, shade(c, -0.3)).line(6, 11, 10, 11, shade(c, -0.3)); break;
    case 'bottle': p.rect(5, 6, 6, 8, c).rect(7, 3, 2, 3, c).px(6, 8, 0xffffff); break;
    case 'fossil': p.ellipse(8, 9, 6, 4, c).line(4, 9, 12, 9, shade(c, -0.35)); for (const x of [6, 8, 10]) p.line(x, 7, x, 11, shade(c, -0.35)); break;
    case 'hook': p.line(9, 2, 9, 10, c).line(9, 10, 7, 12, c).line(7, 12, 5, 10, c).px(5, 9, c); break;
    case 'lamp': p.rect(5, 6, 6, 7, c).rect(6, 4, 4, 2, shade(c, -0.3)).circle(8, 9, 2, 0xfff0a0); break;
    case 'map': p.rect(3, 4, 10, 9, c); for (const [x, y] of [[5, 6], [9, 7], [7, 10], [11, 10]]) p.px(x, y, 0xfff6a0); break;
  }
  p.px(13, 2, 0xfff6a0).px(14, 3, 0xfff6a0);
};

function bugIcon(i: InsectData): IconFn {
  const { color: c, color2: c2 } = i;
  return (p) => {
    switch (i.shape) {
      case 'butterfly':
        p.ellipse(5, 6, 4, 3, c).ellipse(11, 6, 4, 3, c).ellipse(5, 11, 3, 2, c).ellipse(11, 11, 3, 2, c).px(4, 5, c2).px(12, 5, c2).px(5, 11, c2).px(11, 11, c2);
        p.line(8, 4, 8, 13, 0x2a2a2a).px(7, 3, 0x2a2a2a).px(9, 3, 0x2a2a2a);
        break;
      case 'bee':
        p.ellipse(8, 9, 5, 4, c).line(6, 6, 6, 12, c2).line(9, 6, 9, 12, c2).ellipse(7, 4, 3, 2, 0xe8f4fb).ellipse(11, 4, 3, 2, 0xe8f4fb).px(13, 9, c2);
        break;
      case 'beetle':
        p.ellipse(8, 9, 5, 5, c).line(8, 4, 8, 14, c2).px(6, 8, c2).px(10, 10, c2).px(6, 11, c2).px(10, 7, c2).rect(7, 3, 3, 2, 0x1a1a1a);
        if (i.id === 'stag_beetle') p.line(6, 3, 5, 1, c2).line(10, 3, 11, 1, c2);
        break;
      case 'dragonfly':
        p.line(8, 3, 8, 14, c).ellipse(4, 6, 4, 2, c2).ellipse(12, 6, 4, 2, c2).ellipse(4, 9, 3, 1, c2).ellipse(12, 9, 3, 1, c2).circle(8, 3, 1, c);
        break;
      case 'moth':
        p.tri(1, 4, 8, 7, 3, 12, c).tri(15, 4, 8, 7, 13, 12, c).ellipse(8, 8, 1, 4, c2).px(4, 7, c2).px(12, 7, c2);
        break;
      case 'firefly':
        p.ellipse(8, 7, 3, 3, c).circle(8, 11, 3, c2).circle(8, 11, 5, c2, 0.35).px(7, 4, 0x1a1a1a);
        break;
      case 'cicada':
        p.ellipse(8, 8, 3, 5, c).tri(3, 5, 8, 6, 5, 14, c2).tri(13, 5, 8, 6, 11, 14, c2).px(7, 4, 0x1a1a1a).px(9, 4, 0x1a1a1a);
        break;
      case 'cricket':
        p.ellipse(8, 9, 5, 3, c).line(3, 7, 1, 3, c2).line(12, 10, 15, 13, c2).line(11, 10, 14, 14, c2).px(4, 8, 0x1a1a1a);
        break;
    }
  };
}

const OTHER: Record<string, IconFn> = {
  spirit_leaf: sparkle((p) => p.ellipse(8, 8, 5, 3, 0x7ac85a).line(4, 11, 12, 5, 0x3f8a3c)),
  spirit_dew: sparkle((p) => p.ellipse(8, 10, 4, 4, 0x7ac8f0).tri(5, 9, 11, 9, 8, 3, 0x7ac8f0).px(7, 8, 0xffffff)),
  spirit_crystal: sparkle((p) => p.tri(8, 2, 3, 9, 13, 9, 0xd8d0f0).tri(3, 9, 13, 9, 8, 15, 0xb8b0d8)),
  ember_core: sparkle((p) => p.circle(8, 9, 5, 0xe0603a).circle(8, 9, 3, 0xf6c870).px(8, 9, 0xffffff)),
  moon_dust: sparkle((p) => p.ellipse(8, 11, 6, 3, 0xd8dcf8).circle(6, 6, 3, 0xf6f6ff).circle(7, 5, 3, 0xd8dcf8)),
  dew_pearl: sparkle((p) => p.circle(8, 9, 5, 0xc8f6ec).px(6, 7, 0xffffff).px(7, 6, 0xffffff)),
  lava_gem: sparkle((p) => p.tri(8, 2, 3, 9, 13, 9, 0xff8a3a).tri(3, 9, 13, 9, 8, 15, 0xd8482a)),
  starlight_drop: sparkle((p) => p.ellipse(8, 10, 4, 4, 0xf6e070).tri(5, 9, 11, 9, 8, 3, 0xf6e070).px(8, 9, 0xffffff)),
  bloom_petal: sparkle((p) => p.ellipse(6, 8, 3, 4, 0xf2a0c8).ellipse(10, 8, 3, 4, 0xf7c0dc).circle(8, 9, 1, 0xf6e070)),
  ore_bag: sack(0x8a7a6a, 0xd8803a),
  geode: geodeIcon(0x8a857c, 0xd8d0e0, 0xa86ad8),
  magma_geode: geodeIcon(0x5a3a30, 0xf09040, 0xe0303c),
  ...Object.fromEntries(ARTIFACTS.map((a) => [a.id, artifactIcon(a.shape, a.color)])),
  ...Object.fromEntries(
    BOOKS.map((b) => [
      b.id,
      ((p: Painter) => {
        p.rect(3, 3, 10, 11, b.color).rect(3, 3, 2, 11, shade(b.color, -0.3)).rect(6, 5, 5, 2, 0xf6efe0).rect(12, 4, 1, 9, 0xf6efe0).px(13, 2, 0xfff6a0).px(14, 3, 0xfff6a0);
      }) as IconFn,
    ]),
  ),
  wine: bottle(0x7a1f3a, 0x3b2a22),
  peach_jam: jar(0xf6a8a0),
  lemonade: bottle(0xf6f0a0, 0xf6e04a),
  yuzu_tea: jar(0xf2d23a, 0xf6efe0),
  fruit_wine: bottle(0xd89a3a, 0x8a5a3a),
  peanut_oil: bottle(0xf0d070, 0xa0784e),
  premium_cheese: cheese(0xf6ecb8),
  sugar: sack(0xf6f2ea, 0xe0d8cc),
  caviar: jar(0x2a2a30, 0xd9a03a),
  honey_cake: (p) => {
    for (const [x, y] of [[5, 6], [11, 7], [8, 11]]) p.circle(x, y, 3, 0xd9a050).px(x - 1, y - 1, 0x8a5a3a).px(x + 1, y, 0x8a5a3a);
  },
  fruit_jam_tart: plate(0xd9a050, 0xd8343c, 0xf6efe0),
  roe_rice: bowl(0xf6efe0, 0xf09a2c, 0xe8584a),
  pondweed: (p) => {
    for (const [x, c] of [[5, 0x4a9a4a], [8, 0x5aa83c], [11, 0x3f8a3c]] as const) p.line(x, 14, x - 1, 4, c).line(x - 1, 8, x + 1, 6, c);
    p.ellipse(8, 14, 6, 1, 0x3f7fb8);
  },
  pearl: (p) => {
    p.ellipse(8, 11, 6, 3, 0xd8c8b0).circle(8, 8, 4, 0xf6f2fa).px(6, 6, 0xffffff).px(7, 6, 0xffffff).px(10, 10, 0xd8c8e8);
  },
  shimmer_scale: (p) => {
    p.ellipse(8, 8, 5, 6, 0x8ad0e8).ellipse(8, 9, 4, 4, 0xc8a0e8).ellipse(8, 10, 3, 2, 0xf6d870).px(6, 5, 0xffffff).px(7, 4, 0xffffff);
  },
  fish_feed: (p) => {
    p.ellipse(8, 10, 6, 5, 0xc8a070).rect(5, 3, 6, 4, 0xc8a070).rect(5, 5, 6, 1, 0x8a6a4a);
    p.ellipse(6, 4, 2, 1, 0x5a9ad8).ellipse(9, 10, 3, 2, 0x5a9ad8).tri(11, 10, 13, 8, 13, 12, 0x5a9ad8);
  },
  egg: egg(0xf6efe0),
  giant_ostrich_egg: sparkle(egg(0xf6ead0, true, true)),
  spotted_turkey_egg: sparkle(egg(0xd8b890, false, true)),
  golden_goose_egg: sparkle(egg(0xf2c83a, true)),
  jade_duck_egg: sparkle(egg(0x7ac8a0)),
  golden_egg: sparkle(egg(0xf2c83a)),
  duck_egg: egg(0xd6ecdf),
  goose_egg: egg(0xfbfbf6, true),
  turkey_egg: egg(0xead7bd, false, true),
  ostrich_egg: egg(0xf0e6cc, true, true),
  milk: bottle(0xfdfdfb, 0x5a8ad8),
  premium_milk: sparkle(bottle(0xfff8e0, 0xd9a03a)),
  rich_goat_milk: sparkle(bottle(0xf0e2c0, 0x6a4a2a)),
  cream_buffalo_milk: sparkle(bottle(0xfff2d0, 0x2a2a2a)),
  angora_wool: sparkle(woolBall(0xfff0f4)),
  golden_wool: sparkle(woolBall(0xf6d870)),
  royal_alpaca_wool: sparkle(woolBall(0xd8b0f0)),
  goat_milk: bottle(0xf6f0e2, 0x8a6a4a),
  buffalo_milk: bottle(0xfaf7ef, 0x4a4a4a),
  rabbit_wool: woolBall(0xf6dde0),
  wool: woolBall(0xf8f6f0),
  alpaca_wool: woolBall(0xe8d2b0),
  truffle: (p) => {
    p.ellipse(8, 9, 6, 5, 0x5a3e2e).ellipse(7, 8, 4, 3, 0x6e4c38);
    for (const [x, y] of [[5, 8], [9, 7], [10, 11], [6, 11]]) p.px(x, y, 0x3a2820);
  },
  white_truffle: sparkle((p) => {
    p.ellipse(8, 9, 6, 5, 0xe8dcc4).ellipse(7, 8, 4, 3, 0xf6eedc);
    for (const [x, y] of [[5, 8], [9, 7], [10, 11], [6, 11]]) p.px(x, y, 0xb8a888);
  }),
  chicken_meat: meat(0xe8a888, true),
  duck_meat: meat(0xd88870, true),
  goose_meat: meat(0xdc9478, true),
  turkey_meat: meat(0xd08a6a, true),
  mutton: meat(0xd06a6a),
  goat_meat: meat(0xc86060),
  beef: meat(0xc84848),
  pork: meat(0xe88a8a),
  buffalo_meat: meat(0xb03c3c),
  ostrich_meat: meat(0xb85050),
  hay: (p) => {
    p.rect(2, 6, 12, 8, 0xe3c065).rect(2, 6, 12, 1, 0xf2d88a);
    for (let x = 3; x < 14; x += 2) p.line(x, 6, x - 1, 13, 0xc9a24a);
    p.rect(2, 9, 12, 1, 0xa0784e);
  },
  treat: (p) => {
    p.rect(4, 6, 8, 4, 0xe8c08a).circle(4, 6, 2, 0xe8c08a).circle(4, 10, 2, 0xe8c08a).circle(12, 6, 2, 0xe8c08a).circle(12, 10, 2, 0xe8c08a);
    p.px(7, 7, 0xd9342c).px(9, 8, 0xd9342c);
  },
  basic_fertilizer: bag(0x9a7a5a, 0x7cbf4a),
  growth_fertilizer: bag(0x5a9a5a, 0xf7d84a),
  premium_fertilizer: bag(0x5a6ab8, 0xf7d84a),
  special_fertilizer: bag(0xb85ab8, 0xffe066),
  compost: (p) => {
    p.ellipse(8, 11, 6, 4, 0x5e4026).ellipse(8, 9, 4, 3, 0x6e4c30);
    p.px(6, 8, 0x8ccf5a).px(10, 9, 0x8ccf5a).px(8, 7, 0x7a5434);
  },
  rotten: (p) => {
    p.ellipse(8, 11, 6, 4, 0x6a7050).ellipse(8, 10, 4, 3, 0x7a8058);
    p.px(5, 4, 0x2a2a2a).px(10, 3, 0x2a2a2a).px(12, 6, 0x2a2a2a).px(6, 9, 0x4a5038);
  },
  breed_charm: (p) => {
    p.rect(5, 2, 6, 12, 0xd9342c).rect(6, 3, 4, 10, 0xe8584a);
    p.rect(7, 5, 2, 6, 0xffe066).px(8, 1, 0xa0784e).px(8, 14, 0xffe066).px(7, 15, 0xffe066).px(9, 15, 0xffe066);
  },
  golden_feed: bag(0xe8b830, 0xfff0a0),
  // 가공품
  butter: (p) => {
    p.rect(3, 7, 10, 6, 0xf7e08a).rect(3, 5, 10, 2, 0xfff0b0).rect(3, 13, 10, 1, 0xd9b850);
    p.rect(2, 13, 12, 2, 0xc9d6e0);
  },
  cheese: cheese(0xf2c84a),
  goat_cheese: cheese(0xf6f0dc),
  mozzarella: (p) => {
    p.circle(8, 9, 5, 0xfbfaf4).px(6, 7, 0xffffff).ellipse(10, 11, 2, 1, 0xe8e4d8);
    p.rect(4, 2, 1, 4, LEAF).rect(5, 3, 2, 1, LEAF);
  },
  mayonnaise: jar(0xf6efc8),
  flour: sack(0xf2ece0, 0xe3c065),
  rice_flour: sack(0xf6f4ee, 0xf0e6b0),
  strawberry_jam: jar(0xd8343c),
  grape_jam: jar(0x6a2f8a),
  blueberry_jam: jar(0x3a4ab4),
  apple_jam: jar(0xd8743a),
  tangerine_jam: jar(0xf09a2c),
  pickle: jar(0x7aa83a),
  tomato_sauce: jar(0xd8342c),
  peanut_butter: jar(0xb8844a),
  sunflower_oil: bottle(0xf2d04a, 0xa0784e),
  pepper_powder: jar(0xc8342c, 0xf3e6c8),
  grape_juice: bottle(0x7a3f9a, 0xd9cfa8),
  truffle_oil: bottle(0xd9c070, 0x5a3e2e),
  dried_persimmon: (p) => {
    for (const [x, y] of [[5, 6], [10, 7], [7, 11]]) p.ellipse(x, y, 3, 2, 0xc8883a).px(x - 1, y - 1, 0xe8b060);
  },
  yarn: yarn(0xf6f0e4),
  angora_yarn: yarn(0xf6d6dc),
  alpaca_yarn: yarn(0xe0c49c),
  fabric: fabric(0xe8dccb),
  fine_fabric: fabric(0xc8a0d8),
  knit_scarf: (p) => {
    p.rect(3, 3, 4, 12, 0xe8586a).rect(3, 3, 10, 4, 0xe8586a);
    for (let y = 4; y < 15; y += 2) p.rect(3, y, 4, 1, 0xf6d6dc);
    p.rect(3, 14, 1, 2, 0xf6d6dc).rect(5, 14, 1, 2, 0xf6d6dc);
  },
  sausage: (p) => {
    for (const x of [4, 9]) p.ellipse(x, 8, 3, 5, 0xc0563a).px(x - 1, 6, 0xe0866a);
    p.line(6, 4, 8, 4, 0xe8d8b0);
  },
  ham: (p) => {
    p.ellipse(8, 9, 6, 5, 0xe08070).ellipse(8, 9, 3, 2, 0xf0a898).rect(12, 3, 2, 4, 0xf3ecdc);
  },
  bacon: (p) => {
    for (const y of [4, 9]) {
      p.rect(2, y, 12, 4, 0xd8605a);
      p.line(2, y + 1, 13, y + 2, 0xf6d6cc);
    }
  },
  beef_jerky: (p) => {
    p.tri(3, 3, 13, 6, 5, 14, 0x7a2e24).line(5, 6, 10, 8, 0x9a4a3a);
  },
  smoked_chicken: meat(0xb06a3a, true),
  smoked_duck: meat(0x9a5a34, true),
  // 요리
  bread: loaf(0xd89a50),
  potato_pancake: plate(0xe8c060, 0x7cbf4a),
  kimchi: bowl(0xd84a2c, 0xf0d8a0),
  winter_kimchi: bowl(0xc84a3c, 0xe8f0d8),
  bibimbap: bowl(0xf6f0e0, 0xe8742c, 0x4f9a3a),
  pumpkin_porridge: bowl(0xf0a83a, undefined, 0x7a4a24),
  strawberry_cake: (p) => {
    p.tri(2, 13, 14, 13, 14, 6, 0xfaf0e6).rect(2, 13, 13, 2, 0xe8c08a).line(2, 13, 14, 6, 0xf6b8c4);
    p.circle(12, 5, 2, 0xd8343c).px(12, 3, LEAF);
  },
  omelette: plate(0xf7d84a, undefined, 0xd8342c),
  tomato_pasta: plate(0xf0d08a, 0xd8342c, 0x4f9a3a),
  roasted_sweetpotato: (p) => {
    p.ellipse(8, 9, 6, 4, 0x8a3a5a).ellipse(9, 8, 3, 2, 0xf2b84a).px(4, 10, 0x2a2a2a).px(12, 11, 0x2a2a2a);
  },
  watermelon_punch: bowl(0xf6a0a8, 0xd8343c, 0xffffff),
  cheese_pizza: (p) => {
    p.circle(8, 8, 7, 0xe8b860).circle(8, 8, 5, 0xf2d070);
    for (const [x, y] of [[6, 6], [10, 7], [7, 10], [11, 11]]) p.circle(x, y, 1, 0xd8342c);
  },
  corn_soup: bowl(0xf2d04a, 0xf7e08a, 0x4f9a3a),
  apple_pie: (p) => {
    p.ellipse(8, 10, 7, 4, 0xd89a50).ellipse(8, 9, 5, 3, 0xe8b468);
    for (let x = 4; x < 13; x += 3) p.line(x, 7, x + 1, 11, 0xc08040);
  },
  steak: plate(0x8a3a2a, 0xf2d04a, 0x4f9a3a),
  pork_wrap: plate(0x7cbf4a, 0xe88a8a, 0xf6f0e0),
  salad: bowl(0x7cbf4a, 0xd8342c, 0x8ccf5a),
  curry_rice: plate(0xd8a030, 0xf6f0e0, 0xe8742c),
  pea_soup: bowl(0x8ccf5a, 0xb8e08a),
  broccoli_gratin: plate(0xf2c860, 0x3f8a3a),
  rice_cake: (p) => {
    for (const [x, y] of [[5, 9], [11, 9], [8, 6]]) p.ellipse(x, y, 3, 2, 0xf6e8f0).px(x - 1, y - 1, 0xffffff);
    p.ellipse(8, 12, 6, 2, 0x8ccf5a);
  },
  radish_soup: bowl(0xd8b890, 0xf3f0e6, 0x4f9a3a),
  tangerine_tart: (p) => {
    p.ellipse(8, 10, 7, 4, 0xd89a50).ellipse(8, 9, 5, 3, 0xf09a2c).px(6, 8, 0xffd08a);
  },
  truffle_risotto: plate(0xf0e6c8, 0x5a3e2e),
  ostrich_omelette: plate(0xf2c84a, 0xf7e08a, 0x4f9a3a),
  grilled_fish: (p) => {
    p.ellipse(8, 11, 7, 3, 0xf6f2ea).ellipse(8, 9, 5, 2, 0xb8743a).tri(2, 7, 2, 11, 4, 9, 0x9a5a2a).px(11, 8, 0x1a1a1a).line(5, 8, 10, 10, 0x6a3a1a);
  },
  spicy_fish_stew: bowl(0xd8442c, 0xf2e6c8, 0x4f9a3a),
  fish_rice_bowl: bowl(0xf6f0e0, 0xe8946a, 0x4f9a3a),
  eel_rice: bowl(0xf6f0e0, 0x7a4a2a, 0xf2c83a),
  mushroom_soup: bowl(0xe8d8b8, 0x8a5a3a),
  mushroom_rice: bowl(0xf6f0e0, 0x8a5a3a, 0x4f9a3a),
  roasted_chestnut: (p) => {
    for (const [x, y] of [[5, 9], [10, 8], [8, 12]]) p.ellipse(x, y, 3, 3, 0x6a3a1a).px(x, y - 1, 0xf2c87a);
  },
  acorn_jelly: plate(0x8a6a4a, 0x6a4a2a, 0x4f9a3a),
  clam_soup: bowl(0xf0ead8, 0xd8c8b8, 0x4f9a3a),
  fern_bibim: bowl(0xf6f0e0, 0x7cbf4a, 0xf2c83a),
  wild_berry_jam: jar(0xc82c4a),
  herbal_tea: bottle(0xa8b85a, 0x6a8a3a),
  maple_syrup: bottle(0xc8782a, 0x8a4a1a),
  brick: (p) => {
    p.rect(2, 6, 12, 7, 0xb8583a).line(2, 9, 13, 9, 0x7a3a2a).line(8, 6, 8, 9, 0x7a3a2a).line(5, 9, 5, 12, 0x7a3a2a).line(11, 9, 11, 12, 0x7a3a2a);
  },
  smoked_fish: (p) => {
    p.ellipse(8, 9, 6, 3, 0x9a5a2a).tri(1, 6, 1, 12, 4, 9, 0x7a3a1a).px(12, 8, 0x1a1a1a).line(3, 10, 13, 9, 0x6a3a1a);
  },
  rare_bait: (p) => {
    p.line(8, 1, 8, 6, 0x8a96a4).ellipse(8, 10, 3, 4, 0xe86a8a).ellipse(7, 9, 1, 2, 0xffb0c8).px(10, 12, 0xffe066).px(5, 13, 0xffe066);
  },
};

// ───────────── UI 아이콘 ─────────────
const UI: Record<string, IconFn> = {
  ic_sunny: (p) => {
    p.circle(8, 8, 4, 0xf7c834).px(7, 7, 0xfff0a0);
    for (let a = 0; a < 8; a++) p.px(8 + Math.round(Math.cos((a * Math.PI) / 4) * 7), 8 + Math.round(Math.sin((a * Math.PI) / 4) * 7), 0xf7a834);
  },
  ic_cloudy: (p) => {
    p.circle(5, 9, 3, 0xdfe6ee).circle(9, 7, 4, 0xeef2f6).circle(12, 10, 3, 0xdfe6ee).rect(4, 10, 9, 3, 0xeef2f6);
  },
  ic_rain: (p) => {
    p.circle(5, 6, 3, 0xb8c4d0).circle(9, 5, 4, 0xc8d2dc).circle(12, 7, 3, 0xb8c4d0).rect(4, 7, 9, 2, 0xc8d2dc);
    for (const x of [4, 8, 12]) p.line(x, 11, x - 1, 14, 0x4a8ad8);
  },
  ic_storm: (p) => {
    p.circle(5, 6, 3, 0x8a96a4).circle(9, 5, 4, 0x9aa6b4).circle(12, 7, 3, 0x8a96a4).rect(4, 7, 9, 2, 0x9aa6b4);
    p.line(8, 9, 6, 12, 0xf7d84a).line(6, 12, 9, 12, 0xf7d84a).line(9, 12, 7, 15, 0xf7d84a);
    p.line(3, 11, 2, 14, 0x4a8ad8).line(13, 11, 12, 14, 0x4a8ad8);
  },
  ic_snow: (p) => {
    p.line(8, 2, 8, 14, 0xa8d0f0).line(2, 8, 14, 8, 0xa8d0f0).line(4, 4, 12, 12, 0xa8d0f0).line(12, 4, 4, 12, 0xa8d0f0);
    p.circle(8, 8, 1, 0xffffff);
  },
  ic_moon: (p) => {
    p.circle(8, 8, 6, 0xf6e6a0).circle(11, 6, 5, 0x000000, 0);
    p.ctx.globalCompositeOperation = 'destination-out';
    p.circle(11, 6, 5, 0x000000);
    p.ctx.globalCompositeOperation = 'source-over';
    p.px(5, 9, 0xe8d080);
  },
  ic_drop: (p) => {
    p.tri(8, 1, 3, 9, 13, 9, 0x5aa8f0).circle(8, 10, 5, 0x5aa8f0).circle(7, 9, 3, 0x7ac0f8).px(6, 8, 0xffffff).px(6, 9, 0xffffff);
  },
  ic_coin: (p) => {
    p.circle(8, 8, 6, 0xd9a020).circle(8, 8, 5, 0xf2c83a).rect(7, 5, 2, 6, 0xd9a020).px(6, 5, 0xfff0a0).px(5, 6, 0xfff0a0);
  },
  ic_farming: (p) => {
    p.ellipse(8, 13, 5, 2, 0x7a5034).rect(8, 6, 1, 7, 0x3f8f3a);
    p.ellipse(5, 6, 3, 2, 0x5aa83c).ellipse(11, 5, 3, 2, 0x7cbf4a);
  },
  ic_livestock: (p) => {
    p.ellipse(8, 9, 6, 5, 0xf7f4ee).ellipse(5, 7, 2, 2, 0x2e2a2a).ellipse(11, 11, 2, 1, 0x2e2a2a);
    p.ellipse(8, 12, 3, 2, 0xf0a8a8).px(7, 12, 0x8a5a5a).px(9, 12, 0x8a5a5a);
    p.rect(2, 4, 2, 2, 0xe8d8b0).rect(12, 4, 2, 2, 0xe8d8b0);
  },
  ic_house: (p) => {
    p.tri(1, 8, 15, 8, 8, 1, 0xc8423a).rect(3, 8, 10, 7, 0xf2e2c4).rect(7, 10, 3, 5, 0x8a5a3a).rect(4, 10, 2, 2, 0x8ac8f0);
  },
  ic_merchant: (p) => {
    p.rect(2, 6, 12, 6, 0xb8844a).rect(2, 5, 12, 1, 0xd8a868).circle(5, 13, 2, 0x5a3e2e).circle(11, 13, 2, 0x5a3e2e);
    p.tri(1, 6, 15, 6, 8, 1, 0xe8584a).px(8, 3, 0xffffff);
  },
  ic_build: (p) => {
    p.line(3, 13, 10, 6, 0x8a5a3a).line(4, 13, 11, 6, 0xa0784e);
    p.rect(9, 2, 6, 4, 0x8a96a4).rect(9, 2, 6, 1, 0xc8d2dc);
  },
  ic_bag: (p) => {
    p.ellipse(8, 10, 6, 5, 0xb8844a).rect(4, 5, 8, 3, 0xa0703a).rect(6, 3, 4, 2, 0x8a5a3a).rect(7, 9, 2, 2, 0xf2c83a);
  },
  ic_menu: (p) => {
    for (const y of [4, 8, 12]) p.rect(3, y - 1, 10, 2, 0xf6efe0);
  },
  ic_research: (p) => {
    p.rect(3, 3, 10, 11, 0x5a8ad8).rect(4, 4, 8, 9, 0xf6efe0).rect(3, 3, 1, 11, 0x3a5a98);
    p.line(6, 6, 10, 6, 0x8a96a4).line(6, 8, 10, 8, 0x8a96a4).line(6, 10, 9, 10, 0x8a96a4);
  },
  ic_warn: (p) => {
    p.tri(8, 1, 15, 14, 1, 14, 0xf2c83a).rect(7, 5, 2, 5, 0x3b2a22).rect(7, 11, 2, 2, 0x3b2a22);
  },
  ic_star: (p) => {
    p.tri(8, 1, 11, 7, 5, 7, 0xf7d84a).tri(2, 6, 14, 6, 8, 11, 0xf7d84a).tri(8, 9, 3, 15, 5, 8, 0xf7d84a).tri(8, 9, 13, 15, 11, 8, 0xf7d84a);
  },
  ic_auto: (p) => {
    p.circle(8, 8, 5, 0x8a96a4).circle(8, 8, 2, 0x3b2a22);
    for (let a = 0; a < 8; a++) p.rect(8 + Math.round(Math.cos((a * Math.PI) / 4) * 6) - 1, 8 + Math.round(Math.sin((a * Math.PI) / 4) * 6) - 1, 2, 2, 0x8a96a4);
  },
  ic_meat: meat(0xc84848),
  ic_spring: (p) => {
    p.circle(8, 8, 3, 0xf7d84a);
    for (let a = 0; a < 5; a++) p.circle(8 + Math.round(Math.cos(a * 1.26) * 4), 8 + Math.round(Math.sin(a * 1.26) * 4), 2, 0xf7a8c4);
    p.circle(8, 8, 2, 0xf7d84a);
  },
  ic_summer: (p) => UI.ic_sunny(p),
  ic_autumn: (p) => {
    p.tri(8, 1, 14, 9, 2, 9, 0xe0822f).tri(4, 7, 12, 7, 8, 14, 0xd06a24).line(8, 4, 8, 15, 0x8a4a1e);
  },
  ic_winter: (p) => UI.ic_snow(p),
  ic_heart: (p) => {
    p.circle(5, 6, 3, 0xe8586a).circle(11, 6, 3, 0xe8586a).tri(2, 7, 14, 7, 8, 14, 0xe8586a).px(4, 5, 0xffb0bc);
  },
  ic_happy: (p) => {
    p.circle(8, 8, 6, 0xf6c84a).px(6, 6, 0x3b2a22).px(10, 6, 0x3b2a22).px(5, 9, 0x3b2a22).line(6, 10, 10, 10, 0x3b2a22).px(11, 9, 0x3b2a22).px(4, 5, 0xfff0a0);
  },
  ic_male: (p) => {
    p.circle(6, 10, 4, 0x4a8ad8).circle(6, 10, 2, 0x000000, 0);
    p.ctx.globalCompositeOperation = 'destination-out';
    p.circle(6, 10, 2, 0);
    p.ctx.globalCompositeOperation = 'source-over';
    p.line(9, 7, 13, 3, 0x4a8ad8).rect(10, 2, 4, 2, 0x4a8ad8).rect(12, 2, 2, 4, 0x4a8ad8);
  },
  ic_female: (p) => {
    p.circle(8, 6, 4, 0xe8586a);
    p.ctx.globalCompositeOperation = 'destination-out';
    p.circle(8, 6, 2, 0);
    p.ctx.globalCompositeOperation = 'source-over';
    p.rect(7, 10, 2, 5, 0xe8586a).rect(5, 12, 6, 2, 0xe8586a);
  },
  ic_pause: (p) => {
    p.rect(4, 3, 3, 10, 0xf6efe0).rect(9, 3, 3, 10, 0xf6efe0);
  },
  ic_gear: (p) => UI.ic_auto(p),
  ic_codex: (p) => {
    p.rect(2, 3, 12, 11, 0x8a4a2e).rect(3, 4, 5, 9, 0xf6efe0).rect(8, 4, 5, 9, 0xf6efe0).rect(8, 3, 1, 11, 0x5a3020);
    p.line(4, 6, 6, 6, 0x8a96a4).line(10, 6, 12, 6, 0x8a96a4);
  },
  ic_chart: (p) => {
    p.rect(2, 13, 12, 1, 0x3b2a22).rect(3, 9, 2, 4, 0x5aa83c).rect(7, 6, 2, 7, 0xf2c83a).rect(11, 3, 2, 10, 0xe8584a);
  },
  ic_clock: (p) => {
    p.circle(8, 8, 6, 0xf6efe0).line(8, 8, 8, 4, 0x3b2a22).line(8, 8, 11, 9, 0x3b2a22);
  },
  ic_close: (p) => {
    p.line(3, 3, 12, 12, 0xffffff).line(4, 3, 13, 12, 0xffffff).line(12, 3, 3, 12, 0xffffff).line(13, 3, 4, 12, 0xffffff);
  },
  ic_land: (p) => {
    p.rect(2, 4, 12, 10, 0x8cc35a).frame(2, 4, 12, 10, 0x5a8a3a).line(8, 4, 8, 13, 0x5a8a3a).line(2, 9, 13, 9, 0x5a8a3a);
    p.rect(12, 1, 3, 3, 0xf7d84a);
  },
  ic_breed: (p) => UI.ic_heart(p),
  ic_ticket: (p) => {
    p.rect(1, 4, 14, 8, 0xf2c83a).rect(1, 4, 14, 1, 0xfff0a0).circle(1, 8, 1, 0xf6efe0).circle(15, 8, 1, 0xf6efe0).line(5, 5, 5, 11, 0xd9a020).rect(8, 6, 5, 1, 0x8a5a20).rect(8, 9, 4, 1, 0x8a5a20).px(3, 7, 0x5aa83c).px(3, 8, 0x5aa83c);
  },
  ic_mine: (p) => {
    p.rect(2, 4, 12, 11, 0x2a2428).rect(1, 3, 2, 12, 0x8a5a34).rect(13, 3, 2, 12, 0x8a5a34).rect(1, 2, 14, 2, 0xa0703a).rect(5, 11, 6, 1, 0x8a8a90).circle(8, 8, 1, 0xf2c83a);
  },
  ic_storage: (p) => {
    p.rect(2, 5, 12, 9, 0xb8844a).rect(2, 5, 12, 3, 0xa0703a).rect(7, 7, 2, 3, 0xf2c83a).frame(2, 5, 12, 9, 0x6a4a2e);
  },
  ic_process: (p) => {
    p.rect(3, 6, 10, 8, 0xc8b8a0).tri(2, 6, 14, 6, 8, 2, 0x8a5a3a).rect(11, 1, 2, 5, 0x8a8a8a).rect(6, 9, 4, 5, 0x5a3e2e);
  },
  ic_cook: (p) => {
    p.ellipse(8, 10, 6, 3, 0x5a5a62).rect(2, 8, 12, 3, 0x6a6a72).rect(14, 8, 2, 1, 0x3b2a22);
    p.line(6, 2, 5, 6, 0xdfe6ee).line(9, 2, 10, 6, 0xdfe6ee);
  },
  ic_save: (p) => {
    p.rect(2, 2, 12, 12, 0x5a8ad8).rect(4, 2, 7, 4, 0xdfe6ee).rect(4, 9, 8, 5, 0xf6efe0).rect(9, 3, 1, 2, 0x3a5a98);
  },
  ic_blueprint: (p) => {
    p.rect(2, 2, 12, 12, 0x3a6ab8).frame(2, 2, 12, 12, 0xdfe6ee);
    for (let i = 5; i < 14; i += 3) p.line(i, 3, i, 12, 0x6a9ad8).line(3, i, 12, i, 0x6a9ad8);
    p.rect(5, 5, 4, 4, 0xffffff, 0.6);
  },
  ic_deco: (p) => {
    p.circle(8, 5, 3, 0xf7a8c4).circle(8, 5, 1, 0xf7d84a).rect(8, 8, 1, 4, 0x3f8f3a).rect(5, 12, 7, 3, 0xc8743a);
  },
  ic_tutorial: (p) => UI.ic_star(p),
  // 도구
  tool_hand: (p) => {
    p.rect(4, 6, 8, 8, 0xf2c8a0).rect(4, 2, 2, 6, 0xf2c8a0).rect(7, 1, 2, 6, 0xf2c8a0).rect(10, 2, 2, 6, 0xf2c8a0).rect(12, 7, 2, 4, 0xf2c8a0);
    p.line(5, 13, 11, 13, 0xd8a880);
  },
  tool_hoe: (p) => {
    p.line(3, 14, 11, 4, 0x8a5a3a).line(4, 14, 12, 4, 0xa0784e);
    p.rect(9, 2, 6, 3, 0x8a96a4).rect(13, 2, 2, 5, 0x8a96a4).px(10, 2, 0xc8d2dc);
  },
  tool_water: (p) => {
    p.rect(3, 6, 8, 7, 0x6a9ad8).rect(3, 6, 8, 2, 0x8ab8e8).line(11, 8, 14, 5, 0x6a9ad8).line(11, 9, 14, 6, 0x5a8ac8);
    p.line(5, 6, 6, 3, 0x5a8ac8).line(6, 3, 9, 3, 0x5a8ac8).line(9, 3, 10, 6, 0x5a8ac8);
    p.px(15, 6, 0x8ac8f0).px(15, 8, 0x8ac8f0);
  },
  tool_seed: (p) => {
    p.ellipse(8, 10, 5, 4, 0xd9b878).rect(5, 4, 6, 3, 0xc9a060).rect(6, 3, 4, 1, 0xa0784e);
    p.px(7, 10, 0x6a4a2a).px(9, 9, 0x6a4a2a).px(8, 12, 0x6a4a2a);
  },
  tool_fertilizer: bag(0x5a9a5a, 0xf7d84a),
  tool_feed: (p) => OTHER.hay(p),
  tool_shovel: (p) => {
    p.line(4, 12, 12, 3, 0x8a5a3a).ellipse(4, 12, 3, 3, 0x8a96a4).px(3, 11, 0xc8d2dc).rect(11, 1, 4, 2, 0x8a5a3a);
  },
  tool_axe: (p) => {
    p.line(4, 14, 11, 3, 0x8a5a3a).line(5, 14, 12, 3, 0xa0784e);
    p.tri(9, 2, 15, 3, 13, 9, 0x8a96a4).tri(9, 2, 13, 9, 10, 6, 0xc8d2dc);
  },
  tool_pickaxe: (p) => {
    p.line(3, 14, 11, 4, 0x8a5a3a).line(4, 14, 12, 4, 0xa0784e);
    p.line(5, 3, 14, 6, 0x8a96a4).line(5, 2, 14, 5, 0xc8d2dc).px(4, 4, 0x8a96a4).px(15, 7, 0x8a96a4);
  },
  tool_rod: (p) => {
    p.line(2, 15, 13, 1, 0x8a5a3a).line(3, 15, 14, 1, 0xa0784e).line(14, 1, 14, 11, 0xd8d8d8).circle(14, 12, 1, 0xe8584a).rect(3, 12, 2, 2, 0x4a4a52);
  },
  ic_fish: (p) => {
    p.ellipse(8, 8, 6, 3, 0x6a9ad8).ellipse(8, 9, 5, 1, 0xd8e8f6).tri(1, 4, 1, 12, 4, 8, 0x4a7ab8).px(12, 7, 0x1a1a1a);
  },
  ic_forage: (p) => {
    p.rect(7, 9, 3, 6, 0xf0e6d0).ellipse(8, 8, 6, 4, 0x8a5a3a).ellipse(6, 6, 2, 1, 0xb88a6a).ellipse(13, 13, 2, 2, 0xe8424a);
  },
  ic_region: (p) => {
    p.rect(2, 9, 12, 6, 0x8cc35a).tri(1, 10, 7, 2, 12, 10, 0x8a958c).tri(6, 10, 11, 4, 15, 10, 0x6a756c).rect(1, 12, 14, 2, 0x5a9ad8).rect(7, 6, 2, 4, 0xffffff);
  },
  ic_farm: (p) => UI.ic_house(p),
  tool_area: (p) => {
    for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) p.rect(2 + x * 4, 2 + y * 4, 3, 3, 0x8cc35a);
    p.frame(1, 1, 14, 14, 0xf6efe0);
  },
};

export interface IconEntry {
  key: string;
  canvas: HTMLCanvasElement;
}

function render(key: string, fn: IconFn, outline = true): IconEntry {
  const p = new Painter(S, S);
  fn(p);
  if (outline) p.outline(OL);
  return { key, canvas: p.canvas };
}

export function buildIcons(): IconEntry[] {
  const out: IconEntry[] = [];
  for (const c of CROPS) {
    out.push(render(`it_${c.id}`, cropIcon(c)));
    out.push(render(`it_seed_${c.id}`, seedIcon(c)));
  }
  for (const f of FISH) out.push(render(`it_${f.id}`, fishIcon(f)));
  for (const b of INSECTS) out.push(render(`bug_${b.id}`, bugIcon(b)));
  for (const sp of SPIRITS)
    out.push(
      render(`spirit_${sp.id}`, (p) => {
        p.circle(8, 9, 6, sp.glow, 0.45).ellipse(8, 9, 4, 5, sp.color).circle(8, 6, 3, sp.color).px(7, 6, 0x2a2a3a).px(9, 6, 0x2a2a3a).px(6, 4, 0xffffff).px(12, 3, sp.glow).px(3, 12, sp.glow).px(13, 12, sp.glow);
        if (sp.parents) p.px(8, 2, 0xfff6a0).px(7, 1, 0xfff6a0).px(9, 1, 0xfff6a0);
      }),
    );
  for (const f of POND_FISH)
    out.push(
      render(`it_roe_${f.id}`, (p) => {
        p.ellipse(8, 11, 6, 3, 0xe8dcc4).ellipse(8, 10, 5, 2, 0xf6efe0);
        for (const [x, y] of [[5, 8], [8, 7], [11, 8], [6, 10], [9, 10], [12, 10], [7, 5], [10, 5]]) p.circle(x, y, 1, f.art.fin).px(x, y - 1, 0xffffff);
      }),
    );
  for (const f of FORAGE) out.push(render(`it_${f.id}`, forageIcon(f)));
  for (const r of RESOURCES) out.push(render(`it_${r.id}`, resourceIcon(r)));
  const done = new Set(out.map((o) => o.key));
  for (const it of ITEMS) {
    if (it.category === 'seed' || CROP_BY_ID[it.id] || done.has(it.icon)) continue;
    const fn = OTHER[it.id] ?? ((p: Painter) => p.circle(8, 8, 5, 0xc8a0d8));
    out.push(render(it.icon, fn));
  }
  for (const [k, fn] of Object.entries(UI)) out.push(render(k, fn, !k.startsWith('ic_close') && k !== 'ic_menu' && k !== 'ic_pause'));
  return out;
}
