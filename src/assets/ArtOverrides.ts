/**
 * ArtOverrides — 디자인 에셋(public/art/)을 기존 asset key 위에 덮어쓴다.
 * tools/import_art.py 가 만든 manifest.json 을 읽고, 이미지를 게임 월드의 2배 해상도 캔버스로 맞춘다
 * (월드에서는 0.5배로 그려 픽셀이 또렷하게 유지된다). 화면 UI(DOM)는 원본 크기 파일을 바로 쓴다.
 * 에셋이 없거나 로드에 실패해도 코드로 그린 기본 그래픽이 그대로 쓰인다.
 */
import { TILE } from './art/tiles';

export const ART_SCALE = 2;

export interface ArtEntry {
  src: string;
  file: string;
  kind: 'icon' | 'fx' | 'building' | 'cart' | 'node' | 'animal' | 'crop' | 'tile' | 'bg' | 'ui' | 'ui9' | 'char' | 'portrait';
  w: number;
  h: number;
  keys?: string[];
  frame?: number;
  portrait?: string;
  tiles?: (keyof typeof TILE)[];
  seasons?: number[];
}

export interface LoadedArt extends ArtEntry {
  img: HTMLImageElement;
  url: string;
}

export const loadedArt: LoadedArt[] = [];

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/** 게임 시작 전에 한 번 (실패해도 조용히 기본 그래픽 사용) */
export async function loadArtOverrides(): Promise<void> {
  const base = `${import.meta.env.BASE_URL}art/`;
  try {
    const res = await fetch(`${base}manifest.json`, { cache: 'no-cache' });
    if (!res.ok) return;
    const man = (await res.json()) as { assets: ArtEntry[] };
    const loaded = await Promise.all(
      man.assets.map(async (a) => {
        const url = base + a.file;
        const img = await loadImage(url);
        return img ? ({ ...a, img, url } as LoadedArt) : null;
      }),
    );
    for (const l of loaded) if (l) loadedArt.push(l);
    // UI 프레임은 CSS 변수로
    for (const l of loadedArt) if (l.kind === 'ui' || l.kind === 'ui9') for (const k of l.keys ?? []) document.documentElement.style.setProperty(`--${k.replace(/_/g, '-')}`, `url("${new URL(l.url, location.href).href}")`);
    if (loadedArt.some((l) => l.kind === 'ui')) document.documentElement.classList.add('art-ui');
  } catch {
    /* 오프라인 첫 실행 등 — 기본 그래픽 사용 */
  }
}

/** 이미지를 상자 안에 비율 유지로 맞춰 그리기. align: 아래 가운데 / 가운데 */
export function drawContain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number, align: 'bottom' | 'center' = 'center', inset = 0): void {
  const bw = w - inset * 2;
  const bh = h - inset * 2;
  const k = Math.min(bw / img.width, bh / img.height);
  const dw = Math.round(img.width * k);
  const dh = Math.round(img.height * k);
  const dx = x + Math.round((w - dw) / 2);
  const dy = align === 'bottom' ? y + h - dh - inset : y + Math.round((h - dh) / 2);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, dx, dy, dw, dh);
}

export function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}
