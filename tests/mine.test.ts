/**
 * 광산 층 구조 · 사다리 · 승강기 · 매일 리셋 · 지오드 · 유물
 */
import { describe, expect, it } from 'vitest';
import { freeWorld } from './helpers';
import { MINE, mineBand } from '../src/data/mine';
import { ARTIFACTS } from '../src/data/artifacts';
import type { World } from '../src/core/World';

function miner(seed: number): World {
  const w = freeWorld(seed);
  w.state.life.foragingXp = 99999; // 채집 Lv.10
  w.state.tools.pickaxe = 3;
  return w;
}

/** 현재 층 바위를 깨서 사다리를 찾고 내려간다 */
function clearToLadder(w: World): boolean {
  for (let guard = 0; guard < 200 && !w.mine.st.ladder; guard++) {
    const rock = w.regions.activeNodes('mine').find((n) => n.kind === 'rock');
    if (!rock) return false;
    w.regions.interact('mine', rock.id);
  }
  return w.mine.st.ladder;
}

describe('광산', () => {
  it('채집 Lv.3 전에는 들어갈 수 없다', () => {
    const w = freeWorld(61);
    expect(w.mine.enter(1).ok).toBe(false);
    w.state.life.foragingXp = 99999;
    expect(w.mine.enter(1).ok).toBe(true);
  });

  it('층 구간마다 광맥이 다르다', () => {
    expect(Object.keys(mineBand(1).rocks)).toContain('rock_copper');
    expect(Object.keys(mineBand(1).rocks)).not.toContain('rock_gold');
    expect(Object.keys(mineBand(7).rocks)).toContain('rock_iron');
    expect(Object.keys(mineBand(12).rocks)).toContain('rock_gold');
    expect(Object.keys(mineBand(18).rocks)).toContain('rock_star');
  });

  it('바위를 깨면 사다리가 나오고(최대 5개), 내려가면 층이 늘고 5층에서 승강기가 열린다', () => {
    const w = miner(62);
    w.mine.enter(1);
    for (let f = 1; f < 5; f++) {
      expect(clearToLadder(w)).toBe(true);
      expect(w.mine.st.broken).toBeLessThanOrEqual(MINE.ladderGuarantee);
      expect(w.mine.descend().ok).toBe(true);
    }
    expect(w.mine.st.floor).toBe(5);
    expect(w.mine.elevatorFloors()).toEqual([1, 5]);
    expect(w.mine.enter(5).ok).toBe(true);
    expect(w.mine.enter(10).ok).toBe(false);
  });

  it('깊은 광산(11층~)은 채집 Lv.6 + 철 곡괭이가 필요하다', () => {
    const w = freeWorld(63);
    w.state.life.foragingXp = 99999;
    w.state.tools.pickaxe = 1;
    w.mine.st.deepest = 10;
    w.mine.enter(10);
    w.mine.st.ladder = true;
    expect(w.mine.descend().ok).toBe(false);
    w.state.tools.pickaxe = 2;
    expect(w.mine.descend().ok).toBe(true);
    expect(w.mine.st.floor).toBe(11);
  });

  it('매일 새로 생성된다 (같은 날 다시 들어오면 그대로)', () => {
    const w = miner(64);
    w.mine.enter(1);
    const a = w.regions.activeNodes('mine').map((n) => n.id).join();
    w.regions.ensureDay('mine');
    expect(w.regions.activeNodes('mine').map((n) => n.id).join()).toBe(a);
    w.time.skipToNextDay();
    w.regions.ensureDay('mine');
    expect(w.regions.activeNodes('mine').map((n) => n.id).join()).not.toBe(a);
  });

  it('지오드를 열면 무언가 나오고, 유물은 첫 발견 보상 + 세트 완성 보상', () => {
    const w = miner(65);
    w.inventory.add('bag', 'geode', 30);
    let got = 0;
    for (let i = 0; i < 30; i++) {
      const r = w.mine.open('geode');
      expect(r.ok).toBe(true);
      got += r.drops.length;
    }
    expect(got).toBe(30);
    const gold = w.state.gold;
    const set = ARTIFACTS.filter((a) => a.set === 'water');
    for (const a of set) w.mine.giveArtifact(a.id);
    expect(w.state.gold - gold).toBeGreaterThanOrEqual(set.filter((a) => a.source === 'fishing').length ? set.reduce((s, a) => s + a.firstReward, 0) - 2000 : 0);
    expect(w.mine.arts.found).toEqual(expect.arrayContaining(set.map((a) => a.id)));
    expect(w.mine.setComplete('water')).toBe(true);
    expect(w.mine.claimSet('water').ok).toBe(true);
    expect(w.mine.claimSet('water').ok).toBe(false);
    expect(w.inventory.countAll('rare_bait')).toBeGreaterThanOrEqual(10);
  });

  it('유물은 특급상인에게 더 비싸다', () => {
    const w = miner(66);
    w.state.merchant.special = false;
    const normal = w.merchant.unitPrice('art_gear');
    w.state.merchant.special = true;
    expect(w.merchant.unitPrice('art_gear')).toBeGreaterThan(normal * 2.5);
  });
});
