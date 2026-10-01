const paths: Record<string, string> = {
  leaf: 'M12 20C3 16 4 5 20 3c1 13-4 18-8 17Zm-6-2L16 8',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm0-6v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm3 5h-4a2 2 0 0 0 0 4h2a2 2 0 0 1 0 4H9m3-10v12',
  home: 'm3 11 9-8 9 8M5 10v11h14V10M10 21v-7h4v7',
  bag: 'M5 8h14l1 13H4L5 8Zm4 0V5a3 3 0 0 1 6 0v3',
  build: 'm14 3 7 7-3 3-3-3L5 21l-3-3L13 7l-3-3 4-1Z',
  book: 'M12 5C9 2 3 3 3 3v16s6-1 9 2c3-3 9-2 9-2V3s-6-1-9 2Zm0 0v16',
  animal:
    'M6 12c-6-6 0-12 4-3m4 0c4-9 10-3 4 3M5 13c0-7 14-7 14 0v4c0 6-14 6-14 0v-4Zm4 1v1m6-1v1m-4 3h2',
  seed: 'M12 21V10M12 13C3 13 3 5 3 5c8 0 9 8 9 8Zm0-4c0-7 8-7 8-7s0 7-8 7Z',
  water: 'M12 2C8 9 4 12 4 16a8 8 0 0 0 16 0c0-4-4-7-8-14Zm-4 14c0 2 2 4 4 4',
  hoe: 'M4 4h16v4H4V4Zm9 4v13',
  hand: 'M8 13V6a2 2 0 0 1 4 0v7-9a2 2 0 0 1 4 0v9-6a2 2 0 0 1 4 0v10l-4 5H9l-7-8c-1-2 1-4 3-2l3 3',
  store: 'M3 9h18l-2-6H5L3 9Zm2 0v12h14V9M9 21v-7h6v7',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Zm0 3v6l4 3',
  settings:
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Zm-3-5h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1 1-3Z',
  close: 'm6 6 12 12M6 18 18 6',
  save: 'M3 3h15l3 3v15H3V3Zm4 0v7h10V3M7 21v-7h10v7',
  chart: 'M3 3v18h18M7 17v-5m5 5V7m5 10V4',
  arrow: 'M3 12h18m-6-6 6 6-6 6',
  pause: 'M8 4v16M16 4v16',
  check: 'm4 12 5 5L20 6',
  expand: 'M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6',
  heart: 'M12 21 3 12C-2 3 8 0 12 7c4-7 14-4 9 5l-9 9Z',
  tree: 'M12 3 4 13h5l-4 4h6v5h2v-5h6l-4-4h5L12 3Z',
};
export const icon = (name: string) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${`<path d="${paths[name] ?? paths.leaf}"/>`}</svg>`;
