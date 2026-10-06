/**
 * 연구 컬렉션 · 스킬북
 */
import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { agingBonus } from '../src/data/aging';

describe('연구 컬렉션', () => {
  it('나눠서 제출 → 완성 시 보상 한 번', () => {
    const w = freeWorld(81);
    w.inventory.add('bag', 'carrot', 5);
    w.inventory.add('bag', 'potato', 2);
    const r1 = w.collections.submit('c_spring');
    expect(r1.ok).toBe(true);
    expect(w.collections.isDone('c_spring')).toBe(false);
    expect(w.inventory.countAll('carrot')).toBe(0);
    w.inventory.add('bag', 'potato', 3);
    w.inventory.add('bag', 'lettuce', 5);
    w.inventory.add('bag', 'strawberry', 5);
    expect(w.collections.submit('c_spring').ok).toBe(true);
    expect(w.collections.isDone('c_spring')).toBe(true);
    expect(w.inventory.countAll('book_farmer')).toBe(1);
    expect(w.collections.submit('c_spring').ok).toBe(false);
  });

  it('태그 재료(#roe)도 제출할 수 있고, 도구 보상은 한 단계 올린다', () => {
    const w = freeWorld(82);
    w.inventory.add('bag', 'roe_carp', 6);
    w.inventory.add('bag', 'roe_crucian', 4);
    w.inventory.add('bag', 'pondweed', 5);
    expect(w.collections.submit('c_roe').ok).toBe(true);
    expect(w.collections.isDone('c_roe')).toBe(true);
    for (const [id, q] of [['copper_ore', 10], ['iron_ore', 8], ['silver_ore', 5], ['gold_ore', 3]] as const) w.inventory.add('bag', id, q);
    const pick = w.state.tools.pickaxe;
    w.collections.submit('c_ore');
    expect(w.state.tools.pickaxe).toBe(pick + 1);
  });
});

describe('스킬북', () => {
  it('읽으면 영구 효과, 같은 책은 두 번 못 읽는다', () => {
    const w = freeWorld(83);
    w.inventory.add('bag', 'book_farmer', 2);
    expect(w.collections.read('book_farmer').ok).toBe(true);
    expect(w.collections.read('book_farmer').ok).toBe(false);
    expect(w.inventory.countAll('book_farmer')).toBe(1);
    // 성장 5일 이상 작물은 1일 진행된 상태로 시작
    w.state.skills.farmingXp = 99999;
    w.crops.till(15, 15);
    const p = w.crops.plotAt(15, 15)!;
    w.inventory.add('bag', 'seed_tomato', 1);
    expect(w.crops.plant(p, 'seed_tomato').ok).toBe(true);
    expect(p.growthProgressDays).toBe(1);
  });

  it('숙성 장인의 책: 숙성 보너스 +15%', () => {
    const w = freeWorld(84);
    w.state.skills.researched.push('f_aging');
    const b = { uid: 'x', type: 'cellar', x: 0, y: 0, rot: 0 as const };
    w.state.buildings.x = b;
    w.aging.ensure(b);
    w.inventory.add('bag', 'cheese', 1);
    w.aging.put(b, 'cheese');
    for (let i = 0; i < 7; i++) w.time.skipToNextDay();
    const s = b.cellar!.slots[0]!;
    const plain = w.aging.bonusOf(s);
    w.state.books.push('book_aging');
    expect(w.aging.bonusOf(s)).toBeCloseTo(agingBonus('cheese', 7) * 1.15);
    expect(w.aging.bonusOf(s)).toBeGreaterThan(plain);
  });
});
