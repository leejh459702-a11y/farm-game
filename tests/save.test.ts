import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import { SaveSystem, migrate } from '../src/save/SaveSystem';
import { createState } from '../src/core/state';
describe('versioned IndexedDB save slots', () => {
  it('round-trips three independent saves, including progress and settings', async () => {
    const save = new SaveSystem(),
      s = createState('첫 농장');
    s.tutorial = 4;
    s.settings.tapMove = true;
    s.gold = 777;
    await save.save(1, s);
    s.name = '둘째 농장';
    s.gold = 333;
    await save.save(2, s);
    s.name = '셋째 농장';
    await save.save(3, s);
    expect((await save.list()).map((s) => s.slot)).toEqual([1, 2, 3]);
    expect(await save.load(1)).toMatchObject({
      name: '첫 농장',
      gold: 777,
      tutorial: 4,
      settings: { tapMove: true },
    });
    expect((await save.load(2))?.name).toBe('둘째 농장');
  });
  it('serializes concurrent autosaves and stores snapshots at request time', async () => {
    const save = new SaveSystem(),
      s = createState();
    s.gold = 10;
    const a = save.save(4, s);
    s.gold = 20;
    const b = save.save(4, s);
    s.gold = 30;
    await Promise.all([a, b]);
    expect((await save.load(4))?.gold).toBe(20);
  });
  it('migrates missing settings and optional collections, rejects future and damaged formats', () => {
    const s = createState();
    const old = { ...s, version: 0, settings: {} };
    delete (old as Partial<typeof s>).ancestry;
    expect(migrate(old).settings.autosave).toBe(true);
    expect(migrate(old).ancestry).toEqual([]);
    expect(() => migrate({ ...s, version: 99 })).toThrow('새로운');
    expect(() => migrate({ version: 1 })).toThrow('손상');
  });
});
