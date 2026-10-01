/**
 * FreshnessSystem — 하루가 끝날 때 모든 컨테이너의 신선도를 감소시킨다.
 * 0이 되면 부패물(rotten)로 전환.
 */
import { BALANCE } from '../data/balance';
import { ITEM_BY_ID } from '../data/items';
import type { Container, ItemStack } from '../types/game';
import type { World } from '../core/World';

export function decayStack(s: ItemStack, decayMul: number, days = 1): ItemStack {
  const d = ITEM_BY_ID[s.itemId]?.decay ?? 0;
  if (d <= 0 || s.freshness === undefined) return s;
  s.freshness = Math.max(0, s.freshness - d * decayMul * days);
  return s;
}

export class FreshnessSystem {
  constructor(private w: World) {}

  /** 컨테이너 하나 처리 — 부패 수량 반환 */
  decayContainer(c: Container): number {
    let rotted = 0;
    for (let i = 0; i < c.slots.length; i++) {
      const s = c.slots[i];
      if (!s || s.freshness === undefined) continue;
      decayStack(s, c.decayMul);
      if (s.freshness <= 0) {
        rotted += s.qty;
        c.slots[i] = null;
      }
    }
    if (rotted > 0) {
      const left = this.w.inventory.add(c.id, 'rotten', rotted, undefined, false);
      if (left > 0) this.w.inventory.add('bag', 'rotten', left, undefined, false);
    }
    return rotted;
  }

  dailyDecay(): { rotted: number; lowCount: number } {
    let rotted = 0;
    let lowCount = 0;
    for (const c of Object.values(this.w.state.containers)) {
      rotted += this.decayContainer(c);
      for (const s of c.slots) if (s && s.freshness !== undefined && s.freshness < BALANCE.freshness.warnBelow) lowCount += s.qty;
    }
    return { rotted, lowCount };
  }

  lowFreshnessStacks(): { containerId: string; stack: ItemStack }[] {
    const out: { containerId: string; stack: ItemStack }[] = [];
    for (const c of Object.values(this.w.state.containers))
      for (const s of c.slots) if (s && s.freshness !== undefined && s.freshness < BALANCE.freshness.warnBelow) out.push({ containerId: c.id, stack: s });
    return out;
  }
}
