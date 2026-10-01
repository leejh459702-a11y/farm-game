import { describe, expect, it } from 'vitest';
import { isAdjacentToOwned } from '../src/systems/LandPurchaseSystem';
import { landPrice, landCap } from '../src/services/EconomyService';
import { freeWorld } from './helpers';

describe('토지 인접 구매 판정', () => {
  const W = 30;
  const owned = new Array(W * 30).fill(0);
  owned[5 * W + 5] = 1;
  it('상하좌우는 구매 가능', () => {
    expect(isAdjacentToOwned(owned, 6, 5)).toBe(true);
    expect(isAdjacentToOwned(owned, 4, 5)).toBe(true);
    expect(isAdjacentToOwned(owned, 5, 4)).toBe(true);
    expect(isAdjacentToOwned(owned, 5, 6)).toBe(true);
  });
  it('대각선은 불가', () => {
    expect(isAdjacentToOwned(owned, 6, 6)).toBe(false);
    expect(isAdjacentToOwned(owned, 4, 4)).toBe(false);
  });
  it('떨어진 곳은 불가', () => {
    expect(isAdjacentToOwned(owned, 8, 5)).toBe(false);
  });
  it('월드에서 비인접/소유/범위 밖 거절', () => {
    const w = freeWorld();
    w.state.gold = 100000;
    expect(w.land.check(13, 13).ok).toBe(false); // 이미 소유
    expect(w.land.check(12, 12).ok).toBe(false); // 대각선
    expect(w.land.check(-1, 13).ok).toBe(false);
    expect(w.land.check(12, 13).ok).toBe(true);
  });
});

describe('토지 가격', () => {
  it('첫 추가 토지는 500G', () => {
    expect(landPrice(1, 0)).toBe(500);
  });
  it('구매할 때마다 단계별 증가액', () => {
    expect(landPrice(1, 1)).toBe(550);
    expect(landPrice(1, 4)).toBe(700);
    expect(landPrice(2, 0)).toBe(1500);
    expect(landPrice(2, 2)).toBe(1650);
    expect(landPrice(3, 1)).toBe(4100);
    expect(landPrice(4, 1)).toBe(10150);
    expect(landPrice(5, 1)).toBe(25250);
    expect(landPrice(6, 1)).toBe(60400);
  });
  it('집 레벨별 최대 토지', () => {
    expect([1, 2, 3, 4, 5, 6].map(landCap)).toEqual([25, 64, 144, 324, 576, 900]);
  });
  it('구매 시 가격 상승 및 최대치 제한', () => {
    const w = freeWorld();
    w.state.gold = 1_000_000;
    const first = w.land.price();
    const c = w.land.candidates()[0];
    expect(w.land.buy(c.x, c.y).ok).toBe(true);
    expect(w.land.price()).toBe(first + 50);
    for (let i = 0; i < 40; i++) {
      const cc = w.land.candidates()[0];
      w.land.buy(cc.x, cc.y);
    }
    expect(w.grid.ownedCount()).toBe(25);
    const cc = w.land.candidates()[0];
    expect(w.land.check(cc.x, cc.y).ok).toBe(false);
  });
  it('운영비 미납 시 구매 불가', () => {
    const w = freeWorld();
    w.state.gold = 100000;
    w.state.finance.debt = 10;
    expect(w.land.check(12, 13).ok).toBe(false);
  });
});
