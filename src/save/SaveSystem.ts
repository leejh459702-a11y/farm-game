/**
 * SaveSystem — IndexedDB 기반 로컬 세이브 (여러 슬롯).
 * IndexedDB 를 쓸 수 없는 환경에서는 localStorage 로 폴백.
 */
import { SAVE_VERSION } from '../core/newGame';
import type { GameState } from '../types/game';
import { migrate } from './migrations';
import { calendar } from '../systems/SeasonSystem';

const DB_NAME = 'my-little-farm';
const STORE = 'saves';
export const SLOT_COUNT = 3;

export interface SlotMeta {
  slot: number;
  exists: boolean;
  farmName?: string;
  savedAt?: number;
  day?: number;
  gold?: number;
  houseLevel?: number;
  playTimeSec?: number;
  label?: string;
}

interface SaveRecord {
  slot: number;
  version: number;
  savedAt: number;
  data: GameState;
}

export class SaveSystem {
  private dbp: Promise<IDBDatabase | null> | null = null;

  constructor(private idb: IDBFactory | null = typeof indexedDB !== 'undefined' ? indexedDB : null) {}

  private open(): Promise<IDBDatabase | null> {
    if (this.dbp) return this.dbp;
    this.dbp = new Promise((resolve) => {
      if (!this.idb) return resolve(null);
      try {
        const req = this.idb.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'slot' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.dbp;
  }

  async save(slot: number, state: GameState): Promise<void> {
    state.meta.savedAt = Date.now();
    state.version = SAVE_VERSION;
    // 깊은 복사로 스냅샷 (이후 변경과 분리)
    const rec: SaveRecord = { slot, version: SAVE_VERSION, savedAt: state.meta.savedAt, data: JSON.parse(JSON.stringify(state)) };
    const db = await this.open();
    if (!db) {
      localStorage.setItem(`${DB_NAME}:${slot}`, JSON.stringify(rec));
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(rec);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  private async getRecord(slot: number): Promise<SaveRecord | null> {
    const db = await this.open();
    if (!db) {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(`${DB_NAME}:${slot}`) : null;
      return raw ? (JSON.parse(raw) as SaveRecord) : null;
    }
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(slot);
      req.onsuccess = () => resolve((req.result as SaveRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
  }

  async load(slot: number): Promise<GameState | null> {
    const rec = await this.getRecord(slot);
    if (!rec) return null;
    return migrate(rec.data);
  }

  async remove(slot: number): Promise<void> {
    const db = await this.open();
    if (!db) {
      localStorage.removeItem(`${DB_NAME}:${slot}`);
      return;
    }
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async listSlots(): Promise<SlotMeta[]> {
    const out: SlotMeta[] = [];
    for (let slot = 1; slot <= SLOT_COUNT; slot++) {
      try {
        const rec = await this.getRecord(slot);
        if (!rec) {
          out.push({ slot, exists: false });
          continue;
        }
        const d = rec.data;
        const c = calendar(d.time.day);
        out.push({
          slot,
          exists: true,
          farmName: d.meta.farmName,
          savedAt: rec.savedAt,
          day: d.time.day,
          gold: d.gold,
          houseLevel: d.house.level,
          playTimeSec: d.meta.playTimeSec,
          label: `${c.year}년차 ${['봄', '여름', '가을', '겨울'][c.seasonIndex]} ${c.month}월 ${c.dayOfMonth}일`,
        });
      } catch {
        out.push({ slot, exists: false });
      }
    }
    return out;
  }

  async latestSlot(): Promise<number | null> {
    const slots = (await this.listSlots()).filter((s) => s.exists);
    if (!slots.length) return null;
    slots.sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0));
    return slots[0].slot;
  }
}
