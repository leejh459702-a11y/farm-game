import { describe, it, expect, vi } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
describe('production PWA offline cache', () => {
  it('ships landscape manifest and all precached assets', () => {
    const manifest = JSON.parse(readFileSync('dist/manifest.webmanifest', 'utf8'));
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.icons.some((i: { sizes: string }) => i.sizes === '512x512')).toBe(true);
    const source = readFileSync('dist/sw.js', 'utf8');
    const files = JSON.parse(source.match(/const FILES=(\[[^;]+\]);/)![1]) as string[];
    for (const file of files)
      if (file !== './') expect(existsSync('dist/' + file.slice(2)), file).toBe(true);
    expect(files.some((f) => f.includes('phaser-'))).toBe(true);
  });
  it('installs atomically, serves navigation and assets offline, ignores external URLs', async () => {
    const handlers: Record<string, (event: any) => void> = {};
    const match = vi.fn(async (request: Request | string | URL) => {
      const url = String(request instanceof Request ? request.url : request);
      return new Response(url.endsWith('index.html') ? 'offline HTML' : 'cached asset');
    });
    const cache = { addAll: vi.fn(async () => {}), match };
    const storage = {
      open: vi.fn(async () => cache),
      keys: vi.fn(async () => ['little-farm-old', 'unrelated']),
      delete: vi.fn(async () => true),
    };
    const clients = { claim: vi.fn(async () => {}) },
      skipWaiting = vi.fn(async () => {}),
      fetch = vi.fn(async () => {
        throw new Error('offline');
      });
    runInNewContext(readFileSync('dist/sw.js', 'utf8'), {
      self: {
        addEventListener: (name: string, fn: any) => (handlers[name] = fn),
        location: { origin: 'https://game.test' },
        registration: { scope: 'https://game.test/farm/' },
        clients,
        skipWaiting,
      },
      caches: storage,
      URL,
      Request,
      Response,
      fetch,
    });
    let pending: Promise<unknown> = Promise.resolve();
    handlers.install({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    expect(cache.addAll).toHaveBeenCalled();
    expect(skipWaiting).toHaveBeenCalled();
    handlers.activate({ waitUntil: (p: Promise<unknown>) => (pending = p) });
    await pending;
    expect(storage.delete).toHaveBeenCalledWith('little-farm-old');
    expect(storage.delete).not.toHaveBeenCalledWith('unrelated');
    expect(clients.claim).toHaveBeenCalled();
    handlers.fetch({
      request: { url: 'https://game.test/farm/', method: 'GET', mode: 'navigate' },
      respondWith: (p: Promise<unknown>) => (pending = p),
    });
    const response = (await pending) as Response;
    expect(await response.text()).toBe('offline HTML');
    handlers.fetch({
      request: new Request('https://game.test/farm/assets/file.js'),
      respondWith: (p: Promise<unknown>) => (pending = p),
    });
    expect(await ((await pending) as Response).text()).toBe('cached asset');
    const respondWith = vi.fn();
    handlers.fetch({ request: new Request('https://other.test/file.js'), respondWith });
    expect(respondWith).not.toHaveBeenCalled();
  });
});
