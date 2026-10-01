import { describe, expect, it } from 'vitest';
import { newWorld } from './helpers';
import { isReady } from '../src/systems/CropSystem';

describe('첫 튜토리얼 전체 흐름 (Vertical Slice)', () => {
  it('집 배치 → 농지 → 심기 → 물 → 상자 → 성장 → 수확 → 상인 → 판매 → 토지 구매', () => {
    const w = newWorld(42);
    w.tutorial.start();
    expect(w.tutorial.step).toBe(1);
    w.tutorial.next();
    expect(w.tutorial.step).toBe(2);
    // 상인/토지 잠금
    expect(w.land.check(12, 13).ok).toBe(false);
    // 집 배치 (3×3 안 좌상단)
    expect(w.grid.place('house', 13, 13, 0, { free: true }).ok).toBe(true);
    expect(w.tutorial.step).toBe(3);
    // 농지
    expect(w.crops.till(15, 15).ok).toBe(true);
    expect(w.tutorial.step).toBe(4);
    const p = w.crops.plotAt(15, 15)!;
    expect(w.crops.plant(p, 'seed_carrot').ok).toBe(true);
    expect(w.tutorial.step).toBe(5);
    expect(w.crops.water(p).ok).toBe(true);
    expect(w.tutorial.step).toBe(6);
    // 상자 (건설 보관함 1개 무료)
    const gold = w.state.gold;
    expect(w.grid.place('chest', 15, 13, 0).ok).toBe(true);
    expect(w.state.gold).toBe(gold);
    expect(w.tutorial.step).toBe(7);
    // 시간 보내기
    let guard = 0;
    while (!isReady(p) && guard++ < 10) {
      if (!p.watered) w.crops.water(p);
      w.time.skipToNextDay();
    }
    expect(isReady(p)).toBe(true);
    expect(w.tutorial.step).toBe(8);
    expect(w.crops.harvest(p).ok).toBe(true);
    // 상인 강제 등장
    expect(w.tutorial.step).toBe(9);
    expect(w.state.merchant.present).toBe(true);
    w.tutorial.signal('merchantOpened');
    expect(w.tutorial.step).toBe(10);
    const slot = w.state.containers.bag.slots.findIndex((s) => s?.itemId === 'carrot');
    const r = w.merchant.sellSlot('bag', slot, 99);
    expect(r.ok).toBe(true);
    expect(r.gold).toBeGreaterThan(0);
    expect(w.tutorial.step).toBe(11);
    w.tutorial.next();
    expect(w.tutorial.step).toBe(12);
    expect(w.state.gold).toBeGreaterThanOrEqual(500);
    const res = w.land.buy(12, 13);
    expect(res.ok).toBe(true);
    expect(res.price).toBe(500);
    expect(w.tutorial.active).toBe(false);
    expect(w.grid.ownedCount()).toBe(10);
    // 자유 플레이: 상인 일정 예약
    expect(w.state.merchant.nextVisitDay).toBeGreaterThan(w.state.time.day);
  });
});
