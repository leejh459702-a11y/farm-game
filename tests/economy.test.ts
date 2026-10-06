import { describe, expect, it } from 'vitest';
import { freshnessMultiplier, sellPrice, operatingCost, animalSellPrice } from '../src/services/EconomyService';

describe('판매 가격', () => {
  it('신선도 구간 배율', () => {
    expect(freshnessMultiplier(100)).toBe(1.1);
    expect(freshnessMultiplier(90)).toBe(1.1);
    expect(freshnessMultiplier(89)).toBe(1.0);
    expect(freshnessMultiplier(70)).toBe(1.0);
    expect(freshnessMultiplier(69)).toBe(0.8);
    expect(freshnessMultiplier(50)).toBe(0.8);
    expect(freshnessMultiplier(49)).toBe(0.5);
    expect(freshnessMultiplier(20)).toBe(0.5);
    expect(freshnessMultiplier(19)).toBe(0.2);
    expect(freshnessMultiplier(1)).toBe(0.2);
    expect(freshnessMultiplier(0)).toBe(0);
  });
  it('토마토 기본 100G → 여름 110G (신선도 70~89 기준)', () => {
    expect(sellPrice('tomato', 80, { season: 'summer', merchantBonus: 0 })).toBe(110);
    expect(sellPrice('tomato', 80, { season: 'spring', merchantBonus: 0 })).toBe(100);
  });
  it('기본가 × 신선도 × 제철 × 상인', () => {
    // 100 * 1.1 * 1.1 * 1.2 = 145.2
    expect(sellPrice('tomato', 95, { season: 'summer', merchantBonus: 0.2 })).toBe(145);
  });
  it('부패(0)는 판매 불가', () => {
    expect(sellPrice('tomato', 0, { season: 'summer', merchantBonus: 0 })).toBe(0);
    expect(sellPrice('rotten', undefined, { season: 'summer', merchantBonus: 0 })).toBe(0);
  });
  it('보존 식품은 신선도 영향 없음', () => {
    expect(sellPrice('wool', undefined, { season: 'spring', merchantBonus: 0 })).toBe(260);
  });
  it('가공품/요리는 재료보다 비싸다', () => {
    const ctx = { season: 'winter' as const, merchantBonus: 0 };
    expect(sellPrice('cheese', 100, ctx)).toBeGreaterThan(sellPrice('milk', 100, ctx) * 2);
    expect(sellPrice('omelette', 100, ctx)).toBeGreaterThan(sellPrice('egg', 100, ctx) * 2 + sellPrice('milk', 100, ctx));
  });
});

describe('운영비', () => {
  it('집 레벨별 지난달 판매수익 비율', () => {
    expect(operatingCost(10000, 1)).toBe(200);
    expect(operatingCost(10000, 2)).toBe(300);
    expect(operatingCost(10000, 3)).toBe(400);
    expect(operatingCost(10000, 4)).toBe(500);
    expect(operatingCost(10000, 5)).toBe(600);
    expect(operatingCost(10000, 6)).toBe(700);
  });
});

describe('동물 판매가', () => {
  it('등급이 높을수록 비싸다', () => {
    const base = { id: 'X', species: 'cow', name: '', gender: 'F' as const, age: 20, stage: 'adult' as const, stats: { productivity: 50, growth: 50, health: 50, fertility: 50, physique: 50 }, traits: [], motherId: null, fatherId: null, childIds: [], births: 0, produced: 0, affection: 0, happiness: 60, fedToday: false, pettedToday: false, productTimer: 1, pregnant: null, breedCooldown: 0, buildingUid: null, lineage: null, bornDay: 0 };
    const ctx = { season: 'spring' as const, merchantBonus: 0 };
    const g3 = animalSellPrice({ ...base, grade: 3 }, ctx);
    const g2 = animalSellPrice({ ...base, grade: 2 }, ctx);
    const g1 = animalSellPrice({ ...base, grade: 1 }, ctx);
    expect(g1).toBeGreaterThan(g2);
    expect(g2).toBeGreaterThan(g3);
  });
});
