/** 새 계절 첫날 아침 — 디자인 계절 배경(bg_farm_<계절>)을 잠깐 보여 주는 화면. 탭하면 닫힌다. */
import { Art } from '../assets/AssetRegistry';
import { calendar } from '../systems/SeasonSystem';
import type { World } from '../core/World';

const NAME = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' } as const;
const SUB = {
  spring: '새싹이 돋는 계절 — 제철 작물 판매가 +10%',
  summer: '햇살 가득한 계절 — 제철 작물 판매가 +10%',
  autumn: '풍요로운 수확의 계절 — 제철 작물 판매가 +10%',
  winter: '고요한 눈의 계절 — 밭에서는 겨울 작물만, 나머지는 온실에서',
} as const;

export function maybeShowSeasonSplash(w: World): void {
  const cal = calendar(w.state.time.day);
  if (cal.dayOfSeason !== 1 || w.state.time.day === 0) return;
  showSeasonSplash(cal.season);
}

export function showSeasonSplash(season: keyof typeof NAME): void {
  const key = `bg_farm_${season}`;
  if (!Art.has(key) || document.querySelector('.season-splash')) return;
  const el = document.createElement('div');
  el.className = 'season-splash interactive';
  el.innerHTML = `<img src="${Art.url(key)}" alt=""><div class="season-splash-text"><b>${NAME[season]}</b><span>${SUB[season]}</span></div>`;
  const close = () => {
    el.classList.add('out');
    window.setTimeout(() => el.remove(), 450);
  };
  el.addEventListener('click', close);
  (document.getElementById('ui') ?? document.body).appendChild(el);
  window.setTimeout(close, 3200);
}
