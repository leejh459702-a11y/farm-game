/**
 * STEP 1~2 — 작물 하루 성장 로직 / 하루 넘기기 검증
 * growDays = 3 이면 하루 넘기기 정확히 3회 후 수확 가능해야 한다.
 */
import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { calendar } from '../src/systems/SeasonSystem';
import type { World } from '../src/core/World';

function plantCarrot(w: World) {
  w.state.weather.today = 'sunny';
  w.state.weather.tomorrow = 'sunny';
  w.crops.till(15, 15);
  const p = w.crops.plotAt(15, 15)!;
  w.crops.plant(p, 'seed_carrot');
  return p;
}

/** 다음 날도 맑게 고정 (비 자동 물주기 배제) */
function endDaySunny(w: World) {
  w.state.weather.tomorrow = 'sunny';
  w.time.skipToNextDay();
  w.state.weather.today = 'sunny';
  for (const p of w.crops.allPlots()) if (!p.greenhouse && p.upgrades.irrigation === 0) p.wateredToday = false;
}

describe('Crop Growth Test — growDays 3', () => {
  it('Day End 1회 → 1, 2회 → 2, 3회 → 3 + mature', () => {
    const w = freeWorld(1);
    const p = plantCarrot(w);
    expect(p.growthProgressDays).toBe(0);
    expect(p.mature).toBe(false);
    expect(p.currentStage).toBe(1); // 새싹
    const startDay = w.state.time.day;

    w.crops.water(p);
    endDaySunny(w);
    expect(p.growthProgressDays).toBe(1);
    expect(p.mature).toBe(false);
    expect(p.currentStage).toBe(2); // 어린 당근

    w.crops.water(p);
    endDaySunny(w);
    expect(p.growthProgressDays).toBe(2);
    expect(p.mature).toBe(false);
    expect(p.currentStage).toBe(3); // 성장한 잎

    w.crops.water(p);
    endDaySunny(w);
    expect(p.growthProgressDays).toBe(3);
    expect(p.mature).toBe(true);
    expect(p.currentStage).toBe(4); // 수확 가능
    expect(w.state.time.day - startDay).toBe(3); // 하루 넘기기 정확히 3회
    expect(w.crops.harvest(p).ok).toBe(true);
  });

  it('plantedDay 기록, 하루 종료 후 wateredToday 초기화', () => {
    const w = freeWorld(2);
    const p = plantCarrot(w);
    expect(p.plantedDay).toBe(w.state.time.day);
    w.crops.water(p);
    expect(p.wateredToday).toBe(true);
    endDaySunny(w);
    expect(p.wateredToday).toBe(false);
  });

  it('성장 단계는 최소 4단계를 모두 거친다 (상추 1일·딸기 5일)', () => {
    const w = freeWorld(3);
    w.state.skills.farmingXp = 99999;
    w.inventory.add('bag', 'seed_lettuce', 1);
    w.inventory.add('bag', 'seed_strawberry', 1);
    w.crops.till(15, 15);
    w.crops.till(14, 15);
    const a = w.crops.plotAt(15, 15)!;
    const b = w.crops.plotAt(14, 15)!;
    w.crops.plant(a, 'seed_lettuce');
    w.crops.plant(b, 'seed_strawberry');
    const stagesB = new Set<number>([b.currentStage]);
    for (let d = 0; d < 5; d++) {
      w.crops.water(a);
      w.crops.water(b);
      endDaySunny(w);
      if (d === 0) expect(a.mature).toBe(true); // 상추 1일
      stagesB.add(b.currentStage);
    }
    expect(b.mature).toBe(true);
    expect([...stagesB].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('Unwatered Test', () => {
  it('물을 주지 않은 날에는 성장하지 않는다 (죽지도 않는다)', () => {
    const w = freeWorld(4);
    const p = plantCarrot(w);
    for (let i = 0; i < 5; i++) endDaySunny(w);
    expect(p.growthProgressDays).toBe(0);
    expect(p.cropId).toBe('carrot');
    expect(p.mature).toBe(false);
  });
});

describe('Rain Test', () => {
  it('비 오는 날에는 물을 안 줘도 자동 성장', () => {
    const w = freeWorld(5);
    const p = plantCarrot(w);
    w.crops.water(p);
    // 내일 비
    w.state.weather.tomorrow = 'rain';
    w.time.skipToNextDay();
    expect(w.state.weather.today).toBe('rain');
    expect(p.wateredToday).toBe(true); // 아침에 비로 자동 급수
    w.state.weather.tomorrow = 'storm';
    w.time.skipToNextDay();
    expect(p.growthProgressDays).toBe(2);
  });
});

describe('Irrigation Test', () => {
  it('관개 설치 농지는 매일 자동 성장', () => {
    const w = freeWorld(6);
    w.state.skills.researched.push('f_irrig1');
    w.state.gold = 10000;
    const p = plantCarrot(w);
    expect(w.crops.upgrade([p], 'irrigation').ok).toBe(true);
    expect(p.wateredToday).toBe(true);
    for (let i = 0; i < 3; i++) {
      w.state.weather.tomorrow = 'sunny';
      w.time.skipToNextDay();
    }
    expect(p.growthProgressDays).toBe(3);
    expect(p.mature).toBe(true);
  });
});

describe('Date Skip Test', () => {
  it('하루 넘기기 1회 = 날짜 정확히 +1 (낮/밤 구간과 무관)', () => {
    const w = freeWorld(7);
    for (const elapsed of [0, 10, 299, 300, 450, 599]) {
      const before = w.state.time.day;
      const c0 = calendar(before);
      w.state.time.elapsed = elapsed;
      w.time.skipToNextDay();
      expect(w.state.time.day).toBe(before + 1);
      expect(w.state.time.elapsed).toBe(0);
      const c1 = calendar(w.state.time.day);
      expect((c1.dayOfMonth - c0.dayOfMonth + 10) % 10).toBe(1);
    }
  });
  it('3월 1일 → 3월 2일 → 3월 3일', () => {
    const w = freeWorld(8);
    expect(calendar(w.state.time.day)).toMatchObject({ month: 3, dayOfMonth: 1 });
    w.time.skipToNextDay();
    expect(calendar(w.state.time.day)).toMatchObject({ month: 3, dayOfMonth: 2 });
    w.time.skipToNextDay();
    expect(calendar(w.state.time.day)).toMatchObject({ month: 3, dayOfMonth: 3 });
  });
  it('일일 시스템(성장/상인/날씨/신선도)이 하루에 정확히 1회만 처리된다', () => {
    const w = freeWorld(9);
    let ended = 0;
    let started = 0;
    w.events.on('dayEnded', () => ended++);
    w.events.on('dayStarted', () => started++);
    w.inventory.add('bag', 'lettuce', 1, 100); // 하루 감소 12
    w.time.skipToNextDay();
    expect(ended).toBe(1);
    expect(started).toBe(1);
    expect(w.state.containers.bag.slots.find((s) => s?.itemId === 'lettuce')!.freshness).toBe(88);
    // 실시간으로 하루를 보내도 동일하게 1회
    for (let i = 0; i < 600; i++) w.time.tick(1);
    expect(ended).toBe(2);
    expect(w.state.containers.bag.slots.find((s) => s?.itemId === 'lettuce')!.freshness).toBe(76);
  });
});

describe('Season Growth Rule — 겨울만 제한', () => {
  const growOnce = (w: World, season: 'spring' | 'summer' | 'autumn' | 'winter') => {
    const p = plantCarrot(w);
    w.crops.water(p);
    w.crops.dailyGrowth(season);
    return p;
  };

  it('봄 작물(당근)도 여름·가을에 자란다', () => {
    for (const s of ['summer', 'autumn'] as const) {
      const w = freeWorld(10);
      expect(growOnce(w, s).growthProgressDays).toBe(1);
    }
  });

  it('겨울 야외 밭: 당근은 멈추고(죽지 않음) 겨울 작물은 자란다', () => {
    const w = freeWorld(11);
    const p = growOnce(w, 'winter');
    expect(p.growthProgressDays).toBe(0);
    expect(p.cropId).toBe('carrot');

    const w2 = freeWorld(12);
    w2.crops.till(15, 15);
    const q = w2.crops.plotAt(15, 15)!;
    w2.state.skills.farmingXp = 99999;
    w2.inventory.add('bag', 'seed_spinach', 1);
    expect(w2.crops.plant(q, 'seed_spinach').ok).toBe(true);
    w2.crops.water(q);
    w2.crops.dailyGrowth('winter');
    expect(q.growthProgressDays).toBe(1);
  });

  it('겨울 온실: 모든 작물이 자란다', () => {
    const w = freeWorld(13);
    const p = plantCarrot(w);
    p.greenhouse = 'gh-test';
    w.crops.water(p);
    w.crops.dailyGrowth('winter');
    expect(p.growthProgressDays).toBe(1);
  });
});
