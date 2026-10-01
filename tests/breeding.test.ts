import { describe, expect, it } from 'vitest';
import { applyGradeBonus, baseGradeDist, inheritTraits, rollGrade } from '../src/systems/BreedingSystem';
import { freeWorld, giveLand, giveMats } from './helpers';
import type { Grade } from '../src/types/game';

function sample(a: Grade, b: Grade, n = 20000) {
  let s = 7;
  const r = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  const cnt = { 1: 0, 2: 0, 3: 0 } as Record<Grade, number>;
  const dist = baseGradeDist(a, b);
  for (let i = 0; i < n; i++) cnt[rollGrade(r, dist)]++;
  return { 1: cnt[1] / n, 2: cnt[2] / n, 3: cnt[3] / n };
}

describe('브리딩 등급 확률', () => {
  it('확률표가 기획과 일치', () => {
    expect(baseGradeDist(3, 3)).toEqual({ 1: 0, 2: 0.2, 3: 0.8 });
    expect(baseGradeDist(3, 2)).toEqual({ 1: 0.05, 2: 0.6, 3: 0.35 });
    expect(baseGradeDist(2, 2)).toEqual({ 1: 0.15, 2: 0.75, 3: 0.1 });
    expect(baseGradeDist(2, 1)).toEqual({ 1: 0.35, 2: 0.65, 3: 0 });
    expect(baseGradeDist(1, 1)).toEqual({ 1: 0.75, 2: 0.25, 3: 0 });
  });
  it('표본 분포가 확률표에 근접', () => {
    const s = sample(3, 3);
    expect(s[3]).toBeGreaterThan(0.77);
    expect(s[3]).toBeLessThan(0.83);
    expect(s[1]).toBe(0);
    const s2 = sample(1, 1);
    expect(s2[1]).toBeGreaterThan(0.72);
    expect(s2[3]).toBe(0);
  });
  it('보너스는 확률 합 1 유지', () => {
    const d = applyGradeBonus(baseGradeDist(2, 3), 0.1);
    expect(d[1] + d[2] + d[3]).toBeCloseTo(1);
    expect(d[1]).toBeGreaterThan(0.05);
  });
});

describe('유전', () => {
  it('특성 유전은 약 40%, 최대 3개', () => {
    let s = 3;
    const r = () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
    let inherited = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) {
      const t = inheritTraits(r, ['fertile'], [], () => null);
      if (t.includes('fertile')) inherited++;
      expect(t.length).toBeLessThanOrEqual(3);
    }
    expect(inherited / N).toBeGreaterThan(0.37);
    expect(inherited / N).toBeLessThan(0.43);
    for (let i = 0; i < 200; i++) expect(inheritTraits(r, ['a', 'b', 'c'], ['d', 'e', 'f'], () => 'g').length).toBeLessThanOrEqual(3);
  });
  it('브리딩 → 임신 → 출산, 부모 기록', () => {
    const w = freeWorld();
    w.state.gold = 1_000_000;
    w.state.skills.livestockXp = 99999;
    w.state.skills.farmingXp = 99999;
    w.state.skills.researched.push('l_chicken', 'l_breeding');
    giveLand(w, 5, 5, 8, 6);
    giveMats(w);
    const spots: [number, number][] = [];
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (w.grid.canPlace('coop', x, y, 0).ok) spots.push([x, y]);
    expect(w.grid.place('coop', spots[0][0], spots[0][1], 0).ok).toBe(true);
    const spots2: [number, number][] = [];
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (w.grid.canPlace('breeding', x, y, 0).ok || w.grid.canPlace('breeding', x, y, 1).ok) spots2.push([x, y]);
    const [bx, by] = spots2[0];
    const rot = w.grid.canPlace('breeding', bx, by, 0).ok ? 0 : 1;
    expect(w.grid.place('breeding', bx, by, rot).ok).toBe(true);
    const coop = w.animals.barns()[0];
    const mom = w.animals.create('chicken', { gender: 'F', grade: 2, traits: ['fertile'], buildingUid: coop.uid });
    const dad = w.animals.create('chicken', { gender: 'M', grade: 2, buildingUid: coop.uid });
    expect(w.breeding.breed(mom.id, dad.id).ok).toBe(true);
    expect(w.breeding.breed(mom.id, dad.id).ok).toBe(false); // 이미 임신
    for (let i = 0; i < 5; i++) w.time.skipToNextDay();
    expect(mom.childIds.length).toBeGreaterThan(0);
    const baby = w.animals.get(mom.childIds[0])!;
    expect(baby.motherId).toBe(mom.id);
    expect(baby.fatherId).toBe(dad.id);
    expect(baby.id).toMatch(/^CHK-\d{6}$/);
    expect(w.state.pedigree[baby.id].motherId).toBe(mom.id);
    // 직계 브리딩 금지
    baby.stage = 'adult';
    baby.gender = 'M';
    mom.breedCooldown = 0;
    expect(w.breeding.check(mom.id, baby.id).ok).toBe(false);
  });
  it('자동 번식은 일어나지 않는다', () => {
    const w = freeWorld();
    const a = w.animals.create('chicken', { gender: 'F' });
    w.animals.create('chicken', { gender: 'M' });
    for (let i = 0; i < 20; i++) w.time.skipToNextDay();
    expect(a.pregnant).toBeNull();
    expect(Object.keys(w.state.animals).length).toBe(2);
  });
});
