import { BalanceConfig as B } from '../data/balance';
import { cropById } from '../data/crops';
import { products } from '../data/economy';
import { recipes } from '../data/recipes';
import { buildingById } from '../data/buildings';
import { animalById } from '../data/animals';
import { calendar } from '../data/seasons';
import type { GameState, Item } from '../types';
export function itemName(id: string): string {
  if (id.startsWith('seed:')) return `${cropById[id.slice(5)]?.name ?? id} 씨앗`;
  return (
    cropById[id]?.name ?? products[id]?.name ?? recipes.find((r) => r.output === id)?.name ?? id
  );
}
export function basePrice(id: string) {
  return (
    cropById[id]?.baseSellPrice ??
    products[id]?.price ??
    recipes.find((r) => r.output === id)?.price ??
    0
  );
}
export function freshnessMultiplier(f: number) {
  return B.freshness.find((t) => f >= t.min)?.multiplier ?? 0;
}
export function salePrice(s: GameState, item: Item) {
  if (item.type === 'seed' || item.type === 'other') return 0;
  return Math.floor(
    basePrice(item.id) *
      freshnessMultiplier(item.freshness) *
      (cropById[item.id]?.season === calendar(s.day).season ? B.seasonalBonus : 1) *
      (1 + s.merchant.buyBonus),
  );
}
export function decayRate(id: string) {
  return cropById[id]?.freshnessDecay ?? products[id]?.decay ?? 6;
}
export function operatingFee(sales: number, houseLevel: number) {
  return Math.floor(sales * B.house[houseLevel - 1].fee);
}

export function farmValue(s: GameState) {
  return (
    Object.keys(s.tiles).length * 500 +
    s.buildings.reduce((n, b) => n + buildingById[b.type].price, 0) +
    B.house.slice(0, s.houseLevel).reduce((n, h) => n + h.cost, 0) +
    s.animals.reduce((n, a) => n + animalById[a.species].price * (4 - a.grade), 0)
  );
}
