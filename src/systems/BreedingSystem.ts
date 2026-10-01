/**
 * BreedingSystem — 플레이어가 직접 암컷+수컷을 골라 브리딩 (자동 번식 없음).
 * 등급 확률표, 능력치 유전, 특성 유전(40%) + 돌연변이, 3대 혈통 기록.
 */
import { BALANCE } from '../data/balance';
import { ANIMAL_BY_ID, GRADE_STAT_RANGE, TRAIT_BY_ID } from '../data/animals';
import { traitMul } from '../services/EconomyService';
import type { Animal, Grade, PedigreeRecord } from '../types/game';
import type { World } from '../core/World';

export type GradeDist = Record<1 | 2 | 3, number>;

export function gradeKey(a: Grade, b: Grade): string {
  return `${Math.min(a, b)}x${Math.max(a, b)}`;
}

/** 기본 확률표 조회 */
export function baseGradeDist(a: Grade, b: Grade): GradeDist {
  const t = BALANCE.breeding.gradeTable[gradeKey(a, b)];
  return { 1: t[1], 2: t[2], 3: t[3] };
}

/** 보너스 적용: 하위 등급 확률을 한 단계 위로 이동 */
export function applyGradeBonus(dist: GradeDist, bonus: number): GradeDist {
  if (bonus <= 0) return { ...dist };
  const d = { ...dist };
  const m3 = Math.min(bonus, d[3]);
  d[3] -= m3;
  d[2] += m3;
  const m2 = Math.min(bonus, d[2]);
  d[2] -= m2;
  d[1] += m2;
  return d;
}

export function rollGrade(r: () => number, dist: GradeDist): Grade {
  const x = r();
  if (x < dist[1]) return 1;
  if (x < dist[1] + dist[2]) return 2;
  return 3;
}

/** 특성 유전: 부모 특성 각 40%, 최대 3개, 낮은 확률로 새 특성 */
export function inheritTraits(r: () => number, mother: string[], father: string[], randomTrait: (exclude: string[]) => string | null): string[] {
  const out: string[] = [];
  const pool = [...new Set([...mother, ...father])];
  for (const t of pool) {
    if (out.length >= BALANCE.animals.traitsMax) break;
    if (r() < BALANCE.breeding.traitInheritChance) out.push(t);
  }
  if (out.length < BALANCE.animals.traitsMax && r() < BALANCE.breeding.mutationChance) {
    const t = randomTrait(out);
    if (t) out.push(t);
  }
  return out;
}

export class BreedingSystem {
  constructor(private w: World) {}

  hasFacility(): boolean {
    return Object.values(this.w.state.buildings).some((b) => b.type === 'breeding' || b.type === 'breedlab');
  }

  hasLab(): boolean {
    return Object.values(this.w.state.buildings).some((b) => b.type === 'breedlab');
  }

  eligibleFemales(species?: string): Animal[] {
    return this.w.animals.list().filter((a) => a.gender === 'F' && a.stage === 'adult' && !a.pregnant && a.breedCooldown <= 0 && (!species || a.species === species));
  }

  eligibleMales(species: string): Animal[] {
    return this.w.animals.list().filter((a) => a.gender === 'M' && a.stage === 'adult' && a.species === species);
  }

  bonusFor(mother: Animal, father: Animal): number {
    let b = 0;
    if (this.w.skills.has('l_advBreeding')) b += BALANCE.breeding.advancedGradeBonus;
    if (this.hasLab()) b += BALANCE.breeding.labGradeBonus;
    for (const t of [...mother.traits, ...father.traits]) b += TRAIT_BY_ID[t]?.fx.gradeBonus ?? 0;
    if (this.w.state.breedCharmActive) b += 0.1;
    return b;
  }

  predict(mother: Animal, father: Animal): GradeDist {
    return applyGradeBonus(baseGradeDist(mother.grade, father.grade), this.bonusFor(mother, father));
  }

  check(motherId: string, fatherId: string): { ok: boolean; reason?: string } {
    const m = this.w.animals.get(motherId);
    const f = this.w.animals.get(fatherId);
    if (!this.w.skills.has('l_breeding')) return { ok: false, reason: '브리딩 연구가 필요합니다' };
    if (!this.hasFacility()) return { ok: false, reason: '브리딩 시설이 필요합니다' };
    if (!m || !f) return { ok: false, reason: '부모를 선택하세요' };
    if (m.gender !== 'F' || f.gender !== 'M') return { ok: false, reason: '암컷과 수컷을 선택하세요' };
    if (m.species !== f.species) return { ok: false, reason: '같은 종끼리만 브리딩할 수 있습니다' };
    if (m.stage !== 'adult' || f.stage !== 'adult') return { ok: false, reason: '성체만 브리딩할 수 있습니다' };
    if (m.pregnant) return { ok: false, reason: '이미 임신 중입니다' };
    if (m.breedCooldown > 0) return { ok: false, reason: `휴식 중 (${m.breedCooldown}일)` };
    if (m.motherId === f.id || f.motherId === m.id || m.fatherId === f.id || f.fatherId === m.id) return { ok: false, reason: '직계 가족끼리는 브리딩할 수 없습니다' };
    if (this.w.state.gold < BALANCE.breeding.breedCost) return { ok: false, reason: '골드가 부족합니다' };
    return { ok: true };
  }

  breed(motherId: string, fatherId: string): { ok: boolean; reason?: string; days?: number } {
    const c = this.check(motherId, fatherId);
    if (!c.ok) return c;
    const m = this.w.animals.get(motherId)!;
    const d = ANIMAL_BY_ID[m.species];
    this.w.spend(BALANCE.breeding.breedCost, '브리딩');
    const days = Math.max(1, Math.round(d.pregnancyDays * traitMul(m.traits, 'pregnancyMul')));
    m.pregnant = { fatherId, daysLeft: days };
    this.w.skills.addXp('livestock', BALANCE.xp.breed);
    this.w.codex.animalEntry(m.species).breedCount++;
    this.w.events.emit('animals', undefined);
    this.w.events.emit('sfx', { key: 'love' });
    return { ok: true, days };
  }

  /** 출산 — AnimalSystem.daily 에서 호출 */
  giveBirth(mother: Animal): Animal[] {
    const preg = mother.pregnant!;
    mother.pregnant = null;
    mother.breedCooldown = BALANCE.breeding.cooldownDays;
    const father = this.w.animals.get(preg.fatherId) ?? this.recordAsAnimal(preg.fatherId);
    const r = () => this.w.rand();
    const dist = applyGradeBonus(baseGradeDist(mother.grade, (father?.grade ?? 3) as Grade), father ? this.bonusFor(mother, father as Animal) : 0);
    this.w.state.breedCharmActive = false;
    let twin = mother.stats.fertility / 400;
    for (const t of mother.traits) twin += TRAIT_BY_ID[t]?.fx.twinChance ?? 0;
    if (this.hasLab()) twin += 0.05;
    const count = r() < twin ? 2 : 1;
    const babies: Animal[] = [];
    for (let i = 0; i < count; i++) {
      const grade = rollGrade(r, dist);
      const stats = this.inheritStats(mother, father as Animal | null, grade);
      const traits = inheritTraits(r, mother.traits, father?.traits ?? [], (ex) => this.w.animals.randomTrait(ex));
      const home = this.w.animals.findHome(mother.species, mother.buildingUid);
      const baby = this.w.animals.create(mother.species, {
        grade,
        stats,
        traits,
        stage: 'baby',
        buildingUid: home?.uid ?? null,
        motherId: mother.id,
        fatherId: preg.fatherId,
        lineage: mother.lineage ?? father?.lineage ?? null,
      });
      mother.childIds.push(baby.id);
      const fa = this.w.animals.get(preg.fatherId);
      if (fa) fa.childIds.push(baby.id);
      babies.push(baby);
    }
    mother.births++;
    this.w.state.stats.animalsBorn += babies.length;
    this.w.finance.today().births += babies.length;
    this.w.finance.month().births += babies.length;
    this.w.skills.addXp('livestock', BALANCE.xp.birth * babies.length);
    const gradeTxt = babies.map((b) => `${b.grade}등급`).join(', ');
    this.w.notify({ key: 'birth', text: `${mother.name}(${mother.id})이(가) 출산했습니다! (${gradeTxt})`, icon: `an_${mother.species}`, tone: 'good' });
    if (babies.some((b) => !b.buildingUid)) this.w.notify({ key: 'homeless', text: '축사가 가득 차 새끼가 머물 곳이 없습니다. 축사를 늘려 주세요.', icon: 'ic_warn', tone: 'warn' });
    this.w.events.emit('sfx', { key: 'birth' });
    this.w.events.emit('birth', { motherId: mother.id, babyIds: babies.map((b) => b.id) });
    return babies;
  }

  private recordAsAnimal(id: string): Pick<Animal, 'grade' | 'traits' | 'lineage' | 'stats'> | null {
    const p = this.w.state.pedigree[id];
    if (!p) return null;
    const [a, b] = GRADE_STAT_RANGE[p.grade];
    const mid = Math.round((a + b) / 2);
    return { grade: p.grade, traits: p.traits, lineage: p.lineage, stats: { productivity: mid, growth: mid, health: mid, fertility: mid, physique: mid } };
  }

  inheritStats(m: Animal, f: Pick<Animal, 'stats'> | null, grade: Grade): Animal['stats'] {
    const [lo, hi] = GRADE_STAT_RANGE[grade];
    const v = BALANCE.breeding.statVariance;
    const keys = ['productivity', 'growth', 'health', 'fertility', 'physique'] as const;
    const out = {} as Animal['stats'];
    for (const k of keys) {
      const parent = f ? (m.stats[k] + f.stats[k]) / 2 : m.stats[k];
      const gradeRoll = lo + this.w.rand() * (hi - lo);
      const val = parent * 0.55 + gradeRoll * 0.45 + (this.w.rand() * 2 - 1) * v * 0.5;
      out[k] = Math.round(Math.max(lo - 10, Math.min(Math.min(100, hi + 8), val)));
    }
    return out;
  }

  /** 3대 혈통 (부모, 조부모, 증조부모) */
  ancestry(id: string, depth = 3): { gen: number; rec: PedigreeRecord | null; role: string }[] {
    const out: { gen: number; rec: PedigreeRecord | null; role: string }[] = [];
    const walk = (rid: string | null, gen: number, role: string) => {
      if (gen > depth) return;
      const rec = rid ? this.w.state.pedigree[rid] ?? null : null;
      out.push({ gen, rec, role });
      walk(rec?.motherId ?? null, gen + 1, role + 'M');
      walk(rec?.fatherId ?? null, gen + 1, role + 'F');
    };
    const self = this.w.state.pedigree[id];
    walk(self?.motherId ?? null, 1, 'M');
    walk(self?.fatherId ?? null, 1, 'F');
    return out;
  }

  useCharm(): { ok: boolean; reason?: string } {
    if (this.w.state.breedCharmActive) return { ok: false, reason: '이미 부적이 적용되어 있습니다' };
    if (!this.w.inventory.consume('breed_charm', 1)) return { ok: false, reason: '번식 부적이 없습니다' };
    this.w.state.breedCharmActive = true;
    return { ok: true };
  }
}
