/** 건설 모드 DOM 바: 카탈로그 / 선택 동작 / 토지 구매 / 설계도 */
import { Session } from '../core/Session';
import { Bridge } from '../scenes/Bridge';
import { BUILDINGS, BUILDING_BY_ID, BUILD_CATEGORY_NAME, footprint, type BuildingCategory } from '../data/buildings';
import { iconHtml } from '../assets/AssetRegistry';
import { $ui, cx, el, esc } from './dom';
import { confirmDialog, infoDialog } from './dialogs';
import { AudioManager } from '../audio/AudioManager';
import { SKILL_BY_ID } from '../data/skills';
import { openPanel } from './openers';
import { ITEM_BY_ID } from '../data/items';

let root: HTMLElement | null = null;
let unsubs: (() => void)[] = [];
let cat: BuildingCategory | 'stock' = 'storage';

export function mountBuildBar(): void {
  unmountBuildBar();
  root = el('div', 'build-ui');
  root.style.cssText = 'position:absolute;inset:0;pointer-events:none';
  $ui().appendChild(root);
  root.addEventListener('click', onClick);
  unsubs.push(
    Session.app.on('buildState', render),
    Session.world!.events.on('gold', render),
    Session.world!.events.on('land', render),
  );
  const b = Bridge.farm!.build;
  b.landTap = (x, y, c) => {
    if (!c.ok) {
      Session.app.emit('toast', { text: c.reason ?? '구매할 수 없습니다', tone: 'warn' });
      AudioManager.sfx('error');
      return;
    }
    confirmDialog('토지 구매', `<div class="row">${iconHtml('ic_land', 40)}<div>이 토지(${x}, ${y})를<br><b class="gold-text">${c.price.toLocaleString()}G</b>에 구입할까요?</div></div>`, '구입', () => {
      const r = Session.world!.land.buy(x, y);
      if (!r.ok) Session.app.emit('toast', { text: r.reason ?? '구매 실패', tone: 'warn' });
      else Session.app.emit('toast', { text: `토지를 구입했습니다 (-${r.price.toLocaleString()}G)`, tone: 'good' });
    });
  };
  // 튜토리얼 6단계: 보관함 탭 기본
  if ((Session.world!.state.buildStock.chest ?? 0) > 0) cat = 'stock';
  render();
}

export function unmountBuildBar(): void {
  for (const u of unsubs) u();
  unsubs = [];
  root?.remove();
  root = null;
}

function stockCount(): number {
  return Object.values(Session.world!.state.buildStock).reduce((s, n) => s + n, 0);
}

function render(): void {
  if (!root || !Bridge.farm) return;
  const w = Session.world!;
  const b = Bridge.farm.build;
  if (!b.active) return;
  const sel = [...b.selected].map((u) => w.state.buildings[u]).filter(Boolean);
  const valid = b.mode === 'place' || b.mode === 'move' ? b.placeValid() : { ok: false };
  let banner = '';
  if (b.tutorialHouse) banner = '집을 설치할 위치를 선택해 주세요. (2×2)<br><span class="small">탭하거나 드래그해서 옮기세요</span>';
  else if (b.mode === 'land') banner = `토지 구매 · 다음 가격 <b class="gold-text" style="color:#ffe48a">${w.land.price().toLocaleString()}G</b> · ${w.grid.ownedCount()}/${w.land.cap()}칸`;
  else if (b.mode === 'place' && b.placeType) {
    const d = BUILDING_BY_ID[b.placeType];
    const stock = w.state.buildStock[b.placeType] ?? 0;
    const matTxt = d.materials?.length ? ` · 재료 ${d.materials.map((m) => `${ITEM_BY_ID[m.id].name} ${w.inventory.countAll(m.id)}/${m.qty}`).join(', ')}` : '';
    banner = `${esc(d.name)} 설치 (${d.w}×${d.h}) · ${stock > 0 ? '보관함 (무료)' : `${d.price.toLocaleString()}G${matTxt}`}${valid.ok ? '' : `<br><span class="small" style="color:#ffb0a0">${esc(valid.reason ?? '')}</span>`}`;
  } else if (b.mode === 'move') banner = `이동할 위치를 탭하거나 드래그하세요 (${sel.length}개)${valid.ok ? '' : `<br><span class="small" style="color:#ffb0a0">${esc(valid.reason ?? '')}</span>`}`;
  else banner = sel.length ? `${sel.length}개 선택됨: ${esc(sel.map((s) => BUILDING_BY_ID[s.type].name).slice(0, 3).join(', '))}${sel.length > 3 ? '…' : ''}` : `건설 모드 · 시간 정지 · 시설을 탭해 선택하세요`;

  const tut = w.tutorial.current();
  if (tut && !b.tutorialHouse && (tut.step === 6 || tut.step === 12)) banner += `<div class="small" style="color:#ffe48a;margin-top:2px">${tut.step === 6 ? '튜토리얼: [보관함]의 보관상자를 골라 빈 칸에 설치하세요' : '튜토리얼: 왼쪽 [토지 구매] → 초록색 칸을 탭하세요'}</div>`;
  const top = `<div class="build-top"><div class="build-banner">${banner}</div></div>`;

  if (b.tutorialHouse) {
    root.innerHTML = `${top}<div class="place-confirm" style="bottom:calc(1rem + var(--safe-b))"><button class="btn green interactive" data-act="confirm" ${valid.ok ? '' : 'disabled'} style="min-width:10rem">설치하기</button></div>`;
    return;
  }

  const left = `<div class="build-left">
    <button class="${cx('btn small', b.mode === 'select' ? 'blue' : '')}" data-act="mode" data-arg="select">${iconHtml('tool_hand', 20)}선택</button>
    <button class="${cx('btn small', b.mode === 'land' ? 'blue' : '')}" data-act="mode" data-arg="land" data-tut="land">${iconHtml('ic_land', 20)}토지 구매</button>
    <button class="${cx('btn small', b.multi ? 'gold' : '')}" data-act="multi">${iconHtml('tool_area', 20)}다중 선택</button>
    <button class="btn small" data-act="blueprint">${iconHtml('ic_blueprint', 20)}설계도</button>
  </div>`;
  const oneRot = sel.length === 1 && BUILDING_BY_ID[sel[0].type].rotatable;
  const right = `<div class="build-actions">
    <button class="btn green" data-act="exit">완료</button>
    ${b.mode === 'select' ? `
      <button class="btn small" data-act="move" ${sel.length ? '' : 'disabled'}>이동</button>
      <button class="btn small" data-act="rotate" ${oneRot ? '' : 'disabled'}>회전</button>
      <button class="btn small red" data-act="remove" ${sel.length && !sel.some((s) => s.type === 'house') ? '' : 'disabled'}>철거</button>
      <button class="btn small" data-act="info" ${sel.length === 1 ? '' : 'disabled'}>정보</button>` : ''}
    ${b.mode === 'place' || b.mode === 'move' ? `<button class="btn small" data-act="rotate">회전</button>` : ''}
  </div>`;

  let bottom = '';
  if (b.mode === 'place' || b.mode === 'move') {
    bottom = `<div class="place-confirm" style="bottom:calc(var(--edge) + var(--safe-b))">
      <button class="btn red" data-act="cancel">취소</button>
      <button class="btn green" data-act="confirm" ${valid.ok ? '' : 'disabled'} style="min-width:8rem">${b.mode === 'place' ? '설치하기' : '이동 확정'}</button></div>`;
  }
  if (b.mode === 'select') {
    const cats: (BuildingCategory | 'stock')[] = ['stock', 'storage', 'utility', 'animal', 'production', 'decoration'];
    const catHtml = cats
      .map((c) => `<button class="${cx('tab', cat === c && 'on')}" style="border-radius:10px;border-bottom:3px solid" data-act="cat" data-arg="${c}">${c === 'stock' ? `보관함 ${stockCount() ? `(${stockCount()})` : ''}` : BUILD_CATEGORY_NAME[c]}</button>`)
      .join('');
    let list: string[] = [];
    if (cat === 'stock') {
      list = Object.entries(w.state.buildStock)
        .filter(([, n]) => n > 0)
        .map(([id, n]) => itemCard(id, `보관 ${n}개`, false, true));
      if (!list.length) list.push(`<div class="muted small" style="padding:0.8rem">상인에게 산 장식이나 철거한 장식이 여기에 보관됩니다.</div>`);
    } else {
      list = BUILDINGS.filter((d) => d.category === cat && !d.hidden && d.id !== 'house').map((d) => {
        const locked = d.unlockSkill && !w.skills.has(d.unlockSkill) ? `${SKILL_BY_ID[d.unlockSkill]?.name ?? ''} 연구 필요` : '';
        const mats = d.materials?.length ? ' + ' + d.materials.map((m) => `${ITEM_BY_ID[m.id].name}${m.qty}`).join(' ') : '';
        return itemCard(d.id, locked || `${d.price.toLocaleString()}G${mats}`, !!locked, false);
      });
    }
    bottom += `<div class="build-bottom"><div class="build-cats">${catHtml}</div><div class="build-items">${list.join('')}</div></div>`;
  } else if (b.mode === 'land') {
    bottom += `<div class="build-bottom" style="padding:0.5rem 0.8rem"><div class="row wrap"><div class="grow small">초록색 칸은 지금 땅과 <b>상하좌우</b>로 붙어 있어 구입할 수 있어요. (대각선 불가)<br>집 Lv.${w.state.house.level}: 최대 ${w.land.cap()}칸 · 이번 단계 구매 ${w.state.land.boughtAtLevel}회</div>${w.finance.hasDebt() ? '<span class="chip red">운영비 미납 — 구매 제한</span>' : ''}</div></div>`;
  }
  root.innerHTML = top + left + right + bottom;
}

function itemCard(id: string, sub: string, locked: boolean, stock: boolean): string {
  const d = BUILDING_BY_ID[id];
  const b = Bridge.farm!.build;
  const tex = id === 'house' ? 'bld_house_1' : d.spriteKey;
  return `<button class="${cx('build-item', locked && 'locked', b.placeType === id && 'sel')}" data-act="pick" data-arg="${id}" data-stock="${stock ? 1 : 0}">
    <div class="thumb">${iconHtml(tex, 48, '')}</div><b class="ellipsis" style="max-width:100%">${esc(d.name)}</b><span class="tiny muted">${d.w}×${d.h} · ${esc(sub)}</span></button>`;
}

function onClick(e: Event): void {
  const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
  if (!t || t.hasAttribute('disabled')) return;
  AudioManager.ui('tap');
  const w = Session.world!;
  const f = Bridge.farm!;
  const b = f.build;
  const arg = t.dataset.arg ?? '';
  switch (t.dataset.act) {
    case 'exit':
      f.exitBuild();
      break;
    case 'mode':
      b.setMode(arg as 'select' | 'land');
      break;
    case 'multi':
      b.multi = !b.multi;
      b.emit();
      break;
    case 'cat':
      cat = arg as BuildingCategory | 'stock';
      render();
      break;
    case 'pick': {
      const d = BUILDING_BY_ID[arg];
      const stock = (w.state.buildStock[arg] ?? 0) > 0;
      if (!stock && d.unlockSkill && !w.skills.has(d.unlockSkill)) {
        infoDialog(d.name, `${esc(d.desc)}<br><br><b>${esc(SKILL_BY_ID[d.unlockSkill]?.name ?? '')}</b> 연구가 필요합니다.`, d.spriteKey);
        return;
      }
      b.setMode('place', arg);
      break;
    }
    case 'confirm': {
      const wasTut = b.tutorialHouse;
      const r = b.confirm();
      if (!r.ok) Session.app.emit('toast', { text: r.reason ?? '설치할 수 없습니다', tone: 'warn' });
      else if (wasTut || (w.tutorial.active && w.tutorial.step === 7)) f.exitBuild();
      break;
    }
    case 'cancel':
      b.setMode('select');
      break;
    case 'move':
      b.setMode('move');
      break;
    case 'rotate':
      b.rotate();
      break;
    case 'remove': {
      const sel = [...b.selected].map((u) => w.state.buildings[u]);
      const refund = sel.reduce((s, x) => s + (BUILDING_BY_ID[x.type].category === 'decoration' || BUILDING_BY_ID[x.type].hidden ? 0 : Math.floor(BUILDING_BY_ID[x.type].price * 0.5)), 0);
      confirmDialog('철거', `${sel.length}개 시설을 철거할까요?<br><span class="muted small">보관품은 다른 저장공간으로 옮겨집니다. 환불: ${refund.toLocaleString()}G (장식은 보관함으로)</span>`, '철거', () => {
        const r = b.removeSelected();
        if (!r.ok) Session.app.emit('toast', { text: r.reason ?? '철거할 수 없습니다', tone: 'warn' });
        else if (r.reason) Session.app.emit('toast', { text: r.reason, tone: 'warn' });
      }, true);
      break;
    }
    case 'info': {
      const s = w.state.buildings[[...b.selected][0]];
      const d = BUILDING_BY_ID[s.type];
      const { w: fw, h: fh } = footprint(s.type, s.rot);
      infoDialog(d.name, `${esc(d.desc)}<br><span class="muted small">크기 ${fw}×${fh} · 위치 (${s.x}, ${s.y})${d.beauty ? ` · 아름다움 +${d.beauty}` : ''}</span>`, s.type === 'house' ? `bld_house_${w.state.house.level}` : d.spriteKey);
      break;
    }
    case 'blueprint':
      openPanel('blueprints');
      break;
  }
}
