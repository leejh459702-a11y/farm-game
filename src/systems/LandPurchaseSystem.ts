/**
 * LandPurchaseSystem — 상하좌우로 인접한 토지만 구매 가능 (대각선 불가).
 */
import { BALANCE } from '../data/balance';
import { landCap, landPrice } from '../services/EconomyService';
import type { World } from '../core/World';

const W = BALANCE.farm.maxWidth;

export interface LandCheck {
  ok: boolean;
  reason?: string;
  price: number;
}

/** 순수 판정 함수 (테스트 용이) */
export function isAdjacentToOwned(owned: number[], x: number, y: number, width = W, height = BALANCE.farm.maxHeight): boolean {
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dx, dy] of dirs) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
    if (owned[ny * width + nx] === 1) return true;
  }
  return false;
}

export class LandPurchaseSystem {
  constructor(private w: World) {}

  price(): number {
    return landPrice(this.w.state.house.level, this.w.state.land.boughtAtLevel);
  }

  cap(): number {
    return landCap(this.w.state.house.level);
  }

  check(x: number, y: number): LandCheck {
    const price = this.price();
    const g = this.w.grid;
    if (!g.inBounds(x, y)) return { ok: false, reason: '최대 농장 영역(30×30)을 벗어났습니다', price };
    if (g.isOwned(x, y)) return { ok: false, reason: '이미 소유한 토지입니다', price };
    if (!isAdjacentToOwned(this.w.state.land.owned, x, y)) return { ok: false, reason: '소유한 토지와 상하좌우로 붙어 있어야 합니다', price };
    if (g.ownedCount() >= this.cap()) return { ok: false, reason: `집 Lv.${this.w.state.house.level}의 최대 토지(${this.cap()}칸)에 도달했습니다. 집을 업그레이드하세요`, price };
    if (this.w.finance.hasDebt()) return { ok: false, reason: '운영비 미납 중에는 토지를 구매할 수 없습니다', price };
    if (!this.w.tutorial.allows('buyLand')) return { ok: false, reason: '튜토리얼을 먼저 진행하세요', price };
    if (this.w.state.gold < price) return { ok: false, reason: '골드가 부족합니다', price };
    return { ok: true, price };
  }

  /** 구매 가능한 모든 후보 타일 */
  candidates(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    const owned = this.w.state.land.owned;
    for (let y = 0; y < BALANCE.farm.maxHeight; y++)
      for (let x = 0; x < W; x++) if (owned[y * W + x] === 0 && isAdjacentToOwned(owned, x, y)) out.push({ x, y });
    return out;
  }

  buy(x: number, y: number): LandCheck {
    const c = this.check(x, y);
    if (!c.ok) return c;
    this.w.spend(c.price, '토지 구매');
    this.w.state.land.owned[y * W + x] = 1;
    this.w.state.land.boughtAtLevel++;
    this.w.state.land.totalBought++;
    this.w.finance.today().landBought++;
    this.w.finance.month().landBought++;
    this.w.events.emit('land', undefined);
    this.w.events.emit('sfx', { key: 'buy' });
    this.w.events.emit('majorChange', { reason: 'land' });
    this.w.tutorial.signal('landBought');
    return c;
  }
}
