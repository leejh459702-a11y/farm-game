import Phaser from 'phaser';
import { createState } from './core/state';
import { GameEngine } from './core/GameEngine';
import { FarmScene } from './scenes/FarmScene';
import { UIManager } from './ui/UIManager';
import './ui/style.css';
const engine = new GameEngine(createState());
const scene = new FarmScene(engine);
const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 1280,
  height: 720,
  backgroundColor: '#9bb976',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
  input: { activePointers: 3 },
  scene: [scene],
  fps: { target: 60, forceSetTimeOut: false },
});
const ui = new UIManager(engine, scene, game);
void ui.init().then(async () => {
  if (import.meta.env.DEV && new URLSearchParams(location.search).get('qa') === 'late') {
    const { lateFarm } = await import('./dev/scenarios');
    ui.saves = new (await import('./save/SaveSystem')).SaveSystem('my-little-farm-qa');
    ui.start(lateFarm(), 3);
  }
});
if ('serviceWorker' in navigator && !import.meta.env.DEV)
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register('./sw.js')
      .catch(() => ui.toast('오프라인 캐시를 준비하지 못했어요. 온라인에서는 플레이할 수 있어요.'));
  });
window.addEventListener('visibilitychange', () => {
  if (document.hidden) ui.background();
  else ui.foreground();
});
window.addEventListener('pagehide', () => ui.background());
if (import.meta.hot) import.meta.hot.dispose(() => ui.background());
if (import.meta.env.DEV) (window as unknown as { farm: unknown }).farm = { engine, scene, ui };
