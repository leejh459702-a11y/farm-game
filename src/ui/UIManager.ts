import Phaser from 'phaser';
import { GameEngine } from '../core/GameEngine';
import { createState, key, level } from '../core/state';
import { FarmScene } from '../scenes/FarmScene';
import { SaveSystem, SaveSlot } from '../save/SaveSystem';
import { AudioManager } from '../audio/AudioManager';
import { NotificationSystem } from '../utils/notifications';
import { icon } from './icons';
import { BalanceConfig as B } from '../data/balance';
import { crops, cropById } from '../data/crops';
import { animals, animalById } from '../data/animals';
import { buildings, buildingById } from '../data/buildings';
import { skills } from '../data/skills';
import { recipes, recipeById } from '../data/recipes';
import { calendar, seasonNames, weatherNames } from '../data/seasons';
import { products } from '../data/economy';
import { itemName, salePrice, basePrice } from '../services/EconomyService';
import { buildingAt, landPrice, footprint, canPlace, adjacent } from '../systems/FarmGridSystem';
import { itemCount, capacity } from '../systems/InventorySystem';
import { ancestors, gradeProbabilities } from '../systems/BreedingSystem';
import type { Animal, Settings, Ledger } from '../types';
const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );
const money = (n: number) => `${n.toLocaleString('ko-KR')}G`;
const btn = (action: string, label: string, cls = '', attrs = '') =>
  `<button data-action="${action}" class="${cls}" ${attrs}>${label}</button>`;
const empty = (text: string) => `<div class="empty">${text}</div>`;
const stat = (label: string, value: unknown) =>
  `<div class="stat"><small>${label}</small><strong>${esc(value)}</strong></div>`;
const note = (text: string) => `<div class="highlight-note">${text}</div>`;
export class UIManager {
  root = document.querySelector<HTMLDivElement>('#ui')!;
  saves = new SaveSystem();
  audio = new AudioManager();
  slot = 1;
  menu = true;
  panel = '';
  tab = '';
  tool = 'inspect';
  selected?: { x: number; y: number };
  selectedKeys = new Set<string>();
  multi = false;
  moving: string[] = [];
  selectedBuilding = '';
  animalId = '';
  cropId = 'carrot';
  filter = '';
  favorites = false;
  female = '';
  male = '';
  storage = 'bag';
  slots: SaveSlot[] = [];
  previousPause = false;
  notices: string[] = [];
  private notificationSystem = new NotificationSystem();
  private lastTutorial = -1;
  private urls = new Map<string, string>();
  private toastTimer?: ReturnType<typeof setTimeout>;
  constructor(
    public engine: GameEngine,
    public scene: FarmScene,
    private game: Phaser.Game,
  ) {
    engine.onChange = () => {
      this.updateHud();
      this.renderMode();
      this.renderContext();
    };
    engine.onNotice = (m) => this.toast(m);
    engine.onSave = () => {
      if (engine.state.settings.autosave && !this.menu) void this.save(false);
    };
    engine.onDay = () =>
      this.open(
        engine.state.lastMonthly && engine.state.day % 10 === 1
          ? 'monthly'
          : engine.state.birthResults.some((b) => b.day === engine.state.day)
            ? 'birthresult'
            : 'daily',
      );
    scene.onSelect = (x, y) => this.select(x, y);
    scene.onPlace = (x, y) => {
      this.selected = { x, y };
      this.renderMode();
    };
    this.root.addEventListener('click', (e) => {
      const el = (e.target as HTMLElement).closest<HTMLElement>('[data-action]');
      if (el) {
        this.audio.unlock(this.engine.state.settings);
        this.audio.ui();
        void this.action(el.dataset.action!, el);
      }
    });
    this.root.addEventListener('change', (e) => this.change(e.target as HTMLInputElement));
    this.root.addEventListener('input', (e) => {
      const t = e.target as HTMLInputElement;
      if (t.id === 'search') {
        this.filter = t.value;
        this.renderItems();
      }
    });
    window.addEventListener('keydown', (e) => {
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      if (e.key === 'Escape') {
        this.close();
        this.finishBuild();
      }
      const tools = ['inspect', 'hoe', 'seed', 'water', 'harvest'];
      if (/[1-5]/.test(e.key) && e.key.length === 1) {
        this.tool = tools[Number(e.key) - 1];
        this.renderHUD();
      }
      if (e.code === 'Space' && !this.menu && !this.panel) {
        e.preventDefault();
        this.contextAction();
      }
    });
    setInterval(() => this.updateHud(), 250);
    setInterval(() => {
      if (!this.menu && this.engine.state.settings.autosave) void this.save(false);
    }, 30000);
  }
  async init() {
    try {
      this.slots = await this.saves.list();
    } catch {
      this.toast('로컬 저장 공간을 열지 못했어요. 브라우저 저장 권한을 확인하세요.');
    }
    this.renderMenu();
  }
  pixel(texture: string) {
    if (!this.scene.ready) return '';
    let url = this.urls.get(texture);
    if (!url) {
      const source = this.scene.textures.get(texture).getSourceImage() as HTMLCanvasElement;
      url = source.toDataURL();
      this.urls.set(texture, url);
    }
    return `<img class="pixel-icon" src="${url}" alt="">`;
  }
  renderMenu() {
    this.menu = true;
    this.engine.paused = true;
    this.scene.ready && this.scene.setMenu(true);
    this.root.innerHTML = `<div class="menu"><div class="menu-content"><div class="brand">${icon('leaf')} 나의 작은 농장</div><h1>작은 땅에서,<br>자라는 큰 행복.</h1><div class="eyebrow">A LITTLE FARM, A LONG STORY</div><p>씨앗 하나, 포근한 집 한 채.<br>서두르지 않고 가꾸는 당신만의 시골 생활.</p><div class="menu-actions">${btn('new', `새 농장 시작하기 ${icon('arrow')}`)}${btn('continue', `이어하기 ${icon('book')}`, 'secondary', this.slots.length ? '' : 'disabled')}${btn('settings', `설정 ${icon('settings')}`, 'secondary')}</div></div><div class="menu-caption"><strong>오늘도, 조금 더 자랐어요.</strong><small>봄의 첫날 · 나만의 속도로</small></div><div class="menu-footer">PHASER 3 · 픽셀로 그리는 느긋한 농장 생활</div></div><div id="panel-host"></div><div id="toast-host"></div>`;
    this.panel = '';
  }
  renderHUD() {
    if (this.menu) return;
    this.root.innerHTML = `<div class="hud"><div class="topbar"><button class="calendar" data-action="calendar">${icon('sun')}<div><strong id="calendar-date"></strong><small id="calendar-time"></small></div></button><div class="wallet">${icon('coin')}<div class="wallet-side"><strong id="gold"></strong><div class="levels" id="levels"></div></div></div></div><div id="tutorial-host"></div><nav class="rail" aria-label="농장 메뉴">${[
      ['inventory', 'bag', '가방'],
      ['build', 'build', '건설'],
      ['merchant', 'store', '상인'],
      ['animals', 'animal', '동물'],
      ['skills', 'tree', '연구'],
      ['manage', 'chart', '농장 관리'],
      ['book', 'book', '도감'],
      ['pause', 'pause', '메뉴'],
    ]
      .map(([a, i, l]) => btn(a, `${icon(i)}<span>${l}</span>`, '', `aria-label="${l}"`))
      .join(
        '',
      )}</nav><div class="joystick" id="joystick" aria-label="이동 조이스틱"><div class="joystick-stick"></div><div class="joystick-label">${this.engine.state.settings.tapMove ? '땅을 눌러 이동' : '천천히, 한 걸음씩'}</div></div><div class="bottom-bar">${[
      ['inspect', 'hand', '살펴보기'],
      ['hoe', 'hoe', '밭 만들기'],
      ['seed', 'seed', '씨앗 심기'],
      ['water', 'water', '물주기'],
      ['harvest', 'leaf', '수확'],
    ]
      .map(([t, i, l], n) =>
        btn(
          `tool:${t}`,
          `${icon(i)}<span>${l}</span><kbd>${n + 1}</kbd>`,
          `tool ${this.tool === t ? 'active' : ''}`,
          `aria-label="${l}"`,
        ),
      )
      .join(
        '',
      )}</div>${btn('context', `${icon('hand')}<span id="action-label">살펴보기</span>`, 'action-main')}<div id="context-host"></div><div id="mode-host"></div><div id="selection-host"></div><div class="notice-stack" id="notice-stack"></div></div><div id="panel-host"></div><div id="toast-host"></div>`;
    this.bindJoystick();
    this.updateHud();
    this.renderContext();
    this.renderMode();
    this.syncTutorial();
  }
  bindJoystick() {
    const base = this.root.querySelector<HTMLDivElement>('#joystick')!,
      stick = base.firstElementChild as HTMLElement;
    let held = false;
    base.style.opacity = String(this.engine.state.settings.joystickOpacity);
    const move = (e: PointerEvent) => {
      if (!held) return;
      const r = base.getBoundingClientRect(),
        dx = e.clientX - r.left - r.width / 2,
        dy = e.clientY - r.top - r.height / 2,
        n = Math.max(1, Math.hypot(dx, dy) / (r.width * 0.35));
      this.scene.joystick = { x: dx / n / (r.width * 0.35), y: dy / n / (r.height * 0.35) };
      stick.style.transform = `translate(${dx / n}px,${dy / n}px)`;
      this.scene.target = undefined;
    };
    base.addEventListener('pointerdown', (e) => {
      held = true;
      base.setPointerCapture(e.pointerId);
      move(e);
    });
    base.addEventListener('pointermove', move);
    const stop = () => {
      held = false;
      this.scene.joystick = { x: 0, y: 0 };
      stick.style.transform = '';
    };
    base.addEventListener('pointerup', stop);
    base.addEventListener('pointercancel', stop);
  }
  updateHud() {
    if (this.menu) return;
    const s = this.engine.state,
      c = calendar(s.day),
      minute = Math.floor((360 + (s.elapsed / B.daySeconds) * 1440) % 1440);
    const set = (id: string, v: string) => {
      const el = this.root.querySelector<HTMLElement>(`#${id}`);
      if (el && el.textContent !== v) el.textContent = v;
    };
    set('calendar-date', `${seasonNames[c.season]} ${c.month}월 ${c.date}일 · ${c.year}년`);
    set(
      'calendar-time',
      `${weatherNames[s.weather]} · ${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}${this.engine.paused ? ' · 시간 멈춤' : ''}`,
    );
    set('gold', money(s.gold));
    set('levels', `집 ${s.houseLevel} · 농사 ${level(s.farmXp)} · 목축 ${level(s.animalXp)}`);
    this.audio.update(
      s.settings,
      c.season,
      s.elapsed / B.daySeconds > B.daylight[c.season],
      this.menu || document.hidden,
    );
    this.syncTutorial();
  }
  syncTutorial() {
    if (this.menu) return;
    const s = this.engine.state;
    const host = this.root.querySelector('#tutorial-host');
    if (!host) return;
    if (this.lastTutorial === s.tutorial && host.childElementCount) return;
    const texts = [
      [
        '첫날의 작은 시작',
        '이곳이 앞으로 당신의 농장이 될 땅입니다. 2×2 집을 놓을 위치를 골라 주세요.',
        '집 배치',
      ],
      ['흙을 깨우는 시간', '빈 땅 한 칸을 누르고 밭 만들기를 선택하세요.', '밭 만들기'],
      ['씨앗 한 알의 가능성', '밭에 당근 씨앗을 심어 주세요. 씨앗 5개를 준비했어요.', '당근 심기'],
      ['촉촉하게, 천천히', '물주기 도구로 당근에 물을 주세요. 스태미나는 없어요.', '물주기'],
      [
        '수확을 기다릴 자리',
        '무료 보관 상자를 빈 땅에 놓아 주세요. 12슬롯을 사용할 수 있어요.',
        '상자 배치',
      ],
      ['오늘도 잘 가꿨어요', '집에서 오늘 마치기를 누르면 다음 날로 넘어가요.', '오늘 마치기'],
      ['첫 수확의 기쁨', '주황빛 당근이 다 자랐어요. 수확해 주세요.', '수확'],
      [
        '반가운 방문상인',
        '방문상인이 도착했어요. 방금 수확한 당근을 판매해 보세요.',
        '상인 만나기',
      ],
      [
        '농장이 한 뼘 넓어져요',
        '첫 수익을 얻었어요! 500G로 상하좌우에 붙은 땅을 구입하세요.',
        '토지 구매',
      ],
    ];
    if (s.tutorial >= 9) {
      host.innerHTML = '';
      return;
    }
    const t = texts[s.tutorial];
    host.innerHTML = `<div class="tutorial"><div class="tutorial-header"><span>첫 농장 이야기</span><span>${s.tutorial + 1} / 9</span></div><strong>${t[0]}</strong><p>${t[1]}</p>${btn('tutorial', t[2], 'primary')}</div>`;
    if (this.lastTutorial !== s.tutorial) {
      this.lastTutorial = s.tutorial;
      if ([1, 2, 3, 6].includes(s.tutorial)) {
        this.tool = ({ 1: 'hoe', 2: 'seed', 3: 'water', 6: 'harvest' } as Record<number, string>)[
          s.tutorial
        ];
        this.root
          .querySelectorAll('[data-action^="tool:"]')
          .forEach((el) =>
            el.classList.toggle(
              'active',
              (el as HTMLElement).dataset.action === `tool:${this.tool}`,
            ),
          );
      }
    }
  }
  select(x: number, y: number) {
    this.selected = { x, y };
    const s = this.engine.state;
    if (this.multi) {
      const k = key(x, y);
      if (s.tiles[k]?.plot) {
        this.selectedKeys.has(k) ? this.selectedKeys.delete(k) : this.selectedKeys.add(k);
        this.scene.selection = [...this.selectedKeys];
        this.scene.drawHighlight();
      } else {
        const b = buildingAt(s, x, y);
        if (b) {
          this.moving.includes(b.id)
            ? (this.moving = this.moving.filter((id) => id !== b.id))
            : this.moving.push(b.id);
        }
      }
      this.renderMode();
      return;
    }
    if (this.scene.buildMode && this.tab === 'land') {
      this.renderContext();
      return;
    }
    if (!this.panel && !this.scene.buildMode && this.tool !== 'inspect') this.useTool();
    this.renderContext();
  }
  useTool() {
    if (!this.selected) return;
    const { x, y } = this.selected;
    const e = this.engine,
      tool = this.tool;
    if (tool === 'hoe') e.till(x, y);
    if (tool === 'water') e.water(x, y);
    if (tool === 'harvest') e.harvest(x, y);
    if (tool === 'seed') {
      if (e.state.tutorial === 2) e.plant(x, y, 'carrot');
      else this.open('seed');
    }
    if (e.state.settings.vibration && navigator.vibrate) navigator.vibrate(12);
    this.audio.action();
    if (e.state.settings.shake) this.scene.cameras.main.shake(70, 0.001);
  }
  contextAction() {
    if (this.scene.placing) {
      void this.action('place', document.createElement('button'));
      return;
    }
    if (!this.selected) {
      this.toast('먼저 농장 타일을 눌러 주세요.');
      return;
    }
    const { x, y } = this.selected,
      s = this.engine.state,
      b = buildingAt(s, x, y),
      p = s.tiles[key(x, y)]?.plot;
    if (this.scene.buildMode && this.tab === 'land') {
      this.engine.buyLand(x, y);
      this.renderContext();
      return;
    }
    if (this.tool !== 'inspect') {
      this.useTool();
      this.renderContext();
      return;
    }
    if (b) {
      this.selectedBuilding = b.id;
      if (b.type === 'house') this.open('house');
      else if (buildingById[b.type].capacity) {
        this.storage = b.id;
        this.open('storage');
      } else if (['processor', 'kitchen', 'loom', 'meatplant'].includes(b.type))
        this.open('processing');
      else if (['breeding', 'breedlab'].includes(b.type)) this.open('breeding');
      else if (b.type === 'compost') this.open('inventory');
      else if (b.type === 'greenhouse') this.open('plot');
      else this.open('barn');
    } else if (p) this.open('plot');
    else if (s.tiles[key(x, y)]) {
      this.engine.till(x, y);
      this.renderContext();
    } else if (s.merchant.present && x >= 16 && x <= 18 && y >= 10 && y <= 12)
      this.open('merchant');
  }
  renderContext() {
    const host = this.root.querySelector('#context-host');
    if (!host || this.menu) return;
    if (!this.selected || this.scene.placing) {
      host.innerHTML = '';
      return;
    }
    const { x, y } = this.selected,
      s = this.engine.state,
      p = s.tiles[key(x, y)]?.plot,
      b = buildingAt(s, x, y);
    let title = '',
      desc = '',
      action = '살펴보기';
    if (this.scene.buildMode && this.tab === 'land') {
      title = adjacent(s, x, y) ? '구입 가능한 토지' : '이웃한 땅을 골라 주세요';
      desc = `${money(landPrice(s))} · 집 Lv.${s.houseLevel} 한도 ${B.house[s.houseLevel - 1].cap}칸`;
      action = '토지 구매';
    } else if (b) {
      title = buildingById[b.type].name;
      desc = `${b.rotation ? buildingById[b.type].height : buildingById[b.type].width}×${b.rotation ? buildingById[b.type].width : buildingById[b.type].height} · 무료로 이동 가능`;
      action = '시설 관리';
    } else if (p) {
      title = p.crop ? cropById[p.crop].name : '빈 농지';
      desc = p.crop
        ? `${p.growth}/${cropById[p.crop].growDays}일 성장 · ${p.watered ? '물주기 완료' : '물이 필요해요'}${p.pestActive ? ' · 작은 해충 발견' : ''}`
        : '한 칸에 작물 하나를 심을 수 있어요.';
      action =
        this.tool === 'inspect'
          ? '밭 관리'
          : this.tool === 'seed'
            ? '심기'
            : this.tool === 'water'
              ? '물주기'
              : this.tool === 'harvest'
                ? '수확'
                : '밭 만들기';
    } else if (s.tiles[key(x, y)]) {
      title = '나의 빈 땅';
      desc = '씨앗이 자랄 자리로 만들어 볼까요?';
      action = '밭 만들기';
    } else {
      title = '아직 소유하지 않은 땅';
      desc = '건설 → 토지 구매에서 확장할 수 있어요.';
      action = '살펴보기';
    }
    host.innerHTML = `<div class="context"><strong>${title}</strong><small>${desc}</small><small>좌표 ${x + 1}, ${y + 1}</small>${this.scene.buildMode && b ? `<div class="context-actions">${btn(`move:${b.id}`, '이동')}${btn(`rotate:${b.id}`, '회전')}${btn(`demolish:${b.id}`, '철거')}</div>` : ''}</div>`;
    const label = this.root.querySelector('#action-label');
    if (label) label.textContent = action;
  }
  renderMode() {
    const host = this.root.querySelector('#mode-host');
    if (!host) return;
    if (!this.scene.buildMode) {
      host.innerHTML = '';
    } else if (this.scene.placing) {
      const p = this.scene.placing;
      host.innerHTML = `<div class="modebar"><span>${this.moving.length ? '시설 이동' : buildingById[p.type].name + ' 배치'}</span>${btn('place', '배치 확정', 'primary')}${btn('preview-rotate', '회전')}${btn('build-exit', '완료', 'cancel')}</div>`;
    } else if (this.tab === 'land') {
      host.innerHTML = `<div class="modebar"><span>토지 구매 · ${money(landPrice(this.engine.state))}</span>${btn('context', '선택한 땅 구입')}${btn('build-exit', '완료', 'cancel')}</div>`;
    } else {
      host.innerHTML = `<div class="modebar"><span>${this.multi ? `선택 ${this.moving.length}개` : '건설 · 시간 멈춤'}</span>${btn('build', '시설 목록')}${btn('multi-build', this.multi ? '다중 선택 해제' : '다중 선택')}${this.moving.length ? btn('move-group', '함께 이동') : ''}${btn('build-exit', '완료', 'cancel')}</div>`;
    }
    const sel = this.root.querySelector('#selection-host');
    if (sel)
      sel.innerHTML = this.selectedKeys.size
        ? `<div class="selection-badge">농지 ${this.selectedKeys.size}칸 선택 · ${btn('plot', '함께 관리')}</div>`
        : '';
  }
  start(state: ReturnType<typeof createState>, slot: number) {
    this.engine.state = state;
    this.slot = slot;
    this.menu = false;
    this.engine.paused = false;
    this.panel = '';
    this.tab = '';
    this.lastTutorial = -1;
    this.selected = undefined;
    this.scene.selected = undefined;
    this.scene.selection = [];
    this.selectedKeys.clear();
    this.scene.setMenu(false);
    this.scene.player.setPosition(496, 570);
    this.scene.cancelPreview();
    this.scene.buildMode = false;
    this.renderHUD();
    this.engine.changed();
    if (state.tutorial === 0) this.beginPlace('house');
    void this.save(false);
  }
  beginPlace(type: string, moveIds: string[] = []) {
    this.close();
    this.scene.buildMode = true;
    this.engine.paused = true;
    this.moving = moveIds;
    this.scene.placing = {
      type,
      rotation: moveIds.length
        ? this.engine.state.buildings.find((b) => b.id === moveIds[0])!.rotation
        : false,
      ignore: moveIds,
    };
    this.selected = { x: 14, y: 14 };
    this.scene.drawPreview(14, 14);
    this.renderMode();
  }
  finishBuild() {
    this.scene.buildMode = false;
    this.scene.cancelPreview();
    this.multi = false;
    this.moving = [];
    this.tab = '';
    this.engine.paused = !!this.panel || this.menu;
    this.renderMode();
    this.renderContext();
  }
  open(name: string, tab = '') {
    this.panel = name;
    this.tab = tab;
    this.engine.paused = true;
    if (name === 'build') this.scene.buildMode = true;
    this.renderPanel();
  }
  close() {
    this.panel = '';
    this.root.querySelector('#panel-host')!.innerHTML = '';
    this.engine.paused = this.menu || this.scene.buildMode;
    this.updateHud();
  }
  title() {
    return (
      (
        {
          new: ['새 농장 시작하기', 'leaf', '빈 3×3 땅에서 시작하는 첫 이야기'],
          continue: ['이어하기', 'book', '자동 저장된 농장을 이어서 가꾸세요'],
          settings: ['설정', 'settings', '모바일 조작과 소리를 나에게 맞게'],
          inventory: ['가방', 'bag', '신선한 수확물은 방문상인에게 판매하세요'],
          storage: ['창고', 'bag', '냉장 보관은 신선도 감소를 늦춰 줍니다'],
          build: ['농장 건설', 'build', '시설 이동은 무료 · 메뉴와 건설 중 시간 정지'],
          plot: ['밭 정보와 관리', 'seed', '농지 내부 업그레이드 · 외부 스프링클러 없음'],
          seed: ['씨앗 고르기', 'seed', '제철이 아니면 성장이 쉬어 갑니다'],
          merchant: [
            this.engine.state.merchant.special ? '특급상인' : '방문상인',
            'store',
            '상인이 방문한 날에만 거래할 수 있어요',
          ],
          animals: ['함께 사는 동물들', 'animal', '모든 동물에게 이름과 이야기가 있어요'],
          animal: ['동물 상세', 'animal', '노화와 질병으로 동물을 잃지 않아요'],
          barn: ['축사와 시설 관리', 'home', '자동화는 시설 내부 업그레이드로 제공해요'],
          breeding: ['브리딩', 'heart', '부모는 언제나 직접 선택합니다'],
          birthresult: ['브리딩 결과', 'heart', '새로운 친구가 태어났어요'],
          breedresult: ['브리딩 시작', 'heart', '새끼의 탄생을 기다리는 설레는 시간'],
          lineage: ['혈통도', 'tree', '부모 · 조부모 · 증조부모'],
          processing: ['가공과 요리', 'store', '재료를 더 가치 있는 상품으로 바꿔요'],
          skills: ['기술 연구', 'tree', '농사와 목축이 함께 발전하는 농장'],
          house: ['나의 작은 집', 'home', '외부 크기는 언제나 2×2'],
          manage: ['농장 전체 관리', 'chart', '원하는 항목을 누르면 해당 위치로 이동해요'],
          book: ['농장 도감', 'book', '작물, 동물, 시설과 생산물의 기록'],
          daily: ['하루 정산', 'sun', '오늘도 한 걸음 자랐어요'],
          monthly: ['월간 정산', 'chart', '한 달은 10일 · 매출 기준 운영비'],
          finance: ['재정 통계', 'chart', '차곡차곡 쌓이는 농장의 성장 기록'],
          blueprint: ['설계도', 'build', '시설 배치를 저장하고 다시 불러오세요'],
          save: ['세이브', 'save', 'IndexedDB · 세이브 슬롯 3개'],
          pause: ['잠깐 쉬어 가기', 'pause', '메뉴를 읽는 동안 시간은 멈춰 있어요'],
          calendar: ['시간과 계절', 'clock', '현실 10분 = 농장 하루 · 1년 120일'],
        } as Record<string, string[]>
      )[this.panel] ?? ['농장', 'leaf', '']
    );
  }
  tabs() {
    const t: Record<string, string[][]> = {
      inventory: [
        ['all', '전체'],
        ['crop', '작물'],
        ['animal', '축산물'],
        ['processed', '가공품'],
        ['cooking', '요리'],
        ['seed', '씨앗'],
        ['other', '기타'],
      ],
      storage: [
        ['all', '전체'],
        ['crop', '작물'],
        ['animal', '축산물'],
        ['processed', '가공품'],
        ['cooking', '요리'],
        ['seed', '씨앗'],
        ['other', '기타'],
      ],
      build: [
        ['facilities', '시설'],
        ['animals', '축사'],
        ['production', '생산'],
        ['decor', '꾸미기'],
        ['land', '토지 구매'],
        ['layout', '배치'],
      ],
      merchant: [
        ['sell', '판매'],
        ['seeds', '씨앗'],
        ['animals', '동물'],
        ['goods', '상품'],
      ],
      skills: [
        ['farm', '농사'],
        ['animal', '목축'],
      ],
      book: [
        ['crops', '작물'],
        ['animals', '동물'],
        ['processed', '가공품'],
        ['cooking', '요리'],
        ['buildings', '시설'],
      ],
      processing: [
        ['recipes', '레시피'],
        ['cooking', '요리'],
        ['jobs', '작업 관리'],
      ],
      plot: [
        ['info', '밭 정보'],
        ['upgrades', '내부 업그레이드'],
      ],
      barn: [
        ['care', '동물 관리'],
        ['upgrades', '자동화'],
      ],
      manage: [
        ['overview', '농장 현황'],
        ['actions', '일괄 작업'],
      ],
    };
    const list = t[this.panel];
    if (!list) return '';
    this.tab ||= list[0][0];
    return `<div class="tabs">${list.map(([id, n]) => btn(`tab:${id}`, n, this.tab === id ? 'active' : '')).join('')}</div>`;
  }
  renderPanel() {
    const host = this.root.querySelector('#panel-host')!;
    const [title, i, subtitle] = this.title();
    const tabs = this.tabs();
    host.innerHTML = `<div class="shade"><section class="panel" role="dialog" aria-modal="true" aria-label="${esc(title)}"><div class="panel-head"><div class="panel-title">${icon(i)}<div><h2>${esc(title)}</h2><div class="panel-subtitle">${subtitle}</div></div></div>${btn('close', icon('close'), 'close', 'aria-label="닫기"')}</div>${tabs}<div class="panel-body" id="panel-body">${this.content()}</div><div class="panel-footer"><span>${this.menu ? '마음이 쉬어 가는 작은 농장' : '시간이 멈춰 있어요 · 여유롭게 살펴보세요'}</span><span>${this.menu ? '로컬 세이브' : `${money(this.engine.state.gold)} · ${Object.keys(this.engine.state.tiles).length}칸`}</span></div></section></div>`;
    this.root
      .querySelector<HTMLInputElement>('.panel input, .panel button')
      ?.focus({ preventScroll: true });
  }
  content(): string {
    const s = this.engine.state;
    switch (this.panel) {
      case 'new':
        return `${note('처음에는 집도 없는 9칸의 땅을 받습니다. 집 위치부터 직접 정해 주세요.')}<div class="form"><label>농장 이름<input id="farm-name" maxlength="24" value="나의 작은 농장"></label></div><div class="divider"></div>${[
          1, 2, 3,
        ]
          .map((slot) => {
            const save = this.slots.find((x) => x.slot === slot);
            return `<div class="slot"><div><strong>슬롯 ${slot} · ${save ? esc(save.state.name) : '빈 자리'}</strong><small>${save ? `${save.state.day}일째 · 기존 저장을 덮어씁니다` : '새로운 이야기를 기다리고 있어요'}</small></div>${btn(`start:${slot}`, save ? '덮어쓰고 시작' : '여기에 시작', 'primary')}</div>`;
          })
          .join('')}`;
      case 'continue':
        return (
          this.slots
            .map(
              (save) =>
                `<div class="slot"><div><strong>슬롯 ${save.slot} · ${esc(save.state.name)}</strong><small>${save.state.day}일째 · ${money(save.state.gold)} · ${new Date(save.updated).toLocaleString('ko-KR')}</small></div>${btn(`load:${save.slot}`, '이어하기', 'primary')}</div>`,
            )
            .join('') || empty('저장된 농장이 아직 없어요.')
        );
      case 'settings':
        return this.settingsContent();
      case 'inventory':
      case 'storage':
        return this.inventoryContent();
      case 'build':
        return this.buildContent();
      case 'plot':
        return this.plotContent();
      case 'seed':
        return `<div class="grid four">${crops
          .filter((c) => itemCount(s, `seed:${c.id}`) > 0)
          .map(
            (c) =>
              `<div class="card"><div class="icon-line">${this.pixel(`${c.spriteKey}-3`)}<strong>${c.name}</strong></div><small>${seasonNames[c.season]} · ${c.growDays}일 성장<br>씨앗 ${itemCount(s, `seed:${c.id}`)}개 · ${money(c.baseSellPrice)}</small>${btn(`plant:${c.id}`, '여기에 심기', 'primary')}</div>`,
          )
          .join(
            '',
          )}</div>${s.inventory.some((i) => i.type === 'seed') ? '' : empty('씨앗은 방문상인에게 구입할 수 있어요.')}`;
      case 'merchant':
        return this.merchantContent();
      case 'animals':
        return this.animalsContent();
      case 'animal':
        return this.animalContent();
      case 'barn':
        return this.barnContent();
      case 'breeding':
        return this.breedingContent();
      case 'breedresult':
        return `${note('부모를 직접 선택한 브리딩이 시작되었어요. 자동 번식은 일어나지 않습니다.')}<div class="stats">${stat('출산까지', `${B.gestation}일`)}${stat('브리딩 비용', money(B.breedingCost))}${stat('예약된 축사 공간', '1칸')}</div>${btn('animals', '동물 목록 보기', 'primary')}`;
      case 'birthresult':
        return this.birthResultContent();
      case 'lineage':
        return this.lineageContent();
      case 'processing':
        return this.processingContent();
      case 'skills':
        return `<div class="stats">${stat('농사 레벨', level(s.farmXp))}${stat('목축 레벨', level(s.animalXp))}${stat('농사 경험치', s.farmXp)}${stat('목축 경험치', s.animalXp)}</div><div class="grid">${skills
          .filter((k) => k.branch === this.tab)
          .map((k) => {
            const owned = s.skills.includes(k.id);
            return `<div class="card ${owned ? '' : 'locked'}"><div class="card-row"><strong>${k.name}</strong><span class="chip">${owned ? '연구 완료' : `Lv.${k.level}`}</span></div><small>${k.description}<br>${k.branch === 'farm' ? '농사' : '목축'} ${k.level} / ${k.branch === 'farm' ? '목축' : '농사'} ${k.cross}</small>${btn(`research:${k.id}`, owned ? '해금됨' : `${money(k.price)} · 연구`, 'primary', owned ? 'disabled' : '')}</div>`;
          })
          .join('')}</div>`;
      case 'house':
        return this.houseContent();
      case 'manage':
        return this.manageContent();
      case 'book':
        return this.bookContent();
      case 'daily':
        return this.ledgerContent(s.lastDaily ?? s.daily, false);
      case 'monthly':
        return this.ledgerContent(s.lastMonthly ?? s.monthly, true);
      case 'finance':
        return this.financeContent();
      case 'blueprint':
        return `<div class="form"><label>설계도 이름<input id="blueprint-name" value="나의 농장 배치" maxlength="24"></label></div><div class="row" style="margin:15px 0">${btn('blueprint-save', `${icon('save')} 현재 배치 저장`, 'primary')}</div>${note('같은 시설 구성을 가진 농장에만 불러옵니다. 이동할 자리에 밭이나 다른 시설이 있으면 적용하지 않아요.')} ${s.blueprints.map((p, i) => `<div class="slot"><div><strong>${esc(p.name)}</strong><small>시설 ${p.buildings.length}개</small></div><div class="row">${btn(`blueprint-load:${i}`, '배치 적용')}${btn(`blueprint-delete:${i}`, '삭제')}</div></div>`).join('')}`;
      case 'save':
        return (
          [1, 2, 3]
            .map((slot) => {
              const save = this.slots.find((x) => x.slot === slot);
              return `<div class="slot"><div><strong>슬롯 ${slot}${this.slot === slot ? ' · 사용 중' : ''}</strong><small>${save ? `${esc(save.state.name)} · ${save.state.day}일째` : '빈 슬롯'}</small></div><div class="row">${btn(`save:${slot}`, '이 슬롯에 저장', 'primary')}${save ? btn(`load:${slot}`, '불러오기') : ''}</div></div>`;
            })
            .join('') + btn('export-save', '백업 파일 내보내기')
        );
      case 'pause':
        return `<div class="grid two">${[
          ['save', 'save', '저장 / 불러오기'],
          ['settings', 'settings', '설정'],
          ['manage', 'chart', '농장 관리'],
          ['book', 'book', '도감'],
          ['finance', 'chart', '재정 통계'],
          ['blueprint', 'build', '설계도'],
        ]
          .map(([a, i, t]) => btn(a, `${icon(i)}${t}`))
          .join(
            '',
          )}${btn('sleep', `${icon('clock')} 오늘 마치기`)}${btn('menu', `${icon('home')} 시작 화면으로`)}</div>`;
      case 'calendar': {
        const c = calendar(s.day);
        return `<div class="stats">${stat('계절', seasonNames[c.season])}${stat('날짜', `${c.month}월 ${c.date}일`)}${stat('날씨', weatherNames[s.weather])}${stat('연도', `${c.year}년`)}</div>${note('하루는 현실 10분, 한 달은 10일, 한 계절은 30일입니다. 밤에도 자유롭게 농장을 가꿀 수 있어요.')}<div class="progress"><span style="width:${(s.elapsed / B.daySeconds) * 100}%"></span></div><p class="small">오늘 남은 시간 ${Math.ceil((B.daySeconds - s.elapsed) / 60)}분 · 제철 판매 +10% · 비 오는 날 야외 농지 자동 물주기<br>다음 상인 예정: ${Math.max(0, s.merchant.nextDay - s.day)}일 후</p>${btn('sleep', '오늘 마치기', 'primary')}`;
      }
      default:
        return '';
    }
  }
  settingsContent() {
    const s = this.engine.state.settings;
    const sliders: [keyof Settings, string, number, number, number][] = [
      ['bgm', '배경음악', 0, 100, 1],
      ['sfx', '효과음 / UI', 0, 100, 1],
      ['ambient', '환경음', 0, 100, 1],
      ['uiSize', 'UI 크기', 0.9, 1.2, 0.1],
      ['cameraSpeed', '카메라 이동속도', 0.5, 2, 0.1],
      ['joystickOpacity', '조이스틱 투명도', 0.2, 1, 0.1],
    ];
    return `<div class="form">${sliders.map(([id, n, min, max, step]) => `<label>${n}<input type="range" data-setting="${id}" min="${min}" max="${max}" step="${step}" value="${s[id]}"><span>${s[id]}</span></label>`).join('')}${(['vibration', 'tapMove', 'shake', 'autosave'] as const).map((id) => `<label>${{ vibration: '진동', tapMove: 'Tap To Move · 땅을 눌러 이동', shake: '화면 흔들림', autosave: '자동 저장' }[id]}<input type="checkbox" data-setting="${id}" ${s[id] ? 'checked' : ''}></label>`).join('')}<label>FPS 제한<select data-setting="fps"><option ${s.fps === 30 ? 'selected' : ''}>30</option><option ${s.fps === 60 ? 'selected' : ''}>60</option></select></label></div><div class="row" style="margin-top:16px">${btn('fullscreen', `${icon('expand')} 전체화면`)}${btn('settings-reset', '기본값')}</div>`;
  }
  inventoryContent() {
    const s = this.engine.state;
    const storage = this.panel === 'storage' ? this.storage : 'bag';
    const stores = [
      { id: 'bag', name: '가방', cold: 0 },
      ...s.buildings
        .filter((b) => buildingById[b.type].capacity)
        .map((b) => ({
          id: b.id,
          name: buildingById[b.type].name,
          cold: buildingById[b.type].cold ?? 0,
        })),
    ];
    const current = stores.find((b) => b.id === storage);
    return `<div class="row" style="margin-bottom:16px"><input class="search" id="search" placeholder="품목 검색" value="${esc(this.filter)}" aria-label="품목 검색">${btn('sort', '자동 정렬')}${btn('favorites', this.favorites ? '즐겨찾기만 표시' : '즐겨찾기')}<select id="storage-select" class="search" aria-label="보관함">${stores.map((b) => `<option value="${b.id}" ${b.id === storage ? 'selected' : ''}>${b.name}${b.cold ? ` · 감소 ${b.cold * 100}% 보호` : ''}</option>`).join('')}</select></div>${note(`${current?.name ?? '가방'} · ${s.inventory.filter((i) => i.storage === storage).length}/${capacity(s, storage)}슬롯 ${current?.cold ? `· 신선도 감소속도 ${Math.round(current.cold * 100)}% 감소` : '· 신선도 보호 없음'}`)}<div id="item-grid">${this.itemGrid()}</div><div class="divider"></div><div class="row"><select id="transfer-target" class="search" aria-label="이동할 보관함">${stores
      .filter((b) => b.id !== storage)
      .map((b) => `<option value="${b.id}">${b.name}</option>`)
      .join('')}</select>${btn('transfer-all', '현재 보관함 일괄 이동')}</div>`;
  }
  itemGrid() {
    const s = this.engine.state,
      storage = this.panel === 'storage' ? this.storage : 'bag';
    const list = s.inventory
      .map((i, index) => ({ i, index }))
      .filter(
        ({ i }) =>
          i.storage === storage &&
          (this.tab === 'all' || i.type === this.tab) &&
          (!this.filter || itemName(i.id).includes(this.filter)) &&
          (!this.favorites || i.favorite),
      );
    return `<div class="grid four">${list
      .map(({ i, index }) => {
        const c = cropById[i.id.startsWith('seed:') ? i.id.slice(5) : i.id];
        return `<div class="card"><div class="card-row">${c ? this.pixel(`${c.spriteKey}-${i.type === 'seed' ? 0 : 3}`) : icon(i.type === 'animal' ? 'animal' : 'bag')}${btn(`favorite:${index}`, i.favorite ? '★' : '☆', '', 'aria-label="즐겨찾기"')}</div><strong>${itemName(i.id)} <span class="muted">×${i.quantity}</span></strong>${['seed', 'other'].includes(i.type) ? '<small>신선도 감소 없음</small>' : `<small>${i.freshness === 0 ? '부패 · 판매 불가' : `신선도 ${Math.floor(i.freshness)}%`}</small><div class="freshness ${i.freshness < 50 ? 'low' : ''}"><span style="width:${i.freshness}%"></span></div>`}<div class="row">${btn(`transfer:${index}`, '이동')}${btn(`discard:${index}`, '폐기')}${i.freshness === 0 && i.type === 'crop' && s.skills.includes('compost') ? btn(`compost:${index}`, '퇴비') : ''}</div></div>`;
      })
      .join(
        '',
      )}</div>${list.length ? '' : empty('이곳은 아직 비어 있어요.<br>작물을 수확하거나 상인에게 씨앗을 구입해 보세요.')}`;
  }
  renderItems() {
    const grid = this.root.querySelector('#item-grid');
    if (grid) grid.innerHTML = this.itemGrid();
  }
  buildContent() {
    const s = this.engine.state;
    if (this.tab === 'land')
      return `<div class="stats">${stat('현재 토지', `${Object.keys(s.tiles).length}칸`)}${stat('집 토지 한도', `${B.house[s.houseLevel - 1].cap}칸`)}${stat('다음 구입 가격', money(landPrice(s)))}${stat('최대 농장', '30×30')}</div>${note('소유한 땅과 상하좌우로 붙은 한 칸을 골라 구입하세요. 대각선으로는 연결할 수 없어요.')} ${btn('land-mode', '농장에서 구입할 땅 선택', 'primary')}`;
    if (this.tab === 'layout')
      return `<div class="row">${btn('layout-mode', '시설 선택 / 다중 이동', 'primary')}${btn('blueprint', '설계도 저장 / 불러오기')}${btn('manage', '농장 전체 관리')}</div><p class="small">시설을 눌러 이동·회전·철거를 선택하세요. 집도 무료로 이동할 수 있어요.</p>`;
    const category = this.tab;
    const list = buildings.filter(
      (b) =>
        b.id !== 'house' &&
        (category === 'animals'
          ? [
              'coop',
              'duckhouse',
              'rabbithouse',
              'sheepbarn',
              'cowbarn',
              'pigbarn',
              'largebarn',
              'breeding',
              'breedlab',
            ].includes(b.id)
          : category === 'production'
            ? ['processor', 'kitchen', 'loom', 'meatplant', 'greenhouse', 'largecold'].includes(
                b.id,
              )
            : category === 'decor'
              ? ['flower', 'fence', 'bench', 'raredecor'].includes(b.id)
              : ['chest', 'well', 'compost', 'warehouse', 'cold'].includes(b.id)),
    );
    return `<div class="grid">${list
      .map((b) => {
        const locked = b.skill && !s.skills.includes(b.skill);
        return `<div class="card ${locked ? 'locked' : ''}"><div class="icon-line">${this.pixel(`building-${b.id}`)}<strong>${b.name}</strong></div><small>${b.width}×${b.height}칸${b.capacity ? ` · ${b.capacity}슬롯` : ''}${b.cold ? ` · 신선도 ${b.cold * 100}% 보호` : ''}<br>${locked ? '관련 기술 연구가 필요해요' : '설치 위치를 직접 선택해요'}</small>${btn(`build:${b.id}`, `${money(b.price)} · 배치`, 'primary', locked ? 'disabled' : '')}</div>`;
      })
      .join('')}</div>`;
  }
  plotContent() {
    if (!this.selected) return empty('먼저 밭을 선택해 주세요.');
    const s = this.engine.state,
      p = s.tiles[key(this.selected.x, this.selected.y)]?.plot;
    const keys = this.selectedKeys.size
      ? [...this.selectedKeys]
      : [key(this.selected.x, this.selected.y)];
    if (!p)
      return `${note('온실 안에서도 각 타일에 밭을 만들어 씨앗을 심을 수 있어요.')}${btn('till-selected', '이 타일에 밭 만들기', 'primary')}`;
    const c = p.crop ? cropById[p.crop] : undefined;
    if (this.tab === 'upgrades')
      return `${note(`${keys.length}칸을 함께 관리합니다. 관개는 성장 속도를 높이지 않고 물주기를 도와줍니다.`)}<div class="grid">${(
        ['irrigation', 'soil', 'fertilizer', 'pest', 'autoHarvest'] as const
      )
        .map((id) => {
          const name = {
            irrigation: '관개',
            soil: '토양 개량',
            fertilizer: '비료',
            pest: '해충 방지',
            autoHarvest: '자동 수확',
          }[id];
          return `<div class="card"><strong>${name} ${id === 'autoHarvest' ? (p.autoHarvest ? 'ON' : 'OFF') : `Lv.${p[id]}`}</strong><small>${id === 'irrigation' ? '매일 자동 물주기' : id === 'soil' ? 'Lv.2 이상부터 수확량 +1' : id === 'fertilizer' ? '다음 성장일에 성장 +1일' : id === 'pest' ? '발생률 감소 · 기존 해충 제거 · Lv.3 완전 방지' : '완성된 작물을 창고로 자동 보관'}<br>한 칸당 ${money(B.plotCosts[id])}</small>${btn(`upgrade-plot:${id}`, '선택 밭 업그레이드', 'primary')}</div>`;
        })
        .join('')}</div>`;
    return `<div class="detail"><div class="portrait">${c ? this.pixel(`${c.spriteKey}-3`) : icon('seed')}</div><div><h3>${c ? c.name : '씨앗을 기다리는 밭'}</h3><div class="stats">${stat('성장', c ? `${p.growth}/${c.growDays}일` : '—')}${stat('물주기', p.watered ? '완료' : '필요')}${stat('관개', `Lv.${p.irrigation}`)}</div>${c ? `<p class="small">${seasonNames[c.season]} 작물 · 판매 기본가 ${money(c.baseSellPrice)} · ${p.greenhouse ? '온실 재배' : c.season !== calendar(s.day).season ? '비제철 · 성장 쉬는 중' : '제철 · 판매 +10%'}</p>` : ''}<div class="row">${btn('seed', '씨앗 선택', 'primary')}${btn('water-selected', '물주기')}${btn('harvest-selected', '수확')}${btn('multi-plots', this.multi ? '다중 선택 끝내기' : '여러 밭 선택')}${btn('clear-plot', '빈 밭 정리')}</div></div></div>`;
  }
  merchantContent() {
    const s = this.engine.state;
    if (!s.merchant.present)
      return `${note('상인은 2~3일 간격으로 찾아오며 방문한 날 동안 머물러요. 신선도를 잘 관리해 주세요.')}<div class="stats">${stat('다음 방문', `${Math.max(1, s.merchant.nextDay - s.day)}일 후`)}</div>${btn('storage', '보관함 관리')}`;
    const header = s.merchant.special
      ? note(
          `특급상인 · 매입가격 +${Math.round(s.merchant.buyBonus * 100)}% · 구입가격 ${Math.round(s.merchant.discount * 100)}% 할인`,
        )
      : '';
    if (this.tab === 'sell')
      return (
        header +
        `<div class="grid four">${s.inventory
          .map((i, index) => ({ i, index }))
          .filter(({ i }) => !['seed', 'other'].includes(i.type))
          .map(
            ({ i, index }) =>
              `<div class="card"><strong>${itemName(i.id)} ×${i.quantity}</strong><small>신선도 ${Math.floor(i.freshness)}%<br>개당 ${money(salePrice(s, i))}</small>${btn(`sell:${index}`, `${money(salePrice(s, i) * i.quantity)} · 전부 판매`, 'primary', i.freshness <= 0 ? 'disabled' : '')}</div>`,
          )
          .join(
            '',
          )}</div>${s.inventory.some((i) => !['seed', 'other'].includes(i.type)) ? '' : empty('판매할 수확물이 아직 없어요.')}<div class="divider"></div>${btn('sell-all', '신선한 품목 일괄 판매')}`
      );
    if (this.tab === 'seeds')
      return (
        header +
        `<div class="grid four">${crops
          .filter((c) => !c.id.includes('gold') || s.merchant.special)
          .map((c) => {
            const locked =
              level(s.farmXp) < c.unlockLevel ||
              (c.id === 'goldberry' && !s.skills.includes('rare-crop')) ||
              (['apple', 'pear'].includes(c.id) && !s.skills.includes('orchard'));
            return `<div class="card ${locked ? 'locked' : ''}"><div class="icon-line">${this.pixel(`${c.spriteKey}-3`)}<strong>${c.name}</strong></div><small>${seasonNames[c.season]} · ${c.growDays}일 · 농사 Lv.${c.unlockLevel}<br>${c.season === calendar(s.day).season ? '지금 제철이에요' : '비제철 성장은 쉬어가요'}</small>${btn(`buy-seed:${c.id}`, `${money(Math.ceil(c.seedPrice * (1 - s.merchant.discount)))} · 1개`, 'primary', locked ? 'disabled' : '')}</div>`;
          })
          .join('')}</div>`
      );
    if (this.tab === 'animals')
      return (
        header +
        `<div class="grid">${animals
          .filter((a) => !a.rare || s.merchant.special)
          .map(
            (a) =>
              `<div class="card"><div class="icon-line">${this.pixel(`animal-${a.id}`)}<strong>${a.name}</strong></div><small>목축 Lv.${a.unlockLevel} · ${buildingById[a.building].name} 필요<br>${money(Math.ceil(a.price * (1 - s.merchant.discount)))}</small><div class="row">${btn(`buy-animal:${a.id}:F`, '암컷 구입', 'primary')}${btn(`buy-animal:${a.id}:M`, '수컷 구입')}</div></div>`,
          )
          .join('')}</div>`
      );
    return (
      header +
      `<div class="grid">${['feed', 'fertilizer', 'wheat', 'material'].map((id) => `<div class="card"><strong>${products[id].name}</strong><small>1개 ${money(Math.ceil(products[id].price * (1 - s.merchant.discount)))}</small>${btn(`buy-good:${id}`, '10개 구입', 'primary')}</div>`).join('')}${s.merchant.special ? `<div class="card"><strong>희귀 장식과 시설</strong><small>특수 작물 연구 후 황금 꽃 조각을 설치할 수 있어요.</small>${btn('build', '건설 목록')}</div>` : ''}</div>`
    );
  }
  animalsContent() {
    const s = this.engine.state;
    return `<div class="stats">${stat('동물', `${s.animals.length}마리`)}${stat('임신', s.animals.filter((a) => a.pregnant).length)}${stat(
      '수거 가능',
      s.animals.reduce((n, a) => n + a.products, 0),
    )}${stat('축사', s.buildings.filter((b) => animals.some((a) => a.building === b.type)).length)}</div><div class="row" style="margin-bottom:16px">${btn('breeding', `${icon('heart')} 브리딩`, 'primary')}${btn('care-all', '모두 급식 / 청소')}${btn('collect-all', '모두 수거')}${btn('merchant', '동물 구입')}</div><div class="grid">${s.animals.map((a) => `<div class="card"><div class="icon-line">${this.pixel(`animal-${a.species}`)}<div><strong>${esc(a.name)}</strong><small style="display:block">${animalById[a.species].name} · ${a.sex === 'F' ? '암컷' : '수컷'} · ${a.grade}등급</small></div></div><small>${esc(a.id)}<br>${a.stage === 'baby' ? '성장 중' : '성체'} · ${a.fed ? '급식 완료' : '배가 고파요'} · ${a.clean ? '깨끗해요' : '청소 필요'}<br>${a.pregnant ? `출산까지 ${a.pregnant.days}일` : `수거 가능 ${a.products}개`}</small>${btn(`animal:${a.id}`, '자세히 보기')}</div>`).join('')}</div>${s.animals.length ? '' : empty('작은 친구들을 맞이해 볼까요?<br>축사를 건설한 후 방문상인에게 동물을 구입하세요.')}`;
  }
  animalContent() {
    const a = this.engine.state.animals.find((a) => a.id === this.animalId);
    if (!a) return empty('동물을 먼저 선택해 주세요.');
    return `<div class="detail"><div class="portrait">${this.pixel(`animal-${a.species}`)}</div><div><h3>${esc(a.name)} <span class="chip">${a.grade}등급 · ${a.sex === 'F' ? '암컷' : '수컷'}</span></h3><p class="small">${esc(a.id)} · ${a.age}일 · ${a.stage === 'baby' ? '성장 중' : '성체'} · ${a.products}개 수거 가능</p><div class="stats">${stat('생산력', a.production)}${stat('성장력', a.growth)}${stat('건강', a.health)}${stat('번식력', a.fertility)}${stat('체격', a.body)}${stat('누적 생산', a.record)}</div><p class="small">특성: ${a.traits.map(esc).join(' · ') || '아직 발견되지 않았어요'}<br>출산 ${a.births}회 · 자식 ${a.children.length}마리${a.pregnant ? ` · 출산까지 ${a.pregnant.days}일` : ''}</p><div class="row">${btn(`feed:${a.id}`, a.fed ? '급식 완료' : '사료 주기', 'primary', a.fed ? 'disabled' : '')}${btn(`clean:${a.id}`, a.clean ? '청소 완료' : '청소', '', a.clean ? 'disabled' : '')}${btn(`collect:${a.id}`, '생산품 수거')}${btn('lineage', '혈통도')}${btn(`focus-animal:${a.id}`, '농장에서 보기')}</div></div></div><div class="divider"></div><div class="form"><label>이름<input id="animal-name" value="${esc(a.name)}" maxlength="20"></label><label>혈통 이름<input id="lineage-name" value="${esc(a.lineage)}" maxlength="24"></label></div><div class="row" style="margin-top:15px">${btn('rename-animal', '이름 저장')}${btn(`sell-animal:${a.id}`, '상인에게 판매')}${btn(`ship-animal:${a.id}`, '육가공 출하')}</div>`;
  }
  barnContent() {
    const s = this.engine.state,
      b = s.buildings.find((b) => b.id === this.selectedBuilding);
    if (!b) return empty('농장에서 시설을 먼저 선택하세요.');
    if (this.tab === 'upgrades')
      return `<div class="grid">${(['feed', 'clean', 'collect'] as const).map((id) => `<div class="card"><strong>${{ feed: '자동 급식', clean: '자동 청소', collect: '자동 생산품 수거' }[id]}</strong><small>${id === 'feed' ? '매일 재고의 사료를 사용해요.' : '시설 내부 자동화 · 별도 타일 사용 없음'}</small>${btn(`upgrade-barn:${b.id}:${id}`, b.upgrades[id] ? '설치 완료' : `${money(B.barnUpgrade)} · 업그레이드`, 'primary', b.upgrades[id] ? 'disabled' : '')}</div>`).join('')}</div>`;
    return `${note(`${buildingById[b.type].name} · ${s.animals.filter((a) => a.building === b.id).length}/${B.animalCapacity}마리 · 출산 예약 포함 빈자리 ${this.engine.barnSpace(b.id)}`)}<div class="grid">${s.animals
      .filter((a) => a.building === b.id)
      .map(
        (a) =>
          `<div class="card"><strong>${esc(a.name)}</strong><small>${a.products}개 수거 가능</small>${btn(`animal:${a.id}`, '자세히 보기')}</div>`,
      )
      .join(
        '',
      )}</div><div class="row" style="margin-top:16px">${btn(`move:${b.id}`, '시설 이동')}${btn(`rotate:${b.id}`, '시설 회전')}${btn(`demolish:${b.id}`, '시설 철거')}</div>`;
  }
  breedingContent() {
    const s = this.engine.state;
    const females = s.animals.filter((a) => a.sex === 'F' && a.stage === 'adult' && !a.pregnant),
      males = s.animals.filter((a) => a.sex === 'M' && a.stage === 'adult');
    const f = s.animals.find((a) => a.id === this.female),
      m = s.animals.find((a) => a.id === this.male);
    const odds = f && m ? gradeProbabilities(f.grade, m.grade) : undefined;
    return `${note('같은 종의 성체 암컷과 수컷을 직접 선택하세요. 브리딩 시설과 새끼가 머물 축사 공간이 필요합니다.')}<div class="form"><label>암컷<select id="female" class="search"><option value="">암컷 선택</option>${females.map((a) => `<option value="${a.id}" ${this.female === a.id ? 'selected' : ''}>${esc(a.name)} · ${animalById[a.species].name} · ${a.grade}등급 · ${a.id}</option>`).join('')}</select></label><label>수컷<select id="male" class="search"><option value="">수컷 선택</option>${males.map((a) => `<option value="${a.id}" ${this.male === a.id ? 'selected' : ''}>${esc(a.name)} · ${animalById[a.species].name} · ${a.grade}등급 · ${a.id}</option>`).join('')}</select></label></div><div class="divider"></div>${odds ? `<div class="stats">${stat('3등급', `${odds[0] * 100}%`)}${stat('2등급', `${odds[1] * 100}%`)}${stat('1등급', `${Math.round(odds[2] * 100)}%`)}${stat('출산까지', `${B.gestation}일`)}</div>` : empty('부모를 선택하면 등급 확률이 표시됩니다.')} ${btn('breed', `${money(B.breedingCost)} · 브리딩 시작`, 'primary')}`;
  }
  birthResultContent() {
    const s = this.engine.state;
    const recent = s.birthResults.slice(-8).map((b) => ({
      ...b,
      animal:
        s.animals.find((a) => a.id === b.animalId) ?? s.ancestry.find((a) => a.id === b.animalId),
    }));
    return `<div class="grid">${recent.map(({ animal: a, day }) => (a ? `<div class="card"><div class="icon-line">${this.pixel(`animal-${a.species}`)}<strong>${esc(a.name)} · ${a.grade}등급</strong></div><small>${day}일째 탄생 · ${a.sex === 'F' ? '암컷' : '수컷'}<br>${esc(a.id)}<br>부모: ${a.parents.map((id) => esc(s.animals.find((p) => p.id === id)?.name ?? s.ancestry.find((p) => p.id === id)?.name ?? id)).join(' + ')}<br>유전 특성: ${a.traits.map(esc).join(' · ') || '없음'}</small>${btn(`animal:${a.id}`, '새 친구 살펴보기', 'primary')}</div>` : '')).join('')}</div>${recent.length ? '' : empty('아직 출산 기록이 없어요. 브리딩을 시작한 뒤 기다려 주세요.')}<div class="row" style="margin-top:16px">${btn('daily', '하루 정산')}${btn('close', '농장으로 돌아가기', 'primary')}</div>`;
  }
  lineageContent() {
    const s = this.engine.state;
    if (!s.skills.includes('lineage'))
      return note('목축 스킬트리에서 혈통 기술을 연구하면 3세대 가계도를 확인할 수 있어요.');
    const a = s.animals.find((a) => a.id === this.animalId);
    if (!a) return empty('동물을 먼저 선택해 주세요.');
    const all = [...s.animals, ...s.ancestry],
      tree = ancestors(a, all);
    const cols: [string, ReturnType<typeof ancestors>][] = [
      ['부모', tree],
      ['조부모', tree.flatMap((n) => n.parents)],
      ['증조부모', tree.flatMap((n) => n.parents.flatMap((p) => p.parents))],
    ];
    return `<h3>${esc(a.name)} · ${esc(a.lineage || '이름 없는 혈통')}</h3><div class="family"><div class="family-column"><h3>현재 개체</h3><div class="family-node">${esc(a.name)}<br>${esc(a.id)}<br>${a.grade}등급</div></div>${cols.map(([title, nodes]) => `<div class="family-column"><h3>${title}</h3>${nodes.map((n) => `<div class="family-node">${esc(n.animal?.name ?? '기록 없음')}<br>${esc(n.id)}<br>${n.animal ? `${n.animal.grade}등급` : ''}</div>`).join('') || '<div class="family-node">기록이 없어요</div>'}</div>`).join('')}</div>`;
  }
  processingContent() {
    const s = this.engine.state;
    if (this.tab === 'jobs')
      return `<div class="grid">${s.jobs
        .map((j) => {
          const r = recipeById[j.recipe];
          return `<div class="card"><strong>${j.shipment ? '출하 생산물' : r.name}</strong><small>${j.days ? `${j.days}일 남음` : '생산 완료'} · ${buildingById[s.buildings.find((b) => b.id === j.building)?.type ?? 'processor'].name}<br>${j.automatic ? '재료가 있는 동안 반복 생산' : '수동 생산'}</small>${btn(`collect-job:${j.id}`, '완료품 수거', 'primary', j.days ? 'disabled' : '')}</div>`;
        })
        .join('')}</div>${s.jobs.length ? '' : empty('진행 중인 작업이 없어요.')}`;
    return `<div class="grid">${recipes
      .filter((r) =>
        this.tab === 'cooking' ? r.category === 'cooking' : r.category === 'processed',
      )
      .map((r) => {
        const locked = !s.skills.includes(r.skill);
        return `<div class="card ${locked ? 'locked' : ''}"><strong>${r.name}</strong><div class="recipe">${Object.entries(
          r.inputs,
        )
          .map(([id, n]) => `${itemName(id)} ${itemCount(s, id)}/${n}`)
          .join(
            ' + ',
          )}</div><small>${r.days}일 · ${buildingById[r.facility].name}<br>판매 기본가 ${money(r.price)} · ${locked ? '기술 연구 필요' : '연구 완료'}</small>${btn(`process:${r.id}`, '생산 시작', 'primary', locked ? 'disabled' : '')}${s.skills.includes('auto-farm') ? btn(`auto-process:${r.id}`, '반복 생산') : ''}</div>`;
      })
      .join('')}</div>`;
  }
  houseContent() {
    const s = this.engine.state,
      d = B.house[s.houseLevel],
      house = s.buildings.find((b) => b.type === 'house');
    return `<div class="detail"><div class="portrait">${this.pixel('building-house')}</div><div><h3>${esc(s.name)} · 집 Lv.${s.houseLevel}</h3><div class="stats">${stat('소유 토지', Object.keys(s.tiles).length)}${stat('토지 한도', B.house[s.houseLevel - 1].cap)}${stat('월 운영비', `${B.house[s.houseLevel - 1].fee * 100}%`)}</div>${d ? `<p class="small">다음 단계: Lv.${s.houseLevel + 1} · 토지 한도 ${d.cap}칸<br>농사 Lv.${d.farm} / 목축 Lv.${d.animal} 필요<br>집은 업그레이드 후에도 2×2칸입니다.</p>${btn('upgrade-house', `${money(d.cost)} · 업그레이드`, 'primary')}` : note('최고 단계의 집이에요. 농장의 이야기는 계속됩니다.')}<div class="row" style="margin-top:12px">${btn('sleep', '오늘 마치기')}${house ? btn(`move:${house.id}`, '집 이동') : ''}</div></div></div>`;
  }
  manageContent() {
    const s = this.engine.state,
      plots = Object.values(s.tiles).filter((t) => t.plot),
      ready = plots.filter((t) => t.plot && this.engine.ready(t.plot));
    const pregnant = s.animals.filter((a) => a.pregnant),
      productsReady = s.animals.filter((a) => a.products),
      risk = s.inventory.filter((i) => i.freshness < 50),
      jobs = s.jobs.filter((j) => !j.days),
      issues = s.animals.filter((a) => !a.fed || !a.clean);
    if (this.tab === 'actions')
      return `<div class="grid two">${btn('water-all', '모든 밭 물주기')}${btn('harvest-all', '다중 수확')}${btn('bulk-plant', '선택 씨앗 대량 파종')}${btn('care-all', '모든 동물 급식 / 청소')}${btn('collect-all', '생산품 일괄 수거')}${btn('collect-jobs', '완성된 가공품 수거')}${btn('processing', '가공 / 요리')}${btn('blueprint', '설계도')}</div><div class="divider"></div><select id="bulk-seed" class="search" aria-label="대량 파종 씨앗">${crops
        .filter((c) => itemCount(s, `seed:${c.id}`) > 0)
        .map((c) => `<option value="${c.id}">${c.name} (${itemCount(s, `seed:${c.id}`)})</option>`)
        .join('')}</select>`;
    return `<div class="stats">${stat('작물', plots.filter((t) => t.plot?.crop).length)}${stat('동물', s.animals.length)}${stat('토지', Object.keys(s.tiles).length)}${stat('집 레벨', s.houseLevel)}</div><div class="grid">${[
      ['작물 수확 가능', ready.length, 'focus-ready'],
      ['임신 동물', pregnant.length, 'focus-pregnant'],
      ['축산물 수거 가능', productsReady.length, 'focus-products'],
      ['신선도 위험 품목', risk.length, 'storage'],
      ['가공 완료', jobs.length, 'focus-jobs'],
      ['돌봄이 필요한 동물', issues.length, 'focus-issues'],
    ]
      .map(
        ([n, c, a]) =>
          `<div class="card"><strong>${n}</strong><div class="stat"><strong>${c}</strong></div>${btn(String(a), '바로 살펴보기')}</div>`,
      )
      .join(
        '',
      )}</div><div class="divider"></div>${s.debt ? `${note(`미납 운영비 ${money(s.debt)} · 토지 구매, 집 업그레이드, 고급 연구가 제한됩니다. 이자는 없어요.`)}${btn('pay-debt', '보유금에서 납부', 'primary')}` : note('미납 운영비가 없어요. 오늘도 편안하게 가꾸세요.')}<div class="row">${btn('finance', '재정 통계')}${btn('house', '집 업그레이드')}${btn('storage', '창고')}${btn('processing', '가공 / 요리')}</div>`;
  }
  bookContent() {
    const s = this.engine.state;
    const list =
      this.tab === 'crops'
        ? crops.map((c) => ({
            id: c.id,
            name: c.name,
            info: `${seasonNames[c.season]} · ${c.growDays}일 · ${money(c.baseSellPrice)}<br>가공 용도: ${c.processingUses.map((id) => recipeById[id]?.name ?? id).join(', ')}`,
            texture: `${c.spriteKey}-3`,
          }))
        : this.tab === 'animals'
          ? animals.map((a) => ({
              id: a.id,
              name: a.name,
              info: `${itemName(a.product)} 생산 · 목축 Lv.${a.unlockLevel}<br>브리딩 ${s.animals.filter((x) => x.species === a.id).reduce((n, x) => n + x.births, 0)}회 · 발견 특성 ${[...new Set(s.animals.filter((x) => x.species === a.id).flatMap((x) => x.traits))].map(esc).join(' · ') || '—'}`,
              texture: `animal-${a.id}`,
            }))
          : this.tab === 'buildings'
            ? buildings.map((b) => ({
                id: b.id,
                name: b.name,
                info: `${b.width}×${b.height} · ${money(b.price)}`,
                texture: `building-${b.id}`,
              }))
            : recipes
                .filter((r) => r.category === this.tab)
                .map((r) => ({
                  id: r.output,
                  name: r.name,
                  info: `${r.days}일 가공 · ${money(r.price)}`,
                  texture: '',
                }));
    return `<div class="grid four">${list.map((d) => `<div class="card"><div class="icon-line">${d.texture ? this.pixel(d.texture) : icon('book')}<strong>${d.name}</strong></div><small>${d.info}<br>누적 발견 / 수확 ${s.discoveries[d.id]?.count ?? 0}<br>최고 판매가 ${money(s.discoveries[d.id]?.best ?? 0)}</small></div>`).join('')}</div>`;
  }
  ledgerContent(l: Ledger, monthly: boolean) {
    const s = this.engine.state,
      fee = monthly ? (s.lastMonthly?.fee ?? 0) : 0;
    const sold = Object.entries(l.sold).sort((a, b) => b[1].revenue - a[1].revenue),
      most = [...sold].sort((a, b) => b[1].quantity - a[1].quantity)[0];
    return `<div class="stats">${stat(monthly ? '월 매출' : '오늘 수익', money(l.sales))}${stat('지출', money(l.expenses))}${stat(monthly ? '운영비' : '농사 경험치', monthly ? money(fee) : l.farmXp)}${stat('순이익', money(l.sales - l.expenses - fee))}</div><div class="grid two"><div class="card"><strong>판매 기록</strong>${sold.map(([id, v]) => `<div class="card-row"><small>${itemName(id)} ×${v.quantity}</small><span class="small">${money(v.revenue)}</span></div>`).join('') || '<small>오늘은 판매가 없었어요.</small>'}</div><div class="card"><strong>농장의 성장</strong><small>농사 경험치 +${l.farmXp} · 목축 경험치 +${l.animalXp}<br>출산 ${l.births}회 · 시설 ${l.facilities}개 · 토지 +${l.land}칸<br>새 발견 ${l.discoveries.map(itemName).join(' · ') || '—'}${monthly ? `<br>최다 판매: ${most ? itemName(most[0]) : '—'}<br>최고 수익: ${sold[0] ? itemName(sold[0][0]) : '—'}<br>농장 가치 변화: ${money(s.lastMonthly?.valueChange ?? 0)}` : ''}</small></div></div><div class="row" style="margin-top:18px">${btn('close', '다음 날 가꾸기', 'primary')}${l.births ? btn('birthresult', '출산 결과') : ''}${monthly ? btn('finance', '재정 통계') : btn('skip-summary', '정산 건너뛰기')}</div>`;
  }
  financeContent() {
    const s = this.engine.state,
      h = s.history.slice(-20),
      max = Math.max(1, ...h.map((d) => d.sales));
    return `<div class="stats">${stat('보유금', money(s.gold))}${stat('이번 달 매출', money(s.monthly.sales))}${stat('이번 달 지출', money(s.monthly.expenses))}${stat('미납 운영비', money(s.debt))}</div><h3>최근 20일 매출</h3><div class="finance-chart">${h.map((d) => `<div class="bar" style="height:${Math.max(2, (d.sales / max) * 100)}%" title="${d.day}일 · ${money(d.sales)}"><span>${d.day}</span></div>`).join('')}</div><div style="height:15px"></div>${
      h
        .slice()
        .reverse()
        .map(
          (d) =>
            `<div class="list-row"><span class="small">${d.day}일</span><span class="small">매출 ${money(d.sales)} · 지출 ${money(d.expenses)} · 운영비 ${money(d.fees)}</span></div>`,
        )
        .join('') || empty('첫날부터 차곡차곡 기록을 쌓아가요.')
    }`;
  }
  change(t: HTMLInputElement) {
    const setting = t.dataset.setting as keyof Settings | undefined;
    if (setting) {
      const val = t.type === 'checkbox' ? t.checked : Number(t.value);
      (this.engine.state.settings as unknown as Record<string, number | boolean>)[setting] = val;
      const next = t.nextElementSibling;
      if (next) next.textContent = String(val);
      this.root.style.setProperty('--ui-scale', String(this.engine.state.settings.uiSize));
      this.game.loop.sleep();
      this.game.loop.fpsLimit = this.engine.state.settings.fps;
      this.game.loop.hasFpsLimit = true;
      (this.game.loop as unknown as { _limitRate: number })._limitRate =
        1000 / this.engine.state.settings.fps;
      this.game.loop.wake();
      void this.save(false);
      return;
    }
    if (t.id === 'female') {
      this.female = t.value;
      this.renderPanel();
    }
    if (t.id === 'male') {
      this.male = t.value;
      this.renderPanel();
    }
    if (t.id === 'storage-select') {
      this.storage = t.value;
      this.panel = t.value === 'bag' ? 'inventory' : 'storage';
      this.renderPanel();
    }
  }
  async save(show = true) {
    try {
      await this.saves.save(this.slot, this.engine.state);
      this.slots = await this.saves.list();
      if (show) this.toast(`슬롯 ${this.slot}에 저장했어요.`);
      return true;
    } catch {
      this.toast('저장에 실패했어요. 브라우저 저장 공간을 확인해 주세요.');
      return false;
    }
  }
  async action(action: string, el: HTMLElement) {
    const [a, id, param] = action.split(':');
    const s = this.engine.state,
      e = this.engine;
    switch (a) {
      case 'new':
      case 'continue':
        this.slots = await this.saves.list();
        this.open(a);
        return;
      case 'start': {
        const name =
          this.root.querySelector<HTMLInputElement>('#farm-name')?.value.trim() || '나의 작은 농장';
        this.start(createState(name), Number(id));
        return;
      }
      case 'load': {
        try {
          const state = await this.saves.load(Number(id));
          if (state) this.start(state, Number(id));
        } catch (err) {
          this.toast((err as Error).message);
        }
        return;
      }
      case 'close':
      case 'skip-summary':
        this.close();
        return;
      case 'menu':
        if (await this.save(false)) {
          this.finishBuild();
          this.renderMenu();
        }
        return;
      case 'tool':
        this.tool = id;
        this.renderHUD();
        return;
      case 'context':
        this.contextAction();
        return;
      case 'tutorial': {
        const step = s.tutorial;
        if (step === 0) this.beginPlace('house');
        if (step === 4) this.beginPlace('chest');
        if (step === 5) this.open('house');
        if (step === 7) this.open('merchant');
        if (step === 8) {
          this.tab = 'land';
          this.scene.buildMode = true;
          this.engine.paused = true;
          this.close();
          this.tab = 'land';
          this.renderMode();
        }
        if ([1, 2, 3, 6].includes(step)) {
          this.tool = ({ 1: 'hoe', 2: 'seed', 3: 'water', 6: 'harvest' } as Record<number, string>)[
            step
          ];
          this.renderHUD();
        }
        return;
      }
      case 'tab':
        this.tab = id;
        this.renderPanel();
        return;
      case 'build':
        if (id) {
          this.beginPlace(id);
          return;
        }
        this.open('build');
        return;
      case 'place': {
        if (!this.selected || !this.scene.placing) return;
        const { x, y } = this.selected,
          p = this.scene.placing;
        const success = this.moving.length
          ? e.move(this.moving, x, y, p.rotation)
          : e.place(p.type, x, y, p.rotation);
        if (success) {
          this.scene.cancelPreview();
          this.moving = [];
          this.scene.buildMode = false;
          this.engine.paused = false;
          this.renderHUD();
          this.scene.refresh();
          if (s.tutorial === 5) this.toast('상자를 설치했어요. 집에서 오늘을 마무리해 보세요.');
        }
        return;
      }
      case 'preview-rotate':
        if (this.scene.placing) {
          this.scene.placing.rotation = !this.scene.placing.rotation;
          if (this.selected) this.scene.drawPreview(this.selected.x, this.selected.y);
        }
        return;
      case 'build-exit':
        this.finishBuild();
        return;
      case 'land-mode':
        this.close();
        this.tab = 'land';
        this.scene.cancelPreview();
        this.scene.buildMode = true;
        this.engine.paused = true;
        this.renderMode();
        return;
      case 'layout-mode':
        this.close();
        this.tab = 'layout';
        this.scene.buildMode = true;
        this.engine.paused = true;
        this.renderMode();
        return;
      case 'move': {
        this.selectedBuilding = id;
        const b = s.buildings.find((b) => b.id === id);
        if (b) this.beginPlace(b.type, [id]);
        return;
      }
      case 'rotate':
        e.rotate(id);
        break;
      case 'demolish':
        e.demolish(id);
        this.close();
        this.renderContext();
        return;
      case 'multi-build':
        this.multi = !this.multi;
        this.moving = [];
        this.renderMode();
        return;
      case 'move-group': {
        const b = s.buildings.find((b) => b.id === this.moving[0]);
        if (b) this.beginPlace(b.type, this.moving.slice());
        return;
      }
      case 'multi-plots':
        this.multi = !this.multi;
        this.selectedKeys.clear();
        this.scene.selection = [];
        this.close();
        this.renderMode();
        this.toast('함께 관리할 농지를 눌러 선택한 뒤 관리 버튼을 누르세요.');
        return;
      case 'plant':
        if (this.selected && e.plant(this.selected.x, this.selected.y, id)) {
          this.close();
          this.renderContext();
        }
        return;
      case 'till-selected':
        if (this.selected) e.till(this.selected.x, this.selected.y);
        break;
      case 'water-selected':
        if (this.selected) e.water(this.selected.x, this.selected.y);
        break;
      case 'harvest-selected':
        if (this.selected) e.harvest(this.selected.x, this.selected.y);
        break;
      case 'clear-plot':
        if (this.selected) e.clearPlot(this.selected.x, this.selected.y);
        break;
      case 'upgrade-plot':
        if (this.selected)
          e.upgradePlot(
            this.selectedKeys.size
              ? [...this.selectedKeys]
              : [key(this.selected.x, this.selected.y)],
            id as 'irrigation',
          );
        break;
      case 'sell':
        e.sell(Number(id));
        break;
      case 'sell-all':
        for (let n = s.inventory.length - 1; n >= 0; n--) e.sell(n);
        break;
      case 'buy-seed':
        e.buySeed(id);
        break;
      case 'buy-good':
        e.buyItem(id, products[id].price, id === 'wheat' ? 'crop' : 'other', 10);
        break;
      case 'buy-animal':
        e.buyAnimal(id, param as 'F' | 'M');
        break;
      case 'research':
        e.research(id);
        break;
      case 'upgrade-house':
        e.upgradeHouse();
        break;
      case 'animal':
        this.animalId = id;
        this.open('animal');
        return;
      case 'feed':
        e.feed(id);
        break;
      case 'clean':
        e.clean(id);
        break;
      case 'collect':
        e.collect(id);
        break;
      case 'care-all':
        s.animals.forEach((a) => {
          e.feed(a.id);
          e.clean(a.id);
        });
        break;
      case 'collect-all':
        s.animals.forEach((a) => e.collect(a.id));
        break;
      case 'rename-animal': {
        const animal = s.animals.find((a) => a.id === this.animalId);
        if (animal) {
          animal.name =
            this.root.querySelector<HTMLInputElement>('#animal-name')!.value.trim() ||
            animalById[animal.species].name;
          animal.lineage = this.root.querySelector<HTMLInputElement>('#lineage-name')!.value.trim();
          e.changed(true);
        }
        break;
      }
      case 'sell-animal':
        if (e.sellAnimal(id)) this.open('animals');
        return;
      case 'ship-animal':
        if (e.shipAnimal(id)) this.open('processing', 'jobs');
        else this.toast('육가공 기술, 빈 육가공소, 임신하지 않은 동물이 필요해요.');
        return;
      case 'upgrade-barn':
        e.upgradeBarn(id, param as 'feed');
        break;
      case 'breed':
        if (e.breed(this.female, this.male)) this.open('breedresult');
        return;
      case 'process':
        e.process(id);
        break;
      case 'auto-process':
        e.process(id, undefined, true);
        break;
      case 'collect-job':
        e.collectJob(id);
        break;
      case 'collect-jobs':
        s.jobs.slice().forEach((j) => e.collectJob(j.id));
        break;
      case 'discard':
        e.discard(Number(id));
        break;
      case 'compost':
        e.discard(Number(id), true);
        break;
      case 'favorite':
        s.inventory[Number(id)].favorite = !s.inventory[Number(id)].favorite;
        break;
      case 'favorites':
        this.favorites = !this.favorites;
        break;
      case 'sort':
        s.inventory.sort(
          (a, b) =>
            Number(b.favorite) - Number(a.favorite) ||
            a.type.localeCompare(b.type) ||
            itemName(a.id).localeCompare(itemName(b.id)) ||
            a.freshness - b.freshness,
        );
        break;
      case 'transfer': {
        const target = this.root.querySelector<HTMLSelectElement>('#transfer-target')?.value;
        if (target) e.transfer(Number(id), target);
        break;
      }
      case 'transfer-all': {
        const target = this.root.querySelector<HTMLSelectElement>('#transfer-target')?.value,
          source = this.panel === 'storage' ? this.storage : 'bag';
        if (target)
          for (let n = s.inventory.length - 1; n >= 0; n--)
            if (s.inventory[n].storage === source) e.transfer(n, target);
        break;
      }
      case 'pay-debt':
        e.payDebt();
        break;
      case 'sleep':
        this.close();
        this.finishBuild();
        e.endDay();
        return;
      case 'water-all':
        if (!s.skills.includes('bulk')) {
          this.toast('대량 파종 기술을 먼저 연구해 주세요.');
          return;
        }
        Object.values(s.tiles).forEach((t) => {
          if (t.plot) e.water(t.x, t.y);
        });
        break;
      case 'harvest-all':
        if (!s.skills.includes('bulk')) {
          this.toast('대량 파종 기술을 먼저 연구해 주세요.');
          return;
        }
        Object.values(s.tiles).forEach((t) => e.harvest(t.x, t.y));
        break;
      case 'bulk-plant':
        if (!s.skills.includes('bulk')) {
          this.toast('대량 파종 기술을 먼저 연구해 주세요.');
          return;
        }
        const seed = this.root.querySelector<HTMLSelectElement>('#bulk-seed')?.value;
        if (seed)
          Object.values(s.tiles).forEach((t) => {
            if (t.plot && !t.plot.crop) e.plant(t.x, t.y, seed);
          });
        break;
      case 'blueprint-save':
        s.blueprints.push({
          name: this.root.querySelector<HTMLInputElement>('#blueprint-name')?.value || '농장 배치',
          buildings: structuredClone(s.buildings),
        });
        e.changed(true);
        break;
      case 'blueprint-load':
        e.applyBlueprint(Number(id));
        break;
      case 'blueprint-delete':
        s.blueprints.splice(Number(id), 1);
        break;
      case 'save':
        this.slot = Number(id);
        await this.save();
        break;
      case 'export-save': {
        const blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' }),
          url = URL.createObjectURL(blob),
          a = document.createElement('a');
        a.href = url;
        a.download = `farm-save-day${s.day}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      case 'settings-reset':
        s.settings = { ...B.defaults };
        break;
      case 'fullscreen':
        try {
          if (document.fullscreenElement) await document.exitFullscreen();
          else await document.querySelector('#app')!.requestFullscreen();
        } catch {
          this.toast('이 브라우저에서는 전체화면 전환이 제한되어 있어요.');
        }
        return;
      case 'focus-animal': {
        const a = s.animals.find((a) => a.id === id),
          b = s.buildings.find((b) => b.id === a?.building);
        if (b) {
          this.close();
          this.scene.focus(b.x, b.y);
        }
        return;
      }
      case 'focus-ready': {
        const t = Object.values(s.tiles).find((t) => t.plot && e.ready(t.plot));
        if (t) {
          this.close();
          this.scene.focus(t.x, t.y);
          this.selected = { x: t.x, y: t.y };
          this.renderContext();
        } else this.toast('지금 수확 가능한 작물이 없어요.');
        return;
      }
      case 'focus-pregnant':
      case 'focus-products':
      case 'focus-issues': {
        const a = s.animals.find((a) =>
            action === 'focus-pregnant'
              ? !!a.pregnant
              : action === 'focus-products'
                ? !!a.products
                : !a.fed || !a.clean,
          ),
          b = s.buildings.find((b) => b.id === a?.building);
        if (b) {
          this.close();
          this.scene.focus(b.x, b.y);
        } else this.toast('해당 항목이 없어요.');
        return;
      }
      case 'focus-jobs': {
        const j = s.jobs.find((j) => !j.days),
          b = s.buildings.find((b) => b.id === j?.building);
        if (b) {
          this.close();
          this.scene.focus(b.x, b.y);
        } else this.toast('완료된 작업이 없어요.');
        return;
      }
      default:
        this.open(a);
        return;
    }
    if (this.panel) this.renderPanel();
    e.changed();
    this.renderContext();
  }
  toast(message: string) {
    const host = this.root.querySelector('#toast-host');
    if (!host) return;
    if (this.toastTimer) clearTimeout(this.toastTimer);
    host.innerHTML = `<div class="toast-global">${esc(message)}</div>`;
    this.toastTimer = setTimeout(() => (host.innerHTML = ''), 4500);
    this.notificationSystem.push(message);
    this.notices = this.notificationSystem.current();
    const stack = this.root.querySelector('#notice-stack');
    if (stack) {
      stack.innerHTML = this.notices.map((m) => `<div class="notice">${esc(m)}</div>`).join('');
      setTimeout(() => {
        stack.innerHTML = '';
      }, 5000);
    }
  }
  background() {
    this.previousPause = this.engine.paused;
    this.engine.paused = true;
    if (!this.menu && this.engine.state.settings.autosave) void this.save(false);
  }
  foreground() {
    this.engine.paused = this.previousPause || this.menu || !!this.panel || this.scene.buildMode;
  }
}
