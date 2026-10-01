/** 플레이어 이동 (조이스틱/키보드/탭 이동), 충돌, 방향, 경로 이동 */
import Phaser from 'phaser';
import type { Facing } from '../../types/game';
import type { World } from '../../core/World';
import { InputState } from '../InputState';
import { findPath } from './Pathfinder';
import { DEPTH, FH, FW, TS } from './constants';

const SPEED = 128; // px/s
const HALF_W = 6;
const FOOT_H = 5;

/** 플레이어가 걸어 다니는 지도 (농장 / 외곽 지역) */
export interface WalkMap {
  width: number;
  height: number;
  blocked(x: number, y: number): boolean;
}

export class PlayerController {
  sprite!: Phaser.GameObjects.Sprite;
  private path: { x: number; y: number }[] = [];
  private onArrive: (() => void) | null = null;
  private faceTarget: { x: number; y: number } | null = null;
  private animT = 0;
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  moving = false;
  enabled = true;

  private map: WalkMap;
  /** 위치를 세이브(state.player)에 기록할지 — 농장에서만 */
  private persist: boolean;

  constructor(
    private scene: Phaser.Scene,
    private w: World,
    map?: WalkMap,
    private start?: { x: number; y: number },
  ) {
    this.persist = !map;
    this.map = map ?? { width: FW, height: FH, blocked: (x, y) => this.w.grid.isBlocked(x, y) };
  }

  create(): void {
    const p = this.start ?? this.w.state.player;
    this.sprite = this.scene.add.sprite(p.x, p.y, 'player', 0).setOrigin(0.5, 0.94);
    const kb = this.scene.input.keyboard;
    if (kb) {
      for (const k of ['W', 'A', 'S', 'D', 'UP', 'DOWN', 'LEFT', 'RIGHT']) this.keys[k] = kb.addKey(k, false);
    }
    this.ensureFree();
    this.applyFrame();
  }

  /** 현재 위치가 막혀 있으면 가까운 빈 칸으로 */
  ensureFree(): void {
    const t = this.tile();
    if (!this.map.blocked(t.x, t.y)) return;
    for (let r = 1; r < 30; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          const x = t.x + dx;
          const y = t.y + dy;
          if (x >= 0 && y >= 0 && x < this.map.width && y < this.map.height && !this.map.blocked(x, y)) {
            this.setPos(x * TS + TS / 2, y * TS + TS - 6);
            return;
          }
        }
  }

  setPos(x: number, y: number): void {
    this.sprite.setPosition(x, y);
    if (this.persist) {
      this.w.state.player.x = x;
      this.w.state.player.y = y;
    }
  }

  tile(): { x: number; y: number } {
    return { x: Math.floor(this.sprite.x / TS), y: Math.floor((this.sprite.y - 2) / TS) };
  }

  facingTile(): { x: number; y: number } {
    const f = this.w.state.player.facing;
    const d = 20;
    const ox = f === 'left' ? -d : f === 'right' ? d : 0;
    const oy = f === 'up' ? -d - 4 : f === 'down' ? d - 4 : -4;
    return { x: Math.floor((this.sprite.x + ox) / TS), y: Math.floor((this.sprite.y + oy) / TS) };
  }

  private blockedAt(px: number, py: number): boolean {
    if (px < 2 || py < 2 || px > this.map.width * TS - 2 || py > this.map.height * TS - 1) return true;
    return this.map.blocked(Math.floor(px / TS), Math.floor(py / TS));
  }

  private canStand(x: number, y: number): boolean {
    return !this.blockedAt(x - HALF_W, y - FOOT_H) && !this.blockedAt(x + HALF_W, y - FOOT_H) && !this.blockedAt(x - HALF_W, y) && !this.blockedAt(x + HALF_W, y);
  }

  walkTo(goals: { x: number; y: number }[], face: { x: number; y: number } | null, onArrive: () => void): boolean {
    const t = this.tile();
    const valid = goals.filter((g) => g.x >= 0 && g.y >= 0 && g.x < this.map.width && g.y < this.map.height && !this.map.blocked(g.x, g.y));
    const path = findPath(t.x, t.y, valid, (x, y) => this.map.blocked(x, y), 2500, this.map.width, this.map.height);
    if (!path) return false;
    this.path = path;
    this.onArrive = onArrive;
    this.faceTarget = face;
    if (!path.length) this.arrive();
    return true;
  }

  cancelPath(): void {
    this.path = [];
    this.onArrive = null;
    this.faceTarget = null;
  }

  private arrive(): void {
    if (this.faceTarget) {
      const t = this.tile();
      const dx = this.faceTarget.x - t.x;
      const dy = this.faceTarget.y - t.y;
      if (dx !== 0 || dy !== 0) this.w.state.player.facing = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    }
    const cb = this.onArrive;
    this.cancelPath();
    this.applyFrame();
    cb?.();
  }

  update(dt: number): void {
    let vx = 0;
    let vy = 0;
    let maxStep = Infinity;
    if (this.enabled) {
      if (InputState.joyActive) {
        vx = InputState.joyX;
        vy = InputState.joyY;
      }
      const k = this.keys;
      if (k.A?.isDown || k.LEFT?.isDown) vx -= 1;
      if (k.D?.isDown || k.RIGHT?.isDown) vx += 1;
      if (k.W?.isDown || k.UP?.isDown) vy -= 1;
      if (k.S?.isDown || k.DOWN?.isDown) vy += 1;
    }
    const manual = Math.hypot(vx, vy) > 0.15;
    if (manual) this.cancelPath();
    else if (this.path.length) {
      const next = this.path[0];
      const tx = next.x * TS + TS / 2;
      const ty = next.y * TS + TS - 6;
      const dx = tx - this.sprite.x;
      const dy = ty - this.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < 3) {
        this.path.shift();
        if (!this.path.length) {
          this.arrive();
          this.moving = false;
          return;
        }
      } else {
        vx = dx / d;
        vy = dy / d;
        maxStep = d; // 프레임이 길어도 목표 칸을 지나치지 않도록
      }
    }
    const len = Math.hypot(vx, vy);
    this.moving = len > 0.15;
    if (this.moving) {
      if (len > 1) {
        vx /= len;
        vy /= len;
      }
      const sp = Math.min(SPEED * Math.min(1, Math.max(len, 0.45)), maxStep / Math.max(dt, 1e-4));
      const nx = this.sprite.x + vx * sp * dt;
      const ny = this.sprite.y + vy * sp * dt;
      if (this.canStand(nx, this.sprite.y)) this.sprite.x = nx;
      if (this.canStand(this.sprite.x, ny)) this.sprite.y = ny;
      const f: Facing = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'right' : 'left') : vy > 0 ? 'down' : 'up';
      this.w.state.player.facing = f;
      this.animT += dt;
      if (this.persist) {
        this.w.state.player.x = this.sprite.x;
        this.w.state.player.y = this.sprite.y;
      }
    } else this.animT = 0;
    this.applyFrame();
    this.sprite.setDepth(DEPTH.objects + this.sprite.y);
  }

  private applyFrame(): void {
    const f = this.w.state.player.facing;
    const base = f === 'down' ? 0 : f === 'up' ? 3 : 6;
    const step = this.moving ? [1, 0, 2, 0][Math.floor(this.animT * 8) % 4] : 0;
    this.sprite.setFrame(base + step);
    this.sprite.setFlipX(f === 'left');
  }
}
