/** 농장 전체 관리 — 대형 농장 현황 + 탭하면 해당 위치로 카메라 이동 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { BUILDING_BY_ID, footprint } from '../../data/buildings';
import { CROP_BY_ID } from '../../data/crops';
import { isReady } from '../../systems/CropSystem';
import { Session } from '../../core/Session';
import { esc } from '../dom';
import { openPanel } from '../openers';

interface Row {
  icon: string;
  label: string;
  value: string;
  tone?: 'good' | 'bad' | '';
  targets: { x: number; y: number; label: string }[];
  open?: () => void;
}

export class OverviewPanel extends Panel {
  readonly id = 'overview';
  title = '농장 전체 관리';
  watch: Watch = ['plots', 'animals', 'inventory', 'processing'];
  private expanded: string | null = null;

  private rows(): Row[] {
    const w = this.w;
    const plots = w.crops.allPlots();
    const outdoor = plots.filter((p) => !p.greenhouse);
    const crops = plots.filter((p) => p.cropId);
    const ready = plots.filter(isReady);
    const dry = outdoor.filter((p) => p.cropId && !p.wateredToday && !isReady(p));
    const ghTarget = (uid?: string) => {
      const b = uid ? w.state.buildings[uid] : null;
      return b ? { x: b.x + 1, y: b.y + 1 } : null;
    };
    const plotTarget = (p: (typeof plots)[number]) => (p.greenhouse ? ghTarget(p.greenhouse) : { x: p.x, y: p.y });
    const byCrop = (list: typeof plots) => {
      const m: Record<string, typeof plots> = {};
      for (const p of list) (m[p.cropId!] ??= []).push(p);
      return Object.entries(m).map(([id, ps]) => ({ ...plotTarget(ps[0])!, label: `${CROP_BY_ID[id].name} ${ps.length}개` }));
    };
    const animals = w.animals.list();
    const pregnant = animals.filter((a) => a.pregnant);
    const barns = w.animals.barns();
    const pendingBarns = barns.filter((b) => w.animals.pendingOutput(b) > 0);
    const center = (uid: string, label: string) => {
      const b = w.state.buildings[uid];
      const { w: fw, h: fh } = footprint(b.type, b.rot);
      return { x: b.x + Math.floor(fw / 2), y: b.y + Math.floor(fh / 2), label };
    };
    const low = w.freshness.lowFreshnessStacks();
    const lowCount = low.reduce((s, e) => s + e.stack.qty, 0);
    const stations = w.processing.stations();
    const doneStations = stations.filter((b) => w.processing.readyCount(b) > 0);
    const busy = stations.filter((b) => b.queue?.length);
    // 문제 시설
    const problems: { x: number; y: number; label: string }[] = [];
    for (const b of barns) {
      const an = w.animals.animalsIn(b);
      const hungry = an.filter((a) => !a.fedToday).length;
      if (hungry && !(b.upgrades?.autoFeed ?? 0)) problems.push(center(b.uid, `${BUILDING_BY_ID[b.type].name}: ${hungry}마리 배고픔`));
      if ((b.dirt ?? 0) >= 60) problems.push(center(b.uid, `${BUILDING_BY_ID[b.type].name}: 청소 필요`));
    }
    for (const b of Object.values(w.state.buildings)) {
      if (!b.containerId) continue;
      const c = w.state.containers[b.containerId];
      if (c.slots.filter(Boolean).length >= c.slots.length * 0.9) problems.push(center(b.uid, `${BUILDING_BY_ID[b.type].name}: 거의 가득 참`));
    }
    const homeless = animals.filter((a) => !a.buildingUid);
    if (homeless.length) problems.push({ x: -1, y: -1, label: `머물 곳 없는 동물 ${homeless.length}마리` });
    if (w.finance.hasDebt()) problems.push({ x: -1, y: -1, label: `운영비 미납 ${w.state.finance.debt.toLocaleString()}G` });

    return [
      { icon: 'ic_farming', label: '총 작물 수', value: `${crops.length}개 / 농지 ${plots.length}칸`, targets: byCrop(crops) },
      { icon: 'ic_star', label: '수확 가능한 작물', value: `${ready.length}개`, tone: ready.length ? 'good' : '', targets: byCrop(ready) },
      { icon: 'tool_water', label: '물이 필요한 작물', value: `${dry.length}개`, tone: dry.length ? 'bad' : '', targets: byCrop(dry) },
      { icon: 'ic_livestock', label: '동물 수', value: `${animals.length}마리 / 축사 ${barns.length}동`, targets: barns.map((b) => center(b.uid, `${BUILDING_BY_ID[b.type].name} ${b.animalIds?.length ?? 0}마리`)), open: () => openPanel('animals') },
      { icon: 'ic_heart', label: '임신 중인 동물', value: `${pregnant.length}마리`, targets: pregnant.filter((a) => a.buildingUid).map((a) => center(a.buildingUid!, `${a.name} — ${a.pregnant!.daysLeft}일 후`)) },
      { icon: 'it_egg', label: '수거 가능한 축산물', value: `${pendingBarns.reduce((s, b) => s + w.animals.pendingOutput(b), 0)}개`, tone: pendingBarns.length ? 'good' : '', targets: pendingBarns.map((b) => center(b.uid, `${BUILDING_BY_ID[b.type].name} ${w.animals.pendingOutput(b)}개`)) },
      { icon: 'ic_warn', label: '신선도 위험 품목', value: `${lowCount}개`, tone: lowCount ? 'bad' : '', targets: [], open: () => openPanel('inventory') },
      { icon: 'ic_process', label: '가공 완료 / 진행 중', value: `${doneStations.length} / ${busy.length}곳`, tone: doneStations.length ? 'good' : '', targets: doneStations.concat(busy.filter((b) => !doneStations.includes(b))).map((b) => center(b.uid, `${BUILDING_BY_ID[b.type].name}${w.processing.readyCount(b) ? ' — 완료' : ' — 진행 중'}`)) },
      { icon: 'ic_warn', label: '문제 있는 시설', value: `${problems.length}건`, tone: problems.length ? 'bad' : 'good', targets: problems },
    ];
  }

  renderBody(): string {
    const w = this.w;
    const rows = this.rows();
    const owned = w.grid.ownedCount();
    return `<div class="row wrap" style="margin-bottom:0.5rem"><span class="chip">토지 ${owned}/${w.land.cap()}칸 (최대 900)</span><span class="chip">시설 ${Object.keys(w.state.buildings).length}개</span><span class="chip gold">농장 가치 ${w.finance.farmValue().toLocaleString()}G</span><span class="chip">아름다움 ${w.grid.beauty()}</span></div>
      <div class="list">${rows
        .map((r) => {
          const open = this.expanded === r.label;
          return `<div class="list-row click" data-act="row" data-arg="${esc(r.label)}">${iconHtml(r.icon, 32)}<b class="grow">${esc(r.label)}</b><b class="${r.tone ?? ''}">${esc(r.value)}</b><span class="muted">${r.targets.length || r.open ? (open ? '▲' : '▼') : ''}</span></div>
          ${open ? `<div class="col" style="padding-left:2.4rem">${r.targets.map((t, i) => `<button class="list-row click" data-act="go" data-arg="${i}" data-row="${esc(r.label)}" ${t.x < 0 ? 'disabled' : ''}>${esc(t.label)}<span class="right chip blue">${t.x < 0 ? '-' : '위치 보기'}</span></button>`).join('')}${r.open ? `<button class="btn small" data-act="open" data-arg="${esc(r.label)}">자세히 보기</button>` : ''}</div>` : ''}`;
        })
        .join('')}</div>`;
  }

  onAction(act: string, arg: string, el: HTMLElement): void {
    if (act === 'row') {
      this.expanded = this.expanded === arg ? null : arg;
      this.refresh();
    } else if (act === 'go') {
      const row = this.rows().find((r) => r.label === el.dataset.row);
      const t = row?.targets[Number(arg)];
      if (!t || t.x < 0) return;
      this.manager.close(this);
      Session.app.emit('focusTile', { x: t.x, y: t.y });
    } else if (act === 'open') {
      this.rows().find((r) => r.label === arg)?.open?.();
    }
  }
}
