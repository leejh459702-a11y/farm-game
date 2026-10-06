/**
 * SpiritSystem — 정령의 사당 (엔드게임 선택 콘텐츠, 메인 진행 필수 아님).
 */
import { FUSE_DAYS, FUSE_MIN_BOND, SHRINE_CAPACITY, SPIRITS, SPIRIT_BY_ID } from '../data/spirits';
import { SKILLS } from '../data/skills';
import type { BuildingInstance, SpiritInst } from '../types/game';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };

export class SpiritSystem {
  constructor(private w: World) {}

  /** 사당 해금: 어느 분야든 마스터리 연구 1개 */
  unlocked(): boolean {
    return SKILLS.some((s) => s.mastery && this.w.skills.has(s.id));
  }

  shrines(): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter((b) => b.type === 'spirit_shrine');
  }

  ensure(b: BuildingInstance): NonNullable<BuildingInstance['shrine']> {
    if (!b.shrine) b.shrine = { spirits: [], fusing: null };
    if (!b.outputId) b.outputId = this.w.inventory.create('output', 12, 1);
    return b.shrine;
  }

  private add(b: BuildingInstance, kind: string): SpiritInst {
    const d = SPIRIT_BY_ID[kind];
    const n = (this.w.state.counters?.[`spirit:${kind}`] ?? 0) + 1;
    const s: SpiritInst = { id: this.w.uid('sp'), kind, name: `${d.name} ${n}`, fedToday: false, timer: d.interval, bond: 20 };
    this.ensure(b).spirits.push(s);
    this.w.count(`spirit:${kind}`);
    const seen = (this.w.state.spiritsSeen ??= []);
    if (!seen.includes(kind)) seen.push(kind);
    return s;
  }

  summon(b: BuildingInstance, kind: string): Result {
    const d = SPIRIT_BY_ID[kind];
    if (!d?.summon) return { ok: false, reason: '불러낼 수 없는 정령이에요 (조합으로만)' };
    const sh = this.ensure(b);
    if (sh.spirits.length >= SHRINE_CAPACITY) return { ok: false, reason: '사당이 가득 찼어요' };
    if (!this.w.inventory.hasMats(d.summon)) return { ok: false, reason: '바칠 재료가 부족해요' };
    this.w.inventory.consumeMats(d.summon);
    const s = this.add(b, kind);
    this.w.notify({ key: 'spirit_new', text: `${s.name}이(가) 사당에 깃들었어요!`, icon: `spirit_${kind}`, tone: 'good' });
    this.changed();
    return { ok: true };
  }

  /** 모든 정령에게 좋아하는 먹이 하나씩 */
  feedAll(b: BuildingInstance): { fed: number; hungry: number } {
    let fed = 0;
    let hungry = 0;
    for (const s of this.ensure(b).spirits) {
      if (s.fedToday) continue;
      const food = SPIRIT_BY_ID[s.kind].foods.find((f) => this.w.inventory.countAll(f) > 0);
      if (food && this.w.inventory.consume(food, 1)) {
        s.fedToday = true;
        fed++;
      } else hungry++;
    }
    this.changed();
    return { fed, hungry };
  }

  /** 조합 가능한 변종 */
  variantOf(a: string, b: string): string | null {
    return SPIRITS.find((s) => s.parents && ((s.parents[0] === a && s.parents[1] === b) || (s.parents[0] === b && s.parents[1] === a)))?.id ?? null;
  }

  fuse(b: BuildingInstance, idA: string, idB: string): Result {
    const sh = this.ensure(b);
    if (sh.fusing) return { ok: false, reason: '이미 조합 중이에요' };
    const a = sh.spirits.find((s) => s.id === idA);
    const c = sh.spirits.find((s) => s.id === idB);
    if (!a || !c || a === c) return { ok: false, reason: '정령 둘을 골라 주세요' };
    const v = this.variantOf(a.kind, c.kind);
    if (!v) return { ok: false, reason: '이 둘은 조합할 수 없어요' };
    if (a.bond < FUSE_MIN_BOND || c.bond < FUSE_MIN_BOND) return { ok: false, reason: `유대감 ${FUSE_MIN_BOND} 이상이어야 해요` };
    if (sh.spirits.length >= SHRINE_CAPACITY) return { ok: false, reason: '새 정령이 머물 자리가 없어요' };
    sh.fusing = { a: a.id, b: c.id, kind: v, daysLeft: FUSE_DAYS };
    this.changed();
    return { ok: true };
  }

  collect(b: BuildingInstance): number {
    this.ensure(b);
    const out = this.w.state.containers[b.outputId!];
    let n = 0;
    out.slots.forEach((s, i) => {
      if (!s) return;
      let left = this.w.inventory.add('bag', s.itemId, s.qty);
      if (left > 0) left = this.w.inventory.store(s.itemId, left, undefined, b, false);
      n += s.qty - left;
      if (left <= 0) out.slots[i] = null;
      else s.qty = left;
    });
    if (n) this.changed();
    return n;
  }

  daily(): void {
    for (const b of this.shrines()) {
      const sh = this.ensure(b);
      for (const s of sh.spirits) {
        if (s.fedToday) {
          s.bond = Math.min(100, s.bond + 6);
          s.timer--;
          if (s.timer <= 0) {
            const d = SPIRIT_BY_ID[s.kind];
            s.timer = d.interval;
            if (this.w.inventory.add(b.outputId!, d.product, 1, undefined, false) === 0) this.w.codex.recordProduced(d.product, 1);
          }
        }
        s.fedToday = false;
      }
      if (sh.fusing) {
        sh.fusing.daysLeft--;
        if (sh.fusing.daysLeft <= 0) {
          const kind = sh.fusing.kind;
          sh.fusing = null;
          const s = this.add(b, kind);
          this.w.notify({ key: 'spirit_variant', text: `새로운 변종 정령 '${s.name}'이(가) 태어났어요!`, icon: `spirit_${kind}`, tone: 'good' });
        }
      }
    }
    this.changed();
  }

  private changed(): void {
    this.w.events.emit('spirits', undefined);
    this.w.events.emit('buildings', undefined);
  }
}
