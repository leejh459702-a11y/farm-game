/**
 * InteractionService — 대상 타일 + 선택 도구 → 상황별 행동 결정/실행 (순수 로직).
 * 행동 버튼 라벨, 탭 상호작용, 3×3 대량 작업 모두 여기서 처리한다.
 */
import { BUILDING_BY_ID } from '../data/buildings';
import { ITEM_BY_ID } from '../data/items';
import type { ToolId } from '../types/game';
import { isReady } from './CropSystem';
import type { World } from '../core/World';

export interface ToolDef {
  id: ToolId;
  name: string;
  icon: string;
}

export const TOOLS: ToolDef[] = [
  { id: 'hand', name: '손', icon: 'tool_hand' },
  { id: 'hoe', name: '괭이', icon: 'tool_hoe' },
  { id: 'water', name: '물뿌리개', icon: 'tool_water' },
  { id: 'seed', name: '씨앗', icon: 'tool_seed' },
  { id: 'fertilizer', name: '비료', icon: 'tool_fertilizer' },
  { id: 'feed', name: '사료', icon: 'tool_feed' },
  { id: 'shovel', name: '삽', icon: 'tool_shovel' },
];

export type ActionKind = 'harvest' | 'till' | 'plant' | 'water' | 'fertilize' | 'untill' | 'open' | 'feed' | 'plotInfo' | 'none';

export interface ResolvedAction {
  kind: ActionKind;
  label: string;
  icon: string;
  enabled: boolean;
  hint?: string;
  buildingUid?: string;
}

export function currentTool(w: World): ToolDef {
  return TOOLS[w.state.hotbar.selected] ?? TOOLS[0];
}

export function resolveAction(w: World, x: number, y: number): ResolvedAction {
  const tool = currentTool(w).id;
  const b = w.grid.buildingAt(x, y);
  if (b) {
    const d = BUILDING_BY_ID[b.type];
    if (tool === 'feed' && d.category === 'animal') return { kind: 'feed', label: '먹이 주기', icon: 'tool_feed', enabled: true, buildingUid: b.uid };
    const label = b.type === 'house' ? '집' : d.category === 'animal' ? '축사' : d.storage ? '열기' : d.station ? '시설 사용' : d.category === 'decoration' ? '조사' : '사용';
    return { kind: 'open', label, icon: b.type === 'house' ? 'ic_house' : d.storage ? 'ic_storage' : d.category === 'animal' ? 'ic_livestock' : 'ic_build', enabled: true, buildingUid: b.uid };
  }
  const p = w.crops.plotAt(x, y);
  if (p && isReady(p)) return { kind: 'harvest', label: '수확', icon: `it_${p.cropId}`, enabled: true };
  const owned = w.grid.isOwned(x, y);
  switch (tool) {
    case 'hoe':
      if (!owned) return { kind: 'none', label: '괭이', icon: 'tool_hoe', enabled: false, hint: '소유한 토지가 아닙니다' };
      if (p) return { kind: 'plotInfo', label: '농지 관리', icon: 'tool_hoe', enabled: true };
      return { kind: 'till', label: '땅 갈기', icon: 'tool_hoe', enabled: true };
    case 'water':
      if (!p) return { kind: 'none', label: '물주기', icon: 'tool_water', enabled: false, hint: '농지가 아닙니다' };
      if (p.watered) return { kind: 'none', label: '촉촉함', icon: 'tool_water', enabled: false, hint: '이미 물을 줬어요' };
      return { kind: 'water', label: '물주기', icon: 'tool_water', enabled: true };
    case 'seed': {
      const seed = w.state.hotbar.seedId;
      if (!seed || w.inventory.countAll(seed) <= 0) return { kind: 'none', label: '씨앗 없음', icon: 'tool_seed', enabled: false, hint: '씨앗을 선택하세요' };
      if (!p) return { kind: 'none', label: '심기', icon: `it_${seed}`, enabled: false, hint: '먼저 괭이로 농지를 만드세요' };
      if (p.cropId) return { kind: 'plotInfo', label: '작물 정보', icon: `it_${p.cropId}`, enabled: true };
      const c = w.crops.canPlant(p, seed);
      return { kind: 'plant', label: '심기', icon: `it_${seed}`, enabled: c.ok, hint: c.reason };
    }
    case 'fertilizer': {
      const f = w.state.hotbar.fertilizerId;
      if (!f || w.inventory.countAll(f) <= 0) return { kind: 'none', label: '비료 없음', icon: 'tool_fertilizer', enabled: false, hint: '비료를 선택하세요' };
      if (!p) return { kind: 'none', label: '비료', icon: `it_${f}`, enabled: false, hint: '농지가 아닙니다' };
      return { kind: 'fertilize', label: '비료 주기', icon: `it_${f}`, enabled: true };
    }
    case 'shovel':
      if (p && !p.cropId) return { kind: 'untill', label: '농지 메우기', icon: 'tool_shovel', enabled: true };
      return { kind: 'none', label: '삽', icon: 'tool_shovel', enabled: false, hint: p ? '작물이 있습니다' : '빈 농지만 메울 수 있어요' };
    case 'feed':
      return { kind: 'none', label: '먹이', icon: 'tool_feed', enabled: false, hint: '축사를 선택하세요' };
    default:
      if (p) return { kind: 'plotInfo', label: p.cropId ? '작물 정보' : '농지 관리', icon: p.cropId ? `it_${p.cropId}` : 'tool_hoe', enabled: true };
      return { kind: 'none', label: '조사', icon: 'tool_hand', enabled: false, hint: owned ? '빈 땅입니다' : '아직 내 땅이 아니에요' };
  }
}

export interface PerformResult {
  ok: boolean;
  kind: ActionKind;
  count: number;
  reason?: string;
  openBuilding?: string;
  openPlot?: { x: number; y: number };
  harvested?: { itemId: string; qty: number }[];
}

/** 대량 작업 대상 타일 (3×3) */
export function areaTiles(w: World, x: number, y: number): { x: number; y: number }[] {
  if (w.state.hotbar.area !== 3 || !w.skills.has('f_multi')) return [{ x, y }];
  const out: { x: number; y: number }[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push({ x: x + dx, y: y + dy });
  return out;
}

export function performAction(w: World, x: number, y: number): PerformResult {
  const a = resolveAction(w, x, y);
  if (!a.enabled) return { ok: false, kind: a.kind, count: 0, reason: a.hint };
  if (a.kind === 'open') return { ok: true, kind: 'open', count: 1, openBuilding: a.buildingUid };
  if (a.kind === 'plotInfo') return { ok: true, kind: 'plotInfo', count: 1, openPlot: { x, y } };
  if (a.kind === 'feed') {
    const b = w.state.buildings[a.buildingUid!];
    const r = w.animals.feedBarn(b);
    if (r.fed === 0) return { ok: false, kind: 'feed', count: 0, reason: r.hungry ? '건초 사료가 부족합니다' : '모두 이미 먹었어요' };
    return { ok: true, kind: 'feed', count: r.fed };
  }
  const tiles = a.kind === 'harvest' || a.kind === 'till' || a.kind === 'plant' || a.kind === 'water' || a.kind === 'fertilize' ? areaTiles(w, x, y) : [{ x, y }];
  let count = 0;
  let reason: string | undefined;
  const harvested: { itemId: string; qty: number }[] = [];
  for (const t of tiles) {
    const p = w.crops.plotAt(t.x, t.y);
    let r: { ok: boolean; reason?: string; qty?: number; itemId?: string };
    switch (a.kind) {
      case 'harvest':
        r = w.crops.harvest(p);
        if (r.ok) harvested.push({ itemId: r.itemId!, qty: r.qty! });
        break;
      case 'till':
        r = w.crops.till(t.x, t.y);
        break;
      case 'plant':
        r = w.crops.plant(p, w.state.hotbar.seedId!);
        break;
      case 'water':
        r = w.crops.water(p);
        break;
      case 'fertilize':
        r = w.crops.fertilize(p, w.state.hotbar.fertilizerId!);
        break;
      case 'untill':
        r = w.crops.untill(t.x, t.y);
        break;
      default:
        r = { ok: false };
    }
    if (r.ok) count++;
    else if (!reason) reason = r.reason;
  }
  return { ok: count > 0, kind: a.kind, count, reason, harvested };
}

export function seedChoices(w: World): { itemId: string; qty: number }[] {
  const ids = new Set<string>();
  for (const cid of ['bag', ...w.inventory.storageIds()]) for (const s of w.state.containers[cid].slots) if (s && ITEM_BY_ID[s.itemId]?.category === 'seed') ids.add(s.itemId);
  return [...ids].map((id) => ({ itemId: id, qty: w.inventory.countAll(id) }));
}

export function fertilizerChoices(w: World): { itemId: string; qty: number }[] {
  return ['basic_fertilizer', 'growth_fertilizer', 'premium_fertilizer', 'special_fertilizer', 'compost']
    .map((id) => ({ itemId: id, qty: w.inventory.countAll(id) }))
    .filter((e) => e.qty > 0);
}
