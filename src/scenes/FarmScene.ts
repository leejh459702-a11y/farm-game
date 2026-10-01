import Phaser from 'phaser';
import { GameEngine } from '../core/GameEngine';
import { createPixelAssets } from '../assets/PixelAssets';
import { buildingById } from '../data/buildings';
import { cropById } from '../data/crops';
import { BalanceConfig as B } from '../data/balance';
import { calendar } from '../data/seasons';
import { key } from '../core/state';
import { canPlace } from '../systems/FarmGridSystem';
export class FarmScene extends Phaser.Scene {
  engine!: GameEngine;
  onSelect = (x: number, y: number) => {};
  onPlace = (x: number, y: number) => {};
  private objects = new Map<string, Phaser.GameObjects.Image>();
  private pool: Phaser.GameObjects.Image[] = [];
  private seenRevision = -1;
  private highlight?: Phaser.GameObjects.Graphics;
  private overlay?: Phaser.GameObjects.Rectangle;
  private preview?: Phaser.GameObjects.Image;
  private previewGrid?: Phaser.GameObjects.Graphics;
  private drag?: { x: number; y: number; sx: number; sy: number };
  private dragMoved = false;
  private pinch = 0;
  player!: Phaser.GameObjects.Image;
  target?: { x: number; y: number };
  joystick = { x: 0, y: 0 };
  buildMode = false;
  placing?: { type: string; rotation: boolean; ignore: string[] };
  selected?: { x: number; y: number };
  selection: string[] = [];
  ready = false;
  private keys?: Phaser.Types.Input.Keyboard.CursorKeys;
  private ambience?: Phaser.GameObjects.Graphics;
  private menuObjects: Phaser.GameObjects.Image[] = [];
  private lastWeather = '';
  private hiddenMenu = true;
  constructor(engine: GameEngine) {
    super('Farm');
    this.engine = engine;
  }
  create() {
    createPixelAssets(this);
    this.drawLandscape();
    this.drawMenuFarm();
    this.cameras.main.setBounds(-128, -128, 1216, 1216);
    this.cameras.main.setZoom(2);
    this.cameras.main.roundPixels = true;
    this.cameras.main.centerOn(496, 490);
    this.player = this.add.image(496, 570, 'player').setDepth(2000);
    this.highlight = this.add.graphics().setDepth(2001);
    this.previewGrid = this.add.graphics().setDepth(2002);
    this.overlay = this.add
      .rectangle(0, 0, 1280, 720, 0x253650, 0)
      .setOrigin(0)
      .setScrollFactor(0)
      .setDepth(5000);
    this.keys = this.input.keyboard?.createCursorKeys();
    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.drag = { x: p.x, y: p.y, sx: this.cameras.main.scrollX, sy: this.cameras.main.scrollY };
      this.dragMoved = false;
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      const t = this.tileAt(p);
      if (this.placing) this.drawPreview(t.x, t.y);
      if (this.buildMode && p.isDown && this.drag) {
        const dx = p.x - this.drag.x,
          dy = p.y - this.drag.y;
        if (Math.abs(dx) + Math.abs(dy) > 12) this.dragMoved = true;
        if (this.dragMoved) {
          this.cameras.main.scrollX =
            this.drag.sx - (dx / this.cameras.main.zoom) * this.engine.state.settings.cameraSpeed;
          this.cameras.main.scrollY =
            this.drag.sy - (dy / this.cameras.main.zoom) * this.engine.state.settings.cameraSpeed;
        }
      }
      const ps = this.input.manager.pointers.filter((p) => p.isDown);
      if (ps.length >= 2) {
        const dist = Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y);
        if (this.pinch)
          this.cameras.main.setZoom(
            Phaser.Math.Clamp((this.cameras.main.zoom * dist) / this.pinch, 1, 4),
          );
        this.pinch = dist;
        this.dragMoved = true;
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      this.pinch = 0;
      if (this.hiddenMenu || this.dragMoved) return;
      const t = this.tileAt(p);
      if (this.placing) {
        this.selected = t;
        this.drawPreview(t.x, t.y);
        this.onPlace(t.x, t.y);
      } else {
        this.selected = t;
        this.drawHighlight();
        this.onSelect(t.x, t.y);
        if (this.engine.state.settings.tapMove && !this.buildMode)
          this.target = { x: t.x * 32 + 16, y: t.y * 32 + 16 };
      }
      this.drag = undefined;
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.cameras.main.setZoom(Phaser.Math.Clamp(this.cameras.main.zoom - dy * 0.002, 1, 4));
    });
    this.ambience = this.add.graphics().setDepth(4000);
    this.ready = true;
    this.refresh();
  }
  setMenu(menu: boolean) {
    this.hiddenMenu = menu;
    if (!menu) {
      this.seenRevision = -1;
      this.focus(15, 15);
    }
    this.player.setVisible(!menu);
    this.menuObjects.forEach((o) => o.setVisible(menu));
  }
  focus(x: number, y: number) {
    this.cameras.main.centerOn(x * 32 + 16, y * 32 + 16);
    this.target = undefined;
  }
  tileAt(p: Phaser.Input.Pointer) {
    const v = this.cameras.main.getWorldPoint(p.x, p.y);
    return { x: Math.floor(v.x / 32), y: Math.floor(v.y / 32) };
  }
  drawLandscape() {
    for (let y = -4; y < 34; y++)
      for (let x = -4; x < 34; x++)
        this.add
          .image(x * 32 + 16, y * 32 + 16, `grass${Math.abs(x * 17 + y * 11) % 4}`)
          .setDepth(-10);
    const g = this.add.graphics().setDepth(-9);
    g.fillStyle(0xb9bb87);
    g.fillRect(-128, 374, 1216, 30);
    g.fillStyle(0xd1c49a);
    g.fillRect(-128, 379, 1216, 19);
    g.fillStyle(0x849e68);
    g.fillRect(-128, 404, 1216, 2);
    g.fillStyle(0x669a9e);
    g.fillRect(-128, 636, 390, 430);
    g.fillStyle(0x7aafb0);
    g.fillRect(-128, 640, 380, 430);
    g.fillStyle(0x9ec7bd);
    for (let i = 0; i < 60; i++)
      g.fillRect(((i * 61) % 370) - 128, 652 + i * 7, 12 + (i % 3) * 7, 1);
    g.fillStyle(0xb7c789);
    for (let i = 0; i < 14; i++) g.fillRect(230 + (i % 2) * 16, 638 + i * 32, 28, 32);
    for (let i = 0; i < 85; i++) {
      const x = ((i * 137) % 1030) - 20,
        y = (i * 191) % 1000;
      if (x > 360 && x < 660 && y > 350 && y < 670) continue;
      if (x < 280 && y > 620) continue;
      this.add.image(x, y, 'flowers').setDepth(y + 15);
    }
    for (let i = 0; i < 31; i++) {
      const x = (i * 179) % 1000,
        y = (i * 251) % 990;
      if (x > 340 && x < 680 && y > 340 && y < 720) continue;
      if (x < 280 && y > 620) continue;
      this.add.image(x, y, 'tree').setOrigin(0.5, 1).setDepth(y);
    }
    for (let i = 0; i < 12; i++) {
      const x = (i * 213) % 980,
        y = (i * 149) % 980;
      if (x > 360 && x < 650 && y > 390 && y < 640) continue;
      if (x < 280 && y > 620) continue;
      this.add.image(x, y, 'rock').setDepth(y);
    }
    for (let x = 11; x <= 19; x++) {
      if (x === 15 || x === 16) continue;
      this.add.image(x * 32, 355, 'building-fence').setDepth(355);
    }
  }
  drawMenuFarm() {
    const add = (x: number, y: number, t: string, depth: number) => {
      const o = this.add.image(x, y, t).setDepth(depth);
      this.menuObjects.push(o);
    };
    add(638, 426, 'building-house', 464);
    add(773, 528, 'building-coop', 560);
    add(749, 567, 'animal-chicken', 582);
    add(792, 577, 'animal-chicken', 585);
    add(718, 415, 'building-well', 439);
    add(687, 565, 'building-chest', 585);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 4; x++) {
        add(580 + x * 32, 514 + y * 32, 'soil', -4);
        add(580 + x * 32, 514 + y * 32, `crop-${x % 2 ? 'carrot' : 'strawberry'}-3`, 540 + y * 32);
      }
    add(540, 579, 'player', 610);
    for (let i = 0; i < 5; i++) add(603 + i * 32, 623, 'building-fence', 650);
  }
  renderObject(
    id: string,
    x: number,
    y: number,
    texture: string,
    depth: number,
    scaleX = 1,
    scaleY = 1,
  ) {
    let obj = this.objects.get(id);
    if (!obj) {
      obj = this.pool.pop() ?? this.add.image(x, y, texture);
      this.objects.set(id, obj);
    }
    obj
      .setTexture(texture)
      .setPosition(x, y)
      .setDepth(depth)
      .setScale(scaleX, scaleY)
      .setVisible(true);
  }
  refresh() {
    if (!this.ready) return;
    const s = this.engine.state,
      active = new Set<string>();
    if (!this.hiddenMenu) {
      for (const [k, t] of Object.entries(s.tiles)) {
        active.add(`tile:${k}`);
        this.renderObject(
          `tile:${k}`,
          t.x * 32 + 16,
          t.y * 32 + 16,
          t.plot ? (t.plot.watered ? 'soil-wet' : 'soil') : 'grass2',
          -5,
        );
        if (t.plot?.crop) {
          const c = cropById[t.plot.crop],
            stage = Math.min(3, Math.floor((t.plot.growth / c.growDays) * 3));
          active.add(`crop:${k}`);
          this.renderObject(
            `crop:${k}`,
            t.x * 32 + 16,
            t.y * 32 + 16,
            `${c.spriteKey}-${stage}`,
            t.y * 32 + 29,
          );
        }
      }
      for (const b of s.buildings) {
        const d = buildingById[b.type],
          w = b.rotation ? d.height : d.width,
          h = b.rotation ? d.width : d.height;
        active.add(b.id);
        this.renderObject(
          b.id,
          b.x * 32 + w * 16,
          b.y * 32 + h * 16 - 8,
          b.type === 'house' ? `building-house-${s.houseLevel}` : `building-${b.type}`,
          b.y * 32 + h * 32,
          b.rotation ? w / d.width : 1,
          b.rotation ? (h * 32 + 16) / (d.height * 32 + 16) : 1,
        );
      }
      for (const a of s.animals) {
        const b = s.buildings.find((b) => b.id === a.building);
        if (!b) continue;
        const idx = s.animals.filter((x) => x.building === b.id).indexOf(a);
        active.add(a.id);
        this.renderObject(
          a.id,
          b.x * 32 + 12 + (idx % 2) * 20,
          (b.y + buildingById[b.type].height) * 32 - 12 + Math.floor(idx / 2) * 12,
          `animal-${a.species}`,
          b.y * 32 + buildingById[b.type].height * 32 + 5,
          a.stage === 'baby' ? 0.7 : 1,
          a.stage === 'baby' ? 0.7 : 1,
        );
      }
      if (s.merchant.present) {
        active.add('merchant');
        this.renderObject('merchant', 552, 388, 'merchant', 405);
      }
    }
    for (const [id, obj] of this.objects)
      if (!active.has(id)) {
        obj.setVisible(false);
        this.pool.push(obj);
        this.objects.delete(id);
      }
    this.drawHighlight();
    this.seenRevision = this.engine.revision;
  }
  drawHighlight() {
    const g = this.highlight!;
    g.clear();
    if (this.hiddenMenu) return;
    g.lineStyle(1, 0xeadeab, 0.8);
    for (const t of Object.values(this.engine.state.tiles))
      g.strokeRect(t.x * 32, t.y * 32, 32, 32);
    if (this.selected) {
      g.lineStyle(2, 0xf4df8b, 1);
      g.strokeRect(this.selected.x * 32 + 1, this.selected.y * 32 + 1, 30, 30);
    }
    for (const k of this.selection) {
      const t = this.engine.state.tiles[k];
      if (t) {
        g.fillStyle(0xf4df8b, 0.23);
        g.fillRect(t.x * 32, t.y * 32, 32, 32);
      }
    }
  }
  drawPreview(x: number, y: number) {
    const p = this.placing;
    if (!p) return;
    const d = buildingById[p.type],
      w = p.rotation ? d.height : d.width,
      h = p.rotation ? d.width : d.height;
    const valid = canPlace(this.engine.state, p.type, x, y, p.rotation, p.ignore);
    this.preview ??= this.add.image(0, 0, `building-${p.type}`).setDepth(3000);
    this.preview
      .setTexture(`building-${p.type}`)
      .setPosition(x * 32 + w * 16, y * 32 + h * 16 - 8)
      .setScale(w / d.width, (h * 32 + 16) / (d.height * 32 + 16))
      .setAlpha(0.6)
      .setTint(valid ? 0xb5ef9b : 0xff8c8c)
      .setVisible(true);
    this.previewGrid
      ?.clear()
      .fillStyle(valid ? 0x91ca6b : 0xd57662, 0.35)
      .fillRect(x * 32, y * 32, w * 32, h * 32);
  }
  cancelPreview() {
    this.placing = undefined;
    this.preview?.setVisible(false);
    this.previewGrid?.clear();
  }
  update(_time: number, delta: number) {
    if (!this.ready) return;
    this.engine.tick(delta / 1000);
    if (this.seenRevision !== this.engine.revision) this.refresh();
    const s = this.engine.state;
    const c = this.cameras.main;
    const dayFraction = s.elapsed / B.daySeconds;
    const night = dayFraction > B.daylight[calendar(s.day).season];
    this.overlay?.setAlpha(this.hiddenMenu ? 0 : night ? 0.24 : 0);
    this.overlay
      ?.setPosition((1280 - 1280 / c.zoom) / 2, (720 - 720 / c.zoom) / 2)
      .setDisplaySize(1280 / c.zoom, 720 / c.zoom); // scroll-factor zero fixes the tint to the viewport
    if (!this.hiddenMenu && !this.engine.paused && !this.buildMode) {
      let vx =
          this.joystick.x + (this.keys?.right.isDown ? 1 : 0) - (this.keys?.left.isDown ? 1 : 0),
        vy = this.joystick.y + (this.keys?.down.isDown ? 1 : 0) - (this.keys?.up.isDown ? 1 : 0);
      if (this.target) {
        const dx = this.target.x - this.player.x,
          dy = this.target.y - this.player.y,
          len = Math.hypot(dx, dy);
        if (len < 3) this.target = undefined;
        else {
          vx = dx / len;
          vy = dy / len;
        }
      }
      const len = Math.hypot(vx, vy);
      if (len) {
        this.player.x = Phaser.Math.Clamp(
          this.player.x + (vx / Math.max(1, len)) * delta * 0.075,
          0,
          960,
        );
        this.player.y = Phaser.Math.Clamp(
          this.player.y + (vy / Math.max(1, len)) * delta * 0.075,
          0,
          960,
        );
        const rate = Math.min(1, delta * 0.01 * s.settings.cameraSpeed);
        c.scrollX = Phaser.Math.Linear(c.scrollX, this.player.x - 640 / c.zoom, rate);
        c.scrollY = Phaser.Math.Linear(c.scrollY, this.player.y - 20 - 360 / c.zoom, rate);
      }
    }
    const weather = this.ambience!;
    weather.clear();
    if (!this.hiddenMenu && ['rain', 'storm', 'snow'].includes(s.weather)) {
      const count = s.weather === 'storm' ? 85 : 40;
      weather.lineStyle(1, s.weather === 'snow' ? 0xf5f0d7 : 0xc9e3d8, 0.55);
      for (let i = 0; i < count; i++) {
        const x = c.scrollX + ((i * 47 + _time * 0.015) % (1280 / c.zoom)),
          y =
            c.scrollY + ((i * 67 + _time * (s.weather === 'snow' ? 0.025 : 0.16)) % (720 / c.zoom));
        if (s.weather === 'snow') {
          weather.fillStyle(0xf5f0d7, 0.7);
          weather.fillRect(x, y, 2, 2);
        } else weather.lineBetween(x, y, x - 2, y + 7);
      }
    }
    const seasonal = calendar(s.day).season;
    const tint =
      seasonal === 'autumn'
        ? 0xf0dbb1
        : seasonal === 'winter'
          ? 0xe4efec
          : seasonal === 'summer'
            ? 0xe4eda4
            : 0xffffff;
    for (const obj of this.objects.values())
      if (obj.texture.key.startsWith('grass')) obj.setTint(tint);
    const view = c.worldView;
    for (const obj of this.objects.values())
      obj.setVisible(
        obj.x > view.x - 140 &&
          obj.x < view.right + 140 &&
          obj.y > view.y - 140 &&
          obj.y < view.bottom + 140,
      );
  }
}
