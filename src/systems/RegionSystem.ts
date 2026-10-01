/**
 * RegionSystem — 농장 외곽 탐험 지역 (강가 · 숲 · 바위 언덕).
 * 작은 고정 지도 + 매일 아침 정해진 양만 생성되는 자원 노드.
 * 같은 날 여러 번 호출해도 생성은 하루 1회 (lastGen).
 */
import { BALANCE } from '../data/balance';
import { CHEST_LOOT, FORAGE, FORAGE_TABLE, REGION_BY_ID, ROCKS, ROCK_BY_ID } from '../data/gathering';
import { BUILDING_BY_ID } from '../data/buildings';
import { ITEM_BY_ID } from '../data/items';
import type { RegionId, RegionNode, RegionState } from '../types/game';
import { pickWeighted, randInt } from '../utils/rng';
import { calendar } from './SeasonSystem';
import type { World } from '../core/World';

export const REGION_W = 26;
export const REGION_H = 15;
/** 입구 (지역 왼쪽 끝 길) */
export const REGION_ENTRY = { x: 1, y: 7 };

/** G 풀 · F 숲바닥 · T 나무벽 · W 물 · S 모래 · R 바위땅 · C 절벽 · P 길 */
export type Terrain = 'G' | 'F' | 'T' | 'W' | 'S' | 'R' | 'C' | 'P';
const BLOCKED: Record<Terrain, boolean> = { G: false, F: false, T: true, W: true, S: false, R: false, C: true, P: false };

function h(x: number, y: number, s: number): number {
  let v = (x * 374761393 + y * 668265263 + s * 2246822519) ^ 0x5bd1e995;
  v = Math.imul(v ^ (v >>> 13), 1274126177);
  return ((v ^ (v >>> 16)) >>> 0) / 4294967296;
}

const layoutCache: Partial<Record<RegionId, Terrain[][]>> = {};

/** 결정적 지형 생성 */
export function regionLayout(id: RegionId): Terrain[][] {
  const cached = layoutCache[id];
  if (cached) return cached;
  const g: Terrain[][] = [];
  for (let y = 0; y < REGION_H; y++) {
    const row: Terrain[] = [];
    for (let x = 0; x < REGION_W; x++) {
      const edge = x === 0 || y === 0 || x === REGION_W - 1 || y === REGION_H - 1;
      let t: Terrain;
      if (id === 'river') {
        // 북쪽 풀밭, 중앙 모래톱, 남쪽 강물
        const shore = 8 + Math.round(Math.sin(x / 3.2) * 1.2);
        if (y >= shore + 1 && y < REGION_H - 1) t = 'W';
        else if (y === shore) t = 'S';
        else t = 'G';
        if (y === REGION_H - 1) t = 'W';
        if (edge && t !== 'W') t = 'T';
      } else if (id === 'forest') {
        t = edge || h(x, y, 7) < 0.05 ? 'T' : 'F';
        if (y <= 1 || y >= REGION_H - 2 || x >= REGION_W - 2) t = h(x, y, 3) < 0.7 ? 'T' : 'F';
        if (edge) t = 'T';
      } else {
        t = edge ? 'C' : h(x, y, 11) < 0.04 ? 'C' : 'R';
        if (y === 1 && h(x, y, 5) < 0.6) t = 'C';
      }
      row.push(t);
    }
    g.push(row);
  }
  // 입구 길 (왼쪽 가장자리)
  for (let x = 0; x <= 4; x++) {
    g[REGION_ENTRY.y][x] = 'P';
    if (g[REGION_ENTRY.y - 1][x] === 'T' || g[REGION_ENTRY.y - 1][x] === 'C') g[REGION_ENTRY.y - 1][x] = id === 'hill' ? 'R' : id === 'forest' ? 'F' : 'G';
  }
  layoutCache[id] = g;
  return g;
}

export function terrainAt(id: RegionId, x: number, y: number): Terrain {
  if (x < 0 || y < 0 || x >= REGION_W || y >= REGION_H) return id === 'hill' ? 'C' : 'T';
  return regionLayout(id)[y][x];
}

/** 나무/바위 고정 자리 */
function fixedSlots(id: RegionId): { x: number; y: number; big: boolean }[] {
  const out: { x: number; y: number; big: boolean }[] = [];
  const target = id === 'forest' ? 14 : id === 'hill' ? 16 : 0;
  let s = 0;
  while (out.length < target && s < 2000) {
    s++;
    const x = 3 + Math.floor(h(s, 1, id.length) * (REGION_W - 6));
    const y = 2 + Math.floor(h(s, 2, id.length) * (REGION_H - 4));
    if (terrainAt(id, x, y) === 'T' || terrainAt(id, x, y) === 'C' || terrainAt(id, x, y) === 'P') continue;
    if (Math.abs(x - REGION_ENTRY.x) + Math.abs(y - REGION_ENTRY.y) < 4) continue;
    if (y === REGION_ENTRY.y) continue;
    if (out.some((o) => Math.abs(o.x - x) <= 1 && Math.abs(o.y - y) <= 1)) continue;
    out.push({ x, y, big: h(s, 3, 9) < 0.35 });
  }
  return out;
}

export interface InteractResult {
  ok: boolean;
  reason?: string;
  drops: { itemId: string; qty: number }[];
  depleted: boolean;
  hpLeft: number;
  /** 상자에서 장식 */
  deco?: string;
}

export class RegionSystem {
  constructor(private w: World) {}

  state(id: RegionId): RegionState {
    const r = (this.w.state.regions ??= { river: { nodes: [], lastGen: -1 }, forest: { nodes: [], lastGen: -1 }, hill: { nodes: [], lastGen: -1 } });
    return (r[id] ??= { nodes: [], lastGen: -1 });
  }

  /** 아침마다 (또는 지역 진입 시) 하루 1회만 생성 */
  morning(): void {
    for (const id of ['river', 'forest', 'hill'] as RegionId[]) this.ensureDay(id);
  }

  ensureDay(id: RegionId): void {
    const st = this.state(id);
    const day = this.w.state.time.day;
    if (st.lastGen >= day) return;
    this.generate(id, day);
  }

  activeNodes(id: RegionId): RegionNode[] {
    return this.state(id).nodes.filter((n) => n.respawnDay === null);
  }

  nodeAt(id: RegionId, x: number, y: number, includeDepleted = false): RegionNode | undefined {
    return this.state(id).nodes.find((n) => n.x === x && n.y === y && (includeDepleted || n.respawnDay === null));
  }

  isBlocked(id: RegionId, x: number, y: number): boolean {
    if (BLOCKED[terrainAt(id, x, y)]) return true;
    const n = this.nodeAt(id, x, y);
    return !!n && n.kind !== 'forage';
  }

  forageCount(id: RegionId): number {
    return this.state(id).nodes.filter((n) => n.kind === 'forage').length;
  }

  private uid(): string {
    return this.w.uid('n');
  }

  private rollRock(): string {
    const weights: Record<string, number> = {};
    for (const r of ROCKS) weights[r.id] = r.weight;
    return pickWeighted(() => this.w.rand(), weights);
  }

  generate(id: RegionId, day: number): void {
    const st = this.state(id);
    const r = () => this.w.rand();
    const season = calendar(day).season;
    // 1) 고정 노드 최초 생성 / 재생
    if (id !== 'river' && !st.nodes.some((n) => n.kind === 'tree' || n.kind === 'rock')) {
      for (const s of fixedSlots(id)) {
        if (id === 'forest') {
          const hp = s.big ? 6 : 3;
          st.nodes.push({ id: this.uid(), kind: 'tree', x: s.x, y: s.y, hp, maxHp: hp, big: s.big, respawnDay: null });
        } else {
          const kind = this.rollRock();
          const hp = ROCK_BY_ID[kind].hp;
          st.nodes.push({ id: this.uid(), kind: 'rock', x: s.x, y: s.y, itemId: kind, hp, maxHp: hp, respawnDay: null });
        }
      }
    }
    for (const n of st.nodes) {
      if (n.respawnDay !== null && n.respawnDay <= day) {
        n.respawnDay = null;
        if (n.kind === 'rock') {
          n.itemId = this.rollRock();
          n.maxHp = ROCK_BY_ID[n.itemId].hp;
        }
        n.hp = n.maxHp;
      }
    }
    // 2) 채집 포인트: 매일 아침 새로 (전날 남은 것은 사라짐)
    st.nodes = st.nodes.filter((n) => n.kind !== 'forage' && n.kind !== 'chest');
    const range = REGION_BY_ID[id].forage;
    const count = range[1] > 0 ? randInt(r, range[0], range[1]) : 0;
    if (count > 0) {
      const table = { ...FORAGE_TABLE[id as 'forest' | 'river'][season] };
      for (const f of FORAGE) {
        if (!f.rare || !(f.id in table)) continue;
        if (!this.w.life.rareForage()) delete table[f.id];
        else if (this.w.life.level('foraging') >= 8) table[f.id] *= 2;
      }
      const cands = this.forageCandidates(id).filter((c) => !st.nodes.some((n) => n.x === c.x && n.y === c.y));
      for (let i = 0; i < count && cands.length; i++) {
        const c = cands.splice(Math.floor(r() * cands.length), 1)[0];
        st.nodes.push({ id: this.uid(), kind: 'forage', x: c.x, y: c.y, itemId: pickWeighted<string>(r, table), hp: 1, maxHp: 1, respawnDay: null });
      }
    }
    // 3) 작은 랜덤 이벤트: 오래된 상자 / 떠내려온 상자 / 희귀 광맥
    const chestChance = BALANCE.regions.chestChance * (this.w.life.level('foraging') >= 9 ? 1.6 : 1);
    if (r() < chestChance) {
      const cands = this.forageCandidates(id).filter((c) => !st.nodes.some((n) => n.x === c.x && n.y === c.y));
      if (id === 'hill') {
        const rock = st.nodes.find((n) => n.kind === 'rock' && n.respawnDay === null);
        if (rock) {
          rock.itemId = r() < 0.5 ? 'rock_gold' : 'rock_silver';
          rock.maxHp = rock.hp = ROCK_BY_ID[rock.itemId].hp;
          this.w.notify({ key: 'event_hill', text: '바위 언덕에 희귀 광맥이 드러났다는 소문이 있어요', icon: 'tool_pickaxe', tone: 'good' });
        }
      } else if (cands.length) {
        const c = cands[Math.floor(r() * cands.length)];
        st.nodes.push({ id: this.uid(), kind: 'chest', x: c.x, y: c.y, hp: 1, maxHp: 1, respawnDay: null });
      }
    }
    st.lastGen = day;
  }

  forageCandidates(id: RegionId): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    for (let y = 1; y < REGION_H - 1; y++)
      for (let x = 1; x < REGION_W - 1; x++) {
        const t = terrainAt(id, x, y);
        if (id === 'river' ? t !== 'S' && !(t === 'G' && y >= 5) : t !== 'F' && t !== 'G') continue;
        if (y === REGION_ENTRY.y && x <= 4) continue;
        out.push({ x, y });
      }
    return out;
  }

  /** 물가인가 (낚시 가능) */
  isWater(id: RegionId, x: number, y: number): boolean {
    return terrainAt(id, x, y) === 'W';
  }

  private give(itemId: string, qty: number): number {
    const fresh = (ITEM_BY_ID[itemId]?.decay ?? 0) > 0 ? 100 : undefined;
    let left = this.w.inventory.add('bag', itemId, qty, fresh);
    if (left > 0) left = this.w.inventory.store(itemId, left, fresh, undefined, false);
    return qty - left;
  }

  interact(id: RegionId, nodeId: string): InteractResult {
    const st = this.state(id);
    const n = st.nodes.find((x) => x.id === nodeId && x.respawnDay === null);
    const fail = (reason: string): InteractResult => ({ ok: false, reason, drops: [], depleted: false, hpLeft: n?.hp ?? 0 });
    if (!n) return fail('이미 사라졌어요');
    const day = this.w.state.time.day;
    const r = () => this.w.rand();
    const drops: { itemId: string; qty: number }[] = [];
    const push = (itemId: string, qty: number) => {
      if (qty <= 0) return;
      const got = this.give(itemId, qty);
      if (got > 0) drops.push({ itemId, qty: got });
    };
    if (n.kind === 'forage') {
      if (this.w.inventory.capacityFor('bag', n.itemId!, 100) <= 0 && this.w.inventory.storageIds().every((cid) => this.w.inventory.capacityFor(cid, n.itemId!, 100) <= 0)) return fail('가방이 가득 찼어요');
      let qty = 1;
      if (r() < this.w.life.forageExtraChance()) qty++;
      push(n.itemId!, qty);
      st.nodes = st.nodes.filter((x) => x !== n);
      this.w.life.addXp('foraging', BALANCE.life.xp.forage);
      this.w.codex.recordHarvest(n.itemId!, qty);
      this.w.events.emit('sfx', { key: 'harvest' });
      return { ok: true, drops, depleted: true, hpLeft: 0 };
    }
    if (n.kind === 'chest') {
      const weights: Record<string, number> = {};
      CHEST_LOOT.forEach((l, i) => (weights[String(i)] = l.weight));
      const loot = CHEST_LOOT[Number(pickWeighted(r, weights))];
      const qty = randInt(r, loot.min, loot.max);
      let deco: string | undefined;
      if (loot.kind === 'deco') {
        this.w.state.buildStock[loot.id] = (this.w.state.buildStock[loot.id] ?? 0) + qty;
        deco = loot.id;
        this.w.notify({ key: 'chest_deco', text: `상자에서 장식 [${BUILDING_BY_ID[loot.id].name}]을(를) 찾았어요! (건설 보관함)`, icon: BUILDING_BY_ID[loot.id].spriteKey, tone: 'good' });
      } else push(loot.id, qty);
      st.nodes = st.nodes.filter((x) => x !== n);
      this.w.life.addXp('foraging', BALANCE.life.xp.chest);
      this.w.events.emit('sfx', { key: 'special' });
      return { ok: true, drops, depleted: true, hpLeft: 0, deco };
    }
    const tools = this.w.state.tools;
    if (n.kind === 'rock') {
      const rock = ROCK_BY_ID[n.itemId!];
      if (tools.pickaxe < rock.tier) return fail(`${rock.name}은(는) 더 좋은 곡괭이가 필요해요`);
    }
    const power = 1 + (n.kind === 'tree' ? tools.axe : tools.pickaxe) + this.w.life.gatherSpeedBonus();
    n.hp = Math.max(0, n.hp - power);
    this.w.events.emit('sfx', { key: n.kind === 'tree' ? 'till' : 'build' });
    if (n.hp > 0) return { ok: true, drops, depleted: false, hpLeft: n.hp };
    // 고갈 → 보상 + 재생 예약
    if (n.kind === 'tree') {
      const bonus = tools.axe >= 3 ? 2 : tools.axe >= 2 && n.big ? 1 : 0;
      push('wood', (n.big ? randInt(r, 4, 6) : randInt(r, 2, 3)) + bonus);
      push('branch', randInt(r, 1, 3));
      const sapChance = (n.big ? 0.45 : 0.15) + (this.w.life.level('foraging') >= 7 ? 0.2 : 0);
      if (r() < sapChance) push('sap', 1);
      const [a, b] = BALANCE.regions.bigTreeRegrow;
      n.respawnDay = day + (n.big ? randInt(r, a, b) : BALANCE.regions.smallTreeRegrow);
      this.w.life.addXp('foraging', BALANCE.life.xp.chop * (n.big ? 2 : 1));
    } else {
      const rock = ROCK_BY_ID[n.itemId!];
      for (const d of rock.drops) push(d.id, randInt(r, d.min, d.max) + (tools.pickaxe >= 3 && d.id.endsWith('_ore') ? 1 : 0));
      const [a, b] = BALANCE.regions.rockRegrow;
      n.respawnDay = day + randInt(r, a, b);
      this.w.life.addXp('foraging', BALANCE.life.xp.mine + rock.tier * 2);
    }
    for (const d of drops) this.w.codex.recordHarvest(d.itemId, d.qty);
    return { ok: true, drops, depleted: true, hpLeft: 0 };
  }

  /** 오늘 남은 자원 요약 */
  summary(id: RegionId): string {
    const nodes = this.activeNodes(id);
    if (id === 'river') return `채집 ${nodes.filter((n) => n.kind === 'forage').length}곳 · 낚시`;
    if (id === 'forest') return `나무 ${nodes.filter((n) => n.kind === 'tree').length}그루 · 채집 ${nodes.filter((n) => n.kind === 'forage').length}곳`;
    return `바위 ${nodes.filter((n) => n.kind === 'rock').length}개`;
  }
}
