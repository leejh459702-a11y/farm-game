import type { SeasonId } from '../types/game';

export type CropArt = 'root' | 'leafy' | 'vine' | 'bush' | 'tall' | 'tree' | 'melon' | 'flower' | 'grain' | 'stalk';

export interface CropData {
  id: string;
  name: string;
  /** 제철 계절(복수 가능) */
  season: SeasonId[];
  seedPrice: number;
  baseSellPrice: number;
  growDays: number;
  /** 0 = 재수확 불가 */
  regrowDays: number;
  /** 기본 수확량 */
  yield: number;
  /** 하루 신선도 감소량 */
  freshnessDecay: number;
  /** 가공에 사용되는 레시피 id 목록 (자동 산출 — recipes.ts 참고) */
  processingUses: string[];
  /** 필요 농사 레벨 */
  unlockLevel: number;
  /** 필요 연구 (예: 과수) */
  unlockSkill?: string;
  /** 특급상인 전용 희귀 작물 */
  rare?: boolean;
  spriteKey: string;
  art: { kind: CropArt; color: number; color2?: number; leaf: number };
  tags?: string[];
}

const c = (
  id: string,
  name: string,
  season: SeasonId[],
  seedPrice: number,
  baseSellPrice: number,
  growDays: number,
  regrowDays: number,
  yieldQty: number,
  freshnessDecay: number,
  unlockLevel: number,
  art: CropData['art'],
  extra: Partial<CropData> = {},
): CropData => ({
  id,
  name,
  season,
  seedPrice,
  baseSellPrice,
  growDays,
  regrowDays,
  yield: yieldQty,
  freshnessDecay,
  processingUses: [],
  unlockLevel,
  spriteKey: `crop_${id}`,
  art,
  ...extra,
});

const G = 0x5aa83c; // 기본 잎색
const G2 = 0x3f8f3a;
const G3 = 0x7cbf4a;

export const CROPS: CropData[] = [
  // ───── 봄 ─────
  c('potato', '감자', ['spring'], 30, 32, 3, 0, 2, 3, 1, { kind: 'leafy', color: 0xc9a066, leaf: G2 }),
  c('carrot', '당근', ['spring'], 20, 50, 3, 0, 1, 6, 1, { kind: 'root', color: 0xf08a2c, leaf: G3 }),
  c('lettuce', '상추', ['spring'], 15, 32, 1, 0, 1, 12, 1, { kind: 'leafy', color: 0x8fd16a, leaf: G3 }),
  c('radish', '무', ['spring'], 25, 60, 2, 0, 1, 5, 2, { kind: 'root', color: 0xf3f0e6, color2: 0xa8d68a, leaf: G }),
  c('onion', '양파', ['spring'], 35, 40, 4, 0, 2, 2, 2, { kind: 'root', color: 0xd9a25a, leaf: G3 }),
  c('pea', '완두콩', ['spring'], 50, 28, 4, 2, 2, 8, 3, { kind: 'vine', color: 0x8ccf5a, leaf: G2 }, { tags: ['vegetable'] }),
  c('strawberry', '딸기', ['spring'], 90, 50, 5, 3, 2, 12, 4, { kind: 'bush', color: 0xe8424a, leaf: G }, { tags: ['fruit'] }),
  c('asparagus', '아스파라거스', ['spring'], 120, 210, 5, 0, 1, 7, 5, { kind: 'stalk', color: 0x7fb84a, leaf: G2 }),
  c('wheat', '밀', ['spring', 'autumn'], 15, 22, 3, 0, 2, 0.5, 2, { kind: 'grain', color: 0xe3c065, leaf: 0xb7c35a }),
  // ───── 여름 ─────
  c('tomato', '토마토', ['summer'], 70, 100, 5, 3, 1, 7, 2, { kind: 'vine', color: 0xe54b3c, leaf: G }, { tags: ['vegetable'] }),
  c('cucumber', '오이', ['summer'], 45, 48, 4, 2, 1, 9, 1, { kind: 'vine', color: 0x4f9a3a, leaf: G3 }),
  c('pepper', '고추', ['summer'], 40, 24, 4, 2, 2, 4, 2, { kind: 'bush', color: 0xd8342c, leaf: G2 }),
  c('corn', '옥수수', ['summer'], 70, 45, 6, 3, 2, 5, 3, { kind: 'tall', color: 0xf2cc4a, leaf: G }),
  c('watermelon', '수박', ['summer'], 110, 300, 8, 0, 1, 3, 4, { kind: 'melon', color: 0x3f8f3a, color2: 0x2a6a2a, leaf: G }, { tags: ['fruit'] }),
  c('melon', '멜론', ['summer'], 100, 250, 7, 0, 1, 5, 4, { kind: 'melon', color: 0xc8d98a, color2: 0xa2b866, leaf: G }, { tags: ['fruit'] }),
  c('blueberry', '블루베리', ['summer'], 120, 24, 6, 2, 4, 10, 5, { kind: 'bush', color: 0x4b5fc4, leaf: G2 }, { tags: ['fruit'] }),
  c('sunflower', '해바라기', ['summer'], 60, 95, 5, 0, 1, 2, 3, { kind: 'flower', color: 0xf7c834, color2: 0x7a4a24, leaf: G }),
  // ───── 가을 ─────
  c('cabbage', '배추', ['autumn'], 45, 100, 5, 0, 1, 4, 1, { kind: 'leafy', color: 0xd7ecb0, leaf: G3 }),
  c('pumpkin', '호박', ['autumn'], 90, 260, 8, 0, 1, 1, 3, { kind: 'melon', color: 0xec8a2a, color2: 0xc96a1a, leaf: G }),
  c('sweetpotato', '고구마', ['autumn'], 35, 36, 4, 0, 2, 2, 1, { kind: 'root', color: 0xa8436a, leaf: G }),
  c('rice', '쌀', ['autumn'], 25, 32, 5, 0, 2, 0.5, 2, { kind: 'grain', color: 0xf0e6b0, leaf: 0x9bc45a }),
  c('grape', '포도', ['autumn'], 110, 58, 7, 3, 2, 9, 4, { kind: 'vine', color: 0x7a3f9a, leaf: G }, { tags: ['fruit'] }),
  c('peanut', '땅콩', ['autumn'], 40, 20, 4, 0, 3, 1, 2, { kind: 'leafy', color: 0xc9a36a, leaf: G2 }),
  c('apple', '사과', ['autumn'], 280, 75, 8, 3, 3, 3, 5, { kind: 'tree', color: 0xd63a32, leaf: G2 }, { unlockSkill: 'f_orchard', tags: ['fruit'] }),
  c('pear', '배', ['autumn'], 300, 82, 8, 3, 3, 3, 6, { kind: 'tree', color: 0xe8d36a, leaf: G2 }, { unlockSkill: 'f_orchard', tags: ['fruit'] }),
  // ───── 겨울 ─────
  c('spinach', '시금치', ['winter'], 20, 40, 2, 0, 1, 10, 1, { kind: 'leafy', color: 0x3f8f3a, leaf: G2 }),
  c('winterradish', '겨울무', ['winter'], 30, 65, 3, 0, 1, 4, 1, { kind: 'root', color: 0xf3f0e6, color2: 0x8cc06a, leaf: G }),
  c('wintercabbage', '겨울배추', ['winter'], 50, 110, 5, 0, 1, 4, 2, { kind: 'leafy', color: 0xc6e3a0, leaf: G }),
  c('broccoli', '브로콜리', ['winter'], 60, 55, 5, 3, 1, 7, 3, { kind: 'bush', color: 0x3f8a3a, leaf: G2 }),
  c('greenonion', '대파', ['winter'], 25, 24, 3, 2, 1, 5, 1, { kind: 'stalk', color: 0xe8f2d8, leaf: G3 }),
  c('garlic', '마늘', ['winter'], 35, 28, 5, 0, 3, 1, 2, { kind: 'root', color: 0xf2ece0, leaf: G3 }),
  c('tangerine', '감귤', ['winter'], 260, 68, 8, 3, 3, 4, 5, { kind: 'tree', color: 0xf39a2c, leaf: G2 }, { unlockSkill: 'f_orchard', tags: ['fruit'] }),
  c('winterstrawberry', '겨울딸기', ['winter'], 120, 60, 6, 3, 2, 11, 6, { kind: 'bush', color: 0xf0505c, leaf: G2 }, { tags: ['fruit'] }),
  // ───── 희귀 (특급상인 전용) ─────
  c('goldenmelon', '황금멜론', ['summer'], 550, 1100, 8, 0, 1, 3, 4, { kind: 'melon', color: 0xf5c83a, color2: 0xd9a020, leaf: G }, { rare: true, unlockSkill: 'f_special', tags: ['fruit'] }),
  c('ginseng', '산삼', ['autumn', 'winter'], 700, 1500, 8, 0, 1, 1, 5, { kind: 'root', color: 0xe8d2a0, leaf: 0x3a7a3a }, { rare: true, unlockSkill: 'f_special' }),
  c('rainbowrose', '무지개장미', ['spring'], 450, 900, 7, 4, 1, 6, 4, { kind: 'flower', color: 0xf26a9a, color2: 0x7ac6f2, leaf: G2 }, { rare: true, unlockSkill: 'f_special' }),
];

export const CROP_BY_ID: Record<string, CropData> = Object.fromEntries(CROPS.map((x) => [x.id, x]));
