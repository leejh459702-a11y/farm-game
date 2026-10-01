/** 도구 (인벤토리를 차지하지 않는 전용 Tool Slot) 와 업그레이드 단계 */
export type UpgradableTool = 'axe' | 'pickaxe' | 'rod';

export interface ToolTier {
  name: string;
  cost: number;
  mats: { id: string; qty: number }[];
}

export const TOOL_TIERS: Record<UpgradableTool, { label: string; icon: string; tiers: ToolTier[]; effect: string[] }> = {
  axe: {
    label: '도끼',
    icon: 'tool_axe',
    tiers: [
      { name: '기본 도끼', cost: 0, mats: [] },
      { name: '구리 도끼', cost: 1000, mats: [{ id: 'copper_ore', qty: 10 }, { id: 'wood', qty: 10 }] },
      { name: '철 도끼', cost: 4000, mats: [{ id: 'iron_ore', qty: 10 }, { id: 'coal', qty: 5 }] },
      { name: '고급 도끼', cost: 12000, mats: [{ id: 'gold_ore', qty: 5 }, { id: 'coal', qty: 10 }] },
    ],
    effect: ['나무를 여러 번 찍어야 해요', '벌목 횟수 -1', '벌목 횟수 -2, 큰 나무 목재 +1', '한두 번에 벌목, 목재 +2'],
  },
  pickaxe: {
    label: '곡괭이',
    icon: 'tool_pickaxe',
    tiers: [
      { name: '기본 곡괭이', cost: 0, mats: [] },
      { name: '구리 곡괭이', cost: 1000, mats: [{ id: 'copper_ore', qty: 10 }, { id: 'stone', qty: 10 }] },
      { name: '철 곡괭이', cost: 4000, mats: [{ id: 'iron_ore', qty: 10 }, { id: 'coal', qty: 5 }] },
      { name: '고급 곡괭이', cost: 12000, mats: [{ id: 'gold_ore', qty: 5 }, { id: 'coal', qty: 10 }] },
    ],
    effect: ['돌·점토·석탄·구리 채광', '철 광맥 채광, 채광 횟수 -1', '은·금·자수정 채광, 횟수 -2', '한두 번에 채광, 광석 +1'],
  },
  rod: {
    label: '낚싯대',
    icon: 'tool_rod',
    tiers: [
      { name: '기본 낚싯대', cost: 0, mats: [] },
      { name: '튼튼한 낚싯대', cost: 800, mats: [{ id: 'wood', qty: 20 }, { id: 'copper_ore', qty: 5 }] },
      { name: '전문 낚싯대', cost: 3000, mats: [{ id: 'iron_ore', qty: 8 }, { id: 'sap', qty: 5 }] },
      { name: '명인의 낚싯대', cost: 10000, mats: [{ id: 'gold_ore', qty: 5 }, { id: 'silver_ore', qty: 5 }] },
    ],
    effect: ['기본 낚시', '찌 영역 확대, 진행 속도 +15%', '찌 영역 더 확대, 진행 +30%', '최고급 — 희귀 물고기 확률 증가'],
  },
};
