import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { isReady } from '../src/systems/CropSystem';

function setupPlot() {
  const w = freeWorld();
  // 집이 13,13 에 자동 배치됨 → 15,15 사용
  expect(w.crops.till(15, 15).ok).toBe(true);
  return w;
}

describe('작물', () => {
  it('괭이 → 심기 → 물 → 성장 → 수확', () => {
    const w = setupPlot();
    const p = w.crops.plotAt(15, 15)!;
    expect(w.crops.plant(p, 'seed_carrot').ok).toBe(true);
    for (let d = 0; d < 3; d++) {
      if (!p.watered) w.crops.water(p);
      w.time.skipToNextDay();
    }
    expect(isReady(p)).toBe(true);
    const before = w.inventory.countAll('carrot');
    const r = w.crops.harvest(p);
    expect(r.ok).toBe(true);
    expect(w.inventory.countAll('carrot')).toBeGreaterThan(before);
    expect(p.cropId).toBeNull();
  });
  it('물을 안 주면 자라지 않지만 죽지 않는다', () => {
    const w = setupPlot();
    w.state.weather.tomorrow = 'sunny';
    const p = w.crops.plotAt(15, 15)!;
    w.crops.plant(p, 'seed_carrot');
    p.watered = false;
    w.crops.dailyGrowth('spring');
    expect(p.growth).toBe(0);
    expect(p.cropId).toBe('carrot');
  });
  it('제철이 아니면 성장 일시 정지, 다시 제철이면 재개', () => {
    const w = setupPlot();
    const p = w.crops.plotAt(15, 15)!;
    w.crops.plant(p, 'seed_carrot');
    p.watered = true;
    w.crops.dailyGrowth('summer');
    expect(p.growth).toBe(0);
    expect(p.cropId).toBe('carrot');
    p.watered = true;
    w.crops.dailyGrowth('spring');
    expect(p.growth).toBe(1);
  });
  it('재수확 작물은 수확 후 regrowDays 만큼만 다시 자람', () => {
    const w = setupPlot();
    w.state.skills.farmingXp = 99999;
    w.inventory.add('bag', 'seed_strawberry', 1);
    const p = w.crops.plotAt(15, 15)!;
    expect(w.crops.plant(p, 'seed_strawberry').ok).toBe(true);
    p.growth = 8;
    w.crops.harvest(p);
    expect(p.cropId).toBe('strawberry');
    expect(p.growth).toBe(5);
  });
  it('관개 Lv.1 은 매일 자동 물주기 (성장 보너스 없음)', () => {
    const w = setupPlot();
    w.state.skills.researched.push('f_irrig1');
    w.state.gold = 10000;
    const p = w.crops.plotAt(15, 15)!;
    expect(w.crops.upgrade([p], 'irrigation').ok).toBe(true);
    w.crops.plant(p, 'seed_carrot');
    w.state.weather.tomorrow = 'sunny';
    w.time.skipToNextDay();
    expect(p.watered).toBe(true);
    expect(p.growth).toBe(1);
  });
  it('여러 농지 일괄 업그레이드', () => {
    const w = setupPlot();
    w.crops.till(15, 14);
    w.state.skills.researched.push('f_irrig1');
    w.state.gold = 10000;
    const plots = [w.crops.plotAt(15, 15)!, w.crops.plotAt(15, 14)!];
    const r = w.crops.upgrade(plots, 'irrigation');
    expect(r.count).toBe(2);
    expect(w.state.gold).toBe(10000 - 300);
  });
  it('비 오는 날 야외 농지 자동 물주기', () => {
    const w = setupPlot();
    w.state.weather.tomorrow = 'rain';
    w.time.skipToNextDay();
    expect(w.crops.plotAt(15, 15)!.watered).toBe(true);
  });
});
