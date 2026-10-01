import type { SeasonId, WeatherId } from '../types/game';

export interface SeasonData {
  id: SeasonId;
  name: string;
  /** 실제 달 번호 (봄: 3,4,5 …) */
  months: number[];
  /** 낮/밤 화면 색감 (multiply tint) */
  dayTint: number;
  nightTint: number;
  dawnTint: number;
  grassVariant: number;
}

export const SEASONS: SeasonData[] = [
  { id: 'spring', name: '봄', months: [3, 4, 5], dayTint: 0xffffff, nightTint: 0x4a5a9a, dawnTint: 0xffd9b8, grassVariant: 0 },
  { id: 'summer', name: '여름', months: [6, 7, 8], dayTint: 0xfffbea, nightTint: 0x4d5c98, dawnTint: 0xffcf9e, grassVariant: 1 },
  { id: 'autumn', name: '가을', months: [9, 10, 11], dayTint: 0xfff3e0, nightTint: 0x4a4f8c, dawnTint: 0xffc08a, grassVariant: 2 },
  { id: 'winter', name: '겨울', months: [12, 1, 2], dayTint: 0xf0f6ff, nightTint: 0x3c4a8a, dawnTint: 0xe9d4e8, grassVariant: 3 },
];

export const SEASON_BY_ID: Record<SeasonId, SeasonData> = Object.fromEntries(SEASONS.map((s) => [s.id, s])) as Record<SeasonId, SeasonData>;

export const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

export const WEATHER_INFO: Record<WeatherId, { name: string; icon: string; waters: boolean }> = {
  sunny: { name: '맑음', icon: 'ic_sunny', waters: false },
  cloudy: { name: '흐림', icon: 'ic_cloudy', waters: false },
  rain: { name: '비', icon: 'ic_rain', waters: true },
  storm: { name: '폭우', icon: 'ic_storm', waters: true },
  snow: { name: '눈', icon: 'ic_snow', waters: false },
};
