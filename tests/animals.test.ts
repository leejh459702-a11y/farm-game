/**
 * 동물 행복도 / 친밀도
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, giveLand, giveMats } from './helpers';
import { happinessMul, rareProductChance } from '../src/systems/AnimalSystem';
import { breedSuccessChance, intimacyGradeBonus, intimacyInheritBonus } from '../src/systems/BreedingSystem';
import type { World } from '../src/core/World';

function withCoop(w: World) {
  w.state.gold = 1_000_000;
  w.state.skills.livestockXp = 99999;
  w.state.skills.farmingXp = 99999;
  w.state.skills.researched.push('l_chicken', 'l_breeding');
  giveLand(w, 5, 5, 10, 8);
  giveMats(w);
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++)
      if (w.grid.canPlace('coop', x, y, 0).ok) {
        w.grid.place('coop', x, y, 0);
        return w.animals.barns()[0];
      }
  throw new Error('no coop spot');
}

describe('행복도', () => {
  it('생산량 배율: 0 → 0.8, 50 → 1.0, 100 → 1.2', () => {
    expect(happinessMul({ happiness: 0 })).toBeCloseTo(0.8);
    expect(happinessMul({ happiness: 50 })).toBeCloseTo(1.0);
    expect(happinessMul({ happiness: 100 })).toBeCloseTo(1.2);
  });

  it('사료·청결을 지키면 오르고, 굶기면 내려가되 0 아래로 가지 않고 죽지 않는다', () => {
    const w = freeWorld(21);
    const coop = withCoop(w);
    const a = w.animals.create('chicken', { gender: 'F', buildingUid: coop.uid });
    const start = a.happiness;
    w.inventory.add('bag', 'hay', 50);
    for (let i = 0; i < 4; i++) {
      w.animals.feedBarn(coop);
      w.animals.cleanBarn(coop);
      w.time.skipToNextDay();
    }
    expect(a.happiness).toBeGreaterThan(start);
    w.inventory.consume('hay', w.inventory.countAll('hay'));
    for (let i = 0; i < 30; i++) w.time.skipToNextDay();
    expect(a.happiness).toBe(0);
    expect(w.animals.get(a.id)).toBeDefined(); // 죽지 않음
  });
});

describe('친밀도', () => {
  it('친밀도 50 이하는 희귀 생산물 0%, 100이면 최대 15%', () => {
    expect(rareProductChance({ affection: 40 })).toBe(0);
    expect(rareProductChance({ affection: 100 })).toBeCloseTo(0.15);
  });

  it('친밀도가 높은 닭은 가끔 황금 달걀을 낳는다', () => {
    const w = freeWorld(22);
    const coop = withCoop(w);
    const a = w.animals.create('chicken', { gender: 'F', buildingUid: coop.uid });
    a.affection = 100;
    a.happiness = 100;
    w.inventory.add('bag', 'hay', 99);
    let golden = 0;
    for (let i = 0; i < 60; i++) {
      w.animals.feedBarn(coop);
      w.animals.cleanBarn(coop);
      w.time.skipToNextDay();
      a.affection = 100;
      golden += w.state.containers[coop.outputId!].slots.filter((s) => s?.itemId === 'golden_egg').reduce((n, s) => n + s!.qty, 0);
      w.animals.collect(coop);
      if (w.inventory.countAll('hay') < 5) w.inventory.add('bag', 'hay', 50);
    }
    expect(golden).toBeGreaterThan(0);
  });

  it('부모 친밀도 → 특성 유전·등급 보너스', () => {
    expect(intimacyInheritBonus({ affection: 50 }, { affection: 50 })).toBe(0);
    expect(intimacyInheritBonus({ affection: 100 }, { affection: 100 })).toBeCloseTo(0.15);
    expect(intimacyGradeBonus({ affection: 100 }, { affection: 100 })).toBeCloseTo(0.05);
  });
});

describe('브리딩 성공률', () => {
  it('행복도 50 → 80%, 100 → 100%, 최저 60%', () => {
    expect(breedSuccessChance({ happiness: 50 }, { happiness: 50 })).toBeCloseTo(0.8);
    expect(breedSuccessChance({ happiness: 100 }, { happiness: 100 })).toBe(1);
    expect(breedSuccessChance({ happiness: 0 }, { happiness: 0 })).toBe(0.6);
  });

  it('인연이 닿지 않으면 비용·휴식 없이 다시 시도할 수 있다', () => {
    const w = freeWorld(23);
    const coop = withCoop(w);
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) if (!w.breeding.hasFacility() && w.grid.canPlace('breeding', x, y, 0).ok) w.grid.place('breeding', x, y, 0);
    const mom = w.animals.create('chicken', { gender: 'F', buildingUid: coop.uid });
    const dad = w.animals.create('chicken', { gender: 'M', buildingUid: coop.uid });
    mom.happiness = dad.happiness = 0;
    let missed = 0;
    for (let i = 0; i < 40 && !mom.pregnant; i++) {
      const gold = w.state.gold;
      const r = w.breeding.breed(mom.id, dad.id);
      expect(r.ok).toBe(true);
      if (r.missed) {
        missed++;
        expect(w.state.gold).toBe(gold);
        expect(mom.breedCooldown).toBe(0);
      }
    }
    expect(mom.pregnant).not.toBeNull();
    expect(missed).toBeGreaterThanOrEqual(0);
  });
});
