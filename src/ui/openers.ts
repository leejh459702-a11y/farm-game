/** 패널 열기 라우터 + 씬 브리지 연결 */
import { Session } from '../core/Session';
import { BUILDING_BY_ID } from '../data/buildings';
import { Bridge } from '../scenes/Bridge';
import { Panels } from './PanelManager';
import { infoDialog } from './dialogs';
import { esc } from './dom';
import { HousePanel } from './panels/HousePanel';
import { InventoryPanel } from './panels/InventoryPanel';
import { PlotPanel, SeedPickerPanel, FertPickerPanel } from './panels/PlotPanel';
import { MerchantPanel } from './panels/MerchantPanel';
import { BarnPanel, AnimalListPanel, AnimalDetailPanel } from './panels/AnimalPanels';
import { BreedingPanel } from './panels/BreedingPanel';
import { StationPanel } from './panels/StationPanel';
import { SkillTreePanel } from './panels/SkillTreePanel';
import { CodexPanel } from './panels/CodexPanel';
import { OverviewPanel } from './panels/OverviewPanel';
import { FinancePanel, CalendarPanel } from './panels/SummaryPanels';
import { BlueprintPanel } from './panels/BlueprintPanel';
import { PausePanel } from './panels/PausePanel';
import { PondPanel } from './panels/PondPanel';
import { JournalPanel } from './panels/JournalPanel';
import { CellarPanel } from './panels/CellarPanel';
import { GreenhousePanel } from './panels/GreenhousePanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { SaveSlotsPanel } from './MainMenu';

export type PanelName =
  | 'inventory'
  | 'pause'
  | 'overview'
  | 'merchant'
  | 'skills'
  | 'finance'
  | 'calendar'
  | 'seedPicker'
  | 'fertPicker'
  | 'blueprints'
  | 'codex'
  | 'animals'
  | 'settings'
  | 'save'
  | 'house'
  | 'journal';

export function openPanel(name: PanelName, arg?: string): void {
  const w = Session.world;
  if (!w) return;
  switch (name) {
    case 'inventory':
      Panels.open(new InventoryPanel(arg));
      break;
    case 'pause':
      Panels.open(new PausePanel());
      break;
    case 'overview':
      Panels.open(new OverviewPanel());
      break;
    case 'merchant':
      if (!w.state.merchant.present) {
        infoDialog('방문상인', '오늘은 상인이 오지 않았어요.<br>상인은 2~3일마다 농장을 찾아옵니다.', 'ic_merchant');
        return;
      }
      w.tutorial.signal('merchantOpened');
      Panels.open(new MerchantPanel());
      break;
    case 'skills':
      Panels.open(new SkillTreePanel(arg === 'livestock' ? 'livestock' : 'farming'));
      break;
    case 'finance':
      Panels.open(new FinancePanel());
      break;
    case 'calendar':
      Panels.open(new CalendarPanel());
      break;
    case 'seedPicker':
      Panels.open(new SeedPickerPanel());
      break;
    case 'fertPicker':
      Panels.open(new FertPickerPanel());
      break;
    case 'blueprints':
      Panels.open(new BlueprintPanel());
      break;
    case 'journal':
      Panels.open(new JournalPanel());
      break;
    case 'codex':
      Panels.open(new CodexPanel());
      break;
    case 'animals':
      Panels.open(new AnimalListPanel());
      break;
    case 'settings':
      Panels.open(new SettingsPanel());
      break;
    case 'save':
      Panels.open(new SaveSlotsPanel('save'));
      break;
    case 'house':
      Panels.open(new HousePanel());
      break;
  }
}

export function openBuilding(uid: string): void {
  const w = Session.world;
  const b = w?.state.buildings[uid];
  if (!w || !b) return;
  const d = BUILDING_BY_ID[b.type];
  if (b.type === 'house') return void Panels.open(new HousePanel());
  if (d.storage && b.containerId) return void Panels.open(new InventoryPanel(b.containerId));
  if (d.category === 'animal') return void Panels.open(new BarnPanel(uid));
  if (d.station) return void Panels.open(new StationPanel(uid));
  if (b.type === 'breeding' || b.type === 'breedlab') return void Panels.open(new BreedingPanel());
  if (b.type === 'greenhouse') return void Panels.open(new GreenhousePanel(uid));
  if (b.type === 'fishpond') return void Panels.open(new PondPanel(uid));
  if (b.type === 'cellar') return void Panels.open(new CellarPanel(uid));
  infoDialog(d.name, `${esc(d.desc)}${d.beauty ? `<br><span class="muted small">농장 아름다움 +${d.beauty} (상인 판매가 소폭 상승)</span>` : ''}`, d.spriteKey);
}

export function installOpeners(): void {
  Bridge.openBuilding = openBuilding;
  Bridge.openPlot = (x, y) => Panels.open(new PlotPanel([`${x},${y}`]));
  Bridge.openAnimal = (id) => Panels.open(new AnimalDetailPanel(id));
  Bridge.openMerchant = () => openPanel('merchant');
}
