/**
 * FinanceSystem (EconomySystem) — 수입/지출 장부, 하루/월간 정산, 월 운영비.
 * 운영비 미납 시 게임오버·이자 없음. 토지 구매/집 업그레이드/고급 연구만 제한.
 */
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID } from '../data/buildings';
import { operatingCost } from '../services/EconomyService';
import type { Ledger, MonthSummary } from '../types/game';
import { emptyLedger } from '../core/newGame';
import { calendar } from './SeasonSystem';
import type { World } from '../core/World';

export class FinanceSystem {
  constructor(private w: World) {}

  today(): Ledger {
    return this.w.state.finance.today;
  }

  month(): Ledger {
    return this.w.state.finance.month;
  }

  hasDebt(): boolean {
    return this.w.state.finance.debt > 0;
  }

  recordIncome(gold: number): void {
    this.today().income += gold;
    this.month().income += gold;
    this.w.state.finance.totalEarned += gold;
  }

  recordExpense(gold: number): void {
    this.today().expense += gold;
    this.month().expense += gold;
  }

  recordSale(itemId: string, qty: number, gold: number): void {
    for (const l of [this.today(), this.month()]) {
      const e = (l.sales[itemId] ??= { qty: 0, gold: 0 });
      e.qty += qty;
      e.gold += gold;
    }
    this.w.state.stats.totalSold += qty;
  }

  salesTotal(l: Ledger): number {
    return Object.values(l.sales).reduce((s, e) => s + e.gold, 0);
  }

  /** 농장 가치 = 보유금 + 토지 + 시설 + 동물 */
  farmValue(): number {
    const s = this.w.state;
    const land = this.w.grid.ownedCount() * 400;
    let blds = 0;
    for (const b of Object.values(s.buildings)) blds += BUILDING_BY_ID[b.type].price;
    blds += BALANCE.house.upgrades.filter((u) => u.level <= s.house.level).reduce((a, u) => a + u.cost, 0);
    let animals = 0;
    for (const a of Object.values(s.animals)) animals += this.w.animals.sellPrice(a, 0);
    return Math.round(s.gold + land + blds + animals);
  }

  /** 하루 마감 — 장부 반환 후 초기화 */
  closeDay(): Ledger {
    const l = this.today();
    const f = this.w.state.finance;
    f.dailyIncome.push(this.salesTotal(l));
    if (f.dailyIncome.length > 30) f.dailyIncome.shift();
    f.today = emptyLedger();
    return l;
  }

  /** 월 마감 — 운영비 청구 */
  closeMonth(endedDay: number): MonthSummary {
    const f = this.w.state.finance;
    const m = this.month();
    const cal = calendar(endedDay);
    const sales = this.salesTotal(m);
    const cost = operatingCost(sales, this.w.state.house.level);
    f.lastMonthSales = sales;
    if (cost > 0) {
      if (this.w.state.gold >= cost) {
        this.w.state.gold -= cost;
        this.recordExpense(cost);
        this.w.events.emit('gold', this.w.state.gold);
      } else {
        f.debt += cost;
        this.w.notify({ key: 'debt', text: `운영비 ${cost.toLocaleString()}G 미납 — 납부 전까지 토지 구매·집 업그레이드·고급 연구가 제한됩니다`, icon: 'ic_coin', tone: 'warn' });
      }
    }
    let topQty: string | null = null;
    let topGold: string | null = null;
    let bq = 0;
    let bg = 0;
    for (const [id, e] of Object.entries(m.sales)) {
      if (e.qty > bq) (bq = e.qty), (topQty = id);
      if (e.gold > bg) (bg = e.gold), (topGold = id);
    }
    const valueEnd = this.farmValue();
    const summary: MonthSummary = {
      year: cal.year,
      monthIndex: cal.monthIndex,
      income: m.income,
      expense: m.expense,
      operatingCost: cost,
      net: m.income - m.expense,
      topQtyItem: topQty,
      topGoldItem: topGold,
      births: m.births,
      landGained: m.landBought,
      farmValueStart: f.monthStartFarmValue,
      farmValueEnd: valueEnd,
    };
    f.months.push(summary);
    if (f.months.length > 36) f.months.shift();
    f.month = emptyLedger();
    f.monthStartFarmValue = valueEnd;
    return summary;
  }

  payDebt(): { ok: boolean; reason?: string } {
    const f = this.w.state.finance;
    if (f.debt <= 0) return { ok: false, reason: '미납 운영비가 없습니다' };
    if (this.w.state.gold < f.debt) return { ok: false, reason: '골드가 부족합니다' };
    this.w.spend(f.debt, '운영비 납부');
    f.debt = 0;
    this.w.notify({ key: 'debt', text: '운영비를 납부했습니다. 모든 제한이 해제됩니다.', icon: 'ic_coin', tone: 'good' });
    return { ok: true };
  }

  /** 다음 운영비 예상 */
  projectedCost(): number {
    return operatingCost(this.salesTotal(this.month()), this.w.state.house.level);
  }
}
