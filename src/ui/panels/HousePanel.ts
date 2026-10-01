/** 집: 오늘 마치기 / 집 업그레이드 / 운영비 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { BALANCE } from '../../data/balance';
import { HOUSE_NAMES } from '../../systems/HouseUpgradeSystem';
import { clockString } from '../../systems/SeasonSystem';
import { landCap } from '../../services/EconomyService';
import { Session } from '../../core/Session';
import { cx } from '../dom';
import { openPanel } from '../openers';
import { confirmDialog } from '../dialogs';
import { TOOL_TIERS, type UpgradableTool } from '../../data/tools';
import { ITEM_BY_ID } from '../../data/items';
import { RegionSelectPanel } from './RegionSelectPanel';
import { esc } from '../dom';

export class HousePanel extends Panel {
  readonly id = 'house';
  size = 'medium' as const;
  title = '나의 집';
  tabs = [
    { id: 'home', label: '집', icon: 'ic_house' },
    { id: 'upgrade', label: '집 업그레이드', icon: 'ic_star' },
    { id: 'tools', label: '도구', icon: 'tool_axe' },
  ];
  watch: Watch = ['gold', 'house', 'levelUp'];

  renderBody(): string {
    const w = this.w;
    const lv = w.state.house.level;
    if (this.tab === 'home') {
      const s = w.state;
      const remain = BALANCE.time.secondsPerDay - s.time.elapsed;
      const debt = s.finance.debt;
      return `<div class="row" style="align-items:flex-start;gap:1rem">
        <div class="card center" style="min-width:9rem">${iconHtml(`bld_house_${lv}`, 96)}<div class="bold">Lv.${lv} ${HOUSE_NAMES[lv - 1]}</div></div>
        <div class="col grow">
          <div class="card"><div class="section-title">${iconHtml('ic_moon', 20)} 오늘 마치기</div>
            <div class="small muted">남은 시간 약 ${Math.ceil(remain / 60)}분을 건너뛰고 다음 날 아침으로 이동합니다. (현재 ${clockString(w.cal.season, s.time.elapsed)})</div>
            <button class="btn green block" style="margin-top:0.4rem" data-act="endday" data-tut="endday-btn">오늘 마치기</button></div>
          <div class="card"><div class="section-title">${iconHtml('ic_coin', 20)} 월 운영비</div>
            <div class="small">지난달 판매수익의 <b>${Math.round(BALANCE.house.operatingCostRate[lv - 1] * 100)}%</b> · 이번 달 예상 ${w.finance.projectedCost().toLocaleString()}G</div>
            ${debt > 0 ? `<div class="row" style="margin-top:0.3rem"><span class="chip red">미납 ${debt.toLocaleString()}G</span><button class="btn small gold right" data-act="pay">납부</button></div><div class="tiny muted">미납 중: 토지 구매·집 업그레이드·고급 연구 제한 (농사·축산·판매는 가능)</div>` : '<div class="tiny good">미납 없음</div>'}
          </div>
          <div class="row"><button class="btn grow" data-act="save">${iconHtml('ic_save', 20)}저장</button><button class="btn grow" data-act="skills">${iconHtml('ic_research', 20)}기술 연구</button></div>
          ${w.state.regionsDiscovered ? `<button class="btn blue block" data-act="region">${iconHtml('ic_region', 20)}외곽 이동 (강가·숲·바위 언덕)</button>` : ''}
        </div></div>`;
    }
    if (this.tab === 'tools') {
      const rows = (['axe', 'pickaxe', 'rod'] as UpgradableTool[])
        .map((t) => {
          const def = TOOL_TIERS[t];
          const info = w.life.toolInfo(t);
          const lv = w.state.tools[t];
          const owned = t !== 'rod' || w.state.tools.rodOwned;
          const next = info.next !== null ? def.tiers[info.next] : null;
          return `<div class="card"><div class="row">${iconHtml(def.icon, 36)}<div class="grow"><b>${owned ? def.tiers[lv].name : `${def.label} (미보유)`}</b><div class="tiny muted">${esc(def.effect[lv])}</div></div></div>
            ${next ? `<div class="row wrap" style="margin-top:0.3rem"><span class="small">→ <b>${next.name}</b>: ${esc(def.effect[info.next!])}</span></div>
            <div class="row wrap" style="margin-top:0.3rem"><span class="${cx('chip', w.state.gold >= next.cost ? 'green' : 'red')}">${next.cost.toLocaleString()}G</span>
            ${next.mats.map((m) => `<span class="${cx('chip', w.inventory.countAll(m.id) >= m.qty ? 'green' : 'red')}">${iconHtml(ITEM_BY_ID[m.id].icon, 14)}${ITEM_BY_ID[m.id].name} ${w.inventory.countAll(m.id)}/${m.qty}</span>`).join('')}
            <button class="btn small green right" data-act="tool" data-arg="${t}" ${info.ok ? '' : 'disabled'}>${info.ok ? '업그레이드' : esc(info.reason ?? '')}</button></div>` : '<span class="chip gold">최고 단계</span>'}</div>`;
        })
        .join('');
      return `<div class="small muted" style="margin-bottom:0.5rem">도구는 가방 칸을 차지하지 않아요. 광석은 바위 언덕에서 캐거나 특급상인에게 살 수 있어요.</div><div class="col">${rows}</div>`;
    }
    // 업그레이드
    const req = w.house.nextReq();
    const rows = BALANCE.house.upgrades
      .map((u) => {
        const done = lv >= u.level;
        const next = u.level === lv + 1;
        return `<div class="${cx('list-row', next && 'sel')}" style="${done ? 'opacity:0.6' : ''}">${iconHtml(`bld_house_${u.level}`, 44)}
        <div class="grow"><b>Lv.${u.level} ${HOUSE_NAMES[u.level - 1]}</b> ${done ? '<span class="chip green">완료</span>' : ''}
        <div class="small muted">${u.cost.toLocaleString()}G · 농사 Lv.${u.farming} · 목축 Lv.${u.livestock} · 최대 토지 ${landCap(u.level)}칸 · 운영비 ${Math.round(BALANCE.house.operatingCostRate[u.level - 1] * 100)}%</div></div></div>`;
      })
      .join('');
    let action = '<div class="muted center">최고 레벨입니다!</div>';
    if (req) {
      const c = w.house.check();
      const fl = w.skills.level('farming');
      const ll = w.skills.level('livestock');
      action = `<div class="card"><div class="row wrap"><b>다음: Lv.${req.level} ${HOUSE_NAMES[req.level - 1]}</b>
        <span class="${cx('chip', w.state.gold >= req.cost ? 'green' : 'red')}">${req.cost.toLocaleString()}G</span>
        <span class="${cx('chip', fl >= req.farming ? 'green' : 'red')}">농사 ${fl}/${req.farming}</span>
        <span class="${cx('chip', ll >= req.livestock ? 'green' : 'red')}">목축 ${ll}/${req.livestock}</span></div>
        <div class="small muted" style="margin:0.3rem 0">외부 크기는 2×2 그대로, 외형이 발전하고 토지 단계가 올라갑니다. (토지 기본가 ${BALANCE.land.tiers[req.level - 1].base.toLocaleString()}G부터)</div>
        <button class="btn green block" data-act="upgrade" ${c.ok ? '' : 'disabled'}>${c.ok ? '업그레이드' : c.reason}</button></div>`;
    }
    return `${action}<div class="section-title">단계</div><div class="list">${rows}</div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    if (act === 'endday') {
      const dry = w.crops.allPlots().filter((p) => p.cropId && !p.mature && !p.wateredToday).length;
      const go = () => {
        this.close();
        w.time.skipToNextDay();
      };
      if (dry) confirmDialog('오늘 마치기', `물을 주지 않은 작물이 <b class="bad">${dry}개</b> 있어요.<br>물을 준 날에만 하루씩 자라요. 그래도 마칠까요?`, '마치기', go);
      else go();
      return;
    } else if (act === 'pay') {
      const r = w.finance.payDebt();
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'upgrade') {
      const r = w.house.upgrade();
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'tool') {
      const r = w.life.upgradeTool(arg as UpgradableTool);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'region') {
      this.manager.open(new RegionSelectPanel());
      return;
    } else if (act === 'save') void Session.saveNow(false);
    else if (act === 'skills') openPanel('skills');
    this.refresh();
  }
}
