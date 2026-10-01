/**
 * BalanceConfig — 게임의 모든 핵심 밸런스 수치를 한 곳에서 관리한다.
 * 수치를 바꾸고 싶다면 이 파일만 수정하면 된다. (BALANCE.md 참고)
 */
import type { SeasonId, WeatherId } from '../types/game';

export const BALANCE = {
  /** 시작 상태 */
  start: {
    gold: 600,
    /** 30×30 영역 안에서 시작 3×3 의 좌상단 좌표 */
    originX: 13,
    originY: 13,
    size: 3,
    items: [
      { itemId: 'seed_carrot', qty: 6 },
    ] as { itemId: string; qty: number }[],
    bagSlots: 24,
  },

  farm: {
    maxWidth: 30,
    maxHeight: 30,
    /** 타일 크기(논리 픽셀) */
    tileSize: 32,
    /** 농장 바깥 장식 숲 여백(타일) */
    borderTiles: 6,
  },

  /** 시간: 현실 600초 = 게임 하루 */
  time: {
    secondsPerDay: 600,
    daysPerMonth: 10,
    monthsPerSeason: 3,
    /** 0=봄(3월)부터 시작 */
    startMonthIndex: 0,
    /** 시즌별 낮 길이(초). 나머지는 밤 */
    dayLengthSec: { spring: 300, summer: 420, autumn: 300, winter: 180 } as Record<SeasonId, number>,
  },

  /** 날씨 확률 (합이 1일 필요는 없음 — 가중치) */
  weather: {
    spring: { sunny: 50, cloudy: 25, rain: 25 },
    summer: { sunny: 50, cloudy: 15, rain: 20, storm: 15 },
    autumn: { sunny: 50, cloudy: 30, rain: 20 },
    winter: { sunny: 30, cloudy: 30, snow: 40 },
  } as Record<SeasonId, Partial<Record<WeatherId, number>>>,

  /** 토지 가격 (집 레벨별) */
  land: {
    /** 레벨 인덱스 = 집 레벨 - 1 */
    tiers: [
      { maxTiles: 25, base: 500, step: 50 },
      { maxTiles: 64, base: 1500, step: 75 },
      { maxTiles: 144, base: 4000, step: 100 },
      { maxTiles: 324, base: 10000, step: 150 },
      { maxTiles: 576, base: 25000, step: 250 },
      { maxTiles: 900, base: 60000, step: 400 },
    ],
  },

  /** 집 업그레이드 — level N 으로 가기 위한 조건 */
  house: {
    maxLevel: 6,
    upgrades: [
      { level: 2, cost: 5000, farming: 2, livestock: 1 },
      { level: 3, cost: 20000, farming: 3, livestock: 3 },
      { level: 4, cost: 60000, farming: 5, livestock: 4 },
      { level: 5, cost: 180000, farming: 7, livestock: 6 },
      { level: 6, cost: 500000, farming: 8, livestock: 8 },
    ],
    /** 월 운영비 비율(지난달 판매 수익 기준) — 인덱스 = 집 레벨-1 */
    operatingCostRate: [0.02, 0.03, 0.04, 0.05, 0.06, 0.07],
  },

  /** 신선도 → 판매가 배율 */
  freshness: {
    max: 100,
    brackets: [
      { min: 90, mul: 1.1 },
      { min: 70, mul: 1.0 },
      { min: 50, mul: 0.8 },
      { min: 20, mul: 0.5 },
      { min: 1, mul: 0.2 },
      { min: 0, mul: 0 },
    ],
    /** 스택 병합 허용 신선도 차이 */
    mergeTolerance: 10,
    /** 경고 기준 */
    warnBelow: 50,
  },

  economy: {
    seasonBonus: 0.1,
    /** 동물 등급별 판매가 배율 (key: 등급) */
    animalGradeSellMul: { 3: 1.0, 2: 1.6, 1: 2.8 } as Record<1 | 2 | 3, number>,
    /** 성장단계별 동물 판매 배율 */
    animalStageSellMul: { baby: 0.4, juvenile: 0.7, adult: 1.0 },
    /** 시설 철거 시 환불 비율 */
    buildingRefund: 0.5,
  },

  merchant: {
    minInterval: 2,
    maxInterval: 3,
    /** 첫 일반 방문 (튜토리얼 이후) */
    specialBaseChance: 0.12,
    /** 특급상인이 안 나올수록 매 방문 증가하는 내부 확률 (비공개) */
    specialPityStep: 0.15,
    specialSellBonus: [0.1, 0.4] as [number, number],
    specialDiscount: [0.1, 0.3] as [number, number],
    seedOffers: 6,
    animalOffers: 2,
    miscOffers: 4,
    specialRareOffers: 3,
  },

  skills: {
    maxLevel: 10,
    /** 레벨 n → n+1 필요 누적 경험치: base * n^exp */
    xpBase: 60,
    xpExp: 1.7,
  },

  xp: {
    harvestPerPrice: 0.12,
    harvestMin: 2,
    plant: 1,
    water: 0,
    till: 0,
    feed: 1,
    pet: 2,
    collect: 3,
    breed: 20,
    birth: 25,
    process: 4,
    cook: 6,
  },

  crops: {
    /** 해충 방지 미적용 시 수확량 -1 확률(최소 1 보장) */
    pestChance: 0.08,
    /** 토양 개량 레벨별 추가 수확 확률 */
    soilExtraChance: [0, 0.15, 0.3, 0.5],
    /** 비료 */
    fertilizer: {
      basic_fertilizer: { growthBonus: 0, extraChance: 0.2, days: 30 },
      growth_fertilizer: { growthBonus: 0.25, extraChance: 0, days: 30 },
      premium_fertilizer: { growthBonus: 0.25, extraChance: 0.35, days: 60 },
      compost: { growthBonus: 0, extraChance: 0.12, days: 20 },
      special_fertilizer: { growthBonus: 0.5, extraChance: 0.5, days: 120 },
    } as Record<string, { growthBonus: number; extraChance: number; days: number }>,
  },

  /** 농지 내부 업그레이드 비용 (레벨 index = 목표 레벨) */
  plotUpgrades: {
    irrigation: { costs: [0, 150, 400, 900], skill: ['', 'f_irrig1', 'f_irrig2', 'f_irrig3'] },
    soil: { costs: [0, 200, 500, 1200], skill: ['', 'f_soil1', 'f_soil1', 'f_soil2'] },
    pest: { costs: [0, 250], skill: ['', 'f_pest'] },
    autoHarvest: { costs: [0, 800], skill: ['', 'f_autoHarvest'] },
  } as Record<string, { costs: number[]; skill: string[] }>,

  /** 축사 내부 업그레이드 */
  barnUpgrades: {
    autoFeed: { costs: [0, 1500, 4000], skill: ['', 'l_autoFeed', 'l_autoFeed2'] },
    autoClean: { costs: [0, 1200], skill: ['', 'l_autoClean'] },
    autoCollect: { costs: [0, 2500], skill: ['', 'l_autoCollect'] },
    capacity: { costs: [0, 2000, 6000], skill: ['', 'l_barnExpand', 'l_barnExpand'] },
  } as Record<string, { costs: number[]; skill: string[] }>,
  /** 축사 수용 확장 레벨당 추가 수 */
  barnCapacityPerLevel: 2,
  /** 자동급식 Lv2: 사료가 없어도 하루 동물 1마리당 비용으로 자동 조달 */
  autoFeedLv2CostPerAnimal: 6,

  animals: {
    /** 하루 먹이 미급여 시 애정 감소 */
    hungryAffectionLoss: 8,
    petAffection: 6,
    feedAffection: 2,
    maxAffection: 100,
    /** 청소 안 된 축사: 생산 확률 감소 */
    dirtyProductionMul: 0.7,
    dirtPerDay: 20,
    traitsMax: 3,
    idDigits: 6,
  },

  breeding: {
    /** [부모등급A][부모등급B] → 자식 등급 확률. 순서 무관(정렬된 key) */
    gradeTable: {
      '3x3': { 3: 0.8, 2: 0.2, 1: 0 },
      '2x3': { 3: 0.35, 2: 0.6, 1: 0.05 },
      '2x2': { 3: 0.1, 2: 0.75, 1: 0.15 },
      '1x3': { 3: 0.3, 2: 0.6, 1: 0.1 },
      '1x2': { 3: 0, 2: 0.65, 1: 0.35 },
      '1x1': { 3: 0, 2: 0.25, 1: 0.75 },
    } as Record<string, Record<1 | 2 | 3, number>>,
    traitInheritChance: 0.4,
    mutationChance: 0.06,
    /** 고급 브리딩 연구 시 1등급 확률 가산 (재정규화) */
    advancedGradeBonus: 0.05,
    /** 브리딩 연구소 보유 시 추가 가산 */
    labGradeBonus: 0.05,
    statVariance: 12,
    breedCost: 100,
    /** 브리딩 후 같은 암컷 재브리딩 대기일 */
    cooldownDays: 3,
  },

  storage: {
    bagSlotsPerUpgrade: 6,
  },

  processing: {
    /** 자동 가공(투입) 업그레이드 비용 */
    autoInputCost: 3000,
  },

  notifications: {
    toastSeconds: 3.2,
    maxVisible: 4,
  },

  /** 생활 숙련도 (낚시·채집) — 농사/목축 진행 조건과 무관한 선택 콘텐츠 */
  life: {
    maxLevel: 10,
    xpBase: 30,
    xpExp: 1.6,
    xp: { fishCommon: 6, fishRare: 14, fishEpic: 28, fishLegend: 60, forage: 3, chop: 2, mine: 2, chest: 5 },
    /** 채집 Lv 별 추가 수확 확률 */
    forageExtra: [0, 0, 0.1, 0.1, 0.15, 0.15, 0.25, 0.25, 0.3, 0.3, 0.4],
  },

  fishing: {
    /** 입질 대기 (초) */
    waitMin: 2.5,
    waitMax: 6.5,
    rarityWeight: { common: 60, rare: 16, epic: 4, legend: 0.6 },
    /** 시간대 불일치 시 등장 배율 */
    wrongTimeMul: 0.12,
    weatherBoost: 2.5,
    /** 진행률 (0~1): 시작값, 초당 증가/감소 */
    progressStart: 0.3,
    progressGain: 0.085,
    progressDrain: 0.075,
    zoneSize: 0.24,
    zoneSizePerRod: 0.04,
    /** 크기 보너스 최대 (판매가 +10%) */
    sizeBonusMax: 0.1,
  },

  regions: {
    /** 큰 나무 재생 일수 */
    bigTreeRegrow: [2, 3] as [number, number],
    smallTreeRegrow: 1,
    rockRegrow: [1, 2] as [number, number],
    /** 지역당 매일 오래된 상자 이벤트 확률 */
    chestChance: 0.07,
  },

  autosave: {
    /** 주요 시설 변경 후 자동저장 디바운스(ms) */
    debounceMs: 1500,
  },
} as const;

export type Balance = typeof BALANCE;
