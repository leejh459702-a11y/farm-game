/** 타입 안전한 경량 이벤트 버스 (Phaser 비의존 — 로직/테스트에서 사용) */
export class EventBus<E extends object> {
  private map = new Map<keyof E, Set<(p: never) => void>>();

  on<K extends keyof E>(key: K, fn: (payload: E[K]) => void): () => void {
    let set = this.map.get(key);
    if (!set) this.map.set(key, (set = new Set()));
    set.add(fn as (p: never) => void);
    return () => this.off(key, fn);
  }

  off<K extends keyof E>(key: K, fn: (payload: E[K]) => void): void {
    this.map.get(key)?.delete(fn as (p: never) => void);
  }

  emit<K extends keyof E>(key: K, payload: E[K]): void {
    const set = this.map.get(key);
    if (!set) return;
    for (const fn of [...set]) (fn as (p: E[K]) => void)(payload);
  }

  clear(): void {
    this.map.clear();
  }
}
