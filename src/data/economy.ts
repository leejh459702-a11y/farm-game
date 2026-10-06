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
