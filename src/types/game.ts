/** 게임 전역 공용 타입 정의 — 순수 데이터 (Phaser 비의존) */

export type SeasonId = 'spring' | 'summer' | 'autumn' | 'winter';
export type WeatherId = 'sunny' | 'cloudy' | 'rain' | 'storm' | 'snow';
export type ItemCategory = 'crop' | 'animal' | 'fish' | 'forage' | 'resource' | 'processed' | 'cooking' | 'seed' | 'other' | 'artifact';
export type Grade = 1 | 2 | 3;
export type Gender = 'F' | 'M';
export type GrowthStage = 'baby' | 'juvenile' | 'adult';
export type Facing = 'down' | 'up' | 'left' | 'right';
export type ToolId = 'hand' | 'hoe' | 'water' | 'seed' | 'fertilizer' | 'feed' | 'shovel';

export interface ItemStack {
  itemId: string;
  qty: number;
  /** 0~100. undefined = 신선도 없음 */
  freshness?: number;
  /** 판매가 보너스 (물고기 크기 등, 0~0.1) */
  bonus?: number;
}

export type ContainerKind = 'bag' | 'chest' | 'warehouse' | 'fridge' | 'coldStorage' | 'bigWarehouse' | 'output';

export interface Container {
  id: string;
  kind: ContainerKind;
  slots: (ItemStack | null)[];
  /** 신선도 감소 배율 (1 = 일반, 0.4 = 60% 감소) */
  decayMul: number;
}

export interface PlotUpgrades {
  irrigation: number;
  soil: number;
  pest: number;
  autoHarvest: number;
}

export interface Plot {
  x: number;
  y: number;
  cropId: string | null;
  /** 심은 날 (게임 날짜) */
  plantedDay: number;
  /** 성장 진행일 — 하루 종료 시 물을 준 날만 정확히 +1 */
  growthProgressDays: number;
  /** 오늘 물을 받았는가 (비/관개/온실 자동 포함) */
  wateredToday: boolean;
  /** 수확 가능 */
  mature: boolean;
  /** 표시 단계 1(새싹)~4(수확 가능), 0 = 작물 없음 */
  currentStage: number;
  /** 재수확 대기 중 */
  regrowing: boolean;
  harvests: number;
  fertilizer: { id: string; daysLeft: number } | null;
  upgrades: PlotUpgrades;
  /** 온실 내부 슬롯이면 해당 건물 uid */
  greenhouse?: string;
}

export interface ProcessJob {
  recipeId: string;
  /** 남은 게임 분(min) */
  remaining: number;
  total: number;
}

export interface SpiritInst {
  id: string;
  kind: string;
  name: string;
  fedToday: boolean;
  /** 다음 생산까지 (먹이 준 날만 줄어듦) */
  timer: number;
  /** 유대감 0~100 — 조합 조건 */
  bond: number;
}

export interface CellarSlot {
  itemId: string;
  qty: number;
  /** 넣은 날 */
  startDay: number;
  /** 넣기 전 보너스 (숙성 보너스는 이보다 낮아지지 않음) */
  baseBonus: number;
  freshness?: number;
  /** 마지막으로 알린 단계 보너스 */
  notified?: number;
}

export interface BuildingInstance {
  uid: string;
  type: string;
  x: number;
  y: number;
  /** 0 = 기본, 1 = 90° 회전 (w,h 교환) */
  rot: 0 | 1;
  /** 보관 시설 컨테이너 id */
  containerId?: string;
  /** 축사 */
  animalIds?: string[];
  upgrades?: Record<string, number>;
  dirt?: number;
  /** 축사 생산물 대기 (자동 수거 전) */
  outputId?: string;
  /** 가공 시설 */
  queue?: ProcessJob[];
  autoInput?: boolean;
  autoRecipe?: string | null;
  /** 장식 스킨 */
  skin?: string;
  /** 숙성고 */
  cellar?: { slots: (CellarSlot | null)[] };
  /** 정령의 사당 */
  shrine?: { spirits: SpiritInst[]; fusing: { a: string; b: string; kind: string; daysLeft: number } | null };
  /** 양식장 */
  pond?: { fishId: string | null; count: number; tier: number; fedToday: boolean; born: number };
}

export interface AnimalTraitRef {
  id: string;
}

export interface Animal {
  id: string; // e.g. COW-000127
  species: string;
  name: string;
  gender: Gender;
  /** 나이 (일) */
  age: number;
  grade: Grade;
  stage: GrowthStage;
  stats: { productivity: number; growth: number; health: number; fertility: number; physique: number };
  traits: string[];
  motherId: string | null;
  fatherId: string | null;
  childIds: string[];
  births: number;
  produced: number;
  /** 친밀도 0~100 — 희귀 생산물·특성 유전·브리딩 보너스 */
  affection: number;
  /** 행복도 0~100 — 생산 주기·생산량·브리딩 성공률 */
  happiness: number;
  fedToday: boolean;
  pettedToday: boolean;
  /** 생산 카운트다운 (일) */
  productTimer: number;
  pregnant: { fatherId: string; daysLeft: number } | null;
  breedCooldown: number;
  buildingUid: string | null;
  lineage: string | null;
  bornDay: number;
  /** 출하 진행 */
  shipping?: { daysLeft: number } | null;
  favorite?: boolean;
}

/** 혈통 기록 (판매/출하 후에도 유지) */
export interface PedigreeRecord {
  id: string;
  species: string;
  name: string;
  gender: Gender;
  grade: Grade;
  motherId: string | null;
  fatherId: string | null;
  traits: string[];
  lineage: string | null;
  status: 'alive' | 'sold' | 'shipped';
}

export interface ShopEntry {
  kind: 'item' | 'animal' | 'deco';
  id: string;
  price: number;
  stock: number;
  /** 동물 판매 시 미리 생성된 개체 정보 */
  animal?: { gender: Gender; grade: Grade; traits: string[] };
  special?: boolean;
}

export interface MerchantState {
  nextVisitDay: number;
  present: boolean;
  special: boolean;
  /** 특급상인 미등장 연속 횟수 (비공개 보정) */
  missStreak: number;
  sellBonus: number;
  discount: number;
  stock: ShopEntry[];
  visits: number;
  /** 이번에 찾아온 상인 종류 */
  kind?: 'general' | 'livestock' | 'fishing' | 'mineral' | 'artisan' | 'seasonal' | 'collector' | 'special';
}

export interface Ledger {
  income: number;
  expense: number;
  sales: Record<string, { qty: number; gold: number }>;
  births: number;
  discoveries: string[];
  builds: string[];
  farmingXp: number;
  livestockXp: number;
  landBought: number;
}

export interface MonthSummary {
  year: number;
  monthIndex: number;
  income: number;
  expense: number;
  operatingCost: number;
  net: number;
  topQtyItem: string | null;
  topGoldItem: string | null;
  births: number;
  landGained: number;
  farmValueStart: number;
  farmValueEnd: number;
}

export interface FinanceState {
  today: Ledger;
  month: Ledger;
  months: MonthSummary[];
  /** 지난달 판매수익 */
  lastMonthSales: number;
  /** 미납 운영비 */
  debt: number;
  totalEarned: number;
  monthStartFarmValue: number;
  dailyIncome: number[]; // 최근 30일
}

export interface CodexEntry {
  discovered: boolean;
  count: number;
  bestPrice: number;
}

export interface AnimalCodexEntry {
  discovered: boolean;
  grades: Grade[];
  traits: string[];
  breedCount: number;
  bestAnimalId: string | null;
  bestScore: number;
  produced: number;
}

export type RegionId = 'river' | 'forest' | 'hill' | 'mine';

/** 외곽 지역 자원 노드 */
export interface RegionNode {
  id: string;
  kind: 'forage' | 'tree' | 'rock' | 'chest' | 'ladder';
  x: number;
  y: number;
  /** 채집물 id / 바위 종류 id */
  itemId?: string;
  hp: number;
  maxHp: number;
  big?: boolean;
  /** 고갈된 경우 다시 생기는 날 (null = 활성) */
  respawnDay: number | null;
}

export interface RegionState {
  nodes: RegionNode[];
  /** 마지막으로 아침 생성을 한 날 */
  lastGen: number;
}

export interface FishRecord {
  count: number;
  maxSize: number;
  bestPrice: number;
}

export interface Blueprint {
  id: string;
  name: string;
  createdDay: number;
  buildings: { uid: string; type: string; x: number; y: number; rot: 0 | 1 }[];
}

export interface HotbarState {
  selected: number;
  seedId: string | null;
  fertilizerId: string | null;
  /** 대량 작업 범위 (1 = 1칸, 3 = 3×3) */
  area: 1 | 3;
}

export interface GameState {
  version: number;
  meta: {
    farmName: string;
    createdAt: number;
    savedAt: number;
    playTimeSec: number;
  };
  rng: number;
  uid: number;
  time: { day: number; elapsed: number };
  weather: { today: WeatherId; tomorrow: WeatherId };
  gold: number;
  land: { owned: number[]; boughtAtLevel: number; totalBought: number };
  house: { level: number };
  buildings: Record<string, BuildingInstance>;
  plots: Record<string, Plot>;
  containers: Record<string, Container>;
  player: { x: number; y: number; facing: Facing };
  hotbar: HotbarState;
  skills: { farmingXp: number; livestockXp: number; businessXp: number; researched: string[] };
  animals: Record<string, Animal>;
  pedigree: Record<string, PedigreeRecord>;
  animalCounters: Record<string, number>;
  merchant: MerchantState;
  finance: FinanceState;
  codex: {
    items: Record<string, CodexEntry>;
    animals: Record<string, AnimalCodexEntry>;
    buildings: string[];
  };
  tutorial: { step: number; done: boolean; flags: Record<string, boolean> };
  blueprints: Blueprint[];
  /** 건설 인벤토리 (구매한 장식 등 무료 설치 가능 수량) */
  buildStock: Record<string, number>;
  bagUpgrades: number;
  /** 즐겨찾기 아이템 */
  favorites: string[];
  /** 마지막 브리딩 부적 사용 여부 */
  breedCharmActive: boolean;
  /** 생활 숙련도 (선택 콘텐츠) */
  life: { fishingXp: number; foragingXp: number };
  /** 도구 단계 (0 기본 ~ 3 고급), 낚싯대 보유 여부 */
  tools: { axe: number; pickaxe: number; rod: number; rodOwned: boolean };
  regions: Record<RegionId, RegionState>;
  regionsDiscovered: boolean;
  fishRecords: Record<string, FishRecord>;
  stats: {
    totalHarvested: number;
    totalSold: number;
    daysPlayed: number;
    animalsBorn: number;
  };
  /** 누적 활동 카운터 (농장일지·통계용) — key 예: harvest:carrot, craft:mayo, pond:stock */
  counters: Record<string, number>;
  /** 농장일지: 보상 받은 항목 / 달성 알림을 띄운 항목 */
  journal: { claimed: string[]; notified: string[] };
  /** 광산 진행 */
  mine: { floor: number; deepest: number; genKey: string; broken: number; ladder: boolean };
  /** 유물: 발견한 것 / 세트 보상 받은 것 */
  artifacts: { found: string[]; setsClaimed: string[] };
  /** 연구 컬렉션 제출 현황 / 완료 */
  collections: { progress: Record<string, Record<string, number>>; done: string[] };
  /** 읽은 스킬북 (영구 효과) */
  books: string[];
  /** 농업 교환권 */
  tickets: { have: number; codexAwarded: number; total: number };
  /** 곤충 정원: 오늘 찾아온 곤충 / 종별 관찰 수 */
  insects: { day: number; today: { id: string; insect: string; x: number; y: number; caught: boolean }[]; caught: Record<string, number> };
  /** 만난 정령 종류 (도감) */
  spiritsSeen: string[];
}

export interface Settings {
  bgmVolume: number;
  sfxVolume: number;
  ambientVolume: number;
  uiVolume: number;
  uiScale: number;
  cameraSpeed: number;
  vibration: boolean;
  joystickOpacity: number;
  controlMode: 'joystick' | 'tap';
  fpsLimit: 30 | 60;
  screenShake: boolean;
  autosave: boolean;
  showDaySummary: boolean;
}
