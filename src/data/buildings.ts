import type { ContainerKind } from '../types/game';

export type BuildingCategory = 'house' | 'storage' | 'utility' | 'animal' | 'production' | 'decoration';
export type StationId = 'processor' | 'kitchen' | 'loom' | 'butcher' | 'compost';

export interface BuildingData {
  id: string;
  name: string;
  w: number;
  h: number;
  category: BuildingCategory;
  price: number;
  unlockSkill?: string;
  /** 직사각형이면 회전 가능 */
  rotatable: boolean;
  spriteKey: string;
  storage?: { kind: ContainerKind; slots: number; decayMul: number };
  /** 건설 재료 (벌목·채광 자원) */
  materials?: { id: string; qty: number }[];
  animalCapacity?: number;
  station?: StationId;
  /** 동시에 돌릴 수 있는 가공 슬롯 */
  queueSize?: number;
  /** 아름다움 점수 (상인 판매 보너스에 소폭 반영) */
  beauty: number;
  /** 아무 분야나 마스터리 연구 1개 필요 */
  unlockMastery?: boolean;
  /** 생활 숙련도 조건 (예: 낚시 Lv.3) */
  unlockLife?: { skill: 'fishing' | 'foraging'; level: number };
  /** 상점(건설 카탈로그)에 표시하지 않음 — 특급상인 등으로만 획득 */
  hidden?: boolean;
  /** 야간 조명 */
  light?: boolean;
  desc: string;
}

const b = (d: Omit<BuildingData, 'rotatable' | 'spriteKey' | 'beauty'> & Partial<BuildingData>): BuildingData => ({
  rotatable: d.w !== d.h,
  spriteKey: `bld_${d.id}`,
  beauty: 0,
  ...d,
});

export const BUILDINGS: BuildingData[] = [
  b({ id: 'house', name: '집', w: 2, h: 2, category: 'house', price: 0, desc: '나의 보금자리. 탭하면 하루를 마칠 수 있다.', light: true }),
  // 소형
  b({ id: 'chest', materials: [{ id: 'wood', qty: 5 }], name: '보관상자', w: 1, h: 1, category: 'storage', price: 150, storage: { kind: 'chest', slots: 12, decayMul: 1 }, desc: '12칸 보관. 신선도 보호 없음.' }),
  b({ id: 'compost', materials: [{ id: 'wood', qty: 10 }], name: '퇴비통', w: 1, h: 1, category: 'utility', price: 400, unlockSkill: 'f_compost', station: 'compost', queueSize: 2, desc: '부패물을 퇴비로 바꾼다.' }),
  b({ id: 'well', materials: [{ id: 'stone', qty: 20 }], name: '우물', w: 1, h: 1, category: 'utility', price: 600, beauty: 4, desc: '시골 농장의 상징. 농장 아름다움 +4.' }),
  // 장식 (1×1)
  b({ id: 'fence', materials: [{ id: 'wood', qty: 2 }], name: '나무 울타리', w: 1, h: 1, category: 'decoration', price: 30, beauty: 1, desc: '소박한 나무 울타리.' }),
  b({ id: 'flowerpot', materials: [{ id: 'clay', qty: 2 }], name: '화분', w: 1, h: 1, category: 'decoration', price: 80, beauty: 2, desc: '알록달록 꽃 화분.' }),
  b({ id: 'flowerbed', name: '꽃밭', w: 1, h: 1, category: 'decoration', price: 120, beauty: 3, desc: '작은 꽃밭.' }),
  b({ id: 'lamp', materials: [{ id: 'copper_ore', qty: 1 }, { id: 'stone', qty: 2 }], name: '가로등', w: 1, h: 1, category: 'decoration', price: 300, beauty: 3, light: true, desc: '밤을 따뜻하게 밝힌다.' }),
  b({ id: 'bench', materials: [{ id: 'wood', qty: 6 }], name: '벤치', w: 1, h: 1, category: 'decoration', price: 200, beauty: 3, desc: '잠시 쉬어가는 벤치.' }),
  b({ id: 'scarecrow', materials: [{ id: 'wood', qty: 4 }], name: '허수아비', w: 1, h: 1, category: 'decoration', price: 250, beauty: 3, desc: '정겨운 허수아비.' }),
  b({ id: 'haybale', name: '건초더미', w: 1, h: 1, category: 'decoration', price: 60, beauty: 1, desc: '포근한 건초더미.' }),
  b({ id: 'stonepath', materials: [{ id: 'stone', qty: 2 }], name: '돌길', w: 1, h: 1, category: 'decoration', price: 20, beauty: 1, desc: '징검다리 돌길.' }),
  b({ id: 'signpost', materials: [{ id: 'wood', qty: 3 }], name: '표지판', w: 1, h: 1, category: 'decoration', price: 100, beauty: 2, desc: '농장 표지판.' }),
  b({ id: 'mailbox', materials: [{ id: 'copper_ore', qty: 1 }], name: '우체통', w: 1, h: 1, category: 'decoration', price: 150, beauty: 2, desc: '빨간 우체통.' }),
  b({ id: 'sapling', name: '작은 나무', w: 1, h: 1, category: 'decoration', price: 180, beauty: 3, desc: '그늘을 만드는 작은 나무.' }),
  b({ id: 'cherrytree', name: '벚나무', w: 1, h: 1, category: 'decoration', price: 1500, beauty: 10, hidden: true, desc: '특급상인의 희귀 장식.' }),
  b({ id: 'goldstatue', name: '황금 닭 동상', w: 1, h: 1, category: 'decoration', price: 3000, beauty: 18, hidden: true, desc: '특급상인의 희귀 장식.' }),
  b({ id: 'fountain', name: '분수', w: 2, h: 2, category: 'decoration', price: 4000, beauty: 22, hidden: true, desc: '특급상인의 희귀 장식.' }),
  // 축산
  b({ id: 'coop', materials: [{ id: 'wood', qty: 30 }, { id: 'stone', qty: 10 }], name: '닭장', w: 2, h: 2, category: 'animal', price: 2000, unlockSkill: 'l_chicken', animalCapacity: 6, desc: '닭·칠면조 사육.' }),
  b({ id: 'duckhouse', materials: [{ id: 'wood', qty: 30 }, { id: 'stone', qty: 10 }], name: '오리장', w: 2, h: 2, category: 'animal', price: 2600, unlockSkill: 'l_duck', animalCapacity: 6, desc: '오리·거위 사육.' }),
  b({ id: 'rabbithutch', materials: [{ id: 'wood', qty: 25 }], name: '토끼장', w: 2, h: 2, category: 'animal', price: 2800, unlockSkill: 'l_rabbit', animalCapacity: 6, desc: '토끼 사육.' }),
  b({ id: 'sheepbarn', materials: [{ id: 'wood', qty: 50 }, { id: 'stone', qty: 20 }], name: '양/염소 축사', w: 2, h: 3, category: 'animal', price: 5000, unlockSkill: 'l_sheep', animalCapacity: 6, desc: '양·염소·알파카 사육.' }),
  b({ id: 'cowbarn', materials: [{ id: 'wood', qty: 60 }, { id: 'stone', qty: 30 }], name: '젖소 축사', w: 3, h: 3, category: 'animal', price: 9000, unlockSkill: 'l_cow', animalCapacity: 4, desc: '젖소·물소 사육.' }),
  b({ id: 'pigsty', materials: [{ id: 'wood', qty: 50 }, { id: 'stone', qty: 30 }], name: '돼지 축사', w: 3, h: 3, category: 'animal', price: 8000, unlockSkill: 'l_pig', animalCapacity: 4, desc: '돼지 사육.' }),
  b({ id: 'bigbarn', materials: [{ id: 'wood', qty: 100 }, { id: 'stone', qty: 50 }, { id: 'iron_ore', qty: 10 }], name: '대형 축사', w: 4, h: 3, category: 'animal', price: 22000, unlockSkill: 'l_bigBarn', animalCapacity: 8, desc: '대형 동물 사육 (타조 포함).' }),
  // 생산·저장
  b({ id: 'warehouse', materials: [{ id: 'wood', qty: 40 }, { id: 'stone', qty: 20 }], name: '소형 창고', w: 2, h: 2, category: 'storage', price: 2500, unlockSkill: 'f_storage1', storage: { kind: 'warehouse', slots: 60, decayMul: 1 }, desc: '60칸 보관.' }),
  b({ id: 'fridge', materials: [{ id: 'stone', qty: 30 }, { id: 'copper_ore', qty: 10 }], name: '냉장창고', w: 2, h: 2, category: 'storage', price: 7000, unlockSkill: 'f_cold', storage: { kind: 'fridge', slots: 40, decayMul: 0.4 }, desc: '40칸. 신선도 감소 60% 억제.' }),
  b({ id: 'bigwarehouse', materials: [{ id: 'wood', qty: 80 }, { id: 'stone', qty: 50 }], name: '대형 창고', w: 3, h: 3, category: 'storage', price: 15000, unlockSkill: 'f_bigStorage', storage: { kind: 'bigWarehouse', slots: 150, decayMul: 1 }, desc: '150칸 대용량 보관.' }),
  b({ id: 'coldstorage', materials: [{ id: 'stone', qty: 60 }, { id: 'iron_ore', qty: 20 }], name: '대형 저온창고', w: 3, h: 3, category: 'storage', price: 30000, unlockSkill: 'f_coldBig', storage: { kind: 'coldStorage', slots: 100, decayMul: 0.15 }, desc: '100칸. 신선도 감소 85% 억제.' }),
  b({ id: 'processor', materials: [{ id: 'stone', qty: 30 }, { id: 'clay', qty: 10 }], name: '가공소', w: 2, h: 2, category: 'production', price: 6000, unlockSkill: 'f_processing', station: 'processor', queueSize: 3, desc: '버터·치즈·밀가루·잼 등.' }),
  b({ id: 'kitchen', materials: [{ id: 'wood', qty: 30 }, { id: 'brick', qty: 10 }], name: '주방', w: 2, h: 2, category: 'production', price: 9000, unlockSkill: 'f_kitchen', station: 'kitchen', queueSize: 3, desc: '고부가가치 요리.' }),
  b({ id: 'loom', materials: [{ id: 'wood', qty: 40 }], name: '방직소', w: 2, h: 2, category: 'production', price: 7000, unlockSkill: 'l_weaving', station: 'loom', queueSize: 3, desc: '털 → 실 → 원단.' }),
  b({ id: 'butcher', materials: [{ id: 'stone', qty: 40 }, { id: 'iron_ore', qty: 5 }], name: '육가공소', w: 3, h: 2, category: 'production', price: 12000, unlockSkill: 'l_meat', station: 'butcher', queueSize: 3, desc: '동물 출하 및 육가공.' }),
  b({ id: 'breeding', materials: [{ id: 'wood', qty: 40 }, { id: 'stone', qty: 20 }], name: '브리딩 시설', w: 3, h: 2, category: 'production', price: 8000, unlockSkill: 'l_breeding', desc: '암수를 골라 브리딩.' }),
  b({ id: 'greenhouse', materials: [{ id: 'wood', qty: 50 }, { id: 'copper_ore', qty: 20 }, { id: 'clay', qty: 10 }], name: '온실', w: 3, h: 3, category: 'production', price: 25000, unlockSkill: 'f_greenhouse', desc: '내부 9칸. 계절 제한 없이 재배, 자동 급수.' }),
  b({ id: 'cellar', materials: [{ id: 'stone', qty: 40 }, { id: 'wood', qty: 20 }, { id: 'brick', qty: 10 }], name: '숙성고', w: 2, h: 2, category: 'production', price: 7000, unlockSkill: 'f_aging', desc: '치즈·와인·김치 등을 숙성해 가치를 높인다. 넣어 둔 동안 신선도가 떨어지지 않는다.' }),
  b({ id: 'spirit_shrine', materials: [{ id: 'stone', qty: 60 }, { id: 'gold_ore', qty: 5 }, { id: 'amethyst', qty: 2 }], name: '정령의 사당', w: 2, h: 2, category: 'production', price: 30000, unlockMastery: true, beauty: 8, desc: '희귀 생물(정령)을 불러내 키우는 곳. 아무 분야나 마스터리 연구 1개 필요.' }),
  b({ id: 'fishpond', materials: [{ id: 'stone', qty: 40 }, { id: 'wood', qty: 20 }, { id: 'clay', qty: 10 }], name: '양식장', w: 3, h: 3, category: 'production', price: 5000, unlockSkill: 'fi_pond', desc: '한 종류의 물고기를 키워 어란·물고기·특수 재료를 얻는다.' }),
  b({ id: 'breedlab', materials: [{ id: 'stone', qty: 80 }, { id: 'iron_ore', qty: 30 }, { id: 'gold_ore', qty: 5 }], name: '브리딩 연구소', w: 4, h: 3, category: 'production', price: 60000, unlockSkill: 'l_breedLab', desc: '브리딩 상위 등급 확률 증가, 쌍둥이 확률 증가.' }),
];

export const BUILDING_BY_ID: Record<string, BuildingData> = Object.fromEntries(BUILDINGS.map((x) => [x.id, x]));

/** 회전을 고려한 실제 점유 크기 */
export function footprint(type: string, rot: 0 | 1): { w: number; h: number } {
  const d = BUILDING_BY_ID[type];
  return rot === 1 ? { w: d.h, h: d.w } : { w: d.w, h: d.h };
}

export const BUILD_CATEGORY_NAME: Record<BuildingCategory, string> = {
  house: '집',
  storage: '저장',
  utility: '설비',
  animal: '축산',
  production: '생산',
  decoration: '장식',
};
