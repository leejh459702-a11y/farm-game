# 구조

```text
src/
  core/      GameEngine, 초기 상태, ID·난수·레벨
  scenes/    Phaser FarmScene, 카메라·입력·렌더링
  systems/   공간/토지, 인벤토리/신선도, 브리딩/혈통
  services/  EconomyService: 가격, 신선도 계수, 운영비, 가치
  save/      IndexedDB, 슬롯, 버전 migration, 순차 기록
  entities/  동물 특성에 따른 생산량·성장
  ui/        UIManager, HTML 패널, 모바일 CSS, SVG UI 아이콘
  data/      작물, 동물, 시설, 기술, 레시피, 계절, BalanceConfig
  assets/    32px 절차적 픽셀 텍스처
  audio/     Web Audio와 계절별 BGM 슬롯
  utils/     알림 그룹화
  types/     게임 데이터 인터페이스
  dev/       프로덕션에서 제거되는 별도 QA 시나리오
tests/       규칙, 회귀, IndexedDB, 서비스 워커 테스트
public/      PWA manifest와 아이콘
docs/        화면 매핑, QA 결과
```

## 흐름

UI와 Phaser 입력은 `GameEngine`의 명령을 호출합니다. 엔진은 데이터를 변경하고 revision을 올립니다. FarmScene은 변경된 revision에서 타일·작물·시설·동물 표시를 갱신하고 사용하지 않는 Image를 풀에 반환합니다. 카메라 화면 밖 객체는 표시를 끕니다. 일 단위 작물·동물·신선도·가공 로직은 하루 종료에서만 계산하며 매 프레임 900개 밭을 시뮬레이션하지 않습니다.

시간은 일반 플레이에서만 진행됩니다. HTML UI는 읽을 수 있는 DOM 패널을 제공하고 게임 월드는 Phaser가 렌더링합니다. React를 사용하지 않습니다. HUD 날짜/보유금은 변경된 텍스트만 갱신하며 튜토리얼 버튼을 매 타이머마다 교체하지 않습니다.

## 엔진 경계

- `FarmGridSystem`: 시설 점유, 인접 구매, 토지 가격과 배치 판정.
- `InventorySystem`: 슬롯 용량, 신선도별 스택, 오래된 식재료 우선 소비, 손실 없는 수거/이동.
- `BreedingSystem`: 등급 확률, 중복 없는 특성 유전, 3세대 조상 조회.
- `EconomyService`: 판매 가격에 UI를 포함하지 않음.
- `GameEngine`: 날짜 처리, 명령 검증, 경험치, 연구·집 업그레이드, 축산·가공·자동화와 월말 정산의 조정자.
- `SaveSystem`: 저장 순간 structuredClone, 트랜잭션 완료 확인, 요청 순서 보존, 예외와 미래 버전 거절.

현재 조정자는 하나의 클래스에 모여 있습니다. 콘텐츠가 늘어나면 날짜·축산·가공 조정자를 각각 분리할 수 있으며 순수 시스템과 타입의 경계는 유지합니다.

## PWA와 배포

Vite 빌드 플러그인은 실제 해시 파일명을 사용해 `sw.js`를 생성합니다. 설치가 완료되어야 새 캐시를 활성화합니다. 오프라인 탐색은 캐시된 index.html로 돌아오며 정적 자산은 캐시에서 제공합니다. 다른 출처 요청은 가로채지 않습니다. `base: './'`로 정적 하위 경로 배포를 지원합니다. 서버 라우팅과 온라인 계정은 없습니다.

## 저장 스키마

현재 SaveData 버전과 IndexedDB 스키마 버전은 1입니다. `migrate`는 기존 선택 필드에 기본값을 보충하고 버전이 더 높은 저장이나 필수 자료가 빠진 저장을 거절합니다. 추후 구조를 변경하면 BalanceConfig의 saveVersion과 명시적인 이전 버전 변환을 함께 추가해야 합니다. 실제 세이브 파일과 계정 토큰은 Git에 넣지 않습니다.
