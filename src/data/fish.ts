import type { SeasonId, WeatherId } from '../types/game';

export type FishRarity = 'common' | 'rare' | 'epic' | 'legend';
export type FishTime = 'day' | 'night' | 'any';

/**
 * FishData — 물고기 데이터. 계절·시간·날씨에 따라 등장률이 달라진다.
 * weather: 해당 날씨일 때 등장률이 크게 오른다 ('any' = 날씨 무관)
 */
export interface FishData {
  id: string;
  name: string;
  season: SeasonId[];
  dayOrNight: FishTime;
  weather: WeatherId[] | 'any';
  rarity: FishRarity;
  /** 1(쉬움) ~ 10(어려움) — 미니게임 물고기 속도/변덕 */
  catchDifficulty: number;
  baseSellPrice: number;
  freshnessDecay: number;
  /** 요리 용도 (레시피에서 자동 산출) */
  cookingUses: string[];
  spriteKey: string;
  /** 크기 범위 cm */
  size: [number, number];
  art: { body: number; belly: number; fin: number; shape: 'slim' | 'round' | 'long' | 'big' };
}

const f = (
  id: string,
  name: string,
  season: SeasonId[],
  dayOrNight: FishTime,
  weather: WeatherId[] | 'any',
  rarity: FishRarity,
  catchDifficulty: number,
  baseSellPrice: number,
  size: [number, number],
  art: FishData['art'],
  freshnessDecay = 10,
): FishData => ({ id, name, season, dayOrNight, weather, rarity, catchDifficulty, baseSellPrice, freshnessDecay, cookingUses: [], spriteKey: `it_${id}`, size, art });

const ALL: SeasonId[] = ['spring', 'summer', 'autumn', 'winter'];

export const FISH: FishData[] = [
  // ───── 봄 ─────
  f('crucian', '붕어', ['spring', 'autumn', 'winter'], 'any', 'any', 'common', 2, 22, [12, 30], { body: 0x9a8a5a, belly: 0xd8caa0, fin: 0x7a6a40, shape: 'round' }),
  f('minnow', '피라미', ['spring', 'summer'], 'day', 'any', 'common', 3, 16, [8, 16], { body: 0xa8c0d0, belly: 0xf0f4f6, fin: 0xd87a6a, shape: 'slim' }),
  f('ricefish', '송사리', ['spring', 'summer'], 'day', ['sunny'], 'common', 1, 10, [2, 5], { body: 0xc8c0a0, belly: 0xf0ead8, fin: 0xb8a878, shape: 'slim' }),
  f('carp', '잉어', ['spring', 'autumn'], 'any', ['cloudy', 'rain'], 'rare', 4, 60, [30, 80], { body: 0xc89a4a, belly: 0xf0d8a0, fin: 0xa8783a, shape: 'big' }),
  f('catfish', '메기', ['spring', 'summer'], 'night', ['rain', 'storm'], 'rare', 5, 75, [30, 90], { body: 0x5a5a4a, belly: 0xb8b0a0, fin: 0x3a3a30, shape: 'long' }),
  f('sakura_trout', '벚꽃 송어', ['spring'], 'day', ['sunny'], 'legend', 9, 900, [50, 80], { body: 0xf2a8c0, belly: 0xfff0f4, fin: 0xd86a8a, shape: 'slim' }),
  // ───── 여름 ─────
  f('bass', '농어', ['summer'], 'day', 'any', 'common', 4, 35, [25, 60], { body: 0x6a8a7a, belly: 0xe0e8e0, fin: 0x4a6a5a, shape: 'slim' }),
  f('eel', '장어', ['summer'], 'night', ['rain', 'storm'], 'rare', 6, 90, [40, 100], { body: 0x4a4a3a, belly: 0x8a8a6a, fin: 0x2a2a20, shape: 'long' }),
  f('sweetfish', '은어', ['summer'], 'day', ['sunny'], 'common', 4, 30, [15, 28], { body: 0xa8b8a0, belly: 0xf6f6ea, fin: 0xe8c84a, shape: 'slim' }),
  f('snakehead', '가물치', ['summer'], 'any', ['cloudy', 'rain'], 'epic', 7, 180, [50, 100], { body: 0x4a5a3a, belly: 0x9aa880, fin: 0x2a3a20, shape: 'long' }),
  f('mandarin_fish', '쏘가리', ['summer', 'autumn'], 'night', 'any', 'epic', 8, 220, [25, 55], { body: 0xc8a050, belly: 0xf0e0b0, fin: 0x6a4a2a, shape: 'round' }),
  f('golden_catfish', '황금 메기', ['summer'], 'night', ['storm'], 'legend', 10, 1300, [80, 140], { body: 0xe8b830, belly: 0xfff0a0, fin: 0xb88a10, shape: 'long' }),
  // ───── 가을 ─────
  f('trout', '송어', ['autumn', 'winter'], 'any', 'any', 'common', 4, 32, [25, 55], { body: 0x8a9a8a, belly: 0xf0e0d8, fin: 0xd87a6a, shape: 'slim' }),
  f('salmon', '연어', ['autumn'], 'day', ['rain', 'cloudy'], 'rare', 6, 95, [55, 90], { body: 0x8a9aaa, belly: 0xf6c8b8, fin: 0x5a6a7a, shape: 'big' }),
  f('char', '곤들매기', ['autumn'], 'night', 'any', 'rare', 6, 85, [25, 45], { body: 0x6a7a6a, belly: 0xf2b88a, fin: 0xe8e0d0, shape: 'slim' }),
  f('maple_salmon', '단풍 연어', ['autumn'], 'any', ['rain'], 'legend', 9, 1100, [80, 120], { body: 0xd8542e, belly: 0xffc8a0, fin: 0x9a2a1a, shape: 'big' }),
  // ───── 겨울 ─────
  f('smelt', '빙어', ['winter'], 'any', 'any', 'common', 2, 18, [8, 15], { body: 0xc8d8e0, belly: 0xf6fafc, fin: 0xa8b8c0, shape: 'slim' }),
  f('lenok', '열목어', ['winter'], 'day', ['snow'], 'rare', 6, 100, [30, 60], { body: 0x9a8a7a, belly: 0xf0d8c8, fin: 0xc84a3a, shape: 'slim' }),
  f('masu', '산천어', ['winter', 'spring'], 'day', ['cloudy', 'snow'], 'rare', 5, 80, [20, 40], { body: 0x7a8aa0, belly: 0xf0f0f6, fin: 0x5a6a80, shape: 'slim' }),
  f('ice_king', '얼음 빙어왕', ['winter'], 'night', ['snow'], 'legend', 9, 950, [25, 40], { body: 0xa8e0f6, belly: 0xffffff, fin: 0x6ab8e0, shape: 'slim' }),
  // ───── 사계절 ─────
  f('loach', '미꾸라지', ALL, 'any', ['rain'], 'common', 3, 14, [8, 18], { body: 0x8a7a4a, belly: 0xc8b88a, fin: 0x6a5a3a, shape: 'long' }),
  f('old_boot', '낡은 장화', ALL, 'any', 'any', 'common', 1, 2, [20, 30], { body: 0x5a4a3a, belly: 0x7a6a5a, fin: 0x3a2a20, shape: 'round' }, 0),
];

export const FISH_BY_ID: Record<string, FishData> = Object.fromEntries(FISH.map((x) => [x.id, x]));

export const RARITY_NAME: Record<FishRarity, string> = { common: '일반', rare: '희귀', epic: '매우 희귀', legend: '전설' };
