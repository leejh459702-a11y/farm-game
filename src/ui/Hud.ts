/**
 * HUD — 농장 화면을 최대한 가리지 않는 모바일 가로 HUD.
 * 좌상: 계절/날짜/날씨/시간 · 우상: 보유금/집·농사·목축 레벨 · 하단: 도구바 · 우측: 행동 버튼 · 좌측: 조이스틱(Phaser)
 */
import { Session } from '../core/Session';
import { iconHtml } from '../assets/AssetRegistry';
import { calendar, clockString, dateLabel, dayLength } from '../systems/SeasonSystem';
import { WEATHER_INFO } from '../data/seasons';
import { TOOLS, fertilizerChoices, seedChoices } from '../systems/InteractionService';
import { BALANCE } from '../data/balance';
import { $ui, cx, el, esc } from './dom';
import { Panels } from './PanelManager';
import { Bridge } from '../scenes/Bridge';
import { AudioManager } from '../audio/AudioManager';
import type { GameNotification } from '../core/events';
import { openPanel } from './openers';
import { mountTutorial, unmountTutorial } from './TutorialOverlay';
import { mountBuildBar, unmountBuildBar } from './BuildBar';
import { showDaySummary, showMonthSummary } from './panels/SummaryPanels';
import { SettingsStore } from '../services/SettingsStore';
import { BirthResultPanel } from './panels/BreedingPanel';

let root: HTMLElement | null = null;
let unsubs: (() => void)[] = [];
let raf = 0;
const toastMap = new Map<string, { el: HTMLElement; timer: number; count: number }>();

function q<T extends HTMLElement = HTMLElement>(sel: string): T {
  return root!.querySelector(sel) as T;
}

export function mountHud(): void {
  unmountHud();
  const w = Session.world!;
  root = el('div', 'hud');
  root.innerHTML = `
    <div class="hud-tl">
      <div class="hud-box interactive" data-act="calendar" data-tut="date"><span data-h="seasonIcon"></span><span data-h="date"></span></div>
      <div class="hud-box interactive" data-act="calendar"><span data-h="weatherIcon"></span><span data-h="time"></span><div class="hud-timebar"><i data-h="timebar"></i></div></div>
    </div>
    <div class="hud-tr">
      <div class="hud-box hud-gold interactive" data-act="finance">${iconHtml('ic_coin', 24)}<span data-h="gold"></span></div>
      <div class="hud-box hud-levels interactive" data-act="skills">
        <span class="lv">${iconHtml('ic_house', 20)}<b data-h="house"></b></span>
        <span class="lv">${iconHtml('ic_farming', 20)}<b data-h="farm"></b><span class="lvbar"><i data-h="farmbar"></i></span></span>
        <span class="lv">${iconHtml('ic_livestock', 20)}<b data-h="live"></b><span class="lvbar"><i data-h="livebar"></i></span></span>
      </div>
    </div>
    <div class="toasts" data-h="toasts"></div>
    <div class="hud-right">
      <div class="hud-side-buttons">
        <button class="hud-btn merchant interactive" data-act="merchant" data-h="merchantBtn" data-tut="merchant" style="display:none">${iconHtml('ic_merchant', 26)}<span>상인</span></button>
        <button class="hud-btn interactive" data-act="menu">${iconHtml('ic_menu', 22)}<span>메뉴</span></button>
        <button class="hud-btn interactive" data-act="overview">${iconHtml('ic_chart', 24)}<span>농장</span></button>
        <button class="hud-btn interactive" data-act="bag" data-tut="bag">${iconHtml('ic_bag', 24)}<span>가방</span></button>
        <button class="hud-btn interactive" data-act="build" data-tut="build">${iconHtml('ic_build', 24)}<span>건설</span></button>
      </div>
      <button class="action-btn interactive" data-act="action" data-h="action" data-tut="action"><span data-h="actionIcon"></span><span data-h="actionLabel">조사</span></button>
    </div>
    <div class="hud-hint" data-h="hint"></div>
    <div class="hud-bottom interactive" data-h="toolbar" data-tut="toolbar"></div>`;
  $ui().appendChild(root);

  root.addEventListener('click', (e) => {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t) return;
    AudioManager.ui('tap');
    const act = t.dataset.act!;
    const arg = t.dataset.arg ?? '';
    onHudAction(act, arg);
  });

  renderToolbar();
  renderStatic();
  const ev = w.events;
  unsubs.push(
    ev.on('gold', renderStatic),
    ev.on('levelUp', renderStatic),
    ev.on('house', renderStatic),
    ev.on('weather', renderStatic),
    ev.on('dayStarted', () => {
      renderStatic();
      renderToolbar();
    }),
    ev.on('inventory', () => renderToolbar()),
    ev.on('research', () => renderToolbar()),
    ev.on('merchant', renderStatic),
    ev.on('notify', (n) => showToast(n)),
    ev.on('dayEnded', (s) => {
      if (SettingsStore.value.showDaySummary) showDaySummary(s);
    }),
    ev.on('monthEnded', (m) => showMonthSummary(m)),
    ev.on('birth', (b) => Panels.open(new BirthResultPanel(b.motherId, b.babyIds))),
    Session.app.on('tool', () => renderToolbar()),
    Session.app.on('context', (c) => renderContext(c)),
    Session.app.on('toast', (t) => showToast({ key: `t_${t.text}`, text: t.text, tone: t.tone, icon: t.tone === 'warn' ? 'ic_warn' : undefined })),
    Session.app.on('saved', (s) => {
      if (!s.auto) showToast({ key: 'saved', text: '저장되었습니다', icon: 'ic_save', tone: 'good' });
    }),
    Session.app.on('buildMode', (b) => {
      root!.style.display = b.on ? 'none' : '';
      if (b.on) mountBuildBar();
      else unmountBuildBar();
    }),
  );
  const loop = () => {
    renderTime();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  mountTutorial();
}

export function unmountHud(): void {
  cancelAnimationFrame(raf);
  for (const u of unsubs) u();
  unsubs = [];
  toastMap.forEach((t) => clearTimeout(t.timer));
  toastMap.clear();
  unmountTutorial();
  unmountBuildBar();
  root?.remove();
  root = null;
}

let lastTimeStr = '';
let lastNight = false;
function renderTime(): void {
  const w = Session.world;
  if (!w || !root) return;
  const c = calendar(w.state.time.day);
  const s = clockString(c.season, w.state.time.elapsed);
  if (s !== lastTimeStr) {
    lastTimeStr = s;
    q('[data-h=time]').textContent = s;
  }
  const pct = (w.state.time.elapsed / BALANCE.time.secondsPerDay) * 100;
  q('[data-h=timebar]').style.width = `${pct}%`;
  const night = w.state.time.elapsed >= dayLength(c.season);
  q('[data-h=timebar]').style.background = night ? 'linear-gradient(90deg,#8a9ad8,#4a5a9a)' : '';
  if (night !== lastNight) {
    lastNight = night;
    renderStatic();
  }
}

function renderStatic(): void {
  const w = Session.world;
  if (!w || !root) return;
  const c = calendar(w.state.time.day);
  q('[data-h=seasonIcon]').innerHTML = iconHtml(`ic_${c.season}`, 24);
  q('[data-h=date]').textContent = `${c.year > 1 ? `${c.year}년차 ` : ''}${dateLabel(w.state.time.day)}`;
  const wi = WEATHER_INFO[w.state.weather.today];
  const isNightNow = w.state.time.elapsed >= dayLength(c.season);
  q('[data-h=weatherIcon]').innerHTML = iconHtml(isNightNow && (w.state.weather.today === 'sunny' || w.state.weather.today === 'cloudy') ? 'ic_moon' : wi.icon, 24);
  q('[data-h=gold]').textContent = `${Math.floor(w.state.gold).toLocaleString()}G`;
  q('[data-h=house]').textContent = `Lv.${w.state.house.level}`;
  const fp = w.skills.progress('farming');
  const lp = w.skills.progress('livestock');
  q('[data-h=farm]').textContent = `${fp.level}`;
  q('[data-h=live]').textContent = `${lp.level}`;
  q('[data-h=farmbar]').style.width = `${fp.ratio * 100}%`;
  q('[data-h=livebar]').style.width = `${lp.ratio * 100}%`;
  const mb = q('[data-h=merchantBtn]');
  const m = w.state.merchant;
  mb.style.display = m.present ? '' : 'none';
  mb.classList.toggle('special', m.special);
  mb.querySelector('span')!.textContent = m.special ? '특급' : '상인';
  if (w.finance.hasDebt()) q('[data-h=gold]').innerHTML = `${Math.floor(w.state.gold).toLocaleString()}G <span class="chip red tiny">미납</span>`;
}

function renderToolbar(): void {
  const w = Session.world;
  if (!w || !root) return;
  const hb = w.state.hotbar;
  const seedQty = hb.seedId ? w.inventory.countAll(hb.seedId) : 0;
  const fertQty = hb.fertilizerId ? w.inventory.countAll(hb.fertilizerId) : 0;
  const hay = w.inventory.countAll('hay');
  let html = TOOLS.map((t, i) => {
    let sub = '';
    let qty = '';
    let icon = t.icon;
    if (t.id === 'seed') {
      if (hb.seedId) {
        icon = `it_${hb.seedId}`;
        qty = String(seedQty);
        sub = `<span class="sub">${iconHtml('tool_seed', 16)}</span>`;
      }
    }
    if (t.id === 'fertilizer') {
      if (hb.fertilizerId) {
        icon = `it_${hb.fertilizerId}`;
        qty = String(fertQty);
      }
      if (!w.skills.has('f_fert1') && !fertilizerChoices(w).length) return '';
    }
    if (t.id === 'feed') {
      if (!w.animals.barns().length) return '';
      qty = String(hay);
    }
    return `<button class="${cx('slot', hb.selected === i && 'sel')}" data-act="tool" data-arg="${i}" data-tut="tool-${t.id}" title="${esc(t.name)}">
      <span class="key">${i + 1}</span>${iconHtml(icon, 32)}${qty ? `<span class="qty">${qty}</span>` : ''}${sub}</button>`;
  }).join('');
  if (w.skills.has('f_multi')) html += `<button class="${cx('slot', hb.area === 3 && 'area-on')}" data-act="area" title="3×3 대량 작업">${iconHtml('tool_area', 32)}<span class="qty">${hb.area}×${hb.area}</span></button>`;
  q('[data-h=toolbar]').innerHTML = html;
}

function renderContext(c: { label: string; icon: string; enabled: boolean; hint?: string }): void {
  if (!root) return;
  q('[data-h=actionIcon]').innerHTML = iconHtml(c.icon, 34);
  q('[data-h=actionLabel]').textContent = c.label;
  q('[data-h=action]').classList.toggle('disabled', !c.enabled);
  const h = q('[data-h=hint]');
  if (c.hint && !c.enabled) {
    h.textContent = c.hint;
    h.classList.add('show');
    clearTimeout(Number(h.dataset.t));
    h.dataset.t = String(window.setTimeout(() => h.classList.remove('show'), 1800));
  }
}

function onHudAction(act: string, arg: string): void {
  const w = Session.world!;
  switch (act) {
    case 'action':
      Bridge.farm?.doAction();
      break;
    case 'tool': {
      const i = Number(arg);
      const tool = TOOLS[i];
      if (w.state.hotbar.selected === i || (tool.id === 'seed' && !w.state.hotbar.seedId)) {
        if (tool.id === 'seed') openPanel('seedPicker');
        if (tool.id === 'fertilizer') openPanel('fertPicker');
      }
      w.state.hotbar.selected = i;
      if (tool.id === 'seed' && w.state.hotbar.seedId && w.inventory.countAll(w.state.hotbar.seedId) <= 0) {
        const s = seedChoices(w)[0];
        w.state.hotbar.seedId = s?.itemId ?? null;
      }
      if (tool.id === 'fertilizer' && !w.state.hotbar.fertilizerId) w.state.hotbar.fertilizerId = fertilizerChoices(w)[0]?.itemId ?? null;
      Session.app.emit('tool', { index: i });
      break;
    }
    case 'area':
      w.state.hotbar.area = w.state.hotbar.area === 3 ? 1 : 3;
      renderToolbar();
      break;
    case 'build':
      if (!w.tutorial.allows('build')) {
        showToast({ key: 'tut_build', text: '튜토리얼을 먼저 진행하세요', tone: 'warn', icon: 'ic_warn' });
        return;
      }
      Bridge.farm?.enterBuild('select');
      break;
    case 'bag':
      openPanel('inventory');
      break;
    case 'menu':
      openPanel('pause');
      break;
    case 'overview':
      openPanel('overview');
      break;
    case 'merchant':
      openPanel('merchant');
      break;
    case 'skills':
      openPanel('skills');
      break;
    case 'finance':
      openPanel('finance');
      break;
    case 'calendar':
      openPanel('calendar');
      break;
  }
}

export function showToast(n: GameNotification): void {
  if (!root) return;
  const box = q('[data-h=toasts]');
  const existing = toastMap.get(n.key);
  if (existing && existing.el.isConnected) {
    existing.count += n.count ?? 1;
    existing.el.querySelector('.txt')!.textContent = n.text;
    const c = existing.el.querySelector('.count') as HTMLElement;
    c.textContent = `×${existing.count}`;
    c.style.display = existing.count > 1 && !n.text.match(/\d/) ? '' : 'none';
    clearTimeout(existing.timer);
    existing.timer = window.setTimeout(() => dismiss(n.key), BALANCE.notifications.toastSeconds * 1000);
    return;
  }
  const t = el('div', cx('toast', n.tone === 'warn' && 'warn', n.tone === 'info' && 'info', 'interactive'));
  t.innerHTML = `${n.icon ? iconHtml(n.icon, 22) : ''}<span class="txt">${esc(n.text)}</span><span class="count" style="display:none"></span>`;
  if (n.target) {
    t.style.cursor = 'pointer';
    t.addEventListener('click', () => {
      Panels.closeAll();
      Session.app.emit('focusTile', n.target!);
    });
  }
  box.prepend(t);
  const timer = window.setTimeout(() => dismiss(n.key), BALANCE.notifications.toastSeconds * 1000);
  toastMap.set(n.key, { el: t, timer, count: n.count ?? 1 });
  // 최대 개수
  while (box.children.length > BALANCE.notifications.maxVisible) {
    const last = box.lastElementChild as HTMLElement;
    for (const [k, v] of toastMap) if (v.el === last) toastMap.delete(k);
    last.remove();
  }
}

function dismiss(key: string): void {
  const t = toastMap.get(key);
  if (!t) return;
  toastMap.delete(key);
  t.el.classList.add('out');
  setTimeout(() => t.el.remove(), 300);
}

export function hudElement(tut: string): HTMLElement | null {
  return root?.querySelector(`[data-tut="${tut}"]`) ?? null;
}
