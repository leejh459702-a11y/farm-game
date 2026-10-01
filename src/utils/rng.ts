/** mulberry32 — 세이브에 상태를 저장할 수 있는 결정적 난수 */
export function nextRandom(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(r: () => number, min: number, max: number): number {
  return min + Math.floor(r() * (max - min + 1));
}

export function pickWeighted<T extends string | number>(r: () => number, weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + (w ?? 0), 0);
  let x = r() * total;
  for (const [k, w] of entries) {
    x -= w ?? 0;
    if (x < 0) return k;
  }
  return entries[entries.length - 1][0];
}

export function pick<T>(r: () => number, arr: readonly T[]): T {
  return arr[Math.floor(r() * arr.length)];
}

export function shuffle<T>(r: () => number, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
