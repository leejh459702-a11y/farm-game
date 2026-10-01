import type { Animal } from '../types';
export function productionYield(a: Animal, product: string) {
  let amount = 1 + (a.grade === 1 ? 1 : 0);
  if (a.traits.includes('우유 생산형') && product.includes('milk')) amount++;
  if (a.traits.includes('양질의 알') && product.includes('egg')) amount++;
  if (a.traits.includes('튼튼한 털') && (product.includes('wool') || product.includes('fur')))
    amount++;
  return amount;
}
export function maturityDays(a: Animal, base: number) {
  return Math.max(1, base - (a.traits.includes('빠른 성장') ? 1 : 0));
}
