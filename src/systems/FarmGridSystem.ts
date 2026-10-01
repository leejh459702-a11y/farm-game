import { BalanceConfig as B } from '../data/balance';
import { buildingById } from '../data/buildings';
import { key } from '../core/state';
import type { Building, GameState } from '../types';
export function footprint(type: string, x: number, y: number, rotation = false) {
  const b = buildingById[type];
  const w = rotation ? b.height : b.width,
    h = rotation ? b.width : b.height;
  return Array.from({ length: w * h }, (_, i) => key(x + (i % w), y + Math.floor(i / w)));
}
export function buildingAt(s: GameState, x: number, y: number) {
  return s.buildings.find((b) => footprint(b.type, b.x, b.y, b.rotation).includes(key(x, y)));
}
export function canPlace(
  s: GameState,
  type: string,
  x: number,
  y: number,
  rotation = false,
  ignore: string[] = [],
) {
  if (!buildingById[type]) return false;
  return footprint(type, x, y, rotation).every(
    (k) =>
      s.tiles[k] &&
      !s.tiles[k].plot &&
      !s.buildings.some(
        (b) => !ignore.includes(b.id) && footprint(b.type, b.x, b.y, b.rotation).includes(k),
      ),
  );
}
export function adjacent(s: GameState, x: number, y: number) {
  return (
    x >= 0 &&
    y >= 0 &&
    x < B.maxSize &&
    y < B.maxSize &&
    !s.tiles[key(x, y)] &&
    [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ].some(([dx, dy]) => s.tiles[key(x + dx, y + dy)])
  );
}
export const landPrice = (s: GameState) =>
  B.house[s.houseLevel - 1].base + s.landBought[s.houseLevel - 1] * B.house[s.houseLevel - 1].step;
export function canBuyLand(s: GameState, x: number, y: number) {
  return (
    adjacent(s, x, y) &&
    Object.keys(s.tiles).length < B.house[s.houseLevel - 1].cap &&
    !s.debt &&
    s.gold >= landPrice(s)
  );
}
export function canMoveGroup(s: GameState, group: Building[], dx: number, dy: number) {
  return group.every((b) =>
    canPlace(
      s,
      b.type,
      b.x + dx,
      b.y + dy,
      b.rotation,
      group.map((c) => c.id),
    ),
  );
}
