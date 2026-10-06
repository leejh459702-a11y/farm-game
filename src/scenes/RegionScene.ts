/**
 * RegionScene — 외곽 탐험 지역 (강가 · 숲 · 바위 언덕). 작은 고정 지도.
 * 상황별 행동: 채집 / 벌목 / 채광 / 낚시 / 상자 열기 / 농장으로
 */
import Phaser from 'phaser';
import { Session } from '../core/Session';
import type { World } from '../core/World';
import { Art } from '../assets/AssetRegistry';
import { TILE } from '../assets/art/tiles';
import { ITEM_BY_ID } from '../data/items';
import { REGION_BY_ID, ROCK_BY_ID } from '../data/gathering';
import type { RegionId, RegionNode } from '../types/game';
import { REGION_ENTRY, REGION_H, REGION_W, terrainAt, type Terrain } from '../systems/RegionSystem';
import { PlayerController } from './world/PlayerController';
import { DEFAULT_ZOOM, DEPTH, TS, hash2 } from './world/constants';
import { InputState } from './InputState';
import { goToFarm } from './Travel';
import { Panels } from '../ui/PanelManager';
import { startFishing, isFishing } from '../ui/FishingOverlay';
import { SettingsStore, vibrate } from '../services/SettingsStore';
import { AudioManager } from '../audio/AudioManager';

interface Ctx {
  kind: 'forage' | 'tree' | 'rock' | 'chest' | 'fish' | 'exit' | 'ladder' | 'none';
  label: string;
  icon: string;
  enabled: boolean;
  hint?: string;
  node?: RegionNode;
}

export class RegionScene extends Phaser.Scene {
  private w!: World;
  private player!: PlayerController;
  private nodeObjs = new Map<string, Phaser.GameObjects.GameObject[]>();
  private cursor!: Phaser.GameObjects.Graphics;
  private unsubs: (() => void)[] = [];
  private lastCtx = '';
  private ctxTimer = 0;
  private down: { id: number; x: number; y: number; t: number; moved: boolean } | null = null;
  private pinch: { d: number; z: number } | null = null;
  private seasonIdx = -1;
  private ground!: Phaser.Tilemaps.TilemapLayer;

  constructor(private regionId: RegionId) {
    super(regionId === 'river' ? 'River' : regionId === 'forest' ? 'Forest' : regionId === 'mine' ? 'Mine' : 'Hill');
  }

  create(): void {
    this.leaving = false;
    this.w = Session.world!;
    const w = this.w;
    w.regions.ensureDay(this.regionId);
    this.cameras.main.setBackgroundColor(this.regionId === 'mine' ? '#1a1418' : this.regionId === 'hill' ? '#5a5044' : '#2e4a2a');
    this.buildGround();
    // 입구 표지판
    this.add
      .image(REGION_ENTRY.x * TS + 6, (REGION_ENTRY.y - 1) * TS + TS, 'node_exit')
      .setOrigin(0.5, 1)
      .setFlipX(true)
      .setDepth(DEPTH.objects + REGION_ENTRY.y * TS - 1);
    const label = this.add
      .text(REGION_ENTRY.x * TS + 6, (REGION_ENTRY.y - 1) * TS - 12, '농장', { fontFamily: 'Galmuri11', fontSize: '9px', color: '#fff6e2', stroke: '#3b2a22', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui - 50);
    void label;
    this.player = new PlayerController(
      this,
      w,
      { width: REGION_W, height: REGION_H, blocked: (x, y) => w.regions.isBlocked(this.regionId, x, y) },
      { x: (REGION_ENTRY.x + 1) * TS + TS / 2, y: REGION_ENTRY.y * TS + TS - 6 },
    );
    this.player.create();
    w.state.player.facing = 'right';
    this.cursor = this.add.graphics().setDepth(DEPTH.cursor + 5);
    this.syncNodes();

    const cam = this.cameras.main;
    cam.setBounds(0, 0, REGION_W * TS, REGION_H * TS);
    cam.setZoom(DEFAULT_ZOOM);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    cam.fadeIn(250, 20, 14, 10);

    this.input.addPointer(2);
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (InputState.capturedPointers.has(p.id) || isFishing()) return;
      this.down = { id: p.id, x: p.x, y: p.y, t: this.time.now, moved: false };
      const ps = this.input.manager.pointers.filter((pp) => pp.isDown);
      if (ps.length === 2) this.pinch = { d: Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y), z: cam.zoom };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.down && p.id === this.down.id && Math.hypot(p.x - this.down.x, p.y - this.down.y) > 10) this.down.moved = true;
      const ps = this.input.manager.pointers.filter((pp) => pp.isDown);
      if (this.pinch && ps.length === 2) {
        const d = Phaser.Math.Distance.Between(ps[0].x, ps[0].y, ps[1].x, ps[1].y);
        cam.setZoom(Phaser.Math.Clamp(this.pinch.z * (d / Math.max(1, this.pinch.d)), 1.25, 4));
      }
    });
    this.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      const d = this.down;
      this.down = null;
      if (this.pinch) {
        this.pinch = null;
        cam.setZoom(Math.round(cam.zoom * 4) / 4);
        return;
      }
      if (!d || d.id !== p.id || d.moved || InputState.capturedPointers.has(p.id) || this.time.now - d.t > 600) return;
      this.onTap(p.x, p.y);
    });
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => cam.setZoom(Phaser.Math.Clamp(cam.zoom * (dy > 0 ? 0.9 : 1.1), 1.25, 4)));
    const kb = this.input.keyboard;
    kb?.on('keydown', (e: KeyboardEvent) => {
      if (Panels.isOpen() || isFishing()) return;
      if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') this.doAction();
    });

    this.unsubs.push(
      w.events.on('regions', (e) => e.id === this.regionId && this.syncNodes()),
      w.events.on('dayStarted', () => {
        w.regions.ensureDay(this.regionId);
        this.refreshGround();
        this.syncNodes();
        this.player.ensureFree();
      }),
      w.events.on('floatText', (f) => this.regionId === 'mine' && this.scene.isActive() && this.floatText(f.x, f.y, f.text, f.color ?? '#ffffff')),
      Session.app.on('action', () => this.scene.isActive() && this.doAction()),
    );
    InputState.tap = (x, y) => this.onTap(x, y);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      InputState.tap = null;
      for (const u of this.unsubs) u();
      this.unsubs = [];
      this.nodeObjs.clear();
    });
    this.w.notify({ key: `enter_${this.regionId}`, text: `${REGION_BY_ID[this.regionId].name} — ${w.regions.summary(this.regionId)}`, icon: REGION_BY_ID[this.regionId].icon });
  }

  // ───── 지면 ─────
  private tileFor(t: Terrain, x: number, y: number): number {
    const base = this.seasonIdx * TILE.perSeason;
    const r = hash2(x + 77, y + 13);
    switch (t) {
      case 'G':
        return base + (r < 0.12 ? TILE.grassFlower : r < 0.55 ? TILE.grassA : TILE.grassB);
      case 'F':
        return base + (r < 0.5 ? TILE.forestFloor : TILE.wildA);
      case 'T':
        return base + (r < 0.5 ? TILE.treeA : TILE.treeB);
      case 'W':
        return r < 0.5 ? TILE.waterA : TILE.waterB;
      case 'S':
        return TILE.sand;
      case 'R':
        return r < 0.5 ? TILE.rockA : TILE.rockB;
      case 'C':
        return TILE.cliff;
      case 'P':
        return TILE.path;
      case 'M':
        return r < 0.5 ? TILE.caveA : TILE.caveB;
      case 'K':
        return TILE.caveWall;
    }
  }

  private buildGround(): void {
    const ts = Art.tileset!;
    const map = this.make.tilemap({ tileWidth: TS, tileHeight: TS, width: REGION_W, height: REGION_H });
    const tileset = map.addTilesetImage('tiles', 'tiles', TS, TS, ts.margin, ts.spacing)!;
    this.ground = map.createBlankLayer('ground', tileset, 0, 0)!;
    this.ground.setDepth(DEPTH.ground);
    this.refreshGround();
    // 물결 반짝임
    if (this.regionId === 'river') {
      this.time.addEvent({
        delay: 700,
        loop: true,
        callback: () => {
          for (let i = 0; i < 3; i++) {
            const x = Math.floor(Math.random() * REGION_W);
            const y = Math.floor(Math.random() * REGION_H);
            if (terrainAt('river', x, y) !== 'W') continue;
            const s = this.add.rectangle(x * TS + Math.random() * TS, y * TS + Math.random() * TS, 6, 1, 0xd8f0ff, 0.9).setDepth(DEPTH.soil + 1);
            this.tweens.add({ targets: s, alpha: 0, scaleX: 2, duration: 900, onComplete: () => s.destroy() });
          }
        },
      });
    }
  }

  private refreshGround(): void {
    this.seasonIdx = this.w.cal.seasonIndex;
    for (let y = 0; y < REGION_H; y++) for (let x = 0; x < REGION_W; x++) this.ground.putTileAt(this.tileFor(terrainAt(this.regionId, x, y), x, y), x, y);
  }

  // ───── 노드 ─────
  private syncNodes(): void {
    for (const objs of this.nodeObjs.values()) for (const o of objs) o.destroy();
    this.nodeObjs.clear();
    const s = this.w.cal.seasonIndex;
    for (const n of this.w.regions.state(this.regionId).nodes) {
      const objs: Phaser.GameObjects.GameObject[] = [];
      const bx = n.x * TS + TS / 2;
      const by = (n.y + 1) * TS;
      const depth = DEPTH.objects + by - 2;
      if (n.kind === 'tree') {
        const key = n.respawnDay !== null ? 'node_stump' : `node_tree_${n.big ? 'big' : 'small'}_${s}`;
        objs.push(this.add.image(bx, by + 2, key).setOrigin(0.5, 1).setDepth(depth));
      } else if (n.respawnDay !== null) {
        continue;
      } else if (n.kind === 'rock') {
        objs.push(this.add.image(bx, by + 2, `node_${n.itemId}`).setOrigin(0.5, 1).setDepth(depth));
      } else if (n.kind === 'ladder') {
        const l = this.add.image(bx, by, 'node_ladder').setOrigin(0.5, 1).setDepth(DEPTH.soil + 1);
        this.tweens.add({ targets: l, alpha: 0.75, duration: 600, yoyo: true, repeat: -1 });
        objs.push(l);
      } else if (n.kind === 'chest') {
        const c = this.add.image(bx, by + 2, 'node_chest').setOrigin(0.5, 1).setDepth(depth);
        this.tweens.add({ targets: c, scaleY: 1.06, duration: 500, yoyo: true, repeat: -1 });
        objs.push(c);
      } else {
        objs.push(this.add.image(bx, by, 'node_forage').setOrigin(0.5, 1).setDepth(depth - 1));
        const ic = this.add.image(bx, by - 10, `it_${n.itemId}`).setOrigin(0.5, 1).setDepth(depth);
        this.tweens.add({ targets: ic, y: ic.y - 2, duration: 900 + Math.random() * 400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
        objs.push(ic);
      }
      this.nodeObjs.set(n.id, objs);
    }
    this.lastCtx = '';
  }

  // ───── 상호작용 ─────
  private resolve(x: number, y: number): Ctx {
    const w = this.w;
    if (x <= 0 && y === REGION_ENTRY.y) return { kind: 'exit', label: '농장으로', icon: 'ic_house', enabled: true };
    if (x === REGION_ENTRY.x && y === REGION_ENTRY.y - 1) return { kind: 'exit', label: '농장으로', icon: 'ic_house', enabled: true };
    const n = w.regions.nodeAt(this.regionId, x, y);
    if (n) {
      if (n.kind === 'forage') return { kind: 'forage', label: '채집', icon: `it_${n.itemId}`, enabled: true, node: n };
      if (n.kind === 'chest') return { kind: 'chest', label: '상자 열기', icon: 'node_chest', enabled: true, node: n };
      if (n.kind === 'ladder') return { kind: 'ladder', label: '내려가기', icon: 'ic_mine', enabled: true, node: n };
      if (n.kind === 'tree') return { kind: 'tree', label: '벌목', icon: 'tool_axe', enabled: true, node: n };
      const rock = ROCK_BY_ID[n.itemId!];
      const ok = w.state.tools.pickaxe >= rock.tier;
      return { kind: 'rock', label: '채광', icon: 'tool_pickaxe', enabled: ok, hint: ok ? undefined : `${rock.name}은(는) 더 좋은 곡괭이가 필요해요`, node: n };
    }
    if (w.regions.isWater(this.regionId, x, y)) {
      const c = w.fishing.canFish();
      return { kind: 'fish', label: '낚시', icon: 'tool_rod', enabled: c.ok, hint: c.reason };
    }
    return { kind: 'none', label: '조사', icon: 'tool_hand', enabled: false };
  }

  private inReach(x: number, y: number): boolean {
    const p = this.player.tile();
    return Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1;
  }

  private neighbors(x: number, y: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.push({ x: x + dx, y: y + dy });
    return out;
  }

  private onTap(px: number, py: number): void {
    if (Panels.isOpen()) return;
    const wp = this.cameras.main.getWorldPoint(px, py);
    let tx = Math.floor(wp.x / TS);
    let ty = Math.floor(wp.y / TS);
    // 나무는 위쪽이 높아 머리 부분을 눌러도 인식
    const above = this.w.regions.nodeAt(this.regionId, tx, ty + 1);
    if (!this.w.regions.nodeAt(this.regionId, tx, ty) && above && (above.kind === 'tree' || above.kind === 'rock')) ty += 1;
    if (tx < 0) tx = 0;
    const c = this.resolve(tx, ty);
    if (c.kind === 'none') {
      if (SettingsStore.value.controlMode === 'tap' && !this.w.regions.isBlocked(this.regionId, tx, ty)) this.player.walkTo([{ x: tx, y: ty }], null, () => {});
      return;
    }
    if (!c.enabled) {
      if (c.hint) Session.app.emit('toast', { text: c.hint, tone: 'warn' });
      return;
    }
    if (c.kind === 'exit') return this.leave();
    if (this.inReach(tx, ty)) this.act(tx, ty);
    else if (c.kind === 'fish') this.walkToShore(tx, ty);
    else {
      const ok = this.player.walkTo(this.neighbors(tx, ty), { x: tx, y: ty }, () => this.act(tx, ty));
      if (!ok) Session.app.emit('toast', { text: '그곳까지 갈 수 없어요', tone: 'warn' });
    }
  }

  /** 물 한가운데를 눌러도 가장 가까운 물가로 걸어가서 낚시 */
  private walkToShore(tx: number, ty: number): void {
    const r = this.w.regions;
    const id = this.regionId;
    const spots: { x: number; y: number; wx: number; wy: number; d: number }[] = [];
    for (let y = ty - 8; y <= ty + 8; y++)
      for (let x = tx - 8; x <= tx + 8; x++) {
        if (x < 0 || y < 0 || r.isBlocked(id, x, y)) continue;
        for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          if (!r.isWater(id, x + dx, y + dy)) continue;
          spots.push({ x, y, wx: x + dx, wy: y + dy, d: Math.hypot(x - tx, y - ty) });
          break;
        }
      }
    spots.sort((a, b) => a.d - b.d);
    for (const s of spots.slice(0, 6)) {
      const ok = this.player.walkTo([{ x: s.x, y: s.y }], { x: s.wx, y: s.wy }, () => this.act(s.wx, s.wy));
      if (ok) return;
    }
    Session.app.emit('toast', { text: '물가까지 갈 수 없어요', tone: 'warn' });
  }

  private targetTile(): { x: number; y: number } {
    return this.player.facingTile();
  }

  doAction(): void {
    if (Panels.isOpen() || isFishing()) return;
    const t = this.targetTile();
    const c = this.resolve(t.x, t.y);
    if (c.kind === 'exit') return this.leave();
    if (!c.enabled) {
      if (c.hint) Session.app.emit('toast', { text: c.hint, tone: 'warn' });
      else Session.app.emit('toast', { text: '앞에 아무것도 없어요. 자원이나 물가를 마주 보세요', tone: 'info' });
      return;
    }
    this.act(t.x, t.y);
  }

  private act(x: number, y: number): void {
    const c = this.resolve(x, y);
    if (!c.enabled) return;
    if (c.kind === 'fish') {
      this.player.enabled = false;
      startFishing(this.w, () => {
        this.player.enabled = true;
      }, this.worldToScreen((x + 0.5) * TS, (y + 0.5) * TS));
      return;
    }
    if (c.kind === 'ladder') {
      const d = this.w.mine.descend();
      if (!d.ok) {
        Session.app.emit('toast', { text: d.reason ?? '', tone: 'warn' });
        return;
      }
      this.leaving = true;
      AudioManager.sfx('build');
      this.cameras.main.fadeOut(220, 10, 8, 10);
      this.time.delayedCall(230, () => {
        this.scene.restart();
        Session.app.emit('location', { id: 'mine' });
      });
      return;
    }
    if (!c.node) return;
    const r = this.w.regions.interact(this.regionId, c.node.id);
    if (!r.ok) {
      if (r.reason) Session.app.emit('toast', { text: r.reason, tone: 'warn' });
      AudioManager.sfx('error');
      return;
    }
    vibrate(10);
    // 타격 연출
    const objs = this.nodeObjs.get(c.node.id);
    if (objs && !r.depleted) {
      for (const o of objs) this.tweens.add({ targets: o, x: '+=2', duration: 50, yoyo: true, repeat: 2 });
      this.floatText(x * TS + TS / 2, y * TS - 4, `${c.node.hp}/${c.node.maxHp}`, '#ffffff');
    }
    r.drops.forEach((d, i) => this.floatText(x * TS + TS / 2, y * TS - 4 - i * 12, `+${d.qty} ${ITEM_BY_ID[d.itemId].name}`, '#fff6a0'));
    this.lastCtx = '';
  }

  private floatText(x: number, y: number, text: string, color: string): void {
    const t = this.add.text(x, y, text, { fontFamily: 'Galmuri11', fontSize: '11px', color, stroke: '#3b2a22', strokeThickness: 3 }).setOrigin(0.5, 1).setDepth(DEPTH.ui);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  private worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const cam = this.cameras.main;
    const rect = this.game.canvas.getBoundingClientRect();
    return { x: rect.left + ((wx - cam.worldView.x) * cam.zoom * rect.width) / this.scale.width, y: rect.top + ((wy - cam.worldView.y) * cam.zoom * rect.height) / this.scale.height };
  }

  private leaving = false;

  private leave(): void {
    if (this.leaving || !this.sys.isActive()) return;
    this.leaving = true;
    this.player.enabled = false;
    this.player.cancelPath();
    this.cameras.main.fadeOut(200, 20, 14, 10);
    this.time.delayedCall(210, () => goToFarm());
  }

  update(_t: number, deltaMs: number): void {
    const w = Session.world;
    if (!w || w !== this.w || this.leaving || !this.sys.isActive()) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    w.time.tick(dt);
    this.player.update(dt);
    // 왼쪽 끝 길로 걸어 나가면 농장으로
    const pt = this.player.tile();
    if (pt.x <= 0 && pt.y === REGION_ENTRY.y && this.player.moving && !isFishing()) this.leave();
    if (this.w.cal.seasonIndex !== this.seasonIdx) {
      this.refreshGround();
      this.syncNodes();
    }
    // 커서 + 행동 버튼 라벨
    const t = this.targetTile();
    const c = this.resolve(t.x, t.y);
    const g = this.cursor;
    g.clear();
    if (c.kind !== 'none' && !isFishing()) g.lineStyle(2, c.enabled ? 0xfff6a0 : 0xffffff, c.enabled ? 0.6 + Math.sin(this.time.now / 180) * 0.25 : 0.35).strokeRect(t.x * TS + 1, t.y * TS + 1, TS - 2, TS - 2);
    this.ctxTimer -= dt;
    const sig = `${c.kind}|${c.label}|${c.enabled}|${c.icon}`;
    if (sig !== this.lastCtx && this.ctxTimer <= 0) {
      this.lastCtx = sig;
      this.ctxTimer = 0.1;
      Session.app.emit('context', { label: c.label, icon: c.icon, enabled: c.enabled, hint: c.hint });
    }
  }
}
