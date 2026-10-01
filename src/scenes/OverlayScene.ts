/**
 * OverlayScene — 낮/밤 색감(곱하기), 해질녘 노을, 조명, 날씨 파티클.
 * 줌 1의 화면 공간 씬이며 FarmScene 위, Controls 아래에 그린다.
 */
import Phaser from 'phaser';
import { Session } from '../core/Session';
import { SEASON_BY_ID } from '../data/seasons';
import { darkness, duskAmount, isNight } from '../systems/SeasonSystem';
import { AudioManager, type BgmSlot } from '../audio/AudioManager';
import type { FarmScene } from './FarmScene';

function lerpColor(a: number, b: number, t: number): number {
  const ca = Phaser.Display.Color.IntegerToColor(a);
  const cb = Phaser.Display.Color.IntegerToColor(b);
  const c = Phaser.Display.Color.Interpolate.ColorWithColor(ca, cb, 100, Math.round(t * 100));
  return Phaser.Display.Color.GetColor(c.r, c.g, c.b);
}

export class OverlayScene extends Phaser.Scene {
  private shade!: Phaser.GameObjects.Rectangle;
  private warm!: Phaser.GameObjects.Rectangle;
  private glows: Phaser.GameObjects.Image[] = [];
  private rain!: Phaser.GameObjects.Particles.ParticleEmitter;
  private snow!: Phaser.GameObjects.Particles.ParticleEmitter;
  private flash!: Phaser.GameObjects.Rectangle;
  private audioTimer = 0;

  constructor() {
    super('Overlay');
  }

  create(): void {
    const { width, height } = this.scale;
    this.shade = this.add.rectangle(0, 0, width, height, 0xffffff).setOrigin(0).setBlendMode(Phaser.BlendModes.MULTIPLY);
    this.warm = this.add.rectangle(0, 0, width, height, 0xff9a50, 0).setOrigin(0).setBlendMode(Phaser.BlendModes.ADD);
    this.rain = this.add.particles(0, 0, 'px', {
      x: { min: -100, max: Math.max(width, 3200) },
      y: -20,
      lifespan: 900,
      speedY: { min: 520, max: 680 },
      speedX: { min: -60, max: -30 },
      scaleX: 0.5,
      scaleY: { min: 5, max: 8 },
      alpha: { start: 0.55, end: 0.25 },
      tint: 0xa8d0f0,
      quantity: 4,
      frequency: 16,
      emitting: false,
    });
    this.snow = this.add.particles(0, 0, 'px', {
      x: { min: -50, max: Math.max(width, 3200) },
      y: -10,
      lifespan: 6000,
      speedY: { min: 30, max: 70 },
      speedX: { min: -25, max: 25 },
      scale: { min: 1.2, max: 2.4 },
      alpha: { start: 0.95, end: 0.6 },
      tint: 0xffffff,
      quantity: 1,
      frequency: 60,
      emitting: false,
    });
    this.flash = this.add.rectangle(0, 0, width, height, 0xffffff, 0).setOrigin(0);
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off('resize', this.onResize, this));
    this.onResize();
  }

  private onResize(): void {
    const { width, height } = this.scale;
    for (const r of [this.shade, this.warm, this.flash]) r.setSize(width, height);
  }

  update(_t: number, delta: number): void {
    const w = Session.world;
    const farm = this.scene.get('Farm') as FarmScene | undefined;
    if (!w || !farm?.cameras?.main) return;
    const cal = w.cal;
    const season = SEASON_BY_ID[cal.season];
    const el = w.state.time.elapsed;
    const dark = darkness(cal.season, el);
    const dusk = duskAmount(cal.season, el);
    const weather = w.state.weather.today;
    const cloudy = weather === 'cloudy' ? 0.12 : weather === 'rain' ? 0.22 : weather === 'storm' ? 0.32 : weather === 'snow' ? 0.1 : 0;
    let tint = lerpColor(season.dayTint, season.nightTint, Math.min(1, dark * 0.92));
    tint = lerpColor(tint, 0x9aa4b4, cloudy * (1 - dark));
    tint = lerpColor(tint, season.dawnTint, dusk * 0.5 * (1 - dark * 0.6));
    this.shade.setFillStyle(tint, 1);
    this.warm.setFillStyle(0xff9a50, dusk * 0.06);

    // 조명
    const cam = farm.cameras.main;
    const lights = Session.location === 'farm' ? farm.buildings?.lights ?? [] : [];
    const glowAlpha = Math.max(0, dark - 0.15) * 1.1;
    while (this.glows.length < lights.length) this.glows.push(this.add.image(0, 0, 'glow').setBlendMode(Phaser.BlendModes.ADD));
    this.glows.forEach((g, i) => {
      const l = lights[i];
      if (!l || glowAlpha <= 0.01) return g.setVisible(false);
      const sx = (l.x - cam.worldView.x) * cam.zoom;
      const sy = (l.y - cam.worldView.y) * cam.zoom;
      g.setVisible(sx > -200 && sy > -200 && sx < this.scale.width + 200 && sy < this.scale.height + 200);
      g.setPosition(sx, sy).setScale(l.r * cam.zoom * 0.9).setAlpha(Math.min(0.85, glowAlpha) * (0.92 + Math.sin(this.time.now / 300 + i) * 0.08));
    });
    // 날씨
    const raining = weather === 'rain' || weather === 'storm';
    this.rain.emitting = raining;
    if (raining) this.rain.frequency = weather === 'storm' ? 6 : 16;
    this.snow.emitting = weather === 'snow';
    if (weather === 'storm' && Math.random() < delta / 9000) {
      this.flash.setFillStyle(0xffffff, 0.5);
      this.tweens.add({ targets: this.flash, fillAlpha: 0, duration: 300 });
    }
    // 오디오 (BGM / 환경음)
    this.audioTimer -= delta;
    if (this.audioTimer <= 0) {
      this.audioTimer = 1000;
      const night = isNight(cal.season, el);
      AudioManager.setBgm(`${cal.season}_${night ? 'night' : 'day'}` as BgmSlot);
      AudioManager.setAmbient(raining ? 'rain' : night ? 'night' : weather === 'snow' ? 'none' : 'day');
    }
  }
}
