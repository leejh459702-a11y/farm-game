import { BALANCE } from '../data/balance';
import type { GameState, Ledger } from '../types/game';

export const SAVE_VERSION = 5;

export function emptyLedger(): Ledger {
  return { income: 0, expense: 0, sales: {}, births: 0, discoveries: [], builds: [], farmingXp: 0, livestockXp: 0, landBought: 0 };
}

export function createNewGame(seed = (Date.now() ^ 0x9e3779b9) >>> 0, farmName = '나의 작은 농장'): GameState {
  const { maxWidth: W, maxHeight: H } = BALANCE.farm;
  const owned = new Array(W * H).fill(0);
  const { originX, originY, size } = BALANCE.start;
  for (let y = originY; y < originY + size; y++) for (let x = originX; x < originX + size; x++) owned[y * W + x] = 1;

  const bagSlots = new Array(BALANCE.start.bagSlots).fill(null);
  BALANCE.start.items.forEach((it, i) => (bagSlots[i] = { itemId: it.itemId, qty: it.qty }));

  const ts = BALANCE.farm.tileSize;
  return {
    version: SAVE_VERSION,
    meta: { farmName, createdAt: Date.now(), savedAt: 0, playTimeSec: 0 },
    rng: seed,
    uid: 1,
    time: { day: 0, elapsed: 0 },
    weather: { today: 'sunny', tomorrow: 'sunny' },
    gold: BALANCE.start.gold,
    land: { owned, boughtAtLevel: 0, totalBought: 0 },
    house: { level: 1 },
    buildings: {},
    plots: {},
    containers: { bag: { id: 'bag', kind: 'bag', slots: bagSlots, decayMul: 1 } },
    player: { x: (originX + size / 2) * ts, y: (originY + size + 0.6) * ts, facing: 'up' },
    hotbar: { selected: 0, seedId: 'seed_carrot', fertilizerId: null, area: 1 },
    skills: { farmingXp: 0, livestockXp: 0, businessXp: 0, researched: [] },
    animals: {},
    pedigree: {},
    animalCounters: {},
    merchant: { nextVisitDay: 9999, present: false, special: false, missStreak: 0, sellBonus: 0, discount: 0, stock: [], visits: 0 },
    finance: { today: emptyLedger(), month: emptyLedger(), months: [], lastMonthSales: 0, debt: 0, totalEarned: 0, monthStartFarmValue: 0, dailyIncome: [] },
    codex: { items: {}, animals: {}, buildings: [] },
    tutorial: { step: 0, done: false, flags: {} },
    blueprints: [],
    buildStock: { chest: 1 },
    bagUpgrades: 0,
    favorites: [],
    breedCharmActive: false,
    life: { fishingXp: 0, foragingXp: 0 },
    tools: { axe: 0, pickaxe: 0, rod: 0, rodOwned: false },
    regions: { river: { nodes: [], lastGen: -1 }, forest: { nodes: [], lastGen: -1 }, hill: { nodes: [], lastGen: -1 }, mine: { nodes: [], lastGen: -1 } },
    regionsDiscovered: false,
    fishRecords: {},
    stats: { totalHarvested: 0, totalSold: 0, daysPlayed: 0, animalsBorn: 0 },
    counters: {},
    journal: { claimed: [], notified: [] },
    mine: { floor: 1, deepest: 0, genKey: '', broken: 0, ladder: false },
    artifacts: { found: [], setsClaimed: [] },
    collections: { progress: {}, done: [] },
    books: [],
    tickets: { have: 0, codexAwarded: 0, total: 0 },
    insects: { day: -1, today: [], caught: {} },
    spiritsSeen: [],
  };
}
