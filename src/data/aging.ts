/**
 * 숙성 데이터 — 숙성고에 넣어 두면 날짜에 따라 가치가 오른다.
 * "지금 바로 팔 것인가, 더 기다려 비싸게 팔 것인가"
 * 예) 치즈 기본 500G → 3일 650G → 7일 850G → 15일 1200G
 */
export type AgingCurveId = 'cheese' | 'wine' | 'general';

/** [필요 일수, 가치 보너스] — 보너스 0.3 = +30% */
export const AGING_CURVES: Record<AgingCurveId, [number, number][]> = {
  cheese: [
    [3, 0.3],
    [7, 0.7],
    [15, 1.4],
  ],
  wine: [
    [3, 0.2],
    [7, 0.5],
    [15, 1.1],
    [30, 2.0],
  ],
  general: [
    [3, 0.15],
    [7, 0.35],
    [15, 0.7],
  ],
};

/** 숙성 가능한 품목 → 곡선 */
export const AGEABLE: Record<string, AgingCurveId> = {
  cheese: 'cheese',
  goat_cheese: 'cheese',
  premium_cheese: 'cheese',
  mozzarella: 'cheese',
  wine: 'wine',
  fruit_wine: 'wine',
  kimchi: 'general',
  winter_kimchi: 'general',
  ham: 'general',
  beef_jerky: 'general',
  maple_syrup: 'general',
  caviar: 'general',
  smoked_fish: 'general',
};

/** 숙성 일수 → 보너스 (달성한 가장 높은 단계) */
export function agingBonus(itemId: string, days: number): number {
  const curve = AGEABLE[itemId];
  if (!curve) return 0;
  let b = 0;
  for (const [d, v] of AGING_CURVES[curve]) if (days >= d) b = v;
  return b;
}

/** 다음 단계까지 남은 일수 (최고 단계면 null) */
export function nextAgingStep(itemId: string, days: number): { days: number; bonus: number } | null {
  const curve = AGEABLE[itemId];
  if (!curve) return null;
  const next = AGING_CURVES[curve].find(([d]) => d > days);
  return next ? { days: next[0] - days, bonus: next[1] } : null;
}

/** 숙성고 칸 수 (업그레이드 단계별) */
export const CELLAR_SLOTS = [6, 9, 12];
export const CELLAR_UPGRADES = {
  capacity: { name: '숙성 선반 확장', desc: ['6칸', '9칸', '12칸'], cost: [{ gold: 4000, mats: [{ id: 'wood', qty: 40 }, { id: 'stone', qty: 20 }] }, { gold: 10000, mats: [{ id: 'brick', qty: 20 }, { id: 'iron_ore', qty: 10 }] }] },
  notify: { name: '숙성 완료 알림', desc: ['알림 없음', '새 숙성 단계에 도달하면 알림'], cost: [{ gold: 1500, mats: [{ id: 'copper_ore', qty: 5 }] }] },
} as const;
export type CellarUpgrade = keyof typeof CELLAR_UPGRADES;
