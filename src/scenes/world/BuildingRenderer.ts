/** 건물 이미지 + 상태 말풍선 + 방문상인 + 야간 조명 위치 */
import Phaser from 'phaser';
import { Art } from '../../assets/AssetRegistry';
import { BUILDING_BY_ID, footprint } from '../../data/buildings';
import type { World } from '../../core/World';
import { WALKABLE } from '../../systems/FarmGridSystem';
import { DEPTH, FH, TS } from './constants';

export interface LightSpot {
  x: number;
  y: number;
  r: number;
}

/** 마을 길(x 14~15) 바로 오른쪽, 농장 경계 밖 첫 줄 */
export const MERCHANT_SPOT = { x: 16, y: FH };

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
      const key = this.textureFor(b.type, b.rot);
      img.setTexture(key);
      img.setScale(Art.scale(key));
      img.setOrigin(0, 1);
      img.setPosition(b.x * TS, (b.y + h) * TS);
      // 밟고 지나가는 바닥 장식은 캐릭터·물체 아래
      img.setDepth(WALKABLE.has(b.type) ? DEPTH.cursor - 0.5 : DEPTH.objects + (b.y + h) * TS - 1);
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
      } else if (b.type === 'fishpond' && b.pond) {
        const first = this.w.state.containers[b.outputId!]?.slots.find(Boolean);
        if (first) want.set(b.uid, `it_${first.itemId}`);
        else if (b.pond.count > 0 && !b.pond.fedToday && !b.upgrades?.autoFeed) want.set(b.uid, 'it_fish_feed');
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
      const topY = (b.y + h) * TS - tex.getSourceImage().height * Art.scale(this.textureFor(b.type, b.rot));
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xfffaf0, 1).fillRoundedRect(-11, -11, 22, 22, 6).lineStyle(2, 0x3b2a22, 1).strokeRoundedRect(-11, -11, 22, 22, 6);
      bg.fillStyle(0xfffaf0, 1).fillTriangle(-4, 10, 4, 10, 0, 15);
      const ic = this.scene.add.image(0, 0, icon).setScale(Art.scale(icon));
      const cont = this.scene.add.container((b.x + w / 2) * TS, topY + 4, [bg, ic]).setDepth(DEPTH.ui - 10);
      cont.setData('icon', icon);
      this.scene.tweens.add({ targets: cont, y: cont.y - 4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.bubbles.set(uid, cont);
    }
  }

  /** 상인 위치: 농장 아래 마을 길 입구 오른쪽 공터 (밭·시설을 가리지 않음) */
  private findMerchantTile(): { x: number; y: number } {
    return { ...MERCHANT_SPOT };
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
    const cartKey = special ? 'cart_special' : 'cart';
    const cart = this.scene.add.image(t.x * TS + 4, (t.y + 1) * TS - 2, cartKey).setOrigin(0, 1).setScale(Art.scale(cartKey));
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
