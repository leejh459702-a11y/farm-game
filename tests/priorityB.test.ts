/**
 * 상인 세분화 · 농업 교환권 · 곤충 정원 · 희귀 생물(정령)
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, giveLand, giveMats } from './helpers';
import { MERCHANT_KINDS } from '../src/data/economy';
import { SPIRIT_BY_ID } from '../src/data/spirits';
import type { World } from '../src/core/World';

function place(w: World, type: string) {
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++)
      if (w.grid.canPlace(type, x, y, 0).ok) {
        const r = w.grid.place(type, x, y, 0);
        if (r.ok) return w.state.buildings[r.uid!];
      }
  throw new Error('no spot ' + type);
}

describe('방문상인 세분화', () => {
  it('여러 종류가 번갈아 오고, 어떤 상인이든 기본 씨앗은 챙겨 온다', () => {
    const w = freeWorld(91);
    w.state.skills.researched.push('l_chicken', 'f_processing');
    const kinds = new Set<string>();
    for (let i = 0; i < 80; i++) {
      w.merchant.arrive(false);
      kinds.add(w.state.merchant.kind!);
      expect(w.state.merchant.stock.some((e) => e.id.startsWith('seed_'))).toBe(true);
      w.merchant.leave();
    }
    expect(kinds.size).toBeGreaterThanOrEqual(4);
    expect(kinds.has('special')).toBe(false);
    expect(Object.keys(MERCHANT_KINDS)).toContain('collector');
  });

  it('튜토리얼 상인은 항상 일반 상인 (당근 씨앗)', () => {
    const w = freeWorld(92);
    w.merchant.arrive(false, true);
    expect(w.state.merchant.kind).toBe('general');
  });

  it('수집 상인은 유물을 비싸게 산다', () => {
    const w = freeWorld(93);
    w.state.merchant.present = true;
    w.state.merchant.kind = 'general';
    const normal = w.merchant.unitPrice('art_gear');
    w.state.merchant.kind = 'collector';
    expect(w.merchant.unitPrice('art_gear')).toBeGreaterThan(normal * 3);
  });
});

describe('농업 교환권', () => {
  it('선택형 교환 (랜덤 없음), 부족하면 실패', () => {
    const w = freeWorld(94);
    expect(w.tickets.exchange('ex_book', 'book_miner').ok).toBe(false);
    w.tickets.give(12, '테스트');
    expect(w.tickets.exchange('ex_book', 'book_miner').ok).toBe(true);
    expect(w.inventory.countAll('book_miner')).toBe(1);
    expect(w.tickets.have).toBe(0);
  });

  it('월간 기록·도감 달성으로 얻는다', () => {
    const w = freeWorld(95);
    w.tickets.onMonthEnd(60000);
    expect(w.tickets.have).toBe(2);
    for (let i = 0; i < 20; i++) w.codex.discoverItem(['carrot', 'potato', 'lettuce', 'radish', 'onion', 'pea', 'strawberry', 'tomato', 'cucumber', 'pepper', 'corn', 'melon', 'egg', 'milk', 'wool', 'wood', 'stone', 'clay', 'coal', 'herb'][i]);
    w.tickets.checkCodex();
    expect(w.tickets.have).toBeGreaterThanOrEqual(4);
  });
});

describe('곤충 정원', () => {
  it('꽃이 많을수록 곤충이 많이 오고, 탭하면 도감 등록 + 첫 관찰 보상', () => {
    const w = freeWorld(96);
    w.state.gold = 1_000_000;
    giveLand(w, 4, 4, 12, 10);
    giveMats(w);
    w.state.time.day = 35; // 여름
    w.insects.morning();
    const none = w.state.insects.today.length;
    for (let i = 0; i < 6; i++) place(w, 'flowerbed');
    w.state.insects.day = -1;
    w.insects.morning();
    expect(w.state.insects.today.length).toBeGreaterThan(none);
    const sp = w.state.insects.today[0];
    const gold = w.state.gold;
    expect(w.insects.catch(sp.id).ok).toBe(true);
    expect(w.state.gold).toBeGreaterThan(gold);
    expect(w.insects.catch(sp.id).ok).toBe(false);
  });
});

describe('희귀 생물 (정령)', () => {
  it('마스터리 연구 전에는 사당을 지을 수 없고, 불러내기·먹이·생산·조합이 된다', () => {
    const w = freeWorld(97);
    w.state.gold = 9_999_999;
    giveLand(w, 4, 4, 12, 10);
    giveMats(w);
    expect(() => place(w, 'spirit_shrine')).toThrow();
    w.state.skills.researched.push('f_m_seed');
    for (const id of ['amethyst', 'gold_ore', 'stone']) w.inventory.add('bag', id, 60);
    const b = place(w, 'spirit_shrine');
    for (const m of [...SPIRIT_BY_ID.forest_spirit.summon!, ...SPIRIT_BY_ID.water_spirit.summon!]) w.inventory.add('bag', m.id, m.qty);
    expect(w.spirits.summon(b, 'forest_spirit').ok).toBe(true);
    expect(w.spirits.summon(b, 'water_spirit').ok).toBe(true);
    expect(w.spirits.summon(b, 'dew_spirit').ok).toBe(false);
    w.inventory.add('bag', 'herb', 30);
    w.inventory.add('bag', 'pondweed', 30);
    for (let i = 0; i < 6; i++) {
      w.spirits.feedAll(b);
      w.time.skipToNextDay();
    }
    expect(w.spirits.collect(b)).toBeGreaterThan(0);
    const [a, c] = b.shrine!.spirits;
    expect(a.bond).toBeGreaterThanOrEqual(50);
    expect(w.spirits.fuse(b, a.id, c.id).ok).toBe(true);
    for (let i = 0; i < 3; i++) w.time.skipToNextDay();
    expect(b.shrine!.spirits.some((s) => s.kind === 'dew_spirit')).toBe(true);
    expect(w.state.spiritsSeen).toContain('dew_spirit');
  });
});
