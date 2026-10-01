/** BootScene — 플레이스홀더 그래픽 생성/등록 후 메인 메뉴로 */
import Phaser from 'phaser';
import { Art } from '../assets/AssetRegistry';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    // 실제 아트로 교체하려면 여기서 같은 key 로 로드하면 된다.
    // 예) this.load.spritesheet('player', 'assets/player.png', { frameWidth: 24, frameHeight: 32 });
  }

  create(): void {
    Art.registerPhaser(this);
    document.getElementById('boot-loading')?.remove();
    this.scene.start('Menu');
  }
}
