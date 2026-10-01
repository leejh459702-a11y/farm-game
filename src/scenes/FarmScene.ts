/**
 * FarmScene — 농장 월드 렌더링/입력의 중심.
 * 게임 로직은 World 가 담당하고, 이 씬은 상태를 그리고 입력을 명령으로 바꾼다.
 */
import Phaser from 'phaser';
import { Session } from '../core/Session';
import type { World } from '../core/World';
import { SettingsStore, vibrate } from '../services/SettingsStore';
import { AudioManager } from '../audio/AudioManager';
import { ITEM_BY_ID } from '../data/items';
import { areaTiles, performAction, resolveAction, type ResolvedAction } from '../systems/InteractionService';
import { GroundRenderer } from './world/GroundRenderer';
import { CropRenderer } from './world/CropRenderer';
import { BuildingRenderer } from './world/BuildingRenderer';
import { AnimalRenderer } from './world/AnimalRenderer';
import { PlayerController } from './world/PlayerController';
import { BuildController } from './world/BuildController';
import { BORDER, DEFAULT_ZOOM, DEPTH, FH, FW, TS, WORLD_MIN } from './world/constants';
import { InputState } from './InputState';
import { Bridge } from './Bridge';
import { Panels } from '../ui/PanelManager';
import { RegionSelectPanel } from '../ui/panels/RegionSelectPanel';

/** 농장 출구 위치 (최대 영역 바로 아래, 가운데) */
const GATE = { x: 14, y: FH };
const isGate = (x: number, y: number): boolean => y >= FH && y <= FH + 1 && x >= 13 && x <= 15;

interface PointerTrack {
  id: number;
  sx: number;
  sy: number;
  x: number;
  y: number;
  t: number;
  moved: boolean;
  ghostDrag: boolean;
  lastTile: { x: number; y: number } | null;
}

export class FarmScene extends Phaser.Scene {
  private w!: World;
  ground!: GroundRenderer;
  crops!: CropRenderer;
  buildings!: BuildingRenderer;
  animals!: AnimalRenderer;
  player!: PlayerController;
  build!: BuildController;
  private cursor!: Phaser.GameObjects.Graphics;
  private unsubs: (() => void)[] = [];
  private pointers = new Map<number, PointerTrack>();
  private pinchStart: { dist: number; zoom: number } | null = null;
  private contextTimer = 0;
  private lastContext = '';
  private cursorTile: { x: number; y: number } | null = null;
  private cursorTileTime = 0;
  private following = true;
  private focusHold = 0;
  private cullTimer = 0;

  constructor() {
    super('Farm');
  }

  create(): void {
    this.w = Session.world!;
    const w = this.w;
    this.cameras.main.setBackgroundColor('#2e4a2a');
    this.ground = new GroundRenderer(this, w);
    this.ground.build();
    this.crops = new CropRenderer(this, w);
    this.crops.syncAll();
    this.buildings = new BuildingRenderer(this, w);
    this.buildings.syncAll();
    this.animals = new AnimalRenderer(this, w, this.buildings);
    this.animals.syncAll();
    this.player = new PlayerController(this, w);
    this.player.create();
    this.build = new BuildController(this, w, this.buildings);
    this.build.create();
    this.cursor = this.add.graphics().setDepth(DEPTH.cursor);

    // 카메라
    const cam = this.cameras.main;
    cam.setBounds(WORLD_MIN, WORLD_MIN, (FW + BORDER * 2) * TS, (FH + BORDER * 2) * TS);
    cam.setZoom(DEFAULT_ZOOM);
    cam.startFollow(this.player.sprite, true, 0.12, 0.12);
    cam.setRoundPixels(true);

    this.input.addPointer(2);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => this.zoomBy(dy > 0 ? 0.9 : 1.1));
    this.setupKeyboard();

    // 월드 이벤트 → 렌더 갱신
    const ev = w.events;
    this.unsubs.push(
      ev.on('plots', (e) => {
        this.crops.sync(e.keys);
        this.ground.refreshSoil(e.keys === 'all' ? undefined : e.keys);
        this.lastContext = '';
      }),
      ev.on('buildings', () => {
        this.buildings.syncAll();
        this.animals.syncAll();
        this.player.ensureFree();
        if (this.build.active) this.build.redraw();
        this.lastContext = '';
      }),
      ev.on('land', () => {
        this.ground.refreshLand();
        if (this.build.active) this.build.redraw();
        this.buildings.syncMerchant();
      }),
      ev.on('animals', () => {
        this.animals.syncAll();
        this.buildings.syncBubbles();
      }),
      ev.on('processing', () => this.buildings.syncBubbles()),
      ev.on('inventory', () => this.buildings.syncBubbles()),
      ev.on('merchant', () => this.buildings.syncMerchant()),
      ev.on('house', () => this.buildings.syncAll()),
      ev.on('dayStarted', () => {
        this.ground.checkSeason();
        this.crops.refreshTints();
        this.buildings.syncBubbles();
      }),
      ev.on('floatText', (e) => this.floatText(e.x, e.y, e.text, e.color)),
      Session.app.on('focusTile', (e) => this.focusTile(e.x, e.y)),
      Session.app.on('action', () => this.scene.isActive() && this.doAction()),
    );

    Bridge.farm = {
      build: this.build,
      enterBuild: (mode, type) => this.enterBuild(mode, type),
      exitBuild: () => this.exitBuild(),
      doAction: () => this.doAction(),
      focusTile: (x, y) => this.focusTile(x, y),
      worldToScreen: (x, y) => this.worldToScreen(x, y),
      tileScreenRect: (x, y, ww = 1, hh = 1) => {
        const a = this.worldToScreen(x * TS, y * TS);
        const b = this.worldToScreen((x + ww) * TS, (y + hh) * TS);
        return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y };
      },
      playerScreen: () => this.worldToScreen(this.player.sprite.x, this.player.sprite.y - 28),
      merchantScreen: () => {
        const t = this.buildings.merchantTile;
        return t ? this.worldToScreen(t.x * TS + TS, t.y * TS - 20) : null;
      },
      refreshAll: () => {
        this.ground.refreshAll();
        this.crops.syncAll();
        this.buildings.syncAll();
        this.animals.syncAll();
      },
      zoomBy: (f) => this.zoomBy(f),
      useGate: () => this.useGate(),
    };

    InputState.tap = (x, y) => this.onTap(x, y);
    // 외곽 지역에서 돌아올 때
    this.events.on(Phaser.Scenes.Events.WAKE, () => {
      InputState.tap = (x, y) => this.onTap(x, y);
      const p = this.w.state.player;
      this.player.setPos(p.x, p.y);
      this.player.ensureFree();
      this.cameras.main.startFollow(this.player.sprite, true, 0.12, 0.12);
      this.cameras.main.centerOn(p.x, p.y);
      this.following = true;
      this.cameras.main.fadeIn(250, 20, 14, 10);
      this.ground.checkSeason();
      this.crops.syncAll();
      this.buildings.syncAll();
      this.animals.syncAll();
      this.lastContext = '';
    });
    // 농장 아래쪽 출구 (외곽 지역으로 가는 길)
    this.add.image(GATE.x * TS + TS + 16, (GATE.y + 1) * TS + 2, 'node_exit').setOrigin(0.5, 1).setDepth(DEPTH.objects + (GATE.y + 1) * TS);
    this.add
      .text(GATE.x * TS + TS + 16, GATE.y * TS - 10, '외곽', { fontFamily: 'Galmuri11', fontSize: '9px', color: '#fff6e2', stroke: '#3b2a22', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui - 50);

    this.scene.launch('Overlay');
    this.scene.launch('Controls');
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());
    this.scale.on('resize', this.onResize, this);
    this.applySettings();
    this.unsubs.push(SettingsStore.events.on('change', () => this.applySettings()));
  }

  private applySettings(): void {
    const fps = SettingsStore.value.fpsLimit;
    this.game.loop.targetFps = fps;
    (this.game.loop as unknown as { fpsLimit: number }).fpsLimit = fps;
  }

  private onResize(): void {
    this.lastContext = '';
  }

  private cleanup(): void {
    InputState.tap = null;
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.scale.off('resize', this.onResize, this);
    Bridge.farm = null;
    this.scene.stop('Overlay');
    this.scene.stop('Controls');
  }

  // ───── 키보드 (PC) ─────
  private setupKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;
    kb.on('keydown', (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (Panels.isOpen()) {
        if (e.key === 'Escape') Panels.close();
        return;
      }
      if (e.key === ' ' || e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        if (this.build.active) return;
        this.doAction();
      }
      const n = Number(e.key);
      if (n >= 1 && n <= 7) {
        this.w.state.hotbar.selected = n - 1;
        Session.app.emit('tool', { index: n - 1 });
        this.lastContext = '';
      }
    });
  }

  // ───── 좌표 ─────
  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    const cam = this.cameras.main;
    const sx = (wx - cam.worldView.x) * cam.zoom;
    const sy = (wy - cam.worldView.y) * cam.zoom;
    // 게임 캔버스 좌표 → CSS 픽셀
    const canvas = this.game.canvas.getBoundingClientRect();
    const scaleX = canvas.width / this.scale.width;
    const scaleY = canvas.height / this.scale.height;
    return { x: canvas.left + sx * scaleX, y: canvas.top + sy * scaleY };
  }

  private tileAt(px: number, py: number): { x: number; y: number; wx: number; wy: number } {
    const p = this.cameras.main.getWorldPoint(px, py);
    return { x: Math.floor(p.x / TS), y: Math.floor(p.y / TS), wx: p.x, wy: p.y };
  }

  // ───── 포인터 ─────
  private onDown(p: Phaser.Input.Pointer): void {
    if (InputState.capturedPointers.has(p.id)) return;
    const t = this.tileAt(p.x, p.y);
    const ghostDrag = this.build.active && this.build.isOnGhost(t.x, t.y);
    this.pointers.set(p.id, { id: p.id, sx: p.x, sy: p.y, x: p.x, y: p.y, t: this.time.now, moved: false, ghostDrag, lastTile: ghostDrag ? { x: t.x, y: t.y } : null });
    if (this.pointers.size === 2) {
      const [a, b] = [...this.pointers.values()];
      this.pinchStart = { dist: Math.hypot(a.x - b.x, a.y - b.y), zoom: this.cameras.main.zoom };
    }
  }

  private onMove(p: Phaser.Input.Pointer): void {
    const tr = this.pointers.get(p.id);
    if (!tr) return;
    const dx = p.x - tr.x;
    const dy = p.y - tr.y;
    tr.x = p.x;
    tr.y = p.y;
    if (Math.hypot(p.x - tr.sx, p.y - tr.sy) > 10) tr.moved = true;
    if (this.pointers.size >= 2 && this.pinchStart) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.setZoom(this.pinchStart.zoom * (d / Math.max(1, this.pinchStart.dist)));
      return;
    }
    if (!tr.moved) return;
    const ps = Bridge.plotSelect;
    if (ps?.active && this.pointers.size === 1) {
      const t = this.tileAt(p.x, p.y);
      const k = `${t.x},${t.y}`;
      if (this.w.state.plots[k] && !ps.keys.has(k)) {
        ps.keys.add(k);
        ps.onChange();
      }
      return;
    }
    if (tr.ghostDrag && tr.lastTile) {
      const t = this.tileAt(p.x, p.y);
      this.build.dragGhostBy(t.x - tr.lastTile.x, t.y - tr.lastTile.y);
      tr.lastTile = { x: t.x, y: t.y };
      return;
    }
    // 건설 모드 또는 Tap 모드가 아닌 일반 모드에서 드래그 = 카메라 이동
    if (this.build.active || SettingsStore.value.controlMode === 'tap' || !InputState.joyActive) {
      const cam = this.cameras.main;
      if (this.following) {
        cam.stopFollow();
        this.following = false;
      }
      const sp = SettingsStore.value.cameraSpeed;
      cam.scrollX -= (dx / cam.zoom) * sp;
      cam.scrollY -= (dy / cam.zoom) * sp;
      this.focusHold = this.build.active ? Infinity : 4;
    }
  }

  private onUp(p: Phaser.Input.Pointer): void {
    const tr = this.pointers.get(p.id);
    this.pointers.delete(p.id);
    if (this.pointers.size < 2) {
      if (this.pinchStart) this.setZoom(Math.round(this.cameras.main.zoom * 4) / 4);
      this.pinchStart = null;
    }
    if (!tr || tr.moved || InputState.capturedPointers.has(p.id)) return;
    if (this.time.now - tr.t > 600) return;
    this.onTap(p.x, p.y);
  }

  zoomBy(f: number): void {
    this.setZoom(this.cameras.main.zoom * f);
  }

  private setZoom(z: number): void {
    this.cameras.main.setZoom(Phaser.Math.Clamp(z, 1, 4));
  }

  private onTap(px: number, py: number): void {
    const t = this.tileAt(px, py);
    if (this.build.active) {
      this.build.tap(t.x, t.y);
      return;
    }
    if (this.w.tutorial.active && this.w.tutorial.step < 2) return;
    const ps = Bridge.plotSelect;
    if (ps?.active) {
      const k = `${t.x},${t.y}`;
      if (this.w.state.plots[k]) {
        if (ps.keys.has(k)) ps.keys.delete(k);
        else ps.keys.add(k);
        ps.onChange();
      }
      return;
    }
    // 동물
    const animalId = this.animals.hit(t.wx, t.wy);
    if (animalId) {
      this.animals.showHeart(animalId);
      Bridge.openAnimal?.(animalId);
      return;
    }
    if (this.buildings.hitMerchant(t.wx, t.wy)) {
      Bridge.openMerchant?.();
      return;
    }
    if (isGate(t.x, t.y)) return this.useGate();
    if (t.x < 0 || t.y < 0 || t.x >= FW || t.y >= FH) return;
    const b = this.w.grid.buildingAt(t.x, t.y);
    if (b) {
      const a = resolveAction(this.w, t.x, t.y);
      if (a.kind === 'feed') return this.actAt(t.x, t.y);
      Bridge.openBuilding?.(b.uid);
      return;
    }
    this.cursorTile = { x: t.x, y: t.y };
    this.cursorTileTime = this.time.now;
    const a = resolveAction(this.w, t.x, t.y);
    if (a.enabled) {
      if (this.inReach(t.x, t.y)) this.actAt(t.x, t.y);
      else this.walkAndAct(t.x, t.y);
    } else if (SettingsStore.value.controlMode === 'tap') {
      this.player.walkTo([{ x: t.x, y: t.y }, ...this.neighbors(t.x, t.y)], null, () => {});
    } else if (a.hint) Session.app.emit('context', { label: a.label, icon: a.icon, enabled: false, hint: a.hint });
    this.lastContext = '';
  }

  private neighbors(x: number, y: number): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) out.push({ x: x + dx, y: y + dy });
    return out;
  }

  private inReach(x: number, y: number): boolean {
    const p = this.player.tile();
    return Math.max(Math.abs(p.x - x), Math.abs(p.y - y)) <= 1;
  }

  private walkAndAct(x: number, y: number): void {
    const goals = this.neighbors(x, y).concat(this.w.grid.isBlocked(x, y) ? [] : [{ x, y }]);
    const ok = this.player.walkTo(goals, { x, y }, () => this.actAt(x, y));
    if (!ok) Session.app.emit('toast', { text: '그곳까지 갈 수 없어요', tone: 'warn' });
  }

  /** 농장 출구 → 외곽 지역 선택 */
  private useGate(): void {
    const p = this.player.tile();
    const open = (): void => void Panels.open(new RegionSelectPanel());
    if (p.y >= FH - 1 && Math.abs(p.x - 15) <= 2) return open();
    const ok = this.player.walkTo([{ x: 15, y: FH - 1 }, { x: 14, y: FH - 1 }, { x: 16, y: FH - 1 }], { x: 15, y: FH }, open);
    if (!ok) open();
  }

  /** 행동 버튼 */
  doAction(): void {
    if (this.build.active || Panels.isOpen()) return;
    const t = this.targetTile();
    const mt = this.buildings.merchantTile;
    if (mt && t.y >= mt.y && t.y <= mt.y + 1 && t.x >= mt.x && t.x <= mt.x + 1) {
      Bridge.openMerchant?.();
      return;
    }
    if (isGate(t.x, t.y)) return this.useGate();
    const b = this.w.grid.buildingAt(t.x, t.y);
    if (b) {
      const a = resolveAction(this.w, t.x, t.y);
      if (a.kind === 'feed') return this.actAt(t.x, t.y);
      Bridge.openBuilding?.(b.uid);
      return;
    }
    // 바로 앞이 비어 있으면 근처 상인/동물 상호작용
    this.actAt(t.x, t.y);
  }

  private actAt(x: number, y: number): void {
    const before: ResolvedAction = resolveAction(this.w, x, y);
    const r = performAction(this.w, x, y);
    if (r.openBuilding) {
      Bridge.openBuilding?.(r.openBuilding);
      return;
    }
    if (r.openPlot) {
      Bridge.openPlot?.(r.openPlot.x, r.openPlot.y);
      return;
    }
    if (!r.ok) {
      if (r.reason) Session.app.emit('toast', { text: r.reason, tone: 'warn' });
      AudioManager.sfx('error');
      return;
    }
    vibrate(12);
    // 연출
    const tiles = before.kind === 'harvest' || before.kind === 'plant' || before.kind === 'water' || before.kind === 'till' ? areaTiles(this.w, x, y) : [{ x, y }];
    if (r.harvested?.length) {
      const sum: Record<string, number> = {};
      for (const h of r.harvested) sum[h.itemId] = (sum[h.itemId] ?? 0) + h.qty;
      let i = 0;
      for (const [id, q] of Object.entries(sum)) this.floatText(x * TS + TS / 2, y * TS - 4 - i++ * 12, `+${q} ${ITEM_BY_ID[id].name}`, '#fff6a0');
    } else if (before.kind === 'water') this.splash(tiles);
    this.lastContext = '';
  }

  private splash(tiles: { x: number; y: number }[]): void {
    for (const t of tiles) {
      for (let i = 0; i < 5; i++) {
        const d = this.add.rectangle(t.x * TS + 8 + Math.random() * 16, t.y * TS + 6 + Math.random() * 10, 2, 3, 0x8ac8f0).setDepth(DEPTH.ui - 30);
        this.tweens.add({ targets: d, y: d.y + 10, alpha: 0, duration: 380 + Math.random() * 200, onComplete: () => d.destroy() });
      }
    }
  }

  floatText(x: number, y: number, text: string, color = '#ffffff'): void {
    const t = this.add
      .text(x, y, text, { fontFamily: 'Galmuri11', fontSize: '11px', color, stroke: '#3b2a22', strokeThickness: 3 })
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.ui);
    this.tweens.add({ targets: t, y: y - 18, alpha: 0, duration: 1100, ease: 'Cubic.easeOut', onComplete: () => t.destroy() });
  }

  /** 행동 대상 타일 (최근 탭한 칸이 손 닿는 거리면 우선) */
  targetTile(): { x: number; y: number } {
    if (this.cursorTile && this.time.now - this.cursorTileTime < 6000 && this.inReach(this.cursorTile.x, this.cursorTile.y) && !this.player.moving) return this.cursorTile;
    return this.player.facingTile();
  }

  focusTile(x: number, y: number): void {
    const cam = this.cameras.main;
    cam.stopFollow();
    this.following = false;
    cam.pan(x * TS + TS / 2, y * TS + TS / 2, 450, 'Sine.easeInOut');
    this.focusHold = this.build.active ? Infinity : 5;
  }

  enterBuild(mode: 'select' | 'land' | 'place' = 'select', type?: string): void {
    this.player.cancelPath();
    this.player.enabled = false;
    this.cameras.main.stopFollow();
    this.following = false;
    this.focusHold = Infinity;
    this.build.enter(mode, type);
    Session.app.emit('buildMode', { on: true, mode, type });
  }

  exitBuild(): void {
    this.build.exit();
    this.player.enabled = true;
    this.focusHold = 0;
    Session.app.emit('buildMode', { on: false });
  }

  update(_t: number, deltaMs: number): void {
    const w = Session.world;
    if (!w || w !== this.w) return;
    const dt = Math.min(deltaMs / 1000, 0.1);
    w.time.tick(dt);
    this.player.update(dt);
    const cam = this.cameras.main;
    // 일정 시간 후 플레이어 추적 복귀
    if (!this.following && !this.build.active) {
      this.focusHold -= dt;
      if (this.focusHold <= 0 || this.player.moving) {
        cam.startFollow(this.player.sprite, true, 0.12, 0.12);
        this.following = true;
      }
    }
    const view = cam.worldView;
    this.animals.update(dt, view);
    this.cullTimer -= dt;
    if (this.cullTimer <= 0) {
      this.crops.cull(view);
      this.cullTimer = 0.25;
    }
    this.updateCursorAndContext(dt);
  }

  private updateCursorAndContext(dt: number): void {
    const g = this.cursor;
    g.clear();
    const ps = Bridge.plotSelect;
    if (ps?.active) {
      for (const k of ps.keys) {
        const [x, y] = k.split(',').map(Number);
        g.fillStyle(0xf2c83a, 0.32).fillRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
        g.lineStyle(2, 0xfff6a0, 0.95).strokeRect(x * TS + 1, y * TS + 1, TS - 2, TS - 2);
      }
      return;
    }
    if (this.build.active || (this.w.tutorial.active && this.w.tutorial.step < 3)) return;
    const t = this.targetTile();
    const mt = this.buildings.merchantTile;
    if (mt && t.y >= mt.y && t.y <= mt.y + 1 && t.x >= mt.x && t.x <= mt.x + 1) {
      if (this.lastContext !== 'merchant') {
        this.lastContext = 'merchant';
        Session.app.emit('context', { label: '상인과 거래', icon: 'ic_merchant', enabled: true });
      }
      return;
    }
    if (isGate(t.x, t.y)) {
      const sig = 'gate';
      if (sig !== this.lastContext) {
        this.lastContext = sig;
        Session.app.emit('context', { label: '외곽으로', icon: 'ic_region', enabled: true });
      }
      return;
    }
    const a = resolveAction(this.w, t.x, t.y);
    const col = a.enabled ? 0xfff6a0 : 0xffffff;
    const tiles = a.enabled && ['harvest', 'till', 'plant', 'water', 'fertilize'].includes(a.kind) ? areaTiles(this.w, t.x, t.y) : [t];
    const pulse = 0.55 + Math.sin(this.time.now / 180) * 0.25;
    for (const c of tiles) {
      if (c.x < 0 || c.y < 0 || c.x >= FW || c.y >= FH) continue;
      g.lineStyle(2, col, a.enabled ? pulse + 0.2 : 0.35).strokeRect(c.x * TS + 1, c.y * TS + 1, TS - 2, TS - 2);
    }
    this.contextTimer -= dt;
    const sig = `${a.kind}|${a.label}|${a.enabled}|${a.icon}`;
    if (sig !== this.lastContext && this.contextTimer <= 0) {
      this.lastContext = sig;
      this.contextTimer = 0.1;
      Session.app.emit('context', { label: a.label, icon: a.icon, enabled: a.enabled || a.kind === 'plotInfo' || a.kind === 'open', hint: a.hint });
    }
  }
}
