/** 브리딩 (암컷+수컷 직접 선택, 자동 번식 없음) / 브리딩 결과 / 출산 결과 */
import { Panel, type Watch } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { ANIMAL_BY_ID, ANIMALS, TRAIT_BY_ID } from '../../data/animals';
import { BALANCE } from '../../data/balance';
import type { Animal } from '../../types/game';
import { cx, esc } from '../dom';
import { genderIcon, gradeChip, AnimalDetailPanel } from './AnimalPanels';

export class BreedingPanel extends Panel {
  readonly id = 'breeding';
  title = '브리딩';
  watch: Watch = ['animals', 'gold', 'inventory'];
  private species: string | null = null;
  private mother: string | null = null;
  private father: string | null = null;

  onOpen(): void {
    const sp = ANIMALS.find((a) => this.w.breeding.eligibleFemales(a.id).length && this.w.breeding.eligibleMales(a.id).length);
    this.species = sp?.id ?? ANIMALS.find((a) => this.w.animals.list().some((x) => x.species === a.id))?.id ?? null;
  }

  private card(a: Animal, kind: 'm' | 'f', selected: boolean, disabledReason = ''): string {
    return `<button class="${cx('list-row click', selected && 'sel', disabledReason && 'locked')}" data-act="${kind}" data-arg="${a.id}" style="text-align:left">${iconHtml(`portrait_${a.species}`, 36)}
      <div class="grow" style="min-width:0"><div class="row" style="gap:0.25rem"><b class="ellipsis">${esc(a.name)}</b>${genderIcon(a.gender, 16)}${gradeChip(a.grade)}</div>
      <div class="tiny muted ellipsis">${a.id}${a.traits.length ? ' · ' + a.traits.map((t) => TRAIT_BY_ID[t].name).join(', ') : ''}${disabledReason ? ` · <span class="bad">${esc(disabledReason)}</span>` : ''}</div></div></button>`;
  }

  renderBody(): string {
    const w = this.w;
    if (!w.skills.has('l_breeding')) return `<div class="empty-msg">목축 기술 [브리딩]을 연구하면 브리딩 시설을 지을 수 있어요.</div>`;
    if (!w.breeding.hasFacility()) return `<div class="empty-msg">브리딩 시설이 필요합니다. (건설 → 생산)</div>`;
    const owned = ANIMALS.filter((a) => w.animals.list().some((x) => x.species === a.id));
    if (!owned.length) return `<div class="empty-msg">브리딩할 동물이 없어요.</div>`;
    const tabs = owned.map((a) => `<button class="${cx('btn small', this.species === a.id && 'blue')}" data-act="sp" data-arg="${a.id}">${iconHtml(`portrait_${a.id}`, 20)}${a.name}</button>`).join('');
    const sp = this.species ?? owned[0].id;
    const all = w.animals.list().filter((a) => a.species === sp);
    const females = all.filter((a) => a.gender === 'F');
    const males = all.filter((a) => a.gender === 'M');
    const fReason = (a: Animal) => (a.stage !== 'adult' ? '성체 아님' : a.pregnant ? '임신 중' : a.breedCooldown > 0 ? `휴식 ${a.breedCooldown}일` : '');
    const mReason = (a: Animal) => (a.stage !== 'adult' ? '성체 아님' : '');
    const m = this.mother ? w.animals.get(this.mother) : null;
    const f = this.father ? w.animals.get(this.father) : null;
    let predict = `<div class="muted small center">암컷과 수컷을 한 마리씩 골라 주세요.</div>`;
    if (m && f) {
      const dist = w.breeding.predict(m, f);
      const check = w.breeding.check(m.id, f.id);
      const pool = [...new Set([...m.traits, ...f.traits])];
      const bar = (g: 1 | 2 | 3) => `<div class="stat-bar"><span>${g}등급</span><div class="bar ${g === 1 ? 'gold' : g === 2 ? 'blue' : ''}"><i style="width:${dist[g] * 100}%"></i></div><b>${Math.round(dist[g] * 100)}%</b></div>`;
      const days = Math.round(ANIMAL_BY_ID[m.species].pregnancyDays);
      predict = `<div class="col">${bar(1)}${bar(2)}${bar(3)}
        <div class="small">특성 유전: ${pool.length ? pool.map((t) => `<span class="chip purple">${esc(TRAIT_BY_ID[t].name)} ${Math.round(BALANCE.breeding.traitInheritChance * 100)}%</span>`).join(' ') : '<span class="muted">부모 특성 없음</span>'} <span class="tiny muted">· 새 특성 ${Math.round(BALANCE.breeding.mutationChance * 100)}%</span></div>
        <div class="small muted">임신 약 ${days}일 · 비용 ${BALANCE.breeding.breedCost}G${w.state.breedCharmActive ? ' · <b class="good">번식 부적 적용 중</b>' : ''}</div>
        <div class="row">${w.inventory.countAll('breed_charm') && !w.state.breedCharmActive ? `<button class="btn small purple" data-act="charm">번식 부적 사용</button>` : ''}
        <button class="btn green grow" data-act="breed" ${check.ok ? '' : 'disabled'}>${check.ok ? '브리딩 시작' : esc(check.reason ?? '')}</button></div></div>`;
    }
    return `<div class="row wrap" style="margin-bottom:0.5rem">${tabs}</div>
      <div class="split" style="grid-template-columns:1fr 1fr 1.1fr;height:auto">
        <div><div class="section-title">${iconHtml('ic_female', 18)} 암컷</div><div class="list">${females.map((a) => this.card(a, 'f', this.mother === a.id, fReason(a))).join('') || '<div class="muted small">암컷 없음</div>'}</div></div>
        <div><div class="section-title">${iconHtml('ic_male', 18)} 수컷</div><div class="list">${males.map((a) => this.card(a, 'm', this.father === a.id, mReason(a))).join('') || '<div class="muted small">수컷 없음</div>'}</div></div>
        <div class="card"><div class="section-title">${iconHtml('ic_heart', 18)} 예상 결과</div>${predict}</div>
      </div>
      <div class="tiny muted" style="margin-top:0.5rem">브리딩은 엔드게임에서도 자동화되지 않아요. 부모는 언제나 직접 고릅니다. 직계 가족끼리는 브리딩할 수 없어요.</div>`;
  }

  onAction(act: string, arg: string): void {
    const w = this.w;
    if (act === 'sp') {
      this.species = arg;
      this.mother = this.father = null;
    } else if (act === 'f') this.mother = this.mother === arg ? null : arg;
    else if (act === 'm') this.father = this.father === arg ? null : arg;
    else if (act === 'charm') {
      const r = w.breeding.useCharm();
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
    } else if (act === 'breed' && this.mother && this.father) {
      const m = w.animals.get(this.mother)!;
      const f = w.animals.get(this.father)!;
      const dist = w.breeding.predict(m, f);
      const r = w.breeding.breed(this.mother, this.father);
      if (!r.ok) this.toast(r.reason ?? '', 'warn');
      else this.manager.open(new BreedResultPanel(m, f, r.days!, dist));
      this.mother = null;
    }
    this.refresh();
  }
}

class BreedResultPanel extends Panel {
  readonly id = 'breedResult';
  size = 'small' as const;
  title = '브리딩 결과';
  constructor(
    private m: Animal,
    private f: Animal,
    private days: number,
    private dist: Record<1 | 2 | 3, number>,
  ) {
    super();
  }
  renderBody(): string {
    return `<div class="col center" style="align-items:center">
      <div class="row center">${iconHtml(`portrait_${this.m.species}`, 56)}${iconHtml('ic_heart', 32)}${iconHtml(`portrait_${this.f.species}`, 56)}</div>
      <b>${esc(this.m.name)} × ${esc(this.f.name)}</b>
      <div class="good bold">임신에 성공했어요! 약 ${this.days}일 후 출산 예정</div>
      <div class="small muted">1등급 ${Math.round(this.dist[1] * 100)}% · 2등급 ${Math.round(this.dist[2] * 100)}% · 3등급 ${Math.round(this.dist[3] * 100)}%</div></div>`;
  }
  renderFoot(): string {
    return `<button class="btn green block" data-act="ok">확인</button>`;
  }
  onAction(): void {
    this.close();
  }
}

/** 출산 결과 (새끼 정보) */
export class BirthResultPanel extends Panel {
  readonly id = 'birthResult';
  size = 'medium' as const;
  title = '출산!';
  pausesTime = true;
  constructor(
    private motherId: string,
    private babyIds: string[],
  ) {
    super();
  }
  renderBody(): string {
    const w = this.w;
    const mom = w.state.pedigree[this.motherId];
    return `<div class="center small muted" style="margin-bottom:0.4rem">${esc(mom?.name ?? '')}(${this.motherId})이(가) ${this.babyIds.length}마리를 낳았어요!</div>
      <div class="grid cols-2">${this.babyIds
        .map((id) => {
          const a = w.animals.get(id);
          if (!a) return '';
          return `<button class="card col center" data-act="open" data-arg="${id}" style="align-items:center">${iconHtml(`portrait_${a.species}`, 56)}<div class="row center" style="gap:0.3rem"><b>${esc(a.name)}</b>${genderIcon(a.gender)}${gradeChip(a.grade)}</div>
          <div class="tiny muted">${a.id}</div>
          <div class="tiny">생산 ${a.stats.productivity} · 성장 ${a.stats.growth} · 건강 ${a.stats.health} · 번식 ${a.stats.fertility} · 체격 ${a.stats.physique}</div>
          <div class="row wrap center">${a.traits.map((t) => `<span class="chip purple">${esc(TRAIT_BY_ID[t].name)}</span>`).join('') || '<span class="tiny muted">특성 없음</span>'}</div></button>`;
        })
        .join('')}</div>`;
  }
  renderFoot(): string {
    return `<button class="btn green block" data-act="ok">축하해요!</button>`;
  }
  onAction(act: string, arg: string): void {
    if (act === 'open') {
      this.close();
      this.manager.open(new AnimalDetailPanel(arg));
      return;
    }
    this.close();
  }
}
