# ARCHITECTURE

## 개요
```
┌──────────── 브라우저 (모바일 가로 / PC) ─────────────┐
│  Phaser 3 캔버스                 DOM UI 레이어 (#ui)     │
│  ├ BootScene  (아트 생성·등록)    ├ MainMenu / Hud        │
│  ├ MenuScene  (시작 화면 배경)    ├ TutorialOverlay       │
│  ├ FarmScene  (월드·입력·카메라)  ├ BuildBar              │
│  ├ OverlayScene (낮밤·조명·날씨)  └ Panels (패널 스택)    │
│  └ ControlsScene (가상 조이스틱)                          │
│            │  Bridge (씬↔UI 레지스트리)  │                 │
│            └──────── Session ─────────┘                 │
│                         │ World (게임 상태 + 시스템)      │
│                         │  순수 TypeScript, Phaser 비의존  │
│                         └ SaveSystem (IndexedDB)          │
└─────────────────────────────────────────────────────────┘
```

**게임 로직과 렌더링/UI를 완전히 분리**했다. `World` 와 모든 `systems/*` 는 Phaser·DOM 을 import 하지 않으므로
Vitest 에서 그대로 1년 시뮬레이션까지 돌릴 수 있다. 씬과 패널은 `World` 의 메서드를 호출하고 `World.events` 를 구독해 다시 그린다.

### 왜 Phaser + DOM 하이브리드인가
- **Phaser**: 월드 타일맵, 작물/건물/동물 스프라이트, 카메라(추적·드래그·핀치 줌), 건설 고스트, 낮/밤 곱하기 블렌드, 조명, 파티클, 조이스틱.
- **DOM(바닐라 TS, React 미사용)**: 글자가 많은 HUD·패널. 한글 비트맵 폰트 선명도, 네이티브 스크롤, 검색 입력창, 이름 짓기,
  `env(safe-area-inset-*)` 노치 대응, 모바일 접근성(최소 터치 영역)을 CSS 로 정확히 맞추기 위함. 게임 플레이 화면(월드)은 전부 Phaser.

## 폴더 구조
```
src/
  core/        World(루트), Session(현재 세션·자동저장), EventBus, events(이벤트 타입), newGame, AppRef
  data/        balance, crops, animals(+특성), buildings, recipes, items(레지스트리 자동 생성), skills, economy, seasons
  systems/     SeasonSystem(달력 순수함수), GameTimeSystem, WeatherSystem, FarmGridSystem, LandPurchaseSystem,
               CropSystem, InventorySystem(=StorageSystem), FreshnessSystem, MerchantSystem, FinanceSystem(=EconomySystem),
               SkillSystem, HouseUpgradeSystem, AnimalSystem, BreedingSystem, ProcessingSystem, AutomationSystem,
               CodexSystem, TutorialSystem, InteractionService(행동 결정)
  services/    EconomyService(모든 가격 계산), SettingsStore(localStorage)
  save/        SaveSystem(IndexedDB 슬롯), migrations(버전 마이그레이션)
  scenes/      Boot/Menu/Farm/Overlay/Controls, Bridge, InputState
    world/     GroundRenderer, CropRenderer, BuildingRenderer, AnimalRenderer, PlayerController, BuildController, Pathfinder
  ui/          Hud, MainMenu, TutorialOverlay, BuildBar, Panel(기반), PanelManager, dialogs, openers(라우터), styles.css
    panels/    House, Inventory, Plot(+Seed/Fert Picker), Merchant, Animal(Barn/List/Detail/Pedigree), Breeding,
               Station, SkillTree, Codex, Overview, Summary(Day/Month/Finance/Calendar), Blueprint, Pause, Greenhouse, Settings
  assets/      painter(픽셀 그리기), AssetRegistry(Asset Key 등록), art/(tiles, crops, icons, buildings, characters)
  audio/       AudioManager (BGM 8슬롯·환경음·효과음·UI, WebAudio 합성 폴백)
  types/       game.ts (GameState 등 공용 타입)
tests/         Vitest (로직 테스트 + 1년 시뮬레이션)
public/        manifest.webmanifest, sw.js, icons/
scripts/       make-icons.mjs (PWA 아이콘 생성)
```

## 데이터 흐름
1. 입력(탭/조이스틱/버튼) → `FarmScene` / 패널 → `World` 시스템 메서드 호출 (`crops.plant`, `merchant.sellSlot` …)
2. 시스템이 `GameState` 변경 → `world.events.emit('plots' | 'inventory' | 'gold' …)`
3. 렌더러/패널이 해당 이벤트만 받아 **dirty 갱신** (예: 바뀐 농지 key 만 다시 그림)
4. `majorChange` / `dayStarted` 이벤트 → `Session` 이 디바운스 자동 저장

## 시간
`FarmScene.update` → `world.time.tick(dt)` (메뉴·건설 모드의 `pause(reason)` 가 하나라도 있으면 정지).
하루 종료 순서(`GameTimeSystem.endDay`): 작물 성장 → 동물(생산/성장/출산) → 신선도 감소 → 상인 퇴장 → 장부 마감 →
날짜 증가 → (월말) 운영비 → 아침 처리(날씨, 비/관개 물주기, 자동화, 상인 방문, 알림).

## 성능
- 지면은 Phaser Tilemap 레이어(자동 컬링), 익스트루전 타일셋으로 이음새 방지.
- 작물 스프라이트 오브젝트 풀 + 0.25초마다 화면 밖 컬링, 화면 밖 동물은 AI 정지.
- 렌더 갱신은 이벤트 기반 dirty 업데이트 (매 프레임 전체 재계산 없음). 상태 판정은 순수 데이터.
- 30×30 전체 농지 하루 처리 < 50ms (테스트로 검증).
- FPS 제한(30/60) 설정.

## 저장
- `SaveSystem`: IndexedDB `my-little-farm` / store `saves`, 슬롯 3개. 불가 환경은 localStorage 폴백.
- `GameState.version` + `migrations.ts` 의 단계별 변환, 누락 필드 기본값 보정. 미래 버전은 거부.
- 자동 저장: 하루 시작(=종료 직후), 주요 시설 변경(디바운스 1.5s), 앱 백그라운드/종료(visibilitychange/pagehide), 수동 저장.

## 에셋 교체
`AssetRegistry.registerPhaser` 는 이미 존재하는 key 를 덮어쓰지 않는다. `BootScene.preload()` 에서 같은 key 로
실제 이미지를 로드하면 플레이스홀더 대신 사용된다. 주요 key: `tiles`, `player`, `merchant`, `cart`, `crop_<id>`(5프레임),
`bld_<id>`(+`_r` 회전), `bld_house_<1..6>`, `an_<species>`(2프레임), `it_<itemId>`, `ic_*`, `tool_*`, `glow`.
