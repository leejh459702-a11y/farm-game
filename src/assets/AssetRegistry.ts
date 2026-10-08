/**
 * AssetRegistry — 모든 플레이스홀더 그래픽을 생성하고 Asset Key 로 등록한다.
 * 실제 아트로 교체할 때는 같은 key 로 이미지를 preload 하면 된다 (BootScene 참고).
 */
import Phaser from 'phaser';
import { buildTileset } from './art/tiles';
import { buildCropSheets, CROP_FW, CROP_FH } from './art/crops';
import { buildIcons } from './art/icons';
import { buildBuildingTextures, buildGlow } from './art/buildings';
import { animalPortrait, buildCharacterTextures } from './art/characters';
import { buildNodeTextures } from './art/nodes';
import { ANIMALS } from '../data/animals';
import { CROPS } from '../data/crops';
import { ART_SCALE, drawContain, loadedArt, makeCanvas } from './ArtOverrides';
import { TILE } from './art/tiles';

interface SheetInfo {
  canvas: HTMLCanvasElement;
  frameW?: number;
  frameH?: number;
  /** 월드 표시 배율 (디자인 에셋은 2배 해상도 → 0.5) */
  scale?: number;
  /** DOM 용 원본 파일 URL (디자인 에셋) */
  fileUrl?: string;
}

class Registry {
  private canvases = new Map<string, SheetInfo>();
  private urls = new Map<string, string>();
  tileset: { canvas: HTMLCanvasElement; tileW: number; margin: number; spacing: number } | null = null;
  generated = false;

  generate(): void {
    if (this.generated) return;
    this.tileset = buildTileset();
    for (const s of buildCropSheets()) this.canvases.set(s.key, { canvas: s.canvas, frameW: CROP_FW, frameH: CROP_FH });
    for (const i of buildIcons()) this.canvases.set(i.key, { canvas: i.canvas });
    for (const b of buildBuildingTextures()) this.canvases.set(b.key, { canvas: b.canvas });
    for (const c of buildCharacterTextures()) this.canvases.set(c.key, { canvas: c.canvas, frameW: c.frameW, frameH: c.frameH });
    this.canvases.set('glow', { canvas: buildGlow() });
    for (const n of buildNodeTextures()) this.canvases.set(n.key, { canvas: n.canvas });
    // 동물 초상 (DOM 용)
    for (const a of ANIMALS) this.canvases.set(`portrait_${a.id}`, { canvas: animalPortrait(a.id) });
    // 1px 흰 텍스처 (파티클/오버레이)
    const px = document.createElement('canvas');
    px.width = px.height = 2;
    const ctx = px.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 2, 2);
    this.canvases.set('px', { canvas: px });
    this.applyOverrides();
    this.generated = true;
  }

  /** 디자인 에셋으로 같은 key 덮어쓰기 (ArtOverrides 참고) */
  private applyOverrides(): void {
    const S = ART_SCALE;
    const crops = new Map<string, { frame: number; img: HTMLImageElement }[]>();
    for (const a of loadedArt) {
      for (const key of a.keys ?? []) {
        const old = this.canvases.get(key);
        switch (a.kind) {
          case 'icon':
          case 'fx': {
            const w = (old?.frameW ?? old?.canvas.width ?? 16) * S;
            const h = (old?.frameH ?? old?.canvas.height ?? 16) * S;
            const c = makeCanvas(w, h);
            drawContain(c.getContext('2d')!, a.img, 0, 0, w, h, 'center');
            this.canvases.set(key, { canvas: c, scale: 1 / S, fileUrl: a.url });
            break;
          }
          case 'building':
          case 'cart':
          case 'node': {
            const w = (old?.frameW ?? old?.canvas.width ?? 32) * S;
            const h = (old?.frameH ?? old?.canvas.height ?? 32) * S;
            const c = makeCanvas(w, h);
            drawContain(c.getContext('2d')!, a.img, 0, 0, w, h, 'bottom');
            this.canvases.set(key, { canvas: c, scale: 1 / S, fileUrl: a.url });
            break;
          }
          case 'animal': {
            // 걷기 2프레임: 두 번째 프레임은 살짝 들썩
            const base = key.endsWith('_baby') ? this.canvases.get(key.replace(/_baby$/, '')) : old;
            const fw = (base?.frameW ?? 24) * S;
            const fh = (base?.frameH ?? 24) * S;
            const c = makeCanvas(fw * 2, fh);
            const ctx = c.getContext('2d')!;
            drawContain(ctx, a.img, 0, 0, fw, fh, 'bottom');
            drawContain(ctx, a.img, fw, -2, fw, fh, 'bottom');
            this.canvases.set(key, { canvas: c, frameW: fw, frameH: fh, scale: 1 / S, fileUrl: a.url });
            break;
          }
          case 'crop': {
            if (!crops.has(key)) crops.set(key, []);
            crops.get(key)!.push({ frame: a.frame ?? 4, img: a.img });
            break;
          }
          case 'bg': {
            const c = makeCanvas(a.img.width, a.img.height);
            c.getContext('2d')!.drawImage(a.img, 0, 0);
            this.canvases.set(key, { canvas: c, fileUrl: a.url });
            break;
          }
        }
      }
      if (a.portrait) {
        const c = makeCanvas(64, 64);
        drawContain(c.getContext('2d')!, a.img, 0, 0, 64, 64, 'center');
        this.canvases.set(a.portrait, { canvas: c, fileUrl: a.url });
      }
      if (a.kind === 'tile' && this.tileset) this.paintTile(a);
    }
    // 작물: 기존 시트를 2배로 키운 뒤 디자인된 단계만 교체 (없는 단계는 기존 그림)
    for (const [key, frames] of crops) {
      const old = this.canvases.get(key);
      if (!old?.frameW || !old.frameH) continue;
      const fw = old.frameW * S;
      const fh = old.frameH * S;
      const n = Math.floor(old.canvas.width / old.frameW);
      const c = makeCanvas(fw * n, fh);
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(old.canvas, 0, 0, old.canvas.width * S, old.canvas.height * S);
      const ground = (old.frameH - 6) * S; // 지면선 약간 아래까지
      for (const f of frames) {
        if (f.frame >= n) continue;
        ctx.clearRect(f.frame * fw, 0, fw, fh);
        drawContain(ctx, f.img, f.frame * fw, 0, fw, ground, 'bottom');
      }
      this.canvases.set(key, { canvas: c, frameW: fw, frameH: fh, scale: 1 / S });
    }
  }

  /** 타일셋 칸 교체 (32px, 익스트루전 포함) */
  private paintTile(a: { img: HTMLImageElement; tiles?: (keyof typeof TILE)[]; seasons?: number[] }): void {
    const ts = this.tileset!;
    const ctx = ts.canvas.getContext('2d')!;
    const T = ts.tileW;
    const cell = T + ts.spacing;
    for (const name of a.tiles ?? []) {
      const base = TILE[name] as number;
      const perSeason = base < TILE.perSeason * 4 && base < 48;
      const idxs = perSeason ? (a.seasons ?? [0, 1, 2, 3]).map((s) => s * TILE.perSeason + base) : [base];
      for (const i of idxs) {
        const x = i * cell + ts.margin;
        const y = ts.margin;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.clearRect(x - 1, y - 1, T + 2, T + 2);
        ctx.drawImage(a.img, x, y, T, T);
        ctx.drawImage(ts.canvas, x, y, T, 1, x, y - 1, T, 1);
        ctx.drawImage(ts.canvas, x, y + T - 1, T, 1, x, y + T, T, 1);
        ctx.drawImage(ts.canvas, x, y, 1, T, x - 1, y, 1, T);
        ctx.drawImage(ts.canvas, x + T - 1, y, 1, T, x + T, y, 1, T);
      }
    }
  }

  /** 월드 표시 배율 */
  scale(key: string): number {
    return this.canvases.get(key)?.scale ?? 1;
  }

  /** Phaser 텍스처 매니저에 등록 */
  registerPhaser(scene: Phaser.Scene): void {
    this.generate();
    const tm = scene.textures;
    if (this.tileset && !tm.exists('tiles')) tm.addCanvas('tiles', this.tileset.canvas);
    for (const [key, info] of this.canvases) {
      if (tm.exists(key)) continue; // 실제 아트가 preload 되었다면 그대로 사용
      const tex = tm.addCanvas(key, info.canvas);
      if (tex && info.frameW && info.frameH) {
        const cols = Math.floor(info.canvas.width / info.frameW);
        for (let i = 0; i < cols; i++) tex.add(i, 0, i * info.frameW, 0, info.frameW, info.frameH);
      }
    }
  }

  has(key: string): boolean {
    return this.canvases.has(key);
  }

  /** DOM 용 data URL (첫 프레임) */
  url(key: string): string {
    const cached = this.urls.get(key);
    if (cached) return cached;
    this.generate();
    let info = this.canvases.get(key);
    if (info?.fileUrl) {
      this.urls.set(key, info.fileUrl);
      return info.fileUrl;
    }
    if (!info) info = this.canvases.get('ic_star');
    if (!info) return '';
    let canvas = info.canvas;
    if (info.frameW && info.frameH && canvas.width > info.frameW) {
      const c = document.createElement('canvas');
      c.width = info.frameW;
      c.height = info.frameH;
      // 작물은 마지막(수확) 프레임
      const frame = CROPS.some((x) => x.spriteKey === key) ? Math.floor(canvas.width / info.frameW) - 1 : 0;
      c.getContext('2d')!.drawImage(canvas, frame * info.frameW, 0, info.frameW, info.frameH, 0, 0, info.frameW, info.frameH);
      canvas = c;
    }
    const u = canvas.toDataURL();
    this.urls.set(key, u);
    return u;
  }

  /** 표시용 크기 (프레임 단위) */
  dims(key: string): { w: number; h: number } {
    const info = this.canvases.get(key);
    if (!info) return { w: 16, h: 16 };
    return { w: info.frameW ?? info.canvas.width, h: info.frameH ?? info.canvas.height };
  }

  canvas(key: string): HTMLCanvasElement | undefined {
    return this.canvases.get(key)?.canvas;
  }
}

export const Art = new Registry();

/** DOM <img> 태그 문자열 */
export function iconHtml(key: string, size = 32, cls = ''): string {
  // 가로세로 비율 유지하며 size 상자에 맞춤
  const d = Art.dims(key);
  const k = size / Math.max(d.w, d.h);
  const w = Math.round(d.w * k);
  const h = Math.round(d.h * k);
  return `<img class="px ${cls}" src="${Art.url(key)}" width="${w}" height="${h}" alt="" draggable="false">`;
}
