/** 디자인 이펙트 이미지(fx_*)를 잠깐 띄우는 연출. 에셋이 없으면 아무것도 하지 않는다. */
import type Phaser from 'phaser';
import { Art } from '../../assets/AssetRegistry';
import { DEPTH } from './constants';

export function popFx(scene: Phaser.Scene, key: string, x: number, y: number, size = 22): void {
  if (!Art.has(key) || !scene.textures.exists(key)) return;
  const img = scene.add.image(x, y, key).setDepth(DEPTH.ui - 1);
  const s = size / Math.max(img.width, img.height);
  img.setScale(s * 0.6).setAlpha(0.95);
  scene.tweens.add({ targets: img, scale: s, y: y - 10, duration: 260, ease: 'Back.easeOut' });
  scene.tweens.add({ targets: img, alpha: 0, y: y - 18, delay: 420, duration: 380, onComplete: () => img.destroy() });
}
