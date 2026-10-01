/**
 * TutorialSystem — 첫 튜토리얼 12단계.
 * 각 단계는 상태 기반 조건 또는 신호(signal)로 진행된다.
 */
import { isReady } from './CropSystem';
import type { World } from '../core/World';

export interface TutorialStep {
  step: number;
  title: string;
  text: string;
  /** 진행 신호 (없으면 '다음' 버튼) */
  signal?: string;
  /** UI 강조 대상 힌트 */
  focus?: 'farm' | 'house' | 'tile' | 'hoe' | 'seed' | 'water' | 'build' | 'endday' | 'merchant' | 'sell' | 'land' | 'hand';
}

export const TUTORIAL_STEPS: TutorialStep[] = [
  { step: 1, title: '나의 작은 농장', text: '이곳이 앞으로 당신의 농장이 될 땅입니다.\n작은 3×3 땅에서 시작해 원하는 만큼 키워 보세요!', focus: 'farm' },
  { step: 2, title: '집 짓기', text: '먼저 집을 설치할 위치를 선택해 주세요. (2×2)\n초록색은 설치 가능, 빨간색은 불가능한 위치예요.', signal: 'housePlaced', focus: 'house' },
  { step: 3, title: '농지 만들기', text: '하단 도구바에서 [괭이]를 고르고\n빈 땅을 탭해 농지로 바꿔 보세요.', signal: 'tilled', focus: 'hoe' },
  { step: 4, title: '씨앗 심기', text: '[씨앗] 도구를 고르고 농지를 탭해\n당근 씨앗을 심어 보세요.', signal: 'planted', focus: 'seed' },
  { step: 5, title: '물주기', text: '[물뿌리개]로 씨앗에 물을 주세요.\n물을 준 날에만 작물이 자라요. (비 오는 날은 자동!)', signal: 'watered', focus: 'water' },
  { step: 6, title: '보관 상자', text: '수확물을 보관할 상자를 설치해요.\n오른쪽 [건설] 버튼 → 보관상자를 골라 설치하세요.', signal: 'chestPlaced', focus: 'build' },
  { step: 7, title: '시간 보내기', text: '작물은 하루가 지날 때 자라요.\n[집]을 탭해 "오늘 마치기"로 하루를 넘기고,\n매일 아침 물을 주세요. 당근은 3일이면 다 자라요!', signal: 'cropReady', focus: 'endday' },
  { step: 8, title: '첫 수확', text: '당근이 다 자랐어요!\n[손] 도구로 작물을 탭해 수확하세요.', signal: 'harvested', focus: 'hand' },
  { step: 9, title: '방문상인', text: '마침 방문상인이 농장을 찾아왔어요!\n상인을 탭하거나 오른쪽 [상인] 버튼을 눌러 보세요.', signal: 'merchantOpened', focus: 'merchant' },
  { step: 10, title: '판매하기', text: '[판매] 탭에서 수확한 당근을 팔아 보세요.\n신선할수록, 제철일수록 비싸게 팔려요.', signal: 'sold', focus: 'sell' },
  { step: 11, title: '첫 수익!', text: '축하해요! 첫 수익을 얻었어요.\n상인은 2~3일마다 찾아와요. 가끔은 특급상인이 오기도 해요!' },
  { step: 12, title: '토지 확장', text: '이제 땅을 넓혀 볼까요?\n[건설] → [토지 구매]에서 지금 땅과 상하좌우로 붙은 한 칸을 500G에 구입하세요.', signal: 'landBought', focus: 'land' },
];

export class TutorialSystem {
  constructor(private w: World) {}

  get active(): boolean {
    return !this.w.state.tutorial.done;
  }

  get step(): number {
    return this.w.state.tutorial.step;
  }

  current(): TutorialStep | null {
    if (!this.active) return null;
    return TUTORIAL_STEPS.find((s) => s.step === this.step) ?? null;
  }

  start(): void {
    this.w.state.tutorial = { step: 1, done: false, flags: {} };
    this.w.events.emit('tutorial', { step: 1 });
  }

  /** 튜토리얼 종료 보상: 낚싯대 무료 지급 */
  private grantRod(): void {
    if (this.w.state.tools.rodOwned) return;
    this.w.state.tools.rodOwned = true;
    this.w.notify({ key: 'rod', text: '낚싯대를 받았어요! 농장 아래쪽 출구로 나가 강가에서 낚시해 보세요.', icon: 'tool_rod', tone: 'good' });
  }

  skip(): void {
    this.w.state.tutorial.done = true;
    this.grantRod();
    this.w.state.tutorial.step = 99;
    // 튜토리얼을 건너뛰면 집이 없을 때 자동 배치
    if (!this.w.grid.house()) this.w.autoPlaceHouse();
    if (this.w.state.merchant.nextVisitDay > this.w.state.time.day + 3) this.w.merchant.scheduleNext();
    this.w.events.emit('tutorial', { step: 99 });
  }

  /** 다음 버튼 */
  next(): void {
    const cur = this.current();
    if (cur && !cur.signal) this.advance();
  }

  signal(name: string): void {
    const cur = this.current();
    if (cur && cur.signal === name) this.advance();
  }

  /** 특정 기능 허용 여부 */
  allows(feature: 'buyLand' | 'merchant' | 'build'): boolean {
    if (!this.active) return true;
    if (feature === 'buyLand') return this.step >= 12;
    if (feature === 'merchant') return this.step >= 9;
    if (feature === 'build') return this.step >= 6;
    return true;
  }

  private advance(): void {
    const t = this.w.state.tutorial;
    t.step++;
    if (t.step > TUTORIAL_STEPS.length) {
      t.done = true;
      this.grantRod();
      this.w.notify({ key: 'tut', text: '튜토리얼 완료! 이제 자유롭게 농장을 꾸려 보세요.', icon: 'ic_star', tone: 'good' });
      this.w.merchant.scheduleNext();
      this.w.events.emit('majorChange', { reason: 'tutorial' });
    }
    this.onEnter();
    this.w.events.emit('tutorial', { step: t.step });
  }

  /** 단계 진입 시 이미 조건을 만족했으면 자동 진행 */
  onEnter(): void {
    const cur = this.current();
    if (!cur) return;
    const s = this.w.state;
    const plots = Object.values(s.plots);
    const blds = Object.values(s.buildings);
    let met = false;
    switch (cur.step) {
      case 2:
        met = blds.some((b) => b.type === 'house');
        break;
      case 3:
        met = plots.length > 0;
        break;
      case 4:
        met = plots.some((p) => p.cropId);
        break;
      case 5:
        met = plots.some((p) => p.cropId && p.wateredToday);
        break;
      case 6:
        met = blds.some((b) => b.type === 'chest');
        break;
      case 7:
        met = plots.some(isReady) || this.w.inventory.countAll('carrot') > 0;
        break;
      case 8:
        met = this.w.inventory.countAll('carrot') > 0;
        break;
      case 9:
        // 상인 강제 등장
        if (!s.merchant.present) this.w.merchant.arrive(false, true);
        break;
    }
    if (met) this.advance();
  }
}
