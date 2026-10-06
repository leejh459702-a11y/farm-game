/**
 * FishingSystem — 물고기 선택(계절·시간·날씨·희귀도) + 모바일 낚시 미니게임 모델.
 * 미니게임: 누르고 있으면 찌 영역 상승, 떼면 하강. 물고기를 영역 안에 유지하면 진행률 상승.
 * 스태미나 없음 — 게임 시간만 흐른다.
 */
import { BALANCE } from '../data/balance';
import { BOOKS } from '../data/books';
import { FISH, FISH_BY_ID, type FishData } from '../data/fish';
import type { SeasonId, WeatherId } from '../types/game';
import { calendar, isNight } from './SeasonSystem';
import type { World } from '../core/World';

export interface FishContext {
  season: SeasonId;
  night: boolean;
  weather: WeatherId;
  rareMul: number;
  legendMul: number;
  bait: boolean;
}

/** 조건별 등장 가중치 (순수 함수 — 테스트용) */
export function fishWeight(f: FishData, ctx: FishContext): number {
  if (!f.season.includes(ctx.season)) return 0;
  const cfg = BALANCE.fishing;
  let wgt: number = cfg.rarityWeight[f.rarity];
  if (f.dayOrNight !== 'any' && (f.dayOrNight === 'night') !== ctx.night) wgt *= cfg.wrongTimeMul;
  if (f.weather !== 'any' && f.weather.includes(ctx.weather)) wgt *= cfg.weatherBoost;
  if (f.rarity !== 'common') wgt *= ctx.rareMul * (ctx.bait ? 3 : 1);
  if (f.rarity === 'legend') {
    wgt *= ctx.legendMul;
    // 전설은 조건(시간·날씨)을 모두 맞춰야 등장
    const timeOk = f.dayOrNight === 'any' || (f.dayOrNight === 'night') === ctx.night;
    const weatherOk = f.weather === 'any' || f.weather.includes(ctx.weather);
    if (!timeOk || !weatherOk) return 0;
  }
  if (f.id === 'old_boot') wgt = 6;
  return wgt;
}

export function pickFish(r: () => number, ctx: FishContext): FishData {
  const list = FISH.map((f) => ({ f, w: fishWeight(f, ctx) })).filter((e) => e.w > 0);
  const total = list.reduce((s, e) => s + e.w, 0);
  let x = r() * total;
  for (const e of list) {
    x -= e.w;
    if (x < 0) return e.f;
  }
  return list[list.length - 1].f;
}

/** 미니게임 모델 (렌더 독립) */
export class FishingGame {
  /** 찌(플레이어) 영역 하단 위치 0~1 */
  zone = 0;
  zoneVel = 0;
  readonly zoneSize: number;
  /** 물고기 위치 0~1 */
  fishPos = 0.5;
  private fishTarget = 0.5;
  private fishTimer = 0;
  progress: number;
  elapsed = 0;
  private readonly gain: number;
  private readonly speed: number;

  constructor(
    readonly fish: FishData,
    rodLevel: number,
    fishingLevel: number,
    private rnd: () => number = Math.random,
  ) {
    const cfg = BALANCE.fishing;
    this.zoneSize = cfg.zoneSize + cfg.zoneSizePerRod * rodLevel + (fishingLevel >= 6 ? 0.03 : 0);
    this.progress = cfg.progressStart;
    this.gain = cfg.progressGain * (1 + 0.15 * rodLevel);
    // 희귀 물고기일수록 빠르고 변덕스럽다
    this.speed = 0.25 + fish.catchDifficulty * 0.09;
  }

  get inZone(): boolean {
    return this.fishPos >= this.zone && this.fishPos <= this.zone + this.zoneSize;
  }

  /** dt 초 진행. 반환: 'reel' | 'caught' | 'escaped' */
  update(dt: number, holding: boolean): 'reel' | 'caught' | 'escaped' {
    dt = Math.min(dt, 0.1);
    this.elapsed += dt;
    // 찌 영역 물리: 누르면 상승, 떼면 하강
    this.zoneVel += (holding ? 2.6 : -2.2) * dt;
    this.zoneVel *= 0.92;
    this.zone += this.zoneVel * dt;
    const max = 1 - this.zoneSize;
    if (this.zone < 0) {
      this.zone = 0;
      this.zoneVel = Math.max(0, -this.zoneVel * 0.3);
    } else if (this.zone > max) {
      this.zone = max;
      this.zoneVel = Math.min(0, -this.zoneVel * 0.3);
    }
    // 물고기 움직임
    this.fishTimer -= dt;
    if (this.fishTimer <= 0) {
      const jump = 0.15 + this.fish.catchDifficulty * 0.06;
      this.fishTarget = Math.max(0.03, Math.min(0.97, this.fishPos + (this.rnd() * 2 - 1) * jump * 2));
      this.fishTimer = Math.max(0.35, 1.6 - this.fish.catchDifficulty * 0.12) * (0.6 + this.rnd() * 0.8);
    }
    const d = this.fishTarget - this.fishPos;
    this.fishPos += Math.sign(d) * Math.min(Math.abs(d), this.speed * dt);
    // 진행률
    const cfg = BALANCE.fishing;
    this.progress += (this.inZone ? this.gain : -cfg.progressDrain) * dt;
    if (this.progress >= 1) return 'caught';
    if (this.progress <= 0) return 'escaped';
    return 'reel';
  }
}

export interface CatchResult {
  fish: FishData;
  size: number;
  personalBest: boolean;
  firstCatch: boolean;
  stored: boolean;
}

export class FishingSystem {
  constructor(private w: World) {}

  canFish(): { ok: boolean; reason?: string } {
    if (!this.w.state.tools.rodOwned) return { ok: false, reason: '튜토리얼을 마치면 낚싯대를 받아요' };
    return { ok: true };
  }

  context(): FishContext {
    const s = this.w.state;
    const season = calendar(s.time.day).season;
    const night = isNight(season, s.time.elapsed);
    return { season, night, weather: s.weather.today, rareMul: this.w.life.fishRareMul(night), legendMul: this.w.life.fishLegendMul(), bait: this.w.inventory.countAll('rare_bait') > 0 };
  }

  /** 입질 대기 시간 (초) */
  waitTime(): number {
    const cfg = BALANCE.fishing;
    return (cfg.waitMin + this.w.rand() * (cfg.waitMax - cfg.waitMin)) * this.w.life.fishWaitMul();
  }

  /** 입질 — 물고기 결정 (희귀 미끼 자동 사용) */
  bite(): FishData {
    const ctx = this.context();
    const fish = pickFish(() => this.w.rand(), ctx);
    if (ctx.bait) this.w.inventory.consume('rare_bait', 1);
    return fish;
  }

  newGame(fish: FishData): FishingGame {
    return new FishingGame(fish, this.w.state.tools.rod, this.w.life.level('fishing'));
  }

  /** 포획 성공 처리 */
  landCatch(fishId: string): CatchResult {
    const fish = FISH_BY_ID[fishId];
    this.w.count('fish');
    // 낡은 장화 대신 가끔 물속의 보물 (유물)
    if (fish.id === 'old_boot') {
      const x = this.w.rand();
      if (x < 0.3) this.w.mine.giveArtifact(this.w.mine.randomArtifact('fishing'));
      else if (x < 0.34) {
        const bk = BOOKS[Math.floor(this.w.rand() * BOOKS.length)];
        this.w.inventory.add('bag', bk.id, 1);
        this.w.notify({ key: 'fish_book', text: `물속에서 스킬북 '${bk.name}'을(를) 건졌어요!`, icon: `it_${bk.id}`, tone: 'good' });
      }
    }
    if (fish.rarity === 'legend') this.w.count('fish:legend');
    const [a, b] = fish.size;
    // 큰 개체는 드물게 (제곱 분포)
    const t = Math.pow(this.w.rand(), 1.8);
    const size = Math.round((a + (b - a) * t) * 10) / 10;
    const bonus = BALANCE.fishing.sizeBonusMax * t;
    let left = this.w.inventory.add('bag', fish.id, 1, fish.freshnessDecay > 0 ? 100 : undefined, true, bonus);
    if (left > 0) left = this.w.inventory.store(fish.id, 1, 100, undefined, false);
    const rec = (this.w.state.fishRecords[fish.id] ??= { count: 0, maxSize: 0, bestPrice: 0 });
    const firstCatch = rec.count === 0;
    rec.count++;
    const personalBest = size > rec.maxSize && !firstCatch;
    rec.maxSize = Math.max(rec.maxSize, size);
    this.w.codex.recordHarvest(fish.id, 1);
    const xp = BALANCE.life.xp;
    this.w.life.addXp('fishing', fish.rarity === 'legend' ? xp.fishLegend : fish.rarity === 'epic' ? xp.fishEpic : fish.rarity === 'rare' ? xp.fishRare : xp.fishCommon);
    this.w.events.emit('sfx', { key: fish.rarity === 'common' ? 'harvest' : 'special' });
    if (fish.rarity === 'legend') this.w.notify({ key: `legend_${fish.id}`, text: `전설의 물고기 [${fish.name}]을(를) 낚았습니다!`, icon: fish.spriteKey, tone: 'good' });
    return { fish, size, personalBest, firstCatch, stored: left <= 0 };
  }
}
