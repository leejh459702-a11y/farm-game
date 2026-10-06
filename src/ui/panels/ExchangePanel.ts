/** 농업 교환권 — 모은 교환권으로 원하는 보상을 고른다 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { EXCHANGE, TICKET_SOURCES } from '../../data/exchange';
import { cx, esc } from '../dom';
import { confirmDialog } from '../dialogs';

export class ExchangePanel extends Panel {
  readonly id = 'exchange';
  title = '농업 교환권';
  watch: Watch = ['tickets', 'animals'];

  renderBody(): string {
    const t = this.w.tickets;
    return `<div class="card row wrap" style="margin-bottom:0.5rem">${iconHtml('ic_ticket', 32)}<b style="font-size:1.2rem">${t.have}장</b>
        <div class="tiny muted grow">얻는 법: ${TICKET_SOURCES.map(esc).join(' · ')}</div></div>
      <div class="list">${EXCHANGE.map(
        (o) => `<div class="${cx('list-row', t.have < o.cost && 'locked')}" style="align-items:flex-start">${iconHtml(o.icon, 36)}<div class="grow" style="min-width:0">
          <b>${esc(o.name)}</b> <span class="chip ${t.have >= o.cost ? 'gold' : ''}">${iconHtml('ic_ticket', 14)}${o.cost}장</span> <span class="small muted">${esc(o.desc)}</span>
          <div class="row wrap" style="gap:4px;margin-top:4px">${o.choices
            .map((c) => `<button class="btn small" data-act="ex" data-arg="${o.id}|${c.id}" ${t.have >= o.cost ? '' : 'disabled'}>${iconHtml(c.icon, 18)}${esc(t.label(o.id, c.id))}</button>`)
            .join('')}</div></div></div>`,
      ).join('')}</div>`;
  }

  onAction(act: string, arg: string): void {
    if (act !== 'ex') return;
    const [oid, choice] = arg.split('|');
    const o = EXCHANGE.find((x) => x.id === oid)!;
    confirmDialog('교환', `교환권 ${o.cost}장으로 <b>${esc(this.w.tickets.label(oid, choice))}</b>을(를) 받을까요?`, '교환', () => {
      const r = this.w.tickets.exchange(oid, choice);
      this.toast(r.ok ? '교환했어요!' : r.reason ?? '', r.ok ? 'good' : 'warn');
      this.refresh();
    });
  }
}
