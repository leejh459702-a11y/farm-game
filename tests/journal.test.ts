/**
 * 농장일지 — 상태에서 진행도 계산, 달성 알림 1회, 보상 1회
 */
import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { JOURNAL } from '../src/data/journal';
import { migrate } from '../src/save/migrations';
import { createNewGame } from '../src/core/newGame';

describe('농장일지', () => {
  it('당근 3개 수확 → 달성 알림 한 번 → 보상 한 번', () => {
    const w = freeWorld(51);
    const e = JOURNAL.find((x) => x.id === 'harvest_carrot')!;
    expect(w.journal.progress(e).done).toBe(false);
    expect(w.journal.claim(e.id).ok).toBe(false);
    w.count('harvest:carrot', 3);
    expect(w.journal.progress(e).done).toBe(true);
    const notes = w.notifyLog.filter((n) => n.key === 'journal_harvest_carrot').length;
    expect(notes).toBe(1);
    w.journal.check();
    expect(w.notifyLog.filter((n) => n.key === 'journal_harvest_carrot').length).toBe(1);
    const gold = w.state.gold;
    expect(w.journal.claim(e.id).ok).toBe(true);
    expect(w.state.gold).toBe(gold + 300);
    expect(w.inventory.countAll('seed_potato')).toBeGreaterThanOrEqual(5);
    expect(w.journal.claim(e.id).ok).toBe(false);
  });

  it('실제 수확이 카운터를 올린다', () => {
    const w = freeWorld(52);
    w.state.weather.today = 'sunny';
    w.crops.till(15, 15);
    const p = w.crops.plotAt(15, 15)!;
    w.inventory.add('bag', 'seed_carrot', 1);
    w.crops.plant(p, 'seed_carrot');
    for (let i = 0; i < 3; i++) {
      w.crops.water(p);
      w.time.skipToNextDay();
    }
    expect(w.crops.harvest(p).ok).toBe(true);
    expect(w.state.counters['harvest:carrot']).toBeGreaterThan(0);
  });

  it('강제가 아니다: 아무것도 안 해도 패널티 없음, 다음 할 일 3개 제안', () => {
    const w = freeWorld(53);
    const gold = w.state.gold;
    for (let i = 0; i < 5; i++) w.time.skipToNextDay();
    expect(w.state.gold).toBe(gold);
    expect(w.journal.suggestions(3).length).toBe(3);
  });

  it('구버전 세이브에도 일지/카운터 기본값이 채워진다', () => {
    const s = createNewGame(1) as unknown as Record<string, unknown>;
    delete s.journal;
    delete s.counters;
    const m = migrate(s);
    expect(m.journal.claimed).toEqual([]);
    expect(m.counters).toEqual({});
  });
});
