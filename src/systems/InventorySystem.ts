import { buildingById } from '../data/buildings';
import { BalanceConfig as B } from '../data/balance';
import { decayRate } from '../services/EconomyService';
import type { GameState, Item } from '../types';
export function capacity(s: GameState, storage: string) {
  return storage === 'bag'
    ? B.storageCapacity
    : (buildingById[s.buildings.find((b) => b.id === storage)?.type ?? '']?.capacity ?? 0);
}
export function itemCount(s: GameState, id: string) {
  return s.inventory
    .filter((i) => i.id === id && i.freshness > 0)
    .reduce((n, i) => n + i.quantity, 0);
}
export function canAdd(s: GameState, id: string, freshness = 100, storage = 'bag') {
  return (
    s.inventory.some((i) => i.id === id && i.storage === storage && i.freshness === freshness) ||
    s.inventory.filter((i) => i.storage === storage).length < capacity(s, storage)
  );
}
export function addItem(
  s: GameState,
  id: string,
  type: Item['type'],
  quantity: number,
  freshness = 100,
  storage = 'bag',
) {
  if (!canAdd(s, id, freshness, storage)) return false;
  const i = s.inventory.find(
    (i) => i.id === id && i.storage === storage && i.freshness === freshness,
  );
  if (i) i.quantity += quantity;
  else s.inventory.push({ id, type, quantity, freshness, storage, favorite: false });
  return true;
}
export function consume(s: GameState, id: string, quantity: number) {
  if (itemCount(s, id) < quantity) return false;
  const items = s.inventory
    .filter((i) => i.id === id && i.freshness > 0)
    .sort((a, b) => a.freshness - b.freshness);
  for (const i of items) {
    const q = Math.min(i.quantity, quantity);
    i.quantity -= q;
    quantity -= q;
    if (!quantity) break;
  }
  s.inventory = s.inventory.filter((i) => i.quantity > 0);
  return true;
}
export function storedAdd(s: GameState, id: string, type: Item['type'], quantity: number) {
  const stores = s.buildings
    .filter((b) => buildingById[b.type].capacity)
    .sort((a, b) => (buildingById[b.type].cold ?? 0) - (buildingById[a.type].cold ?? 0));
  for (const b of stores) if (addItem(s, id, type, quantity, 100, b.id)) return true;
  return addItem(s, id, type, quantity);
}
export function decayInventory(s: GameState) {
  for (const i of s.inventory) {
    if (i.type === 'seed' || i.type === 'other') continue;
    const b = s.buildings.find((b) => b.id === i.storage);
    const protection = b ? (buildingById[b.type].cold ?? 0) : 0;
    i.freshness = Math.max(
      0,
      Math.round((i.freshness - decayRate(i.id) * (1 - protection)) * 100) / 100,
    );
  }
}
export function transfer(s: GameState, index: number, target: string) {
  const i = s.inventory[index];
  if (!i || i.storage === target || !canAdd(s, i.id, i.freshness, target)) return false;
  s.inventory.splice(index, 1);
  addItem(s, i.id, i.type, i.quantity, i.freshness, target);
  const moved = s.inventory.find(
    (x) => x.id === i.id && x.storage === target && x.freshness === i.freshness,
  );
  if (moved) moved.favorite ||= i.favorite;
  return true;
}
