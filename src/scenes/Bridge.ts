/** 씬 ↔ DOM UI 연결 (순환 의존 방지용 레지스트리) */
import type { BuildController } from './world/BuildController';

export interface FarmBridge {
  build: BuildController;
  enterBuild(mode?: 'select' | 'land' | 'place', type?: string): void;
  exitBuild(): void;
  doAction(): void;
  focusTile(x: number, y: number): void;
  worldToScreen(wx: number, wy: number): { x: number; y: number };
  tileScreenRect(x: number, y: number, w?: number, h?: number): { x: number; y: number; w: number; h: number };
  playerScreen(): { x: number; y: number };
  merchantScreen(): { x: number; y: number } | null;
  refreshAll(): void;
  zoomBy(f: number): void;
}

/** 농지 다중 선택 모드 (농지 관리 패널이 열려 있을 때) */
export interface PlotSelectState {
  active: boolean;
  keys: Set<string>;
  onChange: () => void;
}

export const Bridge: {
  plotSelect: PlotSelectState | null; farm: FarmBridge | null; openBuilding: ((uid: string) => void) | null; openPlot: ((x: number, y: number) => void) | null; openAnimal: ((id: string) => void) | null; openMerchant: (() => void) | null } = {
  plotSelect: null,
  farm: null,
  openBuilding: null,
  openPlot: null,
  openAnimal: null,
  openMerchant: null,
};
