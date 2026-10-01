/**
 * HouseUpgradeSystem — 집 Lv.1~6. 외부 크기는 항상 2×2, 외형만 발전.
 * 레벨이 오르면 토지 단계 가격/최대 토지/운영비율이 바뀐다.
 */
import { BALANCE } from '../data/balance';
import type { World } from '../core/World';

export const HOUSE_NAMES = ['작은 오두막', '아늑한 농가', '붉은 지붕 집', '2층 농가주택', '넓은 저택', '농장 대저택'];

export class HouseUpgradeSystem {
  constructor(private w: World) {}

  get level(): number {
    return this.w.state.house.level;
  }

  nextReq(): (typeof BALANCE.house.upgrades)[number] | null {
    return BALANCE.house.upgrades.find((u) => u.level === this.level + 1) ?? null;
  }

  check(): { ok: boolean; reason?: string } {
    const req = this.nextReq();
    if (!req) return { ok: false, reason: '최고 레벨입니다' };
    if (!this.w.grid.house()) return { ok: false, reason: '집이 없습니다' };
    if (this.w.finance.hasDebt()) return { ok: false, reason: '운영비 미납 중에는 업그레이드할 수 없습니다' };
    if (this.w.skills.level('farming') < req.farming) return { ok: false, reason: `농사 Lv.${req.farming} 필요` };
    if (this.w.skills.level('livestock') < req.livestock) return { ok: false, reason: `목축 Lv.${req.livestock} 필요` };
    if (this.w.state.gold < req.cost) return { ok: false, reason: '골드가 부족합니다' };
    return { ok: true };
  }

  upgrade(): { ok: boolean; reason?: string } {
    const c = this.check();
    if (!c.ok) return c;
    const req = this.nextReq()!;
    this.w.spend(req.cost, '집 업그레이드');
    this.w.state.house.level = req.level;
    // 새 단계에서 토지 가격 카운트 초기화
    this.w.state.land.boughtAtLevel = 0;
    this.w.events.emit('house', { level: req.level });
    this.w.events.emit('buildings', undefined);
    this.w.notify({ key: 'house', text: `집이 Lv.${req.level} ${HOUSE_NAMES[req.level - 1]}(으)로 업그레이드되었습니다!`, icon: 'ic_house', tone: 'good' });
    this.w.events.emit('sfx', { key: 'levelup' });
    this.w.events.emit('majorChange', { reason: 'house' });
    return { ok: true };
  }
}
