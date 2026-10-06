/**
 * 농업 교환권 — 희귀 활동 보상으로 모으고, 일정 수량으로 원하는 보상을 고른다 (랜덤 뽑기 없음).
 * 획득: 전설 물고기 · 1등급 동물 출산 · 희귀 광물 · 월간 기록 · 도감 달성
 */
export interface ExchangeOption {
  id: string;
  name: string;
  cost: number;
  icon: string;
  desc: string;
  /** 고를 수 있는 대상 */
  choices: { id: string; label: string; icon: string }[];
}

export const TICKET_SOURCES = [
  '전설 물고기 +2',
  '1등급 동물 출산 +1',
  '희귀 광물(월장석·별빛 결정) +1',
  '월간 기록: 한 달 수입 1만G +1, 5만G +2',
  '도감 발견 10종마다 +1',
];

export const EXCHANGE: ExchangeOption[] = [
  {
    id: 'ex_seed',
    name: '희귀 씨앗',
    cost: 10,
    icon: 'it_seed_goldenmelon',
    desc: '희귀 씨앗 3개 (묘목은 1개)',
    choices: ['goldenmelon', 'ginseng', 'rainbowrose', 'starfruit', 'snowlotus', 'mango', 'yuzu'].map((id) => ({ id, label: id, icon: `it_seed_${id}` })),
  },
  { id: 'ex_deco', name: '특별 장식', cost: 10, icon: 'bld_fountain', desc: '특급상인 장식 하나', choices: ['cherrytree', 'goldstatue', 'fountain'].map((id) => ({ id, label: id, icon: `bld_${id}` })) },
  { id: 'ex_animal', name: '희귀 동물', cost: 15, icon: 'portrait_alpaca', desc: '2등급 희귀 동물 한 마리 (들어갈 축사 필요)', choices: ['alpaca', 'buffalo', 'ostrich'].map((id) => ({ id, label: id, icon: `portrait_${id}` })) },
  { id: 'ex_book', name: '스킬북', cost: 12, icon: 'it_book_farmer', desc: '원하는 스킬북 한 권', choices: ['book_farmer', 'book_aging', 'book_fishing', 'book_genetics', 'book_miner'].map((id) => ({ id, label: id, icon: `it_${id}` })) },
  { id: 'ex_coupon', name: '시설 무료 설치권', cost: 8, icon: 'ic_build', desc: '생산 시설 하나를 무료로 설치', choices: ['processor', 'kitchen', 'cellar', 'fishpond', 'greenhouse', 'breeding'].map((id) => ({ id, label: id, icon: `bld_${id}` })) },
];

export const EXCHANGE_BY_ID: Record<string, ExchangeOption> = Object.fromEntries(EXCHANGE.map((e) => [e.id, e]));
