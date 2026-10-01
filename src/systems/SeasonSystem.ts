/**
 * SeasonSystem — 달력 계산 (순수 함수).
 * 1달 = 10일, 1계절 = 3달(30일), 1년 = 120일. 봄 3월부터 시작.
 */
import { BALANCE } from '../data/balance';
import { SEASONS, WEEKDAYS } from '../data/seasons';
import type { SeasonId } from '../types/game';
import { pad } from '../utils/format';

const T = BALANCE.time;
export const DAYS_PER_SEASON = T.daysPerMonth * T.monthsPerSeason;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * 4;
export const MONTHS_PER_YEAR = T.monthsPerSeason * 4;

export interface CalendarInfo {
  year: number; // 1부터
  season: SeasonId;
  seasonIndex: number;
  /** 0~11 (0 = 3월) */
  monthIndex: number;
  /** 실제 달 번호 3,4,…,12,1,2 */
  month: number;
  /** 1~10 */
  dayOfMonth: number;
  /** 1~30 */
  dayOfSeason: number;
  weekday: string;
}

export function calendar(day: number): CalendarInfo {
  const year = Math.floor(day / DAYS_PER_YEAR) + 1;
  const dYear = day % DAYS_PER_YEAR;
  const seasonIndex = Math.floor(dYear / DAYS_PER_SEASON);
  const monthIndex = Math.floor(dYear / T.daysPerMonth);
  const season = SEASONS[seasonIndex];
  return {
    year,
    season: season.id,
    seasonIndex,
    monthIndex,
    month: season.months[monthIndex % T.monthsPerSeason],
    dayOfMonth: (dYear % T.daysPerMonth) + 1,
    dayOfSeason: (dYear % DAYS_PER_SEASON) + 1,
    weekday: WEEKDAYS[day % 7],
  };
}

export const seasonOf = (day: number): SeasonId => calendar(day).season;

/** 낮 길이(초) */
export const dayLength = (season: SeasonId): number => T.dayLengthSec[season];

/** 해 뜨는 시각(분) — 정오를 중심으로 낮이 배치되도록 계산 */
export function sunriseMinute(season: SeasonId): number {
  const dayHours = (24 * dayLength(season)) / T.secondsPerDay;
  return Math.round((12 - dayHours / 2) * 60);
}

/** 하루 경과 초 → 게임 시계(분, 0~1439) */
export function clockMinute(season: SeasonId, elapsed: number): number {
  return (sunriseMinute(season) + Math.floor((elapsed / T.secondsPerDay) * 1440)) % 1440;
}

export function clockString(season: SeasonId, elapsed: number): string {
  const m = clockMinute(season, elapsed);
  const h = Math.floor(m / 60);
  const ampm = h < 12 ? '오전' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${pad(h12)}:${pad(m % 60)}`;
}

export const isNight = (season: SeasonId, elapsed: number): boolean => elapsed >= dayLength(season);

/**
 * 0(한낮) ~ 1(한밤) 의 어둠 정도. 해질녘/새벽에 부드럽게 전이.
 */
export function darkness(season: SeasonId, elapsed: number): number {
  const dl = dayLength(season);
  const total = T.secondsPerDay;
  const fade = 40; // 초
  if (elapsed < dl - fade) {
    // 새벽 직후 서서히 밝아짐
    return elapsed < fade ? 0.5 * (1 - elapsed / fade) : 0;
  }
  if (elapsed < dl + fade) return (elapsed - (dl - fade)) / (2 * fade);
  if (elapsed > total - fade) return 1 - ((elapsed - (total - fade)) / fade) * 0.5;
  return 1;
}

/** 해질녘/새벽 따뜻한 색감 정도 0~1 */
export function duskAmount(season: SeasonId, elapsed: number): number {
  const dl = dayLength(season);
  const w = 60;
  const d1 = Math.abs(elapsed - dl);
  const d2 = Math.min(elapsed, T.secondsPerDay - elapsed);
  const v = Math.max(0, 1 - d1 / w, 1 - d2 / (w * 0.6));
  return Math.min(1, v);
}

export function dateLabel(day: number): string {
  const c = calendar(day);
  const s = SEASONS[c.seasonIndex].name;
  return `${s} ${c.month}월 ${c.dayOfMonth}일(${c.weekday})`;
}

export function isMonthStart(day: number): boolean {
  return day > 0 && day % T.daysPerMonth === 0;
}
