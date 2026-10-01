import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/core/GameEngine';
import { createState, key } from '../src/core/state';
import { addItem, itemCount } from '../src/systems/InventorySystem';
import { skills } from '../src/data/skills';
import { BalanceConfig as B } from '../src/data/balance';
const farm = () => {
  const s = createState();
  s.tutorial = 9;
  s.gold = 1000000;
  s.farmXp = s.animalXp = 1000;
  s.skills = skills.map((s) => s.id);
  for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) s.tiles[key(x, y)] = { x, y };
  return new GameEngine(s);
};
describe('advanced production and movement regressions', () => {
  it('pest prevention removes pests and protects the harvest bonus without killing crops', () => {
    const e = farm();
    e.till(15, 15);
    const p = e.state.tiles[key(15, 15)].plot!;
    p.crop = 'carrot';
    p.growth = 1;
    p.soil = 2;
    p.pestActive = true;
    expect(e.upgradePlot([key(15, 15)], 'pest')).toBe(true);
    expect(p.pestActive).toBe(false);
    expect(e.harvest(15, 15)).toBe(true);
    expect(itemCount(e.state, 'carrot')).toBe(2);
  });
  it('moves an occupied greenhouse with its crops and preserves growth', () => {
    const e = farm();
    e.place('greenhouse', 10, 10);
    e.till(10, 10);
    addItem(e.state, 'seed:carrot', 'seed', 1);
    e.plant(10, 10, 'carrot');
    e.state.tiles[key(10, 10)].plot!.growth = 0.5;
    const id = e.state.buildings[0].id;
    expect(e.move([id], 12, 12)).toBe(true);
    expect(e.state.tiles[key(10, 10)].plot).toBeUndefined();
    expect(e.state.tiles[key(12, 12)].plot).toMatchObject({
      crop: 'carrot',
      growth: 0.5,
      greenhouse: true,
    });
  });
  it('moves multiple facilities atomically, rejects occupied destination', () => {
    const e = farm();
    e.place('chest', 10, 10);
    e.place('well', 11, 10);
    const ids = e.state.buildings.map((b) => b.id);
    e.till(15, 15);
    expect(e.move(ids, 15, 15)).toBe(false);
    expect(e.state.buildings[0].x).toBe(10);
    expect(e.move(ids, 15, 16)).toBe(true);
    expect(e.state.buildings.map((b) => [b.x, b.y])).toEqual([
      [15, 16],
      [16, 16],
    ]);
  });
  it('reserves a birth slot to prevent purchasing over the barn capacity', () => {
    const e = farm();
    e.place('coop', 10, 10);
    e.place('breeding', 14, 10);
    const id = e.state.buildings[0].id;
    const f = e.makeAnimal('chicken', 'F', id),
      m = e.makeAnimal('chicken', 'M', id);
    f.stage = m.stage = 'adult';
    e.state.animals.push(f, m, e.makeAnimal('chicken', 'F', id));
    e.state.merchant.present = true;
    expect(e.breed(f.id, m.id)).toBe(true);
    expect(e.barnSpace(id)).toBe(0);
    expect(e.buyAnimal('chicken', 'F')).toBe(false);
  });
  it('automatically feeds, cleans, collects and harvests without breeding', () => {
    const e = farm();
    e.place('coop', 10, 10);
    e.place('chest', 9, 10);
    const b = e.state.buildings[0];
    b.upgrades = { feed: true, clean: true, collect: true, processing: false };
    const a = e.makeAnimal('chicken', 'F', b.id);
    a.stage = 'adult';
    a.age = 5;
    a.fed = true;
    a.clean = true;
    e.state.animals.push(a);
    addItem(e.state, 'feed', 'other', 10);
    e.till(15, 15);
    const p = e.state.tiles[key(15, 15)].plot!;
    p.crop = 'carrot';
    p.watered = true;
    p.autoHarvest = true;
    p.irrigation = 3;
    e.endDay();
    expect(itemCount(e.state, 'egg')).toBe(1);
    expect(itemCount(e.state, 'carrot')).toBe(1);
    expect(a.fed).toBe(true);
    expect(a.clean).toBe(true);
    expect(e.state.animals).toHaveLength(1);
  });
  it('repeats processing only when the player explicitly enables it and inputs remain', () => {
    const e = farm();
    e.place('processor', 10, 10);
    addItem(e.state, 'milk', 'animal', 6);
    e.process('butter', undefined, true);
    e.endDay();
    expect(itemCount(e.state, 'butter')).toBe(1);
    expect(e.state.jobs).toHaveLength(1);
    e.endDay();
    e.endDay();
    expect(itemCount(e.state, 'butter')).toBe(3);
    expect(e.state.jobs).toHaveLength(0);
  });
  it('recycles rotten crops with compost technology and facility', () => {
    const e = farm();
    e.place('compost', 10, 10);
    addItem(e.state, 'carrot', 'crop', 3, 0);
    expect(
      e.discard(
        e.state.inventory.findIndex((i) => i.id === 'carrot'),
        true,
      ),
    ).toBe(true);
    expect(itemCount(e.state, 'fertilizer')).toBe(3);
  });
  it('preserves sold parents in ancestry records and produces non-graphic shipment output', () => {
    const e = farm();
    e.place('meatplant', 10, 10);
    const a = e.makeAnimal('pig', 'M', 'x');
    e.state.animals.push(a);
    expect(e.shipAnimal(a.id)).toBe(true);
    expect(e.state.ancestry[0].id).toBe(a.id);
    for (let i = 0; i < B.shipmentDays; i++) e.endDay();
    expect(e.collectJob(e.state.jobs[0].id)).toBe(true);
    expect(itemCount(e.state, 'meat')).toBe(B.meatQuantity);
  });
  it('continues processing a full 900-plot farm without losing crops', () => {
    const e = farm();
    for (const t of Object.values(e.state.tiles)) {
      t.plot = {
        crop: 'carrot',
        growth: 0,
        watered: true,
        irrigation: 1,
        soil: 0,
        fertilizer: 0,
        pest: 0,
        autoHarvest: false,
      };
    }
    e.endDay();
    expect(Object.values(e.state.tiles).filter((t) => t.plot && e.ready(t.plot))).toHaveLength(900);
  });
});
