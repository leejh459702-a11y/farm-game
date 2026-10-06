/** 작물 스프라이트 — 오브젝트 풀 + 화면 밖 컬링 + dirty 갱신 */
import Phaser from 'phaser';
import { CROP_BY_ID } from '../../data/crops';
import { canGrowToday, cropStage, seasonAllowsGrowth } from '../../systems/CropSystem';
import type { World } from '../../core/World';
import { CROP_FH } from '../../assets/art/crops';
import { DEPTH, TS } from './constants';

export class CropRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();
  /** 물이 필요한 작물 표시 */
  private drops = new Map<string, Phaser.GameObjects.Image>();
  private pool: Phaser.GameObjects.Image[] = [];

  constructor(
    private scene: Phaser.Scene,
    private w: World,
  ) {}

  private acquire(): Phaser.GameObjects.Image {
    const s = this.pool.pop() ?? this.scene.add.image(0, 0, 'px');
    s.setActive(true).setVisible(true);
    return s;
  }

  private release(s: Phaser.GameObjects.Image): void {
    s.setActive(false).setVisible(false);
    this.pool.push(s);
  }

  syncAll(): void {
    const seen = new Set<string>();
    for (const [k, p] of Object.entries(this.w.state.plots)) {
      if (p.greenhouse || !p.cropId) continue;
      seen.add(k);
      this.update(k);
    }
    for (const [k, s] of this.sprites) {
      if (!seen.has(k)) {
        this.release(s);
        this.sprites.delete(k);
      }
    }
    for (const [k, d] of this.drops) {
      if (!seen.has(k)) {
        d.destroy();
        this.drops.delete(k);
      }
    }
  }

  sync(keys: string[] | 'all'): void {
    if (keys === 'all') return this.syncAll();
    for (const k of keys) this.update(k);
  }

  private update(k: string): void {
    if (k.startsWith('gh:')) return;
    const p = this.w.state.plots[k];
    let s = this.sprites.get(k);
    const needWater = !!p && !!p.cropId && !p.mature && !p.wateredToday && !CROP_BY_ID[p.cropId]?.fruitTree;
    let d = this.drops.get(k);
    if (needWater && !d) {
      d = this.scene.add.image(0, 0, 'ic_drop').setDepth(DEPTH.ui - 40).setAlpha(0.95);
      this.drops.set(k, d);
      this.scene.tweens.add({ targets: d, y: '-=3', duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (!needWater && d) {
      d.destroy();
      this.drops.delete(k);
      d = undefined;
    }
    if (d && p) d.setPosition(p.x * TS + TS - 7, p.y * TS + 2);
    if (!p || !p.cropId) {
      if (s) {
        this.release(s);
        this.sprites.delete(k);
      }
      return;
    }
    if (!s) {
      s = this.acquire();
      this.sprites.set(k, s);
    }
    const c = CROP_BY_ID[p.cropId];
    const stage = cropStage(p);
    s.setTexture(c.spriteKey, stage);
    // 프레임 내 지면선 = CROP_FH-10
    s.setOrigin(0.5, (CROP_FH - 10) / CROP_FH);
    s.setPosition(p.x * TS + TS / 2, p.y * TS + TS / 2 + 6);
    s.setDepth(DEPTH.objects + p.y * TS + TS / 2);
    // 겨울 야외의 비겨울 작물은 살짝 탁하게 (성장 정지 표시)
    const inSeason = c.fruitTree ? canGrowToday({ ...p, wateredToday: true }, this.w.cal.season) : seasonAllowsGrowth(c.id, this.w.cal.season, !!p.greenhouse);
    s.setTint(inSeason || stage === 4 ? 0xffffff : 0xc8c0b0);
  }

  /** 화면 밖 작물 숨김 */
  cull(view: Phaser.Geom.Rectangle): void {
    const m = TS * 2;
    for (const s of this.sprites.values()) s.setVisible(s.x > view.x - m && s.x < view.right + m && s.y > view.y - m && s.y < view.bottom + m * 2);
    for (const d of this.drops.values()) d.setVisible(d.x > view.x - m && d.x < view.right + m && d.y > view.y - m && d.y < view.bottom + m * 2);
  }

  refreshTints(): void {
    for (const k of this.sprites.keys()) this.update(k);
  }
}
