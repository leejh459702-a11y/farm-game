/**
 * MineSystem — 층 구조 광산. 폐광(1~10층) → 깊은 광산(11층~).
 * 층에 들어갈 때마다 (날짜·층) 기준으로 지형과 광맥이 새로 생성된다 (매일 리셋).
 * 바위를 깨다 보면 사다리가 나오고, 5층마다 승강기가 열린다.
 * 지오드·광물주머니·유물은 여기서 처리한다.
 */
import { MINE, GEODE_LOOT, geodeChances, mineBand } from '../data/mine';
import { ARTIFACT_BY_ID, ARTIFACT_SETS, ARTIFACTS, artifactsFrom, type ArtifactSource } from '../data/artifacts';
import { RARE_SEEDS } from '../data/economy';
import { ITEM_BY_ID } from '../data/items';
import { ROCK_BY_ID } from '../data/gathering';
import type { RegionNode } from '../types/game';
import { pickWeighted, randInt } from '../utils/rng';
import { REGION_ENTRY, REGION_H, REGION_W, setMineVariant, terrainAt } from './RegionSystem';
import type { World } from '../core/World';

type Result = { ok: boolean; reason?: string };
export type Drop = { itemId: string; qty: number };

export class MineSystem {
  constructor(private w: World) {}

  get st() {
    return (this.w.state.mine ??= { floor: 1, deepest: 0, genKey: '', broken: 0, ladder: false });
  }

  get arts() {
    return (this.w.state.artifacts ??= { found: [], setsClaimed: [] });
  }

  unlocked(): boolean {
    return this.w.skills.has('ga_mine');
  }

  deepUnlocked(): boolean {
    return this.w.skills.has('ga_deep') && this.w.state.tools.pickaxe >= MINE.deepPickaxe;
  }

  /** 승강기로 갈 수 있는 층 (1층 + 도달한 5의 배수 층) */
  elevatorFloors(): number[] {
    const out = [1];
    for (let f = MINE.elevatorEvery; f <= this.st.deepest; f += MINE.elevatorEvery) out.push(f);
    return out;
  }

  floorName(floor = this.st.floor): string {
    return `${mineBand(floor).name} ${floor}층`;
  }

  enter(floor: number): Result {
    if (!this.unlocked()) return { ok: false, reason: `채집·채광 연구 [폐광 탐사] (Lv.${MINE.unlockForaging})가 필요해요` };
    if (!this.elevatorFloors().includes(floor)) return { ok: false, reason: '아직 승강기가 열리지 않은 층이에요' };
    this.st.floor = floor;
    this.generate();
    return { ok: true };
  }

  /** 같은 날 같은 층이면 그대로, 아니면 새로 생성 */
  ensureFloor(): void {
    const key = `${this.w.state.time.day}:${this.st.floor}`;
    setMineVariant(this.variant());
    if (this.st.genKey !== key) this.generate();
  }

  private variant(): number {
    return (this.st.floor * 7 + this.w.state.time.day * 3) % 6;
  }

  generate(): void {
    const st = this.st;
    const r = () => this.w.rand();
    setMineVariant(this.variant());
    const nodes: RegionNode[] = [];
    const band = mineBand(st.floor);
    const count = randInt(r, MINE.rocksPerFloor[0], MINE.rocksPerFloor[1]);
    const cands: { x: number; y: number }[] = [];
    for (let y = 2; y < REGION_H - 2; y++)
      for (let x = 3; x < REGION_W - 2; x++) {
        if (terrainAt('mine', x, y) !== 'M') continue;
        if (Math.abs(x - REGION_ENTRY.x) + Math.abs(y - REGION_ENTRY.y) < 4) continue;
        cands.push({ x, y });
      }
    for (let i = 0; i < count && cands.length; i++) {
      const c = cands.splice(Math.floor(r() * cands.length), 1)[0];
      if (nodes.some((n) => Math.abs(n.x - c.x) <= 0 && Math.abs(n.y - c.y) <= 0)) continue;
      const weights = { ...band.rocks };
      if (st.floor >= 16 && this.w.skills.has('ga_m_rare')) for (const k of ['rock_ruby', 'rock_emerald', 'rock_moon', 'rock_star', 'rock_relic']) if (weights[k]) weights[k] *= 2;
      const kind = pickWeighted<string>(r, weights);
      const hp = ROCK_BY_ID[kind].hp + Math.floor(st.floor / 8);
      nodes.push({ id: this.w.uid('m'), kind: 'rock', x: c.x, y: c.y, itemId: kind, hp, maxHp: hp, respawnDay: null });
    }
    this.w.regions.state('mine').nodes = nodes;
    this.w.regions.state('mine').lastGen = this.w.state.time.day;
    st.broken = 0;
    st.ladder = false;
    st.genKey = `${this.w.state.time.day}:${st.floor}`;
    st.deepest = Math.max(st.deepest, st.floor);
    this.w.events.emit('regions', { id: 'mine' });
  }

  /** 바위를 다 깼을 때 (RegionSystem.interact 에서 호출) */
  onRockBroken(n: RegionNode, push: (itemId: string, qty: number) => void): void {
    const st = this.st;
    const r = () => this.w.rand();
    st.broken++;
    // 사다리
    if (!st.ladder && st.floor < MINE.maxFloor && (r() < MINE.ladderChance || st.broken >= MINE.ladderGuarantee)) {
      st.ladder = true;
      this.w.regions.state('mine').nodes.push({ id: this.w.uid('m'), kind: 'ladder', x: n.x, y: n.y, hp: 1, maxHp: 1, respawnDay: null });
      this.w.events.emit('floatText', { x: n.x * 32 + 16, y: n.y * 32, text: '아래로 가는 사다리!', color: '#fff6a0' });
    }
    // 광물주머니 · 지오드
    const geodeMul = (1 + this.w.life.level('foraging') * 0.03) * (this.w.skills.has('ga_geode') ? 1.5 : 1);
    for (const g of geodeChances(st.floor)) if (g.chance > 0 && r() < g.chance * geodeMul) push(g.id, 1);
    // 최상급 광물: 보석 +1
    const gem = ROCK_BY_ID[n.itemId!]?.drops.find((d) => ['amethyst', 'ruby', 'emerald', 'moonstone', 'star_crystal'].includes(d.id));
    if (gem && this.w.skills.has('ga_m_gem')) push(gem.id, 1);
    // 유물
    const relic = n.itemId === 'rock_relic';
    const relicMul = this.w.skills.has('ga_relic') ? 2 : 1;
    if ((relic && r() < 0.35 * relicMul) || (!relic && st.floor >= 11 && r() < 0.015 * relicMul)) this.giveArtifact(this.randomArtifact('mine'));
    this.w.count('mine:rock');
  }

  descend(): Result {
    const st = this.st;
    if (!st.ladder) return { ok: false, reason: '사다리를 먼저 찾아야 해요' };
    if (st.floor >= MINE.maxFloor) return { ok: false, reason: '여기가 가장 깊은 곳이에요' };
    if (st.floor + 1 >= MINE.deepFloor && !this.deepUnlocked()) return { ok: false, reason: '깊은 광산은 연구 [깊은 광산] + 철 곡괭이 이상이 필요해요' };
    st.floor++;
    const newElevator = st.floor % MINE.elevatorEvery === 0 && st.floor > st.deepest;
    this.generate();
    this.w.count('mine:floor');
    this.w.life.addXp('foraging', 3 + Math.floor(st.floor / 3));
    if (newElevator) this.w.notify({ key: 'mine_elevator', text: `광산 ${st.floor}층 승강기가 열렸어요! 다음부터 바로 내려올 수 있어요`, icon: 'ic_mine', tone: 'good' });
    return { ok: true };
  }

  // ───── 지오드 / 광물주머니 ─────
  isOpenable(itemId: string): boolean {
    return !!GEODE_LOOT[itemId];
  }

  open(itemId: string): { ok: boolean; reason?: string; drops: Drop[] } {
    const table = GEODE_LOOT[itemId];
    if (!table) return { ok: false, reason: '열 수 없는 물건이에요', drops: [] };
    if (!this.w.inventory.consume(itemId, 1)) return { ok: false, reason: '가진 것이 없어요', drops: [] };
    const r = () => this.w.rand();
    const weights: Record<string, number> = {};
    table.forEach((e, i) => (weights[String(i)] = e.w));
    const e = table[Number(pickWeighted(r, weights))];
    const drops: Drop[] = [];
    if (e.id === '@artifact') {
      const a = this.randomArtifact(itemId === 'geode' ? 'any' : 'mine');
      this.giveArtifact(a);
      drops.push({ itemId: a, qty: 1 });
    } else {
      const id = e.id === '@rareseed' ? `seed_${RARE_SEEDS[Math.floor(r() * RARE_SEEDS.length)]}` : e.id;
      const qty = randInt(r, e.min, e.max);
      this.give(id, qty);
      drops.push({ itemId: id, qty });
    }
    this.w.count('geode:open');
    this.w.events.emit('sfx', { key: 'special' });
    return { ok: true, drops };
  }

  // ───── 유물 ─────
  randomArtifact(source: ArtifactSource | 'any'): string {
    const list = artifactsFrom(source);
    // 아직 못 찾은 유물이 조금 더 잘 나온다
    const weights: Record<string, number> = {};
    for (const a of list) weights[a.id] = this.arts.found.includes(a.id) ? 1 : 2;
    return pickWeighted<string>(() => this.w.rand(), weights);
  }

  /** 유물 지급: 첫 발견이면 도감 등록 + 보상, 세트 완성 알림 */
  giveArtifact(id: string): void {
    const a = ARTIFACT_BY_ID[id];
    this.give(id, 1);
    if (!this.arts.found.includes(id)) {
      this.arts.found.push(id);
      this.w.earn(a.firstReward, '유물 첫 발견', false);
      this.w.notify({ key: `art_${id}`, text: `유물 발견: ${a.name}! 도감에 등록했어요 (+${a.firstReward}G)`, icon: `it_${id}`, tone: 'good' });
      const set = ARTIFACTS.filter((x) => x.set === a.set);
      if (set.every((x) => this.arts.found.includes(x.id))) this.w.notify({ key: `artset_${a.set}`, text: `유물 세트 '${ARTIFACT_SETS[a.set].name}' 완성! 도감 → 유물에서 보상을 받으세요`, icon: 'ic_star', tone: 'good' });
    } else this.w.notify({ key: `art_dup_${id}`, text: `${a.name}을(를) 또 찾았어요. 특급상인이 비싸게 사 줄 거예요`, icon: `it_${id}` });
    this.w.count('artifact');
  }

  setComplete(set: string): boolean {
    return ARTIFACTS.filter((x) => x.set === set).every((x) => this.arts.found.includes(x.id));
  }

  claimSet(set: string): Result {
    if (!this.setComplete(set)) return { ok: false, reason: '아직 다 모으지 못했어요' };
    if (this.arts.setsClaimed.includes(set)) return { ok: false, reason: '이미 받았어요' };
    const rw = ARTIFACT_SETS[set].reward;
    this.arts.setsClaimed.push(set);
    if (rw.gold) this.w.earn(rw.gold, '유물 세트 보상', false);
    for (const it of rw.items ?? []) this.give(it.id, it.qty);
    if (rw.build) this.w.state.buildStock[rw.build] = (this.w.state.buildStock[rw.build] ?? 0) + 1;
    this.w.events.emit('majorChange', { reason: 'artifactSet' });
    return { ok: true };
  }

  private give(itemId: string, qty: number): void {
    const fresh = (ITEM_BY_ID[itemId]?.decay ?? 0) > 0 ? 100 : undefined;
    let left = this.w.inventory.add('bag', itemId, qty, fresh);
    if (left > 0) left = this.w.inventory.store(itemId, left, fresh, undefined, false);
  }
}
