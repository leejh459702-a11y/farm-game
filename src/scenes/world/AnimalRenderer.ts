/** 동물 스프라이트 — 축사 앞 배회 (화면 밖은 정지) */
import Phaser from 'phaser';
import type { World } from '../../core/World';
import type { BuildingRenderer } from './BuildingRenderer';
import { DEPTH, TS } from './constants';

interface AnimalVis {
  id: string;
  sprite: Phaser.GameObjects.Sprite;
  tx: number;
  ty: number;
  wait: number;
  frameT: number;
  heart?: Phaser.GameObjects.Image;
}

export class AnimalRenderer {
  private vis = new Map<string, AnimalVis>();

  constructor(
    private scene: Phaser.Scene,
    private w: World,
    private buildings: BuildingRenderer,
  ) {}

  syncAll(): void {
    const alive = new Set<string>();
    for (const a of this.w.animals.list()) {
      if (!a.buildingUid) continue;
      alive.add(a.id);
      let v = this.vis.get(a.id);
      if (!v) {
        const pen = this.buildings.penTiles(a.buildingUid);
        const t = pen.length ? pen[Math.floor(Math.random() * pen.length)] : this.fallback(a.buildingUid);
        const sprite = this.scene.add.sprite(t.x * TS + TS / 2, t.y * TS + TS - 4, `an_${a.species}`, 0).setOrigin(0.5, 1);
        v = { id: a.id, sprite, tx: sprite.x, ty: sprite.y, wait: Math.random() * 2, frameT: 0 };
        this.vis.set(a.id, v);
      }
      v.sprite.setScale(a.stage === 'baby' ? 0.62 : a.stage === 'juvenile' ? 0.82 : 1);
      if (a.traits.includes('golden')) v.sprite.setTint(0xffe9a0);
      else if (a.traits.includes('colorvar')) v.sprite.setTint(0xe0d0ff);
      else v.sprite.clearTint();
      v.sprite.setData('animalId', a.id);
    }
    for (const [id, v] of this.vis) {
      if (!alive.has(id)) {
        v.sprite.destroy();
        v.heart?.destroy();
        this.vis.delete(id);
      }
    }
  }

  /** 축사 이동 시 위치 재설정 */
  resetPositions(): void {
    for (const v of this.vis.values()) {
      v.sprite.destroy();
      v.heart?.destroy();
    }
    this.vis.clear();
    this.syncAll();
  }

  private fallback(uid: string): { x: number; y: number } {
    const f = this.w.frontOf(uid);
    return f ?? { x: 15, y: 15 };
  }

  update(dt: number, view: Phaser.Geom.Rectangle): void {
    for (const v of this.vis.values()) {
      const s = v.sprite;
      const visible = s.x > view.x - 64 && s.x < view.right + 64 && s.y > view.y - 64 && s.y < view.bottom + 64;
      s.setVisible(visible);
      if (!visible) continue;
      const a = this.w.animals.get(v.id);
      if (!a || !a.buildingUid) continue;
      if (v.wait > 0) {
        v.wait -= dt;
        if (v.wait <= 0) {
          const pen = this.buildings.penTiles(a.buildingUid);
          const t = pen.length ? pen[Math.floor(Math.random() * pen.length)] : this.fallback(a.buildingUid);
          v.tx = t.x * TS + 6 + Math.random() * (TS - 12);
          v.ty = t.y * TS + TS - 4 - Math.random() * 6;
        }
      } else {
        const dx = v.tx - s.x;
        const dy = v.ty - s.y;
        const d = Math.hypot(dx, dy);
        const speed = 18;
        if (d < 1) {
          v.wait = 1.5 + Math.random() * 4;
          s.setFrame(0);
        } else {
          s.x += (dx / d) * Math.min(d, speed * dt);
          s.y += (dy / d) * Math.min(d, speed * dt);
          s.setFlipX(dx < 0);
          v.frameT += dt;
          s.setFrame(Math.floor(v.frameT * 6) % 2);
        }
      }
      s.setDepth(DEPTH.objects + s.y);
      if (v.heart) v.heart.setPosition(s.x, s.y - s.displayHeight - 4);
    }
  }

  hit(wx: number, wy: number): string | null {
    let best: { id: string; d: number } | null = null;
    for (const v of this.vis.values()) {
      if (!v.sprite.visible) continue;
      const s = v.sprite;
      const cx = s.x;
      const cy = s.y - s.displayHeight / 2;
      const d = Math.hypot(wx - cx, wy - cy);
      if (d < Math.max(14, s.displayWidth * 0.6) && (!best || d < best.d)) best = { id: v.id, d };
    }
    return best?.id ?? null;
  }

  showHeart(id: string): void {
    const v = this.vis.get(id);
    if (!v) return;
    v.heart?.destroy();
    const h = this.scene.add.image(v.sprite.x, v.sprite.y - v.sprite.displayHeight - 4, 'ic_heart').setDepth(DEPTH.ui - 5);
    v.heart = h;
    this.scene.tweens.add({ targets: h, alpha: 0, y: '-=10', duration: 1200, onComplete: () => (h.destroy(), v.heart === h && (v.heart = undefined)) });
  }

  spriteOf(id: string): Phaser.GameObjects.Sprite | undefined {
    return this.vis.get(id)?.sprite;
  }
}
