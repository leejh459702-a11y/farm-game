/** A* 경로 탐색 (30×30 + 4방향) */
import { FW, FH } from './constants';

export function findPath(
  sx: number,
  sy: number,
  goals: { x: number; y: number }[],
  blocked: (x: number, y: number) => boolean,
  limit = 2500,
): { x: number; y: number }[] | null {
  if (!goals.length) return null;
  const key = (x: number, y: number) => y * FW + x;
  const goalSet = new Set(goals.map((g) => key(g.x, g.y)));
  if (goalSet.has(key(sx, sy))) return [];
  const h = (x: number, y: number) => Math.min(...goals.map((g) => Math.abs(g.x - x) + Math.abs(g.y - y)));
  const open: { x: number; y: number; f: number; g: number }[] = [{ x: sx, y: sy, f: h(sx, sy), g: 0 }];
  const came = new Map<number, number>();
  const gScore = new Map<number, number>([[key(sx, sy), 0]]);
  let iter = 0;
  while (open.length && iter++ < limit) {
    let bi = 0;
    for (let i = 1; i < open.length; i++) if (open[i].f < open[bi].f) bi = i;
    const cur = open.splice(bi, 1)[0];
    const ck = key(cur.x, cur.y);
    if (goalSet.has(ck)) {
      const path: { x: number; y: number }[] = [];
      let k: number | undefined = ck;
      while (k !== undefined && k !== key(sx, sy)) {
        path.unshift({ x: k % FW, y: Math.floor(k / FW) });
        k = came.get(k);
      }
      return path;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      if (nx < 0 || ny < 0 || nx >= FW || ny >= FH) continue;
      const nk = key(nx, ny);
      if (blocked(nx, ny) && !goalSet.has(nk)) continue;
      const g = cur.g + 1;
      if (g < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, g);
        came.set(nk, ck);
        open.push({ x: nx, y: ny, g, f: g + h(nx, ny) });
      }
    }
  }
  return null;
}
