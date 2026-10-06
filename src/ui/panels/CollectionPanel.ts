/** 연구 컬렉션 + 읽은 스킬북 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { COLLECTIONS } from '../../data/collections';
import { BOOKS } from '../../data/books';
import { ITEM_BY_ID, inputIcon } from '../../data/items';
import { cx, esc } from '../dom';

export class CollectionPanel extends Panel {
  readonly id = 'collections';
  title = '연구 컬렉션';
  watch: Watch = ['collections', 'inventory'];
  tabs = [
    { id: 'coll', label: '연구 컬렉션', icon: 'ic_research' },
    { id: 'books', label: '스킬북', icon: 'it_book_farmer' },
  ];

  renderBody(): string {
    const w = this.w;
    const c = w.collections;
    if (this.tab === 'books') {
      return `<div class="small muted" style="margin-bottom:0.5rem">스킬북은 한 번 읽으면 영구 효과가 생겨요. 특급상인·지오드·낚시 보물·연구 컬렉션에서 얻을 수 있어요.</div>
        <div class="list">${BOOKS.map((b) => {
          const read = c.hasBook(b.id);
          const have = w.inventory.countAll(b.id);
          return `<div class="${cx('list-row', !read && 'locked')}">${iconHtml(`it_${b.id}`, 36)}<div class="grow"><b>${esc(b.name)}</b><div class="small">${esc(b.desc)}</div></div>
            ${read ? '<span class="chip green">읽음 · 적용 중</span>' : have ? `<button class="btn small purple" data-act="read" data-arg="${b.id}">읽기</button>` : '<span class="chip">미획득</span>'}</div>`;
        }).join('')}</div>`;
    }
    return `<div class="small muted" style="margin-bottom:0.5rem">필요한 물건을 모아 제출하면 보상을 받아요. 조금씩 나눠서 제출해도 돼요.</div>
      <div class="list">${COLLECTIONS.map((col) => {
        const done = c.isDone(col.id);
        const items = col.items
          .map((it) => {
            const sub = c.submitted(col, it.id);
            const have = it.id.startsWith('#') ? w.inventory.countMatching(it.id) : w.inventory.countAll(it.id);
            const icon = it.id.startsWith('#') ? inputIcon(it.id) : ITEM_BY_ID[it.id]?.icon ?? 'ic_star';
            return `<span class="chip ${sub >= it.qty ? 'green' : have > 0 ? 'gold' : ''}" title="보유 ${have}">${iconHtml(icon, 16)}${esc(c.itemName(it.id))} ${Math.min(sub, it.qty)}/${it.qty}</span>`;
          })
          .join(' ');
        const canSubmit = !done && col.items.some((it) => c.submitted(col, it.id) < it.qty && (it.id.startsWith('#') ? w.inventory.countMatching(it.id) : w.inventory.countAll(it.id)) > 0);
        return `<div class="${cx('list-row', done && 'locked')}">${iconHtml(col.icon, 36)}<div class="grow" style="min-width:0"><b>${esc(col.name)}</b> <span class="tiny muted">보상: ${esc(col.rewardText)}</span>
          <div class="row wrap" style="gap:3px;margin-top:2px">${items}</div></div>
          ${done ? '<span class="chip green">완료</span>' : `<button class="btn small green" data-act="submit" data-arg="${col.id}" ${canSubmit ? '' : 'disabled'}>제출</button>`}</div>`;
      }).join('')}</div>`;
  }

  onAction(act: string, arg: string): void {
    const c = this.w.collections;
    if (act === 'submit') {
      const r = c.submit(arg);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
      else this.toast(c.isDone(arg) ? '컬렉션 완성!' : `${r.n}개 제출했어요`, 'good');
    } else if (act === 'read') {
      const r = c.read(arg);
      this.toast(r.ok ? '영구 효과가 적용됐어요!' : r.reason ?? '', r.ok ? 'good' : 'warn');
    }
    this.refresh();
  }
}
