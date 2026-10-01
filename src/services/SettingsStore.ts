/** 설정 — localStorage 저장 (세이브 슬롯과 독립) */
import type { Settings } from '../types/game';
import { EventBus } from '../core/EventBus';

const KEY = 'my-little-farm:settings';

export const DEFAULT_SETTINGS: Settings = {
  bgmVolume: 0.5,
  sfxVolume: 0.7,
  ambientVolume: 0.5,
  uiVolume: 0.6,
  uiScale: 1,
  cameraSpeed: 1,
  vibration: true,
  joystickOpacity: 0.6,
  controlMode: 'joystick',
  fpsLimit: 60,
  screenShake: true,
  autosave: true,
  showDaySummary: true,
};

class Store {
  readonly events = new EventBus<{ change: Settings }>();
  value: Settings;
  constructor() {
    let v: Partial<Settings> = {};
    try {
      v = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      v = {};
    }
    this.value = { ...DEFAULT_SETTINGS, ...v };
  }
  set<K extends keyof Settings>(k: K, val: Settings[K]): void {
    this.value[k] = val;
    try {
      localStorage.setItem(KEY, JSON.stringify(this.value));
    } catch {
      /* 저장 불가 환경 */
    }
    this.events.emit('change', this.value);
  }
  reset(): void {
    this.value = { ...DEFAULT_SETTINGS };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.value));
    } catch {
      /* noop */
    }
    this.events.emit('change', this.value);
  }
}

export const SettingsStore = typeof localStorage !== 'undefined' ? new Store() : (null as unknown as Store);

export function vibrate(ms: number | number[]): void {
  if (SettingsStore?.value.vibration && typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(ms);
    } catch {
      /* noop */
    }
  }
}
