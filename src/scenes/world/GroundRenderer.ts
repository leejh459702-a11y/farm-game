/** 지면 타일맵 (잔디/야생/숲 테두리) + 농지 레이어 + 소유지 경계선 */
import Phaser from 'phaser';
import { Art } from '../../assets/AssetRegistry';
import { TILE } from '../../assets/art/tiles';
import type { World } from '../../core/World';
import { BORDER, DEPTH, FH, FW, TS, hash2 } from './constants';

export class GroundRenderer {
  private map!: Phaser.Tilemaps.Tilemap;
  private ground!: Phaser.Tilemaps.TilemapLayer;
  private soil!: Phaser.Tilemaps.TilemapLayer;
  private decor!: Phaser.Tilemaps.TilemapLayer;
  private outline!: Phaser.GameObjects.Graphics;
  private seasonIdx = -1;
  private readonly size = FW + BORDER * 2;

  constructor(
    private scene: Phaser.Scene,
    private w: World,
  ) {}

  build(): void {
    const ts = Art.tileset!;
    this.map = this.scene.make.tilemap({ tileWidth: TS, tileHeight: TS, width: this.size, height: this.size });
    const tileset = this.map.addTilesetImage('tiles', 'tiles', TS, TS, ts.margin, ts.spacing)!;
    this.ground = this.map.createBlankLayer('ground', tileset, -BORDER * TS, -BORDER * TS)!;
    this.soil = this.map.createBlankLayer('soil', tileset, -BORDER * TS, -BORDER * TS)!;
    this.decor = this.map.createBlankLayer('decor', tileset, -BORDER * TS, -BORDER * TS)!;
    this.ground.setDepth(DEPTH.ground);
    this.soil.setDepth(DEPTH.soil);
    this.decor.setDepth(DEPTH.soil + 0.5);
    this.outline = this.scene.add.graphics().setDepth(DEPTH.outline);
    this.refreshAll();
  }

  private groundIndex(fx: number, fy: number): number {
    const base = this.seasonIdx * TILE.perSeason;
    const r = hash2(fx, fy);
    const inFarm = fx >= 0 && fy >= 0 && fx < FW && fy < FH;
    if (inFarm) {
      // 소유지: 잔디 깎은 줄무늬
      if (this.w.grid.isOwned(fx, fy)) return base + (r < 0.08 ? TILE.grassFlower : fx % 2 === 0 ? TILE.grassA : TILE.grassB);
      return base + (r < 0.5 ? TILE.wildA : TILE.wildB);
    }
    const d = Math.max(-fx, -fy, fx - (FW - 1), fy - (FH - 1));
    if (d <= 1) return base + (r < 0.35 ? TILE.treeA : TILE.forestFloor);
    return base + (r < 0.5 ? TILE.treeA : TILE.treeB);
  }

  /** 미소유 야생지 장식 (구매하면 사라짐) */
  private decorIndex(fx: number, fy: number): number {
    if (fx < 0 || fy < 0 || fx >= FW || fy >= FH || this.w.grid.isOwned(fx, fy)) return -1;
    const r = hash2(fx * 7 + 3, fy * 13 + 5);
    if (r > 0.2) return -1;
    const base = this.seasonIdx * TILE.perSeason;
    const k = hash2(fy * 31 + 1, fx * 17 + 9);
    if (k < 0.25) return base + TILE.decorBush;
    if (k < 0.45) return base + TILE.decorTall;
    if (k < 0.62) return base + TILE.decorFlowers;
    if (k < 0.75) return base + TILE.decorTree;
    if (k < 0.87) return TILE.decorRock;
    if (k < 0.95) return TILE.decorStump;
    return TILE.decorMushroom;
  }

  private putDecor(fx: number, fy: number): void {
    const i = this.decorIndex(fx, fy);
    if (i < 0) this.decor.removeTileAt(fx + BORDER, fy + BORDER);
    else this.decor.putTileAt(i, fx + BORDER, fy + BORDER);
  }

  refreshAll(): void {
    this.seasonIdx = this.w.cal.seasonIndex;
    for (let my = 0; my < this.size; my++)
      for (let mx = 0; mx < this.size; mx++) {
        this.ground.putTileAt(this.groundIndex(mx - BORDER, my - BORDER), mx, my);
        this.putDecor(mx - BORDER, my - BORDER);
      }
    this.refreshSoil();
    this.drawOutline();
  }

  /** 계절이 바뀌었으면 전체 갱신 */
  checkSeason(): void {
    if (this.w.cal.seasonIndex !== this.seasonIdx) this.refreshAll();
  }

  refreshLand(): void {
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        this.ground.putTileAt(this.groundIndex(x, y), x + BORDER, y + BORDER);
        this.putDecor(x, y);
      }
    this.drawOutline();
  }

  refreshSoil(keys?: string[]): void {
    const put = (x: number, y: number) => {
      const p = this.w.crops.plotAt(x, y);
      if (p && !p.greenhouse) this.soil.putTileAt(p.wateredToday ? TILE.soilWet : TILE.soilDry, x + BORDER, y + BORDER);
      else this.soil.removeTileAt(x + BORDER, y + BORDER);
    };
    if (keys) {
      for (const k of keys) {
        if (k.startsWith('gh:')) continue;
        const [x, y] = k.split(',').map(Number);
        put(x, y);
      }
    } else for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) put(x, y);
  }

  private drawOutline(): void {
    const g = this.outline;
    g.clear();
    const owned = (x: number, y: number) => this.w.grid.isOwned(x, y);
    // 소유지 경계: 밝은 선 + 그림자
    for (let y = 0; y < FH; y++)
      for (let x = 0; x < FW; x++) {
        if (!owned(x, y)) continue;
        const px = x * TS;
        const py = y * TS;
        if (!owned(x, y - 1)) (g.fillStyle(0xfff4d6, 0.55), g.fillRect(px, py, TS, 2));
        if (!owned(x, y + 1)) (g.fillStyle(0x3b2a22, 0.3), g.fillRect(px, py + TS - 2, TS, 2));
        if (!owned(x - 1, y)) (g.fillStyle(0xfff4d6, 0.45), g.fillRect(px, py, 2, TS));
        if (!owned(x + 1, y)) (g.fillStyle(0x3b2a22, 0.25), g.fillRect(px + TS - 2, py, 2, TS));
      }
    // 최대 영역 테두리 (점선)
    g.lineStyle(1, 0xffffff, 0.18);
    for (let i = 0; i < FW * TS; i += 8) {
      g.lineBetween(i, 0, i + 4, 0);
      g.lineBetween(i, FH * TS, i + 4, FH * TS);
    }
    for (let i = 0; i < FH * TS; i += 8) {
      g.lineBetween(0, i, 0, i + 4);
      g.lineBetween(FW * TS, i, FW * TS, i + 4);
    }
  }
}
