/** 일시정지 메뉴 — 계속하기 / 저장 / 도감 / 동물 / 재정 / 알림 / 설정 / 메인 메뉴 */
import { Panel } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { Session } from '../../core/Session';
import { esc } from '../dom';
import { confirmDialog } from '../dialogs';
import { openPanel, type PanelName } from '../openers';
import { quitToMenu } from '../GameFlow';
import { dateLabel } from '../../systems/SeasonSystem';

export class PausePanel extends Panel {
  readonly id = 'pause';
  size = 'medium' as const;
  title = '일시정지';
  tabs = [
    { id: 'menu', label: '메뉴', icon: 'ic_pause' },
    { id: 'log', label: '알림 기록', icon: 'ic_warn' },
  ];

  renderBody(): string {
    const w = this.w;
    if (this.tab === 'log') {
      if (!w.notifyLog.length) return `<div class="empty-msg">알림이 없어요.</div>`;
      return `<div class="list">${w.notifyLog
        .map((n) => `<div class="list-row" style="min-height:0">${n.icon ? iconHtml(n.icon, 22) : ''}<span class="grow small">${esc(n.text)}</span><span class="tiny muted">${dateLabel(n.day)}</span></div>`)
        .join('')}</div>`;
    }
    const b = (act: string, icon: string, label: string, cls = '') => `<button class="btn ${cls}" data-act="${act}" style="flex-direction:column;height:5rem">${iconHtml(icon, 32)}${label}</button>`;
    return `<div class="center muted small" style="margin-bottom:0.6rem">${esc(w.state.meta.farmName)} · 슬롯 ${Session.slot} · 게임 시간이 멈춰 있어요</div>
      <div class="grid cols-3">
        ${b('resume', 'ic_farming', '계속하기', 'green')}
        ${b('save', 'ic_save', '저장')}
        ${b('codex', 'ic_codex', '도감')}
        ${b('animals', 'ic_livestock', '동물 목록')}
        ${b('skills', 'ic_research', '기술 연구')}
        ${b('finance', 'ic_chart', '재정 통계')}
        ${b('house', 'ic_house', '집')}
        ${b('settings', 'ic_gear', '설정')}
        ${b('quit', 'ic_close', '메인 메뉴', 'red')}
      </div>`;
  }

  onAction(act: string): void {
    if (act === 'resume') return this.close();
    if (act === 'quit') {
      confirmDialog('메인 메뉴로', '저장하고 메인 메뉴로 돌아갈까요?', '나가기', () => void quitToMenu(true));
      return;
    }
    openPanel(act as PanelName);
  }
}
