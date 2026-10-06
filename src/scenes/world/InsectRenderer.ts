/** 농장 위를 날아다니는 곤충 (탭하면 관찰·도감 등록) */
import Phaser from 'phaser';
import type { World } from '../../core/World';
import { INSECT_BY_ID } from '../../data/insects';
import { DEPTH, TS } from './constants';

export class InsectRenderer {
  private sprites = new Map<string, Phaser.GameObjects.Image>();

  constructor(
    private scene: Phaser.Scene,
    private w: World,
  ) {}

  sync(): void {
    const want = new Set(this.w.insects.visible().map((i) => i.id));
    for (const [id, s] of this.sprites)
      if (!want.has(id)) {
        s.destroy();
        this.sprites.delete(id);
      }
    for (const sp of this.w.insects.visible()) {
      if (this.sprites.has(sp.id)) continue;
      const d = INSECT_BY_ID[sp.insect];
      const x = sp.x * TS + TS / 2;
      const y = sp.y * TS + TS / 2 - 6;
      const img = this.scene.add.image(x, y, `bug_${d.id}`).setScale(0.75).setDepth(DEPTH.objects + y + TS);
      img.setData('spawn', sp.id);
      // 팔랑팔랑 — 종류마다 조금씩 다르게
      const ground = d.shape === 'beetle' || d.shape === 'cricket';
      this.scene.tweens.add({ targets: img, x: x + (ground ? 6 : 14), y: y - (ground ? 0 : 8), duration: ground ? 1800 : 1100 + Math.random() * 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      if (!ground) this.scene.tweens.add({ targets: img, scaleY: 0.55, duration: 160, yoyo: true, repeat: -1 });
      if (d.shape === 'firefly') this.scene.tweens.add({ targets: img, alpha: 0.4, duration: 700, yoyo: true, repeat: -1 });
      this.sprites.set(sp.id, img);
    }
  }

  /** 월드 좌표 근처의 곤충 */
  hit(wx: number, wy: number): string | null {
    let best: string | null = null;
    let bd = 20;
    for (const [id, s] of this.sprites) {
      const d = Math.hypot(s.x - wx, s.y - wy);
      if (d < bd) {
        bd = d;
        best = id;
      }
    }
    return best;
  }

  catchAnim(id: string): void {
    const s = this.sprites.get(id);
    if (!s) return;
    this.sprites.delete(id);
    this.scene.tweens.killTweensOf(s);
    this.scene.tweens.add({ targets: s, y: s.y - 30, alpha: 0, duration: 500, onComplete: () => s.destroy() });
  }
}
