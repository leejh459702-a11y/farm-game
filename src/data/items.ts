import type { ItemCategory, SeasonId } from '../types/game';
import { CROPS, CROP_BY_ID } from './crops';
import { RECIPES } from './recipes';
import { FISH, FISH_BY_ID } from './fish';
import { POND_FISH, roeId } from './aquaculture';
import { FORAGE, RESOURCES } from './gathering';

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  basePrice: number;
  /** 하루 신선도 감소 (0 = 신선도 없음) */
  decay: number;
  /** 제철 계절 (판매 보너스) */
  season?: SeasonId[];
  /** 아이콘 텍스처 key */
  icon: string;
  maxStack: number;
  sellable: boolean;
  desc: string;
  /** 씨앗 → 작물 id */
  cropId?: string;
  tags?: string[];
}

const items: ItemDef[] = [];
const add = (d: Omit<ItemDef, 'icon' | 'maxStack' | 'sellable' | 'desc'> & Partial<ItemDef>) =>
  items.push({ icon: `it_${d.id}`, maxStack: 99, sellable: true, desc: '', ...d });

// 작물 / 씨앗
for (const crop of CROPS) {
  add({ id: crop.id, name: crop.name, category: 'crop', basePrice: crop.baseSellPrice, decay: crop.freshnessDecay, season: crop.season, tags: crop.tags, desc: `${crop.name} — 농작물` });
  add({
    id: `seed_${crop.id}`,
    name: `${crop.name} 씨앗`,
    category: 'seed',
    basePrice: Math.max(1, Math.round(crop.seedPrice / 2)),
    decay: 0,
    cropId: crop.id,
    icon: `it_seed_${crop.id}`,
    desc: `${crop.growDays}일 성장${crop.regrowDays ? `, ${crop.regrowDays}일마다 재수확` : ''}`,
  });
}

// 축산물
const animalProducts: [string, string, number, number][] = [
  ['egg', '달걀', 50, 3],
  ['duck_egg', '오리알', 95, 3],
  ['rabbit_wool', '토끼털', 180, 0],
  ['wool', '양털', 260, 0],
  ['goat_milk', '염소젖', 180, 8],
  ['milk', '우유', 120, 8],
  ['truffle', '송로버섯', 450, 5],
  ['alpaca_wool', '알파카털', 700, 0],
  ['goose_egg', '거위알', 160, 3],
  ['turkey_egg', '칠면조알', 150, 3],
  ['buffalo_milk', '물소젖', 420, 8],
  ['ostrich_egg', '타조알', 900, 2],
  ['chicken_meat', '닭고기', 180, 10],
  ['duck_meat', '오리고기', 260, 10],
  ['mutton', '양고기', 500, 10],
  ['goat_meat', '염소고기', 450, 10],
  ['beef', '소고기', 900, 10],
  ['pork', '돼지고기', 700, 10],
  ['goose_meat', '거위고기', 340, 10],
  ['turkey_meat', '칠면조고기', 360, 10],
  ['buffalo_meat', '물소고기', 1200, 10],
  ['ostrich_meat', '타조고기', 1400, 10],
];
for (const [id, name, price, decay] of animalProducts) add({ id, name, category: 'animal', basePrice: price, decay, desc: '축산물' });
// 희귀 축산물 (친밀도가 높은 동물이 가끔 생산)
const rareAnimalProducts: [string, string, number, number][] = [
  ['golden_egg', '황금 달걀', 320, 2],
  ['jade_duck_egg', '비취 오리알', 520, 2],
  ['angora_wool', '최고급 토끼털', 900, 0],
  ['golden_wool', '황금 양털', 1300, 0],
  ['rich_goat_milk', '진한 염소젖', 820, 6],
  ['premium_milk', '고급 우유', 600, 6],
  ['white_truffle', '흰 송로버섯', 2200, 4],
  ['royal_alpaca_wool', '왕실 알파카털', 3200, 0],
  ['golden_goose_egg', '황금 거위알', 820, 2],
  ['spotted_turkey_egg', '점박이 칠면조알', 760, 2],
  ['cream_buffalo_milk', '크림 물소젖', 1900, 6],
  ['giant_ostrich_egg', '거대 타조알', 4200, 2],
];
for (const [id, name, price, decay] of rareAnimalProducts) add({ id, name, category: 'animal', basePrice: price, decay, tags: ['rare_animal'], desc: '희귀 축산물 — 친밀도가 높은 동물이 가끔 생산' });

// 물고기 / 채집물 / 자원 (생활 콘텐츠)
for (const fsh of FISH) add({ id: fsh.id, name: fsh.name, category: fsh.id === 'old_boot' ? 'other' : 'fish', basePrice: fsh.baseSellPrice, decay: fsh.freshnessDecay, tags: fsh.id === 'old_boot' ? [] : ['fish'], desc: '물고기' });
for (const fg of FORAGE) add({ id: fg.id, name: fg.name, category: 'forage', basePrice: fg.price, decay: fg.decay, tags: fg.tags, desc: '채집물' });
for (const rs of RESOURCES) add({ id: rs.id, name: rs.name, category: 'resource', basePrice: rs.price, decay: 0, desc: '건설·업그레이드 재료' });
// 양식장 생산물
for (const pf of POND_FISH) add({ id: roeId(pf.id), name: `${pf.name} 알`, category: 'fish', basePrice: Math.max(30, Math.round(pf.baseSellPrice * 1.3)), decay: 9, tags: ['roe', 'seafood'], desc: `양식장에서 얻는 ${pf.name}의 어란` });
add({ id: 'pondweed', name: '수초', category: 'resource', basePrice: 8, decay: 0, desc: '양식장에서 자라는 물풀 — 양식장 확장·업그레이드 재료' });
add({ id: 'pearl', name: '진주', category: 'resource', basePrice: 600, decay: 0, desc: '희귀 어종 양식장에서 가끔 나오는 보석' });
add({ id: 'shimmer_scale', name: '무지개 비늘', category: 'resource', basePrice: 900, decay: 0, desc: '매우 희귀한 어종이 남기는 반짝이는 비늘 — 희귀 제작 재료' });
add({ id: 'fish_feed', name: '양식 사료', category: 'other', basePrice: 6, decay: 0, desc: '양식장 물고기 먹이 (3마리당 1개)' });
add({ id: 'rare_bait', name: '희귀 미끼', category: 'other', basePrice: 60, decay: 0, desc: '낚시할 때 자동 사용 — 희귀 물고기 확률 크게 증가' });

// 기타
add({ id: 'hay', name: '건초 사료', category: 'other', basePrice: 10, decay: 0, desc: '동물 기본 사료' });
add({ id: 'treat', name: '동물 간식', category: 'other', basePrice: 40, decay: 0, desc: '쓰다듬기 대신 주면 친밀도 크게 상승' });
add({ id: 'basic_fertilizer', name: '기본 비료', category: 'other', basePrice: 30, decay: 0, desc: '수확량 증가 확률 +20%' });
add({ id: 'growth_fertilizer', name: '성장 비료', category: 'other', basePrice: 60, decay: 0, desc: '성장 속도 +25%' });
add({ id: 'premium_fertilizer', name: '고급 비료', category: 'other', basePrice: 120, decay: 0, desc: '성장 +25%, 수확량 +35%' });
add({ id: 'special_fertilizer', name: '특별 비료', category: 'other', basePrice: 400, decay: 0, desc: '특급상인 전용. 성장 +50%, 수확량 +50%' });
add({ id: 'compost', name: '퇴비', category: 'other', basePrice: 15, decay: 0, desc: '천연 비료. 수확량 +12%' });
add({ id: 'rotten', name: '부패물', category: 'other', basePrice: 0, decay: 0, sellable: false, desc: '판매 불가. 퇴비 기술로 재활용 가능' });
add({ id: 'breed_charm', name: '번식 부적', category: 'other', basePrice: 1500, decay: 0, desc: '특급상인 전용. 다음 브리딩 상위 등급 확률 증가' });
add({ id: 'golden_feed', name: '특제 사료', category: 'other', basePrice: 300, decay: 0, desc: '특급상인 전용. 축사 전체 하루 급식 + 친밀도 상승' });

// 가공품 / 요리 — 가격은 재료 기본가 × 배율로 산출
const byId: Record<string, ItemDef> = Object.fromEntries(items.map((i) => [i.id, i]));

/** 태그 재료(#fish 등)의 기준가 — 가공품 가격 산출용 */
export const TAG_PRICE: Record<string, number> = { fish: 25, mushroom: 22, berry: 13, seafood: 16, shell: 16, herb: 16, roe: 60, fruit: 60 };
const inputPrice = (id: string): number => (id.startsWith('#') ? TAG_PRICE[id.slice(1)] ?? 10 : byId[id]?.basePrice ?? 0);
const inputKnown = (id: string): boolean => id.startsWith('#') || !!byId[id];
const pending = [...RECIPES];
let guard = 0;
while (pending.length && guard++ < 20) {
  for (let i = pending.length - 1; i >= 0; i--) {
    const rec = pending[i];
    if (!rec.inputs.every((inp) => inputKnown(inp.id))) continue;
    pending.splice(i, 1);
    if (byId[rec.output]) continue; // compost 등 이미 존재
    const sum = rec.inputs.reduce((s, inp) => s + inputPrice(inp.id) * inp.qty, 0);
    const def: ItemDef = {
      id: rec.output,
      name: rec.outputName,
      category: rec.category === 'cooking' ? 'cooking' : rec.category === 'other' ? 'resource' : 'processed',
      basePrice: Math.round((sum * rec.valueMul) / rec.outQty),
      decay: rec.decay,
      icon: `it_${rec.output}`,
      maxStack: 99,
      sellable: true,
      desc: rec.category === 'cooking' ? '정성 가득 요리' : '가공품',
    };
    items.push(def);
    byId[def.id] = def;
  }
}
if (pending.length) throw new Error('레시피 재료 해석 실패: ' + pending.map((p) => p.id).join(','));

// 작물의 가공 용도 / 물고기 요리 용도 역산
for (const rec of RECIPES) {
  for (const inp of rec.inputs) {
    const crop = CROP_BY_ID[inp.id];
    if (crop && !crop.processingUses.includes(rec.id)) crop.processingUses.push(rec.id);
    const fsh = FISH_BY_ID[inp.id];
    if (fsh && !fsh.cookingUses.includes(rec.id)) fsh.cookingUses.push(rec.id);
    if (inp.id === '#fish') for (const x of FISH) if (x.id !== 'old_boot' && !x.cookingUses.includes(rec.id)) x.cookingUses.push(rec.id);
  }
}

/** 아이템이 태그 재료(#tag) 또는 id 와 일치하는가 */
export function matchesInput(itemId: string, input: string): boolean {
  if (!input.startsWith('#')) return itemId === input;
  return !!byId[itemId]?.tags?.includes(input.slice(1));
}

export function inputName(input: string): string {
  if (!input.startsWith('#')) return byId[input]?.name ?? input;
  return ({ fish: '물고기(아무거나)', mushroom: '버섯(아무거나)', berry: '열매(아무거나)', seafood: '조개류(아무거나)', shell: '조개류(아무거나)', herb: '약초', roe: '어란(아무거나)', fruit: '과일(아무거나)' } as Record<string, string>)[input.slice(1)] ?? input;
}

export function inputIcon(input: string): string {
  if (!input.startsWith('#')) return byId[input]?.icon ?? 'ic_star';
  return ({ fish: 'it_crucian', mushroom: 'it_shiitake', berry: 'it_wild_strawberry', seafood: 'it_clam', shell: 'it_clam', herb: 'it_herb', roe: 'it_roe_carp', fruit: 'it_apple' } as Record<string, string>)[input.slice(1)] ?? 'ic_star';
}

export const ITEMS = items;
export const ITEM_BY_ID: Record<string, ItemDef> = byId;

export function item(id: string): ItemDef {
  const d = ITEM_BY_ID[id];
  if (!d) throw new Error(`Unknown item ${id}`);
  return d;
}

export const CATEGORY_NAME: Record<ItemCategory | 'all', string> = {
  all: '전체',
  crop: '작물',
  animal: '축산물',
  fish: '물고기',
  forage: '채집물',
  resource: '자원',
  processed: '가공품',
  cooking: '요리',
  seed: '씨앗',
  other: '기타',
};
