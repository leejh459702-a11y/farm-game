/**
 * SkillSystem — 농사/목축 레벨(경험치)과 기술 연구.
 * 고급 기술은 상대 분야 레벨을 요구하여 한쪽만 최고로 올릴 수 없게 한다.
 */
import { BALANCE } from '../data/balance';
import { SKILL_BY_ID, SKILLS, type SkillNode, type SkillTree } from '../data/skills';
import type { World } from '../core/World';

/** 레벨 n 에 도달하기 위한 누적 경험치 */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let n = 1; n < level; n++) total += Math.round(BALANCE.skills.xpBase * Math.pow(n, BALANCE.skills.xpExp));
  return total;
}

export function levelFromXp(xp: number): number {
  let lv = 1;
  while (lv < BALANCE.skills.maxLevel && xp >= xpForLevel(lv + 1)) lv++;
  return lv;
}

export class SkillSystem {
  constructor(private w: World) {}

  xp(tree: SkillTree): number {
    return tree === 'farming' ? this.w.state.skills.farmingXp : this.w.state.skills.livestockXp;
  }

  level(tree: SkillTree): number {
    return levelFromXp(this.xp(tree));
  }

  progress(tree: SkillTree): { level: number; cur: number; need: number; ratio: number } {
    const lv = this.level(tree);
    const xp = this.xp(tree);
    if (lv >= BALANCE.skills.maxLevel) return { level: lv, cur: 1, need: 1, ratio: 1 };
    const a = xpForLevel(lv);
    const b = xpForLevel(lv + 1);
    return { level: lv, cur: xp - a, need: b - a, ratio: (xp - a) / (b - a) };
  }

  addXp(tree: SkillTree, amount: number): void {
    if (amount <= 0) return;
    const before = this.level(tree);
    if (tree === 'farming') {
      this.w.state.skills.farmingXp += amount;
      this.w.finance.today().farmingXp += amount;
    } else {
      this.w.state.skills.livestockXp += amount;
      this.w.finance.today().livestockXp += amount;
    }
    const after = this.level(tree);
    if (after > before) {
      this.w.events.emit('levelUp', { tree, level: after });
      this.w.notify({ key: `lv_${tree}`, text: `${tree === 'farming' ? '농사' : '목축'} 레벨이 ${after}(으)로 올랐습니다!`, icon: tree === 'farming' ? 'ic_farming' : 'ic_livestock', tone: 'good' });
      this.w.events.emit('sfx', { key: 'levelup' });
    }
  }

  has(id: string): boolean {
    return this.w.state.skills.researched.includes(id);
  }

  check(id: string): { ok: boolean; reason?: string } {
    const s = SKILL_BY_ID[id];
    if (!s) return { ok: false, reason: '없는 기술' };
    if (this.has(id)) return { ok: false, reason: '이미 연구했습니다' };
    const other: SkillTree = s.tree === 'farming' ? 'livestock' : 'farming';
    if (this.level(s.tree) < s.level) return { ok: false, reason: `${s.tree === 'farming' ? '농사' : '목축'} Lv.${s.level} 필요` };
    if (this.level(other) < s.otherLevel) return { ok: false, reason: `${other === 'farming' ? '농사' : '목축'} Lv.${s.otherLevel} 필요` };
    const missing = s.requires.filter((r) => !this.has(r));
    if (missing.length) return { ok: false, reason: `선행: ${missing.map((m) => SKILL_BY_ID[m].name).join(', ')}` };
    if (s.advanced && this.w.finance.hasDebt()) return { ok: false, reason: '운영비 미납 중에는 고급 기술을 연구할 수 없습니다' };
    if (this.w.state.gold < s.cost) return { ok: false, reason: '골드가 부족합니다' };
    return { ok: true };
  }

  research(id: string): { ok: boolean; reason?: string } {
    const c = this.check(id);
    if (!c.ok) return c;
    const s = SKILL_BY_ID[id];
    this.w.spend(s.cost, `연구:${s.name}`);
    this.w.state.skills.researched.push(id);
    if (id === 'f_bag1') {
      this.w.state.bagUpgrades++;
      this.w.inventory.resizeBag();
    }
    this.w.events.emit('research', { id });
    this.w.notify({ key: `research_${id}`, text: `연구 완료: ${s.name}`, icon: 'ic_research', tone: 'good' });
    this.w.events.emit('sfx', { key: 'levelup' });
    this.w.events.emit('majorChange', { reason: 'research' });
    return { ok: true };
  }

  nodes(tree: SkillTree): SkillNode[] {
    return SKILLS.filter((s) => s.tree === tree);
  }
}
