import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';

describe('신선도', () => {
  it('하루마다 작물별 감소량만큼 감소', () => {
    const w = freeWorld();
    w.inventory.add('bag', 'lettuce', 1, 100); // decay 12
    w.freshness.dailyDecay();
    const s = w.state.containers.bag.slots.find((x) => x?.itemId === 'lettuce')!;
    expect(s.freshness).toBe(88);
  });
  it('냉장창고는 60% 감소 억제', () => {
    const w = freeWorld();
    const id = w.inventory.create('fridge', 10, 0.4);
    w.inventory.add(id, 'lettuce', 1, 100);
    w.freshness.dailyDecay();
    expect(w.state.containers[id].slots[0]!.freshness).toBeCloseTo(100 - 12 * 0.4);
  });
  it('대형 저온창고는 85% 억제 (완전 정지 아님)', () => {
    const w = freeWorld();
    const id = w.inventory.create('coldStorage', 10, 0.15);
    w.inventory.add(id, 'lettuce', 1, 100);
    w.freshness.dailyDecay();
    const f = w.state.containers[id].slots[0]!.freshness!;
    expect(f).toBeLessThan(100);
    expect(f).toBeCloseTo(100 - 12 * 0.15);
  });
  it('0이 되면 부패물로 전환', () => {
    const w = freeWorld();
    w.inventory.add('bag', 'lettuce', 3, 10);
    w.freshness.dailyDecay();
    expect(w.inventory.count('bag', 'lettuce')).toBe(0);
    expect(w.inventory.count('bag', 'rotten')).toBe(3);
  });
  it('신선도 차이가 크면 다른 스택', () => {
    const w = freeWorld();
    w.inventory.add('bag', 'carrot', 1, 100);
    w.inventory.add('bag', 'carrot', 1, 50);
    const stacks = w.state.containers.bag.slots.filter((s) => s?.itemId === 'carrot');
    expect(stacks.length).toBe(2);
    w.inventory.add('bag', 'carrot', 1, 95);
    expect(w.state.containers.bag.slots.filter((s) => s?.itemId === 'carrot').length).toBe(2);
  });
  it('보존 식품은 감소하지 않음', () => {
    const w = freeWorld();
    w.inventory.add('bag', 'wool', 2);
    w.freshness.dailyDecay();
    expect(w.state.containers.bag.slots.find((s) => s?.itemId === 'wool')!.freshness).toBeUndefined();
  });
});
