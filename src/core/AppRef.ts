import type Phaser from 'phaser';

/** Phaser.Game 인스턴스 참조 (DOM UI 에서 씬 전환용) */
export const AppRef: { game: Phaser.Game | null } = { game: null };
