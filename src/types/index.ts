export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sun' | 'cloud' | 'rain' | 'storm' | 'snow';
export interface CropData {
  id: string;
  name: string;
  season: Season;
  seedPrice: number;
  baseSellPrice: number;
  growDays: number;
  regrowDays: number;
  yield: number;
  freshnessDecay: number;
  processingUses: string[];
  unlockLevel: number;
  spriteKey: string;
  color: number;
}
export interface Plot {
  crop?: string;
  growth: number;
  watered: boolean;
  irrigation: number;
  soil: number;
  fertilizer: number;
  pest: number;
  pestActive?: boolean;
  autoHarvest: boolean;
  greenhouse?: boolean;
}
export interface Tile {
  x: number;
  y: number;
  plot?: Plot;
}
export interface Building {
  id: string;
  type: string;
  x: number;
  y: number;
  rotation: boolean;
  upgrades: { feed: boolean; clean: boolean; collect: boolean; processing: boolean };
}
export interface BuildingData {
  id: string;
  name: string;
  width: number;
  height: number;
  price: number;
  skill?: string;
  capacity?: number;
  cold?: number;
}
export interface Item {
  id: string;
  type: 'crop' | 'animal' | 'processed' | 'cooking' | 'seed' | 'other';
  quantity: number;
  freshness: number;
  storage: string;
  favorite: boolean;
}
export interface Animal {
  id: string;
  name: string;
  species: string;
  sex: 'F' | 'M';
  age: number;
  grade: 1 | 2 | 3;
  stage: 'baby' | 'adult';
  production: number;
  growth: number;
  health: number;
  fertility: number;
  body: number;
  traits: string[];
  parents: string[];
  children: string[];
  births: number;
  record: number;
  lineage: string;
  building: string;
  fed: boolean;
  clean: boolean;
  products: number;
  pregnant?: { days: number; father: string; grade: 1 | 2 | 3; traits: string[] };
}
export interface AnimalData {
  id: string;
  name: string;
  product: string;
  price: number;
  building: string;
  matureDays: number;
  interval: number;
  unlockLevel: number;
  rare?: boolean;
}
export interface RecipeData {
  id: string;
  name: string;
  inputs: Record<string, number>;
  output: string;
  quantity: number;
  days: number;
  facility: string;
  price: number;
  skill: string;
  category: 'processed' | 'cooking';
}
export interface Job {
  id: string;
  recipe: string;
  building: string;
  days: number;
  automatic: boolean;
  shipment?: string;
  quantity?: number;
}
export interface SkillData {
  id: string;
  name: string;
  branch: 'farm' | 'animal';
  level: number;
  cross: number;
  price: number;
  requires?: string;
  description: string;
}
export interface Ledger {
  sales: number;
  expenses: number;
  farmXp: number;
  animalXp: number;
  births: number;
  land: number;
  discoveries: string[];
  sold: Record<string, { quantity: number; revenue: number }>;
  facilities: number;
}
export interface Settings {
  bgm: number;
  sfx: number;
  ambient: number;
  uiSize: number;
  cameraSpeed: number;
  vibration: boolean;
  joystickOpacity: number;
  tapMove: boolean;
  fps: number;
  shake: boolean;
  autosave: boolean;
}
export interface GameState {
  version: number;
  name: string;
  gold: number;
  day: number;
  elapsed: number;
  weather: Weather;
  houseLevel: number;
  landBought: number[];
  tiles: Record<string, Tile>;
  buildings: Building[];
  inventory: Item[];
  animals: Animal[];
  ancestry: Animal[];
  jobs: Job[];
  farmXp: number;
  animalXp: number;
  skills: string[];
  tutorial: number;
  merchant: {
    present: boolean;
    special: boolean;
    nextDay: number;
    misses: number;
    buyBonus: number;
    discount: number;
  };
  debt: number;
  daily: Ledger;
  monthly: Ledger;
  history: { day: number; sales: number; expenses: number; fees: number }[];
  lastDaily?: Ledger;
  lastMonthly?: Ledger & { fee: number; valueChange: number };
  monthStartingValue: number;
  birthResults: { day: number; animalId: string }[];
  discoveries: Record<string, { count: number; best: number }>;
  settings: Settings;
  nextId: number;
  seed: number;
  blueprints: { name: string; buildings: Building[] }[];
}
