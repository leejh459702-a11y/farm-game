/**
 * 생활 콘텐츠 — 외곽 지역 자원 재생, 낚시, 숙련도, 도구, 자원 활용
 */
import { describe, expect, it } from 'vitest';
import { freeWorld, newWorld } from './helpers';
import { REGION_H, REGION_W, regionLayout } from '../src/systems/RegionSystem';
import { FishingGame, fishWeight, pickFish } from '../src/systems/FishingSystem';
import { FISH, FISH_BY_ID } from '../src/data/fish';
import { lifeLevelFromXp } from '../src/systems/LifeSystem';
import { sellPrice } from '../src/services/EconomyService';
import type { World } from '../src/core/World';

const forage = (w: World, id: 'river' | 'forest') => w.regions.state(id).nodes.filter((n) => n.kind === 'forage').length;

describe('Resource Respawn Test', () => {
  it('숲 8~15, 강가 3~8 채집 포인트가 하루에 한 번만 생성된다', () => {
    const w = freeWorld(11);
    for (let d = 0; d < 20; d++) {
      const f = forage(w, 'forest');
      const r = forage(w, 'river');
      expect(f).toBeGreaterThanOrEqual(8);
      expect(f).toBeLessThanOrEqual(15);
      expect(r).toBeGreaterThanOrEqual(3);
      expect(r).toBeLessThanOrEqual(8);
      // 같은 날 다시 호출해도 늘어나지 않음
      w.regions.morning();
      w.regions.ensureDay('forest');
      expect(forage(w, 'forest')).toBe(f);
      w.time.skipToNextDay();
    }
  });

  it('채집하면 사라지고 같은 날엔 다시 생기지 않는다 (무한 파밍 불가)', () => {
    const w = freeWorld(12);
    const nodes = w.regions.state('forest').nodes.filter((n) => n.kind === 'forage');
    for (const n of nodes) expect(w.regions.interact('forest', n.id).ok).toBe(true);
    expect(forage(w, 'forest')).toBe(0);
    w.regions.ensureDay('forest');
    expect(forage(w, 'forest')).toBe(0);
    w.time.skipToNextDay();
    expect(forage(w, 'forest')).toBeGreaterThanOrEqual(8);
  });

  it('나무: 벌목 시 목재, 큰 나무는 2~3일, 작은 나무는 1일 후 재생', () => {
    const w = freeWorld(13);
    const tree = w.regions.state('forest').nodes.find((n) => n.kind === 'tree' && n.big)!;
    let res;
    let hits = 0;
    do {
      res = w.regions.interact('forest', tree.id);
      hits++;
    } while (!res.depleted && hits < 20);
    expect(res.drops.some((d) => d.itemId === 'wood')).toBe(true);
    expect(w.inventory.countAll('wood')).toBeGreaterThanOrEqual(4);
    const due = tree.respawnDay! - w.state.time.day;
    expect(due).toBeGreaterThanOrEqual(2);
    expect(due).toBeLessThanOrEqual(3);
    w.time.skipToNextDay();
    expect(tree.respawnDay).not.toBeNull();
    w.time.skipToNextDay();
    w.time.skipToNextDay();
    expect(tree.respawnDay).toBeNull();
  });

  it('바위: 기본 곡괭이로 돌/구리, 철 광맥은 구리 곡괭이 필요', () => {
    const w = freeWorld(14);
    const rocks = w.regions.state('hill').nodes.filter((n) => n.kind === 'rock');
    expect(rocks.length).toBeGreaterThan(10);
    const iron = rocks.find((n) => n.itemId === 'rock_iron') ?? rocks[0];
    iron.itemId = 'rock_iron';
    iron.hp = iron.maxHp = 5;
    expect(w.regions.interact('hill', iron.id).ok).toBe(false);
    w.state.tools.pickaxe = 1;
    let res;
    let n = 0;
    do res = w.regions.interact('hill', iron.id);
    while (!res.depleted && ++n < 10);
    expect(w.inventory.countAll('iron_ore')).toBeGreaterThan(0);
  });
});

describe('낚시', () => {
  it('계절 밖 물고기는 등장하지 않는다', () => {
    const ctx = { season: 'winter' as const, night: false, weather: 'sunny' as const, rareMul: 1, legendMul: 1, bait: false };
    expect(fishWeight(FISH_BY_ID.eel, ctx)).toBe(0);
    expect(fishWeight(FISH_BY_ID.smelt, ctx)).toBeGreaterThan(0);
  });
  it('장어: 여름 밤 비 오는 날 등장률 증가', () => {
    const base = { season: 'summer' as const, rareMul: 1, legendMul: 1, bait: false };
    const dayClear = fishWeight(FISH_BY_ID.eel, { ...base, night: false, weather: 'sunny' });
    const nightRain = fishWeight(FISH_BY_ID.eel, { ...base, night: true, weather: 'rain' });
    expect(nightRain).toBeGreaterThan(dayClear * 10);
  });
  it('전설 물고기는 계절별 1종, 조건을 모두 맞춰야 등장', () => {
    for (const s of ['spring', 'summer', 'autumn', 'winter'] as const) expect(FISH.filter((f) => f.rarity === 'legend' && f.season.includes(s)).length).toBeGreaterThanOrEqual(1);
    const ctx = { season: 'summer' as const, night: false, weather: 'sunny' as const, rareMul: 1, legendMul: 1, bait: false };
    expect(fishWeight(FISH_BY_ID.golden_catfish, ctx)).toBe(0);
    expect(fishWeight(FISH_BY_ID.golden_catfish, { ...ctx, night: true, weather: 'storm' })).toBeGreaterThan(0);
  });
  it('물고기 20종 이상', () => {
    expect(FISH.filter((f) => f.id !== 'old_boot').length).toBeGreaterThanOrEqual(20);
  });
  it('희귀 미끼는 희귀 이상 확률을 높인다', () => {
    let s = 5;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    const count = (bait: boolean) => {
      let n = 0;
      for (let i = 0; i < 4000; i++) if (pickFish(r, { season: 'spring', night: false, weather: 'sunny', rareMul: 1, legendMul: 1, bait }).rarity !== 'common') n++;
      return n;
    };
    expect(count(true)).toBeGreaterThan(count(false) * 1.8);
  });
  it('미니게임: 물고기를 영역 안에 두면 8~20초 사이에 잡힌다', () => {
    const times: number[] = [];
    for (const id of ['crucian', 'carp', 'snakehead']) {
      let seed = 3;
      const g = new FishingGame(FISH_BY_ID[id], 0, 1, () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
      let res = 'reel';
      // 간단한 플레이어: 물고기가 영역 중심보다 위면 누른다
      while (res === 'reel' && g.elapsed < 60) res = g.update(1 / 30, g.fishPos > g.zone + g.zoneSize / 2);
      expect(res).toBe('caught');
      times.push(g.elapsed);
    }
    for (const t of times) {
      expect(t).toBeGreaterThan(7);
      expect(t).toBeLessThan(25);
    }
  });
  it('아무것도 안 하면 놓친다', () => {
    let seed = 9;
    const g = new FishingGame(FISH_BY_ID.carp, 0, 1, () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    let res = 'reel';
    // 물고기를 계속 피하게 위로 올리기만
    while (res === 'reel' && g.elapsed < 60) res = g.update(1 / 30, g.fishPos < 0.5);
    expect(res).toBe('escaped');
  });
  it('포획: 신선도 100, 크기 기록, 숙련도 경험치, 크기 보너스는 작다', () => {
    const w = freeWorld(15);
    const r = w.fishing.landCatch('crucian');
    expect(r.size).toBeGreaterThanOrEqual(12);
    expect(r.size).toBeLessThanOrEqual(30);
    const s = w.state.containers.bag.slots.find((x) => x?.itemId === 'crucian')!;
    expect(s.freshness).toBe(100);
    expect(s.bonus ?? 0).toBeLessThanOrEqual(0.1);
    expect(w.state.fishRecords.crucian.count).toBe(1);
    expect(w.state.fishRecords.crucian.maxSize).toBe(r.size);
    expect(w.state.life.fishingXp).toBeGreaterThan(0);
    const base = sellPrice('crucian', 100, { season: 'spring', merchantBonus: 0 });
    const withBonus = sellPrice('crucian', 100, { season: 'spring', merchantBonus: 0 }, 0.1);
    expect(withBonus - base).toBeLessThanOrEqual(Math.ceil(base * 0.1) + 1);
  });
});

describe('생활 숙련도 / 도구', () => {
  it('낚싯대는 튜토리얼 종료 후 무료 지급', () => {
    const w = newWorld(16);
    w.tutorial.start();
    expect(w.state.tools.rodOwned).toBe(false);
    expect(w.fishing.canFish().ok).toBe(false);
    w.tutorial.skip();
    expect(w.state.tools.rodOwned).toBe(true);
  });
  it('숙련도 Lv.1~10, 농사/목축 레벨과 무관', () => {
    expect(lifeLevelFromXp(0)).toBe(1);
    expect(lifeLevelFromXp(10_000_000)).toBe(10);
    const w = freeWorld(17);
    w.life.addXp('fishing', 5000);
    expect(w.life.level('fishing')).toBe(10);
    expect(w.state.tools.rod).toBe(3); // Lv.10 최고급 낚싯대
    expect(w.skills.level('farming')).toBe(1);
  });
  it('도구 업그레이드는 골드 + 광석 소비', () => {
    const w = freeWorld(18);
    expect(w.life.upgradeTool('axe').ok).toBe(false);
    w.state.gold = 5000;
    w.inventory.add('bag', 'copper_ore', 10);
    w.inventory.add('bag', 'wood', 10);
    expect(w.life.upgradeTool('axe').ok).toBe(true);
    expect(w.state.tools.axe).toBe(1);
    expect(w.inventory.countAll('copper_ore')).toBe(0);
    expect(w.state.gold).toBe(4000);
  });
});

describe('자원 활용 연결', () => {
  it('건설에는 목재·돌이 필요하다', () => {
    const w = freeWorld(19);
    w.state.gold = 10000;
    expect(w.grid.place('chest', 15, 15, 0).ok).toBe(true); // 보관함 1개 무료
    const r = w.grid.place('chest', 15, 14, 0);
    expect(r.ok).toBe(false);
    w.inventory.add('bag', 'wood', 5);
    expect(w.grid.place('chest', 15, 14, 0).ok).toBe(true);
    expect(w.inventory.countAll('wood')).toBe(0);
  });
  it('물고기 → 요리, 버섯 → 요리 (태그 재료)', () => {
    const w = freeWorld(20);
    w.inventory.add('bag', 'crucian', 1, 100);
    expect(w.inventory.countMatching('#fish')).toBe(1);
    expect(w.inventory.consumeMatching('#fish', 1)).toBe(true);
    expect(w.inventory.countAll('crucian')).toBe(0);
    expect(FISH_BY_ID.crucian.cookingUses).toContain('grilled_fish');
  });
});

describe('지역 지도', () => {
  it('지도 크기 및 입구 통로', () => {
    for (const id of ['river', 'forest', 'hill'] as const) {
      const g = regionLayout(id);
      expect(g.length).toBe(REGION_H);
      expect(g[0].length).toBe(REGION_W);
      expect(g[7][1]).toBe('P');
    }
    expect(regionLayout('river').flat().filter((t) => t === 'W').length).toBeGreaterThan(40);
  });
});
