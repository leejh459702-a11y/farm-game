/** 설계도 저장/불러오기 — 시설 배치를 저장하고 다시 적용 (이동 비용 없음) */
import { Panel } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { BUILDING_BY_ID, footprint } from '../../data/buildings';
import { dateLabel } from '../../systems/SeasonSystem';
import { esc } from '../dom';
import { confirmDialog, promptDialog } from '../dialogs';
import type { Blueprint } from '../../types/game';

const MAX = 6;

export class BlueprintPanel extends Panel {
  readonly id = 'blueprints';
  size = 'medium' as const;
  title = '설계도';

  private preview(bp: Blueprint): string {
    // 미니맵 (소유지 + 시설)
    const w = this.w;
    const cells: string[] = [];
    const occ = new Map<string, string>();
    for (const b of bp.buildings) {
      const { w: fw, h: fh } = footprint(b.type, b.rot);
      for (let y = b.y; y < b.y + fh; y++) for (let x = b.x; x < b.x + fw; x++) occ.set(`${x},${y}`, b.type);
    }
    for (let y = 0; y < 30; y++)
      for (let x = 0; x < 30; x++) {
        const t = occ.get(`${x},${y}`);
        const owned = w.grid.isOwned(x, y);
        const col = t ? (t === 'house' ? '#c8423a' : BUILDING_BY_ID[t].category === 'decoration' ? '#f7a8c4' : '#8a5a34') : owned ? '#8cc35a' : 'transparent';
        cells.push(`<i style="background:${col}"></i>`);
      }
    return `<div style="display:grid;grid-template-columns:repeat(30,1fr);width:7.5rem;aspect-ratio:1;border:2px solid var(--paper-3);border-radius:6px;overflow:hidden;background:#5a7a4a">${cells.join('')}</div>`;
  }

  renderBody(): string {
    const w = this.w;
    const list = w.state.blueprints;
    return `<div class="card small muted" style="margin-bottom:0.5rem">현재 시설 배치를 설계도로 저장해 두고, 나중에 한 번에 되돌릴 수 있어요. 불러올 때 이미 있는 시설만 해당 위치로 이동합니다. (이동 비용 없음 · 겹치는 경우 건너뜀)</div>
      <div class="list">${list
        .map(
          (bp) => `<div class="list-row">${this.preview(bp)}<div class="grow"><b>${esc(bp.name)}</b><div class="tiny muted">${dateLabel(bp.createdDay)} · 시설 ${bp.buildings.length}개</div></div>
          <div class="col"><button class="btn small green" data-act="apply" data-arg="${bp.id}">불러오기</button><button class="btn small red" data-act="del" data-arg="${bp.id}">삭제</button></div></div>`,
        )
        .join('') || '<div class="empty-msg">저장된 설계도가 없어요.</div>'}</div>`;
  }

  renderFoot(): string {
    return `<button class="btn green block" data-act="save" ${this.w.state.blueprints.length >= MAX ? 'disabled' : ''}>${iconHtml('ic_blueprint', 20)} 현재 배치 저장 (${this.w.state.blueprints.length}/${MAX})</button>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    if (act === 'save') {
      promptDialog('설계도 저장', '설계도 이름', `설계도 ${w.state.blueprints.length + 1}`, (name) => {
        w.state.blueprints.push({
          id: w.uid('bp'),
          name: name || '설계도',
          createdDay: w.state.time.day,
          buildings: Object.values(w.state.buildings).map((b) => ({ uid: b.uid, type: b.type, x: b.x, y: b.y, rot: b.rot })),
        });
        this.refresh();
      });
    } else if (act === 'del') {
      confirmDialog('설계도 삭제', '이 설계도를 삭제할까요?', '삭제', () => {
        w.state.blueprints = w.state.blueprints.filter((b) => b.id !== arg);
        this.refresh();
      }, true);
    } else if (act === 'apply') {
      const bp = w.state.blueprints.find((b) => b.id === arg);
      if (!bp) return;
      confirmDialog('설계도 불러오기', `"${esc(bp.name)}" 배치로 시설을 옮길까요?`, '적용', () => {
        const r = applyBlueprint(this, bp);
        this.toast(`${r.moved}개 이동${r.skipped ? `, ${r.skipped}개는 자리가 맞지 않아 건너뜀` : ''}`, r.skipped ? 'warn' : 'good');
      });
    }
  }
}

/** 같은 uid 의 시설을 저장된 위치로 이동 (충돌 시 반복 시도) */
function applyBlueprint(p: Panel, bp: Blueprint): { moved: number; skipped: number } {
  const w = p.w;
  const targets = bp.buildings.filter((t) => {
    const b = w.state.buildings[t.uid];
    return b && (b.x !== t.x || b.y !== t.y || b.rot !== t.rot);
  });
  let moved = 0;
  let pending = [...targets];
  for (let pass = 0; pass < 4 && pending.length; pass++) {
    const left: typeof pending = [];
    for (const t of pending) {
      const r = w.grid.move(t.uid, t.x, t.y, t.rot);
      if (r.ok) moved++;
      else left.push(t);
    }
    if (left.length === pending.length) break;
    pending = left;
  }
  return { moved, skipped: pending.length };
}
