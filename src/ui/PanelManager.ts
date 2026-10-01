/** PanelManager — 패널 스택 관리 + 메뉴 시간정지 */
import { Session } from '../core/Session';
import { AudioManager } from '../audio/AudioManager';
import type { Panel } from './Panel';
import { $ui, el } from './dom';

class PanelManagerImpl {
  private stack: Panel[] = [];
  private layer: HTMLElement | null = null;
  readonly listeners = new Set<() => void>();

  private ensureLayer(): HTMLElement {
    if (!this.layer || !this.layer.isConnected) {
      this.layer = el('div', 'panel-layer');
      this.layer.style.cssText = 'position:absolute;inset:0;z-index:30;';
      $ui().appendChild(this.layer);
    }
    return this.layer;
  }

  open(p: Panel): Panel {
    // 같은 id 가 이미 열려 있으면 교체
    const existing = this.stack.find((x) => x.id === p.id);
    if (existing) this.close(existing, true);
    p.manager = this;
    this.stack.push(p);
    p.mount(this.ensureLayer());
    if (p.pausesTime) Session.world?.time.pause(`panel:${p.id}`);
    AudioManager.ui('open');
    this.changed();
    return p;
  }

  close(p?: Panel, silent = false): void {
    const target = p ?? this.stack[this.stack.length - 1];
    if (!target) return;
    const i = this.stack.indexOf(target);
    if (i < 0) return;
    this.stack.splice(i, 1);
    target.unmount();
    Session.world?.time.resume(`panel:${target.id}`);
    if (!silent) this.changed();
  }

  closeAll(): void {
    while (this.stack.length) this.close(this.stack[this.stack.length - 1], true);
    this.changed();
  }

  top(): Panel | undefined {
    return this.stack[this.stack.length - 1];
  }

  isOpen(id?: string): boolean {
    return id ? this.stack.some((p) => p.id === id) : this.stack.length > 0;
  }

  get(id: string): Panel | undefined {
    return this.stack.find((p) => p.id === id);
  }

  private changed(): void {
    for (const l of this.listeners) l();
  }
}

export const Panels = new PanelManagerImpl();
