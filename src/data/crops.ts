import type { CropData, Season } from '../types';
const names = [
  ['감자', '당근', '상추', '무', '양파', '완두콩', '딸기', '아스파라거스'],
  ['토마토', '오이', '고추', '옥수수', '수박', '멜론', '블루베리', '해바라기'],
  ['배추', '호박', '고구마', '쌀', '포도', '땅콩', '사과', '배'],
  ['시금치', '겨울무', '겨울배추', '브로콜리', '대파', '마늘', '감귤', '겨울딸기'],
];
const ids = [
  ['potato', 'carrot', 'lettuce', 'radish', 'onion', 'pea', 'strawberry', 'asparagus'],
  ['tomato', 'cucumber', 'pepper', 'corn', 'watermelon', 'melon', 'blueberry', 'sunflower'],
  ['cabbage', 'pumpkin', 'sweetpotato', 'rice', 'grape', 'peanut', 'apple', 'pear'],
  [
    'spinach',
    'winterradish',
    'wintercabbage',
    'broccoli',
    'leek',
    'garlic',
    'mandarin',
    'winterberry',
  ],
];
const colors = [0xd6b775, 0xe58a48, 0x91be64, 0xf6e6bc, 0xcc965e, 0x7eaf55, 0xce6052, 0x80ab62];
export const crops: CropData[] = names.flatMap((list, s) =>
  list.map((name, i) => ({
    id: ids[s][i],
    name,
    season: (['spring', 'summer', 'autumn', 'winter'] as Season[])[s],
    seedPrice: 10 + i * 8,
    baseSellPrice: 70 + i * 20,
    growDays: 1 + Math.floor(i / 2),
    regrowDays: [4, 6].includes(i) ? 2 : 0,
    yield: 1,
    freshnessDecay: 8,
    processingUses: i > 3 ? ['jam', 'salad'] : ['salad'],
    unlockLevel: 1 + Math.floor(i / 2),
    spriteKey: `crop-${ids[s][i]}`,
    color: colors[i],
  })),
);
export const cropById = Object.fromEntries(crops.map((c) => [c.id, c]));
export const rareCrops: CropData[] = [
  {
    ...crops[6],
    id: 'goldberry',
    name: '황금딸기',
    seedPrice: 400,
    baseSellPrice: 1600,
    growDays: 5,
    unlockLevel: 7,
    spriteKey: 'crop-goldberry',
    color: 0xf7cd64,
  },
];
crops.push(...rareCrops);
rareCrops.forEach((c) => (cropById[c.id] = c));
