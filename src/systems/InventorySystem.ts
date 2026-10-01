/**
 * InventorySystem / StorageSystem — 가방·보관시설 컨테이너 조작.
 * 같은 아이템은 신선도 차이가 허용 범위 이내일 때만 한 스택으로 합친다(가중 평균).
 */
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID } from '../data/buildings';
import { ITEM_BY_ID, item, matchesInput } from '../data/items';
import type { Container, ContainerKind, ItemCategory, ItemStack } from '../types/game';
import type { World } from '../core/World';

const CAT_ORDER: ItemCategory[] = ['crop', 'animal', 'fish', 'forage', 'processed', 'cooking', 'resource', 'seed', 'other'];

export type Mats = { id: string; qty: number }[];

export class InventorySystem {
  constructor(private w: World) {}

  get(id: string): Container | undefined {
    return this.w.state.containers[id];
  }

  create(kind: ContainerKind, slots: number, decayMul: number): string {
    const id = this.w.uid('c');
    this.w.state.containers[id] = { id, kind, slots: new Array(slots).fill(null), decayMul };
    return id;
  }

  private perishable(itemId: string): boolean {
    return (ITEM_BY_ID[itemId]?.decay ?? 0) > 0;
  }

  private canMerge(s: ItemStack, itemId: string, fresh: number | undefined): boolean {
    if (s.itemId !== itemId) return false;
    if (s.qty >= item(itemId).maxStack) return false;
    if (!this.perishable(itemId)) return true;
    return Math.abs((s.freshness ?? 100) - (fresh ?? 100)) <= BALANCE.freshness.mergeTolerance;
  }

  /** 들어갈 수 있는 수량 */
  capacityFor(containerId: string, itemId: string, fresh?: number): number {
    const c = this.get(containerId);
    if (!c) return 0;
    const max = item(itemId).maxStack;
    let cap = 0;
    for (const s of c.slots) {
      if (!s) cap += max;
      else if (this.canMerge(s, itemId, fresh)) cap += max - s.qty;
    }
    return cap;
  }

  /** 추가 후 남은 수량 반환 */
  add(containerId: string, itemId: string, qty: number, freshness?: number, emit = true, bonus?: number): number {
    const c = this.get(containerId);
    if (!c || qty <= 0) return qty;
    const def = item(itemId);
    const fresh = def.decay > 0 ? (freshness ?? 100) : undefined;
    let left = qty;
    for (const s of c.slots) {
      if (left <= 0) break;
      if (s && this.canMerge(s, itemId, fresh)) {
        const n = Math.min(left, def.maxStack - s.qty);
        if (fresh !== undefined) s.freshness = ((s.freshness ?? 100) * s.qty + fresh * n) / (s.qty + n);
        if (bonus || s.bonus) s.bonus = ((s.bonus ?? 0) * s.qty + (bonus ?? 0) * n) / (s.qty + n);
        s.qty += n;
        left -= n;
      }
    }
    for (let i = 0; i < c.slots.length && left > 0; i++) {
      if (!c.slots[i]) {
        const n = Math.min(left, def.maxStack);
        c.slots[i] = fresh !== undefined ? { itemId, qty: n, freshness: fresh } : { itemId, qty: n };
        if (bonus) c.slots[i]!.bonus = bonus;
        left -= n;
      }
    }
    if (left < qty) {
      this.w.codex.discoverItem(itemId);
      if (emit) this.w.events.emit('inventory', { containerId });
    }
    return left;
  }

  count(containerId: string, itemId: string): number {
    const c = this.get(containerId);
    if (!c) return 0;
    let n = 0;
    for (const s of c.slots) if (s && s.itemId === itemId) n += s.qty;
    return n;
  }

  /** 가방 + 모든 저장시설 합계 */
  countAll(itemId: string): number {
    let n = this.count('bag', itemId);
    for (const id of this.storageIds()) n += this.count(id, itemId);
    return n;
  }

  /**
   * 제거 (신선도 낮은 것부터). 실제 제거된 스택 목록 반환.
   */
  remove(containerId: string, itemId: string, qty: number, lowFirst = true): ItemStack[] {
    const c = this.get(containerId);
    const out: ItemStack[] = [];
    if (!c || qty <= 0) return out;
    const idx = c.slots
      .map((s, i) => ({ s, i }))
      .filter((e) => e.s && e.s.itemId === itemId)
      .sort((a, b) => ((a.s!.freshness ?? 100) - (b.s!.freshness ?? 100)) * (lowFirst ? 1 : -1));
    let left = qty;
    for (const { s, i } of idx) {
      if (left <= 0) break;
      const n = Math.min(left, s!.qty);
      out.push({ itemId, qty: n, freshness: s!.freshness });
      s!.qty -= n;
      left -= n;
      if (s!.qty <= 0) c.slots[i] = null;
    }
    if (out.length) this.w.events.emit('inventory', { containerId });
    return out;
  }

  removeAt(containerId: string, slot: number, qty: number): ItemStack | null {
    const c = this.get(containerId);
    const s = c?.slots[slot];
    if (!c || !s) return null;
    const n = Math.min(qty, s.qty);
    s.qty -= n;
    if (s.qty <= 0) c.slots[slot] = null;
    this.w.events.emit('inventory', { containerId });
    return { itemId: s.itemId, qty: n, freshness: s.freshness };
  }

  /** 태그 재료(#fish 등) 포함 보유 수량 */
  countMatching(input: string): number {
    if (!input.startsWith('#')) return this.countAll(input);
    let n = 0;
    for (const id of ['bag', ...this.storageIds()]) for (const s of this.get(id)!.slots) if (s && matchesInput(s.itemId, input)) n += s.qty;
    return n;
  }

  /** 태그 재료 소비 (신선도 낮은 것부터) */
  consumeMatching(input: string, qty: number): boolean {
    if (!input.startsWith('#')) return this.consume(input, qty);
    if (this.countMatching(input) < qty) return false;
    let left = qty;
    const all: { cid: string; i: number; f: number }[] = [];
    for (const id of ['bag', ...this.storageIds()])
      this.get(id)!.slots.forEach((s, i) => s && matchesInput(s.itemId, input) && all.push({ cid: id, i, f: s.freshness ?? 100 }));
    all.sort((a, b) => a.f - b.f);
    for (const e of all) {
      if (left <= 0) break;
      const s = this.get(e.cid)!.slots[e.i]!;
      const got = this.removeAt(e.cid, e.i, Math.min(left, s.qty));
      left -= got?.qty ?? 0;
    }
    return left <= 0;
  }

  /** 재료 목록 보유 여부 */
  hasMats(mats: Mats | undefined): boolean {
    return !mats || mats.every((m) => this.countAll(m.id) >= m.qty);
  }

  consumeMats(mats: Mats | undefined): boolean {
    if (!mats?.length) return true;
    if (!this.hasMats(mats)) return false;
    for (const m of mats) this.consume(m.id, m.qty);
    return true;
  }

  /** 가방 → 저장시설 순으로 꺼내 쓰기 */
  consume(itemId: string, qty: number): boolean {
    if (this.countAll(itemId) < qty) return false;
    let left = qty;
    for (const id of ['bag', ...this.storageIds()]) {
      if (left <= 0) break;
      const got = this.remove(id, itemId, Math.min(left, this.count(id, itemId)));
      left -= got.reduce((s, x) => s + x.qty, 0);
    }
    return left <= 0;
  }

  /** 저장시설 컨테이너 id (기준 좌표에 가까운 순) */
  storageIds(near?: { x: number; y: number }): string[] {
    const list: { id: string; d: number }[] = [];
    for (const b of Object.values(this.w.state.buildings)) {
      if (!b.containerId) continue;
      const d = near ? Math.abs(b.x - near.x) + Math.abs(b.y - near.y) : 0;
      list.push({ id: b.containerId, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.map((e) => e.id);
  }

  /** 가까운 저장시설에 넣고(없으면 가방), 남은 수량 반환 */
  store(itemId: string, qty: number, freshness?: number, near?: { x: number; y: number }, allowBag = true): number {
    let left = qty;
    // 신선도 있는 품목은 냉장 시설 우선
    const ids = this.storageIds(near);
    const perish = this.perishable(itemId);
    const sorted = perish ? [...ids].sort((a, b) => this.get(a)!.decayMul - this.get(b)!.decayMul) : ids;
    for (const id of sorted) {
      if (left <= 0) break;
      left = this.add(id, itemId, left, freshness);
    }
    if (left > 0 && allowBag) left = this.add('bag', itemId, left, freshness);
    return left;
  }

  moveSlot(fromId: string, slot: number, toId: string): boolean {
    const from = this.get(fromId);
    const s = from?.slots[slot];
    if (!from || !s) return false;
    const left = this.add(toId, s.itemId, s.qty, s.freshness);
    if (left === s.qty) return false;
    if (left <= 0) from.slots[slot] = null;
    else s.qty = left;
    this.w.events.emit('inventory', { containerId: fromId });
    return true;
  }

  /** 필터에 맞는 모든 스택 이동 (일괄 이동) */
  moveAll(fromId: string, toId: string, filter?: (s: ItemStack) => boolean): number {
    const from = this.get(fromId);
    if (!from) return 0;
    let moved = 0;
    from.slots.forEach((s, i) => {
      if (!s || (filter && !filter(s))) return;
      const before = s.qty;
      if (this.moveSlot(fromId, i, toId)) moved += before - (from.slots[i]?.qty ?? 0);
    });
    return moved;
  }

  sort(containerId: string): void {
    const c = this.get(containerId);
    if (!c) return;
    const favs = new Set(this.w.state.favorites);
    const stacks = c.slots.filter(Boolean) as ItemStack[];
    // 재병합
    const merged: ItemStack[] = [];
    for (const s of stacks) {
      const m = merged.find((x) => this.canMerge(x, s.itemId, s.freshness) && x.qty + s.qty <= item(s.itemId).maxStack);
      if (m) {
        if (s.freshness !== undefined) m.freshness = ((m.freshness ?? 100) * m.qty + s.freshness * s.qty) / (m.qty + s.qty);
        m.qty += s.qty;
      } else merged.push({ ...s });
    }
    merged.sort((a, b) => {
      const fa = favs.has(a.itemId) ? 0 : 1;
      const fb = favs.has(b.itemId) ? 0 : 1;
      if (fa !== fb) return fa - fb;
      const ca = CAT_ORDER.indexOf(item(a.itemId).category);
      const cb = CAT_ORDER.indexOf(item(b.itemId).category);
      if (ca !== cb) return ca - cb;
      if (a.itemId !== b.itemId) return a.itemId < b.itemId ? -1 : 1;
      return (b.freshness ?? 100) - (a.freshness ?? 100);
    });
    c.slots = c.slots.map((_, i) => merged[i] ?? null);
    this.w.events.emit('inventory', { containerId });
  }

  toggleFavorite(itemId: string): void {
    const f = this.w.state.favorites;
    const i = f.indexOf(itemId);
    if (i >= 0) f.splice(i, 1);
    else f.push(itemId);
    this.w.events.emit('inventory', { containerId: 'bag' });
  }

  usedSlots(containerId: string): number {
    return this.get(containerId)?.slots.filter(Boolean).length ?? 0;
  }

  /** 가방 크기 재계산 (연구로 확장) */
  resizeBag(): void {
    const bag = this.get('bag')!;
    const want = BALANCE.start.bagSlots + this.w.state.bagUpgrades * BALANCE.storage.bagSlotsPerUpgrade;
    while (bag.slots.length < want) bag.slots.push(null);
    this.w.events.emit('inventory', { containerId: 'bag' });
  }

  /** 건물 컨테이너 이름 */
  containerName(id: string): string {
    if (id === 'bag') return '가방';
    for (const b of Object.values(this.w.state.buildings)) {
      if (b.containerId === id) return BUILDING_BY_ID[b.type].name;
      if (b.outputId === id) return `${BUILDING_BY_ID[b.type].name} 생산물`;
    }
    return '보관함';
  }
}
