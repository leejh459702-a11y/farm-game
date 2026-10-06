/**
 * 기술 연구 — 노드 그래프형 스킬트리
 * 양피지 격자 보드 위에 아이콘 노드를 선으로 잇고, 시작 노드에서 오른쪽으로 갈라져 나간다.
 * 노드를 탭하면 이름 말풍선 + 하단에 설명/연구 버튼.
 */
import { Panel, type Watch } from '../Panel';
import { Art, iconHtml } from '../../assets/AssetRegistry';
import { SKILLS, SKILL_BY_ID, TREES, TREE_ICON, TREE_NAME, type SkillNode, type SkillTree } from '../../data/skills';
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
  f_aging: 'bld_cellar',
  f_m_seed: 'it_seed_goldenmelon',
  f_m_special: 'it_goldenmelon',
  l_m_pedigree: 'ic_star',
  l_m_trait: 'ic_breed',
  fi_bait: 'it_rare_bait',
  fi_pond: 'bld_fishpond',
  fi_rare: 'it_carp',
  fi_pondAuto: 'it_fish_feed',
  fi_legend: 'it_golden_catfish',
  fi_m_legend: 'it_ice_king',
  fi_m_pond: 'it_pearl',
  ga_tools: 'tool_axe',
  ga_mine: 'ic_mine',
  ga_geode: 'it_geode',
  ga_deep: 'it_magma_geode',
  ga_relic: 'it_art_gear',
  ga_m_rare: 'it_star_crystal',
  ga_m_gem: 'it_ruby',
  b_trader: 'ic_coin',
  b_bulk: 'ic_process',
  b_regular: 'ic_merchant',
  b_brand: 'ic_star',
  b_m_aging: 'it_wine',
  b_m_mass: 'it_cheese',
  b_m_auto: 'ic_auto',
};

function skillIcon(n: SkillNode): string {
  const k = SKILL_ICON[n.id];
  return k && Art.has(k) ? k : TREE_ICON[n.tree];
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
  tabs = TREES.map((t) => ({ id: t, label: TREE_NAME[t], icon: TREE_ICON[t] }));
  watch: Watch = ['gold', 'research', 'levelUp'];
  private sel: string | null = null;
  private dragging: { x: number; y: number; sl: number; st: number; moved: boolean } | null = null;

  constructor(tree: SkillTree | 'life') {
    super();
    this.tab = tree === 'life' ? 'fishing' : tree;
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
    const otherTree: SkillTree = tree === 'farming' ? 'livestock' : 'farming';
    const other = w.skills.progress(otherTree);
    const list = SKILLS.filter((s) => s.tree === tree);
    const done = list.filter((s) => w.skills.has(s.id)).length;
    const ready = list.filter((s) => !w.skills.has(s.id) && w.skills.check(s.id).ok).length;
    const how: Record<SkillTree, string> = { farming: '작물 수확', livestock: '동물 돌보기·생산·브리딩', fishing: '낚시·양식', gathering: '채집·벌목·채광', business: '가공·요리·판매' };
    return `<div class="sk-head">
      <span class="sk-lv">${iconHtml(TREE_ICON[tree], 20)}<b>${TREE_NAME[tree]} Lv.${prog.level}</b>${prog.level >= 10 ? ' <span class="chip gold">마스터리</span>' : ''}</span>
      <div class="sk-xp" title="${prog.level >= 10 ? 'MAX' : `${prog.cur}/${prog.need} XP`}"><i style="width:${prog.level >= 10 ? 100 : prog.ratio * 100}%"></i></div>
      <span class="tiny muted">경험치: ${how[tree]}${tree === 'farming' || tree === 'livestock' ? ` · ${TREE_NAME[otherTree]} Lv.${other.level}` : ''}</span>
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
          return `<div class="sk-node root done" style="left:${p.x}px;top:${p.y}px">${iconHtml(TREE_ICON[tree], 30)}<span class="sk-tip show">${TREE_NAME[tree]}</span></div>`;
        }
        const n = SKILL_BY_ID[p.id];
        const done = w.skills.has(n.id);
        const ready = !done && w.skills.check(n.id).ok;
        const sel = this.sel === n.id;
        return `<button class="${cx('sk-node', done && 'done', ready && 'ready', !done && !ready && 'locked', n.advanced && 'adv', n.mastery && 'mastery', sel && 'sel')}" style="left:${p.x}px;top:${p.y}px" data-act="sel" data-arg="${n.id}" aria-label="${esc(n.name)}">
          ${iconHtml(skillIcon(n), 30)}<span class="${cx('sk-tip', sel && 'show')}">${esc(n.name)}</span></button>`;
      })
      .join('');
    return `<div class="sk-board"><div class="sk-canvas" style="width:${L.w}px;height:${L.h}px">
      <svg class="sk-lines" width="${L.w}" height="${L.h}">${lines}</svg>${nodes}</div></div>`;
  }

  renderBody(): string {
    const tree = this.tab as SkillTree;
    const perks = tree === 'fishing' || tree === 'gathering' ? this.perkRow(tree === 'fishing' ? 'fishing' : 'foraging') : '';
    return this.header(tree) + this.board(tree) + perks;
  }

  /** 낚시·채집채광: 레벨 보너스 사슬 */
  private perkRow(k: LifeSkill): string {
    const w = this.w;
    const p = w.life.progress(k);
    const lvs = Object.keys(LIFE_PERKS[k]).map(Number).sort((a, b) => a - b);
    return `<div class="section-title" style="margin-top:0.4rem">${iconHtml('ic_star', 16)} 레벨 보너스 <span class="tiny muted">(레벨이 오르면 자동으로 적용)</span></div>
      <div class="row wrap" style="gap:3px">${lvs.map((lv) => `<span class="chip ${lv <= p.level ? 'green' : ''}" title="${esc(LIFE_PERKS[k][lv])}">Lv.${lv} ${esc(LIFE_PERKS[k][lv])}</span>`).join('')}</div>`;
  }

  renderFoot(): string {
    if (!this.sel) return `<span class="muted small">기술을 탭하면 설명이 나와요. 반짝이는 테두리는 지금 연구할 수 있는 기술이에요.</span>`;
    const n = SKILL_BY_ID[this.sel];
    const w = this.w;
    const done = w.skills.has(n.id);
    const c = w.skills.check(n.id);
    const treeName = TREE_NAME[n.tree];
    const otherTree: SkillTree = w.skills.otherOf(n);
    const otherName = TREE_NAME[otherTree];
    const reqs = n.requires.map((r) => `<span class="chip ${w.skills.has(r) ? 'green' : 'red'}">${esc(SKILL_BY_ID[r].name)}</span>`).join(' ');
    return `${iconHtml(skillIcon(n), 36)}<div class="grow" style="min-width:0"><b>${esc(n.name)}</b> <span class="small">${esc(n.desc)}</span>
      <div class="row wrap tiny" style="margin-top:2px"><span class="chip ${w.skills.level(n.tree) >= n.level ? 'green' : 'red'}">${treeName} Lv.${n.level}</span>${n.otherLevel ? `<span class="chip ${w.skills.level(otherTree) >= n.otherLevel ? 'green' : 'red'}">${otherName} Lv.${n.otherLevel}</span>` : ''}${reqs}${n.mastery ? '<span class="chip gold">마스터리</span>' : n.advanced ? '<span class="chip gold">고급 기술</span>' : ''}</div></div>
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
