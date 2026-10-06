/** 정령의 사당 — 불러내기 · 먹이 · 조합(변종) · 생산물 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { FUSE_MIN_BOND, SHRINE_CAPACITY, SPIRITS, SPIRIT_BY_ID } from '../../data/spirits';
import { ITEM_BY_ID } from '../../data/items';
import { cx, esc } from '../dom';

export class ShrinePanel extends Panel {
  readonly id = 'shrine';
  title = '정령의 사당';
  watch: Watch = ['spirits', 'inventory'];
  tabs = [
    { id: 'spirits', label: '정령', icon: 'spirit_forest_spirit' },
    { id: 'summon', label: '불러내기', icon: 'ic_star' },
  ];
  private pickA: string | null = null;

  constructor(private uid: string) {
    super();
  }

  renderBody(): string {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return '';
    const sh = w.spirits.ensure(b);
    if (this.tab === 'summon') {
      return `<div class="small muted" style="margin-bottom:0.5rem">재료를 바치면 정령이 사당에 깃들어요 (최대 ${SHRINE_CAPACITY}마리). 변종은 두 정령을 조합해서만 만날 수 있어요.</div>
        <div class="list">${SPIRITS.filter((s) => s.summon)
          .map((s) => {
            const mats = s.summon!.map((m) => `<span class="chip ${w.inventory.countAll(m.id) >= m.qty ? 'green' : 'red'}">${iconHtml(ITEM_BY_ID[m.id].icon, 16)}${esc(ITEM_BY_ID[m.id].name)} ${w.inventory.countAll(m.id)}/${m.qty}</span>`).join(' ');
            return `<div class="list-row">${iconHtml(`spirit_${s.id}`, 40)}<div class="grow" style="min-width:0"><b>${esc(s.name)}</b> <span class="small muted">${esc(s.desc)}</span>
              <div class="tiny">좋아하는 먹이: ${s.foods.map((f) => esc(ITEM_BY_ID[f]?.name ?? f)).join(', ')} · ${s.interval}일마다 ${esc(ITEM_BY_ID[s.product].name)}</div>
              <div class="row wrap tiny" style="gap:3px">${mats}</div></div>
              <button class="btn small purple" data-act="summon" data-arg="${s.id}" ${w.inventory.hasMats(s.summon) && sh.spirits.length < SHRINE_CAPACITY ? '' : 'disabled'}>불러내기</button></div>`;
          })
          .join('')}</div>`;
    }
    const out = w.state.containers[b.outputId!]?.slots.filter(Boolean) ?? [];
    const rows = sh.spirits
      .map((s) => {
        const d = SPIRIT_BY_ID[s.kind];
        const sel = this.pickA === s.id;
        return `<button class="${cx('list-row click', sel && 'sel')}" data-act="pick" data-arg="${s.id}" style="text-align:left">${iconHtml(`spirit_${s.kind}`, 40)}
          <div class="grow" style="min-width:0"><b>${esc(s.name)}</b> ${d.parents ? '<span class="chip gold">변종</span>' : ''}
          <div class="row" style="gap:0.3rem">${iconHtml('ic_heart', 14)}<span class="bar" style="width:5rem;display:inline-block"><i style="width:${s.bond}%;background:linear-gradient(#d8c8ff,#8a6ab8)"></i></span><span class="tiny">유대감 ${s.bond}</span></div>
          <div class="tiny muted">${s.fedToday ? '<span class="good">오늘 먹이를 먹었어요</span>' : `먹이: ${d.foods.map((f) => esc(ITEM_BY_ID[f]?.name ?? f)).join('/')}`} · ${s.timer}일 뒤 ${esc(ITEM_BY_ID[d.product].name)}</div></div></button>`;
      })
      .join('');
    const fusing = sh.fusing ? `<div class="card small good" style="margin-top:0.4rem">${iconHtml(`spirit_${sh.fusing.kind}`, 24)} ${esc(SPIRIT_BY_ID[sh.fusing.kind].name)}이(가) ${sh.fusing.daysLeft}일 뒤 태어나요</div>` : '';
    return `<div class="row wrap" style="margin-bottom:0.4rem"><b class="small">${sh.spirits.length}/${SHRINE_CAPACITY}마리</b>
        <button class="btn small green" data-act="feed" ${sh.spirits.length ? '' : 'disabled'}>모두 먹이 주기</button>
        <span class="tiny muted grow">정령 둘을 차례로 탭하면 조합(변종)을 시도해요 (유대감 ${FUSE_MIN_BOND} 이상)</span></div>
      <div class="list">${rows || '<div class="empty-msg">아직 정령이 없어요. [불러내기]에서 재료를 바쳐 보세요.</div>'}</div>${fusing}
      <div class="card row wrap" style="margin-top:0.5rem"><b class="small">생산물</b>${out.length ? out.map((s) => `${iconHtml(ITEM_BY_ID[s!.itemId].icon, 26)}<b>×${s!.qty}</b>`).join(' ') : '<span class="muted small">없음</span>'}
        <button class="btn small blue right" data-act="collect" ${out.length ? '' : 'disabled'}>수거</button></div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (act === 'summon') {
      const r = w.spirits.summon(b, arg);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'feed') {
      const r = w.spirits.feedAll(b);
      this.toast(r.hungry ? `${r.fed}마리 먹이 · ${r.hungry}마리는 좋아하는 먹이가 없어요` : `${r.fed}마리에게 먹이를 줬어요`, r.hungry ? 'warn' : 'good');
    } else if (act === 'collect') {
      const n = w.spirits.collect(b);
      if (n) this.toast(`${n}개 수거했어요`, 'good');
    } else if (act === 'pick') {
      if (!this.pickA) this.pickA = arg;
      else if (this.pickA === arg) this.pickA = null;
      else {
        const r = w.spirits.fuse(b, this.pickA, arg);
        this.toast(r.ok ? '조합을 시작했어요!' : r.reason ?? '', r.ok ? 'good' : 'warn');
        this.pickA = null;
      }
    }
    this.refresh();
  }
}
