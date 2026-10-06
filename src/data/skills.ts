export type SkillTree = 'farming' | 'livestock' | 'fishing' | 'gathering' | 'business';

/** 5대 생활 기술 분야 */
export const TREE_NAME: Record<SkillTree, string> = { farming: '농사', livestock: '목축', fishing: '낚시', gathering: '채집·채광', business: '가공·경영' };
export const TREE_ICON: Record<SkillTree, string> = { farming: 'ic_farming', livestock: 'ic_livestock', fishing: 'ic_fish', gathering: 'tool_pickaxe', business: 'ic_process' };
export const TREES: SkillTree[] = ['farming', 'livestock', 'fishing', 'gathering', 'business'];

export interface SkillNode {
  id: string;
  tree: SkillTree;
  name: string;
  desc: string;
  cost: number;
  /** 필요 레벨 (자기 분야) */
  level: number;
  /** 상대 분야 필요 레벨 — 한쪽만 최고 단계로 올릴 수 없게 함 */
  otherLevel: number;
  requires: string[];
  /** 트리 표시 위치 (열=계열, 행=티어) */
  col: number;
  row: number;
  /** 고급 기술 (운영비 미납 시 연구 제한) */
  advanced?: boolean;
  /** otherLevel 을 요구하는 상대 분야 (기본: 농사↔목축, 그 외는 농사) */
  otherTree?: SkillTree;
  /** Lv.10 이후 마스터리 */
  mastery?: boolean;
}

const n = (
  id: string,
  tree: SkillTree,
  name: string,
  desc: string,
  cost: number,
  level: number,
  otherLevel: number,
  requires: string[],
  col: number,
  row: number,
  otherTree?: SkillTree,
): SkillNode => ({ id, tree, name, desc, cost, level, otherLevel, requires, col, row, advanced: level >= 4, otherTree });

/** 마스터리 (분야 Lv.10 이후) */
const m = (id: string, tree: SkillTree, name: string, desc: string, cost: number, requires: string[]): SkillNode => ({
  id,
  tree,
  name,
  desc,
  cost,
  level: 10,
  otherLevel: 0,
  requires,
  col: 9,
  row: 0,
  advanced: true,
  mastery: true,
});

export const SKILLS: SkillNode[] = [
  // ───── 농사 ─────  (col: 0 작물/비료, 1 관개/자동, 2 저장, 3 가공/온실)
  n('f_fert1', 'farming', '비료', '기본·성장 비료를 사용할 수 있다.', 300, 1, 0, [], 0, 0),
  n('f_compost', 'farming', '퇴비', '퇴비통 설치. 부패물을 퇴비로 재활용.', 800, 2, 0, ['f_fert1'], 0, 1),
  n('f_soil1', 'farming', '토양 개량', '농지 토양 개량 Lv.1~2 업그레이드 해금.', 1200, 3, 0, ['f_fert1'], 0, 2),
  n('f_fert2', 'farming', '고급 비료', '고급 비료 사용. 토양 개량 Lv.3 해금.', 3500, 4, 1, ['f_soil1'], 0, 3),
  n('f_orchard', 'farming', '과수', '사과·배·감귤 묘목 재배.', 5000, 5, 2, ['f_fert2'], 0, 4),
  n('f_special', 'farming', '특수 작물', '희귀 씨앗 재배 가능.', 15000, 7, 5, ['f_orchard'], 0, 5),
  n('f_irrig1', 'farming', '관개 I', '농지 관개 Lv.1 — 자동 물주기.', 1000, 2, 0, [], 1, 1),
  n('f_multi', 'farming', '대량 파종', '3×3 범위로 심기·물주기·수확.', 2000, 3, 0, ['f_irrig1'], 1, 2),
  n('f_irrig2', 'farming', '관개 II', '관개 Lv.2 — 비 오는 날 토양 보호, 물주기 범위 확장.', 3500, 4, 1, ['f_irrig1'], 1, 3),
  n('f_pest', 'farming', '해충 방지', '해충 방지 업그레이드 해금.', 2500, 4, 1, ['f_multi'], 1, 4),
  n('f_autoHarvest', 'farming', '자동 수확', '농지 자동 수확 업그레이드 (가까운 창고로 자동 저장).', 9000, 6, 4, ['f_pest', 'f_irrig2'], 1, 5),
  n('f_irrig3', 'farming', '관개 III', '관개 Lv.3 — 최종 자동 관리 (자동 비료 보충).', 8000, 6, 3, ['f_irrig2'], 1, 6),
  n('f_autoFarm', 'farming', '자동 농업', '수확 후 같은 씨앗 자동 재파종 (창고 재고 사용).', 25000, 8, 6, ['f_autoHarvest', 'f_irrig3'], 1, 7),
  n('f_storage1', 'farming', '저장 I', '소형 창고 건설.', 1200, 2, 0, [], 2, 1),
  n('f_bag1', 'farming', '가방 확장', '가방 칸 +6.', 1500, 3, 0, ['f_storage1'], 2, 2),
  n('f_cold', 'farming', '냉장 저장', '냉장창고 건설 (신선도 감소 60% 억제).', 4000, 5, 2, ['f_storage1'], 2, 3),
  n('f_bigStorage', 'farming', '대형 창고', '대형 창고 건설.', 8000, 6, 3, ['f_cold'], 2, 4),
  n('f_coldBig', 'farming', '대형 저온창고', '대형 저온창고 건설 (85% 억제).', 15000, 7, 4, ['f_bigStorage'], 2, 5),
  n('f_soil2', 'farming', '토양 마스터', '토양 개량 Lv.3 해금.', 9000, 7, 4, ['f_fert2'], 2, 6),
  n('f_processing', 'business', '농산물 가공', '가공소 건설 — 버터·치즈·잼·밀가루 등.', 3000, 1, 2, [], 0, 0),
  n('f_kitchen', 'business', '요리', '주방 건설. 고부가가치 요리.', 6000, 2, 3, ['f_processing'], 0, 1),
  n('f_greenhouse', 'farming', '온실', '온실 건설. 계절 제한 없이 재배.', 12000, 5, 3, ['f_cold'], 3, 4),
  n('f_aging', 'business', '숙성', '숙성고 건설 — 치즈·와인 등을 오래 둘수록 비싸진다.', 6000, 3, 3, ['f_processing'], 1, 0),
  n('f_autoProcess', 'business', '자동 가공', '가공 시설 자동 반복 생산 + 완성품 자동 창고 전송.', 15000, 5, 4, ['f_kitchen'], 2, 0),
  // ───── 목축 ─────  (col: 0 가금, 1 가축, 2 브리딩, 3 자동/가공)
  n('l_chicken', 'livestock', '닭', '닭장 건설, 닭 사육.', 500, 1, 0, [], 0, 0),
  n('l_duck', 'livestock', '오리', '오리장 건설, 오리 사육.', 1500, 2, 0, ['l_chicken'], 0, 1),
  n('l_rabbit', 'livestock', '토끼', '토끼장 건설, 토끼 사육.', 1800, 2, 1, ['l_chicken'], 0, 2),
  n('l_poultry2', 'livestock', '거위·칠면조', '거위와 칠면조 사육.', 4000, 4, 2, ['l_duck'], 0, 3),
  n('l_sheep', 'livestock', '양', '양/염소 축사 건설, 양 사육.', 3000, 3, 1, ['l_chicken'], 1, 1),
  n('l_goat', 'livestock', '염소', '염소 사육.', 3000, 3, 1, ['l_sheep'], 1, 2),
  n('l_cow', 'livestock', '소', '젖소 축사 건설, 젖소 사육.', 6000, 4, 2, ['l_sheep'], 1, 3),
  n('l_pig', 'livestock', '돼지', '돼지 축사 건설, 돼지 사육.', 6000, 4, 2, ['l_sheep'], 1, 4),
  n('l_bigBarn', 'livestock', '대형 축사', '대형 축사 건설.', 12000, 5, 3, ['l_cow'], 1, 5),
  n('l_rare', 'livestock', '희귀 동물', '알파카·물소·타조 사육.', 20000, 6, 5, ['l_bigBarn'], 1, 6),
  n('l_breeding', 'livestock', '브리딩', '브리딩 시설 건설, 암수 교배.', 2500, 3, 3, ['l_chicken'], 2, 1),
  n('l_pedigree', 'livestock', '혈통', '혈통 이름 지정, 3대 기록 열람.', 4000, 4, 3, ['l_breeding'], 2, 2),
  n('l_advBreeding', 'livestock', '고급 브리딩', '가계도 UI 해금, 1등급 확률 증가.', 12000, 6, 5, ['l_pedigree'], 2, 3),
  n('l_breedLab', 'livestock', '브리딩 연구소', '브리딩 연구소 건설.', 40000, 8, 7, ['l_advBreeding'], 2, 4),
  n('l_weaving', 'livestock', '방직', '방직소 건설.', 4000, 4, 2, ['l_sheep'], 3, 2),
  n('l_meat', 'livestock', '육가공', '육가공소 건설. 동물 출하.', 6000, 5, 4, ['l_pig'], 3, 3),
  n('l_autoFeed', 'livestock', '자동 급식', '축사 자동 급식 Lv.1 (창고 건초 사용).', 3000, 4, 3, ['l_chicken'], 3, 4),
  n('l_autoClean', 'livestock', '자동 청소', '축사 자동 청소.', 4000, 5, 4, ['l_autoFeed'], 3, 5),
  n('l_autoCollect', 'livestock', '자동 수거', '생산품을 창고로 자동 수거.', 9000, 6, 5, ['l_autoClean'], 3, 6),
  n('l_autoFeed2', 'livestock', '자동 급식 II', '사료가 없어도 자동 조달 (소액 비용).', 15000, 7, 6, ['l_autoCollect'], 3, 7),
  n('l_barnExpand', 'livestock', '축사 확장', '축사 수용량 업그레이드.', 5000, 4, 2, ['l_chicken'], 3, 1),
  // ───── 농사 마스터리 ─────
  m('f_m_seed', 'farming', '희귀 종자 연구', '일반 방문상인도 희귀 씨앗을 한 가지씩 가져온다.', 40000, ['f_special']),
  m('f_m_special', 'farming', '특수 작물', '희귀 작물 수확량 +1.', 50000, ['f_special']),
  // ───── 목축 마스터리 ─────
  m('l_m_pedigree', 'livestock', '최고 등급 혈통', '브리딩 상위 등급 확률 +10%p.', 45000, ['l_advBreeding']),
  m('l_m_trait', 'livestock', '희귀 특성', '브리딩 시 새로운 특성이 생길 확률 2배.', 45000, ['l_advBreeding']),
  // ───── 낚시 ─────
  n('fi_bait', 'fishing', '미끼 제작', '가공소에서 희귀 미끼를 만들 수 있다 (물고기 + 약초).', 1500, 2, 0, [], 0, 0, 'farming'),
  n('fi_pond', 'fishing', '양식', '양식장 건설 (3×3, 한 어종 전용).', 3000, 3, 0, [], 0, 1, 'farming'),
  n('fi_rare', 'fishing', '희귀 어종 연구', '희귀 물고기 확률 +25%.', 4000, 4, 0, ['fi_bait'], 0, 2, 'farming'),
  n('fi_pondAuto', 'fishing', '양식 자동화', '양식장 자동 수거·자동 사료 업그레이드 해금.', 6000, 5, 2, ['fi_pond'], 0, 3, 'farming'),
  n('fi_legend', 'fishing', '전설 추적', '전설 물고기 확률 +50%.', 9000, 7, 0, ['fi_rare'], 0, 4, 'farming'),
  m('fi_m_legend', 'fishing', '전설의 낚시꾼', '전설 물고기 확률 2배.', 40000, ['fi_legend']),
  m('fi_m_pond', 'fishing', '최고의 양식장', '양식장 개체 수 확장 단계 추가 (최대 14마리).', 40000, ['fi_pondAuto']),
  // ───── 채집·채광 ─────
  n('ga_tools', 'gathering', '도구 강화', '철 이상의 도끼·곡괭이·낚싯대로 업그레이드할 수 있다.', 2000, 2, 0, [], 0, 0, 'farming'),
  n('ga_mine', 'gathering', '폐광 탐사', '광산(폐광 1~10층)에 들어갈 수 있다.', 3000, 3, 0, [], 0, 1, 'farming'),
  n('ga_geode', 'gathering', '지오드 감정', '광물주머니·지오드 발견 확률 +50%.', 5000, 5, 0, ['ga_mine'], 0, 2, 'farming'),
  n('ga_deep', 'gathering', '깊은 광산', '깊은 광산(11층~) 탐사 (철 곡괭이 필요).', 8000, 6, 0, ['ga_mine', 'ga_tools'], 0, 3, 'farming'),
  n('ga_relic', 'gathering', '유물 탐지', '유물 발견 확률 2배.', 9000, 7, 0, ['ga_geode'], 0, 4, 'farming'),
  m('ga_m_rare', 'gathering', '희귀 광산', '16층 이상에서 희귀 광맥이 2배로 나온다.', 40000, ['ga_deep']),
  m('ga_m_gem', 'gathering', '최상급 광물', '보석 광맥에서 보석 +1.', 40000, ['ga_deep']),
  // ───── 가공·경영 ─────
  n('b_trader', 'business', '흥정의 달인', '모든 판매가 +5%.', 3000, 2, 0, [], 1, 1),
  n('b_bulk', 'business', '대량 생산', '모든 가공 시설 작업 슬롯 +1.', 8000, 4, 3, ['f_processing'], 2, 1),
  n('b_regular', 'business', '단골 상인', '방문상인이 더 자주 찾아온다 (1~2일 간격).', 9000, 6, 3, ['b_trader'], 1, 2),
  n('b_brand', 'business', '농장 브랜드', '가공품·요리 판매가 +10%.', 14000, 8, 5, ['b_trader', 'f_kitchen'], 1, 3),
  m('b_m_aging', 'business', '최고 숙성', '숙성 가치 보너스 +25%.', 40000, ['f_aging']),
  m('b_m_mass', 'business', '대량 생산 II', '가공 완성품이 25% 확률로 하나 더.', 45000, ['b_bulk']),
  m('b_m_auto', 'business', '최고급 자동화', '모든 가공 시간 -25%.', 50000, ['f_autoProcess']),
];

export const SKILL_BY_ID: Record<string, SkillNode> = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
