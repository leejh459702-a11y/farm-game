/**
 * AquacultureSystem — 양식장 (3×3, 한 종류의 물고기만).
 * 물고기를 넣고 먹이를 주면 번식하고, 어란과 특수 생산물을 만든다.
 * 굶겨도 물고기는 죽지 않는다 — 그날 생산·번식만 쉰다.
 */
import { FISH_BY_ID } from '../data/fish';
import { ITEM_BY_ID } from '../data/items';
import { POND_BALANCE, POND_SPECIALS, POND_TIERS, POND_UPGRADES, roeId, type PondUpgrade } from '../data/aquaculture';
import type { BuildingInstance } from '../types/game';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };

export class AquacultureSystem {
  constructor(private w: World) {}

  ponds(): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter((b) => b.type === 'fishpond');
  }

  /** 건설 직후 상태 보정 (구버전 세이브 포함) */
  ensure(b: BuildingInstance): NonNullable<BuildingInstance['pond']> {
    if (!b.pond) b.pond = { fishId: null, count: 0, tier: 0, fedToday: false, born: 0 };
    if (!b.upgrades) b.upgrades = {};
    for (const k of Object.keys(POND_UPGRADES)) b.upgrades[k] ??= 0;
    if (!b.outputId) b.outputId = this.w.inventory.create('output', 12, 1);
    return b.pond;
  }

  capacity(b: BuildingInstance): number {
    return POND_TIERS[this.ensure(b).tier].cap;
  }

  feedNeed(b: BuildingInstance): number {
    const n = this.ensure(b).count;
    return n ? Math.ceil(n / POND_BALANCE.fishPerFeed) : 0;
  }

  /** 가방(또는 창고)의 물고기 한 마리를 넣는다 */
  stock(b: BuildingInstance, fishId: string): Result {
    const p = this.ensure(b);
    const f = FISH_BY_ID[fishId];
    if (!f || f.rarity === 'legend' || f.id === 'old_boot') return { ok: false, reason: '양식할 수 없는 물고기예요' };
    if (p.fishId && p.fishId !== fishId) return { ok: false, reason: `이 양식장은 ${FISH_BY_ID[p.fishId].name} 전용이에요` };
    if (p.count >= this.capacity(b)) return { ok: false, reason: '양식장이 가득 찼어요 (확장하면 더 넣을 수 있어요)' };
    if (!this.w.inventory.consume(fishId, 1)) return { ok: false, reason: '물고기가 없어요' };
    p.fishId = fishId;
    p.count++;
    this.w.count('pond:stock');
    this.w.life.addXp('fishing', 4);
    this.changed();
    return { ok: true };
  }

  /** 한 마리 건져서 가방으로 (신선도 100) */
  takeOut(b: BuildingInstance): Result {
    const p = this.ensure(b);
    if (!p.fishId || p.count <= 0) return { ok: false, reason: '물고기가 없어요' };
    if (this.w.inventory.add('bag', p.fishId, 1, 100) > 0) return { ok: false, reason: '가방이 가득 찼어요' };
    p.count--;
    if (p.count === 0) p.fishId = null;
    this.changed();
    return { ok: true };
  }

  feed(b: BuildingInstance, source: 'player' | 'auto' = 'player'): Result {
    const p = this.ensure(b);
    if (!p.count) return { ok: false, reason: '물고기가 없어요' };
    if (p.fedToday) return { ok: false, reason: '오늘은 이미 먹이를 줬어요' };
    const need = this.feedNeed(b);
    if (!this.w.inventory.consume('fish_feed', need)) return { ok: false, reason: `양식 사료가 ${need}개 필요해요` };
    p.fedToday = true;
    if (source === 'player') this.w.events.emit('sfx', { key: 'water' });
    this.changed();
    return { ok: true };
  }

  nextTier(b: BuildingInstance): (typeof POND_TIERS)[number] | null {
    return POND_TIERS[this.ensure(b).tier + 1] ?? null;
  }

  expand(b: BuildingInstance): Result {
    const t = this.nextTier(b);
    if (!t) return { ok: false, reason: '최대 단계예요' };
    if (this.w.state.gold < t.gold) return { ok: false, reason: '골드가 부족해요' };
    if (!this.w.inventory.hasMats(t.mats)) return { ok: false, reason: '확장 재료가 부족해요' };
    this.w.spend(t.gold, '양식장 확장');
    this.w.inventory.consumeMats(t.mats);
    this.ensure(b).tier++;
    this.changed();
    return { ok: true };
  }

  upgradeCost(b: BuildingInstance, key: PondUpgrade): (typeof POND_UPGRADES)[PondUpgrade]['cost'][number] | null {
    this.ensure(b);
    return POND_UPGRADES[key].cost[b.upgrades![key]] ?? null;
  }

  upgrade(b: BuildingInstance, key: PondUpgrade): Result {
    const c = this.upgradeCost(b, key);
    if (!c) return { ok: false, reason: '최대 단계예요' };
    if (this.w.state.gold < c.gold) return { ok: false, reason: '골드가 부족해요' };
    if (!this.w.inventory.hasMats(c.mats)) return { ok: false, reason: '재료가 부족해요' };
    this.w.spend(c.gold, `양식장:${POND_UPGRADES[key].name}`);
    this.w.inventory.consumeMats(c.mats);
    b.upgrades![key]++;
    this.changed();
    return { ok: true };
  }

  pendingOutput(b: BuildingInstance): number {
    if (!b.outputId) return 0;
    return this.w.state.containers[b.outputId]?.slots.reduce((s, x) => s + (x?.qty ?? 0), 0) ?? 0;
  }

  /** 생산물 수거 → 가방(넘치면 창고) */
  collect(b: BuildingInstance, toStorage = false): number {
    this.ensure(b);
    const out = this.w.state.containers[b.outputId!];
    let n = 0;
    out.slots.forEach((s, i) => {
      if (!s) return;
      let left = toStorage ? s.qty : this.w.inventory.add('bag', s.itemId, s.qty, s.freshness);
      if (left > 0) left = this.w.inventory.store(s.itemId, left, s.freshness, b, false);
      n += s.qty - left;
      if (left <= 0) out.slots[i] = null;
      else s.qty = left;
    });
    if (n) {
      this.w.events.emit('inventory', { containerId: b.outputId! });
      this.changed();
    }
    return n;
  }

  /** 아침: 자동 사료 / 자동 수거 */
  morning(): void {
    for (const b of this.ponds()) {
      const p = this.ensure(b);
      if (b.upgrades!.autoFeed && p.count && !p.fedToday) this.feed(b, 'auto');
      if (b.upgrades!.autoCollect) this.collect(b, true);
    }
  }

  /** 하루 끝: 번식 · 어란 · 특수 생산물 */
  daily(): void {
    for (const b of this.ponds()) {
      const p = this.ensure(b);
      if (!p.fishId || !p.count) {
        p.fedToday = false;
        continue;
      }
      const f = FISH_BY_ID[p.fishId];
      const out = b.outputId!;
      if (p.fedToday) {
        // 번식 — 가득 차 있으면 늘어난 물고기는 생산물로
        if (p.count >= 2 && this.w.rand() < POND_BALANCE.breedChance * (1 + 0.5 * b.upgrades!.breedSpeed)) {
          if (p.count < this.capacity(b)) {
            p.count++;
            p.born++;
            this.w.notify({ key: `pond_${b.uid}`, text: `양식장의 ${f.name}이(가) 한 마리 늘었어요 (${p.count}/${this.capacity(b)})`, icon: f.spriteKey, tone: 'good' });
          } else this.w.inventory.add(out, f.id, 1, 100, false);
        }
        // 어란
        const roeMul = 1 + 0.4 * b.upgrades!.roeYield;
        let roe = 0;
        for (let i = 0; i < p.count; i++) if (this.w.rand() < POND_BALANCE.roeChancePerFish * roeMul) roe++;
        if (roe) {
          this.w.inventory.add(out, roeId(f.id), roe, 100, false);
          this.w.codex.recordProduced(roeId(f.id), roe);
        }
        // 특수 생산물 (어종 희귀도별)
        const tier = f.rarity === 'legend' ? 'epic' : f.rarity;
        if (this.w.rand() < POND_BALANCE.specialChance[tier] * Math.min(1, p.count / 5)) {
          const table = POND_SPECIALS[tier];
          let x = this.w.rand() * table.reduce((s, e) => s + e.w, 0);
          const pick = table.find((e) => (x -= e.w) < 0) ?? table[0];
          this.w.inventory.add(out, pick.id, 1, ITEM_BY_ID[pick.id]?.decay ? 100 : undefined, false);
          this.w.codex.recordProduced(pick.id, 1);
        }
      }
      p.fedToday = false;
    }
    this.changed();
  }

  private changed(): void {
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('ponds', undefined);
  }
}
