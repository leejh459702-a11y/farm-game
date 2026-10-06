/**
 * JournalSystem — 농장일지. 달성 여부는 상태에서 계산하고, 보상 수령 여부만 저장한다.
 * 새로 달성한 항목은 한 번 알림을 띄운다 (강제 아님).
 */
import { JOURNAL, JOURNAL_BY_ID, type JournalEntry } from '../data/journal';
import { ITEM_BY_ID } from '../data/items';
import { BUILDING_BY_ID } from '../data/buildings';
import type { World } from '../core/World';

export class JournalSystem {
  constructor(private w: World) {}

  private get st(): { claimed: string[]; notified: string[] } {
    return (this.w.state.journal ??= { claimed: [], notified: [] });
  }

  progress(e: JournalEntry): { cur: number; done: boolean; claimed: boolean } {
    const cur = Math.min(e.need, Math.max(0, Math.floor(e.progress(this.w))));
    return { cur, done: cur >= e.need, claimed: this.st.claimed.includes(e.id) };
  }

  /** 받을 수 있는 보상 수 (HUD 배지) */
  claimable(): number {
    return JOURNAL.filter((e) => {
      const p = this.progress(e);
      return p.done && !p.claimed;
    }).length;
  }

  /** 다음에 해 볼 만한 것 — 진행 중인 항목 중 앞쪽 3개 */
  suggestions(n = 3): JournalEntry[] {
    return JOURNAL.filter((e) => !this.progress(e).done).slice(0, n);
  }

  claim(id: string): { ok: boolean; reason?: string } {
    const e = JOURNAL_BY_ID[id];
    if (!e) return { ok: false, reason: '없는 항목' };
    const p = this.progress(e);
    if (p.claimed) return { ok: false, reason: '이미 받았어요' };
    if (!p.done) return { ok: false, reason: '아직 달성하지 않았어요' };
    const r = e.reward;
    if (r.items?.some((it) => this.w.inventory.capacityFor('bag', it.id) < it.qty && this.w.inventory.storageIds().length === 0)) return { ok: false, reason: '가방에 공간이 부족해요' };
    this.st.claimed.push(id);
    if (r.gold) this.w.earn(r.gold, '농장일지 보상', false);
    for (const it of r.items ?? []) {
      const left = this.w.inventory.add('bag', it.id, it.qty);
      if (left > 0) this.w.inventory.store(it.id, left, undefined, undefined, false);
    }
    if (r.xp) this.w.skills.addXp(r.xp.tree, r.xp.n);
    if (r.lifeXp) this.w.life.addXp(r.lifeXp.skill, r.lifeXp.n);
    if (r.build) this.w.state.buildStock[r.build.id] = (this.w.state.buildStock[r.build.id] ?? 0) + r.build.qty;
    this.w.events.emit('journal', undefined);
    this.w.events.emit('majorChange', { reason: 'journal' });
    return { ok: true };
  }

  rewardText(e: JournalEntry): string {
    const r = e.reward;
    const out: string[] = [];
    if (r.gold) out.push(`${r.gold.toLocaleString()}G`);
    for (const it of r.items ?? []) out.push(`${ITEM_BY_ID[it.id]?.name ?? it.id} ×${it.qty}`);
    if (r.xp) out.push(`${r.xp.tree === 'farming' ? '농사' : '목축'} 경험치 +${r.xp.n}`);
    if (r.lifeXp) out.push(`${r.lifeXp.skill === 'fishing' ? '낚시' : '채집'} 숙련도 +${r.lifeXp.n}`);
    if (r.build) out.push(`${BUILDING_BY_ID[r.build.id]?.name ?? r.build.id} ×${r.build.qty}`);
    return out.join(' · ');
  }

  /** 새로 달성한 항목 알림 (카운터 변화·아침에 확인) */
  check(): void {
    const st = this.st;
    for (const e of JOURNAL) {
      if (st.notified.includes(e.id) || st.claimed.includes(e.id)) continue;
      if (this.progress(e).done) {
        st.notified.push(e.id);
        this.w.notify({ key: `journal_${e.id}`, text: `농장일지: '${e.title}' 달성! 일지에서 보상을 받으세요`, icon: 'ic_codex', tone: 'good' });
        this.w.events.emit('journal', undefined);
      }
    }
  }
}
