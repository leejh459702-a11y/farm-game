/** 온실 — 내부 9칸, 겨울에도 모든 작물 성장 (제철 보너스는 제철에만), 자동 급수 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { CROP_BY_ID } from '../../data/crops';
import { ITEM_BY_ID } from '../../data/items';
import { isReady } from '../../systems/CropSystem';
import { cx, esc } from '../dom';
import { SeedPickerPanel } from './PlotPanel';

export class GreenhousePanel extends Panel {
  readonly id = 'greenhouse';
  title = '온실';
  watch: Watch = ['plots', 'inventory'];
  private sel = new Set<number>();

  constructor(private uid: string) {
    super();
  }

  renderBody(): string {
    const w = this.w;
    const plots = w.crops.greenhousePlots(this.uid);
    const cells = plots
      .map((p, i) => {
        const c = p.cropId ? CROP_BY_ID[p.cropId] : null;
        return `<button class="${cx('card col center', this.sel.has(i) && 'sel')}" data-act="sel" data-arg="${i}" style="align-items:center;min-height:6.5rem;background:${p.cropId ? '#eef8e4' : '#f6efe0'}">
          ${c ? iconHtml(isReady(p) ? `it_${c.id}` : c.spriteKey, 44) : iconHtml('tool_seed', 32)}
          <span class="small">${c ? esc(c.name) : '빈 칸'}</span>
          ${c ? `<span class="tiny ${isReady(p) ? 'good' : 'muted'}">${isReady(p) ? '수확 가능' : `${Math.floor(p.growthProgressDays)}/${c.growDays}일`}</span>` : ''}
          ${c && !c.season.includes(w.cal.season) ? '<span class="chip tiny">비제철 · 보너스 없음</span>' : ''}</button>`;
      })
      .join('');
    return `<div class="card small muted" style="margin-bottom:0.5rem">온실 안에서는 겨울에도 모든 작물이 자라요. 자동으로 물이 공급되고 해충도 없어요. (제철이 아닌 작물은 판매 보너스 +10%가 없어요)</div>
      <div class="grid cols-3">${cells}</div>`;
  }

  renderFoot(): string {
    const w = this.w;
    const seed = w.state.hotbar.seedId;
    return `<button class="btn small" data-act="all">전체 선택</button>
      <button class="btn small green" data-act="harvest">수확</button>
      <button class="btn small" data-act="plant">${seed ? `${iconHtml(ITEM_BY_ID[seed].icon, 18)} ${esc(ITEM_BY_ID[seed].name)} 심기` : '씨앗 선택'}</button>
      <button class="btn small" data-act="seed">씨앗 바꾸기</button>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const plots = w.crops.greenhousePlots(this.uid);
    const targets = this.sel.size ? [...this.sel].map((i) => plots[i]) : plots;
    if (act === 'sel') {
      const i = Number(arg);
      if (this.sel.has(i)) this.sel.delete(i);
      else this.sel.add(i);
    } else if (act === 'all') {
      if (this.sel.size === plots.length) this.sel.clear();
      else plots.forEach((_, i) => this.sel.add(i));
    } else if (act === 'harvest') {
      let n = 0;
      for (const p of targets) if (isReady(p)) n += w.crops.harvest(p).qty ?? 0;
      this.toast(n ? `${n}개 수확했습니다` : '수확할 작물이 없어요', n ? 'good' : 'warn');
    } else if (act === 'plant') {
      const seed = w.state.hotbar.seedId;
      if (!seed) return void this.manager.open(new SeedPickerPanel());
      let n = 0;
      let reason = '';
      for (const p of targets)
        if (!p.cropId) {
          const r = w.crops.plant(p, seed);
          if (r.ok) n++;
          else reason = r.reason ?? '';
        }
      if (!n) this.toast(reason || '빈 칸이 없어요', 'warn');
    } else if (act === 'seed') return void this.manager.open(new SeedPickerPanel());
    this.refresh();
  }
}
