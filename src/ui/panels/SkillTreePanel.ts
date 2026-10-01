/** 농사 / 목축 스킬트리 (기술 연구) */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { SKILL_BY_ID, type SkillTree } from '../../data/skills';
import { cx, esc } from '../dom';
import { LIFE_PERKS, type LifeSkill } from '../../systems/LifeSystem';

const COL_NAMES: Record<SkillTree, string[]> = {
  farming: ['작물 · 비료', '관개 · 자동화', '저장', '가공 · 온실'],
  livestock: ['가금', '가축', '브리딩 · 혈통', '자동화 · 가공'],
};

export class SkillTreePanel extends Panel {
  readonly id = 'skills';
  title = '기술 연구';
  tabs = [
    { id: 'farming', label: '농사', icon: 'ic_farming' },
    { id: 'livestock', label: '목축', icon: 'ic_livestock' },
    { id: 'life', label: '생활 숙련도', icon: 'ic_fish' },
  ];
  watch: Watch = ['gold', 'research', 'levelUp'];
  private sel: string | null = null;

  constructor(tree: SkillTree | 'life') {
    super();
    this.tab = tree;
  }

  onTab(): void {
    this.sel = null;
  }

  private lifeTab(): string {
    const w = this.w;
    const block = (k: LifeSkill, name: string, icon: string, desc: string) => {
      const p = w.life.progress(k);
      const perks = Object.entries(LIFE_PERKS[k])
        .map(([lv, t]) => `<div class="row small ${Number(lv) <= p.level ? 'good' : 'muted'}"><span class="chip ${Number(lv) <= p.level ? 'green' : ''}">Lv.${lv}</span>${esc(t)}</div>`)
        .join('');
      return `<div class="card"><div class="row">${iconHtml(icon, 32)}<b>${name} Lv.${p.level}</b><div class="bar grow"><i style="width:${p.ratio * 100}%"></i></div><span class="tiny muted">${p.level >= 10 ? 'MAX' : `${p.cur}/${p.need}`}</span></div>
        <div class="tiny muted" style="margin:0.3rem 0">${desc}</div><div class="col" style="gap:3px">${perks}</div></div>`;
    };
    return `<div class="small muted" style="margin-bottom:0.5rem">생활 숙련도는 완전히 선택 콘텐츠예요. 농사·목축 레벨이나 기술 연구 조건과는 관계없어요.</div>
      <div class="grid cols-2">${block('fishing', '낚시', 'ic_fish', '강가에서 물고기를 낚으면 경험치를 얻어요.')}${block('foraging', '채집', 'ic_forage', '채집·벌목·채광·상자 열기로 경험치를 얻어요.')}</div>`;
  }

  renderBody(): string {
    const w = this.w;
    if (this.tab === 'life') return this.lifeTab();
    const tree = this.tab as SkillTree;
    const prog = w.skills.progress(tree);
    const other = w.skills.progress(tree === 'farming' ? 'livestock' : 'farming');
    const nodes = w.skills.nodes(tree);
    const cols = COL_NAMES[tree];
    const colHtml = cols
      .map((cname, ci) => {
        const items = nodes
          .filter((n) => n.col === ci)
          .sort((a, b) => a.row - b.row)
          .map((n) => {
            const done = w.skills.has(n.id);
            const c = w.skills.check(n.id);
            const ready = !done && c.ok;
            const lockedHard = !done && !ready && (w.skills.level(tree) < n.level || n.requires.some((r) => !w.skills.has(r)));
            return `<button class="${cx('skill-node', done && 'done', ready && 'ready', lockedHard && 'locked', this.sel === n.id && 'sel')}" data-act="sel" data-arg="${n.id}" style="${this.sel === n.id ? 'box-shadow:0 0 0 3px var(--blue)' : ''}">
              <b class="small">${esc(n.name)}</b>
              <span class="tiny muted">${done ? '연구 완료' : `Lv.${n.level}${n.otherLevel ? ` · ${tree === 'farming' ? '목축' : '농사'} ${n.otherLevel}` : ''}`}</span>
              <span class="tiny ${done ? 'good' : ''}">${done ? '✓' : `${n.cost.toLocaleString()}G`}</span></button>`;
          })
          .join('');
        return `<div class="col"><div class="tiny muted center bold">${cname}</div>${items}</div>`;
      })
      .join('');
    return `<div class="card row wrap" style="margin-bottom:0.6rem">${iconHtml(tree === 'farming' ? 'ic_farming' : 'ic_livestock', 28)}
        <b>${tree === 'farming' ? '농사' : '목축'} Lv.${prog.level}</b><div class="bar grow" style="min-width:6rem"><i style="width:${prog.ratio * 100}%"></i></div>
        <span class="tiny muted">${prog.level >= 10 ? 'MAX' : `${prog.cur}/${prog.need} XP`}</span>
        <span class="chip">${tree === 'farming' ? '목축' : '농사'} Lv.${other.level}</span></div>
      <div class="tiny muted" style="margin-bottom:0.5rem">${tree === 'farming' ? '작물을 키우고 수확하면' : '동물을 돌보고 생산품을 얻고 브리딩하면'} 경험치를 얻어요. 고급 기술은 상대 분야 레벨도 필요해요.</div>
      <div class="grid" style="grid-template-columns:repeat(4,minmax(0,1fr))">${colHtml}</div>`;
  }

  renderFoot(): string {
    if (this.tab === 'life') return '';
    if (!this.sel) return `<span class="muted small">기술을 탭하면 자세한 설명이 나와요.</span>`;
    const n = SKILL_BY_ID[this.sel];
    const w = this.w;
    const done = w.skills.has(n.id);
    const c = w.skills.check(n.id);
    const reqs = n.requires.map((r) => `<span class="chip ${w.skills.has(r) ? 'green' : 'red'}">${esc(SKILL_BY_ID[r].name)}</span>`).join(' ');
    return `<div class="grow" style="min-width:0"><b>${esc(n.name)}</b> <span class="small">${esc(n.desc)}</span>
      <div class="row wrap tiny" style="margin-top:2px">${reqs}${n.advanced ? '<span class="chip gold">고급 기술</span>' : ''}</div></div>
      ${done ? '<span class="chip green">연구 완료</span>' : `<button class="btn green" data-act="research" ${c.ok ? '' : 'disabled'}>${c.ok ? `연구 ${n.cost.toLocaleString()}G` : esc(c.reason ?? '')}</button>`}`;
  }

  onAction(act: string, arg: string): void {
    if (act === 'sel') this.sel = arg;
    else if (act === 'research' && this.sel) {
      const r = this.w.skills.research(this.sel);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    }
    this.refresh();
  }
}
