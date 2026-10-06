/** 외곽 지역 노드(나무·바위·상자·표지판) 픽셀아트 */
import { ROCKS } from '../../data/gathering';
import { Painter, shade, type Color } from '../painter';

const SEASON_LEAF: { leaf: Color; dark: Color; light: Color; snow?: boolean }[] = [
  { leaf: 0x4f9a46, dark: 0x3a7a3a, light: 0x74bf5a },
  { leaf: 0x3f8a3c, dark: 0x2e6a32, light: 0x62ad4a },
  { leaf: 0xd9822f, dark: 0xa8521e, light: 0xf0b04a },
  { leaf: 0x4a7a5a, dark: 0x355a46, light: 0xf4f8fb, snow: true },
];

function tree(big: boolean, s: number): Painter {
  const W = big ? 48 : 32;
  const H = big ? 72 : 48;
  const p = new Painter(W, H);
  const pal = SEASON_LEAF[s];
  const cx = W / 2;
  p.shadow(cx, H - 3, big ? 16 : 10, 3, 0.28);
  p.rect(cx - (big ? 4 : 2), H - (big ? 26 : 18), big ? 8 : 5, big ? 24 : 16, 0x7a5236).rect(cx - (big ? 4 : 2), H - (big ? 26 : 18), 2, big ? 24 : 16, 0x94683f);
  const r = big ? 20 : 13;
  const cy = H - (big ? 40 : 28);
  p.ellipse(cx, cy, r, r - 3, pal.dark).ellipse(cx - 1, cy - 1, r - 2, r - 5, pal.leaf).ellipse(cx - r / 2, cy - r / 2, r / 3, r / 4, pal.light, 0.9);
  for (let i = 0; i < (big ? 14 : 8); i++) p.px(cx - r + ((i * 7) % (r * 2)), cy - r / 2 + ((i * 5) % r), pal.dark);
  if (pal.snow) p.ellipse(cx - 2, cy - r + 6, r - 4, 4, 0xffffff);
  p.outline(0x2f3a24);
  return p;
}

/** 아래층으로 내려가는 구멍 + 사다리 */
function ladder(): Painter {
  const p = new Painter(32, 32);
  p.ellipse(16, 20, 13, 9, 0x1a1418).ellipse(16, 19, 11, 7, 0x0e0a0c);
  p.rect(10, 6, 2, 20, 0x9a6a3a).rect(20, 6, 2, 20, 0x9a6a3a);
  for (let y = 8; y < 26; y += 4) p.rect(10, y, 12, 2, 0xc8945a);
  p.outline(0x1a1418);
  return p;
}

/** 광산 입구 (나무 틀) */
function mineEntry(): Painter {
  const p = new Painter(32, 40);
  p.rect(4, 8, 24, 30, 0x1a1418).rect(2, 6, 4, 32, 0x8a5a34).rect(26, 6, 4, 32, 0x8a5a34).rect(2, 4, 28, 5, 0xa0703a);
  p.rect(8, 30, 16, 2, 0x6a6a70).rect(8, 34, 16, 2, 0x6a6a70);
  p.outline(0x2a1a10);
  return p;
}

function stump(): Painter {
  const p = new Painter(32, 32);
  p.shadow(16, 27, 9, 3, 0.25);
  p.rect(9, 17, 14, 9, 0x7a5236).ellipse(16, 17, 7, 3, 0xc8945a).ellipse(16, 17, 4, 2, 0xa8743a).px(16, 17, 0x7a5236);
  p.outline(0x3b2a22);
  return p;
}

function rock(color: Color, ore?: Color): Painter {
  const p = new Painter(32, 32);
  p.shadow(16, 27, 12, 3, 0.28);
  p.ellipse(16, 20, 12, 8, shade(color, -0.15)).ellipse(15, 18, 11, 7, color).ellipse(12, 15, 4, 2, shade(color, 0.25));
  if (ore) for (const [x, y] of [[11, 19], [18, 16], [20, 22], [14, 23], [22, 18]] as [number, number][]) p.rect(x, y, 3, 2, ore).px(x, y, shade(ore, 0.4));
  p.outline(0x3b3530);
  return p;
}

function clayMound(): Painter {
  const p = new Painter(32, 32);
  p.shadow(16, 27, 12, 3, 0.25);
  p.ellipse(16, 21, 12, 6, 0xa8643a).ellipse(15, 19, 10, 5, 0xc8845a).ellipse(12, 17, 3, 2, 0xe0a07a);
  p.outline(0x5a3420);
  return p;
}

function chest(): Painter {
  const p = new Painter(32, 32);
  p.shadow(16, 27, 11, 3, 0.25);
  p.rect(6, 13, 20, 13, 0x8a5a34).rect(6, 13, 20, 5, 0x6a4024).rect(6, 18, 20, 1, 0x4a2a18);
  p.rect(5, 12, 22, 2, 0x5a3a22).rect(14, 16, 4, 5, 0xc8a050).px(15, 18, 0x4a2a18);
  p.speckle(6, 13, 20, 13, 0x5a7a3a, 0.08, 5); // 이끼
  p.px(26, 9, 0xffe066).px(27, 8, 0xffffff).px(5, 10, 0xffe066);
  p.outline(0x2a1a10);
  return p;
}

function forageBase(): Painter {
  const p = new Painter(32, 32);
  p.ellipse(16, 25, 10, 3, 0x000000, 0.18);
  for (const [x, y] of [[9, 24], [13, 22], [19, 23], [23, 25], [16, 26]] as [number, number][]) p.line(x, y + 3, x + 1, y - 2, 0x4f8a3a).px(x + 1, y - 2, 0x7cbf4a);
  return p;
}

function exitSign(): Painter {
  const p = new Painter(32, 44);
  p.shadow(16, 41, 7, 2, 0.25);
  p.rect(15, 14, 3, 27, 0x8a5a3a);
  p.rect(3, 8, 24, 9, 0xc8945a).tri(27, 8, 31, 12, 27, 17, 0xc8945a).frame(3, 8, 24, 9, 0x6a4a2e);
  p.rect(5, 19, 22, 8, 0xb8844a).tri(5, 19, 1, 23, 5, 27, 0xb8844a);
  p.line(7, 12, 22, 12, 0x6a4a2e).line(9, 23, 24, 23, 0x6a4a2e);
  p.outline(0x3b2a22);
  return p;
}

export function buildNodeTextures(): { key: string; canvas: HTMLCanvasElement }[] {
  const out: { key: string; canvas: HTMLCanvasElement }[] = [];
  for (let s = 0; s < 4; s++) {
    out.push({ key: `node_tree_big_${s}`, canvas: tree(true, s).canvas });
    out.push({ key: `node_tree_small_${s}`, canvas: tree(false, s).canvas });
  }
  out.push({ key: 'node_stump', canvas: stump().canvas });
  out.push({ key: 'node_ladder', canvas: ladder().canvas });
  out.push({ key: 'node_mine_entry', canvas: mineEntry().canvas });
  for (const r of ROCKS) out.push({ key: `node_${r.id}`, canvas: (r.id === 'rock_clay' ? clayMound() : rock(r.color, r.color2)).canvas });
  out.push({ key: 'node_chest', canvas: chest().canvas });
  out.push({ key: 'node_forage', canvas: forageBase().canvas });
  out.push({ key: 'node_exit', canvas: exitSign().canvas });
  return out;
}
