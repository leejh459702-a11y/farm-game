/**
 * 기술 연구 — 노드 그래프형 스킬트리
 * 양피지 격자 보드 위에 아이콘 노드를 선으로 잇고, 시작 노드에서 오른쪽으로 갈라져 나간다.
 * 노드를 탭하면 이름 말풍선 + 하단에 설명/연구 버튼.
 */
import { Panel, type Watch } from '../Panel';
import { Art, iconHtml } from '../../assets/AssetRegistry';
import { SKILLS, SKILL_BY_ID, type SkillNode, type SkillTree } from '../../data/skills';
import { cx, esc } from '../dom';
import { LIFE_PERKS, type LifeSkill } from '../../systems/LifeSystem';

/** 기술별 아이콘 (없으면 분야 아이콘) */
const SKILL_ICON: Record<string, string> = {
  f_fert1: 'it_basic_fertilizer',
  f_compost: 'bld_compost',
  f_soil1: 'tool_hoe',
  f_fert2: 'it_premium_fertilizer',
  f_orchard: 'it_apple',
  f_special: 'it_goldenmelon',
  f_irrig1: 'tool_water',
  f_multi: 'tool_area',
  f_irrig2: 'bld_well',
  f_pest: 'bld_scarecrow',
  f_autoHarvest: 'ic_auto',
  f_irrig3: 'ic_drop',
  f_autoFarm: 'ic_farm',
  f_storage1: 'bld_warehouse',
  f_bag1: 'ic_bag',
  f_cold: 'bld_fridge',
  f_bigStorage: 'bld_bigwarehouse',
  f_coldBig: 'bld_coldstorage',
  f_soil2: 'it_special_fertilizer',
  f_processing: 'bld_processor',
  f_kitchen: 'bld_kitchen',
  f_greenhouse: 'bld_greenhouse',
  f_autoProcess: 'ic_process',
  l_chicken: 'portrait_chicken',
  l_duck: 'portrait_duck',
  l_rabbit: 'portrait_rabbit',
  l_poultry2: 'portrait_goose',
  l_sheep: 'portrait_sheep',
  l_goat: 'portrait_goat',
  l_cow: 'portrait_cow',
  l_pig: 'portrait_pig',
  l_bigBarn: 'bld_bigbarn',
  l_rare: 'portrait_alpaca',
  l_breeding: 'bld_breeding',
  l_pedigree: 'ic_breed',
  l_advBreeding: 'ic_heart',
  l_breedLab: 'bld_breedlab',
  l_weaving: 'bld_loom',
  l_meat: 'bld_butcher',
  l_autoFeed: 'it_hay',
  l_autoClean: 'ic_auto',
  l_autoCollect: 'ic_storage',
  l_autoFeed2: 'it_treat',
  l_barnExpand: 'bld_cowbarn',
};

function skillIcon(n: SkillNode): string {
  const k = SKILL_ICON[n.id];
  return k && Art.has(k) ? k : n.tree === 'farming' ? 'ic_farming' : 'ic_livestock';
}

/** 보드 배치 상수 (px) */
const COL_W = 96;
const ROW_H = 64;
const NODE = 46;
const PAD = 40;

interface Placed {
  id: string;
  x: number;
  y: number;
}

interface Layout {
  nodes: Placed[];
  edges: { from: string; to: string }[];
  w: number;
  h: number;
}

const ROOT = '__root';
const layoutCache = new Map<SkillTree, Layout>();

/**
 * 자동 배치: x = 선행 기술 사슬의 깊이, y = 정돈된 트리(잎 순서대로 줄, 부모는 자식들의 가운데).
 * 선행 기술이 둘 이상이면 가장 깊은 것을 트리 부모로 삼고, 나머지는 선만 잇는다.
 */
function layoutTree(tree: SkillTree): Layout {
  const cached = layoutCache.get(tree);
  if (cached) return cached;
  const list = SKILLS.filter((s) => s.tree === tree);
  const depth = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depth.has(id)) return depth.get(id)!;
    const n = SKILL_BY_ID[id];
    const d = n.requires.length ? 1 + Math.max(...n.requires.map(depthOf)) : 1;
    depth.set(id, d);
    return d;
  };
  list.forEach((n) => depthOf(n.id));
  const parent = new Map<string, string>();
  for (const n of list) parent.set(n.id, n.requires.length ? n.requires.reduce((a, b) => (depthOf(b) > depthOf(a) ? b : a)) : ROOT);
  const children = new Map<string, string[]>();
  for (const n of [...list].sort((a, b) => a.col - b.col || a.row - b.row)) {
    const p = parent.get(n.id)!;
    if (!children.has(p)) children.set(p, []);
    children.get(p)!.push(n.id);
  }
  const yOf = new Map<string, number>();
  let leaf = 0;
  const place = (id: string): number => {
    const ch = children.get(id) ?? [];
    if (!ch.length) {
      yOf.set(id, leaf++);
      return yOf.get(id)!;
    }
    const ys = ch.map(place);
    const y = (ys[0] + ys[ys.length - 1]) / 2;
    yOf.set(id, y);
    return y;
  };
  place(ROOT);
  depth.set(ROOT, 0);
  const px = (id: string) => PAD + depth.get(id)! * COL_W;
  const py = (id: string) => PAD + yOf.get(id)! * ROW_H;
  const nodes: Placed[] = [ROOT, ...list.map((n) => n.id)].map((id) => ({ id, x: px(id), y: py(id) }));
  const edges: { from: string; to: string }[] = [];
  for (const n of list) {
    if (!n.requires.length) edges.push({ from: ROOT, to: n.id });
    for (const r of n.requires) edges.push({ from: r, to: n.id });
  }
  const maxD = Math.max(...depth.values());
  const out: Layout = { nodes, edges, w: PAD * 2 + maxD * COL_W + NODE, h: PAD * 2 + Math.max(0, leaf - 1) * ROW_H + NODE };
  layoutCache.set(tree, out);
  return out;
}

export class SkillTreePanel extends Panel {
  readonly id = 'skills';
  title = '기술 연구';
  tabs = [
    { id: 'farming', label: '농사', icon: 'ic_farming' },
    { id: 'livestock', label: '목축', icon: 'ic_livestock' },
    { id: 'life', label: '생활', icon: 'ic_fish' },
  ];
  watch: Watch = ['gold', 'research', 'levelUp'];
  private sel: string | null = null;
  private dragging: { x: number; y: number; sl: number; st: number; moved: boolean } | null = null;

  constructor(tree: SkillTree | 'life') {
    super();
    this.tab = tree;
  }

  onTab(): void {
    this.sel = null;
  }

  /** 보드 스크롤 위치 보존 + 마우스 드래그로 보드 이동 */
  refresh(resetScroll = false): void {
    const old = this.root?.querySelector('.sk-board') as HTMLElement | null;
    const pos = old && !resetScroll ? { l: old.scrollLeft, t: old.scrollTop } : null;
    super.refresh(resetScroll);
    const board = this.root?.querySelector('.sk-board') as HTMLElement | null;
    if (!board) return;
    if (pos) {
      board.scrollLeft = pos.l;
      board.scrollTop = pos.t;
    } else {
      // 처음 열면 세로 가운데(시작 노드 높이)로
      board.scrollTop = Math.max(0, (board.scrollHeight - board.clientHeight) / 2);
    }
    board.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return; // 터치는 기본 스크롤
      this.dragging = { x: e.clientX, y: e.clientY, sl: board.scrollLeft, st: board.scrollTop, moved: false };
    });
    board.addEventListener('pointermove', (e) => {
      const d = this.dragging;
      if (!d) return;
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (Math.hypot(dx, dy) > 4) d.moved = true;
      board.scrollLeft = d.sl - dx;
      board.scrollTop = d.st - dy;
    });
    const end = () => setTimeout(() => (this.dragging = null), 0);
    board.addEventListener('pointerup', end);
    board.addEventListener('pointerleave', end);
  }

  private header(tree: SkillTree): string {
    const w = this.w;
    const prog = w.skills.progress(tree);
    const other = w.skills.progress(tree === 'farming' ? 'livestock' : 'farming');
    const list = SKILLS.filter((s) => s.tree === tree);
    const done = list.filter((s) => w.skills.has(s.id)).length;
    const ready = list.filter((s) => !w.skills.has(s.id) && w.skills.check(s.id).ok).length;
    return `<div class="sk-head">
      <span class="sk-lv">${iconHtml(tree === 'farming' ? 'ic_farming' : 'ic_livestock', 20)}<b>${tree === 'farming' ? '농사' : '목축'} Lv.${prog.level}</b></span>
      <div class="sk-xp" title="${prog.level >= 10 ? 'MAX' : `${prog.cur}/${prog.need} XP`}"><i style="width:${prog.level >= 10 ? 100 : prog.ratio * 100}%"></i></div>
      <span class="tiny muted">${tree === 'farming' ? '목축' : '농사'} Lv.${other.level}</span>
      <span class="sk-count">연구 <b>${done}</b>/${list.length}${ready ? ` · <b class="good">연구 가능 ${ready}</b>` : ''}</span>
    </div>`;
  }

  private board(tree: SkillTree): string {
    const w = this.w;
    const L = layoutTree(tree);
    const pos = new Map(L.nodes.map((n) => [n.id, n]));
    const isDone = (id: string) => id === ROOT || w.skills.has(id);
    const c = NODE / 2;
    const lines = L.edges
      .map((e) => {
        const a = pos.get(e.from)!;
        const b = pos.get(e.to)!;
        const lit = isDone(e.from) && isDone(e.to);
        const next = isDone(e.from) && !isDone(e.to);
        return `<line x1="${a.x + c}" y1="${a.y + c}" x2="${b.x + c}" y2="${b.y + c}" class="${lit ? 'lit' : next ? 'next' : ''}"/>`;
      })
      .join('');
    const nodes = L.nodes
      .map((p) => {
        if (p.id === ROOT) {
          return `<div class="sk-node root done" style="left:${p.x}px;top:${p.y}px">${iconHtml(tree === 'farming' ? 'ic_farming' : 'ic_livestock', 30)}<span class="sk-tip show">${tree === 'farming' ? '농사' : '목축'}</span></div>`;
        }
        const n = SKILL_BY_ID[p.id];
        const done = w.skills.has(n.id);
        const ready = !done && w.skills.check(n.id).ok;
        const sel = this.sel === n.id;
        return `<button class="${cx('sk-node', done && 'done', ready && 'ready', !done && !ready && 'locked', n.advanced && 'adv', sel && 'sel')}" style="left:${p.x}px;top:${p.y}px" data-act="sel" data-arg="${n.id}" aria-label="${esc(n.name)}">
          ${iconHtml(skillIcon(n), 30)}<span class="${cx('sk-tip', sel && 'show')}">${esc(n.name)}</span></button>`;
      })
      .join('');
    return `<div class="sk-board"><div class="sk-canvas" style="width:${L.w}px;height:${L.h}px">
      <svg class="sk-lines" width="${L.w}" height="${L.h}">${lines}</svg>${nodes}</div></div>`;
  }

  /** 생활 숙련도: 레벨 1~10 보너스를 한 줄 사슬로 */
  private lifeBoard(): string {
    const w = this.w;
    const row = (k: LifeSkill, name: string, icon: string, y: number) => {
      const p = w.life.progress(k);
      const lvs = Object.keys(LIFE_PERKS[k]).map(Number).sort((a, b) => a - b);
      const lines: string[] = [];
      const nodes: string[] = [`<div class="sk-node root done" style="left:${PAD}px;top:${y}px">${iconHtml(icon, 30)}<span class="sk-tip show">${name}</span></div>`];
      let prevX = PAD;
      lvs.forEach((lv, i) => {
        const x = PAD + (i + 1) * COL_W;
        const done = lv <= p.level;
        const next = !done && (i === 0 || lvs[i - 1] <= p.level);
        lines.push(`<line x1="${prevX + NODE / 2}" y1="${y + NODE / 2}" x2="${x + NODE / 2}" y2="${y + NODE / 2}" class="${done ? 'lit' : next ? 'next' : ''}"/>`);
        const id = `life:${k}:${lv}`;
        const sel = this.sel === id;
        nodes.push(`<button class="${cx('sk-node', done ? 'done' : next ? 'ready' : 'locked', sel && 'sel')}" style="left:${x}px;top:${y}px" data-act="sel" data-arg="${id}" aria-label="Lv.${lv}">
          <b class="sk-lvnum">${lv}</b><span class="${cx('sk-tip', sel && 'show')}">Lv.${lv}</span></button>`);
        prevX = x;
      });
      return { lines: lines.join(''), nodes: nodes.join(''), count: lvs.length, p };
    };
    const a = row('fishing', '낚시', 'ic_fish', PAD);
    const b = row('foraging', '채집', 'ic_forage', PAD + ROW_H * 2);
    const W = PAD * 2 + Math.max(a.count, b.count) * COL_W + NODE;
    const H = PAD * 2 + ROW_H * 2 + NODE;
    const bar = (name: string, r: typeof a) =>
      `<span class="sk-lv"><b>${name} Lv.${r.p.level}</b></span><div class="sk-xp small"><i style="width:${r.p.level >= 10 ? 100 : r.p.ratio * 100}%"></i></div>`;
    return `<div class="sk-head">${bar('낚시', a)}${bar('채집', b)}<span class="sk-count tiny muted">농사·목축 레벨과 무관한 선택 콘텐츠</span></div>
      <div class="sk-board"><div class="sk-canvas" style="width:${W}px;height:${H}px"><svg class="sk-lines" width="${W}" height="${H}">${a.lines}${b.lines}</svg>${a.nodes}${b.nodes}</div></div>`;
  }

  renderBody(): string {
    if (this.tab === 'life') return this.lifeBoard();
    const tree = this.tab as SkillTree;
    return this.header(tree) + this.board(tree);
  }

  renderFoot(): string {
    if (this.tab === 'life') {
      if (!this.sel) return `<span class="muted small">레벨 노드를 탭하면 보너스를 볼 수 있어요. 낚시·채집을 하면 경험치가 쌓여요.</span>`;
      const [, k, lv] = this.sel.split(':');
      const p = this.w.life.progress(k as LifeSkill);
      const ok = Number(lv) <= p.level;
      return `<div class="grow small"><b>${k === 'fishing' ? '낚시' : '채집'} Lv.${lv}</b> ${esc(LIFE_PERKS[k as LifeSkill][Number(lv)] ?? '')}</div><span class="chip ${ok ? 'green' : ''}">${ok ? '획득' : `현재 Lv.${p.level}`}</span>`;
    }
    if (!this.sel) return `<span class="muted small">기술을 탭하면 설명이 나와요. 반짝이는 테두리는 지금 연구할 수 있는 기술이에요.</span>`;
    const n = SKILL_BY_ID[this.sel];
    const w = this.w;
    const done = w.skills.has(n.id);
    const c = w.skills.check(n.id);
    const treeName = n.tree === 'farming' ? '농사' : '목축';
    const otherTree: SkillTree = n.tree === 'farming' ? 'livestock' : 'farming';
    const otherName = n.tree === 'farming' ? '목축' : '농사';
    const reqs = n.requires.map((r) => `<span class="chip ${w.skills.has(r) ? 'green' : 'red'}">${esc(SKILL_BY_ID[r].name)}</span>`).join(' ');
    return `${iconHtml(skillIcon(n), 36)}<div class="grow" style="min-width:0"><b>${esc(n.name)}</b> <span class="small">${esc(n.desc)}</span>
      <div class="row wrap tiny" style="margin-top:2px"><span class="chip ${w.skills.level(n.tree) >= n.level ? 'green' : 'red'}">${treeName} Lv.${n.level}</span>${n.otherLevel ? `<span class="chip ${w.skills.level(otherTree) >= n.otherLevel ? 'green' : 'red'}">${otherName} Lv.${n.otherLevel}</span>` : ''}${reqs}${n.advanced ? '<span class="chip gold">고급 기술</span>' : ''}</div></div>
      ${done ? '<span class="chip green">연구 완료</span>' : `<button class="btn green" data-act="research" ${c.ok ? '' : 'disabled'}>${c.ok ? `연구 ${n.cost.toLocaleString()}G` : esc(c.reason ?? '')}</button>`}`;
  }

  onAction(act: string, arg: string): void {
    if (this.dragging?.moved) return;
    if (act === 'sel') this.sel = this.sel === arg ? null : arg;
    else if (act === 'research' && this.sel) {
      const r = this.w.skills.research(this.sel);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    }
    this.refresh();
  }
}
