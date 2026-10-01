import Phaser from 'phaser';
import { crops } from '../data/crops';
import { animals } from '../data/animals';
import { buildings } from '../data/buildings';
const css = (c: number) => `#${c.toString(16).padStart(6, '0')}`;
export function createPixelAssets(scene: Phaser.Scene) {
  const make = (key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) => {
    const t = scene.textures.createCanvas(key, w, h)!;
    const c = t.context;
    c.imageSmoothingEnabled = false;
    draw(c);
    t.refresh();
  };
  const rect = (
    c: CanvasRenderingContext2D,
    color: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ) => {
    c.fillStyle = color;
    c.fillRect(x, y, w, h);
  };
  for (let v = 0; v < 4; v++)
    make(`grass${v}`, 32, 32, (c) => {
      rect(c, ['#9cba78', '#9bb976', '#a0bd7e', '#95b573'][v], 0, 0, 32, 32);
      for (let i = 0; i < 10; i++) {
        const x = (i * 17 + v * 11) % 30,
          y = (i * 13 + v * 7) % 30;
        rect(c, i % 3 ? '#adca86' : '#88a765', x, y, 2, 1);
        if (i % 3 === 0) rect(c, '#b7cf93', x + 1, y - 1, 1, 2);
      }
    });
  for (const wet of [false, true])
    make(wet ? 'soil-wet' : 'soil', 32, 32, (c) => {
      rect(c, wet ? '#76543f' : '#a07850', 0, 0, 32, 32);
      rect(c, wet ? '#8b6548' : '#b58b5b', 2, 2, 28, 26);
      for (let y = 5; y < 30; y += 7) {
        rect(c, wet ? '#634b3a' : '#8d6749', 3, y, 26, 2);
        rect(c, wet ? '#967550' : '#c79c66', 4, y + 2, 24, 1);
      }
      rect(c, '#6d533c', 0, 30, 32, 2);
    });
  make('tree', 48, 64, (c) => {
    rect(c, '#799658', 5, 54, 39, 7);
    rect(c, '#735540', 22, 31, 7, 29);
    rect(c, '#9d7650', 22, 34, 3, 23);
    rect(c, '#395e48', 5, 16, 38, 30);
    rect(c, '#436f50', 0, 23, 47, 22);
    rect(c, '#518459', 7, 8, 34, 34);
    rect(c, '#64935e', 12, 2, 23, 30);
    rect(c, '#77a46a', 16, 6, 13, 18);
    rect(c, '#5b8c58', 2, 26, 13, 12);
    rect(c, '#86ad71', 18, 6, 8, 3);
    rect(c, '#86ad71', 7, 24, 8, 3);
    rect(c, '#c9b668', 31, 21, 3, 3);
    rect(c, '#c9b668', 13, 33, 3, 3);
  });
  make('flowers', 32, 32, (c) => {
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 5,
        y = 9 + ((i * 7) % 15);
      rect(c, '#6b9257', x, y + 2, 2, 5);
      rect(c, ['#f4e6b5', '#d98d87', '#edce84'][i % 3], x - 2, y, 6, 3);
      rect(c, '#f5d774', x, y, 2, 2);
    }
  });
  make('rock', 24, 20, (c) => {
    rect(c, '#79905c', 1, 14, 23, 5);
    rect(c, '#8b9588', 3, 5, 18, 11);
    rect(c, '#acb3a2', 6, 2, 12, 12);
    rect(c, '#d1d0b7', 8, 3, 8, 3);
    rect(c, '#697f79', 3, 14, 16, 3);
  });
  make('player', 24, 32, (c) => {
    rect(c, '#739459', 4, 29, 18, 3);
    rect(c, '#4a5b52', 6, 24, 4, 7);
    rect(c, '#4a5b52', 14, 24, 4, 7);
    rect(c, '#5d8290', 5, 16, 14, 10);
    rect(c, '#88a5a6', 7, 17, 10, 3);
    rect(c, '#f0c79c', 3, 17, 3, 7);
    rect(c, '#f0c79c', 18, 17, 3, 7);
    rect(c, '#745039', 7, 7, 11, 10);
    rect(c, '#efc99d', 7, 9, 11, 8);
    rect(c, '#4c463b', 9, 12, 2, 2);
    rect(c, '#4c463b', 15, 12, 2, 2);
    rect(c, '#d99274', 11, 15, 3, 1);
    rect(c, '#d2aa6e', 2, 6, 21, 4);
    rect(c, '#ecd39a', 6, 1, 13, 7);
    rect(c, '#b9945f', 7, 5, 11, 2);
  });
  make('merchant', 32, 48, (c) => {
    rect(c, '#775740', 2, 24, 28, 20);
    rect(c, '#ba8761', 4, 28, 24, 13);
    rect(c, '#493c34', 5, 41, 5, 6);
    rect(c, '#493c34', 23, 41, 5, 6);
    rect(c, '#d69275', 0, 12, 32, 13);
    for (let x = 0; x < 32; x += 8) rect(c, '#f7e3b0', x, 12, 4, 13);
    rect(c, '#f4d6a3', 12, 3, 10, 10);
    rect(c, '#56755b', 9, 2, 16, 4);
    rect(c, '#adce79', 6, 29, 5, 5);
    rect(c, '#ecb86f', 14, 29, 5, 5);
    rect(c, '#d5755b', 22, 29, 4, 5);
  });
  for (const crop of crops) {
    for (let stage = 0; stage < 4; stage++)
      make(`${crop.spriteKey}-${stage}`, 32, 32, (c) => {
        if (stage === 0) {
          rect(c, '#614c36', 12, 17, 7, 3);
          return;
        }
        rect(c, '#50784d', 15, 12 - stage * 2, 2, 16);
        rect(c, '#689553', 8, 12, 9, 4);
        rect(c, '#7da55b', 17, 9, 8, 4);
        rect(c, '#b0c57b', 9, 12, 5, 1);
        if (stage >= 2) {
          rect(c, css(crop.color), 10, 17, 12, 9);
          rect(c, css(crop.color), 12, 15, 8, 14);
          rect(c, '#f0cc86', 12, 18, 3, 3);
          if (stage === 3) {
            rect(c, '#496d43', 5, 8, 10, 4);
            rect(c, '#759c52', 16, 3, 9, 9);
            rect(c, '#91b365', 18, 4, 4, 4);
          }
        }
      });
  }
  for (const a of animals)
    make(`animal-${a.id}`, 32, 28, (c) => {
      const big = ['cow', 'buffalo', 'pig', 'sheep', 'alpaca', 'goat'].includes(a.id),
        body = a.id === 'pig' ? '#ddaca1' : a.id === 'buffalo' ? '#74857c' : '#f6edcc';
      rect(c, '#799258', 3, 24, 26, 3);
      rect(c, '#6a5544', 7, 21, 3, 5);
      rect(c, '#6a5544', 22, 21, 3, 5);
      rect(c, body, big ? 4 : 8, 10, big ? 22 : 16, 13);
      rect(c, body, 19, 5, 10, 14);
      rect(c, '#e8cfab', 22, 15, 8, 4);
      rect(c, '#3f4c40', 25, 9, 2, 2);
      if (a.id === 'cow') {
        rect(c, '#6c7062', 8, 12, 8, 7);
        rect(c, '#6c7062', 20, 7, 5, 4);
      }
      if (!big) {
        rect(c, '#d27453', 24, 3, 4, 3);
        rect(c, '#e8b15f', 28, 11, 4, 3);
        rect(c, '#ddcfb0', 4, 9, 7, 8);
      }
      if (a.id === 'rabbit') {
        rect(c, body, 18, 0, 3, 11);
        rect(c, body, 24, 0, 3, 11);
      }
      if (['sheep', 'alpaca'].includes(a.id)) {
        rect(c, '#fff5da', 5, 9, 20, 8);
        rect(c, '#fff5da', 8, 6, 14, 17);
      }
    });
  for (const b of buildings) {
    const w = b.width * 32,
      h = b.height * 32;
    make(`building-${b.id}`, w, h + 16, (c) => {
      if (['flower', 'raredecor'].includes(b.id)) {
        rect(c, '#a97450', 10, 25, 14, 17);
        rect(c, '#704e37', 8, 25, 18, 3);
        for (let i = 0; i < 4; i++) {
          rect(c, '#679559', 8 + i * 4, 8 + (i % 2) * 6, 3, 20);
          rect(c, b.id === 'raredecor' ? '#e9c868' : '#d88d84', 5 + i * 5, 8 + (i % 2) * 7, 7, 5);
        }
        return;
      }
      if (b.id === 'fence' || b.id === 'bench') {
        rect(c, '#a17c54', 3, 15, 5, 26);
        rect(c, '#d0af78', 3, 15, 3, 26);
        rect(c, '#a17c54', 25, 15, 5, 26);
        rect(c, '#c7a475', 3, 20, 27, 5);
        rect(c, '#c7a475', 3, 32, 27, 5);
        return;
      }
      if (b.id === 'chest' || b.id === 'compost') {
        rect(c, '#76553b', 3, 21, 26, 23);
        rect(c, '#c09a61', 5, 23, 22, 19);
        rect(c, '#9c774c', 3, 29, 26, 3);
        rect(c, '#ead08b', 15, 28, 4, 7);
        rect(c, '#d6b478', 5, 23, 22, 3);
        return;
      }
      const roof =
        b.id === 'house'
          ? '#be7250'
          : b.id.includes('cold')
            ? '#6b9aa0'
            : b.id === 'greenhouse'
              ? '#7bb4b1'
              : b.id === 'kitchen'
                ? '#b58279'
                : '#8b9271';
      rect(c, '#79935c', 2, h + 6, w - 4, 10);
      rect(c, '#8e6b4b', 4, 22, w - 8, h - 10);
      rect(c, '#f1dfb1', 6, 24, w - 12, h - 14);
      rect(c, '#dec794', 6, h, w - 12, 8);
      rect(c, '#624f40', w / 2 - 7, h - 13, 14, 25);
      rect(c, '#a47e53', w / 2 - 5, h - 11, 10, 21);
      rect(c, '#e8c57c', w / 2 + 2, h - 1, 2, 2);
      rect(c, '#80583e', 0, 18, w, 8);
      rect(c, roof, 2, 7, w - 4, 16);
      rect(c, roof, 8, 2, w - 16, 20);
      rect(c, '#d89b69', 9, 3, w - 18, 3);
      for (let y = 9; y < 23; y += 6) rect(c, '#815e47', 4, y, w - 8, 1);
      for (const x of [10, w - 22]) {
        rect(c, '#81674b', x, 29, 12, 15);
        rect(c, '#78acb3', x + 2, 31, 8, 11);
        rect(c, '#bde0ce', x + 2, 31, 3, 4);
        rect(c, '#e4c695', x + 5, 31, 1, 11);
        rect(c, '#e4c695', x + 2, 36, 8, 1);
      }
      if (b.id === 'house') {
        rect(c, '#82583e', w - 16, 0, 7, 12);
        rect(c, '#a57e56', w - 15, 0, 4, 10);
      }
      if (b.id === 'greenhouse') {
        rect(c, '#73b1a9', 5, 12, w - 10, h - 7);
        for (let x = 10; x < w - 4; x += 13) rect(c, '#d6e1b9', x, 12, 2, h - 7);
        for (let y = 18; y < h; y += 14) rect(c, '#d6e1b9', 5, y, w - 10, 2);
        rect(c, '#a7cbaa', 12, h - 17, w - 24, 10);
      }
    });
  }
  for (let lv = 1; lv <= 6; lv++)
    make(`building-house-${lv}`, 64, 80, (c) => {
      c.drawImage(scene.textures.get('building-house').getSourceImage() as HTMLCanvasElement, 0, 0);
      if (lv > 1) {
        const roof = ['#be7250', '#ba7854', '#7b9273', '#709995', '#667d9b', '#a18b55'][lv - 1];
        rect(c, roof, 2, 7, 60, 15);
        rect(c, roof, 8, 2, 48, 20);
        for (let y = 9; y < 23; y += 6) rect(c, '#765b44', 4, y, 56, 1);
        rect(c, '#edc888', 9, 3, 46, 2);
        for (let i = 0; i < lv - 1; i++) rect(c, '#dcba6b', 8 + i * 9, 69, 5, 3);
        if (lv > 3) {
          rect(c, '#a8bca0', 5, 25, 2, 42);
          rect(c, '#a8bca0', 57, 25, 2, 42);
        }
      }
    });
}
