import { BalanceConfig as B } from './balance';
import type { Season } from '../types';
export const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const seasonNames = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
export const weatherNames = { sun: '맑음', cloud: '흐림', rain: '비', storm: '폭우', snow: '눈' };
export function calendar(day: number) {
  const n = (day - 1) % 120;
  const season = seasons[Math.floor(n / B.daysPerSeason)];
  return {
    year: Math.floor((day - 1) / 120) + 1,
    month: ((Math.floor(n / 10) + 2) % 12) + 1,
    date: (n % 10) + 1,
    season,
  };
}
