/** MenuScene — 시작 화면 배경 (픽셀 풍경 + 구름 + 간판). 버튼은 DOM MainMenu */
import Phaser from 'phaser';
import { Painter, hashRand, shade } from '../assets/painter';
import { mountMainMenu, unmountMainMenu } from '../ui/MainMenu';
import { AudioManager } from '../audio/AudioManager';

function landscape(w: number, h: number): HTMLCanvasElement {
  const p = new Painter(w, h);
  // 하늘
  for (let y = 0; y < h * 0.55; y++) {
    const t = y / (h * 0.55);
    const r = Math.round(120 + 90 * t);
    const g = Math.round(180 + 50 * t);
    const b = Math.round(235 + 10 * t);
    p.rect(0, y, w, 1, (r << 16) | (g << 8) | b);
  }
  const rnd = hashRand(77);
  // 먼 산
  const ridge = (base: number, amp: number, col: number, seed: number) => {
    const r2 = hashRand(seed);
    let y = base;
    for (let x = 0; x < w; x++) {
      y += (r2() - 0.5) * 2.2;
      y = Math.max(base - amp, Math.min(base + amp, y));
      p.rect(x, Math.round(y), 1, h - Math.round(y), col);
    }
  };
  ridge(h * 0.36, h * 0.07, 0x7a9ab8, 3);
  ridge(h * 0.44, h * 0.05, 0x5f8a6a, 5);
  ridge(h * 0.52, h * 0.03, 0x6fae48, 9);
  // 들판
  p.rect(0, Math.round(h * 0.6), w, h, 0x8cc35a);
  for (let i = 0; i < 400; i++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(h * 0.58 + rnd() * h * 0.42);
    p.px(x, y, rnd() < 0.5 ? 0x72ad48 : 0xa6d66c);
  }
  // 강
  for (let y = Math.round(h * 0.56); y < h; y++) {
    const cx = w * 0.62 + Math.sin(y / 9) * 14 + (y - h * 0.56) * 0.6;
    const ww = 4 + (y - h * 0.56) * 0.35;
    p.rect(cx - ww, y, ww * 2, 1, 0x5a9ad8);
    p.px(cx - ww + 2, y, 0x9ad0f0);
  }
  // 밭
  for (let r = 0; r < 4; r++) for (let c = 0; c < 6; c++) {
    const x = Math.round(w * 0.12 + c * 13);
    const y = Math.round(h * 0.72 + r * 9);
    p.rect(x, y, 11, 7, 0x9a6a44).rect(x, y, 11, 1, 0xb07c52);
    p.rect(x + 3, y - 2, 2, 3, 0x5aa83c).rect(x + 7, y - 2, 2, 3, 0x7cbf4a);
  }
  // 집
  const hx = Math.round(w * 0.28);
  const hy = Math.round(h * 0.64);
  p.rect(hx, hy, 26, 16, 0xf2e2c4).tri(hx - 3, hy, hx + 29, hy, hx + 13, hy - 12, 0xc8423a).rect(hx + 11, hy + 7, 5, 9, 0x8a5a3a).rect(hx + 3, hy + 5, 5, 4, 0x9ad0f0);
  // 나무
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(rnd() * w);
    const y = Math.floor(h * 0.6 + rnd() * h * 0.4);
    if (Math.abs(x - w * 0.5) < w * 0.22 && y < h * 0.85) continue;
    p.rect(x - 1, y - 2, 3, 6, 0x6a4a32).circle(x, y - 6, 6, 0x3f8a3c).circle(x - 1, y - 7, 4, 0x5aa83c);
  }
  // 꽃
  for (let i = 0; i < 90; i++) p.px(Math.floor(rnd() * w), Math.floor(h * 0.62 + rnd() * h * 0.38), [0xf7a8c4, 0xfff4d6, 0xf7d84a, 0xe8584a][i % 4]);
  return p.canvas;
}

function cloud(): HTMLCanvasElement {
  const p = new Painter(48, 20);
  p.ellipse(14, 12, 10, 6, 0xffffff).ellipse(26, 9, 12, 8, 0xffffff).ellipse(36, 13, 9, 5, 0xffffff);
  p.rect(6, 14, 38, 4, 0xffffff).rect(6, 17, 38, 1, shade(0xffffff, -0.08));
  return p.canvas;
}

function sign(): HTMLCanvasElement {
  const p = new Painter(150, 54);
  p.rect(6, 8, 138, 40, 0x8a5a34).rect(6, 8, 138, 4, 0xb07c4a).rect(6, 44, 138, 4, 0x5a3a22);
  for (let y = 16; y < 44; y += 8) p.rect(8, y, 134, 1, 0x7a4a2a);
  p.rect(20, 48, 6, 6, 0x5a3a22).rect(124, 48, 6, 6, 0x5a3a22);
  // 덩굴 장식
  for (const [x, y] of [[8, 10], [16, 6], [130, 8], [140, 12], [4, 40], [146, 42]] as [number, number][]) p.ellipse(x, y, 5, 3, 0x5aa83c).px(x, y - 1, 0x8ad86a);
  for (const [x, y, c] of [[12, 8, 0xf7a8c4], [138, 6, 0xf7d84a], [6, 44, 0xffffff]] as [number, number, number][]) p.circle(x, y, 2, c);
  p.outline(0x3b2a22);
  return p.canvas;
}

export class MenuScene extends Phaser.Scene {
  private clouds: Phaser.GameObjects.Image[] = [];
  private bg!: Phaser.GameObjects.Image;
  private signImg!: Phaser.GameObjects.Image;
  private title!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    if (!this.textures.exists('menu_bg')) this.textures.addCanvas('menu_bg', landscape(320, 180));
    if (!this.textures.exists('cloud')) this.textures.addCanvas('cloud', cloud());
    if (!this.textures.exists('menu_sign')) this.textures.addCanvas('menu_sign', sign());
    this.bg = this.add.image(0, 0, 'menu_bg').setOrigin(0.5);
    for (let i = 0; i < 6; i++) this.clouds.push(this.add.image(Math.random() * 1400, 40 + Math.random() * 160, 'cloud').setScale(3 + Math.random() * 2).setAlpha(0.9));
    this.signImg = this.add.image(0, 0, 'menu_sign');
    this.title = this.add
      .text(0, 0, '나의 작은 농장', { fontFamily: 'Galmuri11', fontStyle: 'bold', fontSize: '22px', color: '#fff3c4', stroke: '#5a3a22', strokeThickness: 6 })
      .setOrigin(0.5)
      .setShadow(0, 3, '#3b2a22', 0, true, true);
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.layout, this);
      unmountMainMenu();
    });
    mountMainMenu(this);
    AudioManager.setBgm('spring_day');
    AudioManager.setAmbient('day');
  }

  private layout(): void {
    const { width, height } = this.scale;
    const s = Math.max(width / 320, height / 180);
    this.bg.setPosition(width / 2, height / 2).setScale(Math.ceil(s * 2) / 2);
    const ss = Math.max(2, Math.floor((height / 720) * 4 * 2) / 2);
    this.signImg.setPosition(width / 2, height * 0.24).setScale(ss);
    this.title.setPosition(width / 2, height * 0.24 + 2 * ss).setScale(ss * 0.9);
  }

  update(_t: number, dt: number): void {
    for (const c of this.clouds) {
      c.x += dt * 0.012 * c.scale;
      if (c.x > this.scale.width + 150) c.x = -150;
    }
  }
}
