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
import { ARTIFACTS, ARTIFACT_BY_ID, ARTIFACT_SETS } from '../../data/artifacts';
import { INSECTS, INSECT_BY_ID } from '../../data/insects';
import { SPIRITS, SPIRIT_BY_ID } from '../../data/spirits';
import { cx, esc } from '../dom';

export class CodexPanel extends Panel {
  readonly id = 'codex';
  title = '도감';
  tabs = [
    { id: 'crop', label: '작물', icon: 'it_carrot' },
    { id: 'tree', label: '과수', icon: 'it_apple' },
    { id: 'animal', label: '동물', icon: 'ic_livestock' },
    { id: 'fish', label: '물고기', icon: 'ic_fish' },
    { id: 'insect', label: '곤충', icon: 'bug_swallowtail' },
    { id: 'forage', label: '채집물', icon: 'ic_forage' },
    { id: 'resource', label: '광물·자원', icon: 'it_amethyst' },
    { id: 'artifact', label: '유물', icon: 'it_art_gear' },
    { id: 'spirit', label: '희귀 생물', icon: 'spirit_moon_spirit' },
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
      case 'crop':
      case 'tree': {
        const list = CROPS.filter((c) => !!c.fruitTree === (this.tab === 'tree'));
        const found = list.filter((c) => items[c.id]?.discovered).length;
        return this.progress(found, list.length) + `<div class="grid auto-sm">${list.map((c) => this.tile(c.id, `it_${c.id}`, c.name, !!items[c.id]?.discovered)).join('')}</div>`;
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
      case 'insect': {
        const caught = w.state.insects?.caught ?? {};
        const found = INSECTS.filter((i) => caught[i.id]).length;
        return this.progress(found, INSECTS.length) + `<div class="grid auto-sm">${INSECTS.map((i) => this.tile(i.id, `bug_${i.id}`, i.name, !!caught[i.id])).join('')}</div>
          <div class="tiny muted" style="margin-top:0.4rem">꽃밭·화분·꽃 작물·꽃 핀 과수를 심으면 곤충이 찾아와요. 날아다니는 곤충을 탭해 관찰하세요. 수분 곤충 근처 작물은 수확량 +5%.</div>`;
      }
      case 'spirit': {
        const seen = w.state.spiritsSeen ?? [];
        return this.progress(SPIRITS.filter((s) => seen.includes(s.id)).length, SPIRITS.length) + `<div class="grid auto-sm">${SPIRITS.map((s) => this.tile(s.id, `spirit_${s.id}`, s.name, seen.includes(s.id))).join('')}</div>
          <div class="tiny muted" style="margin-top:0.4rem">엔드게임 선택 콘텐츠 — 마스터리 연구 후 '정령의 사당'을 지으면 만날 수 있어요.</div>`;
      }
      case 'artifact': {
        const found = ARTIFACTS.filter((a) => w.mine.arts.found.includes(a.id)).length;
        const sets = Object.entries(ARTIFACT_SETS)
          .map(([sid, set]) => {
            const list = ARTIFACTS.filter((a) => a.set === sid);
            const n = list.filter((a) => w.mine.arts.found.includes(a.id)).length;
            const claimed = w.mine.arts.setsClaimed.includes(sid);
            return `<div class="card" style="margin-bottom:0.4rem"><div class="row"><b class="grow">${esc(set.name)} <span class="tiny muted">${n}/${list.length}</span></b>
              <span class="tiny muted">세트 보상: ${esc(set.rewardText)}</span>
              ${claimed ? '<span class="chip green">받음</span>' : n === list.length ? `<button class="btn small green" data-act="claimSet" data-arg="${sid}">보상 받기</button>` : ''}</div>
              <div class="grid auto-sm" style="margin-top:0.3rem">${list.map((a) => this.tile(a.id, `it_${a.id}`, a.name, w.mine.arts.found.includes(a.id))).join('')}</div></div>`;
          })
          .join('');
        return this.progress(found, ARTIFACTS.length) + sets + `<div class="tiny muted">유물은 광산(고대 지층·지오드), 낚시(물속 보물), 채집 상자에서 드물게 나와요. 중복 유물은 특급상인이 비싸게 사 줘요.</div>`;
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
    if (this.tab === 'crop' || this.tab === 'tree') {
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
    if (this.tab === 'spirit') {
      const s = SPIRIT_BY_ID[id];
      if (!(w.state.spiritsSeen ?? []).includes(id)) return `<span class="muted">아직 만나지 못했어요.${s.parents ? ` 힌트: ${SPIRIT_BY_ID[s.parents[0]].name} + ${SPIRIT_BY_ID[s.parents[1]].name}` : ''}</span>`;
      return `${iconHtml(`spirit_${id}`, 40)}<div class="grow small"><b>${esc(s.name)}</b> · ${esc(s.desc)}<div class="tiny muted">먹이 ${s.foods.map((f) => ITEM_BY_ID[f]?.name ?? f).join(', ')} · ${s.interval}일마다 ${ITEM_BY_ID[s.product].name}</div></div>`;
    }
    if (this.tab === 'insect') {
      const i = INSECT_BY_ID[id];
      const n = w.state.insects?.caught[id] ?? 0;
      const when = `${i.season.map((x) => SEASON_BY_ID[x].name).join('·')} · ${i.time === 'day' ? '낮' : '밤'}${i.flower ? ` · 꽃 근처${i.minFlowers ? ` (꽃 ${i.minFlowers}개 이상)` : ''}` : ''}`;
      if (!n) return `<span class="muted">아직 관찰하지 못했어요. 힌트: ${esc(when)}</span>`;
      return `${iconHtml(`bug_${id}`, 40)}<div class="grow small"><b>${esc(i.name)}</b> · ${esc(when)}<div class="tiny muted">관찰 ${n}번${i.pollinator ? ' · 수분 곤충 (주변 작물 수확량 +5%)' : ''}</div></div>`;
    }
    if (this.tab === 'artifact') {
      const a = ARTIFACT_BY_ID[id];
      if (!w.mine.arts.found.includes(id)) return `<span class="muted">아직 발견하지 못했어요. 힌트: ${a.source === 'mine' ? '광산' : a.source === 'fishing' ? '낚시' : '채집 상자'}</span>`;
      return `${iconHtml(`it_${id}`, 40)}<div class="grow small"><b>${esc(a.name)}</b> · ${esc(ARTIFACT_SETS[a.set].name)}<div class="tiny muted">${esc(a.desc)} · 기본가 ${a.price.toLocaleString()}G (특급상인 +60%)</div></div>`;
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
    else if (act === 'claimSet') {
      const r = this.w.mine.claimSet(arg);
      this.toast(r.ok ? '세트 보상을 받았어요!' : r.reason ?? '', r.ok ? 'good' : 'warn');
    }
    this.refresh();
  }
}
