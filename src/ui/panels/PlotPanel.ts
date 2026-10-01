/** 농지 관리 (다중 선택 일괄 업그레이드) / 작물 정보 / 씨앗·비료 선택 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { BALANCE } from '../../data/balance';
import { CROP_BY_ID } from '../../data/crops';
import { ITEM_BY_ID } from '../../data/items';
import { RECIPE_BY_ID } from '../../data/recipes';
import { SEASON_BY_ID } from '../../data/seasons';
import { SKILL_BY_ID } from '../../data/skills';
import { cropStage, isReady, type PlotUpgradeType, seasonAllowsGrowth } from '../../systems/CropSystem';
import { fertilizerChoices, seedChoices } from '../../systems/InteractionService';
import type { Plot } from '../../types/game';
import { Bridge } from '../../scenes/Bridge';
import { Session } from '../../core/Session';
import { cx, esc } from '../dom';

const UPGRADE_INFO: Record<PlotUpgradeType, { name: string; icon: string; desc: string[] }> = {
  irrigation: { name: '관개 시스템', icon: 'tool_water', desc: ['직접 물주기', '매일 자동 물주기', '자동 관리 강화: 비료 지속 2배', '최종 자동 관리: 비료 자동 보충'] },
  soil: { name: '토양 개량', icon: 'ic_farming', desc: ['기본 토양', '추가 수확 15%', '추가 수확 30%', '추가 수확 50%'] },
  pest: { name: '해충 방지', icon: 'ic_warn', desc: ['해충 피해 가능 (수확 -1, 8%)', '해충 피해 없음'] },
  autoHarvest: { name: '자동 수확', icon: 'ic_auto', desc: ['직접 수확', '아침마다 자동 수확 → 가까운 창고'] },
};

export class PlotPanel extends Panel {
  readonly id = 'plot';
  size = 'side' as const;
  backdrop = false;
  tabs = [
    { id: 'manage', label: '관리', icon: 'tool_hoe' },
    { id: 'crop', label: '작물 정보', icon: 'it_carrot' },
  ];
  watch: Watch = ['plots', 'gold', 'inventory'];
  private keys: Set<string>;
  private mapSelect = false;

  constructor(keys: string[]) {
    super();
    this.keys = new Set(keys);
  }

  private plots(): Plot[] {
    return [...this.keys].map((k) => this.w.state.plots[k]).filter(Boolean);
  }

  onOpen(): void {
    Bridge.plotSelect = { active: false, keys: this.keys, onChange: () => this.queueRefresh() };
  }

  onClose(): void {
    Bridge.plotSelect = null;
  }

  renderBody(): string {
    const ps = this.plots();
    this.title = ps.length > 1 ? `농지 ${ps.length}칸 선택` : '농지 (1×1)';
    if (!ps.length) return `<div class="empty-msg">선택된 농지가 없습니다.<br>지도에서 농지를 탭해 선택하세요.</div>${this.selectTools()}`;
    return this.tab === 'crop' ? this.cropTab(ps) : this.manageTab(ps);
  }

  private selectTools(): string {
    return `<div class="card" style="margin-top:0.5rem"><div class="row wrap">
      <button class="${cx('btn small', this.mapSelect ? 'gold' : '')}" data-act="mapsel">${this.mapSelect ? '지도 선택 중 (탭/드래그)' : '지도에서 추가 선택'}</button>
      <button class="btn small" data-act="selsame">같은 작물</button>
      <button class="btn small" data-act="selall">모든 농지</button>
      <button class="btn small" data-act="selnone">해제</button></div></div>`;
  }

  private manageTab(ps: Plot[]): string {
    const w = this.w;
    let head = '';
    if (ps.length === 1) {
      const p = ps[0];
      const c = p.cropId ? CROP_BY_ID[p.cropId] : null;
      const stage = cropStage(p);
      const inSeason = c ? seasonAllowsGrowth(c.id, w.cal.season, !!p.greenhouse) : true;
      head = `<div class="kv card">
        <span>현재 작물</span><span>${c ? `${iconHtml(`it_${c.id}`, 20)} <b>${esc(c.name)}</b> ${isReady(p) ? '<span class="chip green">수확 가능</span>' : `<span class="chip">${['씨앗', '새싹', '성장 중', '거의 다 자람', ''][stage]}</span>`}` : '<span class="muted">비어 있음</span>'}</span>
        ${c ? `<span>성장 단계</span><span>${Math.floor(p.growthProgressDays)} / ${c.growDays}일 ${c.regrowDays ? `<span class="tiny muted">(재수확 ${c.regrowDays}일)</span>` : ''}</span>` : ''}
        <span>물 상태</span><span>${p.wateredToday ? '<b class="good">촉촉함</b>' : '<b class="bad">마름</b> <span class="tiny muted">오늘 물을 주면 자라요</span>'}</span>
        <span>비료</span><span>${p.fertilizer ? `${esc(ITEM_BY_ID[p.fertilizer.id].name)} <span class="tiny muted">(${p.fertilizer.daysLeft}일 남음)</span>` : '<span class="muted">없음</span>'}</span>
        ${c && !inSeason ? `<span>계절</span><span class="bad">겨울에는 겨울 작물만 밭에서 자라요 — 온실에서 키우면 자라요</span>` : ''}
      </div>`;
    } else {
      const ready = ps.filter(isReady).length;
      const dry = ps.filter((p) => p.cropId && !p.wateredToday).length;
      const empty = ps.filter((p) => !p.cropId).length;
      head = `<div class="card row wrap"><span class="chip">${ps.length}칸</span><span class="chip green">수확 가능 ${ready}</span><span class="chip red">물 필요 ${dry}</span><span class="chip">빈 농지 ${empty}</span></div>`;
    }
    const rows = (Object.keys(UPGRADE_INFO) as PlotUpgradeType[])
      .map((type) => {
        const info = UPGRADE_INFO[type];
        const levels = ps.map((p) => p.upgrades[type]);
        const minLv = Math.min(...levels);
        const maxLv = Math.max(...levels);
        let total = 0;
        let count = 0;
        let locked: string | null = null;
        for (const p of ps) {
          const u = w.crops.upgradeInfo(type, p.upgrades[type]);
          if (u.max) continue;
          if (u.locked) {
            const sk = BALANCE.plotUpgrades[type].skill[u.next];
            locked = `${SKILL_BY_ID[sk]?.name ?? ''} 연구 필요`;
            continue;
          }
          total += u.cost;
          count++;
        }
        const lvTxt = minLv === maxLv ? `Lv.${minLv}` : `Lv.${minLv}~${maxLv}`;
        const isMax = ps.every((p) => w.crops.upgradeInfo(type, p.upgrades[type]).max);
        return `<div class="list-row">${iconHtml(info.icon, 28)}<div class="grow"><b>${info.name}</b> <span class="chip">${lvTxt}</span>
          <div class="tiny muted">${esc(info.desc[minLv] ?? '')}${!isMax ? ` → ${esc(info.desc[minLv + 1] ?? '')}` : ''}</div></div>
          ${isMax ? '<span class="chip green">최대</span>' : count ? `<button class="btn small green" data-act="up" data-arg="${type}">${total.toLocaleString()}G${count > 1 ? ` (${count}칸)` : ''}</button>` : `<span class="chip red tiny">${esc(locked ?? '불가')}</span>`}</div>`;
      })
      .join('');
    const seed = w.state.hotbar.seedId;
    const fert = w.state.hotbar.fertilizerId;
    const anyReady = ps.some(isReady);
    const anyDry = ps.some((p) => !p.wateredToday);
    const anyEmpty = ps.some((p) => !p.cropId);
    const actions = `<div class="row wrap" style="margin:0.5rem 0">
      ${anyReady ? `<button class="btn small green" data-act="harvest">수확</button>` : ''}
      ${anyDry ? `<button class="btn small blue" data-act="water">물주기</button>` : ''}
      ${anyEmpty ? `<button class="btn small" data-act="plant">${seed ? `${iconHtml(`it_${seed}`, 18)} 심기` : '씨앗 선택'}</button>` : ''}
      <button class="btn small" data-act="fert">${fert ? `${iconHtml(`it_${fert}`, 18)} 비료` : '비료 선택'}</button>
      ${ps.length > 1 ? '' : `<button class="btn small red" data-act="untill" ${ps[0].cropId ? 'disabled' : ''}>메우기</button>`}
    </div>`;
    return `${head}${actions}<div class="section-title">${iconHtml('ic_research', 20)} 내부 업그레이드 <span class="tiny muted">(외형 변화 없음 · 여러 칸 일괄)</span></div><div class="list">${rows}</div>${this.selectTools()}`;
  }

  private cropTab(ps: Plot[]): string {
    const p = ps.find((x) => x.cropId);
    if (!p) return `<div class="empty-msg">작물이 심어져 있지 않습니다.</div>`;
    const c = CROP_BY_ID[p.cropId!];
    const w = this.w;
    const price = w.merchant.unitPrice(c.id, 100);
    const codex = w.state.codex.items[c.id];
    return `<div class="row" style="align-items:flex-start">${iconHtml(c.spriteKey, 64)}<div class="kv grow">
      <span>이름</span><b>${esc(c.name)}${c.rare ? ' <span class="chip purple">희귀</span>' : ''}</b>
      <span>계절</span><span>${c.season.map((s) => SEASON_BY_ID[s].name).join(' · ')}</span>
      <span>성장기간</span><span>${c.growDays}일${c.regrowDays ? ` · 이후 ${c.regrowDays}일마다 재수확` : ''}</span>
      <span>수확량</span><span>${c.yield}개 (+비료/토양 보너스)</span>
      <span>기본 판매가</span><span>${c.baseSellPrice.toLocaleString()}G · 오늘 신선 기준 ${price.toLocaleString()}G</span>
      <span>신선도 감소</span><span>하루 ${c.freshnessDecay}</span>
      <span>가공 용도</span><span>${c.processingUses.length ? c.processingUses.map((r) => esc(RECIPE_BY_ID[r].outputName)).join(', ') : '-'}</span>
      <span>누적 수확</span><span>${codex?.count ?? 0}개 · 최고 판매가 ${(codex?.bestPrice ?? 0).toLocaleString()}G</span>
    </div></div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const ps = this.plots();
    switch (act) {
      case 'up': {
        const r = w.crops.upgrade(ps, arg as PlotUpgradeType);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        else this.toast(`${UPGRADE_INFO[arg as PlotUpgradeType].name} ${r.count}칸 업그레이드 (-${r.cost.toLocaleString()}G)`, 'good');
        break;
      }
      case 'harvest': {
        let n = 0;
        for (const p of ps) if (isReady(p)) n += w.crops.harvest(p).qty ?? 0;
        if (n) this.toast(`${n}개 수확했습니다`, 'good');
        break;
      }
      case 'water':
        for (const p of ps) if (!p.wateredToday) w.crops.water(p);
        break;
      case 'plant': {
        const seed = w.state.hotbar.seedId;
        if (!seed) {
          this.manager.open(new SeedPickerPanel());
          return;
        }
        let n = 0;
        let reason = '';
        for (const p of ps)
          if (!p.cropId) {
            const r = w.crops.plant(p, seed);
            if (r.ok) n++;
            else reason = r.reason ?? '';
          }
        if (!n && reason) this.toast(reason, 'warn');
        break;
      }
      case 'fert': {
        const f = w.state.hotbar.fertilizerId;
        if (!f || w.inventory.countAll(f) <= 0) {
          this.manager.open(new FertPickerPanel());
          return;
        }
        let n = 0;
        let reason = '';
        for (const p of ps) {
          const r = w.crops.fertilize(p, f);
          if (r.ok) n++;
          else reason = r.reason ?? '';
        }
        if (!n && reason) this.toast(reason, 'warn');
        break;
      }
      case 'untill':
        if (ps[0]) w.crops.untill(ps[0].x, ps[0].y);
        this.close();
        return;
      case 'mapsel':
        this.mapSelect = !this.mapSelect;
        if (Bridge.plotSelect) Bridge.plotSelect.active = this.mapSelect;
        break;
      case 'selsame': {
        const crop = ps.find((p) => p.cropId)?.cropId;
        for (const p of w.crops.outdoorPlots()) if (crop ? p.cropId === crop : !p.cropId) this.keys.add(`${p.x},${p.y}`);
        break;
      }
      case 'selall':
        for (const p of w.crops.outdoorPlots()) this.keys.add(`${p.x},${p.y}`);
        break;
      case 'selnone':
        this.keys.clear();
        break;
    }
    this.refresh();
  }
}

/** 씨앗 선택 */
export class SeedPickerPanel extends Panel {
  readonly id = 'seedPicker';
  size = 'medium' as const;
  title = '씨앗 선택';
  watch: Watch = ['inventory'];

  renderBody(): string {
    const w = this.w;
    const owned = seedChoices(w);
    const season = w.cal.season;
    const cur = w.state.hotbar.seedId;
    if (!owned.length) return `<div class="empty-msg">가진 씨앗이 없어요.<br>방문상인에게서 씨앗을 살 수 있어요.</div>`;
    return `<div class="grid auto">${owned
      .map(({ itemId, qty }) => {
        const c = CROP_BY_ID[ITEM_BY_ID[itemId].cropId!];
        const lock = w.crops.lockReason(c);
        const inSeason = c.season.includes(season);
        const grows = seasonAllowsGrowth(c.id, season, false);
        return `<button class="${cx('card row', cur === itemId && 'sel', lock && 'locked')}" data-act="pick" data-arg="${itemId}" style="text-align:left">${iconHtml(`it_${c.id}`, 36)}
          <div class="grow"><b>${esc(c.name)}</b> <span class="muted small">×${qty}</span>
          <div class="tiny">${c.season.map((s) => SEASON_BY_ID[s].name).join('·')} · ${c.growDays}일${c.regrowDays ? ` · 재수확 ${c.regrowDays}일` : ''}</div>
          <div class="tiny">${lock ? `<span class="bad">${esc(lock)}</span>` : !grows ? '<span class="bad">겨울엔 온실에서만 자라요</span>' : inSeason ? '<span class="good">제철 — 판매가 +10%</span>' : '<span class="good">지금 심으면 자라요</span>'}</div></div></button>`;
      })
      .join('')}</div>`;
  }

  onAction(act: string, arg: string): void {
    if (act !== 'pick') return;
    this.w.state.hotbar.seedId = arg;
    this.w.state.hotbar.selected = 3;
    Session.app.emit('tool', { index: 3 });
    this.close();
  }
}

/** 비료 선택 */
export class FertPickerPanel extends Panel {
  readonly id = 'fertPicker';
  size = 'small' as const;
  title = '비료 선택';
  watch: Watch = ['inventory'];

  renderBody(): string {
    const list = fertilizerChoices(this.w);
    if (!list.length) return `<div class="empty-msg">비료가 없어요.<br>${this.w.skills.has('f_fert1') ? '방문상인에게 살 수 있어요.' : '농사 기술 [비료]를 연구하면 사용할 수 있어요.'}</div>`;
    return `<div class="list">${list
      .map(({ itemId, qty }) => {
        const d = ITEM_BY_ID[itemId];
        const f = BALANCE.crops.fertilizer[itemId];
        return `<button class="list-row click" data-act="pick" data-arg="${itemId}">${iconHtml(d.icon, 32)}<div class="grow" style="text-align:left"><b>${esc(d.name)}</b> ×${qty}<div class="tiny muted">성장 +${Math.round(f.growthBonus * 100)}% · 추가 수확 ${Math.round(f.extraChance * 100)}% · ${f.days}일</div></div></button>`;
      })
      .join('')}</div>`;
  }

  onAction(act: string, arg: string): void {
    if (act !== 'pick') return;
    this.w.state.hotbar.fertilizerId = arg;
    this.w.state.hotbar.selected = 4;
    Session.app.emit('tool', { index: 4 });
    this.close();
  }
}

