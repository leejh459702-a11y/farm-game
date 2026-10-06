/** 숙성고 — 선반에 넣고, 날짜가 지날수록 가치가 오른다. 언제 꺼낼지는 플레이어 선택 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { ITEM_BY_ID } from '../../data/items';
import { AGEABLE, AGING_CURVES, CELLAR_UPGRADES, type CellarUpgrade } from '../../data/aging';
import { esc } from '../dom';

export class CellarPanel extends Panel {
  readonly id = 'cellar';
  title = '숙성고';
  watch: Watch = ['inventory', 'gold', 'buildings', 'dayStarted'];
  tabs = [
    { id: 'shelf', label: '숙성 선반', icon: 'it_cheese' },
    { id: 'upgrade', label: '내부 업그레이드', icon: 'ic_auto' },
  ];

  constructor(private uid: string) {
    super();
  }

  private price(itemId: string, bonus: number): number {
    return this.w.merchant.unitPrice(itemId, undefined, bonus);
  }

  renderBody(): string {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return '';
    const c = w.aging.ensure(b);
    if (this.tab === 'upgrade') {
      return `<div class="list">${(Object.keys(CELLAR_UPGRADES) as CellarUpgrade[])
        .map((k) => {
          const u = CELLAR_UPGRADES[k];
          const lv = b.upgrades![k];
          const cost = w.aging.upgradeCost(b, k);
          const mats = cost ? cost.mats.map((m) => `<span class="chip ${w.inventory.countAll(m.id) >= m.qty ? 'green' : 'red'}">${esc(ITEM_BY_ID[m.id].name)} ${w.inventory.countAll(m.id)}/${m.qty}</span>`).join(' ') : '';
          return `<div class="list-row">${iconHtml(k === 'capacity' ? 'ic_storage' : 'ic_clock', 36)}<div class="grow"><b>${u.name}</b> <span class="chip">Lv.${lv}/${u.cost.length}</span>
            <div class="small">${esc(u.desc[lv])}${cost ? ` <span class="muted">→ ${esc(u.desc[lv + 1])}</span>` : ''}</div>
            ${cost ? `<div class="row wrap tiny" style="gap:3px"><span class="chip ${w.state.gold >= cost.gold ? 'green' : 'red'}">${cost.gold.toLocaleString()}G</span> ${mats}</div>` : ''}</div>
            ${cost ? `<button class="btn small green" data-act="upg" data-arg="${k}">업그레이드</button>` : '<span class="chip green">최대</span>'}</div>`;
        })
        .join('')}</div>`;
    }
    const shelves = c.slots
      .map((s, i) => {
        if (!s) return `<div class="card center muted small" style="min-height:5.6rem;display:flex;align-items:center;justify-content:center">빈 선반</div>`;
        const d = ITEM_BY_ID[s.itemId];
        const days = w.aging.daysAged(s);
        const bonus = w.aging.bonusOf(s);
        const next = w.aging.next(s);
        const now = this.price(s.itemId, bonus);
        return `<div class="card col" style="gap:2px"><div class="row">${iconHtml(d.icon, 32)}<b class="small grow">${esc(d.name)} ×${s.qty}</b></div>
          <div class="tiny">${days}일 숙성 · <b class="good">+${Math.round(bonus * 100)}%</b> · 지금 ${now.toLocaleString()}G/개</div>
          <div class="tiny muted">${next ? `${next.days}일 더 → +${Math.round(next.bonus * 100)}% (${this.price(s.itemId, next.bonus).toLocaleString()}G)` : '최고 숙성 단계'}</div>
          <button class="btn small blue" data-act="take" data-arg="${i}">꺼내기</button></div>`;
      })
      .join('');
    const ageable = Object.keys(AGEABLE).filter((id) => w.inventory.countAll(id) > 0);
    const free = c.slots.some((s) => !s);
    const put = ageable.length
      ? `<div class="section-title">${iconHtml('it_cheese', 18)} 숙성 선반에 넣기</div><div class="row wrap">${ageable
          .map((id) => `<button class="btn small" data-act="put" data-arg="${id}" ${free ? '' : 'disabled'}>${iconHtml(ITEM_BY_ID[id].icon, 20)}${esc(ITEM_BY_ID[id].name)} ×${w.inventory.countAll(id)}</button>`)
          .join('')}</div>`
      : `<div class="small muted" style="margin-top:0.4rem">숙성할 수 있는 물건이 없어요. 치즈·와인·김치·햄·육포·캐비아·훈제 생선 등을 만들어 보세요.</div>`;
    const curve = (id: 'cheese' | 'wine' | 'general', name: string) => `<span class="chip">${name}: ${AGING_CURVES[id].map(([d, v]) => `${d}일 +${Math.round(v * 100)}%`).join(' → ')}</span>`;
    return `<div class="tiny muted" style="margin-bottom:0.4rem">숙성고 안에서는 신선도가 떨어지지 않아요. 지금 꺼내 팔지, 더 기다렸다 비싸게 팔지 골라 보세요.</div>
      <div class="grid cols-3">${shelves}</div>${put}
      <div class="row wrap tiny" style="gap:3px;margin-top:0.5rem">${curve('cheese', '치즈')}${curve('wine', '와인·과일주')}${curve('general', '김치·햄 등')}</div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    let r: { ok: boolean; reason?: string } = { ok: true };
    if (act === 'put') r = w.aging.put(b, arg);
    else if (act === 'take') r = w.aging.take(b, Number(arg));
    else if (act === 'upg') r = w.aging.upgrade(b, arg as CellarUpgrade);
    if (!r.ok) this.toast(r.reason ?? '', 'warn');
    this.refresh();
  }
}
