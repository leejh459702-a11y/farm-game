/**
 * SkillSystem — 농사/목축 레벨(경험치)과 기술 연구.
 * 고급 기술은 상대 분야 레벨을 요구하여 한쪽만 최고로 올릴 수 없게 한다.
 */
import { BALANCE } from '../data/balance';
import { SKILL_BY_ID, SKILLS, TREE_ICON, TREE_NAME, type SkillNode, type SkillTree } from '../data/skills';
import { lifeLevelFromXp, lifeXpForLevel } from './LifeSystem';
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

  /** 낚시·채집채광은 생활 숙련도 경험치를 그대로 쓴다 */
  private isLife(tree: SkillTree): boolean {
    return tree === 'fishing' || tree === 'gathering';
  }

  xp(tree: SkillTree): number {
    const s = this.w.state.skills;
    if (tree === 'farming') return s.farmingXp;
    if (tree === 'livestock') return s.livestockXp;
    if (tree === 'business') return s.businessXp ?? 0;
    return tree === 'fishing' ? this.w.state.life.fishingXp : this.w.state.life.foragingXp;
  }

  level(tree: SkillTree): number {
    return this.isLife(tree) ? lifeLevelFromXp(this.xp(tree)) : levelFromXp(this.xp(tree));
  }

  progress(tree: SkillTree): { level: number; cur: number; need: number; ratio: number } {
    const lv = this.level(tree);
    const xp = this.xp(tree);
    if (lv >= BALANCE.skills.maxLevel) return { level: lv, cur: 1, need: 1, ratio: 1 };
    const f = this.isLife(tree) ? lifeXpForLevel : xpForLevel;
    const a = f(lv);
    const b = f(lv + 1);
    return { level: lv, cur: xp - a, need: b - a, ratio: (xp - a) / (b - a) };
  }

  /** 상대 분야 (고급 기술 조건) */
  otherOf(s: SkillNode): SkillTree {
    return s.otherTree ?? (s.tree === 'farming' ? 'livestock' : 'farming');
  }

  addXp(tree: SkillTree, amount: number): void {
    if (amount <= 0) return;
    if (tree === 'fishing') return this.w.life.addXp('fishing', amount);
    if (tree === 'gathering') return this.w.life.addXp('foraging', amount);
    const before = this.level(tree);
    if (tree === 'farming') {
      this.w.state.skills.farmingXp += amount;
      this.w.finance.today().farmingXp += amount;
    } else if (tree === 'livestock') {
      this.w.state.skills.livestockXp += amount;
      this.w.finance.today().livestockXp += amount;
    } else this.w.state.skills.businessXp = (this.w.state.skills.businessXp ?? 0) + amount;
    const after = this.level(tree);
    if (after > before) {
      this.w.events.emit('levelUp', { tree, level: after });
      this.w.notify({ key: `lv_${tree}`, text: `${TREE_NAME[tree]} 레벨이 ${after}(으)로 올랐습니다!${after === 10 ? ' 마스터리 연구가 열렸어요!' : ''}`, icon: TREE_ICON[tree], tone: 'good' });
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
    const other = this.otherOf(s);
    if (this.level(s.tree) < s.level) return { ok: false, reason: `${TREE_NAME[s.tree]} Lv.${s.level} 필요` };
    if (this.level(other) < s.otherLevel) return { ok: false, reason: `${TREE_NAME[other]} Lv.${s.otherLevel} 필요` };
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
