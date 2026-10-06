/** 양식장 — 물고기 넣기/건지기, 먹이, 생산물 수거, 개체 수 확장, 내부 업그레이드 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { FISH_BY_ID, RARITY_NAME } from '../../data/fish';
import { ITEM_BY_ID } from '../../data/items';
import { POND_BALANCE, POND_FISH, POND_TIERS, POND_UPGRADES, roeId, type PondUpgrade } from '../../data/aquaculture';
import { esc } from '../dom';

export class PondPanel extends Panel {
  readonly id = 'pond';
  title = '양식장';
  watch: Watch = ['ponds', 'inventory', 'gold'];
  tabs = [
    { id: 'pond', label: '양식', icon: 'ic_fish' },
    { id: 'upgrade', label: '내부 업그레이드', icon: 'ic_auto' },
  ];

  constructor(private uid: string) {
    super();
  }

  private matChips(mats: { id: string; qty: number }[], gold: number): string {
    const w = this.w;
    const m = mats.map((x) => `<span class="chip ${w.inventory.countAll(x.id) >= x.qty ? 'green' : 'red'}">${iconHtml(ITEM_BY_ID[x.id].icon, 16)}${esc(ITEM_BY_ID[x.id].name)} ${w.inventory.countAll(x.id)}/${x.qty}</span>`);
    if (gold) m.unshift(`<span class="chip ${w.state.gold >= gold ? 'green' : 'red'}">${gold.toLocaleString()}G</span>`);
    return m.join(' ');
  }

  renderBody(): string {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return '';
    const p = w.ponds.ensure(b);
    const cap = w.ponds.capacity(b);
    if (this.tab === 'upgrade') {
      return `<div class="list">${(Object.keys(POND_UPGRADES) as PondUpgrade[])
        .map((k) => {
          const u = POND_UPGRADES[k];
          const lv = b.upgrades![k];
          const cost = w.ponds.upgradeCost(b, k);
          return `<div class="list-row">${iconHtml(u.icon, 36)}<div class="grow" style="min-width:0"><b>${u.name}</b> <span class="chip">Lv.${lv}/${u.cost.length}</span>
            <div class="small">${esc(u.desc[lv])}${cost ? ` <span class="muted">→ ${esc(u.desc[lv + 1])}</span>` : ''}</div>
            ${cost ? `<div class="row wrap tiny" style="gap:3px;margin-top:2px">${this.matChips(cost.mats, cost.gold)}</div>` : ''}</div>
            ${cost ? `<button class="btn small green" data-act="upg" data-arg="${k}">업그레이드</button>` : '<span class="chip green">최대</span>'}</div>`;
        })
        .join('')}</div>
        <div class="tiny muted" style="margin-top:0.5rem">자동화는 양식장 안에서 업그레이드돼요. 농장에 따로 시설을 놓지 않아도 돼요.</div>`;
    }
    const f = p.fishId ? FISH_BY_ID[p.fishId] : null;
    const out = w.state.containers[b.outputId!]?.slots.filter(Boolean) ?? [];
    const head = f
      ? `<div class="card row wrap">${iconHtml(f.spriteKey, 48)}<div class="grow"><b>${esc(f.name)} 양식장</b> <span class="chip">${RARITY_NAME[f.rarity]}</span>
          <div class="row" style="gap:0.4rem"><div class="bar grow" style="max-width:14rem"><i style="width:${(p.count / cap) * 100}%"></i></div><b>${p.count} / ${cap}</b></div>
          <div class="tiny muted">${p.fedToday ? '<span class="good">오늘 먹이를 먹었어요</span>' : '<span class="bad">먹이를 주면 오늘 밤 번식·어란 생산</span>'} · 지금까지 ${p.born}마리 태어남</div></div>
          <button class="btn small green" data-act="feed" ${p.fedToday ? 'disabled' : ''}>${iconHtml('it_fish_feed', 18)}먹이 ×${w.ponds.feedNeed(b)}</button>
          <button class="btn small" data-act="take">한 마리 건지기</button></div>`
      : `<div class="card small">아직 비어 있어요. 낚은 물고기를 넣으면 이 양식장은 그 물고기 전용이 돼요. (전설 물고기는 양식할 수 없어요)</div>`;
    const candidates = (f ? [f] : POND_FISH).filter((x) => w.inventory.countAll(x.id) > 0);
    const stock = p.count < cap && candidates.length
      ? `<div class="section-title">${iconHtml('ic_fish', 18)} 물고기 넣기</div><div class="row wrap">${candidates
          .map((x) => `<button class="btn small" data-act="stock" data-arg="${x.id}">${iconHtml(x.spriteKey, 20)}${esc(x.name)} ×${w.inventory.countAll(x.id)}</button>`)
          .join('')}</div>`
      : '';
    const next = w.ponds.nextTier(b);
    const expand = next
      ? `<div class="card row wrap" style="margin-top:0.5rem"><b class="small">개체 수 확장 ${cap} → ${next.cap}</b><div class="row wrap tiny grow" style="gap:3px">${this.matChips(next.mats, next.gold)}</div>
          <button class="btn small blue" data-act="expand">확장</button></div>`
      : `<div class="card small good" style="margin-top:0.5rem">최대 개체 수 ${POND_TIERS[POND_TIERS.length - 1].cap}마리 달성!</div>`;
    const outHtml = `<div class="card row wrap" style="margin-top:0.5rem"><b class="small">생산물</b>${out.length ? out.map((s) => `${iconHtml(ITEM_BY_ID[s!.itemId].icon, 26)}<b>×${s!.qty}</b>`).join(' ') : '<span class="muted small">없음</span>'}
      <button class="btn small blue right" data-act="collect" ${out.length ? '' : 'disabled'}>수거</button></div>`;
    const info = f
      ? `<div class="tiny muted" style="margin-top:0.4rem">먹이를 준 날 밤: 번식 ${Math.round(POND_BALANCE.breedChance * (1 + 0.5 * b.upgrades!.breedSpeed) * 100)}% · 마리당 ${ITEM_BY_ID[roeId(f.id)].name} ${Math.round(POND_BALANCE.roeChancePerFish * (1 + 0.4 * b.upgrades!.roeYield) * 100)}% · 가끔 수초·조개${f.rarity !== 'common' ? '·진주' : ''}${f.rarity === 'epic' ? '·무지개 비늘' : ''}. 굶겨도 물고기는 죽지 않아요.</div>`
      : '';
    return head + stock + outHtml + expand + info;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    let r: { ok: boolean; reason?: string } = { ok: true };
    if (act === 'stock') r = w.ponds.stock(b, arg);
    else if (act === 'take') r = w.ponds.takeOut(b);
    else if (act === 'feed') r = w.ponds.feed(b);
    else if (act === 'expand') r = w.ponds.expand(b);
    else if (act === 'upg') r = w.ponds.upgrade(b, arg as PondUpgrade);
    else if (act === 'collect') {
      const n = w.ponds.collect(b);
      this.toast(n ? `${n}개 수거했어요` : '가방과 창고가 가득 찼어요', n ? 'good' : 'warn');
    }
    if (!r.ok) this.toast(r.reason ?? '', 'warn');
    this.refresh();
  }
}

