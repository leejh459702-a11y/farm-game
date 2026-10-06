/**
 * World — 게임 상태(GameState)와 모든 시스템을 묶는 루트 객체.
 * Phaser 에 의존하지 않으므로 Vitest 로 그대로 테스트할 수 있다.
 */
import { BALANCE } from '../data/balance';
import type { GameState } from '../types/game';
import { EventBus } from './EventBus';
import type { GameNotification, WorldEvents } from './events';
import { nextRandom } from '../utils/rng';
import { InventorySystem } from '../systems/InventorySystem';
import { FreshnessSystem } from '../systems/FreshnessSystem';
import { FarmGridSystem } from '../systems/FarmGridSystem';
import { LandPurchaseSystem } from '../systems/LandPurchaseSystem';
import { CropSystem } from '../systems/CropSystem';
import { SkillSystem } from '../systems/SkillSystem';
import { HouseUpgradeSystem } from '../systems/HouseUpgradeSystem';
import { FinanceSystem } from '../systems/FinanceSystem';
import { CodexSystem } from '../systems/CodexSystem';
import { TutorialSystem } from '../systems/TutorialSystem';
import { MerchantSystem } from '../systems/MerchantSystem';
import { AnimalSystem } from '../systems/AnimalSystem';
import { BreedingSystem } from '../systems/BreedingSystem';
import { ProcessingSystem } from '../systems/ProcessingSystem';
import { AutomationSystem } from '../systems/AutomationSystem';
import { GameTimeSystem } from '../systems/GameTimeSystem';
import { LifeSystem } from '../systems/LifeSystem';
import { RegionSystem } from '../systems/RegionSystem';
import { AquacultureSystem } from '../systems/AquacultureSystem';
import { AgingSystem } from '../systems/AgingSystem';
import { JournalSystem } from '../systems/JournalSystem';
import { MineSystem } from '../systems/MineSystem';
import { FishingSystem } from '../systems/FishingSystem';
import { calendar, type CalendarInfo } from '../systems/SeasonSystem';
import { footprint } from '../data/buildings';

export class World {
  readonly events = new EventBus<WorldEvents>();
  readonly balance = BALANCE;
  readonly inventory: InventorySystem;
  readonly freshness: FreshnessSystem;
  readonly grid: FarmGridSystem;
  readonly land: LandPurchaseSystem;
  readonly crops: CropSystem;
  readonly skills: SkillSystem;
  readonly house: HouseUpgradeSystem;
  readonly finance: FinanceSystem;
  readonly codex: CodexSystem;
  readonly tutorial: TutorialSystem;
  readonly merchant: MerchantSystem;
  readonly animals: AnimalSystem;
  readonly breeding: BreedingSystem;
  readonly processing: ProcessingSystem;
  readonly automation: AutomationSystem;
  readonly time: GameTimeSystem;
  readonly life: LifeSystem;
  readonly regions: RegionSystem;
  readonly fishing: FishingSystem;
  readonly ponds: AquacultureSystem;
  readonly aging: AgingSystem;
  readonly journal: JournalSystem;
  readonly mine: MineSystem;
  /** 최근 알림 기록 (세이브 안 함) */
  readonly notifyLog: (GameNotification & { day: number })[] = [];

  constructor(public state: GameState) {
    this.inventory = new InventorySystem(this);
    this.freshness = new FreshnessSystem(this);
    this.codex = new CodexSystem(this);
    this.finance = new FinanceSystem(this);
    this.skills = new SkillSystem(this);
    this.grid = new FarmGridSystem(this);
    this.land = new LandPurchaseSystem(this);
    this.crops = new CropSystem(this);
    this.house = new HouseUpgradeSystem(this);
    this.tutorial = new TutorialSystem(this);
    this.merchant = new MerchantSystem(this);
    this.animals = new AnimalSystem(this);
    this.breeding = new BreedingSystem(this);
    this.processing = new ProcessingSystem(this);
    this.automation = new AutomationSystem(this);
    this.time = new GameTimeSystem(this);
    this.life = new LifeSystem(this);
    this.regions = new RegionSystem(this);
    this.fishing = new FishingSystem(this);
    this.ponds = new AquacultureSystem(this);
    this.aging = new AgingSystem(this);
    this.journal = new JournalSystem(this);
    this.mine = new MineSystem(this);
  }

  /** 누적 활동 카운터 증가 */
  count(key: string, n = 1): void {
    if (n <= 0) return;
    const c = (this.state.counters ??= {});
    c[key] = (c[key] ?? 0) + n;
    this.events.emit('counter', { key, total: c[key] });
    this.journal?.check();
  }

  rand(): number {
    return nextRandom(this.state);
  }

  uid(prefix: string): string {
    return `${prefix}${(this.state.uid++).toString(36)}`;
  }

  get cal(): CalendarInfo {
    return calendar(this.state.time.day);
  }

  earn(gold: number, _reason: string, record = true): void {
    if (gold <= 0) return;
    this.state.gold += gold;
    if (record) this.finance.recordIncome(gold);
    this.events.emit('gold', this.state.gold);
  }

  spend(gold: number, _reason: string): boolean {
    if (gold <= 0) return true;
    if (this.state.gold < gold) return false;
    this.state.gold -= gold;
    this.finance.recordExpense(gold);
    this.events.emit('gold', this.state.gold);
    return true;
  }

  notify(n: GameNotification): void {
    this.notifyLog.unshift({ ...n, day: this.state.time.day });
    if (this.notifyLog.length > 60) this.notifyLog.pop();
    this.events.emit('notify', n);
  }

  /** 집 자동 배치 (튜토리얼 스킵 등) */
  autoPlaceHouse(): void {
    const { originX, originY, size } = BALANCE.start;
    for (let y = originY; y < originY + size; y++)
      for (let x = originX; x < originX + size; x++) {
        if (this.grid.canPlace('house', x, y, 0).ok) {
          this.grid.place('house', x, y, 0, { free: true });
          return;
        }
      }
  }

  /** 플레이어 위치(픽셀) → 타일 */
  playerTile(): { x: number; y: number } {
    const ts = BALANCE.farm.tileSize;
    return { x: Math.floor(this.state.player.x / ts), y: Math.floor(this.state.player.y / ts) };
  }

  /** 건물 앞 (아래쪽 가운데) 타일 */
  frontOf(uid: string): { x: number; y: number } | null {
    const b = this.state.buildings[uid];
    if (!b) return null;
    const { w, h } = footprint(b.type, b.rot);
    return { x: b.x + Math.floor(w / 2), y: b.y + h };
  }
}
