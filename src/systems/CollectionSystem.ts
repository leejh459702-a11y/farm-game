/**
 * CollectionSystem — 연구 컬렉션(아이템 모아 제출) + 스킬북(읽으면 영구 효과).
 */
import { BOOK_BY_ID } from '../data/books';
import { COLLECTIONS, COLLECTION_BY_ID, type CollectionData } from '../data/collections';
import { ITEM_BY_ID } from '../data/items';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };

export class CollectionSystem {
  constructor(private w: World) {}

  private get st() {
    return (this.w.state.collections ??= { progress: {}, done: [] });
  }

  // ───── 스킬북 ─────
  hasBook(id: string): boolean {
    return (this.w.state.books ?? []).includes(id);
  }

  isBook(itemId: string): boolean {
    return !!BOOK_BY_ID[itemId];
  }

  read(itemId: string): Result {
    const b = BOOK_BY_ID[itemId];
    if (!b) return { ok: false, reason: '책이 아니에요' };
    if (this.hasBook(itemId)) return { ok: false, reason: '이미 읽은 책이에요 (팔 수 있어요)' };
    if (!this.w.inventory.consume(itemId, 1)) return { ok: false, reason: '가진 책이 없어요' };
    (this.w.state.books ??= []).push(itemId);
    this.w.notify({ key: `book_${itemId}`, text: `${b.name}을(를) 읽었어요! ${b.desc} (영구)`, icon: `it_${itemId}`, tone: 'good' });
    this.w.events.emit('majorChange', { reason: 'book' });
    this.w.events.emit('sfx', { key: 'levelup' });
    return { ok: true };
  }

  // ───── 연구 컬렉션 ─────
  submitted(c: CollectionData, itemId: string): number {
    return this.st.progress[c.id]?.[itemId] ?? 0;
  }

  isDone(id: string): boolean {
    return this.st.done.includes(id);
  }

  complete(c: CollectionData): boolean {
    return c.items.every((it) => this.submitted(c, it.id) >= it.qty);
  }

  /** 가진 만큼 제출 (가방 → 창고) */
  submit(id: string): Result & { n?: number } {
    const c = COLLECTION_BY_ID[id];
    if (!c) return { ok: false, reason: '없는 컬렉션' };
    if (this.isDone(id)) return { ok: false, reason: '이미 완료했어요' };
    const prog = (this.st.progress[id] ??= {});
    let n = 0;
    for (const it of c.items) {
      const need = it.qty - (prog[it.id] ?? 0);
      if (need <= 0) continue;
      const have = it.id.startsWith('#') ? this.w.inventory.countMatching(it.id) : this.w.inventory.countAll(it.id);
      const give = Math.min(need, have);
      if (give <= 0) continue;
      const ok = it.id.startsWith('#') ? this.w.inventory.consumeMatching(it.id, give) : this.w.inventory.consume(it.id, give);
      if (!ok) continue;
      prog[it.id] = (prog[it.id] ?? 0) + give;
      n += give;
    }
    if (!n) return { ok: false, reason: '제출할 물건이 없어요' };
    if (this.complete(c)) this.finish(c);
    this.w.events.emit('collections', undefined);
    return { ok: true, n };
  }

  private finish(c: CollectionData): void {
    this.st.done.push(c.id);
    const r = c.reward;
    if (r.gold) this.w.earn(r.gold, '연구 컬렉션', false);
    for (const it of r.items ?? []) {
      const left = this.w.inventory.add('bag', it.id, it.qty);
      if (left > 0) this.w.inventory.store(it.id, left, undefined, undefined, false);
    }
    if (r.build) this.w.state.buildStock[r.build.id] = (this.w.state.buildStock[r.build.id] ?? 0) + r.build.qty;
    if (r.tool) {
      const max = r.tool === 'rod' ? 3 : 3;
      this.w.state.tools[r.tool] = Math.min(max, this.w.state.tools[r.tool] + 1);
    }
    this.w.count('collection');
    this.w.notify({ key: `coll_${c.id}`, text: `연구 컬렉션 '${c.name}' 완성! 보상: ${c.rewardText}`, icon: 'ic_research', tone: 'good' });
    this.w.events.emit('majorChange', { reason: 'collection' });
  }

  /** 제출 가능한 것이 있는 컬렉션 수 (배지) */
  ready(): number {
    return COLLECTIONS.filter((c) => !this.isDone(c.id) && c.items.some((it) => this.submitted(c, it.id) < it.qty && (it.id.startsWith('#') ? this.w.inventory.countMatching(it.id) : this.w.inventory.countAll(it.id)) > 0)).length;
  }

  itemName(id: string): string {
    return id.startsWith('#') ? ({ roe: '어란(아무거나)', fish: '물고기(아무거나)' } as Record<string, string>)[id.slice(1)] ?? id : ITEM_BY_ID[id]?.name ?? id;
  }
}
