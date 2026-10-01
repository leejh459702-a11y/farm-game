import { createNewGame } from '../src/core/newGame';
import { World } from '../src/core/World';

export function newWorld(seed = 12345): World {
  return new World(createNewGame(seed));
}

/** 튜토리얼을 건너뛴 자유 플레이 상태 */
export function freeWorld(seed = 12345): World {
  const w = newWorld(seed);
  w.tutorial.skip();
  w.regions.morning();
  return w;
}

export function buyLandRow(w: World, n: number): void {
  w.state.gold += 1_000_000;
  for (let i = 0; i < n; i++) {
    const c = w.land.candidates()[0];
    w.land.buy(c.x, c.y);
  }
}

/** 테스트용: 사각형 영역 토지 지급 */
export function giveLand(w: World, x0: number, y0: number, wd: number, ht: number): void {
  for (let y = y0; y < y0 + ht; y++) for (let x = x0; x < x0 + wd; x++) w.state.land.owned[y * 30 + x] = 1;
}

/** 테스트용: 건설 재료 지급 */
export function giveMats(w: World): void {
  for (const id of ['wood', 'stone', 'clay', 'brick', 'copper_ore', 'iron_ore', 'gold_ore']) w.inventory.add('bag', id, 99);
}
