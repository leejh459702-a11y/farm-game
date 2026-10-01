/**
 * 세이브 마이그레이션 — 버전 n → n+1 변환 함수를 순서대로 적용.
 * 새 필드를 추가할 때는 SAVE_VERSION 을 올리고 여기에 변환을 추가한다.
 */
import { SAVE_VERSION, createNewGame } from '../core/newGame';
import type { GameState } from '../types/game';

type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

/** key = from version */
export const MIGRATIONS: Record<number, Migration> = {
  // 0 → 1: 버전 필드가 없던 초기 개발 세이브 보정
  0: (s) => ({ ...s, version: 1 }),
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
