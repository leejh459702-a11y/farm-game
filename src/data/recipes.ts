import type { StationId } from './buildings';

export interface RecipeData {
  id: string;
  station: StationId;
  /** 결과물 아이템 */
  output: string;
  outputName: string;
  outQty: number;
  inputs: { id: string; qty: number }[];
  /** 게임 분 단위 소요 시간 (게임 하루 = 1440분) */
  minutes: number;
  unlockSkill?: string;
  /** 재료 기본가 합계 대비 결과물 가치 배율 */
  valueMul: number;
  /** 결과물 하루 신선도 감소 (0 = 보존식품) */
  decay: number;
  category: 'processed' | 'cooking' | 'other';
}

const r = (
  id: string,
  station: StationId,
  outputName: string,
  inputs: [string, number][],
  minutes: number,
  valueMul: number,
  decay: number,
  extra: Partial<RecipeData> = {},
): RecipeData => ({
  id,
  station,
  output: id,
  outputName,
  outQty: 1,
  inputs: inputs.map(([iid, qty]) => ({ id: iid, qty })),
  minutes,
  valueMul,
  decay,
  category: station === 'kitchen' ? 'cooking' : station === 'compost' ? 'other' : 'processed',
  ...extra,
});

export const RECIPES: RecipeData[] = [
  // ───── 가공소 ─────
  r('butter', 'processor', '버터', [['milk', 2]], 240, 1.45, 1),
  r('cheese', 'processor', '치즈', [['milk', 2]], 360, 1.6, 0.5),
  r('goat_cheese', 'processor', '염소치즈', [['goat_milk', 2]], 360, 1.6, 0.5),
  r('mozzarella', 'processor', '모차렐라', [['buffalo_milk', 1]], 360, 1.6, 1),
  r('mayonnaise', 'processor', '마요네즈', [['egg', 2]], 180, 1.5, 1),
  r('flour', 'processor', '밀가루', [['wheat', 2]], 120, 1.4, 0),
  r('rice_flour', 'processor', '쌀가루', [['rice', 2]], 120, 1.4, 0),
  r('strawberry_jam', 'processor', '딸기잼', [['strawberry', 2]], 240, 1.5, 0),
  r('grape_jam', 'processor', '포도잼', [['grape', 2]], 240, 1.5, 0),
  r('blueberry_jam', 'processor', '블루베리잼', [['blueberry', 4]], 240, 1.5, 0),
  r('apple_jam', 'processor', '사과잼', [['apple', 2]], 240, 1.5, 0),
  r('tangerine_jam', 'processor', '감귤청', [['tangerine', 2]], 240, 1.5, 0),
  r('pickle', 'processor', '오이피클', [['cucumber', 2]], 240, 1.45, 0),
  r('tomato_sauce', 'processor', '토마토소스', [['tomato', 2]], 180, 1.4, 0.5),
  r('peanut_butter', 'processor', '땅콩버터', [['peanut', 3]], 240, 1.5, 0),
  r('sunflower_oil', 'processor', '해바라기유', [['sunflower', 1]], 240, 1.45, 0),
  r('pepper_powder', 'processor', '고춧가루', [['pepper', 3]], 180, 1.45, 0),
  r('grape_juice', 'processor', '포도주스', [['grape', 3]], 300, 1.55, 1),
  r('truffle_oil', 'processor', '트러플오일', [['truffle', 1]], 360, 1.6, 0),
  r('dried_persimmon', 'processor', '곶감', [['persimmon', 2]], 300, 1.5, 0),
  r('peach_jam', 'processor', '복숭아잼', [['peach', 2]], 240, 1.5, 0),
  r('lemonade', 'kitchen', '레모네이드', [['lemon', 2], ['sugar', 1]], 90, 1.9, 6),
  r('yuzu_tea', 'processor', '유자차', [['yuzu', 1], ['sugar', 1]], 240, 1.6, 0),
  // ───── 방직소 ─────
  r('yarn', 'loom', '실', [['wool', 1]], 180, 1.4, 0),
  r('angora_yarn', 'loom', '앙고라실', [['rabbit_wool', 1]], 180, 1.45, 0),
  r('alpaca_yarn', 'loom', '알파카실', [['alpaca_wool', 1]], 240, 1.45, 0),
  r('fabric', 'loom', '원단', [['yarn', 2]], 300, 1.4, 0),
  r('fine_fabric', 'loom', '고급 원단', [['alpaca_yarn', 2]], 360, 1.5, 0),
  r('knit_scarf', 'loom', '앙고라 목도리', [['angora_yarn', 2]], 360, 1.5, 0),
  // ───── 육가공소 ─────
  r('sausage', 'butcher', '소시지', [['pork', 1]], 240, 1.5, 2),
  r('ham', 'butcher', '햄', [['pork', 2]], 360, 1.6, 1),
  r('bacon', 'butcher', '베이컨', [['pork', 1], ['pepper_powder', 1]], 300, 1.55, 1),
  r('beef_jerky', 'butcher', '육포', [['beef', 1]], 360, 1.6, 0),
  r('smoked_chicken', 'butcher', '훈제 닭', [['chicken_meat', 2]], 300, 1.55, 1),
  r('smoked_duck', 'butcher', '훈제 오리', [['duck_meat', 2]], 300, 1.55, 1),
  // ───── 주방 (요리 — 고부가가치) ─────
  r('bread', 'kitchen', '빵', [['flour', 1], ['egg', 1]], 180, 1.8, 6),
  r('potato_pancake', 'kitchen', '감자전', [['potato', 3], ['flour', 1]], 150, 1.8, 10),
  r('kimchi', 'kitchen', '김치', [['cabbage', 1], ['pepper_powder', 1], ['garlic', 1], ['greenonion', 1]], 240, 1.9, 1),
  r('winter_kimchi', 'kitchen', '겨울김치', [['wintercabbage', 1], ['pepper_powder', 1], ['garlic', 1]], 240, 1.9, 1),
  r('bibimbap', 'kitchen', '비빔밥', [['rice', 2], ['spinach', 1], ['carrot', 1], ['egg', 1]], 180, 2.0, 12),
  r('pumpkin_porridge', 'kitchen', '호박죽', [['pumpkin', 1], ['rice', 1]], 210, 1.8, 10),
  r('strawberry_cake', 'kitchen', '딸기 케이크', [['flour', 1], ['milk', 1], ['egg', 1], ['strawberry', 2]], 300, 2.1, 10),
  r('omelette', 'kitchen', '오믈렛', [['egg', 2], ['milk', 1]], 120, 1.8, 12),
  r('tomato_pasta', 'kitchen', '토마토 파스타', [['flour', 1], ['tomato_sauce', 1]], 180, 1.9, 12),
  r('roasted_sweetpotato', 'kitchen', '군고구마', [['sweetpotato', 3]], 120, 1.8, 8),
  r('watermelon_punch', 'kitchen', '수박화채', [['watermelon', 1], ['milk', 1]], 150, 1.8, 14),
  r('cheese_pizza', 'kitchen', '치즈 피자', [['flour', 1], ['cheese', 1], ['tomato_sauce', 1]], 300, 2.0, 10),
  r('corn_soup', 'kitchen', '옥수수 수프', [['corn', 2], ['milk', 1], ['butter', 1]], 210, 1.9, 10),
  r('apple_pie', 'kitchen', '사과 파이', [['flour', 1], ['butter', 1], ['apple', 2]], 300, 2.0, 8),
  r('steak', 'kitchen', '스테이크', [['beef', 1], ['butter', 1], ['garlic', 1]], 240, 2.0, 14),
  r('pork_wrap', 'kitchen', '쌈밥 정식', [['pork', 1], ['lettuce', 2], ['garlic', 1], ['rice', 1]], 240, 2.0, 14),
  r('salad', 'kitchen', '채소 샐러드', [['lettuce', 1], ['tomato', 1], ['cucumber', 1]], 90, 1.8, 16),
  r('curry_rice', 'kitchen', '카레라이스', [['rice', 1], ['potato', 1], ['carrot', 1], ['onion', 1]], 240, 1.9, 12),
  r('pea_soup', 'kitchen', '완두콩 수프', [['pea', 3], ['milk', 1]], 180, 1.8, 12),
  r('broccoli_gratin', 'kitchen', '브로콜리 그라탱', [['broccoli', 1], ['cheese', 1], ['milk', 1]], 240, 1.9, 10),
  r('rice_cake', 'kitchen', '떡', [['rice_flour', 2]], 240, 1.8, 6),
  r('radish_soup', 'kitchen', '뭇국', [['radish', 1], ['beef', 1], ['greenonion', 1]], 210, 1.9, 12),
  r('tangerine_tart', 'kitchen', '감귤 타르트', [['flour', 1], ['butter', 1], ['tangerine_jam', 1]], 300, 2.0, 8),
  r('truffle_risotto', 'kitchen', '트러플 리소토', [['rice', 2], ['truffle_oil', 1], ['cheese', 1]], 300, 2.1, 10),
  r('ostrich_omelette', 'kitchen', '타조알 오믈렛', [['ostrich_egg', 1], ['milk', 1], ['onion', 1]], 240, 2.0, 12),
  // ───── 생활 콘텐츠 연결 (물고기·채집·자원) ─────
  r('grilled_fish', 'kitchen', '생선구이', [['#fish', 1]], 120, 1.9, 12),
  r('spicy_fish_stew', 'kitchen', '매운탕', [['#fish', 2], ['pepper_powder', 1], ['greenonion', 1]], 240, 2.0, 12),
  r('fish_rice_bowl', 'kitchen', '생선 덮밥', [['#fish', 1], ['rice', 1], ['onion', 1]], 180, 2.0, 12),
  r('eel_rice', 'kitchen', '장어덮밥', [['eel', 1], ['rice', 1]], 240, 2.1, 10),
  r('mushroom_soup', 'kitchen', '버섯 수프', [['#mushroom', 2], ['milk', 1]], 180, 1.9, 10),
  r('mushroom_rice', 'kitchen', '버섯밥', [['#mushroom', 1], ['rice', 2]], 180, 1.9, 10),
  r('roasted_chestnut', 'kitchen', '군밤', [['chestnut', 3]], 90, 1.8, 6),
  r('acorn_jelly', 'kitchen', '도토리묵', [['acorn', 4]], 240, 1.9, 8),
  r('clam_soup', 'kitchen', '조개탕', [['#seafood', 2], ['greenonion', 1]], 150, 1.9, 12),
  r('fern_bibim', 'kitchen', '산나물 비빔밥', [['fern', 2], ['rice', 1], ['egg', 1]], 180, 2.0, 12),
  r('wild_berry_jam', 'processor', '산딸기잼', [['#berry', 4]], 240, 1.5, 0),
  r('herbal_tea', 'processor', '약초차', [['herb', 2]], 180, 1.6, 0),
  r('maple_syrup', 'processor', '수액 시럽', [['sap', 3]], 300, 1.6, 0),
  r('brick', 'processor', '벽돌', [['clay', 2], ['coal', 1]], 180, 1.4, 0, { category: 'other' }),
  r('shell_fertilizer', 'processor', '조개 비료', [['#shell', 3]], 240, 1.2, 0, { output: 'basic_fertilizer', outQty: 2, category: 'other' }),
  r('herb_feed', 'processor', '약초 사료 (특제 사료)', [['herb', 2], ['hay', 3]], 240, 1.2, 0, { output: 'golden_feed', category: 'other' }),
  r('smoked_fish', 'butcher', '훈제 생선', [['#fish', 2], ['wood', 2]], 300, 1.7, 1),
  // ───── 가공 확장 (가공할수록 가치 상승) ─────
  r('wine', 'processor', '와인', [['grape_juice', 2]], 720, 1.7, 0),
  r('fruit_wine', 'processor', '과일주', [['#fruit', 4]], 720, 1.65, 0),
  r('premium_cheese', 'processor', '고급 치즈', [['buffalo_milk', 2]], 480, 1.7, 0.5),
  r('peanut_oil', 'processor', '땅콩기름', [['peanut', 4]], 300, 1.5, 0),
  r('sugar', 'processor', '설탕', [['sugarbeet', 2]], 240, 1.45, 0),
  r('caviar', 'processor', '캐비아', [['#roe', 3]], 360, 1.8, 2),
  r('honey_cake', 'kitchen', '설탕 쿠키', [['flour', 1], ['sugar', 1], ['butter', 1]], 180, 2.0, 6),
  r('fruit_jam_tart', 'kitchen', '잼 타르트', [['flour', 1], ['sugar', 1], ['strawberry_jam', 1]], 240, 2.0, 8),
  r('sandwich', 'kitchen', '햄 샌드위치', [['bread', 1], ['ham', 1], ['lettuce', 1]], 120, 2.0, 10),
  r('bread_plate', 'kitchen', '버터 빵 모둠', [['bread', 2], ['butter', 1]], 90, 1.9, 6),
  r('melon_dessert', 'kitchen', '멜론 빙수', [['melon', 1], ['milk', 1], ['sugar', 1]], 150, 2.0, 14),
  r('roe_rice', 'kitchen', '알밥', [['#roe', 2], ['rice', 1], ['egg', 1]], 180, 2.0, 12),
  r('fish_feed', 'processor', '양식 사료', [['wheat', 2]], 120, 1.0, 0, { outQty: 5, category: 'other' }),
  r('good_bait', 'processor', '좋은 미끼', [['wheat', 1], ['herb', 1]], 90, 1.0, 0, { outQty: 6, category: 'other' }),
  r('bait_craft', 'processor', '희귀 미끼', [['#fish', 1], ['herb', 1]], 120, 1.0, 0, { output: 'rare_bait', outQty: 3, category: 'other', unlockSkill: 'fi_bait' }),
  // ───── 퇴비통 ─────
  r('compost', 'compost', '퇴비', [['rotten', 3]], 1440, 0, 0, { unlockSkill: 'f_compost' }),
];

export const RECIPE_BY_ID: Record<string, RecipeData> = Object.fromEntries(RECIPES.map((x) => [x.id, x]));

export const STATION_NAME: Record<StationId, string> = {
  processor: '가공소',
  kitchen: '주방',
  loom: '방직소',
  butcher: '육가공소',
  compost: '퇴비통',
};
