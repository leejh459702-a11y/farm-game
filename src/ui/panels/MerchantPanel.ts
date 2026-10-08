/** 방문상인 / 특급상인 — 구매·판매·특급 상품 */
import { Panel, type Watch } from '../Panel';
import { popDomFx } from '../DomFx';
import { iconHtml } from '../../assets/AssetRegistry';
import { ITEM_BY_ID } from '../../data/items';
import { ANIMAL_BY_ID, TRAIT_BY_ID } from '../../data/animals';
import { BUILDING_BY_ID } from '../../data/buildings';
import { CROP_BY_ID } from '../../data/crops';
import { MERCHANT_KINDS, MERCHANT_LINES } from '../../data/economy';
import { freshnessLabel } from '../../services/EconomyService';
import type { ItemStack, ShopEntry } from '../../types/game';
import { cx, esc } from '../dom';
import { confirmDialog, quantityDialog } from '../dialogs';
import { Art } from '../../assets/AssetRegistry';

export class MerchantPanel extends Panel {
  readonly id = 'merchant';
  watch: Watch = ['inventory', 'gold', 'animals', 'merchant'];
  private includeStorage = true;
  private line: string;

  constructor() {
    super();
    const sp = this.w.state.merchant.special;
    this.title = this.w.merchant.kindName();
    this.tabs = [
      { id: 'buy', label: '구매', icon: 'ic_coin' },
      { id: 'sell', label: '판매', icon: 'ic_bag' },
      ...(sp ? [{ id: 'special', label: '특급 상품', icon: 'ic_star', special: true }] : []),
    ];
    const lines = sp ? MERCHANT_LINES.special : MERCHANT_LINES.normal;
    const kind = this.w.state.merchant.kind;
    this.line = kind && kind !== 'general' && kind !== 'special' ? MERCHANT_KINDS[kind].line : lines[Math.floor(Math.random() * lines.length)];
    if (this.w.tutorial.active && this.w.tutorial.step === 10) this.tab = 'sell';
  }

  onOpen(): void {
    if (this.w.tutorial.active && this.w.tutorial.step >= 10) this.tab = 'sell';
  }

  private header(): string {
    const m = this.w.state.merchant;
    const portrait = m.special ? 'merchant_special' : 'merchant';
    const url = Art.url(portrait);
    return `<div class="row" style="align-items:flex-end;margin-bottom:0.5rem">
      <img class="px" src="${url}" width="48" height="64" alt="">
      <div class="speech grow"><div>${esc(this.line)}</div>
      ${m.special ? `<div class="row wrap" style="margin-top:0.3rem"><span class="chip purple">매입가 +${Math.round(m.sellBonus * 100)}%</span><span class="chip gold">전 상품 ${Math.round(m.discount * 100)}% 할인</span></div>` : ''}</div></div>`;
  }

  renderBody(): string {
    if (!this.w.state.merchant.present) return `<div class="empty-msg">상인이 떠났습니다. 2~3일 뒤 다시 찾아와요.</div>`;
    if (this.tab === 'sell') return this.header() + this.sellTab();
    return this.header() + this.buyTab(this.tab === 'special');
  }

  renderFoot(): string {
    return `<span class="muted small">오늘 하루 동안 거래할 수 있어요 · 보유금 <b class="gold-text">${this.w.state.gold.toLocaleString()}G</b></span>`;
  }

  private entryCard(e: ShopEntry, i: number): string {
    const w = this.w;
    let icon = '';
    let name = '';
    let sub = '';
    let lock = '';
    if (e.kind === 'item') {
      const d = ITEM_BY_ID[e.id];
      icon = d.icon;
      name = d.name;
      sub = esc(d.desc);
      if (d.cropId) {
        const c = CROP_BY_ID[d.cropId];
        const lr = w.crops.lockReason(c);
        if (lr) lock = lr;
        sub = `${c.season.map((s) => ({ spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' })[s]).join('·')} · ${c.growDays}일 · 판매 ${c.baseSellPrice}G`;
      }
    } else if (e.kind === 'deco') {
      const d = BUILDING_BY_ID[e.id];
      icon = d.spriteKey;
      name = `장식 - ${d.name}`;
      sub = `${d.w}×${d.h} · 아름다움 +${d.beauty}`;
    } else {
      const a = ANIMAL_BY_ID[e.id];
      icon = `portrait_${a.id}`;
      name = `${a.name} (${e.animal!.gender === 'F' ? '암컷' : '수컷'})`;
      sub = `${e.animal!.grade}등급${e.animal!.traits.length ? ' · ' + e.animal!.traits.map((t) => TRAIT_BY_ID[t].name).join(', ') : ''}`;
      if (!w.skills.has(a.unlockSkill) && !e.special) lock = '연구 필요';
      if (!w.animals.findHome(a.id)) lock = lock || '수용 가능한 축사 없음';
    }
    const soldOut = e.stock <= 0;
    return `<div class="${cx('card row', e.special && 'special', (soldOut || lock) && 'locked')}" style="align-items:center">${iconHtml(icon, 40)}
      <div class="grow" style="min-width:0"><b class="ellipsis" style="display:block">${esc(name)}</b><div class="tiny muted ellipsis">${sub}</div>
      <div class="row" style="gap:0.4rem;white-space:nowrap"><b class="gold-text">${e.price.toLocaleString()}G</b><span class="tiny muted">재고 ${e.stock}</span></div>
      ${lock ? `<span class="chip red tiny">${esc(lock)}</span>` : ''}</div>
      <button class="btn small green" data-act="buy" data-arg="${i}" ${soldOut || this.w.state.gold < e.price ? 'disabled' : ''}>${soldOut ? '품절' : '구매'}</button></div>`;
  }

  private buyTab(special: boolean): string {
    const stock = this.w.state.merchant.stock;
    const list = stock.map((e, i) => ({ e, i })).filter(({ e }) => !!e.special === special);
    if (!list.length) return `<div class="empty-msg">상품이 없습니다.</div>`;
    return `<div class="grid auto">${list.map(({ e, i }) => this.entryCard(e, i)).join('')}</div>`;
  }

  private sellTab(): string {
    const w = this.w;
    const ids = this.includeStorage ? ['bag', ...w.inventory.storageIds()] : ['bag'];
    const ORDER = ['crop', 'animal', 'fish', 'forage', 'processed', 'cooking', 'resource', 'other', 'seed'];
    const entries: { cid: string; i: number; s: ItemStack }[] = [];
    for (const cid of ids) w.state.containers[cid].slots.forEach((s, i) => s && entries.push({ cid, i, s }));
    entries.sort((a, b) => ORDER.indexOf(ITEM_BY_ID[a.s.itemId].category) - ORDER.indexOf(ITEM_BY_ID[b.s.itemId].category));
    const rows: string[] = [];
    {
      for (const { cid, i, s } of entries) {
        const d = ITEM_BY_ID[s.itemId];
        const unit = w.merchant.unitPrice(s.itemId, s.freshness, s.bonus ?? 0);
        const fav = w.state.favorites.includes(s.itemId);
        const crop = CROP_BY_ID[s.itemId];
        rows.push(`<div class="list-row">${iconHtml(d.icon, 36)}<div class="grow" style="min-width:0">
          <b>${esc(d.name)}</b> <span class="muted small">×${s.qty}</span> ${fav ? '<span class="tiny" style="color:#d9a020">★</span>' : ''}
          <div class="tiny muted">${cid === 'bag' ? '가방' : esc(w.inventory.containerName(cid))}${s.freshness !== undefined ? ` · 신선도 ${Math.ceil(s.freshness)} (${freshnessLabel(s.freshness)})` : ''}${crop && crop.season.includes(w.cal.season) ? ' · <span class="good">제철 +10%</span>' : ''}</div></div>
          <b class="gold-text">${unit ? `${unit.toLocaleString()}G` : '<span class="bad">판매 불가</span>'}</b>
          <button class="btn small green" data-act="sell" data-arg="${cid}|${i}" ${unit ? '' : 'disabled'}>판매</button></div>`);
      }
    }
    const animals = w.animals.list().filter((a) => !a.pregnant);
    const animalRows = animals
      .map((a) => {
        const price = w.animals.sellPrice(a, w.state.merchant.sellBonus);
        return `<div class="list-row">${iconHtml(`portrait_${a.species}`, 36)}<div class="grow"><b>${esc(a.name)}</b> <span class="tiny muted">${a.id} · ${a.grade}등급 · ${a.gender === 'F' ? '암' : '수'} · ${{ baby: '아기', juvenile: '청소년', adult: '성체' }[a.stage]}</span>${a.favorite ? ' <span class="chip gold tiny">아끼는 동물</span>' : ''}</div>
        <b class="gold-text">${price.toLocaleString()}G</b><button class="btn small" data-act="sellAnimal" data-arg="${a.id}">판매</button></div>`;
      })
      .join('');
    return `<div class="row wrap" style="margin-bottom:0.5rem">
        <button class="${cx('btn small', this.includeStorage && 'blue')}" data-act="storage">${this.includeStorage ? '창고 포함' : '가방만'}</button>
        <button class="btn small gold" data-act="sellBag">가방 농수산물 모두 판매 (★ 제외)</button></div>
      <div class="list">${rows.join('') || '<div class="empty-msg">판매할 물건이 없어요</div>'}</div>
      ${animalRows ? `<div class="section-title">${iconHtml('ic_livestock', 20)} 동물 판매</div><div class="list">${animalRows}</div>` : ''}`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const m = w.merchant;
    if (act === 'buy') {
      const e = w.state.merchant.stock[Number(arg)];
      if (!e) return;
      const icon = e.kind === 'item' ? ITEM_BY_ID[e.id].icon : e.kind === 'deco' ? BUILDING_BY_ID[e.id].spriteKey : `portrait_${e.id}`;
      const max = Math.min(e.stock, Math.floor(w.state.gold / e.price));
      quantityDialog('구매 수량', icon, max, e.price, '구매', (q) => {
        const r = m.buy(Number(arg), q);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        else {
          this.toast('구매했습니다', 'good');
          popDomFx('fx_purchase', innerWidth / 2, innerHeight * 0.42, 72);
        }
        this.refresh();
      });
    } else if (act === 'sell') {
      const [cid, slot] = arg.split('|');
      const s = w.state.containers[cid]?.slots[Number(slot)];
      if (!s) return;
      const unit = m.unitPrice(s.itemId, s.freshness, s.bonus ?? 0);
      quantityDialog('판매 수량', ITEM_BY_ID[s.itemId].icon, s.qty, unit, '판매', (q) => {
        const r = m.sellSlot(cid, Number(slot), q);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        else {
          this.toast(`+${r.gold!.toLocaleString()}G`, 'good');
          popDomFx('fx_coin_pop', innerWidth / 2, innerHeight * 0.42, 64);
        }
        this.refresh();
      }, '판매 금액');
    } else if (act === 'storage') {
      this.includeStorage = !this.includeStorage;
      this.refresh();
    } else if (act === 'sellBag') {
      const bag = w.state.containers.bag;
      let total = 0;
      bag.slots.forEach((s, i) => {
        if (!s) return;
        const d = ITEM_BY_ID[s.itemId];
        if (w.state.favorites.includes(s.itemId) || !['crop', 'animal', 'fish', 'forage', 'processed', 'cooking'].includes(d.category)) return;
        const r = m.sellSlot('bag', i, s.qty);
        if (r.ok) total += r.gold!;
      });
      this.toast(total ? `+${total.toLocaleString()}G 판매 완료` : '판매할 농산물이 없습니다', total ? 'good' : 'warn');
      if (total) popDomFx('fx_coin_pop', innerWidth / 2, innerHeight * 0.42, 64);
    } else if (act === 'sellAnimal') {
      const a = w.animals.get(arg);
      if (!a) return;
      const price = w.animals.sellPrice(a, w.state.merchant.sellBonus);
      confirmDialog('동물 판매', `${esc(a.name)}(${a.id})을(를) <b class="gold-text">${price.toLocaleString()}G</b>에 판매할까요?${a.favorite ? '<br><b class="bad">아끼는 동물로 표시되어 있어요!</b>' : ''}`, '판매', () => {
        const r = m.sellAnimal(arg);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        else popDomFx('fx_coin_pop', innerWidth / 2, innerHeight * 0.42, 64);
      }, true);
    }
  }
}
