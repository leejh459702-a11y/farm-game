/**
 * ProcessingSystem — 가공소/주방/방직소/육가공소/퇴비통 작업 큐.
 * 게임 시간(분) 단위로 진행되며 메뉴가 열려 시간이 멈추면 함께 멈춘다.
 */
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID, type StationId } from '../data/buildings';
import { ITEM_BY_ID } from '../data/items';
import { RECIPES, RECIPE_BY_ID, type RecipeData } from '../data/recipes';
import type { BuildingInstance } from '../types/game';
import type { World } from '../core/World';

export class ProcessingSystem {
  constructor(private w: World) {}

  stations(): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter((b) => !!BUILDING_BY_ID[b.type].station);
  }

  recipesFor(station: StationId): RecipeData[] {
    return RECIPES.filter((r) => r.station === station);
  }

  isUnlocked(r: RecipeData): boolean {
    return !r.unlockSkill || this.w.skills.has(r.unlockSkill);
  }

  /** 재료 충분 여부 */
  canMake(r: RecipeData, times = 1): boolean {
    return r.inputs.every((i) => this.w.inventory.countAll(i.id) >= i.qty * times);
  }

  start(b: BuildingInstance, recipeId: string): { ok: boolean; reason?: string } {
    const r = RECIPE_BY_ID[recipeId];
    const d = BUILDING_BY_ID[b.type];
    if (!r || r.station !== d.station) return { ok: false, reason: '이 시설에서 만들 수 없습니다' };
    if (!this.isUnlocked(r)) return { ok: false, reason: '연구가 필요합니다' };
    if ((b.queue?.length ?? 0) >= (d.queueSize ?? 1)) return { ok: false, reason: '작업 슬롯이 가득 찼습니다' };
    if (!this.canMake(r)) return { ok: false, reason: '재료가 부족합니다' };
    for (const i of r.inputs) this.w.inventory.consume(i.id, i.qty);
    b.queue!.push({ recipeId, remaining: r.minutes, total: r.minutes });
    this.w.events.emit('processing', undefined);
    this.w.events.emit('sfx', { key: 'process' });
    return { ok: true };
  }

  /** 게임 분 경과 */
  tick(minutes: number): void {
    let changed = false;
    for (const b of this.stations()) {
      if (!b.queue?.length) continue;
      // 모든 슬롯이 병렬로 진행
      for (const job of b.queue) job.remaining = Math.max(0, job.remaining - minutes);
      const done = b.queue.filter((j) => j.remaining <= 0);
      if (!done.length) continue;
      for (const job of done) {
        const out = this.finish(b, job.recipeId);
        if (!out) {
          job.remaining = 0; // 출력함이 가득 — 대기
          continue;
        }
        b.queue.splice(b.queue.indexOf(job), 1);
        changed = true;
      }
      if (b.autoInput && b.autoRecipe && this.w.skills.has('f_autoProcess')) {
        while ((b.queue.length ?? 0) < (BUILDING_BY_ID[b.type].queueSize ?? 1) && this.start(b, b.autoRecipe).ok) changed = true;
      }
    }
    if (changed) this.w.events.emit('processing', undefined);
  }

  private finish(b: BuildingInstance, recipeId: string): boolean {
    let itemId: string;
    let qty: number;
    let name: string;
    if (recipeId.startsWith('ship:')) {
      const [, meat, q] = recipeId.split(':');
      itemId = meat;
      qty = Number(q);
      name = ITEM_BY_ID[meat].name;
    } else {
      const r = RECIPE_BY_ID[recipeId];
      itemId = r.output;
      qty = r.outQty;
      name = r.outputName;
      this.w.skills.addXp(r.station === 'kitchen' ? 'farming' : r.station === 'loom' || r.station === 'butcher' ? 'livestock' : 'farming', r.station === 'kitchen' ? BALANCE.xp.cook : BALANCE.xp.process);
    }
    const left = this.w.inventory.add(b.outputId!, itemId, qty, 100, false);
    if (left >= qty) return false;
    this.w.codex.recordProduced(itemId, qty - left);
    // 자동 수거 (자동 농업/자동 가공 연구 시 창고로)
    if (this.w.skills.has('f_autoProcess')) this.collect(b, true);
    this.w.notify({ key: `proc_${itemId}`, text: `${name} 생산이 완료되었습니다`, icon: ITEM_BY_ID[itemId].icon, count: qty - left, tone: 'good', target: { x: b.x, y: b.y } });
    this.w.events.emit('inventory', { containerId: b.outputId! });
    return true;
  }

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
    if (n) this.w.events.emit('inventory', { containerId: b.outputId });
    return n;
  }

  readyCount(b: BuildingInstance): number {
    if (!b.outputId) return 0;
    return this.w.state.containers[b.outputId]?.slots.reduce((s, x) => s + (x?.qty ?? 0), 0) ?? 0;
  }

  setAuto(b: BuildingInstance, recipeId: string | null): { ok: boolean; reason?: string } {
    if (!this.w.skills.has('f_autoProcess')) return { ok: false, reason: '자동 가공 연구가 필요합니다' };
    b.autoInput = !!recipeId;
    b.autoRecipe = recipeId;
    return { ok: true };
  }
}
