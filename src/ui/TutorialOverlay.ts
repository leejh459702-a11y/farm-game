/** 튜토리얼 말풍선 + 강조 화살표 */
import { Session } from '../core/Session';
import { TUTORIAL_STEPS } from '../systems/TutorialSystem';
import { $ui, el, esc } from './dom';
import { Bridge } from '../scenes/Bridge';
import { hudElement } from './Hud';
import { iconHtml } from '../assets/AssetRegistry';
import { confirmDialog } from './dialogs';
import { AudioManager } from '../audio/AudioManager';
import { Panels } from './PanelManager';

let box: HTMLElement | null = null;
let arrow: HTMLElement | null = null;
let unsubs: (() => void)[] = [];
let raf = 0;
let collapsed = false;

export function mountTutorial(): void {
  unmountTutorial();
  const w = Session.world!;
  box = el('div', 'tut');
  arrow = el('div', 'tut-arrow');
  arrow.style.display = 'none';
  $ui().appendChild(box);
  $ui().appendChild(arrow);
  box.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t) {
      collapsed = !collapsed;
      render();
      return;
    }
    AudioManager.ui('tap');
    const act = t.dataset.act;
    if (act === 'next') Session.world?.tutorial.next();
    if (act === 'skip')
      confirmDialog('튜토리얼 건너뛰기', '튜토리얼을 건너뛸까요?<br><span class="muted small">집은 자동으로 배치됩니다.</span>', '건너뛰기', () => {
        Bridge.farm?.exitBuild();
        Session.world?.tutorial.skip();
      });
  });
  unsubs.push(w.events.on('tutorial', () => onStep()));
  onStep();
  const loop = () => {
    ensureHouseMode();
    positionArrow();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
}

export function unmountTutorial(): void {
  cancelAnimationFrame(raf);
  for (const u of unsubs) u();
  unsubs = [];
  box?.remove();
  arrow?.remove();
  box = arrow = null;
}

function onStep(): void {
  const w = Session.world;
  if (!w) return;
  collapsed = false;
  const step = w.tutorial.current();
  // 단계 진입 시 상태 기반 조건 체크
  if (step) w.tutorial.onEnter();
  ensureHouseMode();
  render();
}

/** 튜토리얼 2단계: 집 배치 모드 강제 */
function ensureHouseMode(): void {
  const w = Session.world;
  const f = Bridge.farm;
  if (!w || !f || w.tutorial.current()?.step !== 2 || Panels.isOpen()) return;
  if (f.build.active && f.build.tutorialHouse) return;
  if (f.build.active) f.exitBuild();
  f.enterBuild('place', 'house');
  f.build.tutorialHouse = true;
  f.build.emit();
}

function render(): void {
  const w = Session.world;
  if (!box || !w) return;
  const s = w.tutorial.current();
  const building = !!Bridge.farm?.build.active && s?.step !== 2;
  if (!s || building) {
    box.style.display = 'none';
    if (arrow) arrow.style.display = 'none';
    return;
  }
  box.style.display = '';
  const total = TUTORIAL_STEPS.length;
  if (collapsed) {
    box.innerHTML = `<div class="speech row" style="padding:0.3rem 0.6rem">${iconHtml('ic_star', 20)}<b class="grow">${esc(s.title)}</b><span class="muted tiny">탭하여 펼치기</span></div>`;
    return;
  }
  box.innerHTML = `<div class="speech">
    <h3>${iconHtml('ic_star', 20)}<span class="grow">${esc(s.title)}</span><span class="muted tiny">${s.step}/${total}</span></h3>
    <p>${esc(s.text)}</p>
    <div class="tut-actions">
      ${s.step <= 2 ? `<button class="btn small" data-act="skip">건너뛰기</button>` : ''}
      ${!s.signal ? `<button class="btn small green pulse" data-act="next">${s.step === total ? '시작!' : '다음'}</button>` : '<span class="muted tiny" style="align-self:center">말풍선을 탭하면 접혀요</span>'}
    </div></div>`;
}

/** 강조 대상 위치 계산 */
function targetPos(): { x: number; y: number; side?: boolean } | null {
  const w = Session.world;
  if (!w || Panels.isOpen()) return null;
  const s = w.tutorial.current();
  if (!s?.focus) return null;
  const elRect = (e: HTMLElement | null): { x: number; y: number; side?: boolean } | null => {
    if (!e || !e.offsetParent) return null;
    const r = e.getBoundingClientRect();
    // 오른쪽 세로 버튼은 왼쪽에서 가리킴
    if (r.left > window.innerWidth * 0.75) return { x: r.left - 6, y: r.top + r.height / 2, side: true };
    return { x: r.left + r.width / 2, y: r.top - 4 };
  };
  const f = Bridge.farm;
  switch (s.focus) {
    case 'hoe':
      return w.state.hotbar.selected === 1 ? emptyTilePos() : elRect(hudElement('tool-hoe'));
    case 'seed':
      return w.state.hotbar.selected === 3 ? plotPos(false) : elRect(hudElement('tool-seed'));
    case 'water':
      return w.state.hotbar.selected === 2 ? plotPos(true) : elRect(hudElement('tool-water'));
    case 'hand':
      return w.state.hotbar.selected === 0 ? plotPos(false) : elRect(hudElement('tool-hand'));
    case 'build':
      if (f?.build.active) return null;
      return elRect(hudElement('build'));
    case 'endday': {
      const h = w.grid.house();
      if (!h || !f) return null;
      const r = f.tileScreenRect(h.x, h.y, 2, 1);
      return { x: r.x + r.w / 2, y: r.y - 10 };
    }
    case 'merchant': {
      const b = elRect(hudElement('merchant'));
      return b;
    }
    case 'land':
      if (f?.build.active) return null;
      return elRect(hudElement('build'));
    default:
      return null;
  }
}

function emptyTilePos(): { x: number; y: number } | null {
  const w = Session.world!;
  const f = Bridge.farm;
  if (!f) return null;
  for (let y = 0; y < 30; y++)
    for (let x = 0; x < 30; x++)
      if (w.grid.isOwned(x, y) && !w.grid.buildingAt(x, y) && !w.crops.plotAt(x, y)) {
        const r = f.tileScreenRect(x, y);
        return { x: r.x + r.w / 2, y: r.y };
      }
  return null;
}

function plotPos(needDry: boolean): { x: number; y: number } | null {
  const w = Session.world!;
  const f = Bridge.farm;
  if (!f) return null;
  const p = Object.values(w.state.plots).find((pp) => !pp.greenhouse && (!needDry || (pp.cropId && !pp.wateredToday)));
  if (!p) return null;
  const r = f.tileScreenRect(p.x, p.y);
  return { x: r.x + r.w / 2, y: r.y };
}

let lastBuild = false;
function positionArrow(): void {
  if (!arrow) return;
  const building = !!Bridge.farm?.build.active;
  if (building !== lastBuild) {
    lastBuild = building;
    render();
  }
  const p = targetPos();
  if (!p) {
    arrow.style.display = 'none';
    return;
  }
  arrow.style.display = '';
  const side = p.side === true;
  arrow.classList.toggle('side', side);
  arrow.style.left = `${p.x}px`;
  arrow.style.top = `${p.y}px`;
}
