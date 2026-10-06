/**
 * 채집물 · 자원 · 외곽 지역(강가/숲/바위 언덕) 데이터
 */
import type { SeasonId } from '../types/game';

export type RegionId = 'river' | 'forest' | 'hill' | 'mine';

/** 채집물 (category: forage) */
export interface ForageData {
  id: string;
  name: string;
  price: number;
  decay: number;
  tags: string[];
  /** 아이콘 아트 */
  art: { shape: 'berry' | 'mushroom' | 'leaf' | 'flower' | 'nut' | 'shell' | 'reed' | 'cone'; color: number; color2?: number };
  /** 희귀 (채집 Lv.4 이상에서 등장) */
  rare?: boolean;
}

export const FORAGE: ForageData[] = [
  { id: 'wild_strawberry', name: '야생딸기', price: 14, decay: 12, tags: ['berry', 'fruit'], art: { shape: 'berry', color: 0xe8424a } },
  { id: 'wild_blueberry', name: '야생 블루베리', price: 12, decay: 10, tags: ['berry', 'fruit'], art: { shape: 'berry', color: 0x4b5fc4 } },
  { id: 'shiitake', name: '표고버섯', price: 22, decay: 6, tags: ['mushroom'], art: { shape: 'mushroom', color: 0x8a5a3a, color2: 0xe8d8b8 } },
  { id: 'pine_mushroom', name: '송이버섯', price: 160, decay: 6, tags: ['mushroom'], art: { shape: 'mushroom', color: 0xd8c8a0, color2: 0xf6f0e0 }, rare: true },
  { id: 'enoki', name: '팽이버섯', price: 18, decay: 8, tags: ['mushroom'], art: { shape: 'mushroom', color: 0xf6f0d8, color2: 0xfffaf0 } },
  { id: 'herb', name: '약초', price: 16, decay: 3, tags: ['herb'], art: { shape: 'leaf', color: 0x5a9a4a } },
  { id: 'wild_ginseng', name: '산삼 뿌리', price: 320, decay: 2, tags: ['herb'], art: { shape: 'leaf', color: 0xd8c08a, color2: 0x3a7a3a }, rare: true },
  { id: 'fern', name: '고사리', price: 12, decay: 8, tags: ['vegetable'], art: { shape: 'leaf', color: 0x7cbf4a } },
  { id: 'wildflower', name: '들꽃', price: 10, decay: 10, tags: ['flower'], art: { shape: 'flower', color: 0xf7a8c4, color2: 0xf7d84a } },
  { id: 'acorn', name: '도토리', price: 6, decay: 0.5, tags: ['nut'], art: { shape: 'nut', color: 0xa0703a } },
  { id: 'chestnut', name: '밤', price: 14, decay: 1, tags: ['nut'], art: { shape: 'nut', color: 0x7a4a2a } },
  { id: 'pine_cone', name: '솔방울', price: 5, decay: 0, tags: ['nut'], art: { shape: 'cone', color: 0x8a5a3a } },
  { id: 'reed', name: '갈대', price: 6, decay: 0, tags: ['fiber'], art: { shape: 'reed', color: 0xd8c08a } },
  { id: 'clam', name: '조개', price: 15, decay: 8, tags: ['shell', 'seafood'], art: { shape: 'shell', color: 0xe8d8c8, color2: 0xa89888 } },
  { id: 'watercress', name: '물냉이', price: 12, decay: 10, tags: ['vegetable'], art: { shape: 'leaf', color: 0x6ad84a } },
  { id: 'river_snail', name: '다슬기', price: 18, decay: 8, tags: ['shell', 'seafood'], art: { shape: 'shell', color: 0x5a5a4a, color2: 0x8a8a7a } },
];

/** 자원 (category: resource) — 판매는 부가 수입, 주 용도는 건설·업그레이드 */
export interface ResourceData {
  id: string;
  name: string;
  price: number;
  art: { shape: 'log' | 'stick' | 'sap' | 'stone' | 'clay' | 'coal' | 'ore' | 'gem' | 'brick'; color: number; color2?: number };
}

export const RESOURCES: ResourceData[] = [
  { id: 'wood', name: '목재', price: 3, art: { shape: 'log', color: 0xa0703a, color2: 0xd8b07a } },
  { id: 'branch', name: '나뭇가지', price: 1, art: { shape: 'stick', color: 0x8a5a3a } },
  { id: 'sap', name: '수액', price: 8, art: { shape: 'sap', color: 0xe8a830 } },
  { id: 'stone', name: '돌', price: 2, art: { shape: 'stone', color: 0x9a958c } },
  { id: 'clay', name: '점토', price: 4, art: { shape: 'clay', color: 0xc8845a } },
  { id: 'coal', name: '석탄', price: 10, art: { shape: 'coal', color: 0x3a3a40 } },
  { id: 'copper_ore', name: '구리광석', price: 15, art: { shape: 'ore', color: 0x8a857c, color2: 0xd8803a } },
  { id: 'iron_ore', name: '철광석', price: 30, art: { shape: 'ore', color: 0x8a857c, color2: 0xc8b8b0 } },
  { id: 'silver_ore', name: '은광석', price: 60, art: { shape: 'ore', color: 0x7a7a80, color2: 0xf0f4f8 } },
  { id: 'gold_ore', name: '금광석', price: 120, art: { shape: 'ore', color: 0x7a7060, color2: 0xf2c83a } },
  { id: 'ruby', name: '루비', price: 450, art: { shape: 'gem', color: 0xe0303c } },
  { id: 'emerald', name: '에메랄드', price: 450, art: { shape: 'gem', color: 0x30c070 } },
  { id: 'moonstone', name: '월장석', price: 800, art: { shape: 'gem', color: 0xc8d8f8 } },
  { id: 'star_crystal', name: '별빛 결정', price: 1500, art: { shape: 'gem', color: 0xf6e070 } },
  { id: 'amethyst', name: '자수정', price: 300, art: { shape: 'gem', color: 0xa86ad8 } },
];

/** 바위 노드 종류 — 필요한 곡괭이 단계 */
export interface RockKind {
  id: string;
  name: string;
  drops: { id: string; min: number; max: number }[];
  hp: number;
  /** 필요 곡괭이 레벨 (0 기본, 1 구리, 2 철, 3 고급) */
  tier: number;
  weight: number;
  color: number;
  color2?: number;
}

export const ROCKS: RockKind[] = [
  { id: 'rock_stone', name: '바위', drops: [{ id: 'stone', min: 2, max: 4 }], hp: 3, tier: 0, weight: 40, color: 0x9a958c },
  { id: 'rock_clay', name: '점토 더미', drops: [{ id: 'clay', min: 2, max: 3 }], hp: 2, tier: 0, weight: 18, color: 0xc8845a },
  { id: 'rock_coal', name: '석탄 바위', drops: [{ id: 'coal', min: 1, max: 2 }, { id: 'stone', min: 1, max: 1 }], hp: 3, tier: 0, weight: 14, color: 0x6a6a70, color2: 0x2a2a30 },
  { id: 'rock_copper', name: '구리 광맥', drops: [{ id: 'copper_ore', min: 1, max: 3 }], hp: 4, tier: 0, weight: 12, color: 0x8a857c, color2: 0xd8803a },
  { id: 'rock_iron', name: '철 광맥', drops: [{ id: 'iron_ore', min: 1, max: 2 }], hp: 5, tier: 1, weight: 8, color: 0x8a857c, color2: 0xe0d0c8 },
  { id: 'rock_silver', name: '은 광맥', drops: [{ id: 'silver_ore', min: 1, max: 2 }], hp: 6, tier: 2, weight: 4, color: 0x7a7a80, color2: 0xf6faff },
  { id: 'rock_gold', name: '금 광맥', drops: [{ id: 'gold_ore', min: 1, max: 2 }], hp: 6, tier: 2, weight: 3, color: 0x7a7060, color2: 0xf2c83a },
  { id: 'rock_ruby', name: '루비 광맥', drops: [{ id: 'ruby', min: 1, max: 1 }, { id: 'stone', min: 1, max: 2 }], hp: 8, tier: 3, weight: 0, color: 0x5a4a50, color2: 0xe0303c },
  { id: 'rock_emerald', name: '에메랄드 광맥', drops: [{ id: 'emerald', min: 1, max: 1 }, { id: 'stone', min: 1, max: 2 }], hp: 8, tier: 3, weight: 0, color: 0x4a5a50, color2: 0x30c070 },
  { id: 'rock_moon', name: '월장석 광맥', drops: [{ id: 'moonstone', min: 1, max: 1 }], hp: 9, tier: 3, weight: 0, color: 0x4a4a62, color2: 0xc8d8f8 },
  { id: 'rock_star', name: '별빛 광맥', drops: [{ id: 'star_crystal', min: 1, max: 1 }], hp: 10, tier: 3, weight: 0, color: 0x3a3450, color2: 0xf6e070 },
  { id: 'rock_relic', name: '고대 지층', drops: [{ id: 'stone', min: 2, max: 3 }, { id: 'clay', min: 1, max: 2 }], hp: 6, tier: 2, weight: 0, color: 0x8a7a5a, color2: 0xd8c8a0 },
  { id: 'rock_dark', name: '단단한 암석', drops: [{ id: 'stone', min: 3, max: 5 }, { id: 'coal', min: 0, max: 1 }], hp: 5, tier: 0, weight: 0, color: 0x5a5560 },
  { id: 'rock_gem', name: '자수정 광맥', drops: [{ id: 'amethyst', min: 1, max: 1 }], hp: 7, tier: 2, weight: 1, color: 0x6a5a7a, color2: 0xb87ae8 },
];

export const ROCK_BY_ID: Record<string, RockKind> = Object.fromEntries(ROCKS.map((r) => [r.id, r]));

/** 지역별 계절 채집 테이블 (가중치) */
export const FORAGE_TABLE: Record<'forest' | 'river', Record<SeasonId, Record<string, number>>> = {
  forest: {
    spring: { wild_strawberry: 20, fern: 18, herb: 14, shiitake: 10, wildflower: 16, branch: 12, pine_mushroom: 1, wild_ginseng: 1 },
    summer: { wild_blueberry: 22, herb: 14, shiitake: 12, wildflower: 18, branch: 12, pine_mushroom: 1, wild_ginseng: 1 },
    autumn: { chestnut: 20, acorn: 20, shiitake: 14, herb: 12, branch: 10, pine_mushroom: 3, wild_ginseng: 1 },
    winter: { pine_cone: 22, enoki: 16, herb: 10, branch: 16, acorn: 8, wild_ginseng: 1 },
  },
  river: {
    spring: { reed: 20, clam: 16, watercress: 18, river_snail: 8 },
    summer: { reed: 18, clam: 16, watercress: 14, river_snail: 16 },
    autumn: { reed: 24, clam: 18, river_snail: 10 },
    winter: { reed: 20, clam: 14 },
  },
};

export interface RegionDef {
  id: RegionId;
  name: string;
  desc: string;
  icon: string;
  /** 매일 생성되는 채집 포인트 수 범위 */
  forage: [number, number];
}

export const REGIONS: RegionDef[] = [
  { id: 'river', name: '강가', desc: '낚시 · 갈대 · 조개 · 물가 식물', icon: 'ic_fish', forage: [3, 8] },
  { id: 'forest', name: '숲', desc: '벌목 · 버섯 · 야생 열매 · 약초 · 수액', icon: 'tool_axe', forage: [8, 15] },
  { id: 'hill', name: '바위 언덕', desc: '채광 · 돌 · 점토 · 석탄 · 광석', icon: 'tool_pickaxe', forage: [0, 0] },
  { id: 'mine', name: '광산', desc: '층마다 깊어지는 광산 · 광석 · 보석 · 지오드 · 유물', icon: 'ic_mine', forage: [0, 0] },
];

export const REGION_BY_ID: Record<RegionId, RegionDef> = Object.fromEntries(REGIONS.map((r) => [r.id, r])) as Record<RegionId, RegionDef>;

/** 작은 랜덤 이벤트 (오래된 상자) 보상 테이블 */
export const CHEST_LOOT: { kind: 'item' | 'deco'; id: string; min: number; max: number; weight: number }[] = [
  { kind: 'item', id: 'seed_strawberry', min: 2, max: 4, weight: 10 },
  { kind: 'item', id: 'seed_tomato', min: 2, max: 4, weight: 10 },
  { kind: 'item', id: 'seed_pumpkin', min: 1, max: 3, weight: 8 },
  { kind: 'item', id: 'rare_bait', min: 1, max: 3, weight: 14 },
  { kind: 'item', id: 'copper_ore', min: 3, max: 6, weight: 10 },
  { kind: 'item', id: 'iron_ore', min: 2, max: 4, weight: 6 },
  { kind: 'item', id: 'gold_ore', min: 1, max: 2, weight: 2 },
  { kind: 'item', id: 'amethyst', min: 1, max: 1, weight: 1 },
  { kind: 'item', id: 'growth_fertilizer', min: 2, max: 5, weight: 8 },
  { kind: 'deco', id: 'flowerpot', min: 1, max: 1, weight: 6 },
  { kind: 'deco', id: 'lamp', min: 1, max: 1, weight: 4 },
  { kind: 'deco', id: 'cherrytree', min: 1, max: 1, weight: 1 },
];
