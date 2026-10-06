/**
 * 양식장 — 넣기·먹이·번식·어란·확장·업그레이드·자동화, 굶겨도 죽지 않음
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, giveLand, giveMats } from './helpers';
import { POND_TIERS, roeId } from '../src/data/aquaculture';
import type { World } from '../src/core/World';

function withPond(w: World) {
  w.state.gold = 1_000_000;
  w.state.life.fishingXp = 99999;
  w.state.skills.researched.push('fi_pond', 'fi_pondAuto');
  giveLand(w, 4, 4, 12, 10);
  giveMats(w);
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++)
      if (w.grid.canPlace('fishpond', x, y, 0).ok) {
        const r = w.grid.place('fishpond', x, y, 0);
        expect(r.ok).toBe(true);
        return w.state.buildings[r.uid!];
      }
  throw new Error('no pond spot');
}

describe('양식장', () => {
  it('연구 [양식] 전에는 지을 수 없다', () => {
    const w = freeWorld(31);
    w.state.gold = 1_000_000;
    giveLand(w, 4, 4, 12, 10);
    giveMats(w);
    let reason = '';
    for (let y = 0; y < 30 && !reason; y++) for (let x = 0; x < 30 && !reason; x++) if (w.grid.canPlace('fishpond', x, y, 0).ok) reason = w.grid.place('fishpond', x, y, 0).reason ?? 'placed';
    expect(reason).toContain('연구');
  });

  it('한 종류만, 용량 5에서 시작, 먹이를 주면 번식하고 어란을 낳는다', () => {
    const w = freeWorld(32);
    const b = withPond(w);
    w.inventory.add('bag', 'carp', 6);
    w.inventory.add('bag', 'crucian', 1);
    expect(w.ponds.stock(b, 'carp').ok).toBe(true);
    expect(w.ponds.stock(b, 'crucian').ok).toBe(false); // 다른 종
    expect(w.ponds.stock(b, 'carp').ok).toBe(true);
    expect(w.ponds.capacity(b)).toBe(POND_TIERS[0].cap);
    w.inventory.add('bag', 'fish_feed', 200);
    let roe = 0;
    for (let i = 0; i < 25; i++) {
      w.ponds.feed(b);
      w.time.skipToNextDay();
      roe += w.state.containers[b.outputId!].slots.filter((s) => s?.itemId === roeId('carp')).reduce((n, s) => n + s!.qty, 0);
      w.ponds.collect(b);
    }
    expect(b.pond!.count).toBeGreaterThan(2);
    expect(b.pond!.count).toBeLessThanOrEqual(5);
    expect(roe).toBeGreaterThan(0);
  });

  it('굶겨도 죽지 않는다 (생산만 쉰다)', () => {
    const w = freeWorld(33);
    const b = withPond(w);
    w.inventory.add('bag', 'carp', 3);
    for (let i = 0; i < 3; i++) w.ponds.stock(b, 'carp');
    for (let i = 0; i < 10; i++) w.time.skipToNextDay();
    expect(b.pond!.count).toBe(3);
    expect(w.ponds.pendingOutput(b)).toBe(0);
  });

  it('확장 재료로 5 → 8 → 10, 업그레이드와 자동 사료·수거', () => {
    const w = freeWorld(34);
    const b = withPond(w);
    for (const id of ['reed', 'clam', 'pondweed', 'fish_feed', 'pearl', 'stone']) w.inventory.add('bag', id, 60);
    expect(w.ponds.expand(b).ok).toBe(true);
    expect(w.ponds.capacity(b)).toBe(8);
    expect(w.ponds.expand(b).ok).toBe(true);
    expect(w.ponds.capacity(b)).toBe(10);
    expect(w.ponds.expand(b).ok).toBe(false);
    expect(w.ponds.upgrade(b, 'autoFeed').ok).toBe(true);
    expect(w.ponds.upgrade(b, 'autoCollect').ok).toBe(true);
    expect(w.ponds.upgrade(b, 'roeYield').ok).toBe(true);
    w.inventory.add('bag', 'carp', 4);
    for (let i = 0; i < 4; i++) w.ponds.stock(b, 'carp');
    const feed = w.inventory.countAll('fish_feed');
    w.time.skipToNextDay(); // 다음 날 아침 자동 사료
    expect(b.pond!.fedToday).toBe(true);
    expect(w.inventory.countAll('fish_feed')).toBeLessThan(feed);
  });

  it('물고기가 있으면 철거할 수 없고, 건지면 가방으로', () => {
    const w = freeWorld(35);
    const b = withPond(w);
    w.inventory.add('bag', 'carp', 1);
    w.ponds.stock(b, 'carp');
    expect(w.grid.remove(b.uid).ok).toBe(false);
    expect(w.ponds.takeOut(b).ok).toBe(true);
    expect(w.inventory.countAll('carp')).toBe(1);
    expect(b.pond!.fishId).toBeNull();
  });
});
