/**
 * GameTimeSystem — 현실 10분 = 게임 1일. 메뉴/건설 모드에서 정지.
 * 하루 종료 처리 순서가 게임 규칙의 핵심이므로 이 파일에 모은다.
 */
import { BALANCE } from '../data/balance';
import { CROP_BY_ID } from '../data/crops';
import type { DaySummary } from '../core/events';
import { calendar, isNight } from './SeasonSystem';
import { rollWeather } from './WeatherSystem';
import { isReady } from './CropSystem';
import type { World } from '../core/World';

export class GameTimeSystem {
  private pauseReasons = new Set<string>();
  /** 시간 배속 (디버그/테스트) */
  speed = 1;
  private wasNight = false;

  constructor(private w: World) {}

  get paused(): boolean {
    return this.pauseReasons.size > 0;
  }

  pause(reason: string): void {
    this.pauseReasons.add(reason);
  }

  resume(reason: string): void {
    this.pauseReasons.delete(reason);
  }

  clearPauses(): void {
    this.pauseReasons.clear();
  }

  /** dt: 실제 경과 초 */
  tick(dt: number): DaySummary | null {
    if (this.paused || dt <= 0) return null;
    const s = this.w.state;
    const step = Math.min(dt, 1) * this.speed;
    s.meta.playTimeSec += Math.min(dt, 1);
    const before = s.time.elapsed;
    s.time.elapsed += step;
    const minutes = (step * 1440) / BALANCE.time.secondsPerDay;
    this.w.processing.tick(minutes);
    const season = calendar(s.time.day).season;
    const night = isNight(season, s.time.elapsed);
    if (night !== this.wasNight) {
      this.wasNight = night;
      if (night && before > 0) this.w.notify({ key: 'night', text: '해가 졌습니다. 밤에도 농사를 계속할 수 있어요.', icon: 'ic_moon' });
    }
    if (s.time.elapsed >= BALANCE.time.secondsPerDay) return this.endDay();
    return null;
  }

  /** 남은 시간을 건너뛰고 다음 날로 (집 → 오늘 마치기) */
  skipToNextDay(): DaySummary {
    const s = this.w.state;
    const remainSec = BALANCE.time.secondsPerDay - s.time.elapsed;
    // 남은 시간만큼 가공 진행
    this.w.processing.tick((remainSec * 1440) / BALANCE.time.secondsPerDay);
    return this.endDay();
  }

  endDay(): DaySummary {
    const w = this.w;
    const s = w.state;
    const endedDay = s.time.day;
    const season = calendar(endedDay).season;

    // 1) 작물 성장 (오늘 물 준 작물만, 겨울 야외는 겨울 작물만)
    const crops = w.crops.dailyGrowth(season);
    // 2) 동물 (급식/생산/성장/출산)
    w.animals.daily();
    w.ponds.daily();
    // 3) 신선도 감소
    const fresh = w.freshness.dailyDecay();
    if (fresh.rotted > 0) w.notify({ key: 'rotten', text: `${fresh.rotted}개의 상품이 부패했습니다`, icon: 'it_rotten', tone: 'warn' });
    // 4) 상인 퇴장
    w.merchant.leave();
    // 5) 하루 장부 마감
    const ledger = w.finance.closeDay();
    const summary: DaySummary = { day: endedDay, ledger, goldEnd: s.gold, crops };

    // ───── 다음 날 ─────
    s.time.day++;
    s.time.elapsed = 0;
    s.stats.daysPlayed++;
    this.wasNight = false;

    // 6) 월말 정산 (운영비)
    if (s.time.day % BALANCE.time.daysPerMonth === 0) {
      const ms = w.finance.closeMonth(endedDay);
      w.events.emit('dayEnded', summary);
      w.events.emit('monthEnded', ms);
    } else w.events.emit('dayEnded', summary);

    this.startDay();
    return summary;
  }

  /** 아침 처리 */
  startDay(): void {
    const w = this.w;
    const s = w.state;
    const cal = calendar(s.time.day);
    // 날씨
    s.weather.today = s.weather.tomorrow;
    // 계절이 바뀌었으면 오늘 날씨도 새 계절 기준으로 재조정
    if (cal.dayOfSeason === 1 || !(s.weather.today in BALANCE.weather[cal.season])) s.weather.today = rollWeather(() => w.rand(), cal.season);
    s.weather.tomorrow = rollWeather(() => w.rand(), calendar(s.time.day + 1).season);
    w.events.emit('weather', { today: s.weather.today });
    if (cal.dayOfSeason === 1 && s.time.day > 0) {
      const names = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
      w.notify({ key: 'season', text: cal.season === 'winter' ? '겨울이 시작되었습니다! 밭에서는 겨울 작물만 자라요. 다른 작물은 온실에서 키워요.' : `${names[cal.season]}이 시작되었습니다! 제철 작물은 판매가 +10%`, icon: `ic_${cal.season}`, tone: cal.season === 'winter' ? 'info' : 'good' });
    }
    // 비/관개 자동 물주기
    w.crops.morningWater();
    // 자동화
    w.automation.morning();
    w.ponds.morning();
    // 상인
    w.merchant.morning();
    // 외곽 지역 자원 (하루 1회 생성)
    w.regions.morning();
    // 수확 가능 알림 (작물별로 묶음)
    const ready: Record<string, number> = {};
    for (const p of w.crops.allPlots()) if (isReady(p)) ready[p.cropId!] = (ready[p.cropId!] ?? 0) + 1;
    for (const [id, n] of Object.entries(ready)) {
      const any = w.crops.allPlots().find((p) => p.cropId === id && isReady(p) && !p.greenhouse);
      w.notify({ key: `ready_${id}`, text: `${CROP_BY_ID[id].name} ${n}개가 수확 가능합니다`, icon: `it_${id}`, target: any ? { x: any.x, y: any.y } : undefined });
    }
    if (Object.keys(ready).length) w.tutorial.signal('cropReady');
    const low = w.freshness.lowFreshnessStacks().reduce((sum, e) => sum + e.stack.qty, 0);
    if (low > 0) w.notify({ key: 'lowfresh', text: `신선도가 낮은 상품이 ${low}개 있습니다`, icon: 'ic_warn', tone: 'warn' });
    w.events.emit('dayStarted', { day: s.time.day });
    w.events.emit('majorChange', { reason: 'dayStart' });
  }
}
