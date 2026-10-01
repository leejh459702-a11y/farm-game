/**
 * 장기 시뮬레이션 QA — 1년(120일) 동안 자동 플레이하며 예외/불변식 확인.
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, giveLand } from './helpers';
import { isReady } from '../src/systems/CropSystem';
import { calendar } from '../src/systems/SeasonSystem';
import { ITEM_BY_ID } from '../src/data/items';

describe('1년 자동 플레이 시뮬레이션', () => {
  it('농사·축산·가공·판매 루프가 1년 동안 오류 없이 돌아간다', () => {
    const w = freeWorld(2024);
    w.state.gold = 50000;
    giveLand(w, 8, 8, 14, 14);
    w.state.skills.researched.push('l_chicken', 'l_cow', 'f_processing', 'f_kitchen', 'f_storage1', 'f_cold', 'l_breeding', 'f_irrig1', 'l_autoFeed');
    w.state.skills.farmingXp = 2000;
    w.state.skills.livestockXp = 2000;
    const coop = w.grid.place('coop', 8, 8, 0).uid!;
    const fridge = w.grid.place('fridge', 10, 8, 0).uid!;
    const proc = w.grid.place('processor', 12, 8, 0).uid!;
    w.grid.place('breeding', 14, 8, 0);
    expect(coop && fridge && proc).toBeTruthy();
    for (let i = 0; i < 4; i++) w.animals.create('chicken', { gender: i ? 'F' : 'M', buildingUid: coop });
    w.inventory.add('bag', 'hay', 99);
    // 농지 20칸
    const plots: { x: number; y: number }[] = [];
    for (let y = 12; y < 16; y++) for (let x = 8; x < 13; x++) {
      w.crops.till(x, y);
      plots.push({ x, y });
    }
    let sold = 0;
    for (let day = 0; day < 120; day++) {
      const season = calendar(w.state.time.day).season;
      // 제철 씨앗 구매(직접 지급) 및 심기
      const seedCrop = { spring: 'carrot', summer: 'tomato', autumn: 'cabbage', winter: 'spinach' }[season];
      for (const t of plots) {
        const p = w.crops.plotAt(t.x, t.y)!;
        if (isReady(p)) w.crops.harvest(p);
        if (!p.cropId) {
          if (w.inventory.countAll(`seed_${seedCrop}`) <= 0) w.inventory.add('bag', `seed_${seedCrop}`, 20);
          w.crops.plant(p, `seed_${seedCrop}`);
        }
        if (!p.wateredToday) w.crops.water(p);
      }
      const b = w.state.buildings[coop];
      w.animals.feedBarn(b);
      w.animals.petAll(b);
      w.animals.collect(b);
      if (w.inventory.countAll('hay') < 20) w.inventory.add('bag', 'hay', 50);
      // 가공: 마요네즈
      w.processing.start(w.state.buildings[proc], 'mayonnaise');
      w.processing.collect(w.state.buildings[proc]);
      // 판매
      if (w.state.merchant.present) {
        for (const cid of ['bag', ...w.inventory.storageIds()]) {
          w.state.containers[cid].slots.forEach((s, i) => {
            if (s && ['crop', 'animal', 'processed'].includes(ITEM_BY_ID[s.itemId].category)) {
              const r = w.merchant.sellSlot(cid, i, s.qty);
              if (r.ok) sold += r.gold!;
            }
          });
        }
      }
      // 반나절 진행 후 종료 (가공 시간 경과)
      for (let k = 0; k < 300; k++) w.time.tick(1);
      w.time.skipToNextDay();
      // 불변식
      expect(Number.isFinite(w.state.gold)).toBe(true);
      expect(w.state.gold).toBeGreaterThanOrEqual(0);
      for (const c of Object.values(w.state.containers))
        for (const s of c.slots) if (s) {
          expect(s.qty).toBeGreaterThan(0);
          if (s.freshness !== undefined) expect(s.freshness).toBeGreaterThanOrEqual(0);
        }
    }
    expect(w.cal.year).toBe(2);
    expect(sold).toBeGreaterThan(0);
    expect(w.state.stats.totalHarvested).toBeGreaterThan(100);
    expect(w.state.finance.months.length).toBe(12);
    expect(Object.keys(w.state.animals).length).toBe(4); // 자동 번식 없음, 사망 없음
    expect(w.skills.level('farming')).toBeGreaterThan(3);
  });

  it('30×30 최대 농장 하루 처리 성능', () => {
    const w = freeWorld(7);
    giveLand(w, 0, 0, 30, 30);
    w.state.skills.researched.push('l_chicken');
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (!w.grid.buildingAt(x, y)) {
      w.crops.till(x, y);
      const p = w.crops.plotAt(x, y);
      if (p) {
        p.cropId = 'carrot';
        p.upgrades.irrigation = 1;
      }
    }
    const t0 = performance.now();
    for (let d = 0; d < 30; d++) w.time.skipToNextDay();
    const ms = (performance.now() - t0) / 30;
    expect(ms).toBeLessThan(50);
  });
});
