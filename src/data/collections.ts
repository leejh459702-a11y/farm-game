/**
 * 연구 컬렉션 — 특정 아이템을 모아 제출하면 보상. 제출은 나눠서 해도 된다.
 * 태그(#roe 등)로 "아무거나"를 받을 수도 있다.
 */
export interface CollectionReward {
  gold?: number;
  items?: { id: string; qty: number }[];
  /** 건설 보관함 (무료 설치권) */
  build?: { id: string; qty: number };
  /** 다음 단계 도구 무료 업그레이드 */
  tool?: 'axe' | 'pickaxe' | 'rod';
}

export interface CollectionData {
  id: string;
  name: string;
  icon: string;
  items: { id: string; qty: number }[];
  reward: CollectionReward;
  rewardText: string;
}

export const COLLECTIONS: CollectionData[] = [
  { id: 'c_spring', name: '봄 작물 연구', icon: 'ic_spring', items: [{ id: 'carrot', qty: 5 }, { id: 'potato', qty: 5 }, { id: 'lettuce', qty: 5 }, { id: 'strawberry', qty: 5 }], reward: { items: [{ id: 'book_farmer', qty: 1 }] }, rewardText: '스킬북: 농부의 비밀노트' },
  { id: 'c_summer', name: '여름 작물 연구', icon: 'ic_summer', items: [{ id: 'tomato', qty: 5 }, { id: 'corn', qty: 5 }, { id: 'watermelon', qty: 2 }, { id: 'blueberry', qty: 5 }], reward: { items: [{ id: 'seed_mango', qty: 1 }], gold: 2000 }, rewardText: '망고 묘목 + 2,000G' },
  { id: 'c_autumn', name: '가을 작물 연구', icon: 'ic_autumn', items: [{ id: 'pumpkin', qty: 3 }, { id: 'grape', qty: 5 }, { id: 'rice', qty: 8 }, { id: 'sweetpotato', qty: 5 }], reward: { build: { id: 'greenhouse', qty: 1 } }, rewardText: '온실 무료 설치권' },
  { id: 'c_winter', name: '겨울 작물 연구', icon: 'ic_winter', items: [{ id: 'spinach', qty: 5 }, { id: 'broccoli', qty: 3 }, { id: 'garlic', qty: 5 }, { id: 'wintercabbage', qty: 3 }], reward: { items: [{ id: 'seed_yuzu', qty: 1 }], gold: 2000 }, rewardText: '유자 묘목 + 2,000G' },
  { id: 'c_livestock', name: '축산 연구', icon: 'ic_livestock', items: [{ id: 'egg', qty: 10 }, { id: 'milk', qty: 5 }, { id: 'wool', qty: 3 }, { id: 'goat_milk', qty: 3 }], reward: { build: { id: 'breeding', qty: 1 }, items: [{ id: 'book_genetics', qty: 1 }] }, rewardText: '브리딩 시설 무료 설치권 + 유전학 노트' },
  { id: 'c_fish_spring', name: '봄 물고기 연구', icon: 'ic_fish', items: [{ id: 'crucian', qty: 2 }, { id: 'minnow', qty: 2 }, { id: 'ricefish', qty: 2 }, { id: 'carp', qty: 1 }], reward: { items: [{ id: 'rare_bait', qty: 15 }] }, rewardText: '희귀 미끼 15개' },
  { id: 'c_roe', name: '양식 연구', icon: 'it_roe_carp', items: [{ id: '#roe', qty: 10 }, { id: 'pondweed', qty: 5 }], reward: { items: [{ id: 'book_fishing', qty: 1 }] }, rewardText: '스킬북: 낚시 기록집' },
  { id: 'c_ore', name: '광산 연구', icon: 'tool_pickaxe', items: [{ id: 'copper_ore', qty: 10 }, { id: 'iron_ore', qty: 8 }, { id: 'silver_ore', qty: 5 }, { id: 'gold_ore', qty: 3 }], reward: { tool: 'pickaxe' }, rewardText: '곡괭이 한 단계 무료 업그레이드' },
  { id: 'c_gem', name: '보석 연구', icon: 'it_amethyst', items: [{ id: 'amethyst', qty: 2 }, { id: 'ruby', qty: 1 }, { id: 'emerald', qty: 1 }], reward: { items: [{ id: 'book_miner', qty: 1 }] }, rewardText: '스킬북: 광부의 기록' },
  { id: 'c_forest', name: '숲 연구', icon: 'ic_forage', items: [{ id: 'shiitake', qty: 5 }, { id: 'herb', qty: 5 }, { id: 'chestnut', qty: 5 }, { id: 'wild_strawberry', qty: 5 }], reward: { tool: 'axe', gold: 1000 }, rewardText: '도끼 한 단계 무료 업그레이드 + 1,000G' },
  { id: 'c_artisan', name: '장인 연구', icon: 'ic_process', items: [{ id: 'cheese', qty: 3 }, { id: 'wine', qty: 2 }, { id: 'mayonnaise', qty: 3 }, { id: 'bread', qty: 3 }], reward: { items: [{ id: 'book_aging', qty: 1 }] }, rewardText: '스킬북: 숙성 장인의 책' },
];

export const COLLECTION_BY_ID: Record<string, CollectionData> = Object.fromEntries(COLLECTIONS.map((c) => [c.id, c]));
