/** 화면(UI) 위에 디자인 이펙트 이미지(fx_*)를 잠깐 띄운다. 에셋이 없으면 아무것도 하지 않는다. */
import { Art } from '../assets/AssetRegistry';

export function popDomFx(key: string, x: number, y: number, size = 56): void {
  if (!Art.has(key)) return;
  const img = document.createElement('img');
  img.className = 'dom-fx px';
  img.src = Art.url(key);
  img.alt = '';
  img.style.cssText = `left:${x - size / 2}px;top:${y - size / 2}px;width:${size}px;height:${size}px`;
  document.body.appendChild(img);
  window.setTimeout(() => img.remove(), 900);
}

/** 요소 가운데에서 띄우기 */
export function popDomFxAt(target: Element | null, key: string, size = 56): void {
  if (!target) return;
  const r = target.getBoundingClientRect();
  popDomFx(key, r.left + r.width / 2, r.top + r.height / 2, size);
}
