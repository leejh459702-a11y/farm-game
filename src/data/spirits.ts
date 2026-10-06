/**
 * 희귀 생물(정령) — 엔드게임 선택 콘텐츠. 일반 축산과 분리된 '정령의 사당'에서 키운다.
 * 재료를 바쳐 불러내고, 좋아하는 먹이를 주면 희귀 재료를 만든다. 두 정령을 조합하면 변종이 태어난다.
 * 정령은 떠나거나 죽지 않는다. 먹이를 안 주면 그날 생산만 쉰다.
 */
export interface SpiritData {
  id: string;
  name: string;
  desc: string;
  /** 불러내기 재료 (변종은 조합으로만) */
  summon?: { id: string; qty: number }[];
  /** 좋아하는 먹이 (하나만 있으면 됨) */
  foods: string[];
  product: string;
  interval: number;
  /** 변종: 두 부모 종 */
  parents?: [string, string];
  color: number;
  glow: number;
}

export const SPIRITS: SpiritData[] = [
  { id: 'forest_spirit', name: '숲정령', desc: '숲의 기운이 모인 작은 정령.', summon: [{ id: 'herb', qty: 5 }, { id: 'wild_ginseng', qty: 1 }, { id: 'wood', qty: 20 }], foods: ['herb', 'shiitake', 'wild_strawberry', 'wild_blueberry'], product: 'spirit_leaf', interval: 2, color: 0x7ac85a, glow: 0xc8f0a0 },
  { id: 'water_spirit', name: '물정령', desc: '맑은 물방울이 살아 움직인다.', summon: [{ id: 'pearl', qty: 1 }, { id: 'pondweed', qty: 5 }, { id: 'clam', qty: 5 }], foods: ['pondweed', 'watercress', 'clam'], product: 'spirit_dew', interval: 2, color: 0x5aa8e0, glow: 0xb8e8ff },
  { id: 'stone_spirit', name: '돌정령', desc: '오래된 바위에서 깨어난 듬직한 정령.', summon: [{ id: 'amethyst', qty: 2 }, { id: 'stone', qty: 30 }], foods: ['stone', 'clay', 'coal'], product: 'spirit_crystal', interval: 3, color: 0x9a958c, glow: 0xd8d0e0 },
  { id: 'fire_spirit', name: '불정령', desc: '따뜻한 불씨 같은 정령. 겨울에 특히 기운차다.', summon: [{ id: 'ruby', qty: 1 }, { id: 'coal', qty: 15 }], foods: ['coal', 'pepper', 'sap'], product: 'ember_core', interval: 3, color: 0xe0603a, glow: 0xf6c870 },
  { id: 'moon_spirit', name: '달빛정령', desc: '밤에만 은은하게 빛나는 신비한 정령.', summon: [{ id: 'moonstone', qty: 1 }, { id: 'wildflower', qty: 5 }], foods: ['wildflower', 'grape', 'wild_blueberry'], product: 'moon_dust', interval: 3, color: 0xc8d0f8, glow: 0xf6f6ff },
  // 변종 (조합)
  { id: 'dew_spirit', name: '이슬정령', desc: '숲과 물이 만나 태어난 정령.', parents: ['forest_spirit', 'water_spirit'], foods: ['herb', 'pondweed', 'watercress'], product: 'dew_pearl', interval: 3, color: 0x7ad8c0, glow: 0xe0fff6 },
  { id: 'lava_spirit', name: '용암정령', desc: '돌과 불이 만나 태어난 뜨거운 정령.', parents: ['stone_spirit', 'fire_spirit'], foods: ['coal', 'stone', 'pepper'], product: 'lava_gem', interval: 4, color: 0xd8482a, glow: 0xffb040 },
  { id: 'star_spirit', name: '별빛정령', desc: '달빛과 물빛이 만나 반짝이는 정령.', parents: ['moon_spirit', 'water_spirit'], foods: ['grape', 'clam', 'wildflower'], product: 'starlight_drop', interval: 4, color: 0xf6e070, glow: 0xfffbe0 },
  { id: 'bloom_spirit', name: '꽃정령', desc: '숲과 달빛 아래 피어난 꽃의 정령.', parents: ['forest_spirit', 'moon_spirit'], foods: ['wildflower', 'herb', 'wild_strawberry'], product: 'bloom_petal', interval: 3, color: 0xf2a0c8, glow: 0xffe8f4 },
];

export const SPIRIT_BY_ID: Record<string, SpiritData> = Object.fromEntries(SPIRITS.map((s) => [s.id, s]));

/** 정령 생산물 (희귀 제작 재료) */
export const SPIRIT_PRODUCTS: [string, string, number][] = [
  ['spirit_leaf', '정령의 잎', 800],
  ['spirit_dew', '정령의 이슬', 900],
  ['spirit_crystal', '정령 수정', 1000],
  ['ember_core', '불씨의 핵', 1100],
  ['moon_dust', '달가루', 1400],
  ['dew_pearl', '이슬 진주', 2200],
  ['lava_gem', '용암 보석', 2600],
  ['starlight_drop', '별빛 방울', 3000],
  ['bloom_petal', '영원의 꽃잎', 2400],
];

export const SHRINE_CAPACITY = 6;
export const FUSE_DAYS = 3;
export const FUSE_MIN_BOND = 50;
