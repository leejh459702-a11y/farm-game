/**
 * MerchantSystem — 방문상인 / 특급상인.
 * 일반 방문: 이전 방문 후 2~3일 사이 랜덤. 특급상인 약 12% + 비공개 보정(연속 미등장 시 확률 증가).
 */
import { BALANCE } from '../data/balance';
import { ANIMALS, ANIMAL_BY_ID } from '../data/animals';
import { BUILDING_BY_ID } from '../data/buildings';
import { CROPS, CROP_BY_ID } from '../data/crops';
import { BOOKS } from '../data/books';
import { MERCHANT_BASICS, MERCHANT_DECOS, RARE_SEEDS, SPECIAL_DECOS, SPECIAL_ITEMS } from '../data/economy';
import { ITEM_BY_ID } from '../data/items';
import { buyPrice, sellPrice, animalSellPrice, beautyBonus, type PriceContext } from '../services/EconomyService';
import type { Grade, ShopEntry } from '../types/game';
import { pick, randInt, shuffle } from '../utils/rng';
import { calendar, DAYS_PER_SEASON } from './SeasonSystem';
import { SEASONS } from '../data/seasons';
import type { World } from '../core/World';

/** 특급상인 등장 확률 (보정 포함) — 테스트용 순수 함수 */
export function specialChance(missStreak: number): number {
  return Math.min(1, BALANCE.merchant.specialBaseChance + BALANCE.merchant.specialPityStep * missStreak);
}

export class MerchantSystem {
  constructor(private w: World) {}

  get m() {
    return this.w.state.merchant;
  }

  scheduleNext(): void {
    const r = () => this.w.rand();
    const [a, b] = this.w.skills.has('b_regular') ? [1, 2] : [BALANCE.merchant.minInterval, BALANCE.merchant.maxInterval];
    this.m.nextVisitDay = this.w.state.time.day + randInt(r, a, b);
  }

  /** 아침마다 호출 */
  morning(): void {
    if (!this.w.tutorial.allows('merchant')) return;
    if (this.w.state.time.day >= this.m.nextVisitDay) {
      const special = this.w.rand() < specialChance(this.m.missStreak);
      this.arrive(special);
    }
  }

  arrive(special: boolean, tutorial = false): void {
    const m = this.m;
    m.present = true;
    m.special = special;
    m.visits++;
    if (special) {
      m.missStreak = 0;
      const [a, b] = BALANCE.merchant.specialSellBonus;
      const [c, d] = BALANCE.merchant.specialDiscount;
      m.sellBonus = Math.round((a + this.w.rand() * (b - a)) * 100) / 100;
      m.discount = Math.round((c + this.w.rand() * (d - c)) * 100) / 100;
    } else {
      if (!tutorial) m.missStreak++;
      m.sellBonus = 0;
      m.discount = 0;
    }
    m.stock = this.generateStock(special);
    this.w.notify({
      key: 'merchant',
      text: special ? '특급상인이 도착했습니다! 오늘만 특별한 거래를!' : '방문상인이 도착했습니다.',
      icon: 'ic_merchant',
      tone: special ? 'good' : 'info',
    });
    this.w.events.emit('merchant', { present: true, special });
    this.w.events.emit('sfx', { key: special ? 'special' : 'bell' });
  }

  leave(): void {
    if (!this.m.present) return;
    this.m.present = false;
    this.m.stock = [];
    this.scheduleNext();
    this.w.events.emit('merchant', { present: false, special: false });
  }

  priceCtx(): PriceContext {
    return {
      season: calendar(this.w.state.time.day).season,
      merchantBonus: this.m.present ? this.m.sellBonus : 0,
      beautyBonus: beautyBonus(this.w.grid.beauty()),
    };
  }

  private rollGrade(special: boolean): Grade {
    const x = this.w.rand();
    if (special) return x < 0.15 ? 1 : x < 0.6 ? 2 : 3;
    return x < 0.12 ? 2 : 3;
  }

  generateStock(special: boolean): ShopEntry[] {
    const r = () => this.w.rand();
    const disc = this.m.discount;
    const day = this.w.state.time.day;
    const cal = calendar(day);
    const out: ShopEntry[] = [];
    const cfg = BALANCE.merchant;

    // 씨앗: 이번 계절 (말에는 다음 계절도)
    const seasons = [cal.season];
    if (cal.dayOfSeason >= DAYS_PER_SEASON - 5) seasons.push(SEASONS[(cal.seasonIndex + 1) % 4].id);
    const tutorialActive = this.w.tutorial.active;
    let seeds = CROPS.filter((c) => !c.rare && c.season.some((s) => seasons.includes(s)) && c.unlockLevel <= this.w.skills.level('farming') + 1);
    seeds = seeds.filter((c) => !c.unlockSkill || this.w.skills.has(c.unlockSkill));
    shuffle(r, seeds);
    // 저렴한 기본 씨앗은 항상 1개 이상 포함
    seeds.sort((a, b) => (a.unlockLevel <= 1 ? -1 : 0) - (b.unlockLevel <= 1 ? -1 : 0));
    const seedPick = seeds.slice(0, cfg.seedOffers);
    if (tutorialActive && !seedPick.some((c) => c.id === 'carrot')) seedPick.unshift(CROP_BY_ID.carrot);
    for (const c of seedPick) out.push({ kind: 'item', id: `seed_${c.id}`, price: buyPrice(c.seedPrice, disc), stock: 20 });
    // 마스터리: 희귀 종자 연구 — 일반 상인도 희귀 씨앗 하나
    if (!special && this.w.skills.has('f_m_seed')) {
      const rare = CROPS.filter((c) => c.rare && (!c.unlockSkill || this.w.skills.has(c.unlockSkill)));
      if (rare.length) {
        const c = rare[Math.floor(r() * rare.length)];
        out.push({ kind: 'item', id: `seed_${c.id}`, price: buyPrice(Math.round(c.seedPrice * 1.2), disc), stock: 3 });
      }
    }

    // 기본 상품
    for (const b of MERCHANT_BASICS) if (!b.skill || this.w.skills.has(b.skill)) out.push({ kind: 'item', id: b.id, price: buyPrice(b.price, disc), stock: b.stock });

    // 동물
    const species = ANIMALS.filter((a) => this.w.skills.has(a.unlockSkill) && (special || !a.rare));
    shuffle(r, species);
    for (const a of species.slice(0, special ? cfg.animalOffers + 1 : cfg.animalOffers)) {
      const grade = this.rollGrade(special);
      const gradeMul = BALANCE.economy.animalGradeSellMul[grade];
      const traits = this.w.animals.randomTraits(grade === 1 ? 2 : grade === 2 ? 1 : this.w.rand() < 0.3 ? 1 : 0);
      out.push({ kind: 'animal', id: a.id, price: buyPrice(Math.round(a.buyPrice * gradeMul), disc), stock: 1, animal: { gender: r() < 0.5 ? 'F' : 'M', grade, traits }, special: a.rare });
    }

    // 장식
    const decos = shuffle(r, [...MERCHANT_DECOS]).slice(0, 2);
    for (const d of decos) out.push({ kind: 'deco', id: d.id, price: buyPrice(d.price, disc), stock: 2 });

    if (special) {
      for (const id of shuffle(r, [...RARE_SEEDS]).slice(0, 2)) out.push({ kind: 'item', id: `seed_${id}`, price: buyPrice(CROP_BY_ID[id].seedPrice, disc), stock: 5, special: true });
      for (const it of SPECIAL_ITEMS) out.push({ kind: 'item', id: it.id, price: buyPrice(it.price, disc), stock: it.stock, special: true });
      // 스킬북 한 권 (아직 읽지 않은 것 우선)
      const unread = BOOKS.filter((b) => !this.w.collections.hasBook(b.id));
      const pool = unread.length ? unread : BOOKS;
      const bk = pool[Math.floor(r() * pool.length)];
      out.push({ kind: 'item', id: bk.id, price: buyPrice(bk.price * 2, disc), stock: 1, special: true });
      const sd = pick(r, SPECIAL_DECOS);
      out.push({ kind: 'deco', id: sd.id, price: buyPrice(sd.price, disc), stock: 1, special: true });
      // 희귀 동물 1마리 보장 (연구 여부와 무관하게 구매 가능하나 축사가 필요)
      const rare = pick(r, ANIMALS.filter((a) => a.rare));
      if (!out.some((e) => e.kind === 'animal' && e.id === rare.id)) {
        const grade = this.rollGrade(true);
        out.push({ kind: 'animal', id: rare.id, price: buyPrice(Math.round(rare.buyPrice * BALANCE.economy.animalGradeSellMul[grade]), disc), stock: 1, animal: { gender: r() < 0.5 ? 'F' : 'M', grade, traits: this.w.animals.randomTraits(1) }, special: true });
      }
    }
    return out;
  }

  // ───── 구매 ─────
  buy(index: number, qty = 1): { ok: boolean; reason?: string } {
    const e = this.m.stock[index];
    if (!this.m.present || !e) return { ok: false, reason: '상인이 없습니다' };
    qty = Math.min(qty, e.stock);
    if (qty <= 0) return { ok: false, reason: '품절' };
    const cost = e.price * qty;
    if (this.w.state.gold < cost) return { ok: false, reason: '골드가 부족합니다' };
    if (e.kind === 'item') {
      const inv = this.w.inventory;
      const cap = inv.capacityFor('bag', e.id) + inv.storageIds().reduce((sum, id) => sum + inv.capacityFor(id, e.id), 0);
      if (cap < qty) return { ok: false, reason: '가방과 저장 공간이 부족합니다' };
      const left = inv.add('bag', e.id, qty);
      if (left > 0) inv.store(e.id, left, undefined, undefined, false);
    } else if (e.kind === 'deco') {
      this.w.state.buildStock[e.id] = (this.w.state.buildStock[e.id] ?? 0) + qty;
      this.w.notify({ key: 'deco', text: `${BUILDING_BY_ID[e.id].name}이(가) 건설 보관함에 추가되었습니다`, icon: 'ic_build' });
    } else if (e.kind === 'animal') {
      const home = this.w.animals.findHome(e.id);
      if (!home) return { ok: false, reason: `${ANIMAL_BY_ID[e.id].name}을(를) 수용할 축사 공간이 없습니다` };
      this.w.animals.create(e.id, { gender: e.animal!.gender, grade: e.animal!.grade, traits: e.animal!.traits, stage: 'adult', buildingUid: home.uid });
      this.w.skills.addXp('livestock', 5);
    }
    this.w.spend(cost, e.kind === 'animal' ? '동물 구매' : '상점 구매');
    e.stock -= qty;
    this.w.events.emit('sfx', { key: 'buy' });
    return { ok: true };
  }

  // ───── 판매 ─────
  unitPrice(itemId: string, freshness?: number, bonus = 0): number {
    let base = sellPrice(itemId, freshness, this.priceCtx(), bonus);
    const cat = ITEM_BY_ID[itemId]?.category;
    const skillMul = 1 + (this.w.skills.has('b_trader') ? 0.05 : 0) + (this.w.skills.has('b_brand') && (cat === 'processed' || cat === 'cooking') ? 0.1 : 0);
    if (base > 0 && skillMul > 1) base = Math.round(base * skillMul);
    // 유물은 수집가 기질의 특급상인이 훨씬 비싸게 사 준다
    if (ITEM_BY_ID[itemId]?.category === 'artifact') return Math.round(base * (this.m.special ? 1.6 : 0.5));
    return base;
  }

  sellSlot(containerId: string, slot: number, qty: number): { ok: boolean; reason?: string; gold?: number } {
    if (!this.m.present) return { ok: false, reason: '상인이 없습니다' };
    const c = this.w.state.containers[containerId];
    const s = c?.slots[slot];
    if (!s) return { ok: false, reason: '없는 아이템' };
    const unit = this.unitPrice(s.itemId, s.freshness, s.bonus ?? 0);
    if (unit <= 0) return { ok: false, reason: ITEM_BY_ID[s.itemId].sellable ? '부패하여 판매할 수 없습니다' : '판매할 수 없는 물건입니다' };
    const got = this.w.inventory.removeAt(containerId, slot, qty);
    if (!got) return { ok: false };
    const gold = unit * got.qty;
    this.w.earn(gold, '판매');
    this.w.skills.addXp('business', Math.max(1, Math.round(gold / 100)));
    this.w.finance.recordSale(got.itemId, got.qty, gold);
    this.w.codex.recordSale(got.itemId, unit);
    this.w.events.emit('sfx', { key: 'coin' });
    this.w.tutorial.signal('sold');
    return { ok: true, gold };
  }

  /** 같은 아이템 전부 판매 (가방 + 저장시설) */
  sellAllOf(itemId: string, includeStorage: boolean): number {
    let total = 0;
    const ids = includeStorage ? ['bag', ...this.w.inventory.storageIds()] : ['bag'];
    for (const id of ids) {
      const c = this.w.state.containers[id];
      c.slots.forEach((s, i) => {
        if (s && s.itemId === itemId) {
          const r = this.sellSlot(id, i, s.qty);
          if (r.ok) total += r.gold!;
        }
      });
    }
    return total;
  }

  sellAnimal(animalId: string): { ok: boolean; reason?: string; gold?: number } {
    if (!this.m.present) return { ok: false, reason: '상인이 없습니다' };
    const a = this.w.state.animals[animalId];
    if (!a) return { ok: false, reason: '없는 동물' };
    if (a.pregnant) return { ok: false, reason: '임신 중인 동물은 판매할 수 없습니다' };
    const gold = animalSellPrice(a, this.priceCtx());
    this.w.animals.removeAnimal(animalId, 'sold');
    this.w.earn(gold, '동물 판매');
    this.w.finance.recordSale(`animal:${a.species}`, 1, gold);
    this.w.events.emit('sfx', { key: 'coin' });
    return { ok: true, gold };
  }
}
