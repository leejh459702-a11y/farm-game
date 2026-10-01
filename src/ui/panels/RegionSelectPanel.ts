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
    for (const r of REGIONS) w.regions.ensureDay(r.id);
    return `<div class="small muted" style="margin-bottom:0.5rem">작물이 자라는 동안 바깥에서 놀다 와요. 이동 중에도 시간은 흘러요. 자원은 매일 아침 새로 생겨요.</div>
      <div class="list">${REGIONS.map(
        (r) => `<button class="list-row click" data-act="go" data-arg="${r.id}" style="text-align:left">${iconHtml(r.icon, 40)}
          <div class="grow"><b>${esc(r.name)}</b><div class="small muted">${esc(r.desc)}</div><div class="tiny">오늘: ${esc(w.regions.summary(r.id))}</div></div>
          <span class="chip green">이동</span></button>`,
      ).join('')}</div>
      ${!w.state.tools.rodOwned ? '<div class="tiny muted" style="margin-top:0.5rem">낚싯대는 튜토리얼을 마치면 받아요.</div>' : ''}`;
  }

  onAction(act: string, arg: string): void {
    if (act === 'go') goToRegion(arg as RegionId);
  }
}
