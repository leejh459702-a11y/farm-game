/** 방문상인 상품 구성 데이터 */

/** 일반 상인이 항상 취급 가능한 기본 상품 (itemId, 판매가, 재고, 필요 연구) */
export const MERCHANT_BASICS: { id: string; price: number; stock: number; skill?: string }[] = [
  { id: 'hay', price: 15, stock: 60 },
  { id: 'wood', price: 8, stock: 99 },
  { id: 'stone', price: 8, stock: 99 },
  { id: 'clay', price: 12, stock: 40 },
  { id: 'brick', price: 40, stock: 20 },
  { id: 'basic_fertilizer', price: 45, stock: 20, skill: 'f_fert1' },
  { id: 'growth_fertilizer', price: 90, stock: 15, skill: 'f_fert1' },
  { id: 'premium_fertilizer', price: 180, stock: 10, skill: 'f_fert2' },
  { id: 'treat', price: 60, stock: 10, skill: 'l_chicken' },
  { id: 'fish_feed', price: 10, stock: 40 },
];

/** 일반 상인이 가끔 가져오는 장식 (건설 인벤토리로 들어감) */
export const MERCHANT_DECOS: { id: string; price: number }[] = [
  { id: 'flowerpot', price: 70 },
  { id: 'lamp', price: 260 },
  { id: 'bench', price: 180 },
  { id: 'scarecrow', price: 220 },
  { id: 'mailbox', price: 130 },
  { id: 'signpost', price: 90 },
];

/** 특급상인 전용 상품 */
export const SPECIAL_ITEMS: { id: string; price: number; stock: number }[] = [
  { id: 'special_fertilizer', price: 400, stock: 10 },
  { id: 'breed_charm', price: 1500, stock: 2 },
  { id: 'golden_feed', price: 300, stock: 5 },
  { id: 'rare_bait', price: 120, stock: 5 },
  { id: 'copper_ore', price: 40, stock: 20 },
  { id: 'iron_ore', price: 80, stock: 15 },
];
export const SPECIAL_DECOS: { id: string; price: number }[] = [
  { id: 'cherrytree', price: 1500 },
  { id: 'goldstatue', price: 3000 },
  { id: 'fountain', price: 4000 },
];
export const RARE_SEEDS = ['goldenmelon', 'ginseng', 'rainbowrose', 'starfruit', 'snowlotus', 'mango', 'yuzu'];

/** 상인 대사 */
export const MERCHANT_LINES = {
  normal: ['좋은 물건이 많네요! 오늘은 이런 것들을 가져왔습니다.', '안녕하세요, 농부님! 오늘도 들렀어요.', '농장이 점점 멋져지네요!', '신선한 작물은 언제든 환영이에요.'],
  special: ['특급 상인 도착! 귀한 물건들을 잔뜩 가져왔지요.', '오늘만 특별한 가격! 놓치지 마세요.', '먼 곳에서 희귀한 것들을 가져왔답니다.'],
};

/** 방문상인 종류 — NPC 마을 대신 다양한 상인이 번갈아 찾아온다 */
export type MerchantKind = 'general' | 'livestock' | 'fishing' | 'mineral' | 'artisan' | 'seasonal' | 'collector' | 'special';

export const MERCHANT_KINDS: Record<MerchantKind, { name: string; desc: string; weight: number; line: string }> = {
  general: { name: '일반 상인', desc: '씨앗 · 기본 재료', weight: 40, line: '씨앗이랑 기본 재료 가득 가져왔어요!' },
  livestock: { name: '목축 상인', desc: '동물 · 사료', weight: 14, line: '튼튼한 동물들을 데려왔답니다.' },
  fishing: { name: '낚시 상인', desc: '미끼 · 양식 용품', weight: 12, line: '물가 사람에게 필요한 건 다 있죠.' },
  mineral: { name: '광물 상인', desc: '광석 · 시설 재료', weight: 12, line: '좋은 광석 들여가세요. 건축 재료도 있어요.' },
  artisan: { name: '장인 상인', desc: '가공 시설 · 숙성 · 제작 설비', weight: 10, line: '장인의 설비를 싸게 드릴게요.' },
  seasonal: { name: '계절 상인', desc: '이번 계절 한정 상품', weight: 8, line: '이 계절에만 파는 물건이에요!' },
  collector: { name: '수집 상인', desc: '유물 · 희귀품 고가 매입', weight: 4, line: '유물이나 희귀한 물건, 비싸게 사 드려요.' },
  special: { name: '특급상인', desc: '희귀 씨앗 · 희귀 동물 · 스킬북 · 특별 장식', weight: 0, line: '' },
};

/** 계절 상인 한정 장식 */
export const SEASONAL_DECOS: Record<string, { id: string; price: number }[]> = {
  spring: [{ id: 'cherrytree', price: 1300 }, { id: 'flowerbed', price: 100 }],
  summer: [{ id: 'fountain', price: 3600 }, { id: 'sapling', price: 150 }],
  autumn: [{ id: 'scarecrow', price: 180 }, { id: 'haybale', price: 50 }],
  winter: [{ id: 'lamp', price: 220 }, { id: 'goldstatue', price: 2800 }],
};
