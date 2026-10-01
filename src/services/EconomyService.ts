/**
 * EconomyService — 모든 가격 계산 담당 (UI와 분리).
 * 판매가 = 기본가 × 신선도 배율 × 제철 보너스 × 상인 보너스
 */
import { BALANCE } from '../data/balance';
import { ITEM_BY_ID } from '../data/items';
import { ANIMAL_BY_ID, TRAIT_BY_ID } from '../data/animals';
import type { Animal, SeasonId } from '../types/game';

export interface PriceContext {
  season: SeasonId;
  /** 특급상인 매입 보너스 (0.1 = +10%) */
  merchantBonus: number;
  /** 농장 아름다움 보너스 (0 ~ 0.05) */
  beautyBonus?: number;
}

export function freshnessMultiplier(freshness: number | undefined): number {
  if (freshness === undefined) return 1;
  const f = Math.max(0, Math.min(100, freshness));
  if (f <= 0) return 0;
  for (const b of BALANCE.freshness.brackets) if (f >= b.min) return b.mul;
  return 0;
}

export function freshnessLabel(freshness: number | undefined): string {
  if (freshness === undefined) return '보존';
  const f = Math.ceil(freshness);
  if (f >= 90) return '아주 신선';
  if (f >= 70) return '신선';
  if (f >= 50) return '보통';
  if (f >= 20) return '시듦';
  if (f >= 1) return '상하기 직전';
  return '부패';
}

export function isInSeason(itemId: string, season: SeasonId): boolean {
  const d = ITEM_BY_ID[itemId];
  return !!d?.season && d.season.includes(season);
}

export function seasonMultiplier(itemId: string, season: SeasonId): number {
  return isInSeason(itemId, season) ? 1 + BALANCE.economy.seasonBonus : 1;
}

/** 단가 (정수 G) */
export function sellPrice(itemId: string, freshness: number | undefined, ctx: PriceContext, bonus = 0): number {
  const d = ITEM_BY_ID[itemId];
  if (!d || !d.sellable) return 0;
  const fm = d.decay > 0 ? freshnessMultiplier(freshness) : 1;
  if (fm <= 0) return 0;
  const raw = d.basePrice * fm * seasonMultiplier(itemId, ctx.season) * (1 + ctx.merchantBonus + (ctx.beautyBonus ?? 0)) * (1 + bonus);
  return Math.max(1, Math.round(raw));
}

export function buyPrice(base: number, discount: number): number {
  return Math.max(1, Math.round(base * (1 - discount)));
}

export function traitMul(traits: string[], key: 'sellMul' | 'productMul' | 'meatMul' | 'feedMul' | 'growthMul' | 'affectionMul' | 'pregnancyMul'): number {
  let m = 1;
  for (const t of traits) {
    const v = TRAIT_BY_ID[t]?.fx[key];
    if (v !== undefined) m *= v;
  }
  return m;
}

export function animalSellPrice(a: Animal, ctx: PriceContext): number {
  const d = ANIMAL_BY_ID[a.species];
  const gradeMul = BALANCE.economy.animalGradeSellMul[a.grade];
  const stageMul = BALANCE.economy.animalStageSellMul[a.stage];
  const statAvg = (a.stats.productivity + a.stats.growth + a.stats.health + a.stats.fertility + a.stats.physique) / 5;
  const statMul = 0.8 + statAvg / 250; // 0.8 ~ 1.2
  const raw = d.baseSellPrice * gradeMul * stageMul * statMul * traitMul(a.traits, 'sellMul') * (1 + ctx.merchantBonus);
  return Math.max(1, Math.round(raw));
}

/** 토지 가격: 현재 집 레벨 단계의 기본가 + 단계 내 구매 수 × 증가액 */
export function landPrice(houseLevel: number, boughtAtLevel: number): number {
  const tier = BALANCE.land.tiers[Math.max(0, Math.min(BALANCE.land.tiers.length - 1, houseLevel - 1))];
  return tier.base + tier.step * boughtAtLevel;
}

export function landCap(houseLevel: number): number {
  const tier = BALANCE.land.tiers[Math.max(0, Math.min(BALANCE.land.tiers.length - 1, houseLevel - 1))];
  return tier.maxTiles;
}

/** 월 운영비 = 지난달 판매수익 × 집 레벨별 비율 */
export function operatingCost(lastMonthSales: number, houseLevel: number): number {
  const rate = BALANCE.house.operatingCostRate[Math.max(0, Math.min(5, houseLevel - 1))];
  return Math.round(lastMonthSales * rate);
}

/** 농장 아름다움 → 판매 보너스 (최대 +5%) */
export function beautyBonus(beauty: number): number {
  return Math.min(0.05, beauty * 0.001);
}
