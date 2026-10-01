import { describe, it, expect } from 'vitest';
import { createState, key, level } from '../src/core/state';
import { GameEngine } from '../src/core/GameEngine';
import { canPlace, adjacent, canBuyLand, landPrice } from '../src/systems/FarmGridSystem';
import { freshnessMultiplier, salePrice, operatingFee } from '../src/services/EconomyService';
import {
  addItem,
  consume,
  decayInventory,
  itemCount,
  transfer,
} from '../src/systems/InventorySystem';
import { calendar } from '../src/data/seasons';
import {
  gradeProbabilities,
  rollGrade,
  inheritTraits,
  ancestors,
} from '../src/systems/BreedingSystem';
import { BalanceConfig as B } from '../src/data/balance';
import { crops } from '../src/data/crops';
import { animals } from '../src/data/animals';
import { buildingById } from '../src/data/buildings';
const rich = () => {
  const s = createState();
  s.gold = 1000000;
  s.tutorial = 9;
  return s;
};
describe('Phase 1: empty farm, house footprint and placement', () => {
  it('starts with precisely nine unoccupied tiles and no house', () => {
    const s = createState();
    expect(Object.keys(s.tiles)).toHaveLength(9);
    expect(s.buildings).toHaveLength(0);
    expect(Object.values(s.tiles).some((t) => t.plot)).toBe(false);
  });
  it('rejects previews over unowned, occupied or cultivated land', () => {
    const e = new GameEngine(createState());
    expect(canPlace(e.state, 'house', 14, 14)).toBe(true);
    expect(canPlace(e.state, 'house', 16, 16)).toBe(false);
    expect(e.place('house', 14, 14)).toBe(true);
    expect(canPlace(e.state, 'chest', 14, 14)).toBe(false);
    e.till(16, 16);
    expect(canPlace(e.state, 'chest', 16, 16)).toBe(false);
  });
  it('moves house at no cost while preserving its 2×2 footprint', () => {
    const e = new GameEngine(createState());
    e.place('house', 14, 14);
    const gold = e.state.gold;
    expect(e.move([e.state.buildings[0].id], 15, 15)).toBe(true);
    expect(e.state.gold).toBe(gold);
    expect(buildingById.house.width).toBe(2);
  });
});
describe('Phase 2: complete first-harvest economy loop', () => {
  it('completes house, hoe, seed, water, chest, growth, harvest, sell and 500G land expansion', () => {
    const e = new GameEngine(createState());
    expect(e.place('house', 14, 14)).toBe(true);
    expect(e.state.tutorial).toBe(1);
    e.till(16, 14);
    e.plant(16, 14, 'carrot');
    e.water(16, 14);
    expect(e.state.tutorial).toBe(4);
    expect(e.place('chest', 16, 16)).toBe(true);
    e.endDay();
    expect(e.state.tutorial).toBe(6);
    e.harvest(16, 14);
    expect(e.state.tutorial).toBe(7);
    expect(e.state.merchant.present).toBe(true);
    expect(e.sell(e.state.inventory.findIndex((i) => i.id === 'carrot'))).toBe(true);
    expect(e.state.gold).toBeGreaterThanOrEqual(500);
    expect(e.buyLand(17, 14)).toBe(true);
    expect(Object.keys(e.state.tiles)).toHaveLength(10);
    expect(e.state.tutorial).toBe(9);
  });
  it('only accepts four-way adjacency and respects bounds, caps, debt and money', () => {
    const s = rich();
    expect(adjacent(s, 17, 15)).toBe(true);
    expect(adjacent(s, 17, 17)).toBe(false);
    expect(adjacent(s, -1, 15)).toBe(false);
    expect(adjacent(s, 30, 15)).toBe(false);
    s.debt = 1;
    expect(canBuyLand(s, 17, 15)).toBe(false);
    s.debt = 0;
    s.gold = 499;
    expect(canBuyLand(s, 17, 15)).toBe(false);
  });
  it('prices each house tier using only that tier purchase count', () => {
    const s = rich();
    expect(landPrice(s)).toBe(500);
    s.landBought[0] = 3;
    expect(landPrice(s)).toBe(650);
    s.houseLevel = 2;
    expect(landPrice(s)).toBe(1500);
    s.landBought[1] = 2;
    expect(landPrice(s)).toBe(1650);
  });
  it('never destroys ready crops when inventory is full', () => {
    const e = new GameEngine(rich());
    e.till(14, 14);
    addItem(e.state, 'seed:carrot', 'seed', 1);
    e.plant(14, 14, 'carrot');
    e.state.tiles[key(14, 14)].plot!.growth = 1;
    for (let i = 0; i < 24; i++) addItem(e.state, `x${i}`, 'other', 1);
    expect(e.harvest(14, 14)).toBe(false);
    expect(e.state.tiles[key(14, 14)].plot!.crop).toBe('carrot');
  });
});
describe('Phase 3: time, weather and seasons', () => {
  it('advances months and seasons on their exact boundaries including year rollover', () => {
    expect(calendar(1)).toMatchObject({ month: 3, date: 1, season: 'spring', year: 1 });
    expect(calendar(10).date).toBe(10);
    expect(calendar(11).month).toBe(4);
    expect(calendar(31).season).toBe('summer');
    expect(calendar(91)).toMatchObject({ month: 12, season: 'winter' });
    expect(calendar(101).month).toBe(1);
    expect(calendar(120)).toMatchObject({ month: 2, date: 10 });
    expect(calendar(121)).toMatchObject({ month: 3, date: 1, year: 2 });
  });
  it('pauses time in menus and advances a day at precisely 600 seconds', () => {
    const e = new GameEngine(rich());
    e.tick(1);
    expect(e.state.elapsed).toBe(0);
    e.paused = false;
    e.state.elapsed = 599.9;
    e.tick(0.2);
    expect(e.state.day).toBe(2);
    expect(e.state.elapsed).toBe(0);
  });
  it('preserves off-season crops, resumes growth next season and permits ready harvest', () => {
    const e = new GameEngine(rich());
    e.till(14, 14);
    addItem(e.state, 'seed:carrot', 'seed', 1);
    e.plant(14, 14, 'carrot');
    e.state.day = 31;
    e.water(14, 14);
    e.endDay();
    expect(e.state.tiles[key(14, 14)].plot!.growth).toBe(0);
    expect(e.state.tiles[key(14, 14)].plot!.crop).toBe('carrot');
    e.state.day = 121;
    e.water(14, 14);
    e.endDay();
    expect(e.harvest(14, 14)).toBe(true);
  });
  it('does not grant growth speed bonuses for irrigation', () => {
    const e = new GameEngine(rich());
    e.till(14, 14);
    addItem(e.state, 'seed:onion', 'seed', 1);
    e.state.farmXp = 300;
    e.plant(14, 14, 'onion');
    const p = e.state.tiles[key(14, 14)].plot!;
    p.irrigation = 3;
    e.endDay();
    expect(p.growth).toBe(1);
    expect(p.watered).toBe(true);
  });
  it('rain waters outdoor fields, but not greenhouse fields', () => {
    const e = new GameEngine(rich());
    e.till(14, 14);
    e.till(15, 14);
    e.state.tiles[key(15, 14)].plot!.greenhouse = true;
    let values = [0.8];
    e.rng = () => values.shift() ?? 0.5;
    e.state.merchant.nextDay = 100;
    e.endDay();
    expect(e.state.weather).toBe('rain');
    expect(e.state.tiles[key(14, 14)].plot!.watered).toBe(true);
    expect(e.state.tiles[key(15, 14)].plot!.watered).toBe(false);
  });
});
describe('Phase 4: progression and costs', () => {
  it('cross-level requirements block advanced research', () => {
    const e = new GameEngine(rich());
    e.state.farmXp = 900;
    expect(e.research('auto-farm')).toBe(false);
    e.state.animalXp = 900;
    expect(e.research('auto-farm')).toBe(true);
  });
  it('monthly fee does not cause game-over or interest, blocks expansion until payment', () => {
    const e = new GameEngine(rich());
    e.state.day = 10;
    e.state.gold = 5;
    e.state.monthly.sales = 1000;
    e.endDay();
    expect(e.state.debt).toBe(15);
    expect(e.state.gold).toBe(0);
    e.state.gold = 600;
    expect(e.buyLand(17, 15)).toBe(false);
    e.payDebt();
    expect(e.state.debt).toBe(0);
    expect(e.buyLand(17, 15)).toBe(true);
  });
  it.each([1, 2, 3, 4, 5, 6])('operating fee follows house level %s', (lvl) => {
    expect(operatingFee(10000, lvl)).toBe(Math.floor(B.house[lvl - 1].fee * 10000));
  });
});
describe('Phase 5–6: individual animals and manual breeding', () => {
  it('all grade tables sum to one and match requested probabilities', () => {
    expect(gradeProbabilities(3, 3)).toEqual([0.8, 0.2, 0]);
    expect(gradeProbabilities(2, 3)).toEqual([0.35, 0.6, 0.05]);
    expect(gradeProbabilities(2, 2)).toEqual([0.1, 0.75, 0.15]);
    expect(gradeProbabilities(1, 2)).toEqual([0, 0.65, 0.35]);
    expect(gradeProbabilities(1, 1)).toEqual([0, 0.25, 0.75]);
    Object.values(B.breeding).forEach((p) => expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1));
  });
  it('rolls grade at the probability boundaries', () => {
    expect(rollGrade(3, 3, () => 0.79)).toBe(3);
    expect(rollGrade(3, 3, () => 0.8)).toBe(2);
    expect(rollGrade(1, 1, () => 0.24)).toBe(2);
    expect(rollGrade(1, 1, () => 0.25)).toBe(1);
  });
  it('uses 40% inheritance, deduplicates traits, caps three and permits mutation', () => {
    expect(inheritTraits(['건강체'], ['건강체'], () => 0.39)).toEqual(['건강체']);
    expect(inheritTraits(['건강체'], [], () => 0.4)).toEqual([]);
    expect(inheritTraits(['a', 'b', 'c', 'd'], [], () => 0)).toHaveLength(3);
    const random = [1, 0, 0];
    expect(inheritTraits(['a'], [], () => random.shift() ?? 1)).toHaveLength(1);
  });
  it('does not breed automatically and records parents, children and grade on birth', () => {
    const e = new GameEngine(rich());
    e.state.skills.push('breeding');
    e.place('coop', 14, 14);
    e.state.tiles[key(17, 14)] = { x: 17, y: 14 };
    e.state.tiles[key(17, 15)] = { x: 17, y: 15 };
    e.state.tiles[key(17, 16)] = { x: 17, y: 16 };
    e.state.tiles[key(18, 14)] = { x: 18, y: 14 };
    e.state.tiles[key(18, 15)] = { x: 18, y: 15 };
    e.state.tiles[key(18, 16)] = { x: 18, y: 16 };
    expect(e.place('breeding', 16, 14)).toBe(true);
    const barn = e.state.buildings.find((b) => b.type === 'coop')!.id;
    const f = e.makeAnimal('chicken', 'F', barn),
      m = e.makeAnimal('chicken', 'M', barn);
    f.stage = m.stage = 'adult';
    e.state.animals.push(f, m);
    e.endDay();
    expect(e.state.animals).toHaveLength(2);
    e.rng = () => 0.1;
    expect(e.breed(f.id, m.id)).toBe(true);
    for (let i = 0; i < B.gestation; i++) e.endDay();
    expect(e.state.animals).toHaveLength(3);
    const child = e.state.animals[2];
    expect(child.parents).toEqual([f.id, m.id]);
    expect(f.children).toContain(child.id);
    expect(m.children).toContain(child.id);
    expect(ancestors(child, e.state.animals)).toHaveLength(2);
  });
  it('keeps neglected and very old animals alive', () => {
    const e = new GameEngine(rich());
    const a = e.makeAnimal('chicken', 'F', 'x');
    a.age = 10000;
    e.state.animals.push(a);
    e.endDay();
    expect(e.state.animals).toHaveLength(1);
  });
});
describe('Phase 7: freshness, storage and pricing', () => {
  it.each([
    [100, 1.1],
    [90, 1.1],
    [89, 1],
    [70, 1],
    [69, 0.8],
    [50, 0.8],
    [49, 0.5],
    [20, 0.5],
    [19, 0.2],
    [1, 0.2],
    [0, 0],
  ])('freshness %s gives multiplier %s', (freshness, multiplier) => {
    expect(freshnessMultiplier(freshness)).toBe(multiplier);
  });
  it('combines freshness, season and merchant multipliers exactly once', () => {
    const s = createState();
    s.merchant.buyBonus = 0.2;
    const i = {
      id: 'carrot',
      type: 'crop' as const,
      quantity: 1,
      freshness: 100,
      storage: 'bag',
      favorite: false,
    };
    expect(salePrice(s, i)).toBe(Math.floor(90 * 1.1 * 1.1 * 1.2));
    s.day = 31;
    expect(salePrice(s, i)).toBe(Math.floor(90 * 1.1 * 1.2));
    i.freshness = 0;
    expect(salePrice(s, i)).toBe(0);
  });
  it('cold storage slows but never stops decay and transfers preserve freshness', () => {
    const s = rich();
    s.buildings.push({
      id: 'cold1',
      type: 'cold',
      x: 14,
      y: 14,
      rotation: false,
      upgrades: { feed: false, clean: false, collect: false, processing: false },
    });
    addItem(s, 'carrot', 'crop', 2);
    expect(
      transfer(
        s,
        s.inventory.findIndex((i) => i.id === 'carrot'),
        'cold1',
      ),
    ).toBe(true);
    decayInventory(s);
    const carrot = s.inventory.find((i) => i.id === 'carrot')!;
    expect(carrot.freshness).toBeCloseTo(96.8);
    expect(carrot.quantity).toBe(2);
  });
  it('consumes oldest edible items first and does not use spoiled inputs', () => {
    const s = rich();
    addItem(s, 'carrot', 'crop', 2, 100);
    addItem(s, 'carrot', 'crop', 2, 20);
    addItem(s, 'carrot', 'crop', 8, 0);
    expect(consume(s, 'carrot', 3)).toBe(true);
    expect(itemCount(s, 'carrot')).toBe(1);
    expect(s.inventory.find((i) => i.freshness === 0)?.quantity).toBe(8);
  });
});
describe('Phase 8–10: processing, automation and data coverage', () => {
  it('consumes recipe inputs, reserves facility, finishes after duration and collects output', () => {
    const e = new GameEngine(rich());
    e.state.skills.push('processing');
    expect(e.place('processor', 14, 14)).toBe(true);
    addItem(e.state, 'milk', 'animal', 6);
    expect(e.process('cheese')).toBe(true);
    expect(e.process('cheese')).toBe(false);
    e.endDay();
    expect(e.state.jobs[0].days).toBe(1);
    e.endDay();
    expect(e.state.jobs[0].days).toBe(0);
    expect(e.collectJob(e.state.jobs[0].id)).toBe(true);
    expect(itemCount(e.state, 'cheese')).toBe(1);
  });
  it('has 32 seasonal crops, one rare crop, 12 species and a max 900-tile farm', () => {
    expect(crops).toHaveLength(33);
    expect(animals).toHaveLength(12);
    expect(B.maxSize ** 2).toBe(900);
  });
  it('keeps crop and animal identity unique and data complete', () => {
    expect(new Set(crops.map((c) => c.id)).size).toBe(crops.length);
    expect(new Set(animals.map((a) => a.id)).size).toBe(animals.length);
    animals.forEach((a) => expect(buildingById[a.building]).toBeDefined());
  });
});
