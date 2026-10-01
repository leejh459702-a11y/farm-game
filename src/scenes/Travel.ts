/** 농장 ↔ 외곽 지역 이동 (로딩 최소화: 씬 sleep/wake) */
import { AppRef } from '../core/AppRef';
import { Session } from '../core/Session';
import type { RegionId } from '../types/game';
import { Panels } from '../ui/PanelManager';

export const REGION_SCENE: Record<RegionId, string> = { river: 'River', forest: 'Forest', hill: 'Hill' };

export function goToRegion(id: RegionId): void {
  const game = AppRef.game;
  const w = Session.world;
  if (!game || !w) return;
  Panels.closeAll();
  w.state.regionsDiscovered = true;
  w.regions.ensureDay(id);
  for (const key of Object.values(REGION_SCENE)) if (game.scene.isActive(key) || game.scene.isSleeping(key)) game.scene.stop(key);
  if (game.scene.isActive('Farm')) game.scene.sleep('Farm');
  game.scene.start(REGION_SCENE[id]);
  Session.location = id;
  Session.app.emit('location', { id });
}

export function goToFarm(): void {
  const game = AppRef.game;
  if (!game || !Session.world) return;
  Panels.closeAll();
  for (const key of Object.values(REGION_SCENE)) if (game.scene.isActive(key)) game.scene.stop(key);
  // 농장 출구 앞에 도착
  const w = Session.world;
  w.state.player.x = 15 * 32 + 16;
  w.state.player.y = 29 * 32 + 26;
  w.state.player.facing = 'up';
  if (game.scene.isSleeping('Farm')) game.scene.wake('Farm');
  else game.scene.start('Farm');
  Session.location = 'farm';
  Session.app.emit('location', { id: 'farm' });
}
