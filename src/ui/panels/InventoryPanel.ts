/** 인벤토리 / 창고 / 냉장창고 — 탭, 검색, 자동정렬, 즐겨찾기, 일괄 이동 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { CATEGORY_NAME, ITEM_BY_ID } from '../../data/items';
import { CROP_BY_ID } from '../../data/crops';
import { RECIPES } from '../../data/recipes';
import { freshnessLabel } from '../../services/EconomyService';
import type { ItemCategory, ItemStack } from '../../types/game';
import { cx, esc, freshClass } from '../dom';
import { confirmDialog, quantityDialog } from '../dialogs';
import { Session } from '../../core/Session';

type Cat = ItemCategory | 'all' | 'fav';

const KIND_INFO: Record<string, string> = {
  bag: '가방',
  chest: '보관상자 · 신선도 보호 없음',
  warehouse: '소형 창고 · 신선도 보호 없음',
  bigWarehouse: '대형 창고 · 신선도 보호 없음',
  fridge: '냉장창고 · 신선도 감소 60% 억제',
  coldStorage: '대형 저온창고 · 신선도 감소 85% 억제',
};

export class InventoryPanel extends Panel {
  readonly id = 'inventory';
  tabs = (['all', 'crop', 'animal', 'fish', 'forage', 'resource', 'processed', 'cooking', 'seed', 'other'] as Cat[]).map((c) => ({ id: c, label: CATEGORY_NAME[c as ItemCategory | 'all'] })).concat([{ id: 'fav', label: '★ 즐겨찾기' }]);
  watch: Watch = ['inventory'];
  private search = '';
  private sel: { cid: string; slot: number } | null = null;
  private left: string;
  private right: string | null;

  constructor(containerId?: string) {
    super();
    if (containerId && containerId !== 'bag') {
      this.left = containerId;
      this.right = 'bag';
    } else {
      this.left = 'bag';
      this.right = null;
    }
  }

  onOpen(): void {
    this.title = this.right ? this.w.inventory.containerName(this.left) : '인벤토리';
  }

  private match(s: ItemStack): boolean {
    const d = ITEM_BY_ID[s.itemId];
    if (!d) return false;
    const cat = this.tab as Cat;
    if (cat === 'fav' && !this.w.state.favorites.includes(s.itemId)) return false;
    if (cat !== 'all' && cat !== 'fav' && d.category !== cat) return false;
    if (this.search && !d.name.includes(this.search)) return false;
    return true;
  }

  private grid(cid: string): string {
    const c = this.w.state.containers[cid];
    if (!c) return '';
    const used = c.slots.filter(Boolean).length;
    const favs = new Set(this.w.state.favorites);
    const cells = c.slots
      .map((s, i) => {
        if (!s) return this.tab === 'all' && !this.search ? `<div class="item-slot empty"></div>` : '';
        if (!this.match(s)) return '';
        const fresh = s.freshness;
        const isSel = this.sel?.cid === cid && this.sel.slot === i;
        return `<button class="${cx('item-slot', isSel && 'sel')}" data-act="sel" data-arg="${cid}|${i}">
          ${fresh !== undefined ? `<span class="fresh"><i class="${freshClass(fresh)}" style="width:${Math.max(4, fresh)}%"></i></span>` : ''}
          ${iconHtml(ITEM_BY_ID[s.itemId].icon, 32)}<span class="qty">${s.qty}</span>${favs.has(s.itemId) ? '<span class="fav">★</span>' : ''}</button>`;
      })
      .join('');
    const name = cid === 'bag' ? '가방' : this.w.inventory.containerName(cid);
    return `<div class="row" style="margin-bottom:0.3rem"><b>${esc(name)}</b><span class="muted small">${used}/${c.slots.length}칸</span>
      <span class="chip ${c.decayMul < 1 ? 'blue' : ''} tiny right">${esc(KIND_INFO[c.kind] ?? '')}</span></div>
      <div class="grid slots">${cells || '<div class="muted small" style="grid-column:1/-1;padding:0.5rem">해당하는 물건이 없어요</div>'}</div>`;
  }

  renderBody(): string {
    const storages = this.w.inventory.storageIds();
    const toolbar = `<div class="row wrap" style="margin-bottom:0.5rem">
      <input class="search grow" placeholder="검색" data-input="search" value="${esc(this.search)}" />
      <button class="btn small" data-act="sort">자동정렬</button>
      ${this.right ? `<button class="btn small" data-act="moveall" data-arg="toLeft">← 일괄 넣기</button><button class="btn small" data-act="moveall" data-arg="toRight">일괄 꺼내기 →</button>` : ''}
      ${!this.right && storages.length ? `<select class="search" data-input="remote"><option value="">창고 열기…</option>${storages.map((id) => `<option value="${id}">${esc(this.w.inventory.containerName(id))}</option>`).join('')}</select>` : ''}
    </div>`;
    if (this.right) return `${toolbar}<div class="split"><div>${this.grid(this.left)}</div><div>${this.grid(this.right)}</div></div>`;
    return `${toolbar}${this.grid(this.left)}${!storages.length ? '<div class="tiny muted" style="margin-top:0.5rem">보관상자나 창고를 지으면 더 많이 보관할 수 있어요. (건설 → 저장)</div>' : ''}`;
  }

  renderFoot(): string {
    if (!this.sel) return `<span class="muted small">물건을 탭하면 정보와 이동/버리기 메뉴가 나타나요.</span>`;
    const s = this.w.state.containers[this.sel.cid]?.slots[this.sel.slot];
    if (!s) return '';
    const d = ITEM_BY_ID[s.itemId];
    const price = this.w.merchant.unitPrice(s.itemId, s.freshness, s.bonus ?? 0);
    const fav = this.w.state.favorites.includes(s.itemId);
    const crop = CROP_BY_ID[s.itemId];
    const uses = RECIPES.filter((r) => r.inputs.some((i) => i.id === s.itemId)).slice(0, 4).map((r) => r.outputName);
    const other = this.sel.cid === this.left ? this.right : this.left;
    return `<div class="row grow" style="min-width:0">${iconHtml(d.icon, 40)}<div class="grow" style="min-width:0">
        <b>${esc(d.name)}</b> <span class="muted small">×${s.qty}</span> ${s.freshness !== undefined ? `<span class="chip ${s.freshness >= 70 ? 'green' : s.freshness >= 50 ? 'gold' : 'red'}">신선도 ${Math.ceil(s.freshness)} · ${freshnessLabel(s.freshness)}</span>` : ''}
        ${crop && crop.season.includes(this.w.cal.season) ? '<span class="chip green">제철 +10%</span>' : ''}
        ${s.bonus && s.bonus > 0.12 ? `<span class="chip gold">숙성 +${Math.round(s.bonus * 100)}%</span>` : ''}
        <div class="small muted ellipsis">${d.sellable ? `예상 판매가 ${price.toLocaleString()}G/개` : esc(d.desc)}${uses.length ? ` · 가공: ${esc(uses.join(', '))}` : ''}</div></div></div>
      <button class="btn small" data-act="fav">${fav ? '★ 해제' : '☆ 즐겨찾기'}</button>
      ${other ? `<button class="btn small blue" data-act="move">${other === 'bag' ? '가방으로' : '넣기'}</button>` : ''}
      ${d.category === 'seed' ? `<button class="btn small green" data-act="useSeed">씨앗 선택</button>` : ''}
      ${this.w.mine.isOpenable(s.itemId) ? `<button class="btn small purple" data-act="openGeode">열기</button>` : ''}
      <button class="btn small red" data-act="discard">버리기</button>`;
  }

  onInput(name: string, value: string): void {
    if (name === 'search') {
      this.search = value.trim();
      this.refresh();
    } else if (name === 'remote' && value) {
      this.left = value;
      this.right = 'bag';
      this.sel = null;
      this.title = this.w.inventory.containerName(value);
      this.refresh(true);
    }
  }

  onTab(): void {
    this.sel = null;
  }

  onAction(act: string, arg: string): void {
    const inv = this.w.inventory;
    if (act === 'sel') {
      const [cid, slot] = arg.split('|');
      const same = this.sel?.cid === cid && this.sel.slot === Number(slot);
      this.sel = same ? null : { cid, slot: Number(slot) };
      this.refresh();
      return;
    }
    if (act === 'sort') {
      inv.sort(this.left);
      if (this.right) inv.sort(this.right);
      this.sel = null;
      return;
    }
    if (act === 'moveall' && this.right) {
      const [from, to] = arg === 'toLeft' ? [this.right, this.left] : [this.left, this.right];
      const n = inv.moveAll(from, to, (s) => this.match(s));
      this.toast(n ? `${n}개 이동했습니다` : '이동할 수 없습니다 (공간 부족?)', n ? 'good' : 'warn');
      this.sel = null;
      return;
    }
    const s = this.sel ? this.w.state.containers[this.sel.cid]?.slots[this.sel.slot] : null;
    if (!s || !this.sel) return;
    if (act === 'fav') inv.toggleFavorite(s.itemId);
    else if (act === 'move') {
      const other = this.sel.cid === this.left ? this.right : this.left;
      if (other && !inv.moveSlot(this.sel.cid, this.sel.slot, other)) this.toast('공간이 부족합니다', 'warn');
      this.sel = null;
    } else if (act === 'openGeode') {
      const r = this.w.mine.open(s.itemId);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
      else this.toast(`${ITEM_BY_ID[s.itemId].name}에서 ${r.drops.map((d) => `${ITEM_BY_ID[d.itemId].name} ×${d.qty}`).join(', ')}이(가) 나왔어요!`, 'good');
      if (!this.w.state.containers[this.sel.cid]?.slots[this.sel.slot]) this.sel = null;
    } else if (act === 'useSeed') {
      this.w.state.hotbar.seedId = s.itemId;
      this.w.state.hotbar.selected = 3;
      Session.app.emit('tool', { index: 3 });
      this.close();
    } else if (act === 'discard') {
      const sel = this.sel;
      const d = ITEM_BY_ID[s.itemId];
      quantityDialog(`${d.name} 버리기`, d.icon, s.qty, 0, '버리기', (q) =>
        confirmDialog('버리기', `${esc(d.name)} ${q}개를 버릴까요?${s.itemId === 'rotten' && !this.w.skills.has('f_compost') ? '' : s.itemId === 'rotten' ? '<br><span class="muted small">퇴비통에 넣으면 퇴비로 재활용할 수 있어요.</span>' : ''}`, '버리기', () => {
          inv.removeAt(sel.cid, sel.slot, q);
          this.sel = null;
          this.refresh();
        }, true),
      );
      return;
    }
    this.refresh();
  }
}
