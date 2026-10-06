/**
 * CropSystem — 농지(1×1), 파종, 물주기, 성장, 수확, 비료, 농지 내부 업그레이드.
 * 제철이 아니면 성장이 멈출 뿐 죽지 않는다. 다 자란 작물은 언제든 수확 가능.
 */
import { BALANCE } from '../data/balance';
import { CROP_BY_ID, type CropData } from '../data/crops';
import { ITEM_BY_ID } from '../data/items';
import { WEATHER_INFO } from '../data/seasons';
import type { Plot, PlotUpgrades, SeasonId } from '../types/game';
import { tileKey } from '../utils/format';
import type { World } from '../core/World';

export type PlotUpgradeType = keyof PlotUpgrades;

export interface ActionResult {
  ok: boolean;
  reason?: string;
}

export function newPlot(x: number, y: number, greenhouse?: string): Plot {
  return {
    x,
    y,
    cropId: null,
    plantedDay: 0,
    growthProgressDays: 0,
    wateredToday: false,
    mature: false,
    currentStage: 0,
    regrowing: false,
    harvests: 0,
    fertilizer: null,
    upgrades: { irrigation: 0, soil: 0, pest: 0, autoHarvest: 0 },
    ...(greenhouse ? { greenhouse } : {}),
  };
}

/**
 * 성장 단계 (최소 4단계 외형)
 *  1 새싹 → 2 어린 작물 → 3 성장 중 → 4 수확 가능
 * 당근(3일): 심은 날 새싹 · 1일 후 어린 당근 · 2일 후 성장한 잎 · 3일 후 수확 가능
 */
export function stageFor(progress: number, growDays: number, mature: boolean): number {
  if (mature) return 4;
  if (progress <= 0) return 1;
  // 남은 단계(2,3)를 성장일에 고르게 배분
  return progress / growDays < 0.5 ? 2 : 3;
}

export function cropStage(p: Plot): number {
  if (!p.cropId) return 0;
  if (p.mature) return 4;
  if (p.regrowing) return 3;
  return stageFor(p.growthProgressDays, CROP_BY_ID[p.cropId].growDays, false);
}

export const isReady = (p: Plot): boolean => !!p.cropId && p.mature;

/** 표시용 캐시 갱신 */
export function refreshStage(p: Plot): void {
  p.currentStage = cropStage(p);
}

/**
 * 계절 성장 규칙: 봄·여름·가을에는 모든 작물이 자란다.
 * 겨울 야외 밭에서는 겨울 작물만 자라고, 나머지는 온실에서만 자란다.
 * (제철 계절은 판매 보너스 +10% 에만 쓰인다)
 */
export function seasonAllowsGrowth(cropId: string, season: SeasonId, greenhouse: boolean): boolean {
  if (greenhouse || season !== 'winter') return true;
  return CROP_BY_ID[cropId]?.season.includes('winter') ?? false;
}

/** 과수가 다 자라 열매만 기다리는 단계인가 */
export function treeGrown(p: Plot): boolean {
  const c = p.cropId ? CROP_BY_ID[p.cropId] : null;
  return !!c?.fruitTree && p.growthProgressDays >= c.growDays - c.regrowDays;
}

/** 오늘 성장할 수 있는가 */
export function canGrowToday(p: Plot, season: SeasonId): boolean {
  if (!p.cropId) return false;
  const c = CROP_BY_ID[p.cropId];
  // 과수: 나무는 물 없이 매일 자라고, 다 자란 뒤 열매는 제철(또는 온실)에만 맺힌다
  if (c?.fruitTree) return !treeGrown(p) || !!p.greenhouse || c.season.includes(season);
  return seasonAllowsGrowth(p.cropId, season, !!p.greenhouse) && p.wateredToday;
}

export class CropSystem {
  constructor(private w: World) {}

  plotAt(x: number, y: number): Plot | undefined {
    return this.w.state.plots[tileKey(x, y)];
  }

  key(p: Plot): string {
    return p.greenhouse ? `gh:${p.greenhouse}:${p.x}` : tileKey(p.x, p.y);
  }

  isUnlocked(cropId: string): boolean {
    const c = CROP_BY_ID[cropId];
    if (!c) return false;
    if (this.w.skills.level('farming') < c.unlockLevel) return false;
    if (c.unlockSkill && !this.w.skills.has(c.unlockSkill)) return false;
    return true;
  }

  lockReason(c: CropData): string | null {
    if (this.w.skills.level('farming') < c.unlockLevel) return `농사 Lv.${c.unlockLevel} 필요`;
    if (c.unlockSkill && !this.w.skills.has(c.unlockSkill)) return '연구 필요';
    return null;
  }

  canTill(x: number, y: number): ActionResult {
    if (!this.w.grid.isOwned(x, y)) return { ok: false, reason: '소유한 토지가 아닙니다' };
    if (this.w.grid.buildingAt(x, y)) return { ok: false, reason: '시설이 있습니다' };
    if (this.plotAt(x, y)) return { ok: false, reason: '이미 농지입니다' };
    return { ok: true };
  }

  till(x: number, y: number): ActionResult {
    const c = this.canTill(x, y);
    if (!c.ok) return c;
    const p = newPlot(x, y);
    // 비 오는 날 갈면 바로 젖음
    if (WEATHER_INFO[this.w.state.weather.today].waters) p.wateredToday = true;
    this.w.state.plots[tileKey(x, y)] = p;
    this.changed([tileKey(x, y)]);
    this.w.events.emit('sfx', { key: 'till' });
    this.w.tutorial.signal('tilled');
    return { ok: true };
  }

  /** 작물 뽑기 / 과수 베기 — 농지는 그대로 남는다 (확인 창은 UI 에서) */
  removeCrop(p: Plot | undefined): ActionResult {
    if (!p || !p.cropId) return { ok: false, reason: '작물이 없습니다' };
    p.cropId = null;
    p.growthProgressDays = 0;
    p.mature = false;
    p.regrowing = false;
    p.harvests = 0;
    refreshStage(p);
    this.changed([this.key(p)]);
    this.w.events.emit('sfx', { key: 'till' });
    return { ok: true };
  }

  /** 삽: 빈 농지를 다시 잔디로 */
  untill(x: number, y: number): ActionResult {
    const p = this.plotAt(x, y);
    if (!p) return { ok: false, reason: '농지가 아닙니다' };
    if (p.cropId) return { ok: false, reason: '작물이 있습니다' };
    delete this.w.state.plots[tileKey(x, y)];
    this.changed([tileKey(x, y)]);
    return { ok: true };
  }

  canPlant(p: Plot | undefined, seedItemId: string): ActionResult {
    if (!p) return { ok: false, reason: '먼저 괭이로 농지를 만드세요' };
    if (p.cropId) return { ok: false, reason: '이미 작물이 있습니다' };
    const cropId = ITEM_BY_ID[seedItemId]?.cropId;
    if (!cropId) return { ok: false, reason: '씨앗이 아닙니다' };
    if (!this.isUnlocked(cropId)) return { ok: false, reason: this.lockReason(CROP_BY_ID[cropId]) ?? '잠김' };
    if (this.w.inventory.countAll(seedItemId) <= 0) return { ok: false, reason: '씨앗이 없습니다' };
    return { ok: true };
  }

  plant(p: Plot | undefined, seedItemId: string): ActionResult {
    const c = this.canPlant(p, seedItemId);
    if (!c.ok || !p) return c;
    this.w.inventory.consume(seedItemId, 1);
    p.cropId = ITEM_BY_ID[seedItemId].cropId!;
    p.plantedDay = this.w.state.time.day;
    // 스킬북 '농부의 비밀노트': 성장 5일 이상 작물은 하루 앞서 시작
    const cd = CROP_BY_ID[p.cropId];
    p.growthProgressDays = this.w.collections.hasBook('book_farmer') && cd.growDays >= 5 && !cd.fruitTree ? 1 : 0;
    p.mature = false;
    p.regrowing = false;
    p.harvests = 0;
    refreshStage(p);
    this.w.skills.addXp('farming', BALANCE.xp.plant);
    this.changed([this.key(p)]);
    this.w.events.emit('sfx', { key: 'plant' });
    this.w.tutorial.signal('planted');
    return { ok: true };
  }

  water(p: Plot | undefined): ActionResult {
    if (!p) return { ok: false, reason: '농지가 아닙니다' };
    if (p.wateredToday) return { ok: false, reason: '이미 촉촉합니다' };
    p.wateredToday = true;
    this.changed([this.key(p)]);
    this.w.events.emit('sfx', { key: 'water' });
    this.w.tutorial.signal('watered');
    return { ok: true };
  }

  fertilize(p: Plot | undefined, fertId: string): ActionResult {
    if (!p) return { ok: false, reason: '농지가 아닙니다' };
    const f = BALANCE.crops.fertilizer[fertId];
    if (!f) return { ok: false, reason: '비료가 아닙니다' };
    if (fertId !== 'compost' && !this.w.skills.has('f_fert1')) return { ok: false, reason: '비료 연구가 필요합니다' };
    if (fertId === 'premium_fertilizer' && !this.w.skills.has('f_fert2')) return { ok: false, reason: '고급 비료 연구가 필요합니다' };
    if (p.fertilizer && p.fertilizer.id === fertId && p.fertilizer.daysLeft > 5) return { ok: false, reason: '이미 같은 비료가 적용되어 있습니다' };
    if (!this.w.inventory.consume(fertId, 1)) return { ok: false, reason: '비료가 없습니다' };
    p.fertilizer = { id: fertId, daysLeft: f.days };
    this.changed([this.key(p)]);
    this.w.events.emit('sfx', { key: 'plant' });
    return { ok: true };
  }

  /** 수확량 계산 (난수 사용) */
  rollYield(p: Plot): number {
    const c = CROP_BY_ID[p.cropId!];
    let n = c.yield;
    const fert = p.fertilizer ? BALANCE.crops.fertilizer[p.fertilizer.id] : null;
    if (fert && this.w.rand() < fert.extraChance) n++;
    const soilChance = BALANCE.crops.soilExtraChance[p.upgrades.soil] ?? 0;
    if (this.w.rand() < soilChance) n++;
    if (!p.greenhouse && p.upgrades.pest === 0 && this.w.rand() < BALANCE.crops.pestChance) n = Math.max(1, n - 1);
    if (c.rare && this.w.skills.has('f_m_special')) n++;
    return n;
  }

  /**
   * 수확. dest = 'bag' (플레이어) 또는 'storage' (자동 수확)
   * 성공 시 수확 수량 반환
   */
  harvest(p: Plot | undefined, dest: 'bag' | 'storage' = 'bag'): { ok: boolean; reason?: string; qty?: number; itemId?: string } {
    if (!p || !p.cropId) return { ok: false, reason: '작물이 없습니다' };
    if (!isReady(p)) return { ok: false, reason: '아직 다 자라지 않았습니다' };
    const c = CROP_BY_ID[p.cropId];
    const qty = this.rollYield(p);
    let left: number;
    if (dest === 'bag') {
      const cap = this.w.inventory.capacityFor('bag', c.id, 100);
      if (cap <= 0 && this.w.inventory.storageIds().every((id) => this.w.inventory.capacityFor(id, c.id, 100) <= 0))
        return { ok: false, reason: '가방이 가득 찼습니다' };
      left = this.w.inventory.add('bag', c.id, qty, 100);
      if (left > 0) left = this.w.inventory.store(c.id, left, 100, { x: p.x, y: p.y }, false);
    } else {
      left = this.w.inventory.store(c.id, qty, 100, { x: p.x, y: p.y }, false);
      if (left === qty) return { ok: false, reason: '저장 공간 부족' };
    }
    const got = qty - left;
    p.harvests++;
    if (c.regrowDays > 0) {
      p.growthProgressDays = c.growDays - c.regrowDays;
      p.regrowing = true;
    } else {
      p.cropId = null;
      p.growthProgressDays = 0;
      p.regrowing = false;
    }
    p.mature = false;
    refreshStage(p);
    // 기록
    this.w.state.stats.totalHarvested += got;
    this.w.codex.recordHarvest(c.id, got);
    this.w.count('harvest', got);
    this.w.count(`harvest:${c.id}`, got);
    const xp = Math.max(BALANCE.xp.harvestMin, Math.round(c.baseSellPrice * got * BALANCE.xp.harvestPerPrice));
    this.w.skills.addXp('farming', xp);
    this.changed([this.key(p)]);
    this.w.events.emit('sfx', { key: 'harvest' });
    this.w.tutorial.signal('harvested');
    return { ok: true, qty: got, itemId: c.id };
  }

  /** 모든 바깥 농지 (온실 제외) */
  outdoorPlots(): Plot[] {
    return Object.values(this.w.state.plots).filter((p) => !p.greenhouse);
  }

  allPlots(): Plot[] {
    return Object.values(this.w.state.plots);
  }

  /**
   * 하루 종료 시 성장 처리 — 하루에 정확히 1회 호출된다.
   *   if wateredToday (그리고 제철 또는 온실): growthProgressDays += 1
   *   wateredToday = false
   *   if growthProgressDays >= growDays: mature = true
   * 성장 비료는 일정 확률로 하루를 더 앞당긴다(+1일 추가).
   */
  dailyGrowth(season: SeasonId): { grew: number; dry: number } {
    let grew = 0;
    let dry = 0;
    for (const p of this.allPlots()) {
      if (p.greenhouse) p.wateredToday = true; // 온실 자동 급수
      if (p.cropId && !p.mature) {
        if (canGrowToday(p, season)) {
          const c = CROP_BY_ID[p.cropId];
          const fert = p.fertilizer ? BALANCE.crops.fertilizer[p.fertilizer.id] : null;
          let add = 1;
          if (fert && fert.growthBonus > 0 && this.w.rand() < fert.growthBonus) add++;
          p.growthProgressDays = Math.min(c.growDays, p.growthProgressDays + add);
          grew++;
        } else if (!p.wateredToday && !CROP_BY_ID[p.cropId].fruitTree) dry++;
      }
      if (p.fertilizer) {
        // 관개 Lv.2: 비료 지속시간 2배 (격일 소모)
        const skip = p.upgrades.irrigation >= 2 && this.w.state.time.day % 2 === 1;
        if (!skip) p.fertilizer.daysLeft--;
        if (p.fertilizer.daysLeft <= 0) {
          const id = p.fertilizer.id;
          p.fertilizer = null;
          // 관개 Lv.3: 같은 비료를 창고에서 자동 보충
          if (p.upgrades.irrigation >= 3 && this.w.inventory.consume(id, 1)) p.fertilizer = { id, daysLeft: BALANCE.crops.fertilizer[id].days };
        }
      }
      p.wateredToday = false;
      if (p.cropId && p.growthProgressDays >= CROP_BY_ID[p.cropId].growDays) {
        p.mature = true;
        p.regrowing = false;
      }
      refreshStage(p);
    }
    this.changed('all');
    return { grew, dry };
  }

  /** 아침 처리: 비/관개 자동 물주기 */
  morningWater(): void {
    const rain = WEATHER_INFO[this.w.state.weather.today].waters;
    for (const p of this.allPlots()) {
      if (p.greenhouse) p.wateredToday = true;
      else if (rain || p.upgrades.irrigation >= 1) p.wateredToday = true;
    }
    this.changed('all');
  }

  readyPlots(): Plot[] {
    return this.allPlots().filter(isReady);
  }

  // ───── 농지 내부 업그레이드 ─────
  upgradeInfo(type: PlotUpgradeType, current: number): { next: number; cost: number; locked: string | null; max: boolean } {
    const cfg = BALANCE.plotUpgrades[type];
    const next = current + 1;
    if (next >= cfg.costs.length) return { next: current, cost: 0, locked: null, max: true };
    const skill = cfg.skill[next];
    const locked = skill && !this.w.skills.has(skill) ? '연구 필요' : null;
    return { next, cost: cfg.costs[next], locked, max: false };
  }

  /** 여러 농지 일괄 업그레이드. 업그레이드된 수 반환 */
  upgrade(plots: Plot[], type: PlotUpgradeType): { ok: boolean; count: number; cost: number; reason?: string } {
    let total = 0;
    const targets: Plot[] = [];
    for (const p of plots) {
      const info = this.upgradeInfo(type, p.upgrades[type]);
      if (info.max || info.locked) continue;
      targets.push(p);
      total += info.cost;
    }
    if (!targets.length) return { ok: false, count: 0, cost: 0, reason: '업그레이드할 수 있는 농지가 없습니다' };
    if (this.w.state.gold < total) return { ok: false, count: 0, cost: total, reason: '골드가 부족합니다' };
    this.w.spend(total, '농지 업그레이드');
    for (const p of targets) {
      p.upgrades[type]++;
      if (type === 'irrigation' && p.upgrades.irrigation >= 1) p.wateredToday = true;
    }
    this.changed(targets.map((p) => this.key(p)));
    this.w.events.emit('sfx', { key: 'upgrade' });
    return { ok: true, count: targets.length, cost: total };
  }

  // ───── 온실 ─────
  createGreenhousePlots(uid: string, n: number): void {
    for (let i = 0; i < n; i++) {
      const p = newPlot(i, 0, uid);
      p.upgrades.irrigation = 1;
      p.upgrades.pest = 1;
      p.wateredToday = true;
      this.w.state.plots[`gh:${uid}:${i}`] = p;
    }
  }

  greenhousePlots(uid: string): Plot[] {
    return Object.values(this.w.state.plots)
      .filter((p) => p.greenhouse === uid)
      .sort((a, b) => a.x - b.x);
  }

  removeGreenhousePlots(uid: string): void {
    for (const k of Object.keys(this.w.state.plots)) if (k.startsWith(`gh:${uid}:`)) delete this.w.state.plots[k];
  }

  changed(keys: string[] | 'all'): void {
    this.w.events.emit('plots', { keys });
  }
}
