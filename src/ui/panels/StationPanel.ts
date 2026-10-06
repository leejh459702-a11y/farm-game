/** 가공소 / 주방(요리) / 방직소 / 육가공소 / 퇴비통 — 작업 큐 + 레시피 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { BUILDING_BY_ID } from '../../data/buildings';
import { ITEM_BY_ID, TAG_PRICE, inputIcon, inputName } from '../../data/items';
import { RECIPE_BY_ID, STATION_NAME, type RecipeData } from '../../data/recipes';
import { SKILL_BY_ID } from '../../data/skills';
import { cx, esc } from '../dom';

function fmtMinutes(m: number): string {
  const realSec = (m / 1440) * 600;
  if (realSec < 60) return `약 ${Math.ceil(realSec)}초`;
  return `약 ${Math.round(realSec / 60)}분`;
}

export class StationPanel extends Panel {
  readonly id = 'station';
  watch: Watch = ['inventory', 'processing'];
  tabs = [
    { id: 'work', label: '작업', icon: 'ic_process' },
    { id: 'book', label: '레시피', icon: 'ic_codex' },
  ];
  private timer = 0;

  constructor(private uid: string) {
    super();
  }

  onOpen(): void {
    const b = this.w.state.buildings[this.uid];
    const d = BUILDING_BY_ID[b.type];
    this.title = d.station === 'kitchen' ? '주방 — 요리' : STATION_NAME[d.station!];
    // 진행도 표시 갱신 (시간은 멈춰 있지만 혹시 모를 변화 대비)
    this.timer = window.setInterval(() => this.queueRefresh(), 1000);
  }

  onClose(): void {
    clearInterval(this.timer);
  }

  private recipeRow(r: RecipeData, canStart: boolean): string {
    const w = this.w;
    const unlocked = w.processing.isUnlocked(r);
    const enough = w.processing.canMake(r);
    const out = ITEM_BY_ID[r.output];
    const inputs = r.inputs
      .map((i) => {
        const have = w.inventory.countMatching(i.id);
        return `<span class="chip ${have >= i.qty ? 'green' : 'red'}">${iconHtml(inputIcon(i.id), 16)}${esc(inputName(i.id))} ${have}/${i.qty}</span>`;
      })
      .join(' ');
    const sumIn = r.inputs.reduce((s, i) => s + (i.id.startsWith('#') ? TAG_PRICE[i.id.slice(1)] ?? 10 : ITEM_BY_ID[i.id].basePrice) * i.qty, 0);
    return `<div class="${cx('list-row', (!unlocked || !enough) && 'locked')}">${iconHtml(out.icon, 40)}
      <div class="grow" style="min-width:0"><b>${esc(r.outputName)}</b> <span class="tiny muted">${fmtMinutes(r.minutes)}${out.basePrice ? ` · 판매 ${out.basePrice.toLocaleString()}G (재료 ${sumIn.toLocaleString()}G)` : ''}</span>
      <div class="row wrap" style="gap:3px">${inputs}</div>
      ${!unlocked && r.unlockSkill ? `<div class="tiny bad">${esc(SKILL_BY_ID[r.unlockSkill]?.name ?? '')} 연구 필요</div>` : ''}</div>
      <button class="btn small green" data-act="make" data-arg="${r.id}" ${unlocked && enough && canStart ? '' : 'disabled'}>만들기</button></div>`;
  }

  renderBody(): string {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return '';
    const d = BUILDING_BY_ID[b.type];
    const recipes = w.processing.recipesFor(d.station!);
    const qsize = w.processing.queueSize(b);
    const canStart = (b.queue?.length ?? 0) < qsize;
    if (this.tab === 'book') {
      return `<div class="list">${recipes.map((r) => this.recipeRow(r, canStart)).join('')}</div>`;
    }
    const slots = [];
    for (let i = 0; i < qsize; i++) {
      const job = b.queue?.[i];
      if (!job) {
        slots.push(`<div class="card center muted small" style="min-height:4.2rem;display:flex;align-items:center;justify-content:center">빈 작업 슬롯</div>`);
        continue;
      }
      let name: string;
      let icon: string;
      if (job.recipeId.startsWith('ship:')) {
        const [, meat, q] = job.recipeId.split(':');
        name = `출하 → ${ITEM_BY_ID[meat].name} ×${q}`;
        icon = ITEM_BY_ID[meat].icon;
      } else {
        const r = RECIPE_BY_ID[job.recipeId];
        name = r.outputName;
        icon = ITEM_BY_ID[r.output].icon;
      }
      const pct = 100 - (job.remaining / job.total) * 100;
      slots.push(`<div class="card row">${iconHtml(icon, 36)}<div class="grow"><b class="small">${esc(name)}</b><div class="bar gold"><i style="width:${pct}%"></i></div><div class="tiny muted">${job.remaining <= 0 ? '완료 — 생산물함이 가득 참' : `남은 시간 ${fmtMinutes(job.remaining)}`}</div></div></div>`);
    }
    const out = w.state.containers[b.outputId!]?.slots.filter(Boolean) ?? [];
    const autoOk = w.skills.has('f_autoProcess');
    const available = recipes.filter((r) => w.processing.isUnlocked(r));
    return `<div class="grid cols-3" style="margin-bottom:0.5rem">${slots.join('')}</div>
      <div class="card row wrap" style="margin-bottom:0.5rem"><b class="small">완성품</b>${out.length ? out.map((s) => `${iconHtml(ITEM_BY_ID[s!.itemId].icon, 28)}<b>×${s!.qty}</b>`).join(' ') : '<span class="muted small">없음</span>'}
        <button class="btn small blue right" data-act="collect" ${out.length ? '' : 'disabled'}>수거</button></div>
      ${autoOk ? `<div class="card row wrap" style="margin-bottom:0.5rem"><b class="small">자동 투입</b><select class="search grow" data-input="auto"><option value="">끔</option>${available.map((r) => `<option value="${r.id}" ${b.autoRecipe === r.id ? 'selected' : ''}>${esc(r.outputName)}</option>`).join('')}</select><span class="tiny muted">창고 재료로 반복 생산</span></div>` : ''}
      <div class="section-title">${iconHtml('ic_codex', 20)} 만들 수 있는 것</div>
      <div class="list">${recipes
        .filter((r) => w.processing.isUnlocked(r))
        .sort((a, b2) => Number(w.processing.canMake(b2)) - Number(w.processing.canMake(a)))
        .map((r) => this.recipeRow(r, canStart))
        .join('')}</div>`;
  }

  onInput(name: string, value: string): void {
    if (name !== 'auto') return;
    const b = this.w.state.buildings[this.uid];
    const r = this.w.processing.setAuto(b, value || null);
    if (!r.ok) this.toast(r.reason ?? '', 'warn');
    else if (value) {
      this.w.processing.tick(0);
      this.toast('자동 투입이 설정되었습니다', 'good');
    }
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (act === 'make') {
      const r = w.processing.start(b, arg);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'collect') {
      const n = w.processing.collect(b);
      if (n) this.toast(`${n}개 수거했습니다`, 'good');
      else this.toast('가방과 창고가 가득 찼어요', 'warn');
    }
    this.refresh();
  }
}
