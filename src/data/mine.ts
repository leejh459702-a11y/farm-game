/**
 * 광산 — 바위 언덕(초반) 이후 폐광(1~10층, 채집 Lv.3) → 깊은 광산(11층~, 채집 Lv.6 + 철 곡괭이).
 * 층마다 나오는 광맥이 달라지고, 매일 새로 생성된다. 사다리로 내려가고 5층마다 승강기가 열린다.
 */
export const MINE = {
  unlockForaging: 3,
  deepFloor: 11,
  deepForaging: 6,
  deepPickaxe: 2,
  maxFloor: 25,
  /** 승강기 간격 */
  elevatorEvery: 5,
  /** 바위를 깨면 사다리가 나올 확률, 이 수만큼 깨면 반드시 */
  ladderChance: 0.18,
  ladderGuarantee: 5,
  rocksPerFloor: [12, 18] as [number, number],
};

/** 층 구간별 광맥 가중치 */
export const MINE_BANDS: { from: number; to: number; name: string; rocks: Record<string, number> }[] = [
  { from: 1, to: 5, name: '폐광 입구', rocks: { rock_stone: 34, rock_dark: 10, rock_coal: 22, rock_copper: 22, rock_clay: 10 } },
  { from: 6, to: 10, name: '폐광 갱도', rocks: { rock_stone: 22, rock_dark: 12, rock_coal: 14, rock_copper: 12, rock_iron: 24, rock_silver: 12, rock_relic: 3 } },
  { from: 11, to: 15, name: '깊은 광산', rocks: { rock_dark: 26, rock_iron: 14, rock_silver: 12, rock_gold: 16, rock_gem: 8, rock_ruby: 5, rock_emerald: 5, rock_relic: 5 } },
  { from: 16, to: 99, name: '광산 최심부', rocks: { rock_dark: 24, rock_gold: 16, rock_gem: 8, rock_ruby: 7, rock_emerald: 7, rock_moon: 6, rock_star: 3, rock_relic: 8 } },
];

export function mineBand(floor: number) {
  return MINE_BANDS.find((b) => floor >= b.from && floor <= b.to) ?? MINE_BANDS[MINE_BANDS.length - 1];
}

/** 채광 중 드물게 나오는 광물주머니·지오드 (층에 따라 확률 변화) */
export function geodeChances(floor: number): { id: string; chance: number }[] {
  return [
    { id: 'ore_bag', chance: floor <= 10 ? 0.07 : 0.04 },
    { id: 'geode', chance: floor >= 4 ? 0.05 : 0.02 },
    { id: 'magma_geode', chance: floor >= 14 ? 0.035 : 0 },
  ];
}

/** 열었을 때 내용물 (가중치) — kind: item / artifact / seed */
export const GEODE_LOOT: Record<string, { id: string; min: number; max: number; w: number }[]> = {
  ore_bag: [
    { id: 'stone', min: 3, max: 6, w: 24 },
    { id: 'coal', min: 2, max: 4, w: 22 },
    { id: 'copper_ore', min: 2, max: 5, w: 24 },
    { id: 'iron_ore', min: 1, max: 3, w: 16 },
    { id: 'silver_ore', min: 1, max: 2, w: 8 },
    { id: 'gold_ore', min: 1, max: 1, w: 4 },
    { id: 'amethyst', min: 1, max: 1, w: 2 },
  ],
  geode: [
    { id: 'iron_ore', min: 2, max: 4, w: 16 },
    { id: 'silver_ore', min: 1, max: 3, w: 16 },
    { id: 'gold_ore', min: 1, max: 2, w: 14 },
    { id: 'amethyst', min: 1, max: 1, w: 12 },
    { id: 'ruby', min: 1, max: 1, w: 7 },
    { id: 'emerald', min: 1, max: 1, w: 7 },
    { id: '@artifact', min: 1, max: 1, w: 8 },
    { id: '@rareseed', min: 1, max: 1, w: 5 },
    { id: '@book', min: 1, max: 1, w: 1 },
  ],
  magma_geode: [
    { id: 'gold_ore', min: 2, max: 4, w: 16 },
    { id: 'ruby', min: 1, max: 2, w: 12 },
    { id: 'emerald', min: 1, max: 2, w: 12 },
    { id: 'moonstone', min: 1, max: 1, w: 10 },
    { id: 'star_crystal', min: 1, max: 1, w: 4 },
    { id: '@artifact', min: 1, max: 1, w: 12 },
    { id: '@rareseed', min: 1, max: 1, w: 8 },
    { id: '@book', min: 1, max: 1, w: 3 },
  ],
};
