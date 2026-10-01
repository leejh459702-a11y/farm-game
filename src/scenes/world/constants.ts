import { BALANCE } from '../../data/balance';

export const TS = BALANCE.farm.tileSize;
export const FW = BALANCE.farm.maxWidth;
export const FH = BALANCE.farm.maxHeight;
export const BORDER = BALANCE.farm.borderTiles;
export const WORLD_MIN = -BORDER * TS;
export const WORLD_MAX_X = (FW + BORDER) * TS;
export const WORLD_MAX_Y = (FH + BORDER) * TS;
export const DEFAULT_ZOOM = 2;

/** 깊이(정렬) 기준 */
export const DEPTH = {
  ground: 0,
  soil: 1,
  outline: 2,
  cursor: 3,
  objects: 10, // + y
  ui: 100000,
};

export function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
