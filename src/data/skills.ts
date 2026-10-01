import type { SkillData } from '../types';
const farm = [
  ['crops', '작물 연구', '새로운 작물을 재배할 수 있어요.'],
  ['fertilizer', '비료', '비료와 토양 개량을 사용할 수 있어요.'],
  ['compost', '퇴비', '부패한 농산물을 비료로 바꿔요.'],
  ['orchard', '과수', '사과와 배 재배를 연구해요.'],
  ['irrigation', '관개', '농지 내부 자동 물주기를 해금해요.'],
  ['storage', '저장', '60슬롯 소형 창고를 지어요.'],
  ['cold', '냉장', '신선도 감소를 60% 줄여요.'],
  ['greenhouse', '온실', '계절에 관계없이 재배해요.'],
  ['bulk', '대량 파종', '여러 농지를 함께 관리해요.'],
  ['auto-harvest', '자동 수확', '농지 내부 자동 수확을 해금해요.'],
  ['rare-crop', '특수 작물', '특급상인의 희귀 씨앗을 재배해요.'],
  ['auto-farm', '자동 농업', '저온창고와 자동 관리 기술.'],
  ['processing', '가공', '농산물과 우유를 가공해요.'],
  ['cooking', '요리', '가치 높은 판매용 요리를 만들어요.'],
  ['weaving', '방직', '양털을 실과 원단으로 만들어요.'],
];
const animal = [
  ['chicken', '닭', '닭장과 닭 사육을 해금해요.'],
  ['duck', '오리', '오리장과 오리 사육.'],
  ['rabbit', '토끼', '토끼장과 토끼 사육.'],
  ['sheep', '양·염소', '양과 염소를 기를 수 있어요.'],
  ['cow', '젖소', '젖소와 우유 생산.'],
  ['pig', '돼지', '돼지와 송로버섯 생산.'],
  ['breeding', '브리딩', '암컷과 수컷을 직접 선택해요.'],
  ['lineage', '혈통', '3세대 혈통도를 확인해요.'],
  ['advanced-breed', '고급 브리딩', '우수 유전자를 연구해요.'],
  ['meat', '육가공', '동물을 출하해 생산물을 받아요.'],
  ['rare-animal', '희귀 동물', '알파카·물소·타조 사육.'],
  ['auto-feed', '자동 급식', '축사 내부 자동 급식을 해금해요.'],
  ['auto-collect', '자동 수거', '축산 생산품을 자동 보관해요.'],
  ['breedlab', '브리딩 연구소', '고급 연구 시설을 건설해요.'],
];
const levelsFarm = [1, 2, 2, 4, 2, 2, 3, 5, 3, 6, 7, 8, 3, 4, 4];
const levelsAnimal = [1, 2, 2, 3, 4, 4, 3, 4, 5, 6, 6, 4, 5, 8];
export const skills: SkillData[] = [
  ...farm.map(([id, name, description], i) => ({
    id,
    name,
    description,
    branch: 'farm' as const,
    level: levelsFarm[i],
    cross: Math.max(1, levelsFarm[i] - 2),
    price: i ? 150 + levelsFarm[i] * 100 : 0,
  })),
  ...animal.map(([id, name, description], i) => ({
    id,
    name,
    description,
    branch: 'animal' as const,
    level: levelsAnimal[i],
    cross: Math.max(1, levelsAnimal[i] - 2),
    price: i ? 150 + levelsAnimal[i] * 100 : 0,
  })),
];
