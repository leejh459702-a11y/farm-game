/**
 * 나의 작은 농장 — 진입점
 * Phaser 3 (월드/카메라/입력/조명) + 경량 DOM UI 레이어 (텍스트 중심 패널/HUD)
 */
import Phaser from 'phaser';
import './ui/styles.css';
import fontRegular from 'galmuri/dist/Galmuri11.woff2?url';
import fontBold from 'galmuri/dist/Galmuri11-Bold.woff2?url';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { FarmScene } from './scenes/FarmScene';
import { OverlayScene } from './scenes/OverlayScene';
import { ControlsScene } from './scenes/ControlsScene';
import { RegionScene } from './scenes/RegionScene';
import { AppRef } from './core/AppRef';
import { Session } from './core/Session';
import { installOpeners, openPanel } from './ui/openers';
import { loadArtOverrides } from './assets/ArtOverrides';
import { applyUiScale } from './ui/panels/SettingsPanel';
import { SettingsStore } from './services/SettingsStore';
import { AudioManager } from './audio/AudioManager';
import { Bridge } from './scenes/Bridge';
import { Panels } from './ui/PanelManager';

async function loadFonts(): Promise<void> {
  try {
    const faces = [new FontFace('Galmuri11', `url(${fontRegular})`), new FontFace('Galmuri11', `url(${fontBold})`, { weight: 'bold' })];
    await Promise.all(
      faces.map(async (f) => {
        await f.load();
        document.fonts.add(f);
      }),
    );
  } catch (e) {
    console.warn('폰트 로드 실패 — 시스템 글꼴 사용', e);
  }
}

function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator) || import.meta.env.DEV) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((e) => console.warn('SW 등록 실패', e));
  });
}

async function boot(): Promise<void> {
  applyUiScale();
  await Promise.all([loadFonts(), loadArtOverrides()]);
  installOpeners();
  Session.installLifecycleSave();
  // 첫 사용자 입력에서 오디오 활성화 (모바일 자동재생 정책)
  const unlock = () => AudioManager.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
  // 컨텍스트 메뉴/핀치 기본 동작 차단
  window.addEventListener('contextmenu', (e) => e.preventDefault());
  document.addEventListener('gesturestart', (e) => e.preventDefault());

  AppRef.game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#2b1f19',
    pixelArt: true,
    roundPixels: true,
    antialias: false,
    scale: {
      mode: Phaser.Scale.EXPAND,
      width: 1280,
      height: 720,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    input: { activePointers: 3 },
    fps: { target: SettingsStore.value.fpsLimit, limit: SettingsStore.value.fpsLimit, smoothStep: true },
    render: { powerPreference: 'high-performance', batchSize: 4096 },
    scene: [BootScene, MenuScene, FarmScene, new RegionScene('river'), new RegionScene('forest'), new RegionScene('hill'), new RegionScene('mine'), OverlayScene, ControlsScene],
  });
  registerServiceWorker();
  // QA 용 디버그 훅 (?debug)
  if (location.search.includes('debug')) (window as unknown as Record<string, unknown>).__farm = { Session, Bridge, Panels, AppRef, openPanel };
}

void boot();
