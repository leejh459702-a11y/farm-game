/** 설정 / 모바일 설정 */
import { Panel } from '../Panel';
import { SettingsStore } from '../../services/SettingsStore';
import type { Settings } from '../../types/game';
import { cx } from '../dom';
import { confirmDialog } from '../dialogs';

type NumKey = 'bgmVolume' | 'sfxVolume' | 'ambientVolume' | 'uiVolume' | 'uiScale' | 'cameraSpeed' | 'joystickOpacity';
type BoolKey = 'vibration' | 'screenShake' | 'autosave' | 'showDaySummary';

export function applyUiScale(): void {
  document.documentElement.style.setProperty('--ui-scale', String(SettingsStore.value.uiScale));
}

export class SettingsPanel extends Panel {
  readonly id = 'settings';
  size = 'medium' as const;
  title = '설정';
  tabs = [
    { id: 'sound', label: '소리', icon: 'ic_star' },
    { id: 'control', label: '조작', icon: 'tool_hand' },
    { id: 'screen', label: '화면', icon: 'ic_gear' },
    { id: 'game', label: '게임', icon: 'ic_save' },
  ];

  private slider(k: NumKey, label: string, min: number, max: number, step: number, fmt: (v: number) => string): string {
    const v = SettingsStore.value[k];
    return `<div class="col" style="gap:2px"><div class="row"><span class="grow">${label}</span><b>${fmt(v)}</b></div>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${v}" data-input="${k}" /></div>`;
  }

  private toggle(k: BoolKey, label: string, desc = ''): string {
    const on = SettingsStore.value[k];
    return `<div class="list-row"><div class="grow"><b>${label}</b>${desc ? `<div class="muted small">${desc}</div>` : ''}</div><button class="${cx('toggle', on && 'on')}" data-act="toggle" data-arg="${k}" aria-label="${label}"></button></div>`;
  }

  renderBody(): string {
    const s = SettingsStore.value;
    const pct = (v: number) => `${Math.round(v * 100)}%`;
    switch (this.tab) {
      case 'sound':
        return `<div class="col">${this.slider('bgmVolume', 'BGM 음량', 0, 1, 0.05, pct)}${this.slider('sfxVolume', '효과음', 0, 1, 0.05, pct)}${this.slider('ambientVolume', '환경음', 0, 1, 0.05, pct)}${this.slider('uiVolume', 'UI 소리', 0, 1, 0.05, pct)}</div>`;
      case 'control':
        return `<div class="col">
          <div class="list-row"><div class="grow"><b>이동 방식</b><div class="muted small">가상 조이스틱 또는 탭한 곳으로 이동</div></div>
            <div class="seg"><button class="${cx(s.controlMode === 'joystick' && 'on')}" data-act="mode" data-arg="joystick">조이스틱</button><button class="${cx(s.controlMode === 'tap' && 'on')}" data-act="mode" data-arg="tap">Tap To Move</button></div></div>
          ${this.slider('joystickOpacity', '가상 조이스틱 투명도', 0.2, 1, 0.05, pct)}
          ${this.slider('cameraSpeed', '카메라 이동속도', 0.5, 2, 0.1, (v) => `${v.toFixed(1)}x`)}
          ${this.toggle('vibration', '진동', '행동 시 짧은 진동 (지원 기기)')}
        </div>`;
      case 'screen':
        return `<div class="col">
          ${this.slider('uiScale', 'UI 크기', 0.8, 1.4, 0.05, (v) => `${Math.round(v * 100)}%`)}
          <div class="list-row"><div class="grow"><b>FPS 제한</b><div class="muted small">30 FPS는 배터리를 아낍니다</div></div>
            <div class="seg"><button class="${cx(s.fpsLimit === 30 && 'on')}" data-act="fps" data-arg="30">30</button><button class="${cx(s.fpsLimit === 60 && 'on')}" data-act="fps" data-arg="60">60</button></div></div>
          ${this.toggle('screenShake', '화면 흔들림', '천둥 등 연출 효과')}
          <div class="list-row"><div class="grow"><b>전체 화면</b><div class="muted small">모바일 몰입형 화면</div></div><button class="btn small" data-act="fullscreen">전환</button></div>
        </div>`;
      default:
        return `<div class="col">
          ${this.toggle('autosave', '자동 저장', '하루 시작/종료, 주요 시설 변경, 앱 전환 시')}
          ${this.toggle('showDaySummary', '하루 정산 표시', '하루가 끝날 때 정산 화면 표시')}
          <div class="list-row"><div class="grow"><b>설정 초기화</b></div><button class="btn small red" data-act="reset">초기화</button></div>
        </div>`;
    }
  }

  onInput(name: string, value: string): void {
    SettingsStore.set(name as NumKey, Number(value) as never);
    if (name === 'uiScale') applyUiScale();
    // 숫자만 갱신 (슬라이더 드래그 유지)
    const row = this.root.querySelector(`[data-input="${name}"]`)?.parentElement?.querySelector('b');
    if (row) {
      const v = Number(value);
      row.textContent = name === 'cameraSpeed' ? `${v.toFixed(1)}x` : `${Math.round(v * 100)}%`;
    }
  }

  onAction(act: string, arg: string): void {
    if (act === 'toggle') {
      const k = arg as BoolKey;
      SettingsStore.set(k, !SettingsStore.value[k] as Settings[BoolKey]);
    } else if (act === 'mode') SettingsStore.set('controlMode', arg as Settings['controlMode']);
    else if (act === 'fps') SettingsStore.set('fpsLimit', Number(arg) as 30 | 60);
    else if (act === 'fullscreen') {
      const d = document as Document & { webkitFullscreenElement?: Element };
      if (document.fullscreenElement || d.webkitFullscreenElement) void document.exitFullscreen?.();
      else {
        void document.documentElement.requestFullscreen?.().then(() => {
          const o = screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
          void o?.lock?.('landscape').catch(() => {});
        });
      }
    } else if (act === 'reset') {
      confirmDialog('설정 초기화', '모든 설정을 기본값으로 되돌릴까요?', '초기화', () => {
        SettingsStore.reset();
        applyUiScale();
        this.refresh();
      });
      return;
    }
    this.refresh();
  }
}
