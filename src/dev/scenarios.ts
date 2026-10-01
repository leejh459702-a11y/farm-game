import { createState, key } from '../core/state';
import { GameEngine } from '../core/GameEngine';
import { skills } from '../data/skills';
import { addItem } from '../systems/InventorySystem';
export function lateFarm() {
  const s = createState('QA · 자라난 농장');
  s.tutorial = 9;
  s.gold = 250000;
  s.houseLevel = 4;
  s.farmXp = s.animalXp = 800;
  s.day = 6;
  s.skills = skills.map((k) => k.id);
  s.settings.autosave = false;
  s.merchant = {
    present: true,
    special: true,
    nextDay: 8,
    misses: 0,
    buyBonus: 0.3,
    discount: 0.2,
  };
  for (let y = 9; y <= 21; y++) for (let x = 9; x <= 21; x++) s.tiles[key(x, y)] = { x, y };
  const e = new GameEngine(s);
  e.place('house', 13, 11);
  e.place('coop', 16, 11);
  e.place('cowbarn', 18, 14);
  e.place('sheepbarn', 15, 16);
  e.place('cold', 10, 12);
  e.place('processor', 10, 15);
  e.place('kitchen', 10, 18);
  e.place('breeding', 14, 19);
  e.place('greenhouse', 18, 18);
  for (let y = 14; y < 18; y++)
    for (let x = 12; x < 15; x++) {
      e.till(x, y);
      const p = s.tiles[key(x, y)].plot!;
      p.crop = x === 12 ? 'carrot' : x === 13 ? 'strawberry' : 'lettuce';
      p.growth = y % 2 ? 0 : 3;
      p.watered = true;
      p.irrigation = 1;
    }
  const coop = s.buildings.find((b) => b.type === 'coop')!;
  for (let i = 0; i < 2; i++) {
    const a = e.makeAnimal('chicken', i ? 'M' : 'F', coop.id, 2);
    a.stage = 'adult';
    a.age = 7;
    a.name = i ? '햇살이' : '구름이';
    a.traits = ['온순함', '건강체'];
    a.products = 2;
    a.fed = a.clean = true;
    s.animals.push(a);
  }
  const cowBarn = s.buildings.find((b) => b.type === 'cowbarn')!;
  const cow = e.makeAnimal('cow', 'F', cowBarn.id, 1);
  cow.stage = 'adult';
  cow.age = 25;
  cow.name = '우유빛';
  cow.traits = ['우유 생산형'];
  cow.products = 3;
  s.animals.push(cow);
  e.breed(s.animals[0].id, s.animals[1].id);
  addItem(s, 'milk', 'animal', 12);
  addItem(s, 'egg', 'animal', 8);
  addItem(s, 'carrot', 'crop', 5);
  addItem(s, 'strawberry', 'crop', 6);
  addItem(s, 'feed', 'other', 50);
  addItem(s, 'carrot', 'crop', 3, 35);
  e.process('cheese');
  s.jobs[0].days = 0;
  s.daily.expenses = 0;
  s.monthly.expenses = 0;
  s.gold = 250000;
  s.history = [
    { day: 1, sales: 320, expenses: 50, fees: 0 },
    { day: 2, sales: 870, expenses: 120, fees: 0 },
    { day: 3, sales: 1200, expenses: 200, fees: 0 },
    { day: 4, sales: 650, expenses: 80, fees: 0 },
    { day: 5, sales: 1800, expenses: 250, fees: 0 },
  ];
  return s;
}
