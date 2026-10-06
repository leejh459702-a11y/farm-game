/**
 * 유물 — 광산 · 낚시 · 채집에서 드물게 발견. 첫 발견은 도감 등록 + 보상,
 * 중복 유물은 특급상인에게 비싸게 팔 수 있다. 세트를 모두 모으면 특별 보상.
 */
export type ArtifactSource = 'mine' | 'fishing' | 'forage';

export interface ArtifactData {
  id: string;
  name: string;
  desc: string;
  set: string;
  source: ArtifactSource;
  price: number;
  /** 첫 발견 보상 골드 */
  firstReward: number;
  color: number;
  shape: 'tool' | 'pouch' | 'shard' | 'charm' | 'coin' | 'gear' | 'tablet' | 'bottle' | 'fossil' | 'hook' | 'lamp' | 'map';
}

export const ARTIFACTS: ArtifactData[] = [
  // 옛 농부의 유품 (채집 상자 · 지오드)
  { id: 'art_sickle', name: '녹슨 낫', desc: '오래전 이 땅을 일구던 농부의 낫.', set: 'farmer', source: 'forage', price: 600, firstReward: 300, color: 0x9a6a4a, shape: 'tool' },
  { id: 'art_seed_pouch', name: '낡은 씨앗 주머니', desc: '안에 이름 모를 씨앗 몇 알이 남아 있다.', set: 'farmer', source: 'forage', price: 700, firstReward: 300, color: 0xb8945a, shape: 'pouch' },
  { id: 'art_pot_shard', name: '토기 조각', desc: '곡식을 담던 항아리의 조각.', set: 'farmer', source: 'mine', price: 500, firstReward: 300, color: 0xc8845a, shape: 'shard' },
  { id: 'art_harvest_charm', name: '풍년 부적', desc: '풍년을 빌던 작은 부적.', set: 'farmer', source: 'forage', price: 900, firstReward: 500, color: 0xe0b040, shape: 'charm' },
  // 물가의 유물 (낚시)
  { id: 'art_fossil_fish', name: '물고기 화석', desc: '돌 속에 잠든 아주 오래된 물고기.', set: 'water', source: 'fishing', price: 900, firstReward: 400, color: 0xb8b0a0, shape: 'fossil' },
  { id: 'art_old_hook', name: '은빛 낚싯바늘', desc: '누군가 아끼던 낚싯바늘.', set: 'water', source: 'fishing', price: 700, firstReward: 300, color: 0xd8dce8, shape: 'hook' },
  { id: 'art_glass_bottle', name: '물빛 유리병', desc: '파도에 깎여 반들반들한 유리병.', set: 'water', source: 'fishing', price: 650, firstReward: 300, color: 0x7ac8d8, shape: 'bottle' },
  { id: 'art_river_coin', name: '강바닥 동전', desc: '어느 시대의 것인지 모를 동전.', set: 'water', source: 'fishing', price: 800, firstReward: 400, color: 0xd8a040, shape: 'coin' },
  // 광산의 비밀 (광산)
  { id: 'art_miner_lamp', name: '광부의 등잔', desc: '깊은 갱도를 밝히던 등잔.', set: 'mine', source: 'mine', price: 1200, firstReward: 500, color: 0xc8a040, shape: 'lamp' },
  { id: 'art_gear', name: '고대 톱니바퀴', desc: '용도를 알 수 없는 정교한 톱니.', set: 'mine', source: 'mine', price: 1500, firstReward: 600, color: 0x8a8a90, shape: 'gear' },
  { id: 'art_star_map', name: '별자리 지도', desc: '광산 깊은 곳에서 발견된 돌판 지도.', set: 'mine', source: 'mine', price: 2000, firstReward: 800, color: 0x4a5a8a, shape: 'map' },
  { id: 'art_tablet', name: '문자 석판', desc: '읽을 수 없는 글자가 새겨진 석판.', set: 'mine', source: 'mine', price: 1800, firstReward: 800, color: 0x8a857c, shape: 'tablet' },
];

export const ARTIFACT_BY_ID: Record<string, ArtifactData> = Object.fromEntries(ARTIFACTS.map((a) => [a.id, a]));

export const ARTIFACT_SETS: Record<string, { name: string; reward: { gold?: number; items?: { id: string; qty: number }[]; build?: string }; rewardText: string }> = {
  farmer: { name: '옛 농부의 유품', reward: { gold: 3000, items: [{ id: 'seed_goldenmelon', qty: 3 }] }, rewardText: '3,000G + 황금멜론 씨앗 3개' },
  water: { name: '물가의 유물', reward: { gold: 3000, items: [{ id: 'rare_bait', qty: 10 }] }, rewardText: '3,000G + 희귀 미끼 10개' },
  mine: { name: '광산의 비밀', reward: { gold: 6000, build: 'fountain' }, rewardText: '6,000G + 분수 장식' },
};

/** 소스별로 랜덤 유물 하나 */
export function artifactsFrom(source: ArtifactSource | 'any'): ArtifactData[] {
  return source === 'any' ? ARTIFACTS : ARTIFACTS.filter((a) => a.source === source);
}
