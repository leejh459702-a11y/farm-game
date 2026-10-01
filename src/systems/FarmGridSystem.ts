/**
 * FarmGridSystem — 30×30 타일 그리드, 건물 배치·이동·회전·철거.
 */
import { BALANCE } from '../data/balance';
import { BUILDING_BY_ID, footprint } from '../data/buildings';
import type { BuildingInstance } from '../types/game';
import { tileKey } from '../utils/format';
import type { World } from '../core/World';

const W = BALANCE.farm.maxWidth;
const H = BALANCE.farm.maxHeight;
/** 지나갈 수 있는 장식 */
const WALKABLE = new Set(['stonepath']);

export interface PlaceCheck {
  ok: boolean;
  reason?: string;
}

export class FarmGridSystem {
  private occ = new Map<string, string>();
  constructor(private w: World) {
    this.rebuild();
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < W && y < H;
  }

  isOwned(x: number, y: number): boolean {
    return this.inBounds(x, y) && this.w.state.land.owned[y * W + x] === 1;
  }

  ownedCount(): number {
    return this.w.state.land.owned.reduce((s, v) => s + v, 0);
  }

  rebuild(): void {
    this.occ.clear();
    for (const b of Object.values(this.w.state.buildings)) {
      const { w, h } = footprint(b.type, b.rot);
      for (let y = b.y; y < b.y + h; y++) for (let x = b.x; x < b.x + w; x++) this.occ.set(tileKey(x, y), b.uid);
    }
  }

  buildingAt(x: number, y: number): BuildingInstance | null {
    const uid = this.occ.get(tileKey(x, y));
    return uid ? this.w.state.buildings[uid] ?? null : null;
  }

  /** 플레이어 이동 충돌 */
  isBlocked(x: number, y: number): boolean {
    if (!this.inBounds(x, y)) return true;
    const b = this.buildingAt(x, y);
    return !!b && !WALKABLE.has(b.type);
  }

  canPlace(type: string, x: number, y: number, rot: 0 | 1, ignore: Set<string> = new Set()): PlaceCheck {
    const { w, h } = footprint(type, rot);
    for (let ty = y; ty < y + h; ty++)
      for (let tx = x; tx < x + w; tx++) {
        if (!this.inBounds(tx, ty)) return { ok: false, reason: '농장 범위를 벗어났습니다' };
        if (!this.isOwned(tx, ty)) return { ok: false, reason: '소유한 토지에만 설치할 수 있습니다' };
        const occ = this.occ.get(tileKey(tx, ty));
        if (occ && !ignore.has(occ)) return { ok: false, reason: '다른 시설과 겹칩니다' };
        const plot = this.w.state.plots[tileKey(tx, ty)];
        if (plot && plot.cropId) return { ok: false, reason: '작물이 자라는 밭 위에는 설치할 수 없습니다' };
      }
    return { ok: true };
  }

  /** 빈 농지 제거 (건물 설치 시) */
  private clearEmptyPlots(type: string, x: number, y: number, rot: 0 | 1): void {
    const { w, h } = footprint(type, rot);
    const keys: string[] = [];
    for (let ty = y; ty < y + h; ty++)
      for (let tx = x; tx < x + w; tx++) {
        const k = tileKey(tx, ty);
        if (this.w.state.plots[k]) {
          delete this.w.state.plots[k];
          keys.push(k);
        }
      }
    if (keys.length) this.w.events.emit('plots', { keys });
  }

  /**
   * 설치. 비용 지불은 호출 측(useStock 여부)에 따라 처리.
   */
  place(type: string, x: number, y: number, rot: 0 | 1, opts: { free?: boolean } = {}): { ok: boolean; reason?: string; uid?: string } {
    const d = BUILDING_BY_ID[type];
    if (!d) return { ok: false, reason: '알 수 없는 시설' };
    if (rot === 1 && !d.rotatable) rot = 0;
    const check = this.canPlace(type, x, y, rot);
    if (!check.ok) return check;
    const fromStock = (this.w.state.buildStock[type] ?? 0) > 0;
    if (!opts.free && !fromStock) {
      if (d.unlockSkill && !this.w.skills.has(d.unlockSkill)) return { ok: false, reason: '연구가 필요합니다' };
      if (this.w.state.gold < d.price) return { ok: false, reason: '골드가 부족합니다' };
      if (!this.w.inventory.hasMats(d.materials)) return { ok: false, reason: '건설 재료가 부족합니다' };
    }
    if (type === 'house' && Object.values(this.w.state.buildings).some((b) => b.type === 'house')) return { ok: false, reason: '집은 하나만 지을 수 있습니다' };
    if (!opts.free) {
      if (fromStock) this.w.state.buildStock[type]--;
      else {
        this.w.spend(d.price, `건설:${d.name}`);
        this.w.inventory.consumeMats(d.materials);
      }
    }
    this.clearEmptyPlots(type, x, y, rot);
    const uid = this.w.uid('b');
    const inst: BuildingInstance = { uid, type, x, y, rot };
    if (d.storage) inst.containerId = this.w.inventory.create(d.storage.kind, d.storage.slots, d.storage.decayMul);
    if (d.category === 'animal') {
      inst.animalIds = [];
      inst.upgrades = { autoFeed: 0, autoClean: 0, autoCollect: 0, capacity: 0 };
      inst.dirt = 0;
      inst.outputId = this.w.inventory.create('output', 24, 1);
    }
    if (d.station) {
      inst.queue = [];
      inst.outputId = this.w.inventory.create('output', 12, 1);
      inst.autoInput = false;
      inst.autoRecipe = null;
    }
    if (type === 'greenhouse') this.w.crops.createGreenhousePlots(uid, 9);
    if (type === 'butcher') inst.outputId = inst.outputId ?? this.w.inventory.create('output', 12, 1);
    this.w.state.buildings[uid] = inst;
    if (!this.w.state.codex.buildings.includes(type)) this.w.state.codex.buildings.push(type);
    this.w.finance.today().builds.push(d.name);
    this.rebuild();
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('sfx', { key: 'build' });
    this.w.events.emit('majorChange', { reason: 'build' });
    if (type === 'house') this.w.tutorial.signal('housePlaced');
    if (type === 'chest') this.w.tutorial.signal('chestPlaced');
    return { ok: true, uid };
  }

  move(uid: string, x: number, y: number, rot: 0 | 1): PlaceCheck {
    const b = this.w.state.buildings[uid];
    if (!b) return { ok: false, reason: '없는 시설' };
    const d = BUILDING_BY_ID[b.type];
    if (rot === 1 && !d.rotatable) rot = 0;
    const check = this.canPlace(b.type, x, y, rot, new Set([uid]));
    if (!check.ok) return check;
    this.clearEmptyPlots(b.type, x, y, rot);
    b.x = x;
    b.y = y;
    b.rot = rot;
    this.rebuild();
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('majorChange', { reason: 'move' });
    return { ok: true };
  }

  /** 여러 시설 동시 이동 (상대 이동) */
  moveMany(uids: string[], dx: number, dy: number): PlaceCheck {
    const ignore = new Set(uids);
    for (const uid of uids) {
      const b = this.w.state.buildings[uid];
      if (!b) continue;
      const c = this.canPlace(b.type, b.x + dx, b.y + dy, b.rot, ignore);
      if (!c.ok) return c;
    }
    for (const uid of uids) {
      const b = this.w.state.buildings[uid];
      if (!b) continue;
      this.clearEmptyPlots(b.type, b.x + dx, b.y + dy, b.rot);
      b.x += dx;
      b.y += dy;
    }
    this.rebuild();
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('majorChange', { reason: 'move' });
    return { ok: true };
  }

  remove(uid: string): PlaceCheck {
    const b = this.w.state.buildings[uid];
    if (!b) return { ok: false, reason: '없는 시설' };
    const d = BUILDING_BY_ID[b.type];
    if (b.type === 'house') return { ok: false, reason: '집은 철거할 수 없습니다 (이동은 가능)' };
    if (b.animalIds && b.animalIds.length) return { ok: false, reason: '동물을 먼저 다른 축사로 옮기거나 판매하세요' };
    if (b.queue && b.queue.length) return { ok: false, reason: '진행 중인 가공이 있습니다' };
    if (b.type === 'greenhouse' && this.w.crops.greenhousePlots(uid).some((p) => p.cropId)) return { ok: false, reason: '온실 안에 작물이 있습니다' };
    // 보관품 이전
    for (const cid of [b.containerId, b.outputId]) {
      if (!cid) continue;
      const c = this.w.state.containers[cid];
      const total = c.slots.reduce((s, x) => s + (x?.qty ?? 0), 0);
      if (total === 0) continue;
      // 다른 컨테이너로 이동 시도
      const others = ['bag', ...this.w.inventory.storageIds().filter((id) => id !== cid)];
      const backup = JSON.stringify(this.w.state.containers);
      for (const o of others) this.w.inventory.moveAll(cid, o);
      if (c.slots.some(Boolean)) {
        this.w.state.containers = JSON.parse(backup);
        return { ok: false, reason: '보관품을 옮길 공간이 부족합니다' };
      }
    }
    if (b.containerId) delete this.w.state.containers[b.containerId];
    if (b.outputId) delete this.w.state.containers[b.outputId];
    if (b.type === 'greenhouse') this.w.crops.removeGreenhousePlots(uid);
    delete this.w.state.buildings[uid];
    if (d.hidden || d.category === 'decoration') this.w.state.buildStock[b.type] = (this.w.state.buildStock[b.type] ?? 0) + 1;
    else this.w.earn(Math.floor(d.price * BALANCE.economy.buildingRefund), '철거 환불', false);
    this.rebuild();
    this.w.events.emit('buildings', undefined);
    this.w.events.emit('majorChange', { reason: 'remove' });
    return { ok: true };
  }

  house(): BuildingInstance | null {
    return Object.values(this.w.state.buildings).find((b) => b.type === 'house') ?? null;
  }

  beauty(): number {
    let s = 0;
    for (const b of Object.values(this.w.state.buildings)) s += BUILDING_BY_ID[b.type].beauty;
    return s;
  }

  buildingsOf(pred: (b: BuildingInstance) => boolean): BuildingInstance[] {
    return Object.values(this.w.state.buildings).filter(pred);
  }

  /** 소유 토지 중 비어있는 타일 (건물/작물 없음) */
  isFreeTile(x: number, y: number): boolean {
    return this.isOwned(x, y) && !this.buildingAt(x, y);
  }

  /** 건물 중심 (타일 단위) */
  center(b: BuildingInstance): { x: number; y: number } {
    const { w, h } = footprint(b.type, b.rot);
    return { x: b.x + w / 2, y: b.y + h / 2 };
  }
}
