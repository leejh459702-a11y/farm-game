/** 농장일지 — 강제 퀘스트가 아닌 "다음에 해 볼 만한 것" 안내와 소소한 보상 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { JOURNAL, JOURNAL_CHAPTERS } from '../../data/journal';
import { cx, esc } from '../dom';

export class JournalPanel extends Panel {
  readonly id = 'journal';
  title = '농장일지';
  watch: Watch = ['journal', 'inventory', 'counter', 'buildings', 'animals'];

  renderBody(): string {
    const w = this.w;
    const j = w.journal;
    const sug = j.suggestions(3);
    const top = sug.length
      ? `<div class="card" style="margin-bottom:0.5rem"><b class="small">${iconHtml('ic_star', 16)} 다음에 해 볼 만한 것</b><div class="row wrap" style="margin-top:0.3rem">${sug
          .map((e) => `<span class="chip">${iconHtml(e.icon, 16)}${esc(e.hint)}</span>`)
          .join('')}</div><div class="tiny muted" style="margin-top:0.3rem">꼭 하지 않아도 괜찮아요. 오늘은 하고 싶은 걸 하며 놀아요.</div></div>`
      : '';
    const chapters = JOURNAL_CHAPTERS.map((ch) => {
      const rows = JOURNAL.filter((e) => e.chapter === ch)
        .map((e) => {
          const p = j.progress(e);
          return `<div class="${cx('list-row', p.claimed && 'locked')}">${iconHtml(e.icon, 36)}<div class="grow" style="min-width:0">
            <b>${esc(e.title)}</b> <span class="small muted">${esc(e.hint)}</span>
            <div class="row" style="gap:0.4rem"><div class="bar grow" style="max-width:12rem"><i style="width:${(p.cur / e.need) * 100}%"></i></div><span class="tiny">${p.cur}/${e.need}</span></div>
            <div class="tiny muted">보상: ${esc(j.rewardText(e))}</div></div>
            ${p.claimed ? '<span class="chip green">완료</span>' : p.done ? `<button class="btn small green" data-act="claim" data-arg="${e.id}">보상 받기</button>` : ''}</div>`;
        })
        .join('');
      return `<div class="section-title">${esc(ch)}</div><div class="list">${rows}</div>`;
    }).join('');
    return top + chapters;
  }

  onAction(act: string, arg: string): void {
    if (act === 'claim') {
      const r = this.w.journal.claim(arg);
      this.toast(r.ok ? '보상을 받았어요!' : r.reason ?? '', r.ok ? 'good' : 'warn');
    }
    this.refresh();
  }
}
