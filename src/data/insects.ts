/**
 * 곤충 정원 — 꽃의 종류·수와 계절·시간에 따라 농장에 찾아오는 곤충. 탭해서 도감에 등록한다.
 * 곤충은 해를 끼치지 않는다. 수분 곤충이 주변(3칸)에 있으면 작물 수확량이 조금(+5%) 는다.
 */
import type { SeasonId } from '../types/game';

export interface InsectData {
  id: string;
  name: string;
  season: SeasonId[];
  time: 'day' | 'night';
  /** 꽃이 필요한가 (필요하면 꽃 근처에만 등장) */
  flower: boolean;
  /** 최소 꽃 수 */
  minFlowers?: number;
  pollinator: boolean;
  rarity: 'common' | 'rare' | 'epic';
  color: number;
  color2: number;
  shape: 'butterfly' | 'bee' | 'beetle' | 'dragonfly' | 'moth' | 'firefly' | 'cicada' | 'cricket';
}

export const INSECTS: InsectData[] = [
  { id: 'cabbage_white', name: '배추흰나비', season: ['spring', 'summer'], time: 'day', flower: true, pollinator: true, rarity: 'common', color: 0xf6f6ee, color2: 0x3a3a3a, shape: 'butterfly' },
  { id: 'swallowtail', name: '호랑나비', season: ['spring', 'summer'], time: 'day', flower: true, pollinator: true, rarity: 'rare', color: 0xf6d84a, color2: 0x2a2a2a, shape: 'butterfly' },
  { id: 'honeybee', name: '꿀벌', season: ['spring', 'summer', 'autumn'], time: 'day', flower: true, pollinator: true, rarity: 'common', color: 0xf2c83a, color2: 0x3a2a1a, shape: 'bee' },
  { id: 'bumblebee', name: '호박벌', season: ['spring', 'summer'], time: 'day', flower: true, pollinator: true, rarity: 'rare', color: 0xf0b030, color2: 0x1a1a1a, shape: 'bee' },
  { id: 'ladybug', name: '무당벌레', season: ['spring', 'summer', 'autumn'], time: 'day', flower: false, pollinator: false, rarity: 'common', color: 0xe0303c, color2: 0x1a1a1a, shape: 'beetle' },
  { id: 'dragonfly', name: '밀잠자리', season: ['summer'], time: 'day', flower: false, pollinator: false, rarity: 'common', color: 0x7ab8e0, color2: 0xd8ecf6, shape: 'dragonfly' },
  { id: 'red_dragonfly', name: '고추잠자리', season: ['autumn'], time: 'day', flower: false, pollinator: false, rarity: 'common', color: 0xe0503a, color2: 0xf6dcd0, shape: 'dragonfly' },
  { id: 'cicada', name: '매미', season: ['summer'], time: 'day', flower: false, pollinator: false, rarity: 'common', color: 0x6a5a3a, color2: 0xc8e0d0, shape: 'cicada' },
  { id: 'firefly', name: '반딧불이', season: ['summer'], time: 'night', flower: false, pollinator: false, rarity: 'rare', color: 0x3a3a2a, color2: 0xf6f080, shape: 'firefly' },
  { id: 'silkmoth', name: '누에나방', season: ['spring', 'summer'], time: 'night', flower: false, pollinator: false, rarity: 'common', color: 0xeee6d6, color2: 0xb8a888, shape: 'moth' },
  { id: 'moon_moth', name: '달빛나방', season: ['summer', 'autumn'], time: 'night', flower: true, pollinator: true, rarity: 'rare', color: 0xb8f0d0, color2: 0x7ac8a0, shape: 'moth' },
  { id: 'cricket', name: '귀뚜라미', season: ['autumn'], time: 'night', flower: false, pollinator: false, rarity: 'common', color: 0x5a4a2a, color2: 0x8a7a4a, shape: 'cricket' },
  { id: 'stag_beetle', name: '사슴벌레', season: ['summer'], time: 'night', flower: false, pollinator: false, rarity: 'epic', color: 0x4a2a1a, color2: 0x8a4a2a, shape: 'beetle' },
  { id: 'snow_moth', name: '겨울자나방', season: ['winter'], time: 'night', flower: false, pollinator: false, rarity: 'rare', color: 0xd8dce8, color2: 0x9aa0b8, shape: 'moth' },
  { id: 'rainbow_butterfly', name: '무지개나비', season: ['spring', 'summer', 'autumn'], time: 'day', flower: true, minFlowers: 5, pollinator: true, rarity: 'epic', color: 0xf07ab8, color2: 0x7ac8f0, shape: 'butterfly' },
];

export const INSECT_BY_ID: Record<string, InsectData> = Object.fromEntries(INSECTS.map((i) => [i.id, i]));
export const INSECT_WEIGHT = { common: 10, rare: 3, epic: 1 };
