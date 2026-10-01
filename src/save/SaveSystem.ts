import { BalanceConfig as B } from '../data/balance';
import { createState } from '../core/state';
import type { GameState } from '../types';
export interface SaveSlot {
  slot: number;
  updated: number;
  state: GameState;
}
export function migrate(raw: unknown): GameState {
  if (!raw || typeof raw !== 'object') throw new Error('세이브 데이터 형식이 올바르지 않습니다.');
  const s = raw as GameState;
  if (s.version > B.saveVersion)
    throw new Error('이 세이브는 더 새로운 게임 버전에서 저장되었습니다.');
  if (
    !s.tiles ||
    !Array.isArray(s.buildings) ||
    !Array.isArray(s.inventory) ||
    !Number.isFinite(s.gold) ||
    !Number.isFinite(s.day)
  )
    throw new Error('손상된 세이브 데이터입니다.');
  const fresh = createState();
  return { ...fresh, ...s, settings: { ...B.defaults, ...s.settings }, version: B.saveVersion };
}
export class SaveSystem {
  constructor(private databaseName = 'my-little-farm') {}
  private db?: Promise<IDBDatabase>;
  private chain = Promise.resolve();
  private open() {
    return (this.db ??= new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(this.databaseName, 1);
      r.onupgradeneeded = () => r.result.createObjectStore('slots', { keyPath: 'slot' });
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    }));
  }
  async list(): Promise<SaveSlot[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const r = db.transaction('slots').objectStore('slots').getAll();
      r.onsuccess = () => resolve((r.result as SaveSlot[]).sort((a, b) => a.slot - b.slot));
      r.onerror = () => reject(r.error);
    });
  }
  async load(slot: number) {
    const slots = await this.list();
    const data = slots.find((s) => s.slot === slot);
    return data ? migrate(data.state) : undefined;
  }
  save(slot: number, state: GameState) {
    const snapshot = structuredClone(state);
    const run = async () => {
      const db = await this.open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('slots', 'readwrite');
        tx.objectStore('slots').put({ slot, updated: Date.now(), state: snapshot });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    };
    const pending = this.chain.then(run);
    this.chain = pending.catch(() => {});
    return pending;
  }
  async remove(slot: number) {
    const db = await this.open();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('slots', 'readwrite');
      tx.objectStore('slots').delete(slot);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
