/**
 * Session — 현재 플레이 중인 World, 세이브 슬롯, 자동 저장, 앱 수준 이벤트.
 * 씬과 DOM UI 는 모두 Session 을 통해 World 에 접근한다.
 */
import { EventBus } from './EventBus';
import { World } from './World';
import { BALANCE } from '../data/balance';
import { SaveSystem } from '../save/SaveSystem';
import { SettingsStore } from '../services/SettingsStore';
import type { GameState } from '../types/game';

export interface AppEvents {
  /** 카메라를 타일로 이동 */
  focusTile: { x: number; y: number };
  buildMode: { on: boolean; mode?: 'select' | 'land' | 'place'; type?: string };
  /** 건설 모드 내부 상태 변경 → DOM 바 갱신 */
  buildState: void;
  /** 도구 변경 */
  tool: { index: number };
  /** 상호작용 대상 변경 (행동 버튼 라벨) */
  context: { label: string; icon: string; enabled: boolean; hint?: string };
  /** 행동 버튼 눌림 */
  action: void;
  /** 화면 흔들림 / 플로팅 텍스트 등 연출 */
  toast: { text: string; tone?: 'info' | 'good' | 'warn' };
  saved: { slot: number; auto: boolean };
  /** 세션 종료 (메인 메뉴로) */
  quit: void;
  sessionStarted: void;
  /** 선택한 농지 (다중 선택) */
  plotSelection: { keys: string[] };
  /** 튜토리얼 강조 위치 갱신 */
  layout: void;
}

class SessionImpl {
  readonly app = new EventBus<AppEvents>();
  readonly save = new SaveSystem();
  world: World | null = null;
  slot = 1;
  private saveTimer: number | null = null;
  private saving = false;
  private unsub: (() => void)[] = [];

  start(state: GameState, slot: number): World {
    this.end();
    this.slot = slot;
    const w = new World(state);
    this.world = w;
    this.unsub.push(
      w.events.on('majorChange', (e) => {
        if (e.reason === 'dayStart') void this.autoSave(true);
        else this.scheduleAutoSave();
      }),
    );
    this.app.emit('sessionStarted', undefined);
    return w;
  }

  end(): void {
    for (const u of this.unsub) u();
    this.unsub = [];
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.world?.events.clear();
    this.world = null;
  }

  scheduleAutoSave(): void {
    if (!SettingsStore.value.autosave || !this.world) return;
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => void this.autoSave(), BALANCE.autosave.debounceMs);
  }

  async autoSave(force = false): Promise<void> {
    if (!this.world) return;
    if (!force && !SettingsStore.value.autosave) return;
    await this.saveNow(true);
  }

  async saveNow(auto = false): Promise<boolean> {
    if (!this.world || this.saving) return false;
    this.saving = true;
    try {
      await this.save.save(this.slot, this.world.state);
      this.app.emit('saved', { slot: this.slot, auto });
      return true;
    } catch (e) {
      console.error('save failed', e);
      return false;
    } finally {
      this.saving = false;
    }
  }

  /** 페이지 종료/백그라운드 전환 시 즉시 저장 */
  installLifecycleSave(): void {
    const handler = () => {
      if (this.world && SettingsStore.value.autosave) void this.saveNow(true);
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') handler();
    });
    window.addEventListener('pagehide', handler);
  }
}

export const Session = new SessionImpl();
