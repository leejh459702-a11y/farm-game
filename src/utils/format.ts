export const fmtGold = (n: number): string => `${Math.floor(n).toLocaleString('ko-KR')}G`;
export const fmtNum = (n: number): string => Math.floor(n).toLocaleString('ko-KR');
export const clamp = (v: number, a: number, b: number): number => Math.max(a, Math.min(b, v));
export const tileKey = (x: number, y: number): string => `${x},${y}`;
export const parseKey = (k: string): { x: number; y: number } => {
  const [x, y] = k.split(',').map(Number);
  return { x, y };
};
export const pad = (n: number, d = 2): string => String(n).padStart(d, '0');
