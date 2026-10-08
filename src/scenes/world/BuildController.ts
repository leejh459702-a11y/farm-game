/**
 * BuildController — 건설 모드 (시간 정지).
 * 설치 / 이동 / 회전 / 철거 / 다중 선택 / 여러 시설 이동 / 토지 구매.
 */
import Phaser from 'phaser';
import { Art } from '../../assets/AssetRegistry';
import { BUILDING_BY_ID, footprint } from '../../data/buildings';
import type { World } from '../../core/World';
import { Session } from '../../core/Session';
import type { BuildingRenderer } from './BuildingRenderer';
import { DEPTH, TS } from './constants';

export type BuildMode = 'select' | 'place' | 'move' | 'land';

export class BuildController {
  active = false;
  mode: BuildMode = 'select';
  placeType: string | null = null;
  rot: 0 | 1 = 0;
  ghost = { x: 0, y: 0 };
  selected = new Set<string>();
  multi = false;
  /** 튜토리얼 집 배치 (무료, 취소 불가) */
  tutorialHouse = false;
  /** 이동 모드: 원래 위치 대비 오프셋 */
  moveDelta = { x: 0, y: 0 };
  moveRot: 0 | 1 = 0;
  lastMessage = '';
  private gfx!: Phaser.GameObjects.Graphics;
  private ghostImgs: Phaser.GameObjects.Image[] = [];

  constructor(
    private scene: Phaser.Scene,
    private w: World,
    private buildings: BuildingRenderer,
  ) {}

  create(): void {
    this.gfx = this.scene.add.graphics().setDepth(DEPTH.ui - 10);
  }

  enter(mode: BuildMode = 'select', type?: string): void {
    this.active = true;
    this.w.time.pause('build');
    this.selected.clear();
    this.setMode(mode, type);
  }

  exit(): void {
    this.active = false;
    this.tutorialHouse = false;
    this.w.time.resume('build');
    this.selected.clear();
    this.placeType = null;
    this.clearGhost();
    this.gfx.clear();
    this.buildings.highlight(new Set(), new Set());
    this.emit();
  }

  setMode(mode: BuildMode, type?: string): void {
    this.mode = mode;
    this.clearGhost();
    if (mode === 'place' && type) {
      this.placeType = type;
      this.rot = 0;
      const c = this.viewCenterTile();
      const { w, h } = footprint(type, 0);
      this.ghost = { x: c.x - Math.floor(w / 2), y: c.y - Math.floor(h / 2) };
      this.snapGhostToValid();
    } else if (mode === 'move') {
      this.moveDelta = { x: 0, y: 0 };
      const only = this.selected.size === 1 ? this.w.state.buildings[[...this.selected][0]] : null;
      this.moveRot = only?.rot ?? 0;
    } else if (mode !== 'place') this.placeType = null;
    this.redraw();
    this.emit();
  }

  private viewCenterTile(): { x: number; y: number } {
    const cam = this.scene.cameras.main;
    return { x: Math.floor(cam.midPoint.x / TS), y: Math.floor(cam.midPoint.y / TS) };
  }

  /** 설치 가능한 가장 가까운 위치로 고스트 이동 */
  private snapGhostToValid(): void {
    if (!this.placeType) return;
    if (this.w.grid.canPlace(this.placeType, this.ghost.x, this.ghost.y, this.rot).ok) return;
    let best: { x: number; y: number; d: number } | null = null;
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++)
        if (this.w.grid.canPlace(this.placeType, x, y, this.rot).ok) {
          const d = Math.abs(x - this.ghost.x) + Math.abs(y - this.ghost.y);
          if (!best || d < best.d) best = { x, y, d };
        }
    if (best) this.ghost = { x: best.x, y: best.y };
  }

  emit(): void {
    Session.app.emit('buildState', undefined);
  }

  private clearGhost(): void {
    for (const g of this.ghostImgs) g.destroy();
    this.ghostImgs = [];
  }

  // ───── 입력 ─────
  /** 탭 처리 */
  tap(tx: number, ty: number): void {
    const g = this.w.grid;
    if (this.mode === 'place' && this.placeType) {
      const { w, h } = footprint(this.placeType, this.rot);
      this.ghost = { x: tx - Math.floor((w - 1) / 2), y: ty - Math.floor((h - 1) / 2) };
      this.redraw();
      this.emit();
      return;
    }
    if (this.mode === 'move') {
      const anchor = this.moveAnchor();
      if (anchor) {
        this.moveDelta = { x: tx - anchor.x, y: ty - anchor.y };
        this.redraw();
        this.emit();
      }
      return;
    }
    if (this.mode === 'land') {
      const c = this.w.land.check(tx, ty);
      Session.app.emit('buildState', undefined);
      this.landTap?.(tx, ty, c);
      return;
    }
    // select
    const b = g.buildingAt(tx, ty);
    if (b) {
      if (this.multi) {
        if (this.selected.has(b.uid)) this.selected.delete(b.uid);
        else this.selected.add(b.uid);
      } else {
        const was = this.selected.has(b.uid) && this.selected.size === 1;
        this.selected.clear();
        if (!was) this.selected.add(b.uid);
      }
    } else if (!this.multi) this.selected.clear();
    this.redraw();
    this.emit();
  }

  /** 토지 탭 콜백 (DOM 이 확인창 처리) */
  landTap: ((x: number, y: number, c: { ok: boolean; reason?: string; price: number }) => void) | null = null;

  /** 드래그로 고스트를 옮기는 중인지 판정 */
  isOnGhost(tx: number, ty: number): boolean {
    if (this.mode === 'place' && this.placeType) {
      const { w, h } = footprint(this.placeType, this.rot);
      return tx >= this.ghost.x && ty >= this.ghost.y && tx < this.ghost.x + w && ty < this.ghost.y + h;
    }
    if (this.mode === 'move') {
      for (const uid of this.selected) {
        const b = this.w.state.buildings[uid];
        const rot = this.selected.size === 1 ? this.moveRot : b.rot;
        const { w, h } = footprint(b.type, rot);
        const x = b.x + this.moveDelta.x;
        const y = b.y + this.moveDelta.y;
        if (tx >= x && ty >= y && tx < x + w && ty < y + h) return true;
      }
    }
    return false;
  }

  dragGhostBy(dx: number, dy: number): void {
    if (!dx && !dy) return;
    if (this.mode === 'place') {
      this.ghost.x += dx;
      this.ghost.y += dy;
    } else if (this.mode === 'move') {
      this.moveDelta.x += dx;
      this.moveDelta.y += dy;
    }
    this.redraw();
    this.emit();
  }

  private moveAnchor(): { x: number; y: number } | null {
    if (!this.selected.size) return null;
    let minX = Infinity;
    let minY = Infinity;
    for (const uid of this.selected) {
      const b = this.w.state.buildings[uid];
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
    }
    return { x: minX, y: minY };
  }

  // ───── 동작 ─────
  rotate(): void {
    if (this.mode === 'place' && this.placeType && BUILDING_BY_ID[this.placeType].rotatable) {
      this.rot = this.rot ? 0 : 1;
      this.redraw();
      this.emit();
      return;
    }
    if (this.mode === 'move' && this.selected.size === 1) {
      const b = this.w.state.buildings[[...this.selected][0]];
      if (BUILDING_BY_ID[b.type].rotatable) {
        this.moveRot = this.moveRot ? 0 : 1;
        this.redraw();
        this.emit();
      }
      return;
    }
    if (this.mode === 'select' && this.selected.size === 1) {
      const b = this.w.state.buildings[[...this.selected][0]];
      if (!BUILDING_BY_ID[b.type].rotatable) return this.msg('회전할 수 없는 시설입니다');
      const r = this.w.grid.move(b.uid, b.x, b.y, b.rot ? 0 : 1);
      if (!r.ok) this.msg(r.reason ?? '회전할 수 없습니다');
      this.redraw();
      this.emit();
    }
  }

  placeValid(): { ok: boolean; reason?: string } {
    if (this.mode === 'place' && this.placeType) {
      const c = this.w.grid.canPlace(this.placeType, this.ghost.x, this.ghost.y, this.rot);
      if (!c.ok) return c;
      const d = BUILDING_BY_ID[this.placeType];
      const free = this.tutorialHouse || (this.w.state.buildStock[this.placeType] ?? 0) > 0;
      if (!free && this.w.state.gold < d.price) return { ok: false, reason: '골드가 부족합니다' };
      if (!free && !this.w.inventory.hasMats(d.materials)) return { ok: false, reason: '건설 재료가 부족합니다 (목재·돌 등)' };
      return { ok: true };
    }
    if (this.mode === 'move') {
      if (this.selected.size === 1) {
        const b = this.w.state.buildings[[...this.selected][0]];
        return this.w.grid.canPlace(b.type, b.x + this.moveDelta.x, b.y + this.moveDelta.y, this.moveRot, new Set([b.uid]));
      }
      for (const uid of this.selected) {
        const b = this.w.state.buildings[uid];
        const c = this.w.grid.canPlace(b.type, b.x + this.moveDelta.x, b.y + this.moveDelta.y, b.rot, this.selected);
        if (!c.ok) return c;
      }
      return { ok: true };
    }
    return { ok: false };
  }

  confirm(): { ok: boolean; reason?: string; uid?: string } {
    if (this.mode === 'place' && this.placeType) {
      const r = this.w.grid.place(this.placeType, this.ghost.x, this.ghost.y, this.rot, { free: this.tutorialHouse });
      if (!r.ok) return r;
      const type = this.placeType;
      if (this.tutorialHouse) {
        this.tutorialHouse = false;
        return r;
      }
      // 같은 시설 연속 설치 (장식 등) — 비용/재고가 허락하면 유지
      const d = BUILDING_BY_ID[type];
      const canMore = type !== 'house' && ((this.w.state.buildStock[type] ?? 0) > 0 || (this.w.state.gold >= d.price && d.category === 'decoration' && this.w.inventory.hasMats(d.materials)));
      if (canMore) {
        this.snapGhostToValid();
        this.redraw();
      } else this.setMode('select');
      this.emit();
      return r;
    }
    if (this.mode === 'move') {
      let r: { ok: boolean; reason?: string };
      if (this.selected.size === 1) {
        const b = this.w.state.buildings[[...this.selected][0]];
        r = this.w.grid.move(b.uid, b.x + this.moveDelta.x, b.y + this.moveDelta.y, this.moveRot);
      } else r = this.w.grid.moveMany([...this.selected], this.moveDelta.x, this.moveDelta.y);
      if (r.ok) this.setMode('select');
      return r;
    }
    return { ok: false };
  }

  removeSelected(): { ok: boolean; reason?: string; count: number } {
    let count = 0;
    let reason: string | undefined;
    for (const uid of [...this.selected]) {
      const r = this.w.grid.remove(uid);
      if (r.ok) {
        count++;
        this.selected.delete(uid);
      } else reason = r.reason;
    }
    this.redraw();
    this.emit();
    return { ok: count > 0, reason, count };
  }

  private msg(t: string): void {
    this.lastMessage = t;
    Session.app.emit('toast', { text: t, tone: 'warn' });
  }

  // ───── 그리기 ─────
  redraw(): void {
    if (!this.active) return;
    const g = this.gfx;
    g.clear();
    this.clearGhost();
    // 소유 타일 그리드
    g.lineStyle(1, 0xffffff, 0.22);
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) if (this.w.grid.isOwned(x, y)) g.strokeRect(x * TS + 0.5, y * TS + 0.5, TS - 1, TS - 1);
    const ghostUids = new Set<string>();
    if (this.mode === 'land') {
      const cands = this.w.land.candidates();
      const can = this.w.grid.ownedCount() < this.w.land.cap();
      for (const c of cands) {
        g.fillStyle(can ? 0x6ad84a : 0xc8483a, 0.5).fillRect(c.x * TS + 2, c.y * TS + 2, TS - 4, TS - 4);
        g.lineStyle(2, can ? 0xeaffd8 : 0xffd0c8, 0.9).strokeRect(c.x * TS + 3, c.y * TS + 3, TS - 6, TS - 6);
      }
    }
    if (this.mode === 'place' && this.placeType) {
      const { w, h } = footprint(this.placeType, this.rot);
      const ok = this.placeValid().ok;
      this.drawFootprint(this.ghost.x, this.ghost.y, w, h, ok);
      const img = this.scene.add.image(this.ghost.x * TS, (this.ghost.y + h) * TS, this.buildings.textureFor(this.placeType, this.rot)).setScale(Art.scale(this.buildings.textureFor(this.placeType, this.rot))).setOrigin(0, 1).setAlpha(0.6).setDepth(DEPTH.ui - 15);
      if (!ok) img.setTint(0xff9a8a);
      this.ghostImgs.push(img);
    }
    if (this.mode === 'move') {
      const ok = this.placeValid().ok;
      for (const uid of this.selected) {
        const b = this.w.state.buildings[uid];
        const rot = this.selected.size === 1 ? this.moveRot : b.rot;
        const { w, h } = footprint(b.type, rot);
        const x = b.x + this.moveDelta.x;
        const y = b.y + this.moveDelta.y;
        this.drawFootprint(x, y, w, h, ok);
        const img = this.scene.add.image(x * TS, (y + h) * TS, this.buildings.textureFor(b.type, rot)).setScale(Art.scale(this.buildings.textureFor(b.type, rot))).setOrigin(0, 1).setAlpha(0.7).setDepth(DEPTH.ui - 15);
        if (!ok) img.setTint(0xff9a8a);
        this.ghostImgs.push(img);
        ghostUids.add(uid);
      }
    }
    // 선택 강조
    for (const uid of this.selected) {
      const b = this.w.state.buildings[uid];
      if (!b || ghostUids.has(uid)) continue;
      const { w, h } = footprint(b.type, b.rot);
      g.lineStyle(3, 0xf2c83a, 1).strokeRect(b.x * TS + 1, b.y * TS + 1, w * TS - 2, h * TS - 2);
    }
    this.buildings.highlight(this.mode === 'move' ? new Set() : this.selected, ghostUids);
  }

  private drawFootprint(x: number, y: number, w: number, h: number, ok: boolean): void {
    const g = this.gfx;
    const c = ok ? 0x5ad84a : 0xe8483a;
    for (let ty = y; ty < y + h; ty++)
      for (let tx = x; tx < x + w; tx++) {
        g.fillStyle(c, 0.42).fillRect(tx * TS + 1, ty * TS + 1, TS - 2, TS - 2);
        g.lineStyle(1, ok ? 0xeaffd8 : 0xffd0c8, 0.7).strokeRect(tx * TS + 1.5, ty * TS + 1.5, TS - 3, TS - 3);
      }
    g.lineStyle(3, ok ? 0x2a8a1a : 0xb82a1a, 1).strokeRect(x * TS, y * TS, w * TS, h * TS);
  }
}
