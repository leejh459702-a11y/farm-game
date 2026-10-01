/**
 * AudioManager — BGM / 환경음 / 효과음 / UI 4개 카테고리.
 * 사운드 자산이 없으므로 WebAudio 로 합성한 임시 사운드를 사용한다.
 * 실제 자산은 BGM_SLOTS 의 key 로 등록하면 교체된다 (registerBuffer).
 */
import { SettingsStore } from '../services/SettingsStore';

export type BgmSlot = 'spring_day' | 'spring_night' | 'summer_day' | 'summer_night' | 'autumn_day' | 'autumn_night' | 'winter_day' | 'winter_night';
export const BGM_SLOTS: BgmSlot[] = ['spring_day', 'spring_night', 'summer_day', 'summer_night', 'autumn_day', 'autumn_night', 'winter_day', 'winter_night'];
export type AmbientKind = 'day' | 'night' | 'rain' | 'none';

/** 계절별 합성 BGM 설정 (펜타토닉 기반) */
const BGM_THEME: Record<BgmSlot, { root: number; scale: number[]; tempo: number; wave: OscillatorType; bright: number }> = {
  spring_day: { root: 60, scale: [0, 2, 4, 7, 9, 12, 14], tempo: 92, wave: 'triangle', bright: 1 },
  spring_night: { root: 55, scale: [0, 3, 5, 7, 10, 12], tempo: 64, wave: 'sine', bright: 0.6 },
  summer_day: { root: 62, scale: [0, 2, 4, 7, 9, 12, 16], tempo: 104, wave: 'triangle', bright: 1 },
  summer_night: { root: 57, scale: [0, 2, 5, 7, 9, 12], tempo: 70, wave: 'sine', bright: 0.6 },
  autumn_day: { root: 57, scale: [0, 2, 3, 7, 9, 12], tempo: 84, wave: 'triangle', bright: 0.85 },
  autumn_night: { root: 52, scale: [0, 3, 5, 7, 10, 12], tempo: 60, wave: 'sine', bright: 0.5 },
  winter_day: { root: 64, scale: [0, 4, 7, 11, 12, 14], tempo: 76, wave: 'sine', bright: 0.8 },
  winter_night: { root: 52, scale: [0, 3, 7, 10, 12, 15], tempo: 56, wave: 'sine', bright: 0.45 },
};

const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioManagerImpl {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmGain!: GainNode;
  private ambGain!: GainNode;
  private sfxGain!: GainNode;
  private uiGain!: GainNode;
  private currentSlot: BgmSlot | null = null;
  private bgmTimer: number | null = null;
  private bgmStep = 0;
  private ambientKind: AmbientKind = 'none';
  private ambientNodes: AudioNode[] = [];
  private ambientTimer: number | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private bgmSource: AudioBufferSourceNode | null = null;
  private unlocked = false;

  /** 사용자 제스처 이후 호출 (모바일 정책) */
  unlock(): void {
    if (this.unlocked) {
      void this.ctx?.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
    } catch {
      return;
    }
    const c = this.ctx;
    this.master = c.createGain();
    this.master.connect(c.destination);
    this.bgmGain = c.createGain();
    this.ambGain = c.createGain();
    this.sfxGain = c.createGain();
    this.uiGain = c.createGain();
    for (const g of [this.bgmGain, this.ambGain, this.sfxGain, this.uiGain]) g.connect(this.master);
    this.applyVolumes();
    SettingsStore.events.on('change', () => this.applyVolumes());
    this.unlocked = true;
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else void this.ctx.resume();
    });
    if (this.pendingSlot) this.setBgm(this.pendingSlot);
    if (this.pendingAmbient) this.setAmbient(this.pendingAmbient);
  }

  private pendingSlot: BgmSlot | null = null;
  private pendingAmbient: AmbientKind | null = null;

  applyVolumes(): void {
    if (!this.ctx) return;
    const s = SettingsStore.value;
    const t = this.ctx.currentTime;
    this.bgmGain.gain.setTargetAtTime(s.bgmVolume * 0.18, t, 0.1);
    this.ambGain.gain.setTargetAtTime(s.ambientVolume * 0.25, t, 0.1);
    this.sfxGain.gain.setTargetAtTime(s.sfxVolume * 0.35, t, 0.05);
    this.uiGain.gain.setTargetAtTime(s.uiVolume * 0.3, t, 0.05);
  }

  registerBuffer(key: string, buf: AudioBuffer): void {
    this.buffers.set(key, buf);
  }

  // ───── BGM ─────
  setBgm(slot: BgmSlot): void {
    if (!this.ctx) {
      this.pendingSlot = slot;
      return;
    }
    if (slot === this.currentSlot) return;
    this.currentSlot = slot;
    const c = this.ctx;
    // 크로스페이드
    this.bgmGain.gain.setTargetAtTime(0, c.currentTime, 0.6);
    window.setTimeout(() => {
      if (this.currentSlot !== slot) return;
      this.stopBgmLoop();
      this.applyVolumes();
      const buf = this.buffers.get(`bgm_${slot}`);
      if (buf) {
        const src = c.createBufferSource();
        src.buffer = buf;
        src.loop = true;
        src.connect(this.bgmGain);
        src.start();
        this.bgmSource = src;
      } else this.startSynthLoop(slot);
    }, 1500);
  }

  private stopBgmLoop(): void {
    if (this.bgmTimer !== null) window.clearInterval(this.bgmTimer);
    this.bgmTimer = null;
    this.bgmSource?.stop();
    this.bgmSource = null;
  }

  private startSynthLoop(slot: BgmSlot): void {
    const theme = BGM_THEME[slot];
    const beat = 60 / theme.tempo;
    this.bgmStep = 0;
    let seed = slot.length * 7919;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // 4마디 동기 패턴 생성
    const melody: (number | null)[] = [];
    for (let i = 0; i < 32; i++) melody.push(rnd() < 0.62 ? theme.scale[Math.floor(rnd() * theme.scale.length)] : null);
    const chords = [0, 5, 3, 4].map((d) => theme.scale[d % theme.scale.length]);
    const tick = () => {
      if (!this.ctx) return;
      const t = this.ctx.currentTime + 0.05;
      const i = this.bgmStep % 32;
      const n = melody[i];
      if (n !== null) this.note(theme.root + 12 + n, t, beat * 0.9, theme.wave, 0.22 * theme.bright, this.bgmGain);
      if (i % 8 === 0) {
        const ch = chords[Math.floor(i / 8) % chords.length];
        for (const iv of [0, 4, 7]) this.note(theme.root - 12 + ch + iv, t, beat * 7.5, 'sine', 0.09, this.bgmGain);
      }
      if (i % 4 === 2) this.note(theme.root + theme.scale[(i / 2) % theme.scale.length], t, beat * 0.6, 'sine', 0.06, this.bgmGain);
      this.bgmStep++;
    };
    tick();
    this.bgmTimer = window.setInterval(tick, (beat * 1000) / 2);
  }

  private note(m: number, t: number, dur: number, wave: OscillatorType, vol: number, dest: AudioNode): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = wave;
    o.frequency.value = midi(m);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g);
    g.connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  // ───── 환경음 ─────
  setAmbient(kind: AmbientKind): void {
    if (!this.ctx) {
      this.pendingAmbient = kind;
      return;
    }
    if (kind === this.ambientKind) return;
    this.ambientKind = kind;
    for (const n of this.ambientNodes) {
      try {
        (n as AudioScheduledSourceNode).stop?.();
      } catch {
        /* noop */
      }
      n.disconnect();
    }
    this.ambientNodes = [];
    if (this.ambientTimer !== null) window.clearInterval(this.ambientTimer);
    this.ambientTimer = null;
    const c = this.ctx;
    if (kind === 'rain') {
      const buf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
      const src = c.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = c.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1400;
      const g = c.createGain();
      g.gain.value = 0.35;
      src.connect(f).connect(g).connect(this.ambGain);
      src.start();
      this.ambientNodes.push(src, f, g);
    } else if (kind === 'day') {
      // 새소리
      this.ambientTimer = window.setInterval(() => {
        if (!this.ctx || Math.random() > 0.35) return;
        const t = this.ctx.currentTime;
        const base = 2200 + Math.random() * 1400;
        for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) this.chirp(base + Math.random() * 300, t + k * 0.12, 0.08);
      }, 900);
    } else if (kind === 'night') {
      // 귀뚜라미
      this.ambientTimer = window.setInterval(() => {
        if (!this.ctx || Math.random() > 0.55) return;
        const t = this.ctx.currentTime;
        for (let k = 0; k < 3; k++) this.chirp(4200, t + k * 0.07, 0.035, 0.05);
      }, 700);
    }
  }

  private chirp(freq: number, t: number, dur: number, vol = 0.08): void {
    const c = this.ctx!;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(freq * 1.3, t + dur);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    o.connect(g).connect(this.ambGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  // ───── 효과음 ─────
  sfx(key: string): void {
    if (!this.ctx) return;
    const buf = this.buffers.get(`sfx_${key}`);
    if (buf) {
      const s = this.ctx.createBufferSource();
      s.buffer = buf;
      s.connect(this.sfxGain);
      s.start();
      return;
    }
    const t = this.ctx.currentTime;
    const g = this.sfxGain;
    const seq = (notes: number[], step: number, wave: OscillatorType = 'triangle', vol = 0.5, dur = 0.12) => notes.forEach((n, i) => this.note(n, t + i * step, dur, wave, vol, g));
    switch (key) {
      case 'till':
        this.noise(t, 0.08, 500, 0.5);
        break;
      case 'plant':
        seq([72, 79], 0.06, 'sine', 0.4, 0.1);
        break;
      case 'water':
        this.noise(t, 0.25, 2500, 0.25);
        seq([84, 88], 0.08, 'sine', 0.15, 0.08);
        break;
      case 'harvest':
        seq([72, 76, 79, 84], 0.05, 'triangle', 0.45, 0.12);
        break;
      case 'coin':
        seq([88, 93], 0.07, 'square', 0.18, 0.12);
        break;
      case 'buy':
        seq([79, 84, 88], 0.06, 'triangle', 0.35, 0.1);
        break;
      case 'build':
        this.noise(t, 0.06, 300, 0.6);
        this.noise(t + 0.12, 0.06, 300, 0.6);
        seq([67, 72], 0.12, 'triangle', 0.3, 0.12);
        break;
      case 'levelup':
        seq([72, 76, 79, 84, 88], 0.08, 'triangle', 0.4, 0.18);
        break;
      case 'bell':
        seq([84, 79, 84], 0.15, 'sine', 0.4, 0.4);
        break;
      case 'special':
        seq([79, 84, 88, 91, 96], 0.07, 'triangle', 0.4, 0.3);
        break;
      case 'feed':
      case 'pet':
        seq([76, 81], 0.08, 'sine', 0.35, 0.12);
        break;
      case 'love':
      case 'birth':
        seq([76, 79, 83, 88], 0.1, 'sine', 0.4, 0.25);
        break;
      case 'error':
        seq([52, 48], 0.08, 'square', 0.12, 0.12);
        break;
      case 'upgrade':
      case 'process':
        seq([67, 71, 74], 0.06, 'triangle', 0.3, 0.12);
        break;
      case 'clean':
        this.noise(t, 0.2, 3000, 0.25);
        break;
      default:
        seq([76], 0.05, 'sine', 0.3, 0.08);
    }
  }

  ui(kind: 'tap' | 'open' | 'close' = 'tap'): void {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === 'tap') this.note(84, t, 0.05, 'sine', 0.3, this.uiGain);
    else if (kind === 'open') (this.note(76, t, 0.06, 'sine', 0.3, this.uiGain), this.note(83, t + 0.05, 0.08, 'sine', 0.3, this.uiGain));
    else (this.note(83, t, 0.06, 'sine', 0.25, this.uiGain), this.note(76, t + 0.05, 0.08, 'sine', 0.25, this.uiGain));
  }

  private noise(t: number, dur: number, freq: number, vol: number): void {
    const c = this.ctx!;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const s = c.createBufferSource();
    s.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    const g = c.createGain();
    g.gain.value = vol;
    s.connect(f).connect(g).connect(this.sfxGain);
    s.start(t);
  }
}

export const AudioManager = new AudioManagerImpl();
