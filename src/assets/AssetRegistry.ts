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
import { ANIMALS } from '../data/animals';
import { CROPS } from '../data/crops';

interface SheetInfo {
  canvas: HTMLCanvasElement;
  frameW?: number;
  frameH?: number;
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
    // 동물 초상 (DOM 용)
    for (const a of ANIMALS) this.canvases.set(`portrait_${a.id}`, { canvas: animalPortrait(a.id) });
    // 1px 흰 텍스처 (파티클/오버레이)
    const px = document.createElement('canvas');
    px.width = px.height = 2;
    const ctx = px.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 2, 2);
    this.canvases.set('px', { canvas: px });
    this.generated = true;
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
