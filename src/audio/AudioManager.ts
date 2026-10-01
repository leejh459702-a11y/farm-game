import type { Settings, Season } from '../types';
export class AudioManager {
  slots: Record<string, string | undefined> = Object.fromEntries(
    ['spring', 'summer', 'autumn', 'winter'].flatMap((s) => [
      [`${s}_day`, undefined],
      [`${s}_night`, undefined],
    ]),
  );
  private ctx?: AudioContext;
  private timer?: ReturnType<typeof setInterval>;
  private settings?: Settings;
  private step = 0;
  private night = false;
  private season: Season = 'spring';
  private paused = false;
  unlock(settings: Settings) {
    this.settings = settings;
    if (!this.ctx) this.ctx = new AudioContext();
    void this.ctx.resume();
    this.timer ??= setInterval(() => this.music(), 700);
  }
  update(settings: Settings, season: Season, night: boolean, paused: boolean) {
    this.settings = settings;
    this.season = season;
    this.night = night;
    this.paused = paused;
  }
  tone(frequency: number, duration: number, volume: number, type: OscillatorType = 'sine') {
    if (!this.ctx || this.ctx.state !== 'running' || volume === 0) return;
    const osc = this.ctx.createOscillator(),
      gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(volume * 0.045, this.ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + duration);
  }
  ui() {
    this.tone(660, 0.09, (this.settings?.sfx ?? 0) / 100, 'triangle');
  }
  action() {
    this.tone(440, 0.15, (this.settings?.sfx ?? 0) / 100, 'triangle');
  }
  private music() {
    if (!this.settings || this.paused) return;
    const scales = {
      spring: [261.63, 329.63, 392, 523.25, 440, 392, 329.63, 293.66],
      summer: [293.66, 369.99, 440, 587.33, 493.88, 440, 369.99, 329.63],
      autumn: [220, 261.63, 329.63, 440, 392, 329.63, 261.63, 246.94],
      winter: [196, 246.94, 293.66, 392, 329.63, 293.66, 246.94, 220],
    };
    this.tone(
      scales[this.season][this.step++ % 8] * (this.night ? 0.5 : 1),
      1.1,
      this.settings.bgm / 100,
    );
    if (this.step % 4 === 0) this.tone(this.night ? 130 : 1200, 0.8, this.settings.ambient / 200);
  }
}
