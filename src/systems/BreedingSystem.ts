import { BalanceConfig as B } from '../data/balance';
import { traits } from '../data/animals';
import type { Animal } from '../types';
export function gradeProbabilities(a: number, b: number) {
  return B.breeding[[a, b].sort().join('-')];
}
export function rollGrade(a: number, b: number, rng: () => number): 1 | 2 | 3 {
  const p = gradeProbabilities(a, b);
  const r = rng();
  return r < p[0] ? 3 : r < p[0] + p[1] ? 2 : 1;
}
export function inheritTraits(a: string[], b: string[], rng: () => number) {
  const result = [...new Set([...a, ...b])]
    .filter(() => rng() < B.traitInheritance)
    .slice(0, B.maxTraits);
  if (result.length < B.maxTraits && rng() < B.mutationChance) {
    const available = traits.filter((t) => !result.includes(t));
    result.push(available[Math.floor(rng() * available.length)]);
  }
  return result;
}
export function ancestors(
  animal: Animal,
  all: Animal[],
  depth = 3,
): { animal?: Animal; id: string; parents: ReturnType<typeof ancestors> }[] {
  if (!depth) return [];
  return animal.parents.map((id) => {
    const a = all.find((a) => a.id === id);
    return { animal: a, id, parents: a ? ancestors(a, all, depth - 1) : [] };
  });
}
