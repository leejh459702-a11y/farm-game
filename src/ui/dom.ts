/** 작은 DOM 헬퍼 */
export const $ui = (): HTMLElement => document.getElementById('ui')!;

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function el(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** 조건부 클래스 */
export const cx = (...xs: (string | false | null | undefined)[]): string => xs.filter(Boolean).join(' ');

export function freshClass(f: number | undefined): string {
  if (f === undefined) return '';
  if (f >= 90) return 'fresh-hi';
  if (f >= 70) return 'fresh-mid';
  if (f >= 50) return 'fresh-lo';
  return 'fresh-bad';
}
