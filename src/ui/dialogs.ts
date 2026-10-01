/** 공용 대화상자: 확인 / 입력 / 수량 선택 / 안내 */
import { Panel } from './Panel';
import { Panels } from './PanelManager';
import { esc } from './dom';
import { iconHtml } from '../assets/AssetRegistry';

class ConfirmPanel extends Panel {
  readonly id = 'confirm';
  size = 'small' as const;
  constructor(
    title: string,
    private html: string,
    private okLabel: string,
    private onOk: () => void,
    private danger = false,
    private onCancel?: () => void,
  ) {
    super();
    this.title = title;
  }
  renderBody(): string {
    return `<div style="line-height:1.5">${this.html}</div>`;
  }
  renderFoot(): string {
    return `<button class="btn grow" data-act="cancel">취소</button><button class="btn ${this.danger ? 'red' : 'green'} grow" data-act="ok">${esc(this.okLabel)}</button>`;
  }
  onAction(act: string): void {
    this.close();
    if (act === 'ok') this.onOk();
    else this.onCancel?.();
  }
}

export function confirmDialog(title: string, html: string, okLabel: string, onOk: () => void, danger = false, onCancel?: () => void): void {
  Panels.open(new ConfirmPanel(title, html, okLabel, onOk, danger, onCancel));
}

class InfoPanel extends Panel {
  readonly id = 'info';
  size = 'small' as const;
  constructor(
    title: string,
    private html: string,
    private icon?: string,
  ) {
    super();
    this.title = title;
  }
  renderBody(): string {
    return `<div class="row" style="align-items:flex-start">${this.icon ? iconHtml(this.icon, 48) : ''}<div class="grow" style="line-height:1.5">${this.html}</div></div>`;
  }
  renderFoot(): string {
    return `<button class="btn green block" data-act="ok">확인</button>`;
  }
  onAction(): void {
    this.close();
  }
}

export function infoDialog(title: string, html: string, icon?: string): void {
  Panels.open(new InfoPanel(title, html, icon));
}

class PromptPanel extends Panel {
  readonly id = 'prompt';
  size = 'small' as const;
  private value: string;
  constructor(
    title: string,
    private label: string,
    initial: string,
    private onOk: (v: string) => void,
    private maxLen = 12,
  ) {
    super();
    this.title = title;
    this.value = initial;
  }
  renderBody(): string {
    return `<div class="col"><label class="muted small">${esc(this.label)}</label><input class="search" data-input="v" maxlength="${this.maxLen}" value="${esc(this.value)}" /></div>`;
  }
  onOpen(): void {
    setTimeout(() => (this.root.querySelector('input') as HTMLInputElement | null)?.focus(), 50);
  }
  renderFoot(): string {
    return `<button class="btn grow" data-act="cancel">취소</button><button class="btn green grow" data-act="ok">확인</button>`;
  }
  onInput(_n: string, v: string): void {
    this.value = v;
  }
  onAction(act: string): void {
    this.close();
    if (act === 'ok') this.onOk(this.value.trim());
  }
}

export function promptDialog(title: string, label: string, initial: string, onOk: (v: string) => void, maxLen = 12): void {
  Panels.open(new PromptPanel(title, label, initial, onOk, maxLen));
}

class QuantityPanel extends Panel {
  readonly id = 'quantity';
  size = 'small' as const;
  private qty = 1;
  constructor(
    title: string,
    private icon: string,
    private max: number,
    private unitPrice: number,
    private verb: string,
    private onOk: (q: number) => void,
    private priceLabel = '',
  ) {
    super();
    this.title = title;
    this.qty = Math.min(1, max);
  }
  renderBody(): string {
    const total = this.unitPrice * this.qty;
    return `<div class="col center" style="align-items:center">
      ${iconHtml(this.icon, 56)}
      <div class="qty-stepper">
        <button class="btn small" data-act="d" data-arg="-10">-10</button>
        <button class="btn small" data-act="d" data-arg="-1">-</button>
        <span style="font-size:1.4rem">${this.qty}</span>
        <button class="btn small" data-act="d" data-arg="1">+</button>
        <button class="btn small" data-act="d" data-arg="10">+10</button>
        <button class="btn small" data-act="max">최대</button>
      </div>
      ${this.unitPrice ? `<div class="muted">${this.priceLabel || '합계'}: <span class="gold-text">${total.toLocaleString()}G</span> <span class="tiny">(개당 ${this.unitPrice.toLocaleString()}G)</span></div>` : ''}
    </div>`;
  }
  renderFoot(): string {
    return `<button class="btn grow" data-act="cancel">취소</button><button class="btn green grow" data-act="ok" ${this.qty <= 0 ? 'disabled' : ''}>${esc(this.verb)}</button>`;
  }
  onAction(act: string, arg: string): void {
    if (act === 'd') {
      this.qty = Math.max(1, Math.min(this.max, this.qty + Number(arg)));
      this.refresh();
      return;
    }
    if (act === 'max') {
      this.qty = this.max;
      this.refresh();
      return;
    }
    this.close();
    if (act === 'ok' && this.qty > 0) this.onOk(this.qty);
  }
}

export function quantityDialog(title: string, icon: string, max: number, unitPrice: number, verb: string, onOk: (q: number) => void, priceLabel = ''): void {
  if (max <= 1) {
    onOk(Math.max(0, max));
    return;
  }
  Panels.open(new QuantityPanel(title, icon, max, unitPrice, verb, onOk, priceLabel));
}
