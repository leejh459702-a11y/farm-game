/**
 * 양식장 데이터 — 3×3 시설, 한 양식장에는 한 종류의 물고기만.
 * 개체 수 단계 5 → 8 → 10 (확장 재료 필요), 내부 업그레이드 (번식 속도 / 어란 생산량 / 자동 수거 / 자동 사료).
 */
import { FISH, type FishData } from './fish';

/** 양식 가능한 물고기 (전설·낡은 장화 제외) */
export const POND_FISH: FishData[] = FISH.filter((f) => f.rarity !== 'legend' && f.id !== 'old_boot');

export const roeId = (fishId: string): string => `roe_${fishId}`;

/** 개체 수 단계 — 0단계는 건설 시 기본 */
export const POND_TIERS: { cap: number; mats: { id: string; qty: number }[]; gold: number; skill?: string }[] = [
  { cap: 5, mats: [], gold: 0 },
  { cap: 8, mats: [{ id: 'stone', qty: 30 }, { id: 'reed', qty: 10 }, { id: 'clam', qty: 5 }], gold: 3000 },
  { cap: 10, mats: [{ id: 'stone', qty: 50 }, { id: 'pondweed', qty: 12 }, { id: 'fish_feed', qty: 20 }, { id: 'iron_ore', qty: 5 }], gold: 8000 },
  // 마스터리 '최고의 양식장'
  { cap: 14, mats: [{ id: 'pearl', qty: 3 }, { id: 'pondweed', qty: 20 }, { id: 'gold_ore', qty: 5 }], gold: 20000, skill: 'fi_m_pond' },
];

export type PondUpgrade = 'breedSpeed' | 'roeYield' | 'autoCollect' | 'autoFeed';

export const POND_UPGRADES: Record<PondUpgrade, { name: string; icon: string; desc: string[]; cost: { gold: number; mats: { id: string; qty: number }[] }[] }> = {
  breedSpeed: {
    name: '번식 속도',
    icon: 'ic_heart',
    desc: ['기본 번식', '번식 확률 +50%', '번식 확률 +100%'],
    cost: [
      { gold: 2500, mats: [{ id: 'pondweed', qty: 5 }] },
      { gold: 7000, mats: [{ id: 'pondweed', qty: 10 }, { id: 'copper_ore', qty: 10 }] },
    ],
  },
  roeYield: {
    name: '어란 생산량',
    icon: 'ic_fish',
    desc: ['기본 생산', '어란 생산 +40%', '어란 생산 +80%'],
    cost: [
      { gold: 3000, mats: [{ id: 'clam', qty: 8 }] },
      { gold: 9000, mats: [{ id: 'pearl', qty: 1 }, { id: 'iron_ore', qty: 8 }] },
    ],
  },
  autoCollect: {
    name: '자동 수거',
    icon: 'ic_storage',
    desc: ['직접 수거', '아침마다 창고로 자동 수거'],
    cost: [{ gold: 6000, mats: [{ id: 'copper_ore', qty: 15 }, { id: 'iron_ore', qty: 5 }] }],
  },
  autoFeed: {
    name: '자동 사료',
    icon: 'it_fish_feed',
    desc: ['직접 먹이 주기', '아침마다 창고의 양식 사료로 자동 급식'],
    cost: [{ gold: 5000, mats: [{ id: 'copper_ore', qty: 10 }, { id: 'reed', qty: 10 }] }],
  },
};

export const POND_BALANCE = {
  /** 하루 번식 확률 (두 마리 이상, 먹이를 준 날) */
  breedChance: 0.3,
  /** 물고기 한 마리당 하루 어란 확률 */
  roeChancePerFish: 0.12,
  /** 사료 1개로 먹일 수 있는 마리 수 */
  fishPerFeed: 3,
  /** 특수 생산물 확률 (양식장 전체, 하루) */
  specialChance: { common: 0.25, rare: 0.3, epic: 0.35 } as Record<'common' | 'rare' | 'epic', number>,
};

/** 희귀도별 특수 생산물 (가중치) */
export const POND_SPECIALS: Record<'common' | 'rare' | 'epic', { id: string; w: number }[]> = {
  common: [
    { id: 'pondweed', w: 70 },
    { id: 'clam', w: 30 },
  ],
  rare: [
    { id: 'pondweed', w: 45 },
    { id: 'clam', w: 30 },
    { id: 'pearl', w: 25 },
  ],
  epic: [
    { id: 'pondweed', w: 30 },
    { id: 'pearl', w: 40 },
    { id: 'shimmer_scale', w: 30 },
  ],
};
