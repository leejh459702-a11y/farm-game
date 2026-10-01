import { BalanceConfig as B } from '../data/balance';
import type { GameState, Ledger } from '../types';
export const key = (x: number, y: number) => `${x},${y}`;
export const ledger = (): Ledger => ({
  sales: 0,
  expenses: 0,
  farmXp: 0,
  animalXp: 0,
  births: 0,
  land: 0,
  discoveries: [],
  sold: {},
  facilities: 0,
});
export function createState(name = '나의 작은 농장'): GameState {
  const tiles: GameState['tiles'] = {};
  for (let y = 14; y < 17; y++) for (let x = 14; x < 17; x++) tiles[key(x, y)] = { x, y };
  return {
    version: B.saveVersion,
    name,
    gold: B.startingGold,
    day: 1,
    elapsed: 0,
    weather: 'sun',
    houseLevel: 1,
    landBought: [0, 0, 0, 0, 0, 0],
    tiles,
    buildings: [],
    inventory: [
      {
        id: 'seed:carrot',
        type: 'seed',
        quantity: 5,
        freshness: 100,
        storage: 'bag',
        favorite: false,
      },
    ],
    animals: [],
    ancestry: [],
    jobs: [],
    farmXp: 0,
    animalXp: 0,
    skills: ['crops', 'chicken'],
    tutorial: 0,
    merchant: { present: false, special: false, nextDay: 2, misses: 0, buyBonus: 0, discount: 0 },
    debt: 0,
    daily: ledger(),
    monthly: ledger(),
    history: [],
    monthStartingValue: 4500,
    birthResults: [],
    discoveries: {},
    settings: { ...B.defaults },
    nextId: 1,
    seed: Date.now() % 2147483647,
    blueprints: [],
  };
}
export function random(state: GameState) {
  state.seed = (state.seed * 16807) % 2147483647;
  return state.seed / 2147483647;
}
export const level = (xp: number) => Math.min(B.maxLevel, 1 + Math.floor(xp / B.xpPerLevel));
