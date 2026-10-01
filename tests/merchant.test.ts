import { describe, expect, it } from 'vitest';
import { specialChance } from '../src/systems/MerchantSystem';
import { freeWorld } from './helpers';

describe('방문상인', () => {
  it('특급상인 기본 12% + 연속 미등장 보정', () => {
    expect(specialChance(0)).toBeCloseTo(0.12);
    expect(specialChance(5)).toBeGreaterThan(0.8);
    expect(specialChance(6)).toBeLessThanOrEqual(1);
  });
  it('2~3일 간격으로 방문', () => {
    const w = freeWorld(99);
    const visits: number[] = [];
    w.events.on('merchant', (e) => e.present && visits.push(w.state.time.day));
    for (let i = 0; i < 60; i++) w.time.skipToNextDay();
    for (let i = 1; i < visits.length; i++) {
      const gap = visits[i] - visits[i - 1];
      expect(gap).toBeGreaterThanOrEqual(2);
      expect(gap).toBeLessThanOrEqual(3);
    }
    expect(visits.length).toBeGreaterThan(15);
  });
  it('특급상인이 장기간 안 나오는 일이 없다', () => {
    for (let seed = 1; seed < 30; seed++) {
      const w = freeWorld(seed);
      let streak = 0;
      let maxStreak = 0;
      w.events.on('merchant', (e) => {
        if (!e.present) return;
        if (e.special) streak = 0;
        else maxStreak = Math.max(maxStreak, ++streak);
      });
      for (let i = 0; i < 120; i++) w.time.skipToNextDay();
      expect(maxStreak).toBeLessThanOrEqual(7);
    }
  });
});

describe('월간 운영비', () => {
  it('월말에 지난달 판매수익 × 비율 청구, 부족하면 미납', () => {
    const w = freeWorld(5);
    w.finance.recordSale('carrot', 100, 10000);
    w.state.gold = 50;
    for (let i = 0; i < 10; i++) w.time.skipToNextDay();
    expect(w.state.finance.debt).toBe(200);
    expect(w.finance.hasDebt()).toBe(true);
    expect(w.house.check().ok).toBe(false);
    w.state.gold = 1000;
    expect(w.finance.payDebt().ok).toBe(true);
    expect(w.finance.hasDebt()).toBe(false);
    expect(w.state.finance.months.length).toBe(1);
    expect(w.state.finance.months[0].operatingCost).toBe(200);
  });
});
