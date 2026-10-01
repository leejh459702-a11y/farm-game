/** CodexSystem — 도감 기록 (작물/동물/가공품/요리/시설) */
import type { Animal, AnimalCodexEntry, CodexEntry } from '../types/game';
import { ITEM_BY_ID } from '../data/items';
import type { World } from '../core/World';

export class CodexSystem {
  constructor(private w: World) {}

  private entry(id: string): CodexEntry {
    return (this.w.state.codex.items[id] ??= { discovered: false, count: 0, bestPrice: 0 });
  }

  discoverItem(id: string): void {
    if (id === 'rotten' || !ITEM_BY_ID[id]) return;
    const e = this.entry(id);
    if (!e.discovered) {
      e.discovered = true;
      if (ITEM_BY_ID[id].category !== 'seed') {
        this.w.finance.today().discoveries.push(ITEM_BY_ID[id].name);
        this.w.notify({ key: 'discover', text: `새로운 발견: ${ITEM_BY_ID[id].name}`, icon: ITEM_BY_ID[id].icon, tone: 'good' });
      }
    }
  }

  recordHarvest(id: string, qty: number): void {
    this.discoverItem(id);
    this.entry(id).count += qty;
  }

  recordProduced(id: string, qty: number): void {
    this.discoverItem(id);
    this.entry(id).count += qty;
  }

  recordSale(id: string, unitPrice: number): void {
    const e = this.entry(id);
    e.bestPrice = Math.max(e.bestPrice, unitPrice);
  }

  animalEntry(species: string): AnimalCodexEntry {
    return (this.w.state.codex.animals[species] ??= { discovered: false, grades: [], traits: [], breedCount: 0, bestAnimalId: null, bestScore: 0, produced: 0 });
  }

  recordAnimal(a: Animal): void {
    const e = this.animalEntry(a.species);
    e.discovered = true;
    if (!e.grades.includes(a.grade)) e.grades.push(a.grade);
    for (const t of a.traits) if (!e.traits.includes(t)) e.traits.push(t);
    const score = animalScore(a);
    if (score > e.bestScore) {
      e.bestScore = score;
      e.bestAnimalId = a.id;
    }
  }
}

/** 개체 종합 점수 (도감 최고 개체 판단) */
export function animalScore(a: Animal): number {
  const s = a.stats;
  return (4 - a.grade) * 100 + s.productivity + s.growth + s.health + s.fertility + s.physique + a.traits.length * 15;
}
