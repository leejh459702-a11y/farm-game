/** 씬 간 공유 입력 상태 (가상 조이스틱 → 플레이어) */
export const InputState = {
  joyX: 0,
  joyY: 0,
  joyActive: false,
  /** 조이스틱/HUD 가 포인터를 점유 중이면 월드 탭 무시 */
  capturedPointers: new Set<number>(),
};
