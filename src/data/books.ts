/**
 * 스킬북 — 한 번 읽으면 영구 효과. 특급상인·지오드·연구 컬렉션·낚시 보물에서 드물게.
 */
export interface BookData {
  id: string;
  name: string;
  desc: string;
  price: number;
  color: number;
}

export const BOOKS: BookData[] = [
  { id: 'book_farmer', name: '농부의 비밀노트', desc: '성장 5일 이상 작물이 하루 빨리 자란다.', price: 3000, color: 0x5aa83c },
  { id: 'book_aging', name: '숙성 장인의 책', desc: '숙성 가치 보너스 +15%.', price: 3000, color: 0x8a3a5a },
  { id: 'book_fishing', name: '낚시 기록집', desc: '희귀 물고기 확률 +20%.', price: 3000, color: 0x4a7ab8 },
  { id: 'book_genetics', name: '유전학 노트', desc: '브리딩 특성 유전 확률 +10%.', price: 3500, color: 0xd86a8a },
  { id: 'book_miner', name: '광부의 기록', desc: '광산의 금·보석 광맥 1.5배, 지오드 발견 +20%.', price: 3500, color: 0x8a7a6a },
];

export const BOOK_BY_ID: Record<string, BookData> = Object.fromEntries(BOOKS.map((b) => [b.id, b]));
