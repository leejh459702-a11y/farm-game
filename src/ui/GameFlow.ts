/** 게임 흐름: 새 게임 / 이어하기 / 메인 메뉴로 */
import { AppRef } from '../core/AppRef';
import { Session } from '../core/Session';
import { createNewGame } from '../core/newGame';
import type { GameState } from '../types/game';
import { mountHud, unmountHud } from './Hud';
import { Panels } from './PanelManager';
import { unmountMainMenu } from './MainMenu';
import { AudioManager } from '../audio/AudioManager';

function launchFarm(): void {
  const game = AppRef.game!;
  unmountMainMenu();
  Panels.closeAll();
  game.scene.stop('Menu');
  game.scene.start('Farm');
  mountHud();
}

export async function startNewGame(slot: number, farmName: string): Promise<void> {
  AudioManager.unlock();
  const state = createNewGame(undefined, farmName || '나의 작은 농장');
  const w = Session.start(state, slot);
  launchFarm();
  w.tutorial.start();
  w.time.startDay();
  // 첫날은 맑음 (튜토리얼 물주기 체험)
  w.state.weather.today = 'sunny';
  w.events.emit('weather', { today: 'sunny' });
  await Session.saveNow(true);
}

export async function continueGame(slot: number): Promise<boolean> {
  AudioManager.unlock();
  const state: GameState | null = await Session.save.load(slot);
  if (!state) return false;
  Session.start(state, slot);
  launchFarm();
  const w = Session.world!;
  // 튜토리얼 중이었다면 현재 단계 재진입
  if (w.tutorial.active) w.events.emit('tutorial', { step: w.tutorial.step });
  return true;
}

export async function quitToMenu(save = true): Promise<void> {
  if (save) await Session.saveNow(true);
  Panels.closeAll();
  unmountHud();
  const game = AppRef.game!;
  game.scene.stop('Farm');
  Session.end();
  game.scene.start('Menu');
}
