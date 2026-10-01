/** WeatherSystem — 계절별 확률로 내일 날씨를 결정 */
import { BALANCE } from '../data/balance';
import type { SeasonId, WeatherId } from '../types/game';
import { pickWeighted } from '../utils/rng';

export function rollWeather(r: () => number, season: SeasonId): WeatherId {
  return pickWeighted<WeatherId>(r, BALANCE.weather[season]);
}
