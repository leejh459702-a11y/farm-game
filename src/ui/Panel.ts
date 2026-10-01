/**
 * Panel — DOM 패널 기본 클래스.
 * innerHTML 템플릿 + data-act 위임 방식으로 가볍게 구현한다.
 */
import type { WorldEvents } from '../core/events';
import type { World } from '../core/World';
import { Session } from '../core/Session';
import { AudioManager } from '../audio/AudioManager';
import { iconHtml } from '../assets/AssetRegistry';
import { cx, el, esc } from './dom';

export interface TabDef {
  id: string;
  label: string;
  icon?: string;
  special?: boolean;
}

export type Watch = (keyof WorldEvents)[];

export type PanelSize = 'full' | 'medium' | 'small' | 'side';

export abstract class Panel {
  abstract readonly id: string;
  title = '';
  size: PanelSize = 'full';
  /** 열려 있는 동안 게임 시간 정지 */
  pausesTime = true;
  backdrop = true;
  /** 배경 탭으로 닫기 */
  closeOnBackdrop = true;
  tabs: TabDef[] = [];
  tab = '';
  /** 자동 새로고침할 World 이벤트 */
  watch: Watch = [];
  root!: HTMLElement;
  protected bodyEl!: HTMLElement;
  protected footEl!: HTMLElement;
  private unsubs: (() => void)[] = [];
  private refreshQueued = false;
  /** PanelManager 가 주입 */
  manager!: { close(p?: Panel): void; open(p: Panel): void };
  showBack = false;

  get w(): World {
    return Session.world!;
  }

  abstract renderBody(): string;
  renderFoot(): string {
    return '';
  }
  onAction(_act: string, _arg: string, _el: HTMLElement, _ev: Event): void {}
  onInput(_name: string, _value: string, _el: HTMLInputElement): void {}
  onOpen(): void {}
  onClose(): void {}

  mount(parent: HTMLElement): void {
    const wrap = el('div', 'panel-wrap');
    if (this.backdrop) {
      const bd = el('div', cx('backdrop', this.size === 'side' && 'clear'));
      bd.addEventListener('pointerdown', (e) => {
        if (e.target === bd && this.closeOnBackdrop) {
          AudioManager.ui('close');
          this.manager.close(this);
        }
      });
      wrap.appendChild(bd);
    }
    const p = el('div', cx('panel', this.size !== 'full' && this.size));
    p.innerHTML = `
      <div class="panel-head">
        ${this.showBack ? `<button class="back" data-act="__back">‹</button>` : ''}
        <h2 data-slot="title"></h2>
        <button class="close" data-act="__close" aria-label="닫기">${iconHtml('ic_close', 24)}</button>
      </div>
      <div class="tabs" data-slot="tabs"></div>
      <div class="panel-body" data-slot="body"></div>
      <div class="panel-foot" data-slot="foot"></div>`;
    wrap.appendChild(p);
    this.root = wrap;
    this.bodyEl = p.querySelector('[data-slot=body]')!;
    this.footEl = p.querySelector('[data-slot=foot]')!;
    p.addEventListener('click', (e) => this.handleClick(e));
    p.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      const name = t.dataset.input;
      if (name) this.onInput(name, t.value, t);
    });
    parent.appendChild(wrap);
    if (!this.tab && this.tabs.length) this.tab = this.tabs[0].id;
    for (const ev of this.watch) this.unsubs.push(this.w.events.on(ev, () => this.queueRefresh()));
    this.onOpen();
    this.refresh(true);
  }

  unmount(): void {
    for (const u of this.unsubs) u();
    this.unsubs = [];
    this.onClose();
    this.root?.remove();
  }

  private handleClick(e: Event): void {
    const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
    if (!t || t.hasAttribute('disabled')) return;
    const act = t.dataset.act!;
    const arg = t.dataset.arg ?? '';
    if (act === '__close') {
      AudioManager.ui('close');
      this.manager.close(this);
      return;
    }
    if (act === '__back') {
      AudioManager.ui('close');
      this.manager.close(this);
      return;
    }
    if (act === '__tab') {
      AudioManager.ui('tap');
      this.tab = arg;
      this.onTab(arg);
      this.refresh(true);
      return;
    }
    AudioManager.ui('tap');
    this.onAction(act, arg, t, e);
  }

  onTab(_id: string): void {}

  queueRefresh(): void {
    if (this.refreshQueued) return;
    this.refreshQueued = true;
    requestAnimationFrame(() => {
      this.refreshQueued = false;
      if (this.root?.isConnected && Session.world) this.refresh();
    });
  }

  refresh(resetScroll = false): void {
    const tabsEl = this.root.querySelector('[data-slot=tabs]') as HTMLElement;
    if (this.tabs.length) {
      tabsEl.style.display = '';
      tabsEl.innerHTML = this.tabs
        .map((t) => `<button class="${cx('tab', t.id === this.tab && 'on', t.special && 'special')}" data-act="__tab" data-arg="${esc(t.id)}">${t.icon ? iconHtml(t.icon, 20) : ''}${esc(t.label)}</button>`)
        .join('');
    } else tabsEl.style.display = 'none';
    const scroll = this.bodyEl.scrollTop;
    // 포커스된 입력창 보존
    const active = document.activeElement as HTMLInputElement | null;
    const focusName = active && this.root.contains(active) ? active.dataset.input : undefined;
    const caret = focusName ? active!.selectionStart : null;
    this.bodyEl.innerHTML = this.renderBody();
    this.root.querySelector('[data-slot=title]')!.textContent = this.title;
    const foot = this.renderFoot();
    this.footEl.innerHTML = foot;
    this.footEl.style.display = foot ? '' : 'none';
    this.bodyEl.scrollTop = resetScroll ? 0 : scroll;
    if (focusName) {
      const inp = this.root.querySelector(`[data-input="${focusName}"]`) as HTMLInputElement | null;
      if (inp) {
        inp.focus();
        if (caret !== null) inp.setSelectionRange(caret, caret);
      }
    }
  }

  close(): void {
    this.manager.close(this);
  }

  toast(text: string, tone: 'info' | 'good' | 'warn' = 'info'): void {
    Session.app.emit('toast', { text, tone });
    if (tone === 'warn') AudioManager.sfx('error');
  }
}
