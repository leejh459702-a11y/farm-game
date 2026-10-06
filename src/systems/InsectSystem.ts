/**
 * InsectSystem — 곤충 정원. 매일 아침 꽃(꽃밭·화분·꽃 작물·꽃 핀 과수) 근처에 곤충이 찾아온다.
 * 탭하면 도감 등록 (첫 포획 보상). 수분 곤충 근처 작물은 수확량 +5%.
 */
import { INSECTS, INSECT_BY_ID, INSECT_WEIGHT, type InsectData } from '../data/insects';
import { CROP_BY_ID } from '../data/crops';
import type { World } from '../core/World';
import { calendar, isNight } from './SeasonSystem';

export interface InsectSpawn {
  id: string;
  insect: string;
  x: number;
  y: number;
  caught: boolean;
}

export class InsectSystem {
  constructor(private w: World) {}

  get st() {
    return (this.w.state.insects ??= { day: -1, today: [], caught: {} });
  }

  /** 꽃 타일 목록 */
  flowers(): { x: number; y: number }[] {
    const out: { x: number; y: number }[] = [];
    const season = calendar(this.w.state.time.day).season;
    for (const b of Object.values(this.w.state.buildings)) if (b.type === 'flowerbed' || b.type === 'flowerpot' || b.type === 'cherrytree') out.push({ x: b.x, y: b.y });
    for (const p of this.w.crops.outdoorPlots()) {
      const c = p.cropId ? CROP_BY_ID[p.cropId] : null;
      if (!c) continue;
      if (c.art.kind === 'flower' && p.growthProgressDays >= 2) out.push({ x: p.x, y: p.y });
      else if (c.fruitTree && c.season.includes(season) && p.growthProgressDays >= c.growDays - c.regrowDays) out.push({ x: p.x, y: p.y });
    }
    return out;
  }

  /** 아침마다 오늘의 곤충 생성 */
  morning(): void {
    const st = this.st;
    const day = this.w.state.time.day;
    if (st.day === day) return;
    st.day = day;
    st.today = [];
    const r = () => this.w.rand();
    const season = calendar(day).season;
    const flowers = this.flowers();
    const owned: { x: number; y: number }[] = [];
    for (let y = 0; y < 30; y++) for (let x = 0; x < 30; x++) if (this.w.grid.isOwned(x, y) && !this.w.grid.buildingAt(x, y)) owned.push({ x, y });
    if (!owned.length) return;
    const pool = INSECTS.filter((i) => i.season.includes(season) && (!i.flower || flowers.length > 0) && (!i.minFlowers || flowers.length >= i.minFlowers));
    if (!pool.length) return;
    const count = Math.min(9, 1 + Math.floor(flowers.length * 0.8) + (r() < 0.5 ? 1 : 0));
    for (let i = 0; i < count; i++) {
      const ins = this.pick(pool);
      const base = ins.flower && flowers.length ? flowers[Math.floor(r() * flowers.length)] : owned[Math.floor(r() * owned.length)];
      const x = Math.max(0, Math.min(29, base.x + Math.floor(r() * 3) - 1));
      const y = Math.max(0, Math.min(29, base.y + Math.floor(r() * 3) - 1));
      st.today.push({ id: this.w.uid('i'), insect: ins.id, x, y, caught: false });
    }
    this.w.events.emit('insects', undefined);
  }

  private pick(pool: InsectData[]): InsectData {
    let x = this.w.rand() * pool.reduce((s, i) => s + INSECT_WEIGHT[i.rarity], 0);
    for (const i of pool) if ((x -= INSECT_WEIGHT[i.rarity]) < 0) return i;
    return pool[0];
  }

  /** 지금 시간대에 보이는 곤충 */
  visible(): InsectSpawn[] {
    const s = this.w.state;
    const night = isNight(calendar(s.time.day).season, s.time.elapsed);
    return this.st.today.filter((i) => !i.caught && (INSECT_BY_ID[i.insect].time === 'night') === night);
  }

  catch(spawnId: string): { ok: boolean; first?: boolean; name?: string } {
    const sp = this.st.today.find((i) => i.id === spawnId && !i.caught);
    if (!sp) return { ok: false };
    sp.caught = true;
    const d = INSECT_BY_ID[sp.insect];
    const first = !this.st.caught[d.id];
    this.st.caught[d.id] = (this.st.caught[d.id] ?? 0) + 1;
    this.w.life.addXp('foraging', 3);
    this.w.count('insect');
    if (first) {
      const reward = d.rarity === 'epic' ? 1000 : d.rarity === 'rare' ? 300 : 100;
      this.w.earn(reward, '곤충 도감', false);
      this.w.notify({ key: `bug_${d.id}`, text: `곤충 도감에 ${d.name}을(를) 등록했어요! (+${reward}G)`, icon: `bug_${d.id}`, tone: 'good' });
    } else this.w.notify({ key: 'bug_again', text: `${d.name}을(를) 관찰했어요 (${this.st.caught[d.id]}번째)`, icon: `bug_${d.id}` });
    this.w.events.emit('insects', undefined);
    this.w.events.emit('sfx', { key: 'pet' });
    return { ok: true, first, name: d.name };
  }

  /** 수분 곤충이 (x,y) 3칸 안에 있는가 — 잡았어도 오늘은 근처를 날아다닌 것으로 친다 */
  pollinatorNear(x: number, y: number): boolean {
    return this.st.day === this.w.state.time.day && this.st.today.some((i) => INSECT_BY_ID[i.insect].pollinator && Math.abs(i.x - x) <= 3 && Math.abs(i.y - y) <= 3);
  }
}
