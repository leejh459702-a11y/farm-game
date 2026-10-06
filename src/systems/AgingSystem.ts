/**
 * AgingSystem — 숙성고. 숙성 가능한 가공품을 넣어 두면 날짜에 따라 가치(보너스)가 오른다.
 * 넣어 둔 동안 신선도는 그대로. 꺼낼 때 보너스가 붙은 스택으로 돌아온다.
 */
import { AGEABLE, CELLAR_SLOTS, CELLAR_UPGRADES, agingBonus, nextAgingStep, type CellarUpgrade } from '../data/aging';
import { ITEM_BY_ID } from '../data/items';
import type { BuildingInstance, CellarSlot } from '../types/game';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };

export function isAgeable(itemId: string): boolean {
  return !!AGEABLE[itemId];
}

export class AgingSystem {
  constructor(private w: World) {}

  cellars(): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter((b) => b.type === 'cellar');
  }

  ensure(b: BuildingInstance): { slots: (CellarSlot | null)[] } {
    if (!b.upgrades) b.upgrades = {};
    b.upgrades.capacity ??= 0;
    b.upgrades.notify ??= 0;
    if (!b.cellar) b.cellar = { slots: [] };
    const n = CELLAR_SLOTS[b.upgrades.capacity] ?? CELLAR_SLOTS[0];
    while (b.cellar.slots.length < n) b.cellar.slots.push(null);
    return b.cellar;
  }

  daysAged(s: CellarSlot): number {
    return Math.max(0, this.w.state.time.day - s.startDay);
  }

  /** 지금 꺼내면 붙는 보너스 */
  bonusOf(s: CellarSlot): number {
    return Math.max(s.baseBonus, agingBonus(s.itemId, this.daysAged(s)) * (1 + (this.w.skills.has('b_m_aging') ? 0.25 : 0) + (this.w.collections.hasBook('book_aging') ? 0.15 : 0)));
  }

  next(s: CellarSlot): { days: number; bonus: number } | null {
    return nextAgingStep(s.itemId, this.daysAged(s));
  }

  /** 가방(→창고)에서 숙성 가능한 품목을 꺼내 빈 선반에 넣는다 (최대 qty개) */
  put(b: BuildingInstance, itemId: string, qty = 99): Result {
    if (!isAgeable(itemId)) return { ok: false, reason: '숙성할 수 없는 품목이에요' };
    const c = this.ensure(b);
    const idx = c.slots.findIndex((s) => !s);
    if (idx < 0) return { ok: false, reason: '숙성 선반이 가득 찼어요' };
    const have = this.w.inventory.countAll(itemId);
    if (have <= 0) return { ok: false, reason: '가진 것이 없어요' };
    const n = Math.min(qty, have, ITEM_BY_ID[itemId].maxStack);
    // 가방부터 신선한 것 순서와 무관하게 꺼낸다 (스택 보너스·신선도 평균 보존)
    let left = n;
    let freshSum = 0;
    let bonusSum = 0;
    let freshN = 0;
    for (const cid of ['bag', ...this.w.inventory.storageIds()]) {
      if (left <= 0) break;
      const got = this.w.inventory.remove(cid, itemId, Math.min(left, this.w.inventory.count(cid, itemId)), false);
      for (const g of got) {
        left -= g.qty;
        bonusSum += (g.bonus ?? 0) * g.qty;
        if (g.freshness !== undefined) {
          freshSum += g.freshness * g.qty;
          freshN += g.qty;
        }
      }
    }
    const moved = n - left;
    c.slots[idx] = { itemId, qty: moved, startDay: this.w.state.time.day, baseBonus: moved ? bonusSum / moved : 0, freshness: freshN ? freshSum / freshN : undefined, notified: 0 };
    this.w.count('aging:put', moved);
    this.changed();
    return { ok: true };
  }

  /** 선반에서 꺼내기 → 가방(넘치면 창고) */
  take(b: BuildingInstance, idx: number): Result {
    const c = this.ensure(b);
    const s = c.slots[idx];
    if (!s) return { ok: false, reason: '비어 있어요' };
    const bonus = this.bonusOf(s);
    let left = this.w.inventory.add('bag', s.itemId, s.qty, s.freshness, true, bonus || undefined);
    if (left > 0) {
      for (const cid of this.w.inventory.storageIds()) {
        if (left <= 0) break;
        left = this.w.inventory.add(cid, s.itemId, left, s.freshness, true, bonus || undefined);
      }
    }
    if (left >= s.qty) return { ok: false, reason: '가방과 창고가 가득 찼어요' };
    const taken = s.qty - left;
    if (bonus > s.baseBonus) this.w.count('aging:done', taken);
    if (left > 0) s.qty = left;
    else c.slots[idx] = null;
    this.changed();
    return { ok: true };
  }

  upgradeCost(b: BuildingInstance, k: CellarUpgrade) {
    this.ensure(b);
    return CELLAR_UPGRADES[k].cost[b.upgrades![k]] ?? null;
  }

  upgrade(b: BuildingInstance, k: CellarUpgrade): Result {
    const c = this.upgradeCost(b, k);
    if (!c) return { ok: false, reason: '최대 단계예요' };
    if (this.w.state.gold < c.gold) return { ok: false, reason: '골드가 부족해요' };
    if (!this.w.inventory.hasMats(c.mats as unknown as { id: string; qty: number }[])) return { ok: false, reason: '재료가 부족해요' };
    this.w.spend(c.gold, `숙성고:${CELLAR_UPGRADES[k].name}`);
    this.w.inventory.consumeMats(c.mats as unknown as { id: string; qty: number }[]);
    b.upgrades![k]++;
    this.ensure(b);
    this.changed();
    return { ok: true };
  }

  /** 아침: 새 숙성 단계 도달 알림 (알림 업그레이드) */
  morning(): void {
    for (const b of this.cellars()) {
      const c = this.ensure(b);
      for (const s of c.slots) {
        if (!s) continue;
        const bonus = agingBonus(s.itemId, this.daysAged(s));
        if (bonus > (s.notified ?? 0)) {
          s.notified = bonus;
          if (b.upgrades!.notify) this.w.notify({ key: `aging_${b.uid}`, text: `숙성고: ${ITEM_BY_ID[s.itemId].name}이(가) ${this.daysAged(s)}일 숙성됐어요 (가치 +${Math.round(bonus * 100)}%)`, icon: ITEM_BY_ID[s.itemId].icon, tone: 'good' });
        }
      }
    }
  }

  private changed(): void {
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('inventory', { containerId: 'bag' });
  }
}
