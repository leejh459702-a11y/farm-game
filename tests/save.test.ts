import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { SaveSystem } from '../src/save/SaveSystem';
import { migrate } from '../src/save/migrations';
import { SAVE_VERSION } from '../src/core/newGame';
import { freeWorld } from './helpers';
import { World } from '../src/core/World';

describe('저장/불러오기', () => {
  it('IndexedDB 저장 후 동일 상태 복원', async () => {
    const save = new SaveSystem(indexedDB);
    const w = freeWorld(777);
    w.crops.till(15, 15);
    w.inventory.add('bag', 'tomato', 5, 80);
    w.state.gold = 4321;
    await save.save(2, w.state);
    const loaded = await save.load(2);
    expect(loaded).not.toBeNull();
    expect(loaded!.gold).toBe(4321);
    expect(loaded!.version).toBe(SAVE_VERSION);
    const w2 = new World(loaded!);
    expect(w2.crops.plotAt(15, 15)).toBeTruthy();
    expect(w2.inventory.count('bag', 'tomato')).toBe(5);
    expect(w2.grid.house()).toBeTruthy();
  });
  it('슬롯 목록과 삭제', async () => {
    const save = new SaveSystem(indexedDB);
    const w = freeWorld();
    await save.save(1, w.state);
    let slots = await save.listSlots();
    expect(slots.find((s) => s.slot === 1)!.exists).toBe(true);
    await save.remove(1);
    slots = await save.listSlots();
    expect(slots.find((s) => s.slot === 1)!.exists).toBe(false);
  });
  it('버전 없는 구 세이브 마이그레이션', () => {
    const w = freeWorld();
    const raw = JSON.parse(JSON.stringify(w.state));
    delete raw.version;
    delete raw.favorites;
    const m = migrate(raw);
    expect(m.version).toBe(SAVE_VERSION);
    expect(Array.isArray(m.favorites)).toBe(true);
  });
  it('미래 버전 세이브는 거부', () => {
    const w = freeWorld();
    expect(() => migrate({ ...w.state, version: 999 })).toThrow();
  });
});
