/** 건물 이미지 + 상태 말풍선 + 방문상인 + 야간 조명 위치 */
import Phaser from 'phaser';
import { BUILDING_BY_ID, footprint } from '../../data/buildings';
import type { World } from '../../core/World';
import { DEPTH, TS } from './constants';

export interface LightSpot {
  x: number;
  y: number;
  r: number;
}

export class BuildingRenderer {
  private images = new Map<string, Phaser.GameObjects.Image>();
  private bubbles = new Map<string, Phaser.GameObjects.Container>();
  private merchantObjs: Phaser.GameObjects.GameObject[] = [];
  merchantTile: { x: number; y: number } | null = null;
  lights: LightSpot[] = [];

  constructor(
    private scene: Phaser.Scene,
    private w: World,
  ) {}

  textureFor(type: string, rot: 0 | 1): string {
    if (type === 'house') return `bld_house_${this.w.state.house.level}`;
    const d = BUILDING_BY_ID[type];
    return rot === 1 && d.rotatable ? `${d.spriteKey}_r` : d.spriteKey;
  }

  syncAll(): void {
    const seen = new Set<string>();
    this.lights = [];
    for (const b of Object.values(this.w.state.buildings)) {
      seen.add(b.uid);
      let img = this.images.get(b.uid);
      if (!img) {
        img = this.scene.add.image(0, 0, 'px');
        this.images.set(b.uid, img);
      }
      const { w, h } = footprint(b.type, b.rot);
      img.setTexture(this.textureFor(b.type, b.rot));
      img.setOrigin(0, 1);
      img.setPosition(b.x * TS, (b.y + h) * TS);
      img.setDepth(DEPTH.objects + (b.y + h) * TS - 1);
      img.clearTint();
      img.setAlpha(1);
      const d = BUILDING_BY_ID[b.type];
      if (d.light) {
        if (b.type === 'house') this.lights.push({ x: (b.x + w / 2) * TS, y: (b.y + h) * TS - 14, r: 1.6 }, { x: b.x * TS + 13, y: (b.y + h) * TS - 22, r: 0.8 }, { x: (b.x + w) * TS - 13, y: (b.y + h) * TS - 22, r: 0.8 });
        else this.lights.push({ x: (b.x + 0.5) * TS, y: (b.y + 1) * TS - 36, r: 1.4 });
      } else if (d.station || d.category === 'animal') {
        this.lights.push({ x: (b.x + w / 2) * TS, y: (b.y + h) * TS - 10, r: 0.7 });
      }
    }
    for (const [uid, img] of this.images) {
      if (!seen.has(uid)) {
        img.destroy();
        this.images.delete(uid);
      }
    }
    this.syncBubbles();
    this.syncMerchant();
  }

  /** 수거 가능/완료 말풍선 */
  syncBubbles(): void {
    const want = new Map<string, string>();
    for (const b of Object.values(this.w.state.buildings)) {
      const d = BUILDING_BY_ID[b.type];
      if (d.category === 'animal') {
        const pending = this.w.animals.pendingOutput(b);
        if (pending > 0) {
          const first = this.w.state.containers[b.outputId!]?.slots.find(Boolean);
          want.set(b.uid, first ? `it_${first.itemId}` : 'ic_star');
        } else if (this.w.animals.animalsIn(b).some((a) => !a.fedToday && !a.shipping) && (b.upgrades?.autoFeed ?? 0) === 0) want.set(b.uid, 'it_hay');
      } else if (d.station) {
        if (this.w.processing.readyCount(b) > 0) {
          const first = this.w.state.containers[b.outputId!]?.slots.find(Boolean);
          want.set(b.uid, first ? `it_${first.itemId}` : 'ic_star');
        }
      }
    }
    for (const [uid, c] of this.bubbles) {
      if (want.get(uid) !== c.getData('icon')) {
        c.destroy();
        this.bubbles.delete(uid);
      }
    }
    for (const [uid, icon] of want) {
      if (this.bubbles.has(uid)) continue;
      const b = this.w.state.buildings[uid];
      const { w, h } = footprint(b.type, b.rot);
      const tex = this.scene.textures.get(this.textureFor(b.type, b.rot));
      const topY = (b.y + h) * TS - tex.getSourceImage().height;
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xfffaf0, 1).fillRoundedRect(-11, -11, 22, 22, 6).lineStyle(2, 0x3b2a22, 1).strokeRoundedRect(-11, -11, 22, 22, 6);
      bg.fillStyle(0xfffaf0, 1).fillTriangle(-4, 10, 4, 10, 0, 15);
      const ic = this.scene.add.image(0, 0, icon);
      const cont = this.scene.add.container((b.x + w / 2) * TS, topY + 4, [bg, ic]).setDepth(DEPTH.ui - 10);
      cont.setData('icon', icon);
      this.scene.tweens.add({ targets: cont, y: cont.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.bubbles.set(uid, cont);
    }
  }

  /** 상인 위치: 집 앞 → 가까운 빈 소유지 → 소유지 바깥 인접 칸 */
  private findMerchantTile(): { x: number; y: number } {
    const g = this.w.grid;
    const house = g.house();
    const origin = house ? { x: house.x + 2, y: house.y + 2 } : { x: 15, y: 15 };
    let best: { x: number; y: number; d: number } | null = null;
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) {
        if (x + 1 >= 30 || g.buildingAt(x, y) || g.buildingAt(x + 1, y)) continue;
        if (this.w.crops.plotAt(x, y) || this.w.crops.plotAt(x + 1, y)) continue;
        if (g.isOwned(x + 1, y)) continue;
        const owned = g.isOwned(x, y);
        // 소유지 밖이지만 붙어있는 칸 우선 (농장 공간을 덜 차지)
        const adj = !owned && (g.isOwned(x + 1, y) || g.isOwned(x - 1, y) || g.isOwned(x, y + 1) || g.isOwned(x, y - 1));
        if (!adj) continue;
        const d = Math.abs(x - origin.x) + Math.abs(y - origin.y);
        if (!best || d < best.d) best = { x, y, d };
      }
    return best ?? { x: origin.x, y: Math.min(29, origin.y + 1) };
  }

  syncMerchant(): void {
    for (const o of this.merchantObjs) o.destroy();
    this.merchantObjs = [];
    this.merchantTile = null;
    if (!this.w.state.merchant.present) return;
    const t = this.findMerchantTile();
    this.merchantTile = t;
    const special = this.w.state.merchant.special;
    // 수레는 t.x ~ t.x+1 두 칸 안에, 상인은 수레 앞(아래)에 선다
    const cart = this.scene.add.image(t.x * TS + 4, (t.y + 1) * TS - 2, special ? 'cart_special' : 'cart').setOrigin(0, 1);
    cart.setDepth(DEPTH.objects + (t.y + 1) * TS - 2);
    const m = this.scene.add.sprite(t.x * TS + 46, (t.y + 1) * TS + 10, special ? 'merchant_special' : 'merchant', 0).setOrigin(0.5, 1);
    m.setDepth(DEPTH.objects + (t.y + 1) * TS + 10);
    this.scene.tweens.add({ targets: m, y: m.y - 2, duration: 600, yoyo: true, repeat: -1 });
    this.merchantObjs.push(cart, m);
  }

  /** 상인 클릭 판정 */
  hitMerchant(wx: number, wy: number): boolean {
    const t = this.merchantTile;
    if (!t) return false;
    return wx >= t.x * TS && wx <= (t.x + 2) * TS + 4 && wy >= t.y * TS - 24 && wy <= (t.y + 1) * TS + 12;
  }

  /** 건설 모드 시 강조 */
  highlight(uids: Set<string>, ghostUids: Set<string>): void {
    for (const [uid, img] of this.images) {
      if (ghostUids.has(uid)) img.setAlpha(0.35);
      else img.setAlpha(1);
      if (uids.has(uid)) img.setTint(0xb8f0a0);
      else img.clearTint();
    }
  }

  /** 동물 축사 앞 배회 영역 */
  penTiles(uid: string): { x: number; y: number }[] {
    const b = this.w.state.buildings[uid];
    if (!b) return [];
    const { w, h } = footprint(b.type, b.rot);
    const out: { x: number; y: number }[] = [];
    for (let y = b.y + h; y <= b.y + h + 1; y++)
      for (let x = b.x - 1; x <= b.x + w; x++) if (this.w.grid.isOwned(x, y) && !this.w.grid.isBlocked(x, y) && !this.w.crops.plotAt(x, y)) out.push({ x, y });
    return out;
  }
}
