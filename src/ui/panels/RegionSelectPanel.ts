/** 외곽 이동 — 강가 · 숲 · 바위 언덕 선택 */
import { Panel } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { REGIONS } from '../../data/gathering';
import { goToRegion } from '../../scenes/Travel';
import type { RegionId } from '../../types/game';
import { esc } from '../dom';

export class RegionSelectPanel extends Panel {
  readonly id = 'regionSelect';
  size = 'medium' as const;
  title = '외곽 이동';
  pausesTime = true;

  renderBody(): string {
    const w = this.w;
    for (const r of REGIONS) if (r.id !== 'mine') w.regions.ensureDay(r.id);
    const m = w.mine;
    const mineRow = m.unlocked()
      ? `<div class="list-row" style="text-align:left">${iconHtml('ic_mine', 40)}
          <div class="grow"><b>광산</b> <span class="chip">최고 ${m.st.deepest}층</span><div class="small muted">층마다 깊어지는 광산 · 광석 · 보석 · 지오드 · 유물 (매일 새로 생겨요)</div>
          <div class="row wrap" style="gap:4px;margin-top:3px">${m
            .elevatorFloors()
            .map((f) => `<button class="btn small" data-act="mine" data-arg="${f}">${f === 1 ? '입구 1층' : `승강기 ${f}층`}</button>`)
            .join('')}</div>${!m.deepUnlocked() ? '<div class="tiny muted">11층부터 깊은 광산: 연구 [깊은 광산] + 철 곡괭이 필요</div>' : ''}</div></div>`
      : `<div class="list-row locked">${iconHtml('ic_mine', 40)}<div class="grow"><b>광산 (폐광)</b><div class="small muted">채집·채광 Lv.3 에서 연구 [폐광 탐사]를 하면 들어갈 수 있어요. (기술 연구 → 채집·채광)</div></div></div>`;
    return `<div class="small muted" style="margin-bottom:0.5rem">작물이 자라는 동안 바깥에서 놀다 와요. 이동 중에도 시간은 흘러요. 자원은 매일 아침 새로 생겨요.</div>
      <div class="list">${REGIONS.filter((r) => r.id !== 'mine')
        .map(
          (r) => `<button class="list-row click" data-act="go" data-arg="${r.id}" style="text-align:left">${iconHtml(r.icon, 40)}
          <div class="grow"><b>${esc(r.name)}</b><div class="small muted">${esc(r.desc)}</div><div class="tiny">오늘: ${esc(w.regions.summary(r.id))}</div></div>
          <span class="chip green">이동</span></button>`,
        )
        .join('')}${mineRow}</div>
      ${!w.state.tools.rodOwned ? '<div class="tiny muted" style="margin-top:0.5rem">낚싯대는 튜토리얼을 마치면 받아요.</div>' : ''}`;
  }

  onAction(act: string, arg: string): void {
    if (act === 'go') goToRegion(arg as RegionId);
    else if (act === 'mine') {
      const r = this.w.mine.enter(Number(arg));
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
      else goToRegion('mine');
    }
  }
}
