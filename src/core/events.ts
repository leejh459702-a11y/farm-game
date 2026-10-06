import type { Ledger, MonthSummary, WeatherId } from '../types/game';

export interface GameNotification {
  /** 같은 key 는 묶어서 표시 */
  key: string;
  text: string;
  icon?: string;
  count?: number;
  /** 탭 시 카메라 이동 */
  target?: { x: number; y: number };
  tone?: 'info' | 'good' | 'warn';
}

export interface DaySummary {
  day: number;
  ledger: Ledger;
  goldEnd: number;
  /** 오늘 성장한 작물 수 / 물을 받지 못해 멈춘 작물 수 */
  crops: { grew: number; dry: number };
}

export interface WorldEvents {
  gold: number;
  inventory: { containerId: string };
  plots: { keys: string[] | 'all' };
  buildings: void;
  land: void;
  animals: void;
  player: void;
  dayStarted: { day: number };
  dayEnded: DaySummary;
  monthEnded: MonthSummary;
  merchant: { present: boolean; special: boolean };
  notify: GameNotification;
  levelUp: { tree: 'farming' | 'livestock'; level: number };
  weather: { today: WeatherId };
  research: { id: string };
  house: { level: number };
  tutorial: { step: number };
  sfx: { key: string };
  /** 자동 저장 트리거 (주요 변경) */
  majorChange: { reason: string };
  processing: void;
  birth: { motherId: string; babyIds: string[] };
  /** 외곽 지역 노드 변화 */
  regions: { id: string };
  ponds: void;
  journal: void;
  /** 활동 카운터 증가 (농장일지) */
  counter: { key: string; total: number };
  floatText: { x: number; y: number; text: string; color?: string };
}
