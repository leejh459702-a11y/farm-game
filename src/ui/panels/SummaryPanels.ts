/** 하루 정산 / 월간 정산 / 재정 통계 / 달력 */
import { Panel } from '../Panel';
import { Panels } from '../PanelManager';
import { iconHtml } from '../../assets/AssetRegistry';
import { ITEM_BY_ID } from '../../data/items';
import { ANIMAL_BY_ID } from '../../data/animals';
import { BALANCE } from '../../data/balance';
import { SEASONS, WEATHER_INFO } from '../../data/seasons';
import type { DaySummary } from '../../core/events';
import type { Ledger, MonthSummary } from '../../types/game';
import { calendar, dateLabel } from '../../systems/SeasonSystem';
import { cx, esc } from '../dom';

const queue: Panel[] = [];

function enqueue(p: Panel): void {
  if (Panels.isOpen('daySummary') || Panels.isOpen('monthSummary')) queue.push(p);
  else Panels.open(p);
}

function next(): void {
  const p = queue.shift();
  if (p) setTimeout(() => Panels.open(p), 50);
}

function itemName(id: string): string {
  if (id.startsWith('animal:')) return `${ANIMAL_BY_ID[id.slice(7)]?.name ?? ''} (동물)`;
  return ITEM_BY_ID[id]?.name ?? id;
}

function itemIcon(id: string): string {
  if (id.startsWith('animal:')) return `portrait_${id.slice(7)}`;
  return ITEM_BY_ID[id]?.icon ?? 'ic_star';
}

function salesList(l: Ledger, limit = 8): string {
  const e = Object.entries(l.sales).sort((a, b) => b[1].gold - a[1].gold);
  if (!e.length) return '<div class="muted small">판매 없음</div>';
  return `<div class="list">${e
    .slice(0, limit)
    .map(([id, s]) => `<div class="list-row" style="min-height:0">${iconHtml(itemIcon(id), 24)}<span class="grow">${esc(itemName(id))} ×${s.qty}</span><b class="gold-text">${s.gold.toLocaleString()}G</b></div>`)
    .join('')}${e.length > limit ? `<div class="tiny muted">외 ${e.length - limit}종</div>` : ''}</div>`;
}

export class DaySummaryPanel extends Panel {
  readonly id = 'daySummary';
  size = 'medium' as const;
  constructor(private s: DaySummary) {
    super();
    this.title = `하루 정산 — ${dateLabel(s.day)}`;
  }
  renderBody(): string {
    const l = this.s.ledger;
    const net = l.income - l.expense;
    return `<div class="grid cols-3" style="margin-bottom:0.5rem">
        <div class="card center">${iconHtml('ic_coin', 28)}<div class="small muted">오늘 수익</div><b class="good">+${l.income.toLocaleString()}G</b></div>
        <div class="card center">${iconHtml('ic_bag', 28)}<div class="small muted">오늘 지출</div><b class="bad">-${l.expense.toLocaleString()}G</b></div>
        <div class="card center">${iconHtml('ic_chart', 28)}<div class="small muted">순이익</div><b class="${net >= 0 ? 'good' : 'bad'}">${net >= 0 ? '+' : ''}${net.toLocaleString()}G</b></div></div>
      <div class="split" style="height:auto">
        <div><div class="section-title">판매 품목</div>${salesList(l)}</div>
        <div><div class="kv card">
          <span>작물 성장</span><span>${this.s.crops.grew}개 성장${this.s.crops.dry ? ` · <b class="bad">물 부족 ${this.s.crops.dry}개 정지</b>` : ''}</span>
          <span>농사 경험치</span><b>+${l.farmingXp}</b>
          <span>목축 경험치</span><b>+${l.livestockXp}</b>
          <span>신규 발견</span><span>${l.discoveries.length ? esc(l.discoveries.join(', ')) : '-'}</span>
          <span>출산</span><span>${l.births ? `${l.births}마리` : '-'}</span>
          <span>시설 완공</span><span>${l.builds.length ? esc(l.builds.join(', ')) : '-'}</span>
          <span>토지 구매</span><span>${l.landBought ? `${l.landBought}칸` : '-'}</span>
          <span>보유금</span><b class="gold-text">${this.s.goldEnd.toLocaleString()}G</b></div></div></div>`;
  }
  renderFoot(): string {
    const w = this.w;
    const wi = WEATHER_INFO[w.state.weather.today];
    return `<span class="small grow">${iconHtml(wi.icon, 22)} 오늘(${esc(dateLabel(w.state.time.day))}) 날씨: <b>${wi.name}</b>${wi.waters ? ' — 야외 농지에 자동으로 물이 공급돼요' : ''}</span><button class="btn green" data-act="ok">좋은 아침!</button>`;
  }
  onAction(): void {
    this.close();
  }
  onClose(): void {
    next();
  }
}

export class MonthSummaryPanel extends Panel {
  readonly id = 'monthSummary';
  size = 'medium' as const;
  constructor(private m: MonthSummary) {
    super();
    const s = SEASONS[Math.floor(m.monthIndex / 3)];
    this.title = `월간 정산 — ${m.year}년차 ${s.months[m.monthIndex % 3]}월`;
  }
  renderBody(): string {
    const m = this.m;
    const w = this.w;
    const dv = m.farmValueEnd - m.farmValueStart;
    return `<div class="grid cols-3" style="margin-bottom:0.5rem">
        <div class="card center"><div class="small muted">총 매출</div><b class="good">+${m.income.toLocaleString()}G</b></div>
        <div class="card center"><div class="small muted">총 지출</div><b class="bad">-${m.expense.toLocaleString()}G</b></div>
        <div class="card center"><div class="small muted">순이익</div><b class="${m.net >= 0 ? 'good' : 'bad'}">${m.net.toLocaleString()}G</b></div></div>
      <div class="kv card">
        <span>운영비 (${Math.round(BALANCE.house.operatingCostRate[w.state.house.level - 1] * 100)}%)</span><span>${m.operatingCost.toLocaleString()}G ${w.finance.hasDebt() ? '<span class="chip red">미납 — 집에서 납부</span>' : '<span class="chip green">납부 완료</span>'}</span>
        <span>가장 많이 판매</span><span>${m.topQtyItem ? `${iconHtml(itemIcon(m.topQtyItem), 20)} ${esc(itemName(m.topQtyItem))}` : '-'}</span>
        <span>최고 수익 품목</span><span>${m.topGoldItem ? `${iconHtml(itemIcon(m.topGoldItem), 20)} ${esc(itemName(m.topGoldItem))}` : '-'}</span>
        <span>출산 수</span><span>${m.births}마리</span>
        <span>토지 증가량</span><span>+${m.landGained}칸 (현재 ${w.grid.ownedCount()}칸)</span>
        <span>농장 가치</span><span>${m.farmValueStart.toLocaleString()} → <b>${m.farmValueEnd.toLocaleString()}G</b> <span class="${dv >= 0 ? 'good' : 'bad'}">(${dv >= 0 ? '+' : ''}${dv.toLocaleString()})</span></span>
      </div>`;
  }
  renderFoot(): string {
    return `<button class="btn green block" data-act="ok">확인</button>`;
  }
  onAction(): void {
    this.close();
  }
  onClose(): void {
    next();
  }
}

export function showDaySummary(s: DaySummary): void {
  enqueue(new DaySummaryPanel(s));
}

export function showMonthSummary(m: MonthSummary): void {
  enqueue(new MonthSummaryPanel(m));
}

/** 재정 통계 */
export class FinancePanel extends Panel {
  readonly id = 'finance';
  title = '재정 통계';
  tabs = [
    { id: 'month', label: '이번 달', icon: 'ic_coin' },
    { id: 'daily', label: '최근 30일', icon: 'ic_chart' },
    { id: 'history', label: '월별 기록', icon: 'ic_codex' },
  ];
  renderBody(): string {
    const w = this.w;
    const f = w.state.finance;
    if (this.tab === 'daily') {
      const d = f.dailyIncome;
      const max = Math.max(1, ...d);
      return `<div class="chart">${d.map((v) => `<div style="height:${(v / max) * 100}%" title="${v}G"></div>`).join('') || '<span class="muted small">기록 없음</span>'}</div>
        <div class="row tiny muted"><span>30일 전</span><span class="right">어제</span></div>
        <div class="kv card" style="margin-top:0.5rem"><span>최근 30일 판매</span><b>${d.reduce((a, b) => a + b, 0).toLocaleString()}G</b><span>일 평균</span><b>${Math.round(d.reduce((a, b) => a + b, 0) / Math.max(1, d.length)).toLocaleString()}G</b><span>최고</span><b>${max.toLocaleString()}G</b></div>`;
    }
    if (this.tab === 'history') {
      if (!f.months.length) return `<div class="empty-msg">첫 월말 정산 후 기록이 쌓여요.</div>`;
      const max = Math.max(1, ...f.months.map((m) => Math.abs(m.net)));
      return `<div class="chart">${f.months.map((m) => `<div class="${cx(m.net < 0 && 'neg')}" style="height:${(Math.abs(m.net) / max) * 100}%"></div>`).join('')}</div>
        <div class="list" style="margin-top:0.5rem">${[...f.months]
          .reverse()
          .map((m) => {
            const s = SEASONS[Math.floor(m.monthIndex / 3)];
            return `<div class="list-row"><b>${m.year}년차 ${s.months[m.monthIndex % 3]}월</b><span class="grow tiny muted">매출 ${m.income.toLocaleString()} · 지출 ${m.expense.toLocaleString()} · 운영비 ${m.operatingCost.toLocaleString()}</span><b class="${m.net >= 0 ? 'good' : 'bad'}">${m.net.toLocaleString()}G</b></div>`;
          })
          .join('')}</div>`;
    }
    const m = f.month;
    const sales = w.finance.salesTotal(m);
    return `<div class="grid cols-3" style="margin-bottom:0.5rem">
        <div class="card center"><div class="small muted">이번 달 수입</div><b class="good">${m.income.toLocaleString()}G</b></div>
        <div class="card center"><div class="small muted">이번 달 지출</div><b class="bad">${m.expense.toLocaleString()}G</b></div>
        <div class="card center"><div class="small muted">예상 운영비</div><b>${w.finance.projectedCost().toLocaleString()}G</b></div></div>
      <div class="kv card" style="margin-bottom:0.5rem"><span>판매 매출</span><b>${sales.toLocaleString()}G</b><span>지난달 판매</span><span>${f.lastMonthSales.toLocaleString()}G</span><span>누적 수익</span><span>${f.totalEarned.toLocaleString()}G</span><span>미납 운영비</span><span class="${f.debt ? 'bad' : ''}">${f.debt.toLocaleString()}G</span><span>농장 가치</span><b class="gold-text">${w.finance.farmValue().toLocaleString()}G</b></div>
      <div class="section-title">이번 달 판매 품목</div>${salesList(m, 12)}`;
  }
}

/** 달력 / 날씨 */
export class CalendarPanel extends Panel {
  readonly id = 'calendar';
  size = 'medium' as const;
  title = '달력';
  renderBody(): string {
    const w = this.w;
    const c = calendar(w.state.time.day);
    const s = SEASONS[c.seasonIndex];
    const start = w.state.time.day - (c.dayOfMonth - 1);
    const cells = [];
    for (let i = 0; i < BALANCE.time.daysPerMonth; i++) {
      const day = start + i;
      const cc = calendar(day);
      const today = day === w.state.time.day;
      const tomorrow = day === w.state.time.day + 1;
      const wIcon = today ? WEATHER_INFO[w.state.weather.today].icon : tomorrow ? WEATHER_INFO[w.state.weather.tomorrow].icon : '';
      const merchant = day === w.state.merchant.nextVisitDay || (today && w.state.merchant.present);
      cells.push(`<div class="${cx('card center', today && 'sel')}" style="padding:0.3rem"><b>${cc.dayOfMonth}</b><span class="tiny muted">(${cc.weekday})</span><div>${wIcon ? iconHtml(wIcon, 20) : ''}${merchant ? iconHtml('ic_merchant', 20) : ''}</div></div>`);
    }
    return `<div class="row" style="margin-bottom:0.5rem">${iconHtml(`ic_${c.season}`, 32)}<b>${c.year}년차 ${s.name} ${c.month}월</b><span class="muted small">(1달=10일 · 1계절=30일 · 1년=120일)</span></div>
      <div class="grid" style="grid-template-columns:repeat(5,minmax(0,1fr))">${cells.join('')}</div>
      <div class="kv card" style="margin-top:0.5rem"><span>오늘 날씨</span><span>${WEATHER_INFO[w.state.weather.today].name}</span><span>내일 예보</span><span>${WEATHER_INFO[w.state.weather.tomorrow].name}</span>
      <span>낮 길이</span><span>${s.name}: 낮 ${BALANCE.time.dayLengthSec[c.season] / 60}분 · 밤 ${(BALANCE.time.secondsPerDay - BALANCE.time.dayLengthSec[c.season]) / 60}분</span>
      <span>다음 상인</span><span>${w.state.merchant.present ? '오늘 방문 중!' : w.state.merchant.nextVisitDay < 9999 ? `${w.state.merchant.nextVisitDay - w.state.time.day}일 후 예정` : '-'}</span></div>`;
  }
}
