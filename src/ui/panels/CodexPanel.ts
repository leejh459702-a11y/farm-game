/** 도감: 작물 / 동물 / 가공품 / 요리 / 시설 */
import { Panel } from '../Panel';
import { iconHtml } from '../../assets/AssetRegistry';
import { CROPS, CROP_BY_ID } from '../../data/crops';
import { ANIMALS, ANIMAL_BY_ID, TRAIT_BY_ID } from '../../data/animals';
import { ITEMS, ITEM_BY_ID } from '../../data/items';
import { RECIPES, RECIPE_BY_ID } from '../../data/recipes';
import { BUILDINGS, BUILDING_BY_ID } from '../../data/buildings';
import { FISH, FISH_BY_ID, RARITY_NAME } from '../../data/fish';
import { SEASON_BY_ID, WEATHER_INFO } from '../../data/seasons';
import { cx, esc } from '../dom';

export class CodexPanel extends Panel {
  readonly id = 'codex';
  title = '도감';
  tabs = [
    { id: 'crop', label: '작물', icon: 'it_carrot' },
    { id: 'animal', label: '동물', icon: 'ic_livestock' },
    { id: 'fish', label: '물고기', icon: 'ic_fish' },
    { id: 'forage', label: '채집물', icon: 'ic_forage' },
    { id: 'resource', label: '자원', icon: 'it_wood' },
    { id: 'processed', label: '가공품', icon: 'it_cheese' },
    { id: 'cooking', label: '요리', icon: 'it_bibimbap' },
    { id: 'building', label: '시설', icon: 'ic_house' },
  ];
  private sel: string | null = null;

  onTab(): void {
    this.sel = null;
  }

  private progress(found: number, total: number): string {
    return `<div class="row" style="margin-bottom:0.5rem"><b>발견 ${found}/${total}</b><div class="bar grow"><i style="width:${(found / total) * 100}%"></i></div></div>`;
  }

  private tile(id: string, icon: string, name: string, found: boolean): string {
    return `<button class="${cx('card col center', this.sel === id && 'sel')}" data-act="sel" data-arg="${id}" style="align-items:center;gap:2px;${found ? '' : 'filter:brightness(0) opacity(0.35)'}">${iconHtml(icon, 40)}<span class="tiny ellipsis" style="max-width:100%">${found ? esc(name) : '???'}</span></button>`;
  }

  renderBody(): string {
    const w = this.w;
    const items = w.state.codex.items;
    switch (this.tab) {
      case 'crop': {
        const found = CROPS.filter((c) => items[c.id]?.discovered).length;
        return this.progress(found, CROPS.length) + `<div class="grid auto-sm">${CROPS.map((c) => this.tile(c.id, `it_${c.id}`, c.name, !!items[c.id]?.discovered)).join('')}</div>`;
      }
      case 'animal': {
        const found = ANIMALS.filter((a) => w.state.codex.animals[a.id]?.discovered).length;
        return this.progress(found, ANIMALS.length) + `<div class="grid auto-sm">${ANIMALS.map((a) => this.tile(a.id, `portrait_${a.id}`, a.name, !!w.state.codex.animals[a.id]?.discovered)).join('')}</div>`;
      }
      case 'fish': {
        const list = FISH.filter((f) => f.id !== 'old_boot');
        const found = list.filter((f) => items[f.id]?.discovered).length;
        return this.progress(found, list.length) + `<div class="grid auto-sm">${list.map((f) => this.tile(f.id, f.spriteKey, f.name, !!items[f.id]?.discovered)).join('')}</div>`;
      }
      case 'forage':
      case 'resource':
      case 'processed':
      case 'cooking': {
        const list = ITEMS.filter((i) => i.category === this.tab);
        const found = list.filter((i) => items[i.id]?.discovered).length;
        return this.progress(found, list.length) + `<div class="grid auto-sm">${list.map((i) => this.tile(i.id, i.icon, i.name, !!items[i.id]?.discovered)).join('')}</div>`;
      }
      default: {
        const list = BUILDINGS.filter((b) => b.id !== 'house');
        const built = new Set(w.state.codex.buildings);
        return this.progress(list.filter((b) => built.has(b.id)).length, list.length) + `<div class="grid auto-sm">${list.map((b) => this.tile(b.id, b.spriteKey, b.name, built.has(b.id))).join('')}</div>`;
      }
    }
  }

  renderFoot(): string {
    if (!this.sel) return `<span class="muted small">항목을 탭하면 기록을 볼 수 있어요.</span>`;
    const w = this.w;
    const id = this.sel;
    if (this.tab === 'crop') {
      const c = CROP_BY_ID[id];
      const e = w.state.codex.items[id];
      if (!e?.discovered) return `<span class="muted">아직 발견하지 못했어요. 힌트: ${c.season.map((s) => SEASON_BY_ID[s].name).join('·')} 작물${c.rare ? ' (특급상인)' : ''}</span>`;
      return `${iconHtml(`it_${id}`, 40)}<div class="grow small"><b>${esc(c.name)}</b> · ${c.season.map((s) => SEASON_BY_ID[s].name).join('·')} · 성장 ${c.growDays}일${c.regrowDays ? `(재수확 ${c.regrowDays}일)` : ''} · 판매가 ${c.baseSellPrice}G
        <div class="tiny muted">누적 수확 ${e.count}개 · 최고 판매가 ${e.bestPrice.toLocaleString()}G · 가공: ${c.processingUses.map((r) => RECIPE_BY_ID[r].outputName).join(', ') || '-'}</div></div>`;
    }
    if (this.tab === 'animal') {
      const a = ANIMAL_BY_ID[id];
      const e = w.state.codex.animals[id];
      if (!e?.discovered) return `<span class="muted">아직 만나지 못했어요.${a.rare ? ' 희귀 동물 연구 또는 특급상인' : ''}</span>`;
      const best = e.bestAnimalId ? w.state.pedigree[e.bestAnimalId] : null;
      return `${iconHtml(`portrait_${id}`, 40)}<div class="grow small"><b>${esc(a.name)}</b> · 발견 등급 ${[...e.grades].sort().map((g) => `${g}등급`).join(', ')} · 브리딩 ${e.breedCount}회 · 생산 ${e.produced}개
        <div class="tiny muted">발견 특성: ${e.traits.map((t) => TRAIT_BY_ID[t].name).join(', ') || '-'} · 최고 개체: ${best ? `${esc(best.name)} (${best.id}, ${best.grade}등급)` : '-'}</div></div>`;
    }
    if (this.tab === 'fish') {
      const f = FISH_BY_ID[id];
      const e = w.state.codex.items[id];
      const rec = w.state.fishRecords[id];
      const when = `${f.season.map((x) => SEASON_BY_ID[x].name).join('·')} · ${f.dayOrNight === 'any' ? '하루 종일' : f.dayOrNight === 'day' ? '낮' : '밤'} · ${f.weather === 'any' ? '날씨 무관' : f.weather.map((x) => WEATHER_INFO[x].name).join('·')}`;
      if (!e?.discovered) return `<span class="muted">아직 낚지 못했어요. 힌트: ${esc(when)} · ${RARITY_NAME[f.rarity]}</span>`;
      return `${iconHtml(f.spriteKey, 40)}<div class="grow small"><b>${esc(f.name)}</b> <span class="chip">${RARITY_NAME[f.rarity]}</span> · ${esc(when)}
        <div class="tiny muted">포획 ${rec?.count ?? 0}회 · 최대 크기 ${(rec?.maxSize ?? 0).toFixed(1)}cm · 최고 판매가 ${e.bestPrice.toLocaleString()}G · 기본가 ${f.baseSellPrice}G</div></div>`;
    }
    if (this.tab === 'building') {
      const b = BUILDING_BY_ID[id];
      return `${iconHtml(b.spriteKey, 40)}<div class="grow small"><b>${esc(b.name)}</b> · ${b.w}×${b.h} · ${b.price.toLocaleString()}G<div class="tiny muted">${esc(b.desc)}</div></div>`;
    }
    const it = ITEM_BY_ID[id];
    const e = w.state.codex.items[id];
    const r = RECIPES.find((x) => x.output === id);
    if (!e?.discovered) return `<span class="muted">아직 만들어 보지 못했어요.${r ? ` 재료: ${r.inputs.map((i) => ITEM_BY_ID[i.id].name).join(', ')}` : ''}</span>`;
    return `${iconHtml(it.icon, 40)}<div class="grow small"><b>${esc(it.name)}</b> · 기본가 ${it.basePrice.toLocaleString()}G · 생산 ${e.count}개 · 최고 판매가 ${e.bestPrice.toLocaleString()}G
      <div class="tiny muted">${r ? `재료: ${r.inputs.map((i) => `${ITEM_BY_ID[i.id].name}×${i.qty}`).join(', ')}` : ''}</div></div>`;
  }

  onAction(act: string, arg: string): void {
    if (act === 'sel') this.sel = this.sel === arg ? null : arg;
    this.refresh();
  }
}
