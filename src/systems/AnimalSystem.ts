/**
 * AnimalSystem — 동물 개체 관리, 급식, 친밀도, 생산, 성장, 출하.
 * 동물은 노화/질병으로 죽지 않는다.
 */
import { BALANCE } from '../data/balance';
import { ANIMAL_BY_ID, GRADE_STAT_RANGE, TRAITS, TRAIT_BY_ID } from '../data/animals';
import { BUILDING_BY_ID } from '../data/buildings';
import { ITEM_BY_ID } from '../data/items';
import { animalSellPrice, traitMul } from '../services/EconomyService';
import type { Animal, BuildingInstance, Gender, Grade, GrowthStage } from '../types/game';
import { pad } from '../utils/format';
import { randInt } from '../utils/rng';
import { calendar } from './SeasonSystem';
import type { World } from '../core/World';

export interface CreateAnimalOpts {
  gender?: Gender;
  grade?: Grade;
  traits?: string[];
  stage?: GrowthStage;
  buildingUid?: string | null;
  motherId?: string | null;
  fatherId?: string | null;
  stats?: Animal['stats'];
  lineage?: string | null;
}

export const GRADE_PRODUCT_MUL: Record<Grade, number> = { 3: 1, 2: 1.2, 1: 1.5 };

/** 행복도 → 생산량 배율 (0 → ×0.8, 50 → ×1.0, 100 → ×1.2) */
export function happinessMul(a: Pick<Animal, 'happiness'>): number {
  return 0.8 + (a.happiness ?? 60) * 0.004;
}

/** 친밀도 → 희귀 생산물 확률 (50 이하 0%, 100 → 최대) */
export function rareProductChance(a: Pick<Animal, 'affection'>): number {
  return Math.max(0, (a.affection - 50) / 50) * BALANCE.animals.rareProductMaxChance;
}

/** 생산 수량 기대값 */
export function productAmount(a: Animal): number {
  const base = GRADE_PRODUCT_MUL[a.grade] * (1 + (a.stats.productivity - 50) / 200) * traitMul(a.traits, 'productMul');
  return base * (a.affection >= 80 ? 1.1 : 1) * happinessMul(a);
}

export interface HappinessFactor {
  label: string;
  delta: number;
}

/** 오늘 하루가 끝나면 바뀔 행복도 요인 (UI 표시 + daily 계산 공용) */
export function happinessFactors(a: Animal, barn: BuildingInstance | null, capacity: number): HappinessFactor[] {
  const H = BALANCE.animals.happiness;
  const out: HappinessFactor[] = [];
  out.push(a.fedToday ? { label: '사료 충분', delta: H.fed } : { label: '사료 부족', delta: H.hungry });
  const dirt = barn?.dirt ?? 0;
  if (dirt < 40) out.push({ label: '깨끗한 축사', delta: H.clean });
  else if (dirt >= 60) out.push({ label: '지저분한 축사', delta: H.dirty });
  if (a.pettedToday) out.push({ label: '쓰다듬기', delta: H.petted });
  if (barn && capacity > 0) {
    const n = barn.animalIds?.length ?? 0;
    if (n >= capacity && capacity > 2) out.push({ label: '축사가 꽉 참', delta: H.crowded });
    else if (n <= capacity * 0.6) out.push({ label: '넉넉한 공간', delta: H.spacious });
  }
  return out;
}

export class AnimalSystem {
  constructor(private w: World) {}

  list(): Animal[] {
    return Object.values(this.w.state.animals);
  }

  get(id: string): Animal | undefined {
    return this.w.state.animals[id];
  }

  nextId(species: string): string {
    const n = (this.w.state.animalCounters[species] ?? 0) + 1;
    this.w.state.animalCounters[species] = n;
    return `${ANIMAL_BY_ID[species].prefix}-${pad(n, BALANCE.animals.idDigits)}`;
  }

  randomTraits(count: number): string[] {
    const out: string[] = [];
    for (let i = 0; i < count; i++) {
      const t = this.randomTrait(out);
      if (t) out.push(t);
    }
    return out;
  }

  /** 희귀도 가중치 기반 랜덤 특성 */
  randomTrait(exclude: string[]): string | null {
    const pool = TRAITS.filter((t) => !exclude.includes(t.id));
    const total = pool.reduce((s, t) => s + t.rarity, 0);
    let x = this.w.rand() * total;
    for (const t of pool) {
      x -= t.rarity;
      if (x < 0) return t.id;
    }
    return pool[0]?.id ?? null;
  }

  rollStats(grade: Grade): Animal['stats'] {
    const [a, b] = GRADE_STAT_RANGE[grade];
    const r = () => this.w.rand();
    return { productivity: randInt(r, a, b), growth: randInt(r, a, b), health: randInt(r, a, b), fertility: randInt(r, a, b), physique: randInt(r, a, b) };
  }

  create(species: string, o: CreateAnimalOpts = {}): Animal {
    const d = ANIMAL_BY_ID[species];
    const id = this.nextId(species);
    const grade = o.grade ?? 3;
    const stats = o.stats ?? this.rollStats(grade);
    for (const t of o.traits ?? []) {
      const h = TRAIT_BY_ID[t]?.fx.health;
      if (h) stats.health = Math.min(100, stats.health + h);
    }
    const stage = o.stage ?? 'adult';
    const growthAge = stage === 'adult' ? d.growDays[0] + d.growDays[1] : stage === 'juvenile' ? d.growDays[0] : 0;
    const a: Animal = {
      id,
      species,
      name: `${d.name} ${id.split('-')[1].replace(/^0+/, '')}`,
      gender: o.gender ?? (this.w.rand() < 0.5 ? 'F' : 'M'),
      age: growthAge,
      grade,
      stage,
      stats,
      traits: (o.traits ?? []).slice(0, BALANCE.animals.traitsMax),
      motherId: o.motherId ?? null,
      fatherId: o.fatherId ?? null,
      childIds: [],
      births: 0,
      produced: 0,
      affection: 30,
      happiness: BALANCE.animals.happiness.start,
      fedToday: false,
      pettedToday: false,
      productTimer: d.productInterval,
      pregnant: null,
      breedCooldown: 0,
      buildingUid: o.buildingUid ?? null,
      lineage: o.lineage ?? null,
      bornDay: this.w.state.time.day,
      shipping: null,
    };
    this.w.state.animals[id] = a;
    if (a.buildingUid) this.w.state.buildings[a.buildingUid]?.animalIds?.push(id);
    this.w.state.pedigree[id] = { id, species, name: a.name, gender: a.gender, grade, motherId: a.motherId, fatherId: a.fatherId, traits: [...a.traits], lineage: a.lineage, status: 'alive' };
    this.w.codex.recordAnimal(a);
    this.w.events.emit('animals', undefined);
    return a;
  }

  // ───── 축사 ─────
  barns(): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter((b) => BUILDING_BY_ID[b.type].category === 'animal');
  }

  capacity(b: BuildingInstance): number {
    return (BUILDING_BY_ID[b.type].animalCapacity ?? 0) + (b.upgrades?.capacity ?? 0) * BALANCE.barnCapacityPerLevel;
  }

  canHouse(b: BuildingInstance, species: string): boolean {
    return ANIMAL_BY_ID[species].housing.includes(b.type) && (b.animalIds?.length ?? 0) < this.capacity(b);
  }

  findHome(species: string, prefer?: string | null): BuildingInstance | null {
    if (prefer) {
      const p = this.w.state.buildings[prefer];
      if (p && this.canHouse(p, species)) return p;
    }
    return this.barns().find((b) => this.canHouse(b, species)) ?? null;
  }

  moveTo(animalId: string, barnUid: string): { ok: boolean; reason?: string } {
    const a = this.get(animalId);
    const b = this.w.state.buildings[barnUid];
    if (!a || !b) return { ok: false, reason: '대상 없음' };
    if (a.buildingUid === barnUid) return { ok: false, reason: '이미 이 축사에 있습니다' };
    if (!this.canHouse(b, a.species)) return { ok: false, reason: '수용할 수 없는 축사입니다' };
    this.detach(a);
    a.buildingUid = barnUid;
    b.animalIds!.push(a.id);
    this.w.events.emit('animals', undefined);
    return { ok: true };
  }

  private detach(a: Animal): void {
    if (!a.buildingUid) return;
    const b = this.w.state.buildings[a.buildingUid];
    if (b?.animalIds) b.animalIds = b.animalIds.filter((x) => x !== a.id);
    a.buildingUid = null;
  }

  animalsIn(b: BuildingInstance): Animal[] {
    return (b.animalIds ?? []).map((id) => this.w.state.animals[id]).filter(Boolean);
  }

  feedNeed(a: Animal): number {
    return Math.max(1, Math.round(ANIMAL_BY_ID[a.species].feedPerDay * traitMul(a.traits, 'feedMul')));
  }

  /** 축사 전체 급식. 급식한 마리 수 반환 */
  feedBarn(b: BuildingInstance, source: 'player' | 'auto' = 'player'): { fed: number; hungry: number } {
    let fed = 0;
    let hungry = 0;
    for (const a of this.animalsIn(b)) {
      if (a.fedToday || a.shipping) continue;
      const need = this.feedNeed(a);
      if (this.w.inventory.consume('hay', need)) {
        a.fedToday = true;
        a.affection = Math.min(BALANCE.animals.maxAffection, a.affection + BALANCE.animals.feedAffection * traitMul(a.traits, 'affectionMul'));
        fed++;
      } else if (source === 'auto' && (b.upgrades?.autoFeed ?? 0) >= 2) {
        const cost = BALANCE.autoFeedLv2CostPerAnimal * need;
        if (this.w.state.gold >= cost) {
          this.w.spend(cost, '자동 사료 조달');
          a.fedToday = true;
          fed++;
        } else hungry++;
      } else hungry++;
    }
    if (fed && source === 'player') {
      this.w.skills.addXp('livestock', BALANCE.xp.feed * fed);
      this.w.events.emit('sfx', { key: 'feed' });
    }
    this.w.events.emit('animals', undefined);
    return { fed, hungry };
  }

  /** 특제 사료: 축사 전체 급식 + 친밀도 */
  goldenFeed(b: BuildingInstance): boolean {
    if (!this.w.inventory.consume('golden_feed', 1)) return false;
    for (const a of this.animalsIn(b)) {
      a.fedToday = true;
      a.affection = Math.min(100, a.affection + 15);
    }
    this.w.events.emit('animals', undefined);
    return true;
  }

  pet(id: string, useTreat = false): { ok: boolean; reason?: string } {
    const a = this.get(id);
    if (!a) return { ok: false, reason: '없는 동물' };
    if (a.pettedToday && !useTreat) return { ok: false, reason: '오늘은 이미 쓰다듬었어요' };
    let gain = BALANCE.animals.petAffection;
    if (useTreat) {
      if (!this.w.inventory.consume('treat', 1)) return { ok: false, reason: '간식이 없습니다' };
      gain *= 2.5;
    }
    a.affection = Math.min(BALANCE.animals.maxAffection, a.affection + gain * traitMul(a.traits, 'affectionMul'));
    const first = !a.pettedToday;
    a.pettedToday = true;
    if (first) this.w.skills.addXp('livestock', BALANCE.xp.pet);
    this.w.events.emit('sfx', { key: 'pet' });
    this.w.events.emit('animals', undefined);
    return { ok: true };
  }

  petAll(b: BuildingInstance): number {
    let n = 0;
    for (const a of this.animalsIn(b)) if (!a.pettedToday && this.pet(a.id).ok) n++;
    return n;
  }

  cleanBarn(b: BuildingInstance): void {
    b.dirt = 0;
    this.w.events.emit('sfx', { key: 'clean' });
    this.w.events.emit('animals', undefined);
  }

  /** 생산물 수거 → 가방(넘치면 저장시설). 수거 수량 반환 */
  collect(b: BuildingInstance, toStorage = false): number {
    if (!b.outputId) return 0;
    const out = this.w.state.containers[b.outputId];
    let n = 0;
    out.slots.forEach((s, i) => {
      if (!s) return;
      let left = toStorage ? s.qty : this.w.inventory.add('bag', s.itemId, s.qty, s.freshness);
      if (left > 0) left = this.w.inventory.store(s.itemId, left, s.freshness, b, false);
      n += s.qty - left;
      if (left <= 0) out.slots[i] = null;
      else s.qty = left;
    });
    if (n > 0) {
      if (!toStorage) {
        this.w.skills.addXp('livestock', BALANCE.xp.collect * Math.min(n, 10));
        this.w.events.emit('sfx', { key: 'harvest' });
      }
      this.w.events.emit('inventory', { containerId: b.outputId });
      this.w.events.emit('animals', undefined);
    }
    return n;
  }

  pendingOutput(b: BuildingInstance): number {
    if (!b.outputId) return 0;
    return this.w.state.containers[b.outputId]?.slots.reduce((s, x) => s + (x?.qty ?? 0), 0) ?? 0;
  }

  // ───── 하루 처리 ─────
  daily(): { births: Animal[] } {
    const births: Animal[] = [];
    for (const b of this.barns()) {
      if ((b.upgrades?.autoClean ?? 0) >= 1) b.dirt = 0;
      else b.dirt = Math.min(100, (b.dirt ?? 0) + BALANCE.animals.dirtPerDay);
    }
    for (const a of [...this.list()]) {
      if (a.shipping) continue;
      const d = ANIMAL_BY_ID[a.species];
      a.age++;
      // 성장
      const gm = traitMul(a.traits, 'growthMul') * (1.2 - a.stats.growth / 250);
      const juv = Math.max(1, Math.round(d.growDays[0] * gm));
      const adult = juv + Math.max(1, Math.round(d.growDays[1] * gm));
      const prevStage = a.stage;
      a.stage = a.age >= adult ? 'adult' : a.age >= juv ? 'juvenile' : 'baby';
      if (prevStage !== a.stage && a.stage === 'adult') this.w.notify({ key: 'grown', text: `${a.name}이(가) 다 자랐습니다`, icon: `an_${a.species}`, tone: 'good' });
      // 행복도 (죽거나 영구 패널티 없음 — 생산·브리딩에만 영향)
      const barn = a.buildingUid ? this.w.state.buildings[a.buildingUid] : null;
      if (a.happiness === undefined) a.happiness = BALANCE.animals.happiness.start;
      const dh = happinessFactors(a, barn, barn ? this.capacity(barn) : 0).reduce((s, f) => s + f.delta, 0);
      a.happiness = Math.max(0, Math.min(100, a.happiness + dh));
      // 생산 — 행복할수록 주기가 빨라지고, 우울하면 가끔 하루 쉰다
      if (a.fedToday && a.stage === 'adult' && d.product && barn) {
        let tick = 1;
        if (a.happiness >= 80 && this.w.rand() < 0.3) tick = 2;
        else if (a.happiness < 30 && this.w.rand() < 0.3) tick = 0;
        a.productTimer -= tick;
        if (a.productTimer <= 0) {
          const interval = Math.max(1, d.productInterval + this.intervalDelta(a));
          a.productTimer = interval;
          const skip = Math.max(0, (50 - a.stats.health) / 200);
          const dirtyMul = (barn.dirt ?? 0) >= 60 ? BALANCE.animals.dirtyProductionMul : 1;
          if (this.w.rand() >= skip && this.w.rand() < dirtyMul) {
            const amt = productAmount(a);
            let qty = Math.floor(amt);
            if (this.w.rand() < amt - qty) qty++;
            qty = Math.max(1, qty);
            // 친밀도가 높으면 하나가 희귀 생산물로 바뀔 수 있다
            let rare = 0;
            if (d.rareProduct && this.w.rand() < rareProductChance(a)) {
              rare = 1;
              qty = Math.max(0, qty - 1);
            }
            const left = qty ? this.w.inventory.add(barn.outputId!, d.product, qty, 100, false) : 0;
            const got = qty - left;
            a.produced += got;
            this.w.codex.recordProduced(d.product, got);
            this.w.codex.animalEntry(a.species).produced += got;
            if (rare && d.rareProduct && this.w.inventory.add(barn.outputId!, d.rareProduct, 1, 100, false) === 0) {
              a.produced++;
              this.w.codex.recordProduced(d.rareProduct, 1);
              this.w.notify({ key: `rare_${d.rareProduct}`, text: `${a.name}이(가) ${ITEM_BY_ID[d.rareProduct].name}을(를) 만들었어요!`, icon: ITEM_BY_ID[d.rareProduct].icon, tone: 'good' });
            }
          }
        }
      } else if (!a.fedToday) {
        a.affection = Math.max(0, a.affection - BALANCE.animals.hungryAffectionLoss);
      }
      // 임신
      if (a.pregnant) {
        a.pregnant.daysLeft--;
        if (a.pregnant.daysLeft <= 0) births.push(...this.w.breeding.giveBirth(a));
      }
      if (a.breedCooldown > 0) a.breedCooldown--;
      a.fedToday = false;
      a.pettedToday = false;
    }
    this.w.events.emit('animals', undefined);
    return { births };
  }

  private intervalDelta(a: Animal): number {
    let d = 0;
    for (const t of a.traits) d += TRAIT_BY_ID[t]?.fx.intervalDelta ?? 0;
    return d;
  }

  // ───── 판매·출하 ─────
  sellPrice(a: Animal, merchantBonus: number): number {
    return animalSellPrice(a, { season: calendar(this.w.state.time.day).season, merchantBonus });
  }

  removeAnimal(id: string, status: 'sold' | 'shipped'): void {
    const a = this.get(id);
    if (!a) return;
    this.detach(a);
    delete this.w.state.animals[id];
    const p = this.w.state.pedigree[id];
    if (p) p.status = status;
    this.w.events.emit('animals', undefined);
  }

  /** 출하 — 육가공소에서 일정 시간 뒤 고기 등 생산물을 받는다 */
  ship(id: string): { ok: boolean; reason?: string } {
    const a = this.get(id);
    if (!a) return { ok: false, reason: '없는 동물' };
    const d = ANIMAL_BY_ID[a.species];
    if (!d.meat) return { ok: false, reason: '출하할 수 없는 동물입니다' };
    if (!this.w.skills.has('l_meat')) return { ok: false, reason: '육가공 연구가 필요합니다' };
    if (a.stage !== 'adult') return { ok: false, reason: '성체만 출하할 수 있습니다' };
    if (a.pregnant) return { ok: false, reason: '임신 중인 동물은 출하할 수 없습니다' };
    const butcher = Object.values(this.w.state.buildings).find((b) => b.type === 'butcher' && (b.queue?.length ?? 0) < (BUILDING_BY_ID.butcher.queueSize ?? 3));
    if (!butcher) return { ok: false, reason: '여유 있는 육가공소가 필요합니다' };
    const qty = Math.max(1, Math.round(d.meatQty * traitMul(a.traits, 'meatMul') * (0.8 + a.stats.physique / 250)));
    butcher.queue!.push({ recipeId: `ship:${d.meat}:${qty}`, remaining: 720, total: 720 });
    this.removeAnimal(id, 'shipped');
    this.w.notify({ key: 'ship', text: `${a.name} 출하 — 육가공소에서 ${ITEM_BY_ID[d.meat].name} ${qty}개 준비 중`, icon: 'ic_meat' });
    this.w.events.emit('processing', undefined);
    return { ok: true };
  }

  rename(id: string, name: string): void {
    const a = this.get(id);
    if (!a) return;
    a.name = name.slice(0, 12) || a.name;
    const p = this.w.state.pedigree[id];
    if (p) p.name = a.name;
    this.w.events.emit('animals', undefined);
  }

  setLineage(id: string, lineage: string): void {
    const a = this.get(id);
    if (!a) return;
    a.lineage = lineage.slice(0, 12) || null;
    const p = this.w.state.pedigree[id];
    if (p) p.lineage = a.lineage;
    this.w.events.emit('animals', undefined);
  }
}
