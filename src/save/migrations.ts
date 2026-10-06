/**
 * 세이브 마이그레이션 — 버전 n → n+1 변환 함수를 순서대로 적용.
 * 새 필드를 추가할 때는 SAVE_VERSION 을 올리고 여기에 변환을 추가한다.
 */
import { SAVE_VERSION, createNewGame } from '../core/newGame';
import type { GameState } from '../types/game';
import { CROP_BY_ID } from '../data/crops';

type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

/** key = from version */
export const MIGRATIONS: Record<number, Migration> = {
  // 0 → 1: 버전 필드가 없던 초기 개발 세이브 보정
  0: (s) => ({ ...s, version: 1 }),
  // 1 → 2: 작물 성장 필드 재구성 (growth/watered → growthProgressDays/wateredToday/mature/currentStage/plantedDay)
  1: (s) => {
    const plots = (s.plots ?? {}) as Record<string, Record<string, unknown>>;
    const crops = CROP_BY_ID;
    const day = ((s.time as { day?: number })?.day ?? 0) as number;
    for (const p of Object.values(plots)) {
      const growth = Math.floor(Number(p.growth ?? 0));
      const cropId = p.cropId as string | null;
      const grow = cropId && crops[cropId] ? crops[cropId].growDays : 1;
      p.growthProgressDays = Math.min(growth, grow);
      p.wateredToday = !!p.watered;
      p.mature = !!cropId && growth >= grow;
      p.plantedDay = day;
      p.currentStage = !cropId ? 0 : p.mature ? 4 : growth <= 0 ? 1 : growth / grow < 0.5 ? 2 : 3;
      delete p.growth;
      delete p.watered;
    }
    return { ...s, plots, version: 2 };
  },
  // 2 → 3: 생활 콘텐츠 (낚시·채집·벌목·채광) — 새 필드는 기본값 보정으로 채워진다
  2: (s) => {
    const tut = s.tutorial as { done?: boolean } | undefined;
    // 튜토리얼을 이미 마친 세이브는 낚싯대 지급
    const tools = { axe: 0, pickaxe: 0, rod: 0, rodOwned: !!tut?.done };
    return { ...s, tools: s.tools ?? tools, version: 3 };
  },
  // 3 → 4: 동물 행복도 추가 (기존 동물은 기본값 60)
  3: (s) => {
    const animals = (s.animals ?? {}) as Record<string, Record<string, unknown>>;
    for (const a of Object.values(animals)) if (typeof a.happiness !== 'number') a.happiness = 60;
    return { ...s, version: 4 };
  },
  // 4 → 5: 5대 생활 기술 개편 — 이미 쓰던 양식장·광산은 해당 연구를 지급
  4: (s) => {
    const skills = (s.skills ?? {}) as { researched?: string[]; businessXp?: number };
    const r = new Set(skills.researched ?? []);
    const buildings = Object.values((s.buildings ?? {}) as Record<string, { type: string; upgrades?: Record<string, number> }>);
    if (buildings.some((b) => b.type === 'fishpond')) r.add('fi_pond');
    if (buildings.some((b) => b.type === 'fishpond' && ((b.upgrades?.autoCollect ?? 0) > 0 || (b.upgrades?.autoFeed ?? 0) > 0))) r.add('fi_pondAuto');
    const mine = s.mine as { deepest?: number } | undefined;
    if ((mine?.deepest ?? 0) > 0) r.add('ga_mine');
    if ((mine?.deepest ?? 0) >= 11) r.add('ga_deep');
    const tools = s.tools as { axe?: number; pickaxe?: number; rod?: number } | undefined;
    if (Math.max(tools?.axe ?? 0, tools?.pickaxe ?? 0, tools?.rod ?? 0) >= 2) r.add('ga_tools');
    return { ...s, skills: { ...skills, businessXp: skills.businessXp ?? 0, researched: [...r] }, version: 5 };
  },
};

export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('잘못된 세이브 데이터');
  let s = raw as Record<string, unknown>;
  let v = typeof s.version === 'number' ? (s.version as number) : 0;
  if (v > SAVE_VERSION) throw new Error(`더 새로운 버전의 세이브입니다 (v${v})`);
  while (v < SAVE_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`마이그레이션 없음: v${v}`);
    s = m(s);
    v = s.version as number;
  }
  // 누락 필드 보정 (방어적)
  const base = createNewGame(1) as unknown as Record<string, unknown>;
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  return s as unknown as GameState;
}
