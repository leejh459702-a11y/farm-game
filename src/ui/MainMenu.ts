/** 메인 메뉴 (DOM 버튼) + 세이브 슬롯 선택 */
import type Phaser from 'phaser';
import { Session } from '../core/Session';
import { AudioManager } from '../audio/AudioManager';
import { $ui, el, esc } from './dom';
import { Panel } from './Panel';
import { Panels } from './PanelManager';
import { confirmDialog, infoDialog, promptDialog } from './dialogs';
import { continueGame, startNewGame } from './GameFlow';
import { SettingsPanel } from './panels/SettingsPanel';
import type { SlotMeta } from '../save/SaveSystem';
import { iconHtml } from '../assets/AssetRegistry';

let root: HTMLElement | null = null;
export const APP_VERSION = '0.9.0';

export function mountMainMenu(_scene: Phaser.Scene): void {
  unmountMainMenu();
  root = el('div', 'menu-root');
  root.innerHTML = `
    <button class="btn green menu-btn interactive" data-act="new">${iconHtml('ic_farming', 28)} 새 게임</button>
    <button class="btn wood menu-btn interactive" data-act="continue">이어하기</button>
    <button class="btn wood menu-btn interactive" data-act="settings">설정</button>
    <button class="btn wood menu-btn interactive" data-act="exit">게임 종료</button>
    <div class="menu-version">v${APP_VERSION} · 3×3에서 시작하는 작은 농장</div>`;
  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t) return;
    AudioManager.unlock();
    AudioManager.ui('tap');
    const act = t.dataset.act;
    if (act === 'new') Panels.open(new SaveSlotsPanel('new'));
    else if (act === 'continue') void onContinue();
    else if (act === 'settings') Panels.open(new SettingsPanel());
    else if (act === 'exit')
      confirmDialog('게임 종료', '게임을 종료할까요?<br><span class="muted small">진행 상황은 자동 저장되어 있습니다.</span>', '종료', () => {
        window.close();
        setTimeout(() => infoDialog('게임 종료', '브라우저 탭(또는 앱)을 닫으면 종료됩니다.<br>언제든 다시 돌아오세요!'), 300);
      });
  });
  // 첫 입력에서 오디오 잠금 해제
  root.addEventListener('pointerdown', () => AudioManager.unlock(), { once: true });
  $ui().appendChild(root);
}

export function unmountMainMenu(): void {
  root?.remove();
  root = null;
}

async function onContinue(): Promise<void> {
  const slots = (await Session.save.listSlots()).filter((s) => s.exists);
  if (!slots.length) {
    infoDialog('이어하기', '저장된 농장이 없습니다.<br>[새 게임]으로 첫 농장을 시작해 보세요!', 'ic_farming');
    return;
  }
  Panels.open(new SaveSlotsPanel('load'));
}

function fmtPlay(sec = 0): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return h ? `${h}시간 ${m}분` : `${m}분`;
}

/** 세이브 슬롯: 새 게임 / 불러오기 / 저장 */
export class SaveSlotsPanel extends Panel {
  readonly id = 'slots';
  size = 'medium' as const;
  pausesTime = true;
  private slots: SlotMeta[] = [];
  constructor(private mode: 'new' | 'load' | 'save') {
    super();
    this.title = mode === 'new' ? '새 게임 — 슬롯 선택' : mode === 'load' ? '이어하기' : '저장하기';
  }
  onOpen(): void {
    void Session.save.listSlots().then((s) => {
      this.slots = s;
      this.refresh();
    });
  }
  renderBody(): string {
    if (!this.slots.length) return `<div class="empty-msg">불러오는 중…</div>`;
    return `<div class="list">${this.slots
      .map((s) => {
        const cur = Session.world && Session.slot === s.slot;
        if (!s.exists)
          return `<div class="list-row click" data-act="pick" data-arg="${s.slot}">${iconHtml('ic_save', 36)}<div class="grow"><b>슬롯 ${s.slot}</b><div class="muted small">비어 있음</div></div>${this.mode === 'load' ? '' : `<span class="chip green">선택</span>`}</div>`;
        return `<div class="list-row click" data-act="pick" data-arg="${s.slot}">${iconHtml('ic_house', 36)}
          <div class="grow"><b>슬롯 ${s.slot} · ${esc(s.farmName ?? '')}</b> ${cur ? '<span class="chip blue">현재</span>' : ''}
          <div class="muted small">${esc(s.label ?? '')} · 집 Lv.${s.houseLevel} · ${(s.gold ?? 0).toLocaleString()}G · 플레이 ${fmtPlay(s.playTimeSec)}</div>
          <div class="tiny muted">저장: ${s.savedAt ? new Date(s.savedAt).toLocaleString('ko-KR') : '-'}</div></div>
          ${this.mode !== 'save' ? `<button class="btn small red" data-act="del" data-arg="${s.slot}">삭제</button>` : ''}
        </div>`;
      })
      .join('')}</div>`;
  }
  onAction(act: string, arg: string, _el: HTMLElement, ev: Event): void {
    const slot = Number(arg);
    const meta = this.slots.find((s) => s.slot === slot);
    if (act === 'del') {
      ev.stopPropagation();
      confirmDialog('세이브 삭제', `슬롯 ${slot}의 농장을 삭제할까요?<br><b class="bad">되돌릴 수 없습니다.</b>`, '삭제', async () => {
        await Session.save.remove(slot);
        this.onOpen();
      }, true);
      return;
    }
    if (act !== 'pick' || !meta) return;
    if (this.mode === 'load') {
      if (!meta.exists) return;
      this.close();
      void continueGame(slot);
    } else if (this.mode === 'new') {
      const go = () =>
        promptDialog('농장 이름', '농장 이름을 지어 주세요', '나의 작은 농장', (name) => {
          Panels.closeAll();
          void startNewGame(slot, name);
        });
      if (meta.exists) confirmDialog('덮어쓰기', `슬롯 ${slot}에 저장된 농장을 지우고 새로 시작할까요?`, '새로 시작', go, true);
      else go();
    } else {
      const doSave = async () => {
        Session.slot = slot;
        const ok = await Session.saveNow(false);
        this.toast(ok ? `슬롯 ${slot}에 저장했습니다` : '저장에 실패했습니다', ok ? 'good' : 'warn');
        this.onOpen();
      };
      if (meta.exists && Session.slot !== slot) confirmDialog('덮어쓰기', `슬롯 ${slot}에 덮어쓸까요?`, '저장', () => void doSave());
      else void doSave();
    }
  }
}
