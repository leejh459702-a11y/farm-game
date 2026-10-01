import { defineConfig } from 'vite';
export default defineConfig({
  base: './',
  plugins: [
    {
      name: 'offline-cache',
      generateBundle(_options, bundle) {
        const files = [
          './',
          './index.html',
          './manifest.webmanifest',
          './icon.svg',
          './icon-192.png',
          './icon-512.png',
          ...Object.keys(bundle).map((k) => './' + k),
        ];
        let hash = 0;
        for (const c of files.join('|')) hash = (hash * 31 + c.charCodeAt(0)) >>> 0;
        this.emitFile({
          type: 'asset',
          fileName: 'sw.js',
          source: `const CACHE='little-farm-${hash}';const FILES=${JSON.stringify([...new Set(files)])};self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('little-farm-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith(caches.open(CACHE).then(async cache=>{if(event.request.mode==='navigate'){try{return await fetch(event.request);}catch{return await cache.match(new URL('index.html',self.registration.scope))||Response.error();}}return await cache.match(event.request)||fetch(event.request);}));});`,
        });
      },
    },
  ],
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1250,
    rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } },
  },
  server: { port: 5173, strictPort: true },
});
