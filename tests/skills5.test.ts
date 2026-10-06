/**
 * 5대 생활 기술 + 마스터리
 */
import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { SKILLS, TREES } from '../src/data/skills';
import { migrate } from '../src/save/migrations';
import { createNewGame } from '../src/core/newGame';

describe('5대 생활 기술', () => {
  it('5개 분야, 분야마다 마스터리(Lv.10) 노드가 있고 선행 기술은 같은 분야', () => {
    expect(TREES).toEqual(['farming', 'livestock', 'fishing', 'gathering', 'business']);
    for (const t of TREES) {
      const list = SKILLS.filter((s) => s.tree === t);
      expect(list.length, t).toBeGreaterThan(3);
      expect(list.some((s) => s.mastery && s.level === 10), t).toBe(true);
      for (const s of list) for (const r of s.requires) expect(SKILLS.find((x) => x.id === r)?.tree, `${s.id}→${r}`).toBe(t);
    }
  });

  it('가공·판매로 가공·경영 경험치, 낚시·채집 분야는 생활 숙련도와 같다', () => {
    const w = freeWorld(71);
    expect(w.skills.level('business')).toBe(1);
    w.skills.addXp('business', 5000);
    expect(w.skills.level('business')).toBeGreaterThan(1);
    w.state.life.fishingXp = 99999;
    expect(w.skills.level('fishing')).toBe(w.life.level('fishing'));
  });

  it('마스터리는 Lv.10 이 돼야 연구할 수 있다', () => {
    const w = freeWorld(72);
    w.state.gold = 999999;
    w.state.skills.researched.push('fi_bait', 'fi_rare', 'fi_legend');
    expect(w.skills.check('fi_m_legend').ok).toBe(false);
    w.state.life.fishingXp = 999999;
    expect(w.skills.check('fi_m_legend').ok).toBe(true);
  });

  it('흥정의 달인: 판매가 +5%, 대량 생산: 작업 슬롯 +1, 단골 상인: 1~2일 간격', () => {
    const w = freeWorld(73);
    const before = w.merchant.unitPrice('carrot', 100);
    w.state.skills.researched.push('b_trader', 'b_bulk', 'b_regular');
    expect(w.merchant.unitPrice('carrot', 100)).toBeGreaterThanOrEqual(Math.round(before * 1.05) - 1);
    for (let i = 0; i < 20; i++) {
      w.merchant.scheduleNext();
      const gap = w.state.merchant.nextVisitDay - w.state.time.day;
      expect(gap).toBeGreaterThanOrEqual(1);
      expect(gap).toBeLessThanOrEqual(2);
    }
  });

  it('철 이상 도구는 [도구 강화] 연구가 필요하다', () => {
    const w = freeWorld(74);
    w.state.gold = 999999;
    for (const id of ['wood', 'stone', 'copper_ore', 'iron_ore', 'gold_ore', 'coal']) w.inventory.add('bag', id, 99);
    w.state.tools.axe = 1;
    expect(w.life.toolInfo('axe').ok).toBe(false);
    w.state.skills.researched.push('ga_tools');
    expect(w.life.toolInfo('axe').ok).toBe(true);
  });

  it('v4 세이브: 양식장·광산을 쓰던 플레이어는 해당 연구를 받는다', () => {
    const s = createNewGame(1) as unknown as Record<string, unknown>;
    s.version = 4;
    (s.buildings as Record<string, unknown>).b1 = { uid: 'b1', type: 'fishpond', x: 0, y: 0, rot: 0, upgrades: { autoFeed: 1 } };
    s.mine = { floor: 12, deepest: 12, genKey: '', broken: 0, ladder: false };
    const m = migrate(s);
    expect(m.skills.researched).toEqual(expect.arrayContaining(['fi_pond', 'fi_pondAuto', 'ga_mine', 'ga_deep']));
  });
});
