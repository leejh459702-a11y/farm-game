/**
 * Painter — 픽셀아트 플레이스홀더를 코드로 그리기 위한 작은 도구.
 * 모든 그래픽은 Asset Key 로 등록되어 나중에 실제 아트로 교체할 수 있다.
 */
export type Color = number;

export const hex = (c: Color, a = 1): string => {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
};

export function shade(c: Color, f: number): Color {
  // f < 0 어둡게, f > 0 밝게 (-1~1)
  let r = (c >> 16) & 255;
  let g = (c >> 8) & 255;
  let b = c & 255;
  if (f < 0) {
    r = Math.round(r * (1 + f));
    g = Math.round(g * (1 + f));
    b = Math.round(b * (1 + f * 0.85));
  } else {
    r = Math.round(r + (255 - r) * f);
    g = Math.round(g + (255 - g) * f);
    b = Math.round(b + (255 - b) * f * 0.9);
  }
  return (Math.min(255, r) << 16) | (Math.min(255, g) << 8) | Math.min(255, b);
}

export function mix(a: Color, b: Color, t: number): Color {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

/** 결정적 해시 난수 (텍스처마다 같은 결과) */
export function hashRand(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}

export const OUTLINE = 0x3b2a22;

export class Painter {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  constructor(public w: number, public h: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.ctx.imageSmoothingEnabled = false;
  }

  px(x: number, y: number, c: Color, a = 1): this {
    this.ctx.fillStyle = hex(c, a);
    this.ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    return this;
  }

  rect(x: number, y: number, w: number, h: number, c: Color, a = 1): this {
    if (w <= 0 || h <= 0) return this;
    this.ctx.fillStyle = hex(c, a);
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }

  /** 테두리만 */
  frame(x: number, y: number, w: number, h: number, c: Color): this {
    this.rect(x, y, w, 1, c).rect(x, y + h - 1, w, 1, c).rect(x, y, 1, h, c).rect(x + w - 1, y, 1, h, c);
    return this;
  }

  /** 픽셀 타원 채우기 */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: Color, a = 1): this {
    for (let y = -ry; y <= ry; y++)
      for (let x = -rx; x <= rx; x++) {
        if ((x * x) / ((rx + 0.5) * (rx + 0.5)) + (y * y) / ((ry + 0.5) * (ry + 0.5)) <= 1) this.px(cx + x, cy + y, c, a);
      }
    return this;
  }

  circle(cx: number, cy: number, r: number, c: Color, a = 1): this {
    return this.ellipse(cx, cy, r, r, c, a);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: Color): this {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
    return this;
  }

  /** 삼각형(지붕 등) 채우기 */
  tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: Color): this {
    const minY = Math.floor(Math.min(y0, y1, y2));
    const maxY = Math.ceil(Math.max(y0, y1, y2));
    for (let y = minY; y <= maxY; y++) {
      const xs: number[] = [];
      const edges: [number, number, number, number][] = [
        [x0, y0, x1, y1],
        [x1, y1, x2, y2],
        [x2, y2, x0, y0],
      ];
      for (const [ax, ay, bx, by] of edges) {
        if (ay === by) continue;
        if ((y >= Math.min(ay, by)) && (y <= Math.max(ay, by))) xs.push(ax + ((y - ay) * (bx - ax)) / (by - ay));
      }
      if (xs.length >= 2) this.rect(Math.min(...xs), y, Math.max(...xs) - Math.min(...xs) + 1, 1, c);
    }
    return this;
  }

  /** 불투명 픽셀 주변에 외곽선 */
  outline(c: Color = OUTLINE, onlyOutside = true): this {
    const img = this.ctx.getImageData(0, 0, this.w, this.h);
    const d = img.data;
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < this.w && y < this.h && d[(y * this.w + x) * 4 + 3] > 40;
    const pts: [number, number][] = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (onlyOutside && opaque(x, y)) continue;
        if (opaque(x + 1, y) || opaque(x - 1, y) || opaque(x, y + 1) || opaque(x, y - 1)) pts.push([x, y]);
      }
    for (const [x, y] of pts) this.px(x, y, c);
    return this;
  }

  /** 아래쪽 그림자 */
  shadow(cx: number, cy: number, rx: number, ry: number, a = 0.25): this {
    return this.ellipse(cx, cy, rx, ry, 0x000000, a);
  }

  /** 디더 노이즈 */
  speckle(x: number, y: number, w: number, h: number, c: Color, density: number, seed: number): this {
    const r = hashRand(seed);
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) if (r() < density) this.px(xx, yy, c);
    return this;
  }

  /** 다른 캔버스를 위치에 그리기 */
  draw(src: HTMLCanvasElement, x: number, y: number, flipX = false): this {
    if (flipX) {
      this.ctx.save();
      this.ctx.scale(-1, 1);
      this.ctx.drawImage(src, -x - src.width, y);
      this.ctx.restore();
    } else this.ctx.drawImage(src, x, y);
    return this;
  }
}

/** 여러 프레임을 가로로 이어 붙인 스프라이트시트 */
export function sheet(frames: Painter[]): HTMLCanvasElement {
  const fw = frames[0].w;
  const fh = frames[0].h;
  const c = document.createElement('canvas');
  c.width = fw * frames.length;
  c.height = fh;
  const ctx = c.getContext('2d')!;
  frames.forEach((f, i) => ctx.drawImage(f.canvas, i * fw, 0));
  return c;
}
