/**
 * 가공 확장 + 숙성고
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, giveLand, giveMats } from './helpers';
import { agingBonus, nextAgingStep } from '../src/data/aging';
import { ITEM_BY_ID } from '../src/data/items';
import { RECIPE_BY_ID } from '../src/data/recipes';
import type { World } from '../src/core/World';

function place(w: World, type: string) {
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++)
      if (w.grid.canPlace(type, x, y, 0).ok) {
        const r = w.grid.place(type, x, y, 0);
        expect(r.ok, r.reason).toBe(true);
        return w.state.buildings[r.uid!];
      }
  throw new Error('no spot ' + type);
}

function setup(seed: number) {
  const w = freeWorld(seed);
  w.state.gold = 1_000_000;
  w.state.skills.farmingXp = 99999;
  w.state.skills.livestockXp = 99999;
  w.state.skills.researched.push('f_processing', 'f_aging', 'f_kitchen');
  giveLand(w, 3, 3, 14, 12);
  giveMats(w);
  return w;
}

describe('가공 확장', () => {
  it('가공할수록 가치가 오른다: 포도 → 포도주스 → 와인, 우유 → 치즈, 사탕무 → 설탕', () => {
    const grape = ITEM_BY_ID.grape.basePrice;
    const juice = ITEM_BY_ID.grape_juice.basePrice;
    const wine = ITEM_BY_ID.wine.basePrice;
    expect(juice).toBeGreaterThan((grape * 3) / 1);
    expect(wine).toBeGreaterThan(juice * 2);
    expect(ITEM_BY_ID.cheese.basePrice).toBeGreaterThan(ITEM_BY_ID.milk.basePrice * 2);
    expect(ITEM_BY_ID.sugar.basePrice).toBeGreaterThan(ITEM_BY_ID.sugarbeet.basePrice * 2);
    expect(ITEM_BY_ID.premium_cheese.basePrice).toBeGreaterThan(ITEM_BY_ID.cheese.basePrice);
    for (const id of ['mayonnaise', 'flour', 'bread', 'strawberry_jam', 'yarn', 'fabric', 'peanut_oil', 'smoked_fish', 'goat_cheese', 'caviar']) expect(RECIPE_BY_ID[id] ?? ITEM_BY_ID[id], id).toBeDefined();
  });

  it('어란 3개 → 캐비아 (#roe 태그 재료)', () => {
    const w = setup(41);
    const p = place(w, 'processor');
    w.inventory.add('bag', 'roe_carp', 2);
    w.inventory.add('bag', 'roe_crucian', 1);
    expect(w.processing.start(p, 'caviar').ok).toBe(true);
    expect(w.inventory.countAll('roe_carp') + w.inventory.countAll('roe_crucian')).toBe(0);
  });
});

describe('숙성', () => {
  it('치즈 숙성 곡선: 3일 +30%, 7일 +70%, 15일 +140% (500 → 650 → 850 → 1200)', () => {
    expect(agingBonus('cheese', 2)).toBe(0);
    expect(agingBonus('cheese', 3)).toBeCloseTo(0.3);
    expect(agingBonus('cheese', 7)).toBeCloseTo(0.7);
    expect(agingBonus('cheese', 20)).toBeCloseTo(1.4);
    expect(Math.round(500 * (1 + agingBonus('cheese', 15)))).toBe(1200);
    expect(nextAgingStep('wine', 15)).toEqual({ days: 15, bonus: 2.0 });
    expect(agingBonus('carrot', 99)).toBe(0);
  });

  it('숙성고에 넣고 7일 뒤 꺼내면 가치 +70%, 숙성 중에는 신선도가 그대로', () => {
    const w = setup(42);
    const c = place(w, 'cellar');
    w.inventory.add('bag', 'cheese', 3, 90);
    expect(w.aging.put(c, 'cheese').ok).toBe(true);
    expect(w.inventory.countAll('cheese')).toBe(0);
    expect(w.aging.put(c, 'carrot').ok).toBe(false);
    for (let i = 0; i < 7; i++) w.time.skipToNextDay();
    const slot = c.cellar!.slots[0]!;
    expect(w.aging.bonusOf(slot)).toBeCloseTo(0.7);
    expect(w.aging.take(c, 0).ok).toBe(true);
    const stack = w.state.containers.bag.slots.find((s) => s?.itemId === 'cheese')!;
    expect(stack.qty).toBe(3);
    expect(stack.bonus).toBeCloseTo(0.7);
    expect(stack.freshness).toBeCloseTo(90);
    const plain = w.merchant.unitPrice('cheese', 90, 0);
    expect(w.merchant.unitPrice('cheese', 90, stack.bonus)).toBeGreaterThan(plain * 1.6);
  });

  it('숙성된 것과 안 된 것은 따로 쌓이고, 숙성 중이면 철거할 수 없다', () => {
    const w = setup(43);
    const c = place(w, 'cellar');
    w.inventory.add('bag', 'wine', 1);
    w.aging.put(c, 'wine');
    expect(w.grid.remove(c.uid).ok).toBe(false);
    for (let i = 0; i < 3; i++) w.time.skipToNextDay();
    w.aging.take(c, 0);
    w.inventory.add('bag', 'wine', 1);
    const wines = w.state.containers.bag.slots.filter((s) => s?.itemId === 'wine');
    expect(wines.length).toBe(2);
  });
});
