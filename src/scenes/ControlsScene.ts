/** ControlsScene — 왼쪽 가상 조이스틱 (줌 1 화면 공간) */
import Phaser from 'phaser';
import { InputState } from './InputState';
import { SettingsStore } from '../services/SettingsStore';
import { Session } from '../core/Session';
import { Bridge } from './Bridge';
import { Panels } from '../ui/PanelManager';

export class ControlsScene extends Phaser.Scene {
  private base!: Phaser.GameObjects.Arc;
  private knob!: Phaser.GameObjects.Arc;
  private ring!: Phaser.GameObjects.Arc;
  private pid: number | null = null;
  private origin = { x: 0, y: 0 };
  private readonly R = 70;

  constructor() {
    super('Controls');
  }

  create(): void {
    this.base = this.add.circle(0, 0, this.R, 0x3b2a22, 0.35).setStrokeStyle(4, 0xfff6e2, 0.5);
    this.ring = this.add.circle(0, 0, this.R * 0.55, 0x000000, 0).setStrokeStyle(2, 0xfff6e2, 0.25);
    this.knob = this.add.circle(0, 0, 32, 0xfff6e2, 0.85).setStrokeStyle(4, 0x5a3a22, 0.9);
    this.setRest();
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (!this.enabledNow() || this.pid !== null) return;
      if (p.x > this.scale.width * 0.42) return;
      this.pid = p.id;
      InputState.capturedPointers.add(p.id);
      this.origin = { x: p.x, y: p.y };
      this.base.setPosition(p.x, p.y);
      this.ring.setPosition(p.x, p.y);
      this.knob.setPosition(p.x, p.y);
      InputState.joyActive = true;
      InputState.joyX = 0;
      InputState.joyY = 0;
      this.applyAlpha(true);
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pid) return;
      let dx = p.x - this.origin.x;
      let dy = p.y - this.origin.y;
      const d = Math.hypot(dx, dy);
      if (d > this.R) {
        // 손가락을 따라 베이스 이동
        this.origin.x += (dx / d) * (d - this.R);
        this.origin.y += (dy / d) * (d - this.R);
        this.base.setPosition(this.origin.x, this.origin.y);
        this.ring.setPosition(this.origin.x, this.origin.y);
        dx = p.x - this.origin.x;
        dy = p.y - this.origin.y;
      }
      this.knob.setPosition(this.origin.x + dx, this.origin.y + dy);
      InputState.joyX = dx / this.R;
      InputState.joyY = dy / this.R;
    });
    const up = (p: Phaser.Input.Pointer) => {
      if (p.id !== this.pid) return;
      this.release();
      // pointerup 이후에 Farm 이 탭으로 오인하지 않도록 한 프레임 뒤 해제
      this.time.delayedCall(0, () => InputState.capturedPointers.delete(p.id));
    };
    this.input.on('pointerup', up);
    this.input.on('pointerupoutside', up);
    this.scale.on('resize', this.setRest, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.setRest, this);
      this.release();
    });
    SettingsStore.events.on('change', () => this.setRest());
  }

  private enabledNow(): boolean {
    return SettingsStore.value.controlMode === 'joystick' && !Bridge.farm?.build.active && !Panels.isOpen() && !!Session.world;
  }

  private release(): void {
    this.pid = null;
    InputState.joyActive = false;
    InputState.joyX = 0;
    InputState.joyY = 0;
    this.setRest();
  }

  private setRest(): void {
    if (!this.base) return;
    const x = 150;
    const y = this.scale.height - 150;
    this.origin = { x, y };
    this.base.setPosition(x, y);
    this.ring.setPosition(x, y);
    this.knob.setPosition(x, y);
    this.applyAlpha(false);
  }

  private applyAlpha(active: boolean): void {
    const vis = this.enabledNow();
    const a = SettingsStore.value.joystickOpacity * (active ? 1 : 0.6);
    for (const o of [this.base, this.ring, this.knob]) o.setVisible(vis).setAlpha(a);
  }

  update(): void {
    // 패널/건설 모드 전환 시 표시 갱신
    const vis = this.enabledNow();
    if (this.base.visible !== vis) {
      if (!vis) this.release();
      this.applyAlpha(this.pid !== null);
    }
  }
}
