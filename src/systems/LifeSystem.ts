/**
 * LifeSystem — 생활 숙련도(낚시·채집 Lv.1~10)와 도구 업그레이드.
 * 농사/목축 레벨·기술 진행 조건에는 포함되지 않는 완전한 선택 콘텐츠.
 */
import { BALANCE } from '../data/balance';
import { TOOL_TIERS, type UpgradableTool } from '../data/tools';
import type { World } from '../core/World';

export type LifeSkill = 'fishing' | 'foraging';

export function lifeXpForLevel(level: number): number {
  let total = 0;
  for (let n = 1; n < level; n++) total += Math.round(BALANCE.life.xpBase * Math.pow(n, BALANCE.life.xpExp));
  return total;
}

export function lifeLevelFromXp(xp: number): number {
  let lv = 1;
  while (lv < BALANCE.life.maxLevel && xp >= lifeXpForLevel(lv + 1)) lv++;
  return lv;
}

/** 레벨별 해금 설명 */
export const LIFE_PERKS: Record<LifeSkill, Record<number, string>> = {
  fishing: {
    2: '입질 대기시간 감소',
    3: '새 미끼 — 희귀 물고기 확률 소폭 증가',
    4: '희귀 물고기 확률 증가',
    5: '좋은 낚싯대 (튼튼한 낚싯대 무료 지급)',
    6: '찌 영역 확대',
    7: '야간 낚시 보너스',
    8: '전설 물고기 확률 증가',
    9: '입질 대기시간 크게 감소',
    10: '최고급 낚싯대 (명인의 낚싯대 무료 지급)',
  },
  foraging: {
    2: '추가 수확 확률 10%',
    3: '채집 속도 증가 (벌목·채광 1회 감소)',
    4: '희귀 채집물 등장 (송이버섯·산삼 뿌리)',
    5: '추가 수확 15%',
    6: '추가 수확 25%',
    7: '수액 획득 확률 증가',
    8: '추가 수확 30%, 희귀 채집물 증가',
    9: '오래된 상자 발견 확률 증가',
    10: '추가 수확 40% · 특별 식재료',
  },
};

export class LifeSystem {
  constructor(private w: World) {}

  xp(k: LifeSkill): number {
    return k === 'fishing' ? this.w.state.life.fishingXp : this.w.state.life.foragingXp;
  }

  level(k: LifeSkill): number {
    return lifeLevelFromXp(this.xp(k));
  }

  progress(k: LifeSkill): { level: number; cur: number; need: number; ratio: number } {
    const lv = this.level(k);
    if (lv >= BALANCE.life.maxLevel) return { level: lv, cur: 1, need: 1, ratio: 1 };
    const a = lifeXpForLevel(lv);
    const b = lifeXpForLevel(lv + 1);
    const xp = this.xp(k);
    return { level: lv, cur: xp - a, need: b - a, ratio: (xp - a) / (b - a) };
  }

  addXp(k: LifeSkill, n: number): void {
    if (n <= 0) return;
    const before = this.level(k);
    if (k === 'fishing') this.w.state.life.fishingXp += n;
    else this.w.state.life.foragingXp += n;
    const after = this.level(k);
    for (let lv = before + 1; lv <= after; lv++) {
      const perk = LIFE_PERKS[k][lv];
      this.w.notify({ key: `life_${k}`, text: `${k === 'fishing' ? '낚시' : '채집'} 숙련도 Lv.${lv}!${perk ? ` ${perk}` : ''}`, icon: k === 'fishing' ? 'ic_fish' : 'ic_forage', tone: 'good' });
      if (k === 'fishing' && lv === 5) this.grantRod(1);
      if (k === 'fishing' && lv === 10) this.grantRod(3);
    }
    if (after > before) this.w.events.emit('sfx', { key: 'levelup' });
  }

  private grantRod(tier: number): void {
    if (this.w.state.tools.rod < tier) {
      this.w.state.tools.rod = tier;
      this.w.notify({ key: 'rod_gift', text: `${TOOL_TIERS.rod.tiers[tier].name}을(를) 얻었습니다!`, icon: 'tool_rod', tone: 'good' });
    }
  }

  // ───── 낚시 보정 ─────
  fishWaitMul(): number {
    const lv = this.level('fishing');
    return lv >= 9 ? 0.55 : lv >= 2 ? 0.8 : 1;
  }

  /** 희귀 이상 가중치 배율 */
  fishRareMul(isNight: boolean): number {
    const lv = this.level('fishing');
    let m = 1;
    if (lv >= 3) m += 0.1;
    if (lv >= 4) m += 0.15;
    if (lv >= 7 && isNight) m += 0.3;
    m += this.w.state.tools.rod * 0.08;
    if (this.w.skills.has('fi_rare')) m *= 1.25;
    if (this.w.collections.hasBook('book_fishing')) m *= 1.2;
    return m;
  }

  fishLegendMul(): number {
    let m = this.level('fishing') >= 8 ? 1.6 : 1;
    if (this.w.skills.has('fi_legend')) m *= 1.5;
    if (this.w.skills.has('fi_m_legend')) m *= 2;
    return m;
  }

  // ───── 채집 보정 ─────
  forageExtraChance(): number {
    return BALANCE.life.forageExtra[this.level('foraging')] ?? 0;
  }

  rareForage(): boolean {
    return this.level('foraging') >= 4;
  }

  /** 벌목/채광 1회당 타격량 보너스 */
  gatherSpeedBonus(): number {
    return this.level('foraging') >= 3 ? 1 : 0;
  }

  // ───── 도구 업그레이드 ─────
  toolInfo(tool: UpgradableTool): { level: number; next: number | null; cost: number; mats: { id: string; qty: number }[]; ok: boolean; reason?: string } {
    const level = this.w.state.tools[tool];
    const tiers = TOOL_TIERS[tool].tiers;
    if (level >= tiers.length - 1) return { level, next: null, cost: 0, mats: [], ok: false, reason: '최고 단계입니다' };
    const t = tiers[level + 1];
    let reason: string | undefined;
    if (tool === 'rod' && !this.w.state.tools.rodOwned) reason = '튜토리얼을 마치면 낚싯대를 받아요';
    else if (level + 1 >= 2 && !this.w.skills.has('ga_tools')) reason = '채집·채광 연구 [도구 강화]가 필요해요';
    else if (this.w.state.gold < t.cost) reason = '골드가 부족합니다';
    else if (!this.w.inventory.hasMats(t.mats)) reason = '재료가 부족합니다';
    return { level, next: level + 1, cost: t.cost, mats: t.mats, ok: !reason, reason };
  }

  upgradeTool(tool: UpgradableTool): { ok: boolean; reason?: string } {
    const info = this.toolInfo(tool);
    if (!info.ok || info.next === null) return { ok: false, reason: info.reason };
    this.w.spend(info.cost, '도구 업그레이드');
    this.w.inventory.consumeMats(info.mats);
    this.w.state.tools[tool] = info.next;
    this.w.notify({ key: `tool_${tool}`, text: `${TOOL_TIERS[tool].tiers[info.next].name}(으)로 업그레이드!`, icon: TOOL_TIERS[tool].icon, tone: 'good' });
    this.w.events.emit('sfx', { key: 'upgrade' });
    this.w.events.emit('majorChange', { reason: 'tool' });
    return { ok: true };
  }
}
