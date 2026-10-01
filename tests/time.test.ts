import { describe, expect, it } from 'vitest';
import { calendar, clockString, isNight, sunriseMinute, DAYS_PER_YEAR } from '../src/systems/SeasonSystem';
import { freeWorld } from './helpers';

describe('달력', () => {
  it('첫날은 1년차 봄 3월 1일', () => {
    const c = calendar(0);
    expect(c).toMatchObject({ year: 1, season: 'spring', month: 3, dayOfMonth: 1 });
  });
  it('한 달 = 10일', () => {
    expect(calendar(9).month).toBe(3);
    expect(calendar(10).month).toBe(4);
    expect(calendar(10).dayOfMonth).toBe(1);
  });
  it('계절 변경: 30일마다', () => {
    expect(calendar(29).season).toBe('spring');
    expect(calendar(30).season).toBe('summer');
    expect(calendar(30).month).toBe(6);
    expect(calendar(60).season).toBe('autumn');
    expect(calendar(90).season).toBe('winter');
    expect(calendar(90).month).toBe(12);
    expect(calendar(100).month).toBe(1);
    expect(calendar(110).month).toBe(2);
  });
  it('1년 = 120일 후 2년차 봄', () => {
    expect(DAYS_PER_YEAR).toBe(120);
    expect(calendar(120)).toMatchObject({ year: 2, season: 'spring', month: 3, dayOfMonth: 1 });
  });
  it('계절별 낮 길이', () => {
    expect(isNight('spring', 299)).toBe(false);
    expect(isNight('spring', 300)).toBe(true);
    expect(isNight('summer', 400)).toBe(false);
    expect(isNight('winter', 200)).toBe(true);
    expect(sunriseMinute('spring')).toBe(6 * 60);
    expect(clockString('spring', 0)).toBe('오전 06:00');
  });
});

describe('날짜 진행', () => {
  it('600초가 지나면 다음 날', () => {
    const w = freeWorld();
    for (let i = 0; i < 599; i++) w.time.tick(1);
    expect(w.state.time.day).toBe(0);
    w.time.tick(1);
    expect(w.state.time.day).toBe(1);
    expect(w.state.time.elapsed).toBe(0);
  });
  it('일시정지 중엔 시간이 흐르지 않음', () => {
    const w = freeWorld();
    w.time.pause('menu');
    w.time.tick(1);
    expect(w.state.time.elapsed).toBe(0);
    w.time.resume('menu');
    w.time.tick(1);
    expect(w.state.time.elapsed).toBe(1);
  });
  it('오늘 마치기는 즉시 다음 날', () => {
    const w = freeWorld();
    w.time.tick(0.5);
    w.time.skipToNextDay();
    expect(w.state.time.day).toBe(1);
  });
  it('30일 진행하면 여름', () => {
    const w = freeWorld();
    for (let i = 0; i < 30; i++) w.time.skipToNextDay();
    expect(w.cal.season).toBe('summer');
  });
});
