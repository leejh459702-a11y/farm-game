export interface AnimalData {
  id: string;
  name: string;
  /** 개체 ID 접두어 (COW-000127) */
  prefix: string;
  /** 수용 가능한 축사 타입 */
  housing: string[];
  buyPrice: number;
  /** 성체 3등급 기준 판매가 */
  baseSellPrice: number;
  /** 생산품 아이템 id (없으면 null) */
  product: string | null;
  /** 생산 간격(일) */
  productInterval: number;
  /** 하루 사료 소비량 (건초 단위) */
  feedPerDay: number;
  /** 아기→청소년 / 청소년→성체 일수 */
  growDays: [number, number];
  pregnancyDays: number;
  meat: string | null;
  meatQty: number;
  /** 필요 목축 연구 */
  unlockSkill: string;
  rare?: boolean;
  /** 픽셀아트 팔레트 */
  art: { body: number; accent: number; dark: number; size: 'small' | 'medium' | 'large' };
}

export const ANIMALS: AnimalData[] = [
  { id: 'chicken', name: '닭', prefix: 'CHK', housing: ['coop'], buyPrice: 400, baseSellPrice: 300, product: 'egg', productInterval: 1, feedPerDay: 1, growDays: [3, 4], pregnancyDays: 3, meat: 'chicken_meat', meatQty: 2, unlockSkill: 'l_chicken', art: { body: 0xfaf6ee, accent: 0xe0412f, dark: 0xd9a03a, size: 'small' } },
  { id: 'duck', name: '오리', prefix: 'DCK', housing: ['duckhouse'], buyPrice: 600, baseSellPrice: 450, product: 'duck_egg', productInterval: 2, feedPerDay: 1, growDays: [3, 5], pregnancyDays: 4, meat: 'duck_meat', meatQty: 2, unlockSkill: 'l_duck', art: { body: 0xf3f0e4, accent: 0xf0a43a, dark: 0x4a8a5a, size: 'small' } },
  { id: 'rabbit', name: '토끼', prefix: 'RBT', housing: ['rabbithutch'], buyPrice: 700, baseSellPrice: 520, product: 'rabbit_wool', productInterval: 3, feedPerDay: 1, growDays: [3, 4], pregnancyDays: 3, meat: null, meatQty: 0, unlockSkill: 'l_rabbit', art: { body: 0xe9dfd2, accent: 0xf2b8c0, dark: 0x9a8a7a, size: 'small' } },
  { id: 'sheep', name: '양', prefix: 'SHP', housing: ['sheepbarn', 'bigbarn'], buyPrice: 1600, baseSellPrice: 1200, product: 'wool', productInterval: 3, feedPerDay: 2, growDays: [4, 6], pregnancyDays: 5, meat: 'mutton', meatQty: 3, unlockSkill: 'l_sheep', art: { body: 0xf6f3ea, accent: 0x4a4038, dark: 0xd9d2c4, size: 'medium' } },
  { id: 'goat', name: '염소', prefix: 'GOT', housing: ['sheepbarn', 'bigbarn'], buyPrice: 1500, baseSellPrice: 1100, product: 'goat_milk', productInterval: 2, feedPerDay: 2, growDays: [4, 5], pregnancyDays: 5, meat: 'goat_meat', meatQty: 3, unlockSkill: 'l_goat', art: { body: 0xd9cbb4, accent: 0x8a6a4a, dark: 0x5a4a3a, size: 'medium' } },
  { id: 'cow', name: '젖소', prefix: 'COW', housing: ['cowbarn', 'bigbarn'], buyPrice: 3000, baseSellPrice: 2400, product: 'milk', productInterval: 1, feedPerDay: 3, growDays: [5, 7], pregnancyDays: 7, meat: 'beef', meatQty: 5, unlockSkill: 'l_cow', art: { body: 0xf7f4ee, accent: 0x2e2a2a, dark: 0xf0a8a8, size: 'large' } },
  { id: 'pig', name: '돼지', prefix: 'PIG', housing: ['pigsty', 'bigbarn'], buyPrice: 2600, baseSellPrice: 2200, product: 'truffle', productInterval: 2, feedPerDay: 3, growDays: [4, 6], pregnancyDays: 6, meat: 'pork', meatQty: 5, unlockSkill: 'l_pig', art: { body: 0xf2b4b0, accent: 0xd98a8a, dark: 0xb86a6a, size: 'large' } },
  { id: 'alpaca', name: '알파카', prefix: 'ALP', housing: ['sheepbarn', 'bigbarn'], buyPrice: 6000, baseSellPrice: 4600, product: 'alpaca_wool', productInterval: 3, feedPerDay: 2, growDays: [5, 7], pregnancyDays: 7, meat: null, meatQty: 0, unlockSkill: 'l_rare', rare: true, art: { body: 0xf0e2c8, accent: 0xb8946a, dark: 0x6a5440, size: 'medium' } },
  { id: 'goose', name: '거위', prefix: 'GOS', housing: ['duckhouse'], buyPrice: 1100, baseSellPrice: 820, product: 'goose_egg', productInterval: 2, feedPerDay: 1, growDays: [4, 5], pregnancyDays: 4, meat: 'goose_meat', meatQty: 3, unlockSkill: 'l_poultry2', art: { body: 0xfbfbf6, accent: 0xf09a2a, dark: 0xc9c9c0, size: 'small' } },
  { id: 'turkey', name: '칠면조', prefix: 'TRK', housing: ['coop'], buyPrice: 1200, baseSellPrice: 900, product: 'turkey_egg', productInterval: 2, feedPerDay: 2, growDays: [4, 5], pregnancyDays: 4, meat: 'turkey_meat', meatQty: 3, unlockSkill: 'l_poultry2', art: { body: 0x7a5a3a, accent: 0xd8342c, dark: 0x4a3626, size: 'small' } },
  { id: 'buffalo', name: '물소', prefix: 'BUF', housing: ['cowbarn', 'bigbarn'], buyPrice: 7000, baseSellPrice: 5600, product: 'buffalo_milk', productInterval: 2, feedPerDay: 4, growDays: [6, 8], pregnancyDays: 8, meat: 'buffalo_meat', meatQty: 6, unlockSkill: 'l_rare', rare: true, art: { body: 0x5a5250, accent: 0x2e2a28, dark: 0xd9cbb4, size: 'large' } },
  { id: 'ostrich', name: '타조', prefix: 'OST', housing: ['bigbarn'], buyPrice: 9000, baseSellPrice: 7200, product: 'ostrich_egg', productInterval: 4, feedPerDay: 3, growDays: [6, 8], pregnancyDays: 7, meat: 'ostrich_meat', meatQty: 6, unlockSkill: 'l_rare', rare: true, art: { body: 0x3a3230, accent: 0xf2e6d8, dark: 0xd9a09a, size: 'large' } },
];

export const ANIMAL_BY_ID: Record<string, AnimalData> = Object.fromEntries(ANIMALS.map((a) => [a.id, a]));

/** 동물 특성 (개체당 최대 3개) */
export interface TraitData {
  id: string;
  name: string;
  desc: string;
  rarity: number; // 돌연변이 가중치 (낮을수록 희귀)
  fx: {
    productMul?: number;
    growthMul?: number;
    feedMul?: number;
    meatMul?: number;
    sellMul?: number;
    affectionMul?: number;
    twinChance?: number;
    health?: number;
    intervalDelta?: number;
    pregnancyMul?: number;
    gradeBonus?: number;
  };
}

export const TRAITS: TraitData[] = [
  { id: 'fertile', name: '다산', desc: '쌍둥이 출산 확률 +20%', rarity: 10, fx: { twinChance: 0.2 } },
  { id: 'producer', name: '생산형', desc: '생산량 +20%', rarity: 10, fx: { productMul: 1.2 } },
  { id: 'fastgrow', name: '빠른 성장', desc: '성장 기간 -30%', rarity: 10, fx: { growthMul: 0.7 } },
  { id: 'healthy', name: '건강체', desc: '건강 +15', rarity: 10, fx: { health: 15 } },
  { id: 'large', name: '대형 체격', desc: '고기 +25%, 판매가 +10%', rarity: 8, fx: { meatMul: 1.25, sellMul: 1.1 } },
  { id: 'longlived', name: '장수', desc: '판매가 +10%, 애정 +20%', rarity: 8, fx: { sellMul: 1.1, affectionMul: 1.2 } },
  { id: 'gentle', name: '온순함', desc: '애정 상승 +50%', rarity: 10, fx: { affectionMul: 1.5 } },
  { id: 'lighteater', name: '소식가', desc: '사료 소비 -30%', rarity: 9, fx: { feedMul: 0.7 } },
  { id: 'bigeater', name: '대식가', desc: '사료 +30%, 생산량 +15%', rarity: 9, fx: { feedMul: 1.3, productMul: 1.15 } },
  { id: 'goodgenes', name: '우수 유전자', desc: '자손 상위 등급 확률 증가', rarity: 5, fx: { gradeBonus: 0.06 } },
  { id: 'diligent', name: '부지런함', desc: '생산 간격 -1일 (최소 1일)', rarity: 6, fx: { intervalDelta: -1 } },
  { id: 'cheerful', name: '명랑함', desc: '애정 상승 +30%, 생산량 +5%', rarity: 9, fx: { affectionMul: 1.3, productMul: 1.05 } },
  { id: 'sturdy', name: '튼튼한 다리', desc: '판매가 +15%', rarity: 8, fx: { sellMul: 1.15 } },
  { id: 'colorvar', name: '색소 변이', desc: '희귀 외형, 판매가 +30%', rarity: 3, fx: { sellMul: 1.3 } },
  { id: 'finemeat', name: '고급 육질', desc: '고기 +30%', rarity: 6, fx: { meatMul: 1.3 } },
  { id: 'fluffy', name: '풍성한 털', desc: '털 생산량 +30%', rarity: 7, fx: { productMul: 1.3 } },
  { id: 'easybirth', name: '순산', desc: '임신 기간 -25%', rarity: 8, fx: { pregnancyMul: 0.75 } },
  { id: 'immune', name: '강한 면역', desc: '건강 +25', rarity: 7, fx: { health: 25 } },
  { id: 'popular', name: '인기쟁이', desc: '판매가 +20%', rarity: 6, fx: { sellMul: 1.2 } },
  { id: 'golden', name: '황금빛', desc: '판매가 +50%, 생산량 +10%', rarity: 1, fx: { sellMul: 1.5, productMul: 1.1 } },
];

export const TRAIT_BY_ID: Record<string, TraitData> = Object.fromEntries(TRAITS.map((t) => [t.id, t]));

/** 등급별 기본 능력치 범위 */
export const GRADE_STAT_RANGE: Record<1 | 2 | 3, [number, number]> = {
  3: [25, 55],
  2: [45, 75],
  1: [65, 95],
};

export const GROWTH_STAGE_NAME = { baby: '아기', juvenile: '청소년', adult: '성체' } as const;
