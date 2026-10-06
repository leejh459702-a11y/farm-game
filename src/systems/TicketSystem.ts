/**
 * TicketSystem — 농업 교환권. 인벤토리 아이템이 아니라 별도 수치로 보관 (실수로 팔지 않게).
 */
import { EXCHANGE_BY_ID } from '../data/exchange';
import { BUILDING_BY_ID } from '../data/buildings';
import { CROP_BY_ID } from '../data/crops';
import { ITEM_BY_ID } from '../data/items';
import { ANIMAL_BY_ID } from '../data/animals';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };

export class TicketSystem {
  constructor(private w: World) {}

  private get st() {
    return (this.w.state.tickets ??= { have: 0, codexAwarded: 0, total: 0 });
  }

  get have(): number {
    return this.st.have;
  }

  give(n: number, why: string): void {
    if (n <= 0) return;
    this.st.have += n;
    this.st.total += n;
    this.w.notify({ key: `ticket_${why}`, text: `농업 교환권 +${n} (${why}) — 보유 ${this.st.have}장`, icon: 'ic_ticket', tone: 'good' });
    this.w.events.emit('tickets', undefined);
  }

  /** 도감 발견 10종마다 1장 (아침에 확인) */
  checkCodex(): void {
    const found = Object.values(this.w.state.codex.items).filter((e) => e.discovered).length;
    const due = Math.floor(found / 10);
    if (due > this.st.codexAwarded) {
      const n = due - this.st.codexAwarded;
      this.st.codexAwarded = due;
      this.give(n, '도감 달성');
    }
  }

  /** 월말 기록 */
  onMonthEnd(income: number): void {
    if (income >= 50000) this.give(2, '월간 기록');
    else if (income >= 10000) this.give(1, '월간 기록');
  }

  exchange(optionId: string, choice: string): Result {
    const o = EXCHANGE_BY_ID[optionId];
    if (!o || !o.choices.some((c) => c.id === choice)) return { ok: false, reason: '잘못된 선택' };
    if (this.st.have < o.cost) return { ok: false, reason: `교환권이 ${o.cost}장 필요해요` };
    const w = this.w;
    const giveItem = (id: string, qty: number) => {
      const left = w.inventory.add('bag', id, qty);
      if (left > 0) w.inventory.store(id, left, undefined, undefined, false);
    };
    switch (optionId) {
      case 'ex_seed':
        giveItem(`seed_${choice}`, CROP_BY_ID[choice].fruitTree ? 1 : 3);
        break;
      case 'ex_deco':
      case 'ex_coupon':
        w.state.buildStock[choice] = (w.state.buildStock[choice] ?? 0) + 1;
        break;
      case 'ex_book':
        giveItem(choice, 1);
        break;
      case 'ex_animal': {
        const home = w.animals.findHome(choice);
        if (!home) return { ok: false, reason: `${ANIMAL_BY_ID[choice].name}이(가) 들어갈 축사가 없어요` };
        w.animals.create(choice, { grade: 2, buildingUid: home.uid, traits: w.animals.randomTraits(1) });
        break;
      }
    }
    this.st.have -= o.cost;
    const label = optionId === 'ex_animal' ? ANIMAL_BY_ID[choice].name : optionId === 'ex_deco' || optionId === 'ex_coupon' ? BUILDING_BY_ID[choice].name : ITEM_BY_ID[optionId === 'ex_seed' ? `seed_${choice}` : choice]?.name ?? choice;
    w.notify({ key: 'ticket_ex', text: `교환권으로 '${label}'을(를) 받았어요!`, icon: 'ic_ticket', tone: 'good' });
    w.events.emit('tickets', undefined);
    w.events.emit('majorChange', { reason: 'exchange' });
    return { ok: true };
  }

  label(optionId: string, choice: string): string {
    if (optionId === 'ex_animal') return ANIMAL_BY_ID[choice].name;
    if (optionId === 'ex_deco' || optionId === 'ex_coupon') return BUILDING_BY_ID[choice]?.name ?? choice;
    if (optionId === 'ex_seed') return ITEM_BY_ID[`seed_${choice}`]?.name ?? choice;
    return ITEM_BY_ID[choice]?.name ?? choice;
  }
}
