/**
 * 캐릭터/동물 픽셀아트.
 * 플레이어 시트: [down0,down1,down2, up0,up1,up2, side0,side1,side2] (side = 오른쪽, 왼쪽은 flipX)
 */
import { ANIMALS, type AnimalData } from '../../data/animals';
import { Painter, shade, sheet, type Color } from '../painter';

export const CHAR_W = 24;
export const CHAR_H = 32;

interface Outfit {
  skin: Color;
  hair: Color;
  shirt: Color;
  pants: Color;
  hat: Color;
  hatBand: Color;
  shoes: Color;
  pack?: Color;
}

const FARMER: Outfit = { skin: 0xf2c8a0, hair: 0x7a4a2a, shirt: 0xe8e0d0, pants: 0x4a6ab8, hat: 0xe3c065, hatBand: 0xc8423a, shoes: 0x5a3e2e };
const MERCHANT: Outfit = { skin: 0xeec09a, hair: 0x4a3a2e, shirt: 0x6a8a4a, pants: 0x5a4a3a, hat: 0x6a5a4a, hatBand: 0xc8a050, shoes: 0x3b2a22, pack: 0xb8844a };
const SPECIAL: Outfit = { skin: 0xeec09a, hair: 0xf2f0e8, shirt: 0x6a3a8a, pants: 0x3a2a5a, hat: 0x4a2a6a, hatBand: 0xe8b830, shoes: 0x2a1a2a, pack: 0xc8a050 };

function person(o: Outfit, dir: 'down' | 'up' | 'side', step: number): Painter {
  const p = new Painter(CHAR_W, CHAR_H);
  const cx = 12;
  const legOff = step === 0 ? 0 : step === 1 ? 1 : -1;
  p.shadow(cx, 30, 7, 2, 0.25);
  // 다리
  if (dir === 'side') {
    p.rect(cx - 2 + legOff, 23, 3, 6, o.pants).rect(cx - 2 - legOff, 23, 3, 6, shade(o.pants, -0.15));
    p.rect(cx - 2 + legOff, 28, 4, 2, o.shoes).rect(cx - 2 - legOff, 28, 4, 2, o.shoes);
  } else {
    p.rect(cx - 4, 23, 3, 6 + (step === 1 ? -1 : 0), o.pants).rect(cx + 1, 23, 3, 6 + (step === 2 ? -1 : 0), o.pants);
    p.rect(cx - 4, 28 + (step === 1 ? -1 : 0), 3, 2, o.shoes).rect(cx + 1, 28 + (step === 2 ? -1 : 0), 3, 2, o.shoes);
  }
  // 몸통 (멜빵바지)
  p.rect(cx - 5, 15, 10, 9, o.shirt);
  p.rect(cx - 4, 18, 8, 6, o.pants);
  if (dir === 'down') p.rect(cx - 4, 15, 1, 4, o.pants).rect(cx + 3, 15, 1, 4, o.pants).px(cx - 4, 18, 0xf2c83a).px(cx + 3, 18, 0xf2c83a);
  // 팔
  if (dir === 'side') p.rect(cx - 1 - legOff, 16, 3, 6, o.shirt).rect(cx - 1 - legOff, 21, 3, 2, o.skin);
  else {
    p.rect(cx - 7, 16 + (step === 2 ? 1 : 0), 2, 6, o.shirt).rect(cx + 5, 16 + (step === 1 ? 1 : 0), 2, 6, o.shirt);
    p.rect(cx - 7, 21 + (step === 2 ? 1 : 0), 2, 2, o.skin).rect(cx + 5, 21 + (step === 1 ? 1 : 0), 2, 2, o.skin);
  }
  if (o.pack && dir !== 'down') p.rect(dir === 'side' ? cx - 7 : cx - 5, 14, dir === 'side' ? 4 : 10, 9, o.pack).rect(dir === 'side' ? cx - 7 : cx - 5, 14, dir === 'side' ? 4 : 10, 2, shade(o.pack, 0.2));
  // 머리
  p.rect(cx - 5, 6, 10, 9, o.skin);
  if (dir === 'down') {
    p.rect(cx - 5, 6, 10, 3, o.hair).px(cx - 5, 9, o.hair).px(cx + 4, 9, o.hair);
    p.rect(cx - 3, 10, 2, 2, 0x3b2a22).rect(cx + 1, 10, 2, 2, 0x3b2a22).px(cx - 3, 10, 0xffffff).px(cx + 1, 10, 0xffffff);
    p.rect(cx - 4, 12, 2, 1, 0xf0a0a0).rect(cx + 2, 12, 2, 1, 0xf0a0a0);
    p.rect(cx - 1, 13, 2, 1, 0xa05a4a);
  } else if (dir === 'up') {
    p.rect(cx - 5, 6, 10, 8, o.hair);
  } else {
    p.rect(cx - 5, 6, 10, 3, o.hair).rect(cx - 5, 6, 4, 7, o.hair);
    p.rect(cx + 2, 10, 2, 2, 0x3b2a22).px(cx + 2, 10, 0xffffff).rect(cx + 2, 12, 2, 1, 0xf0a0a0);
  }
  // 모자
  p.rect(cx - 8, 6, 16, 2, o.hat).rect(cx - 5, 2, 10, 5, o.hat).rect(cx - 5, 5, 10, 1, o.hatBand);
  p.rect(cx - 4, 2, 4, 1, shade(o.hat, 0.25));
  p.outline(0x3b2a22);
  return p;
}

function personSheet(o: Outfit): HTMLCanvasElement {
  const frames: Painter[] = [];
  for (const dir of ['down', 'up', 'side'] as const) for (let s = 0; s < 3; s++) frames.push(person(o, dir, s));
  return sheet(frames);
}

function cart(special: boolean): HTMLCanvasElement {
  const p = new Painter(56, 48);
  const body = special ? 0x6a3a8a : 0xb8844a;
  const cloth = special ? 0xe8b830 : 0xe8584a;
  p.shadow(28, 45, 24, 3, 0.25);
  p.rect(4, 22, 44, 14, body).rect(4, 22, 44, 3, shade(body, 0.2)).rect(4, 34, 44, 2, shade(body, -0.3));
  for (let x = 8; x < 46; x += 8) p.rect(x, 25, 1, 9, shade(body, -0.2));
  // 덮개
  p.rect(6, 8, 40, 14, 0xf6efe0);
  for (let x = 6; x < 46; x += 8) p.rect(x, 8, 4, 14, cloth);
  p.ellipse(26, 8, 20, 4, 0xf6efe0);
  for (let x = 8; x < 46; x += 8) p.ellipse(x + 2, 8, 2, 3, cloth);
  // 물건
  p.circle(12, 20, 3, 0xe8584a).circle(18, 19, 3, 0xf7d84a).rect(30, 16, 6, 6, 0x8a5a3a).circle(40, 19, 3, 0x5aa83c);
  // 바퀴
  for (const x of [14, 38]) {
    p.circle(x, 39, 6, 0x6a4a2e).circle(x, 39, 4, 0xa0784e).circle(x, 39, 1, 0x3b2a22);
    p.line(x - 4, 39, x + 4, 39, 0x6a4a2e).line(x, 35, x, 43, 0x6a4a2e);
  }
  p.rect(48, 28, 8, 2, 0x8a5a3a);
  if (special) p.circle(26, 4, 2, 0xffe066).px(22, 3, 0xffffff).px(31, 5, 0xffffff);
  p.outline(0x3b2a22);
  return p.canvas;
}

// ───────────── 동물 ─────────────
const SIZE = { small: [20, 18], medium: [28, 24], large: [34, 28] } as const;

function bird(p: Painter, a: AnimalData, step: number) {
  const [W, H] = SIZE[a.art.size];
  const { body, accent, dark } = a.art;
  const by = H - 3;
  const leg = step ? 1 : 0;
  p.shadow(W / 2, H - 1, W / 2 - 3, 2, 0.22);
  const tall = a.id === 'ostrich';
  if (tall) {
    // 타조: 긴 다리, 긴 목
    p.line(14 - leg, by - 10, 13 - leg, by, accent).line(19 + leg, by - 10, 20 + leg, by, accent);
    p.ellipse(16, by - 13, 9, 6, body).ellipse(11, by - 15, 4, 3, shade(body, 0.15));
    p.ellipse(9, by - 13, 3, 4, accent);
    p.rect(22, by - 26, 2, 13, 0xd9a09a).ellipse(23, by - 27, 3, 2, 0xd9a09a).px(24, by - 28, 0x3b2a22).rect(26, by - 27, 3, 1, 0xd9a020);
    return;
  }
  p.line(W / 2 - 2, by - 3, W / 2 - 2 - leg, by, 0xe8a030).line(W / 2 + 1, by - 3, W / 2 + 1 + leg, by, 0xe8a030);
  p.ellipse(W / 2 - 1, by - 6, W / 2 - 4, 5, body);
  p.ellipse(W / 2 - 3, by - 7, 3, 2, shade(body, -0.12)); // 날개
  const hx = W - 6;
  const hy = by - 11;
  p.circle(hx, hy, 3, a.id === 'duck' || a.id === 'goose' ? (a.id === 'duck' ? dark : body) : body);
  p.px(hx + 1, hy - 1, 0x3b2a22);
  p.rect(hx + 3, hy, 3, 2, a.id === 'chicken' || a.id === 'turkey' ? 0xf0a830 : accent);
  if (a.id === 'chicken') p.rect(hx - 1, hy - 5, 3, 2, accent).px(hx + 3, hy + 2, accent);
  if (a.id === 'turkey') {
    p.ellipse(4, by - 10, 4, 6, dark).ellipse(4, by - 10, 2, 4, accent).px(hx + 3, hy + 2, accent).px(hx + 3, hy + 3, accent);
  }
  // 꼬리
  if (a.id !== 'turkey') p.tri(1, by - 10, 5, by - 7, 3, by - 5, shade(body, -0.1));
}

function rabbit(p: Painter, a: AnimalData, step: number) {
  const [W, H] = SIZE.small;
  const { body, accent } = a.art;
  const by = H - 3;
  p.shadow(W / 2, H - 1, 7, 2, 0.22);
  p.ellipse(9, by - 4 - (step ? 1 : 0), 6, 4, body);
  p.circle(15, by - 7 - (step ? 1 : 0), 3, body);
  p.rect(13, by - 15, 2, 6, body).rect(16, by - 14, 2, 6, body).px(13, by - 13, accent).px(16, by - 12, accent);
  p.px(16, by - 8, 0x3b2a22).px(18, by - 6, 0xf08090);
  p.circle(3, by - 5, 2, 0xffffff);
}

function quadruped(p: Painter, a: AnimalData, step: number) {
  const [W, H] = SIZE[a.art.size];
  const { body, accent, dark } = a.art;
  const by = H - 2;
  const bodyH = Math.round(H * 0.32);
  const bodyY = by - bodyH - 5;
  const leg = step ? 1 : 0;
  p.shadow(W / 2, H - 1, W / 2 - 3, 2, 0.22);
  // 다리
  const legC = a.id === 'sheep' ? 0x4a4038 : shade(body, -0.15);
  for (const [x, o] of [[5, leg], [9, -leg], [W - 11, -leg], [W - 7, leg]] as [number, number][]) p.rect(x + o, bodyY + bodyH - 2, 3, by - (bodyY + bodyH) + 2, legC);
  // 몸통
  const fluffy = a.id === 'sheep' || a.id === 'alpaca';
  p.ellipse(W / 2 - 1, bodyY + bodyH / 2, W / 2 - 4, bodyH / 2 + 1, body);
  if (fluffy) for (let i = 0; i < 7; i++) p.circle(6 + i * ((W - 14) / 6), bodyY + 1 + (i % 2), 2, shade(body, 0.12));
  if (a.id === 'cow') {
    p.ellipse(9, bodyY + 3, 3, 2, accent).ellipse(W - 12, bodyY + bodyH - 2, 4, 2, accent).ellipse(W / 2, bodyY + 2, 2, 2, accent);
    p.ellipse(W / 2 - 2, bodyY + bodyH, 3, 1, dark);
  }
  if (a.id === 'pig') p.line(2, bodyY + 2, 4, bodyY + 4, accent).px(2, bodyY + 1, accent);
  // 목/머리
  const hx = W - 6;
  const neck = a.id === 'alpaca' ? 8 : a.id === 'goat' || a.id === 'sheep' ? 2 : 0;
  const hy = bodyY + 1 - neck;
  if (neck) p.rect(hx - 3, hy + 2, 4, neck + 3, a.id === 'sheep' ? accent : body);
  const headC = a.id === 'sheep' ? accent : body;
  p.ellipse(hx, hy + 2, 4, 3, headC);
  p.px(hx + 1, hy + 1, 0x3b2a22);
  // 귀/뿔/코
  p.rect(hx - 4, hy, 2, 2, shade(headC, -0.2));
  if (a.id === 'cow' || a.id === 'buffalo') {
    p.ellipse(hx + 3, hy + 4, 2, 2, dark);
    p.line(hx - 2, hy - 1, hx - 4, hy - 4, a.id === 'buffalo' ? 0xd9cbb4 : 0xe8d8b0).line(hx + 1, hy - 1, hx + 2, hy - 4, a.id === 'buffalo' ? 0xd9cbb4 : 0xe8d8b0);
  }
  if (a.id === 'goat') p.line(hx - 1, hy - 1, hx - 3, hy - 3, dark).rect(hx + 1, hy + 4, 1, 3, accent);
  if (a.id === 'pig') p.ellipse(hx + 3, hy + 3, 2, 2, accent).px(hx + 3, hy + 3, dark);
  if (a.id === 'alpaca') p.rect(hx - 1, hy - 3, 2, 3, body).rect(hx + 1, hy - 3, 2, 3, body).px(hx + 3, hy + 3, dark);
  // 꼬리
  p.px(2, bodyY + 3, shade(body, -0.2)).px(1, bodyY + 4, shade(body, -0.2));
}

function animalFrame(a: AnimalData, step: number): Painter {
  const [W, H] = a.id === 'ostrich' ? [32, 34] : SIZE[a.art.size];
  const p = new Painter(W, H);
  if (['chicken', 'duck', 'goose', 'turkey', 'ostrich'].includes(a.id)) bird(p, a, step);
  else if (a.id === 'rabbit') rabbit(p, a, step);
  else quadruped(p, a, step);
  p.outline(0x3b2a22);
  return p;
}

export function buildCharacterTextures(): { key: string; canvas: HTMLCanvasElement; frameW: number; frameH: number }[] {
  const out = [
    { key: 'player', canvas: personSheet(FARMER), frameW: CHAR_W, frameH: CHAR_H },
    { key: 'merchant', canvas: personSheet(MERCHANT), frameW: CHAR_W, frameH: CHAR_H },
    { key: 'merchant_special', canvas: personSheet(SPECIAL), frameW: CHAR_W, frameH: CHAR_H },
    { key: 'cart', canvas: cart(false), frameW: 56, frameH: 48 },
    { key: 'cart_special', canvas: cart(true), frameW: 56, frameH: 48 },
  ];
  for (const a of ANIMALS) {
    const f0 = animalFrame(a, 0);
    const f1 = animalFrame(a, 1);
    out.push({ key: `an_${a.id}`, canvas: sheet([f0, f1]), frameW: f0.w, frameH: f0.h });
  }
  return out;
}

/** 첫 프레임만 (아이콘용) */
export function animalPortrait(id: string): HTMLCanvasElement {
  const a = ANIMALS.find((x) => x.id === id)!;
  return animalFrame(a, 0).canvas;
}
