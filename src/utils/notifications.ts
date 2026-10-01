export class NotificationSystem {
  private queue = new Map<string, { count: number; text: string }>();
  push(text: string) {
    const group = text.replace(/\d+/g, '#');
    const old = this.queue.get(group);
    this.queue.set(group, { count: (old?.count ?? 0) + 1, text });
  }
  current(limit = 3) {
    return [...this.queue.values()]
      .slice(-limit)
      .map((n) => (n.count > 1 ? `${n.text} (같은 알림 ${n.count}건)` : n.text));
  }
  flush() {
    const list = [...this.queue.values()].map((n) =>
      n.count > 1 ? `${n.text} (같은 알림 ${n.count}건)` : n.text,
    );
    this.queue.clear();
    return list;
  }
}
