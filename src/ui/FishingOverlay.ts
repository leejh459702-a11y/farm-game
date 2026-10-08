/**
 * 모바일 낚시 미니게임 (DOM 오버레이)
 * 찌 던지기 → 입질 대기 → 입질! → 오른쪽 세로 게이지
 * 화면 어디든 누르고 있으면 영역 상승, 떼면 하강. 한 손 조작.
 */
import type { World } from '../core/World';
import { popDomFxAt } from './DomFx';
import { FishingGame } from '../systems/FishingSystem';
import { RARITY_NAME, type FishData } from '../data/fish';
import { iconHtml } from '../assets/AssetRegistry';
import { $ui, el, esc } from './dom';
import { AudioManager } from '../audio/AudioManager';
import { vibrate } from '../services/SettingsStore';
import { Session } from '../core/Session';

let active: FishingSession | null = null;

export function isFishing(): boolean {
  return !!active;
}

export function startFishing(w: World, onEnd: () => void, bobberAt: { x: number; y: number }): void {
  if (active) return;
  active = new FishingSession(w, () => {
    active = null;
    onEnd();
  }, bobberAt);
}

type Phase = 'cast' | 'wait' | 'bite' | 'reel' | 'result';

class FishingSession {
  private root: HTMLElement;
  private phase: Phase = 'cast';
  private t = 0;
  private waitFor = 0;
  private fish: FishData | null = null;
  private game: FishingGame | null = null;
  private holding = false;
  private done = false;
  private raf = 0;
  private last = performance.now();
  private keyDown = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      this.holding = true;
      e.preventDefault();
    }
    if (e.key === 'Escape') this.end();
  };
  private keyUp = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') this.holding = false;
  };

  constructor(
    private w: World,
    private onEnd: () => void,
    bobber: { x: number; y: number },
  ) {
    this.root = el('div', 'fishing-layer interactive');
    this.root.innerHTML = `
      <div class="fish-bobber" data-f="bobber"></div>
      <div class="fish-msg" data-f="msg">찌를 던졌어요…</div>
      <div class="fish-gauge" data-f="gauge" style="display:none">
        <div class="fish-track"><div class="fish-zone" data-f="zone"></div><div class="fish-icon" data-f="fish"></div></div>
        <div class="fish-progress"><i data-f="prog"></i></div>
      </div>
      <div class="fish-hint" data-f="hint" style="display:none">화면을 <b>누르고 있으면</b> 초록 영역이 올라가요<br>물고기를 영역 안에 두세요!</div>
      <button class="btn small red fish-cancel" data-f="cancel">그만하기</button>`;
    $ui().appendChild(this.root);
    const b = this.q('bobber');
    b.style.left = `${bobber.x}px`;
    b.style.top = `${bobber.y}px`;
    this.root.addEventListener('pointerdown', (e) => {
      if ((e.target as HTMLElement).closest('[data-f=cancel]')) return;
      if (this.phase === 'result') return this.end();
      if (this.phase === 'wait') {
        this.q('msg').textContent = '아직이에요… 입질을 기다려요';
        return;
      }
      this.holding = true;
    });
    const up = () => (this.holding = false);
    this.root.addEventListener('pointerup', up);
    this.root.addEventListener('pointercancel', up);
    this.root.addEventListener('pointerleave', up);
    this.q('cancel').addEventListener('click', () => this.end());
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    AudioManager.sfx('water');
    this.loop();
  }

  private q(name: string): HTMLElement {
    return this.root.querySelector(`[data-f="${name}"]`) as HTMLElement;
  }

  private loop = (): void => {
    const now = performance.now();
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.step(dt);
    if (this.done) return;
    this.raf = requestAnimationFrame(this.loop);
  };

  private step(dt: number): void {
    this.t += dt;
    switch (this.phase) {
      case 'cast':
        if (this.t > 0.7) {
          this.phase = 'wait';
          this.t = 0;
          this.waitFor = this.w.fishing.waitTime();
          this.q('msg').textContent = '입질을 기다리는 중…';
          this.q('bobber').classList.add('floating');
        }
        break;
      case 'wait':
        if (this.t >= this.waitFor) {
          this.phase = 'bite';
          this.t = 0;
          this.fish = this.w.fishing.bite();
          this.q('msg').innerHTML = '<b class="bite">!</b> 입질!';
          this.q('bobber').classList.add('bite');
          popDomFxAt(this.q('bobber'), 'fx_fishing_bite', 60);
          vibrate([30, 40, 30]);
          AudioManager.sfx('bell');
        }
        break;
      case 'bite':
        if (this.t > 0.6) {
          this.phase = 'reel';
          this.t = 0;
          this.game = this.w.fishing.newGame(this.fish!);
          this.q('gauge').style.display = '';
          this.q('hint').style.display = '';
          this.q('fish').innerHTML = iconHtml(this.fish!.rarity === 'common' ? 'ic_fish' : this.fish!.spriteKey, 28);
          this.q('fish').classList.toggle('rare', this.fish!.rarity !== 'common');
          this.q('msg').textContent = this.fish!.rarity === 'legend' ? '엄청난 힘이에요…! 전설의 물고기?!' : this.fish!.rarity === 'common' ? '당겨요!' : '힘이 센 녀석이에요!';
        }
        break;
      case 'reel': {
        const g = this.game!;
        const res = g.update(dt, this.holding);
        const zone = this.q('zone');
        zone.style.bottom = `${g.zone * 100}%`;
        zone.style.height = `${g.zoneSize * 100}%`;
        zone.classList.toggle('on', g.inZone);
        this.q('fish').style.bottom = `calc(${g.fishPos * 100}% - 14px)`;
        const prog = this.q('prog');
        prog.style.height = `${g.progress * 100}%`;
        prog.style.background = g.progress > 0.66 ? 'linear-gradient(#8ad86a,#5aa83c)' : g.progress > 0.33 ? 'linear-gradient(#f2d86a,#e0b030)' : 'linear-gradient(#f09080,#c8483a)';
        if (g.elapsed > 2) this.q('hint').style.display = 'none';
        if (res === 'caught') this.finish(true);
        else if (res === 'escaped') this.finish(false);
        break;
      }
      case 'result':
        if (this.t > 3.2) this.end();
        break;
    }
  }

  private finish(caught: boolean): void {
    this.phase = 'result';
    this.t = 0;
    this.q('gauge').style.display = 'none';
    this.q('hint').style.display = 'none';
    this.q('bobber').style.display = 'none';
    const msg = this.q('msg');
    msg.classList.add('result');
    if (!caught) {
      msg.innerHTML = `<div>놓쳤어요… <span class="muted small">다시 던져 보세요</span></div>`;
      AudioManager.sfx('error');
      return;
    }
    const r = this.w.fishing.landCatch(this.fish!.id);
    const f = r.fish;
    vibrate(40);
    msg.innerHTML = `<div class="row" style="gap:0.6rem">${iconHtml(f.spriteKey, 48)}<div style="text-align:left">
      <b>${esc(f.name)}</b> <span class="chip ${f.rarity === 'legend' ? 'gold' : f.rarity === 'epic' ? 'purple' : f.rarity === 'rare' ? 'blue' : ''}">${RARITY_NAME[f.rarity]}</span>
      <div>${r.size.toFixed(1)}cm ${r.firstCatch ? '<span class="chip green">새로운 발견!</span>' : r.personalBest ? '<span class="chip gold">개인 최고 기록!</span>' : ''}</div>
      <div class="tiny muted">${r.stored ? '가방에 넣었어요' : '가방과 창고가 가득 찼어요'} · 화면을 누르면 계속</div></div></div>`;
  }

  private end(): void {
    if (this.done) return;
    this.done = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    this.root.remove();
    active = null;
    Session.app.emit('context', { label: '낚시', icon: 'tool_rod', enabled: true });
    this.onEnd();
  }
}
