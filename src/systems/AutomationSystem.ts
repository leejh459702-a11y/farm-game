/**
 * AutomationSystem — 플레이 시간 절약용 자동화 (수익 증가 목적 아님).
 * 아침마다: 자동 수확 → 자동 재파종, 자동 급식, 자동 수거.
 */
import { CROP_BY_ID } from '../data/crops';
import { isReady } from './CropSystem';
import type { World } from '../core/World';

export interface AutomationReport {
  harvested: number;
  replanted: number;
  fed: number;
  hungry: number;
  collected: number;
  storageFull: boolean;
}

export class AutomationSystem {
  constructor(private w: World) {}

  morning(): AutomationReport {
    const rep: AutomationReport = { harvested: 0, replanted: 0, fed: 0, hungry: 0, collected: 0, storageFull: false };
    const crops = this.w.crops;
    const autoFarm = this.w.skills.has('f_autoFarm');
    for (const p of crops.allPlots()) {
      if (p.upgrades.autoHarvest < 1 || !isReady(p)) continue;
      const cropId = p.cropId!;
      const res = crops.harvest(p, 'storage');
      if (!res.ok) {
        rep.storageFull = true;
        continue;
      }
      rep.harvested += res.qty ?? 0;
      if (autoFarm && !p.cropId && CROP_BY_ID[cropId]) {
        const seed = `seed_${cropId}`;
        if (crops.plant(p, seed).ok) rep.replanted++;
      }
    }
    for (const b of this.w.animals.barns()) {
      if ((b.upgrades?.autoFeed ?? 0) >= 1) {
        const r = this.w.animals.feedBarn(b, 'auto');
        rep.fed += r.fed;
        rep.hungry += r.hungry;
      }
      if ((b.upgrades?.autoCollect ?? 0) >= 1) rep.collected += this.w.animals.collect(b, true);
    }
    if (rep.harvested) this.w.notify({ key: 'auto_harvest', text: `자동 수확: ${rep.harvested}개를 창고에 저장했습니다`, icon: 'ic_auto', tone: 'good' });
    if (rep.storageFull) this.w.notify({ key: 'storage_full', text: '창고가 가득 차 자동 수확을 하지 못한 농지가 있습니다', icon: 'ic_warn', tone: 'warn' });
    if (rep.hungry) this.w.notify({ key: 'hungry', text: `자동 급식: 사료가 부족해 ${rep.hungry}마리가 굶었습니다`, icon: 'ic_warn', tone: 'warn' });
    if (rep.collected) this.w.notify({ key: 'auto_collect', text: `자동 수거: 축산물 ${rep.collected}개를 창고에 저장했습니다`, icon: 'ic_auto', tone: 'good' });
    return rep;
  }

  /** 축사 내부 업그레이드 */
  barnUpgrade(uid: string, type: string): { ok: boolean; reason?: string } {
    const b = this.w.state.buildings[uid];
    if (!b?.upgrades) return { ok: false, reason: '축사가 아닙니다' };
    const info = this.barnUpgradeInfo(type, b.upgrades[type] ?? 0);
    if (info.max) return { ok: false, reason: '최대 단계입니다' };
    if (info.locked) return { ok: false, reason: info.locked };
    if (this.w.state.gold < info.cost) return { ok: false, reason: '골드가 부족합니다' };
    this.w.spend(info.cost, '축사 업그레이드');
    b.upgrades[type] = info.next;
    this.w.events.emit('animals', undefined);
    this.w.events.emit('sfx', { key: 'upgrade' });
    this.w.events.emit('majorChange', { reason: 'barnUpgrade' });
    return { ok: true };
  }

  barnUpgradeInfo(type: string, current: number): { next: number; cost: number; locked: string | null; max: boolean } {
    const cfg = this.w.balance.barnUpgrades[type];
    const next = current + 1;
    if (!cfg || next >= cfg.costs.length) return { next: current, cost: 0, locked: null, max: true };
    const skill = cfg.skill[next];
    return { next, cost: cfg.costs[next], locked: skill && !this.w.skills.has(skill) ? '연구 필요' : null, max: false };
  }
}
