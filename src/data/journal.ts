/**
 * 농장일지 — NPC 퀘스트 대신 "다음에 해 볼 만한 것"을 알려 주는 기록장.
 * 강제 목표가 아니다: 언제 해도 되고, 안 해도 된다. 달성하면 작은 보상.
 * progress(w) 는 게임 상태에서 계산되므로 따로 추적할 필요가 없다.
 */
import type { World } from '../core/World';

export interface JournalReward {
  gold?: number;
  items?: { id: string; qty: number }[];
  /** 농사/목축 경험치 */
  xp?: { tree: 'farming' | 'livestock'; n: number };
  /** 생활 숙련도 경험치 */
  lifeXp?: { skill: 'fishing' | 'foraging'; n: number };
  /** 건설 보관함에 장식/설계도 지급 */
  build?: { id: string; qty: number };
}

export interface JournalEntry {
  id: string;
  chapter: string;
  title: string;
  hint: string;
  icon: string;
  need: number;
  progress: (w: World) => number;
  reward: JournalReward;
}

const c = (w: World, key: string) => w.state.counters?.[key] ?? 0;
const has = (w: World, type: string) => Object.values(w.state.buildings).some((b) => b.type === type);
const produced = (w: World, id: string) => w.state.codex.items[id]?.count ?? 0;

export const JOURNAL: JournalEntry[] = [
  // ───── 첫 걸음 ─────
  { id: 'harvest_carrot', chapter: '첫 걸음', title: '첫 수확', hint: '당근 3개를 수확해 보세요', icon: 'it_carrot', need: 3, progress: (w) => c(w, 'harvest:carrot'), reward: { gold: 300, items: [{ id: 'seed_potato', qty: 5 }] } },
  { id: 'land_2', chapter: '첫 걸음', title: '땅 넓히기', hint: '이웃한 땅을 2칸 사 보세요', icon: 'ic_land', need: 2, progress: (w) => w.state.land.totalBought, reward: { items: [{ id: 'wood', qty: 20 }] } },
  { id: 'harvest_30', chapter: '첫 걸음', title: '부지런한 농부', hint: '작물을 30개 수확해 보세요', icon: 'tool_hoe', need: 30, progress: (w) => c(w, 'harvest'), reward: { gold: 800, items: [{ id: 'basic_fertilizer', qty: 5 }] } },
  // ───── 목축 ─────
  { id: 'coop', chapter: '목축', title: '첫 축산', hint: '닭장을 지어 보세요 (기술 연구 → 닭)', icon: 'bld_coop', need: 1, progress: (w) => (has(w, 'coop') ? 1 : 0), reward: { items: [{ id: 'hay', qty: 30 }], xp: { tree: 'livestock', n: 40 } } },
  { id: 'eggs', chapter: '목축', title: '아침의 달걀', hint: '달걀 10개를 얻어 보세요', icon: 'it_egg', need: 10, progress: (w) => produced(w, 'egg'), reward: { items: [{ id: 'treat', qty: 3 }] } },
  { id: 'happy', chapter: '목축', title: '행복한 동물', hint: '행복도 80 이상인 동물을 키워 보세요', icon: 'ic_happy', need: 1, progress: (w) => (Object.values(w.state.animals).some((a) => (a.happiness ?? 0) >= 80) ? 1 : 0), reward: { items: [{ id: 'golden_feed', qty: 1 }] } },
  { id: 'breed', chapter: '목축', title: '첫 브리딩', hint: '동물을 1회 교배해 보세요', icon: 'ic_breed', need: 1, progress: (w) => c(w, 'breed'), reward: { items: [{ id: 'breed_charm', qty: 1 }], xp: { tree: 'livestock', n: 80 } } },
  // ───── 가공 ─────
  { id: 'mayo', chapter: '가공', title: '첫 가공', hint: '달걀로 마요네즈를 만들어 보세요 (가공소)', icon: 'it_mayonnaise', need: 1, progress: (w) => c(w, 'craft:mayonnaise'), reward: { gold: 600, xp: { tree: 'farming', n: 40 } } },
  { id: 'cook', chapter: '가공', title: '첫 요리', hint: '주방에서 요리를 3번 만들어 보세요', icon: 'ic_cook', need: 3, progress: (w) => Object.entries(w.state.counters ?? {}).reduce((s, [k, v]) => s + (k.startsWith('craft:') && ['bread', 'omelette', 'grilled_fish', 'salad', 'potato_pancake', 'bibimbap'].includes(k.slice(6)) ? v : 0), 0), reward: { items: [{ id: 'flour', qty: 3 }, { id: 'butter', qty: 2 }] } },
  { id: 'aging', chapter: '가공', title: '기다림의 맛', hint: '숙성고에서 숙성을 1번 완료해 보세요', icon: 'it_cheese', need: 1, progress: (w) => c(w, 'aging:done'), reward: { gold: 2000 } },
  // ───── 생활 ─────
  { id: 'fish_1', chapter: '생활', title: '첫 낚시', hint: '강가에서 물고기를 낚아 보세요', icon: 'ic_fish', need: 1, progress: (w) => c(w, 'fish'), reward: { items: [{ id: 'rare_bait', qty: 2 }] } },
  { id: 'forage_15', chapter: '생활', title: '숲 산책', hint: '채집을 15번 해 보세요', icon: 'ic_forage', need: 15, progress: (w) => c(w, 'forage'), reward: { lifeXp: { skill: 'foraging', n: 60 } } },
  { id: 'chop_10', chapter: '생활', title: '나무꾼', hint: '나무를 10번 베어 보세요', icon: 'tool_axe', need: 10, progress: (w) => c(w, 'chop'), reward: { items: [{ id: 'wood', qty: 30 }] } },
  { id: 'mine_10', chapter: '생활', title: '돌 깨기', hint: '바위를 10번 캐 보세요', icon: 'tool_pickaxe', need: 10, progress: (w) => c(w, 'mine'), reward: { items: [{ id: 'stone', qty: 30 }, { id: 'coal', qty: 5 }] } },
  { id: 'mine_5', chapter: '생활', title: '광산 탐험', hint: '광산 5층까지 내려가 보세요 (연구 [폐광 탐사])', icon: 'ic_mine', need: 5, progress: (w) => w.state.mine?.deepest ?? 0, reward: { items: [{ id: 'geode', qty: 2 }], lifeXp: { skill: 'foraging', n: 80 } } },
  { id: 'artifact_1', chapter: '생활', title: '첫 유물', hint: '광산·낚시·채집 상자에서 유물을 찾아보세요', icon: 'it_art_gear', need: 1, progress: (w) => w.state.artifacts?.found.length ?? 0, reward: { gold: 1000 } },
  // ───── 양식 ─────
  { id: 'pond', chapter: '양식', title: '양식장 짓기', hint: '낚시 Lv.3 에서 연구 [양식]을 하면 양식장을 지을 수 있어요', icon: 'bld_fishpond', need: 1, progress: (w) => (has(w, 'fishpond') ? 1 : 0), reward: { items: [{ id: 'fish_feed', qty: 20 }] } },
  { id: 'pond_3', chapter: '양식', title: '첫 양식', hint: '양식장에 물고기 3마리를 넣어 보세요', icon: 'ic_fish', need: 3, progress: (w) => c(w, 'pond:stock'), reward: { items: [{ id: 'fish_feed', qty: 30 }], lifeXp: { skill: 'fishing', n: 60 } } },
  { id: 'roe', chapter: '양식', title: '알이 생겼어요', hint: '양식장에서 어란을 5개 얻어 보세요', icon: 'it_roe_carp', need: 5, progress: (w) => Object.entries(w.state.codex.items).reduce((s, [k, v]) => s + (k.startsWith('roe_') ? v.count : 0), 0), reward: { gold: 1500 } },
  // ───── 성장 ─────
  { id: 'house_2', chapter: '성장', title: '더 넓은 집', hint: '집을 Lv.2 로 올려 보세요', icon: 'ic_house', need: 2, progress: (w) => w.state.house.level, reward: { gold: 1000 } },
  { id: 'land_20', chapter: '성장', title: '넓은 농장', hint: '땅을 20칸 더 사 보세요', icon: 'ic_land', need: 20, progress: (w) => w.state.land.totalBought, reward: { items: [{ id: 'growth_fertilizer', qty: 5 }], build: { id: 'bench', qty: 1 } } },
  { id: 'legend', chapter: '성장', title: '전설과의 만남', hint: '전설의 물고기를 낚아 보세요 (계절·시간·날씨가 맞아야 해요)', icon: 'it_golden_catfish', need: 1, progress: (w) => c(w, 'fish:legend'), reward: { gold: 5000, build: { id: 'fountain', qty: 1 } } },
];

export const JOURNAL_BY_ID: Record<string, JournalEntry> = Object.fromEntries(JOURNAL.map((e) => [e.id, e]));
export const JOURNAL_CHAPTERS = [...new Set(JOURNAL.map((e) => e.chapter))];
