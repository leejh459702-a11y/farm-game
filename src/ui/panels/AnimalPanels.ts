/** 축사 관리 / 축사 자동화 / 동물 목록 / 동물 상세 / 혈통도 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { ANIMAL_BY_ID, ANIMALS, GROWTH_STAGE_NAME, TRAIT_BY_ID } from '../../data/animals';
import { BUILDING_BY_ID } from '../../data/buildings';
import { ITEM_BY_ID } from '../../data/items';
import { BALANCE } from '../../data/balance';
import { SKILL_BY_ID } from '../../data/skills';
import type { Animal, PedigreeRecord } from '../../types/game';
import { animalScore } from '../../systems/CodexSystem';
import { productAmount } from '../../systems/AnimalSystem';
import { cx, esc } from '../dom';
import { confirmDialog, promptDialog } from '../dialogs';

export function genderIcon(g: 'F' | 'M', size = 18): string {
  return iconHtml(g === 'F' ? 'ic_female' : 'ic_male', size);
}

export function gradeChip(g: 1 | 2 | 3): string {
  return `<span class="chip ${g === 1 ? 'gold' : g === 2 ? 'blue' : ''}">${g}등급</span>`;
}

function animalRow(a: Animal, extra = ''): string {
  const d = ANIMAL_BY_ID[a.species];
  return `<div class="list-row click" data-act="detail" data-arg="${a.id}">${iconHtml(`portrait_${a.species}`, 40)}
    <div class="grow" style="min-width:0"><div class="row" style="gap:0.3rem"><b class="ellipsis">${esc(a.name)}</b>${genderIcon(a.gender)}${gradeChip(a.grade)}${a.pregnant ? `<span class="chip purple">임신 ${a.pregnant.daysLeft}일</span>` : ''}${a.favorite ? '<span class="tiny" style="color:#d9a020">★</span>' : ''}</div>
    <div class="tiny muted">${a.id} · ${d.name} · ${GROWTH_STAGE_NAME[a.stage]}${a.lineage ? ` · ${esc(a.lineage)} 혈통` : ''} · ${a.fedToday ? '<span class="good">먹음</span>' : '<span class="bad">배고픔</span>'} · ${a.pettedToday ? '쓰다듬음' : '<span>쓰다듬기 전</span>'}</div>
    <div class="row" style="gap:0.3rem">${iconHtml('ic_heart', 14)}<div class="bar" style="width:5rem"><i style="width:${a.affection}%;background:linear-gradient(#ffb0bc,#e8586a)"></i></div></div></div>${extra}</div>`;
}

const UPG: Record<string, { name: string; icon: string; desc: string[] }> = {
  autoFeed: { name: '자동 급식', icon: 'it_hay', desc: ['직접 먹이 주기', '아침마다 창고 건초로 자동 급식', '건초가 없으면 소액으로 자동 조달'] },
  autoClean: { name: '자동 청소', icon: 'ic_auto', desc: ['직접 청소', '매일 자동 청소'] },
  autoCollect: { name: '자동 생산품 수거', icon: 'ic_storage', desc: ['직접 수거', '아침마다 창고로 자동 수거'] },
  capacity: { name: '축사 확장', icon: 'ic_build', desc: ['기본 수용', `+${BALANCE.barnCapacityPerLevel}마리`, `+${BALANCE.barnCapacityPerLevel * 2}마리`] },
};

export class BarnPanel extends Panel {
  readonly id = 'barn';
  watch: Watch = ['animals', 'inventory', 'gold'];
  tabs = [
    { id: 'animals', label: '동물', icon: 'ic_livestock' },
    { id: 'auto', label: '축사 자동화', icon: 'ic_auto' },
  ];

  constructor(private uid: string) {
    super();
  }

  onOpen(): void {
    this.title = BUILDING_BY_ID[this.w.state.buildings[this.uid].type].name;
  }

  renderBody(): string {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return '';
    const animals = w.animals.animalsIn(b);
    const cap = w.animals.capacity(b);
    if (this.tab === 'auto') {
      const rows = Object.entries(UPG)
        .map(([type, info]) => {
          const cur = b.upgrades?.[type] ?? 0;
          const u = w.automation.barnUpgradeInfo(type, cur);
          const sk = BALANCE.barnUpgrades[type].skill[u.next];
          return `<div class="list-row">${iconHtml(info.icon, 32)}<div class="grow"><b>${info.name}</b> <span class="chip">Lv.${cur}</span>
            <div class="tiny muted">${esc(info.desc[cur] ?? '')}${!u.max ? ` → ${esc(info.desc[u.next] ?? '')}` : ''}</div></div>
            ${u.max ? '<span class="chip green">최대</span>' : u.locked ? `<span class="chip red tiny">${esc(SKILL_BY_ID[sk]?.name ?? '')} 연구 필요</span>` : `<button class="btn small green" data-act="upgrade" data-arg="${type}" ${w.state.gold < u.cost ? 'disabled' : ''}>${u.cost.toLocaleString()}G</button>`}</div>`;
        })
        .join('');
      return `<div class="card small muted" style="margin-bottom:0.5rem">자동화 시설은 따로 설치하지 않아요. 축사 내부를 업그레이드하면 외형은 그대로 두고 일손을 덜어 줍니다. (수익 증가가 아닌 시간 절약)</div><div class="list">${rows}</div>`;
    }
    const hungry = animals.filter((a) => !a.fedToday && !a.shipping).length;
    const need = animals.filter((a) => !a.fedToday).reduce((s, a) => s + w.animals.feedNeed(a), 0);
    const hay = w.inventory.countAll('hay');
    const pending = w.animals.pendingOutput(b);
    const dirt = b.dirt ?? 0;
    const unpetted = animals.filter((a) => !a.pettedToday).length;
    const products = w.state.containers[b.outputId!]?.slots.filter(Boolean) ?? [];
    return `<div class="row wrap" style="margin-bottom:0.5rem">
        <span class="chip">${animals.length}/${cap}마리</span>
        <span class="chip ${dirt >= 60 ? 'red' : dirt >= 30 ? 'gold' : 'green'}">청결 ${100 - dirt}%</span>
        <span class="chip">건초 ${hay}개</span>
        ${b.upgrades?.autoFeed ? '<span class="chip blue">자동 급식</span>' : ''}${b.upgrades?.autoCollect ? '<span class="chip blue">자동 수거</span>' : ''}${b.upgrades?.autoClean ? '<span class="chip blue">자동 청소</span>' : ''}
      </div>
      <div class="row wrap" style="margin-bottom:0.6rem">
        <button class="btn small green" data-act="feed" ${hungry ? '' : 'disabled'}>${iconHtml('it_hay', 20)}먹이 주기 (${need})</button>
        <button class="btn small" data-act="pet" ${unpetted ? '' : 'disabled'}>${iconHtml('ic_heart', 20)}모두 쓰다듬기</button>
        <button class="btn small blue" data-act="collect" ${pending ? '' : 'disabled'}>${iconHtml('ic_bag', 20)}생산물 수거 (${pending})</button>
        <button class="btn small" data-act="clean" ${dirt ? '' : 'disabled'}>청소</button>
        ${w.inventory.countAll('golden_feed') ? `<button class="btn small gold" data-act="golden">특제 사료</button>` : ''}
      </div>
      ${products.length ? `<div class="card row wrap" style="margin-bottom:0.5rem"><span class="small muted">대기 중:</span>${products.map((s) => `${iconHtml(ITEM_BY_ID[s!.itemId].icon, 24)}<b>×${s!.qty}</b>`).join(' ')}</div>` : ''}
      <div class="list">${animals.map((a) => animalRow(a)).join('') || `<div class="empty-msg">아직 동물이 없어요.<br>방문상인에게서 ${BUILDING_BY_ID[b.type].desc.replace(' 사육.', '')}을(를) 데려올 수 있어요.</div>`}</div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    const b = w.state.buildings[this.uid];
    if (!b) return;
    switch (act) {
      case 'detail':
        this.manager.open(new AnimalDetailPanel(arg));
        return;
      case 'feed': {
        const r = w.animals.feedBarn(b);
        if (r.hungry) this.toast(`건초가 부족해 ${r.hungry}마리가 아직 배고파요`, 'warn');
        break;
      }
      case 'pet':
        w.animals.petAll(b);
        break;
      case 'collect': {
        const n = w.animals.collect(b);
        if (n) this.toast(`${n}개 수거했습니다`, 'good');
        else this.toast('가방과 창고가 가득 찼어요', 'warn');
        break;
      }
      case 'clean':
        w.animals.cleanBarn(b);
        break;
      case 'golden':
        w.animals.goldenFeed(b);
        break;
      case 'upgrade': {
        const r = w.automation.barnUpgrade(this.uid, arg);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        break;
      }
    }
    this.refresh();
  }
}

export class AnimalListPanel extends Panel {
  readonly id = 'animalList';
  title = '동물 목록';
  watch: Watch = ['animals'];
  private species = 'all';
  private sort: 'grade' | 'name' | 'species' = 'grade';

  renderBody(): string {
    const w = this.w;
    const owned = new Set(w.animals.list().map((a) => a.species));
    let list = w.animals.list();
    if (this.species !== 'all') list = list.filter((a) => a.species === this.species);
    list.sort((a, b) => (this.sort === 'grade' ? a.grade - b.grade || animalScore(b) - animalScore(a) : this.sort === 'name' ? a.name.localeCompare(b.name) : a.species.localeCompare(b.species)));
    const filters = [`<button class="${cx('btn small', this.species === 'all' && 'blue')}" data-act="sp" data-arg="all">전체 ${w.animals.list().length}</button>`]
      .concat(ANIMALS.filter((a) => owned.has(a.id)).map((a) => `<button class="${cx('btn small', this.species === a.id && 'blue')}" data-act="sp" data-arg="${a.id}">${iconHtml(`portrait_${a.id}`, 20)}${a.name}</button>`))
      .join('');
    const homeless = list.filter((a) => !a.buildingUid);
    return `<div class="row wrap" style="margin-bottom:0.4rem">${filters}</div>
      <div class="row" style="margin-bottom:0.5rem"><span class="small muted">정렬</span><div class="seg">${(['grade', 'species', 'name'] as const).map((s) => `<button class="${cx(this.sort === s && 'on')}" data-act="sort" data-arg="${s}">${{ grade: '등급', species: '종', name: '이름' }[s]}</button>`).join('')}</div></div>
      ${homeless.length ? `<div class="card" style="border-color:var(--red);margin-bottom:0.5rem"><b class="bad">머물 곳이 없는 동물 ${homeless.length}마리</b> — 축사를 짓거나 확장한 뒤 상세 화면에서 이동하세요.</div>` : ''}
      <div class="list">${list.map((a) => animalRow(a)).join('') || '<div class="empty-msg">아직 동물이 없어요. 목축 기술 [닭]을 연구하고 닭장을 지어 보세요.</div>'}</div>`;
  }

  onAction(act: string, arg: string): void {
    if (act === 'sp') this.species = arg;
    else if (act === 'sort') this.sort = arg as 'grade';
    else if (act === 'detail') return void this.manager.open(new AnimalDetailPanel(arg));
    this.refresh();
  }
}

const STAT_NAMES: [keyof Animal['stats'], string][] = [
  ['productivity', '생산력'],
  ['growth', '성장력'],
  ['health', '건강'],
  ['fertility', '번식력'],
  ['physique', '체격'],
];

export class AnimalDetailPanel extends Panel {
  readonly id = 'animalDetail';
  size = 'medium' as const;
  watch: Watch = ['animals', 'merchant'];
  showBack = true;

  constructor(private animalId: string) {
    super();
  }

  renderBody(): string {
    const w = this.w;
    const a = w.animals.get(this.animalId);
    if (!a) return `<div class="empty-msg">이 동물은 더 이상 농장에 없어요.</div>`;
    const d = ANIMAL_BY_ID[a.species];
    this.title = `${a.name} (${a.id})`;
    const parent = (id: string | null) => {
      if (!id) return '<span class="muted">-</span>';
      const p = w.state.pedigree[id];
      return p ? `${esc(p.name)} <span class="tiny muted">${p.id} · ${p.grade}등급${p.status !== 'alive' ? ` · ${p.status === 'sold' ? '판매됨' : '출하됨'}` : ''}</span>` : id;
    };
    const barn = a.buildingUid ? w.state.buildings[a.buildingUid] : null;
    const stats = STAT_NAMES.map(([k, n]) => `<div class="stat-bar"><span>${n}</span><div class="bar ${a.stats[k] >= 70 ? 'gold' : ''}"><i style="width:${a.stats[k]}%"></i></div><b>${a.stats[k]}</b></div>`).join('');
    const traits = a.traits.length ? a.traits.map((t) => `<span class="chip purple" title="${esc(TRAIT_BY_ID[t].desc)}">${esc(TRAIT_BY_ID[t].name)}</span>`).join(' ') : '<span class="muted small">특성 없음</span>';
    return `<div class="row" style="align-items:flex-start;gap:0.8rem">
      <div class="card center" style="min-width:7.5rem">${iconHtml(`portrait_${a.species}`, 72)}<div class="row center" style="gap:0.3rem">${genderIcon(a.gender)}${gradeChip(a.grade)}</div>
        <div class="tiny muted">${GROWTH_STAGE_NAME[a.stage]} · ${a.age}일</div>
        <div class="row center" style="gap:0.2rem">${iconHtml('ic_heart', 14)}<div class="bar" style="width:4.5rem"><i style="width:${a.affection}%;background:linear-gradient(#ffb0bc,#e8586a)"></i></div></div></div>
      <div class="col grow">${stats}<div class="row wrap">${traits}</div></div></div>
      <div class="kv card" style="margin-top:0.5rem">
        <span>종</span><span>${d.name} · 생산품 ${d.product ? `${ITEM_BY_ID[d.product].name} (${d.productInterval}일마다, 예상 ${productAmount(a).toFixed(1)}개)` : '-'}</span>
        <span>축사</span><span>${barn ? esc(BUILDING_BY_ID[barn.type].name) : '<b class="bad">없음</b>'}</span>
        <span>혈통</span><span>${a.lineage ? `<b>${esc(a.lineage)}</b>` : '<span class="muted">-</span>'}</span>
        <span>어미</span><span>${parent(a.motherId)}</span>
        <span>아비</span><span>${parent(a.fatherId)}</span>
        <span>자식</span><span>${a.childIds.length}마리 · 출산 ${a.births}회</span>
        <span>생산 기록</span><span>${a.produced}개</span>
        <span>상태</span><span>${a.pregnant ? `<b class="good">임신 중 (${a.pregnant.daysLeft}일 후 출산)</b>` : a.breedCooldown ? `휴식 ${a.breedCooldown}일` : '건강함'} · ${a.fedToday ? '먹음' : '배고픔'}</span>
      </div>`;
  }

  renderFoot(): string {
    const w = this.w;
    const a = w.animals.get(this.animalId);
    if (!a) return '';
    const merchant = w.state.merchant.present;
    return `<button class="btn small" data-act="pet" ${a.pettedToday ? 'disabled' : ''}>${iconHtml('ic_heart', 18)}쓰다듬기</button>
      ${w.inventory.countAll('treat') ? `<button class="btn small" data-act="treat">간식</button>` : ''}
      <button class="btn small" data-act="rename">이름</button>
      ${w.skills.has('l_pedigree') ? `<button class="btn small" data-act="lineage">혈통 이름</button><button class="btn small purple" data-act="tree">혈통도</button>` : ''}
      <button class="btn small" data-act="move">축사 이동</button>
      <button class="btn small" data-act="fav">${a.favorite ? '★ 해제' : '☆ 아끼기'}</button>
      ${w.skills.has('l_meat') && ANIMAL_BY_ID[a.species].meat ? `<button class="btn small red" data-act="ship">출하</button>` : ''}
      ${merchant ? `<button class="btn small gold" data-act="sell">판매 ${w.animals.sellPrice(a, w.state.merchant.sellBonus).toLocaleString()}G</button>` : ''}`;
  }

  onAction(act: string): void {
    const w = this.w;
    const a = w.animals.get(this.animalId);
    if (!a) return;
    switch (act) {
      case 'pet': {
        const r = w.animals.pet(a.id);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        break;
      }
      case 'treat': {
        const r = w.animals.pet(a.id, true);
        if (!r.ok) this.toast(r.reason ?? '', 'warn');
        break;
      }
      case 'rename':
        promptDialog('이름 바꾸기', '새 이름 (최대 12자)', a.name, (v) => v && w.animals.rename(a.id, v));
        return;
      case 'lineage':
        promptDialog('혈통 이름', '이 개체와 자손에게 이어질 혈통 이름', a.lineage ?? '', (v) => w.animals.setLineage(a.id, v));
        return;
      case 'tree':
        this.manager.open(new PedigreePanel(a.id));
        return;
      case 'fav':
        a.favorite = !a.favorite;
        break;
      case 'move': {
        const homes = w.animals.barns().filter((b) => b.uid !== a.buildingUid && w.animals.canHouse(b, a.species));
        if (!homes.length) return this.toast('옮길 수 있는 축사가 없습니다', 'warn');
        this.manager.open(new MoveAnimalPanel(a.id));
        return;
      }
      case 'ship':
        confirmDialog('출하', `${esc(a.name)}을(를) 육가공소로 출하할까요?<br><span class="muted small">일정 시간 뒤 고기 등 생산물을 받습니다. 되돌릴 수 없어요.</span>`, '출하', () => {
          const r = w.animals.ship(a.id);
          if (!r.ok) this.toast(r.reason ?? '', 'warn');
          else this.close();
        }, true);
        return;
      case 'sell':
        confirmDialog('판매', `${esc(a.name)}을(를) 판매할까요?`, '판매', () => {
          const r = w.merchant.sellAnimal(a.id);
          if (!r.ok) this.toast(r.reason ?? '', 'warn');
          else {
            this.toast(`+${r.gold!.toLocaleString()}G`, 'good');
            this.close();
          }
        }, true);
        return;
    }
    this.refresh();
  }
}

class MoveAnimalPanel extends Panel {
  readonly id = 'moveAnimal';
  size = 'small' as const;
  title = '축사 이동';
  constructor(private animalId: string) {
    super();
  }
  renderBody(): string {
    const w = this.w;
    const a = w.animals.get(this.animalId)!;
    const homes = w.animals.barns().filter((b) => b.uid !== a.buildingUid && w.animals.canHouse(b, a.species));
    return `<div class="list">${homes.map((b) => `<button class="list-row click" data-act="go" data-arg="${b.uid}">${iconHtml(BUILDING_BY_ID[b.type].spriteKey, 36)}<b class="grow" style="text-align:left">${BUILDING_BY_ID[b.type].name}</b><span class="chip">${b.animalIds!.length}/${w.animals.capacity(b)}</span></button>`).join('')}</div>`;
  }
  onAction(act: string, arg: string): void {
    if (act !== 'go') return;
    const r = this.w.animals.moveTo(this.animalId, arg);
    if (!r.ok) this.toast(r.reason ?? '', 'warn');
    this.close();
  }
}

/** 혈통도: 본인 → 부모 → 조부모 → 증조부모 */
export class PedigreePanel extends Panel {
  readonly id = 'pedigree';
  title = '혈통도';
  showBack = true;
  constructor(private animalId: string) {
    super();
  }

  private node(rec: PedigreeRecord | null, role: string): string {
    if (!rec) return `<div class="ped-node unknown"><span class="tiny muted">${role} 기록 없음</span></div>`;
    return `<div class="ped-node ${rec.gender}"><b class="ellipsis" style="display:block">${esc(rec.name)}</b><span class="tiny muted">${rec.id}</span><br><span class="tiny">${rec.grade}등급${rec.lineage ? ` · ${esc(rec.lineage)}` : ''}${rec.traits.length ? ` · ${rec.traits.map((t) => TRAIT_BY_ID[t]?.name).join(',')}` : ''}</span></div>`;
  }

  renderBody(): string {
    const w = this.w;
    const self = w.state.pedigree[this.animalId];
    if (!self) return '';
    const adv = w.skills.has('l_advBreeding');
    const anc = w.breeding.ancestry(this.animalId, 3);
    const gen = (g: number) => anc.filter((x) => x.gen === g);
    const col = (g: number, label: string) => `<div class="ped-col"><div class="tiny muted center">${label}</div>${gen(g)
      .map((x) => this.node(x.rec, x.role.endsWith('M') ? '어미' : '아비'))
      .join('')}</div>`;
    if (!adv) {
      // 혈통 연구만: 3대 기록 목록
      return `<div class="card small muted" style="margin-bottom:0.5rem">고급 브리딩 연구 시 가계도 화면이 해금됩니다. 지금은 3대 기록을 목록으로 볼 수 있어요.</div>
        <div class="list">${anc.map((x) => `<div class="list-row"><span class="chip">${['', '부모', '조부모', '증조부모'][x.gen]}</span>${x.rec ? `<b>${esc(x.rec.name)}</b><span class="tiny muted">${x.rec.id} · ${x.rec.grade}등급</span>` : '<span class="muted">기록 없음</span>'}</div>`).join('')}</div>`;
    }
    return `<div class="pedigree">
      <div class="ped-col"><div class="tiny muted center">본인</div>${this.node(self, '본인')}</div>
      ${col(1, '부모')}${col(2, '조부모')}${col(3, '증조부모')}</div>
      <div class="tiny muted" style="margin-top:0.5rem">분홍 테두리 = 암컷, 파랑 테두리 = 수컷</div>`;
  }
}
