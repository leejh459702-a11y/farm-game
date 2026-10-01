import { productionYield, maturityDays } from '../entities/AnimalTraits';
import { BalanceConfig as B } from '../data/balance';
import { cropById, crops } from '../data/crops';
import { buildingById } from '../data/buildings';
import { animalById } from '../data/animals';
import { recipeById } from '../data/recipes';
import { skills } from '../data/skills';
import { calendar } from '../data/seasons';
import { key, ledger, level, random } from './state';
import {
  adjacent,
  buildingAt,
  canPlace,
  canBuyLand,
  landPrice,
  canMoveGroup,
  footprint,
} from '../systems/FarmGridSystem';
import {
  addItem,
  storedAdd,
  consume,
  itemCount,
  canAdd,
  decayInventory,
  transfer,
} from '../systems/InventorySystem';
import { rollGrade, inheritTraits } from '../systems/BreedingSystem';
import { salePrice, operatingFee, itemName, farmValue } from '../services/EconomyService';
import type { GameState, Animal, Plot, Item, Building } from '../types';
export class GameEngine {
  paused = true;
  revision = 0;
  onChange = () => {};
  onNotice = (message: string) => {};
  onSave = () => {};
  onDay = () => {};
  constructor(public state: GameState) {}
  changed(save = false) {
    this.revision++;
    this.onChange();
    if (save) this.onSave();
  }
  notice(message: string) {
    this.onNotice(message);
  }
  rng = () => random(this.state);
  pay(amount: number) {
    if (this.state.gold < amount) {
      this.notice('보유금이 부족해요.');
      return false;
    }
    this.state.gold -= amount;
    this.state.daily.expenses += amount;
    this.state.monthly.expenses += amount;
    return true;
  }
  earn(amount: number, id: string, quantity: number) {
    const s = this.state;
    s.gold += amount;
    for (const l of [s.daily, s.monthly]) {
      l.sales += amount;
      l.sold[id] ??= { quantity: 0, revenue: 0 };
      l.sold[id].quantity += quantity;
      l.sold[id].revenue += amount;
    }
  }
  xp(branch: 'farm' | 'animal', amount: number) {
    const s = this.state;
    const field = branch === 'farm' ? 'farmXp' : 'animalXp';
    const before = level(s[field]);
    s[field] += amount;
    s.daily[field] += amount;
    s.monthly[field] += amount;
    if (level(s[field]) > before)
      this.notice(`${branch === 'farm' ? '농사' : '목축'} Lv.${level(s[field])}이 되었어요!`);
  }
  discover(id: string, quantity: number, best = 0) {
    const s = this.state;
    if (!s.discoveries[id]) {
      s.discoveries[id] = { count: 0, best: 0 };
      s.daily.discoveries.push(id);
      s.monthly.discoveries.push(id);
    }
    s.discoveries[id].count += quantity;
    s.discoveries[id].best = Math.max(best, s.discoveries[id].best);
  }
  place(type: string, x: number, y: number, rotation = false) {
    const s = this.state,
      b = buildingById[type];
    if (!b || !canPlace(s, type, x, y, rotation)) {
      this.notice('소유한 빈 땅에 맞춰 배치해 주세요.');
      return false;
    }
    if (b.skill && !s.skills.includes(b.skill)) {
      this.notice('먼저 해당 기술을 연구해 주세요.');
      return false;
    }
    if (type === 'house' && s.buildings.some((b) => b.type === 'house')) return false;
    const free = (type === 'house' && s.tutorial === 0) || (type === 'chest' && s.tutorial === 4);
    if (!free && !this.pay(b.price)) return false;
    s.buildings.push({
      id: `B-${s.nextId++}`,
      type,
      x,
      y,
      rotation,
      upgrades: { feed: false, clean: false, collect: false, processing: false },
    });
    if (s.tutorial === 0 && type === 'house') s.tutorial = 1;
    if (s.tutorial === 4 && type === 'chest') s.tutorial = 5;
    s.daily.facilities++;
    s.monthly.facilities++;
    this.changed(true);
    return true;
  }
  move(ids: string[], x: number, y: number, rotation?: boolean) {
    const s = this.state,
      group = s.buildings.filter((b) => ids.includes(b.id));
    if (!group.length) return false;
    const dx = x - group[0].x,
      dy = y - group[0].y;
    const carried = group
      .filter((b) => b.type === 'greenhouse')
      .flatMap((b) =>
        footprint(b.type, b.x, b.y, b.rotation)
          .filter((k) => s.tiles[k]?.plot)
          .map((k) => ({ key: k, plot: s.tiles[k].plot!, tile: s.tiles[k] })),
      );
    const tiles = { ...s.tiles };
    for (const c of carried) tiles[c.key] = { ...tiles[c.key], plot: undefined };
    const candidates = group.map((b) => ({
      ...b,
      rotation: group.length === 1 && rotation !== undefined ? rotation : b.rotation,
    }));
    if (!canMoveGroup({ ...s, tiles }, candidates, dx, dy)) {
      this.notice('선택 시설이 모두 소유한 빈 땅에 들어가야 해요.');
      return false;
    }
    for (const c of carried) delete s.tiles[c.key].plot;
    group.forEach((b, i) => {
      b.x += dx;
      b.y += dy;
      b.rotation = candidates[i].rotation;
    });
    for (const c of carried) s.tiles[key(c.tile.x + dx, c.tile.y + dy)].plot = c.plot;
    this.changed(true);
    return true;
  }
  rotate(id: string) {
    const b = this.state.buildings.find((b) => b.id === id);
    if (!b || !canPlace(this.state, b.type, b.x, b.y, !b.rotation, [id])) {
      this.notice('회전할 공간이 부족해요.');
      return false;
    }
    b.rotation = !b.rotation;
    this.changed(true);
    return true;
  }
  demolish(id: string) {
    const s = this.state,
      b = s.buildings.find((b) => b.id === id);
    if (!b || b.type === 'house') return false;
    if (
      s.animals.some((a) => a.building === id) ||
      s.inventory.some((i) => i.storage === id) ||
      s.jobs.some((j) => j.building === id) ||
      footprint(b.type, b.x, b.y, b.rotation).some((k) => s.tiles[k]?.plot)
    ) {
      this.notice('동물·재고·작업·농지를 먼저 옮겨 주세요.');
      return false;
    }
    s.buildings = s.buildings.filter((b) => b.id !== id);
    this.changed(true);
    return true;
  }
  buyLand(x: number, y: number) {
    const s = this.state;
    if (!canBuyLand(s, x, y)) {
      this.notice(
        s.debt
          ? '미납 운영비를 납부해 주세요.'
          : !adjacent(s, x, y)
            ? '상하좌우로 붙은 토지만 구입할 수 있어요.'
            : Object.keys(s.tiles).length >= B.house[s.houseLevel - 1].cap
              ? '집을 업그레이드해 토지 한도를 늘려 주세요.'
              : '보유금이 부족해요.',
      );
      return false;
    }
    this.pay(landPrice(s));
    s.tiles[key(x, y)] = { x, y };
    s.landBought[s.houseLevel - 1]++;
    s.daily.land++;
    s.monthly.land++;
    if (s.tutorial === 8) {
      s.tutorial = 9;
      this.notice('첫 확장 완료! 이제 나만의 농장을 가꾸세요.');
    }
    this.changed(true);
    return true;
  }
  till(x: number, y: number) {
    const s = this.state,
      t = s.tiles[key(x, y)],
      b = buildingAt(s, x, y);
    if (!t || t.plot || (b && b.type !== 'greenhouse')) {
      this.notice('소유한 빈 땅을 골라 주세요.');
      return false;
    }
    t.plot = {
      growth: 0,
      watered: s.weather === 'rain' || s.weather === 'storm',
      irrigation: 0,
      soil: 0,
      fertilizer: 0,
      pest: 0,
      autoHarvest: false,
      greenhouse: b?.type === 'greenhouse',
    };
    if (s.tutorial === 1) s.tutorial = 2;
    this.changed();
    return true;
  }
  plant(x: number, y: number, id: string) {
    const s = this.state,
      p = s.tiles[key(x, y)]?.plot,
      c = cropById[id];
    if (!p || p.crop || !c || level(s.farmXp) < c.unlockLevel) return false;
    if (c.id === 'goldberry' && !s.skills.includes('rare-crop')) return false;
    if (['apple', 'pear'].includes(c.id) && !s.skills.includes('orchard')) return false;
    if (!consume(s, `seed:${id}`, 1)) {
      this.notice('씨앗이 부족해요. 방문상인에게 구입하세요.');
      return false;
    }
    p.crop = id;
    p.growth = 0;
    if (s.tutorial === 2) s.tutorial = 3;
    this.changed();
    return true;
  }
  water(x: number, y: number) {
    const p = this.state.tiles[key(x, y)]?.plot;
    if (!p) return false;
    p.watered = true;
    if (this.state.tutorial === 3) this.state.tutorial = 4;
    this.changed();
    return true;
  }
  ready(p: Plot) {
    return !!p.crop && p.growth >= cropById[p.crop].growDays;
  }
  harvest(x: number, y: number, automatic = false) {
    const s = this.state,
      p = s.tiles[key(x, y)]?.plot;
    if (!p || !p.crop || !this.ready(p)) return false;
    const c = cropById[p.crop],
      quantity = c.yield + Math.floor(p.soil / 2);
    if (!(automatic ? storedAdd(s, c.id, 'crop', quantity) : addItem(s, c.id, 'crop', quantity))) {
      if (!automatic) this.notice('가방이 가득 찼어요. 창고에 옮겨 주세요.');
      return false;
    }
    this.xp('farm', B.xpHarvest);
    this.discover(c.id, quantity);
    if (c.regrowDays) p.growth = c.growDays - c.regrowDays;
    else {
      p.crop = undefined;
      p.growth = 0;
    }
    if (s.tutorial === 6) {
      s.tutorial = 7;
      s.merchant.present = true;
      s.merchant.special = false;
      s.merchant.buyBonus = 0;
      this.notice('첫 수확을 축하해요! 방문상인이 도착했어요.');
    }
    this.changed();
    return true;
  }
  upgradePlot(
    keys: string[],
    upgrade: 'irrigation' | 'soil' | 'fertilizer' | 'pest' | 'autoHarvest',
  ) {
    const s = this.state;
    const required =
      upgrade === 'irrigation'
        ? 'irrigation'
        : upgrade === 'autoHarvest'
          ? 'auto-harvest'
          : 'fertilizer';
    if (!s.skills.includes(required)) {
      this.notice('스킬트리에서 관련 기술을 먼저 연구해 주세요.');
      return false;
    }
    const plots = keys.map((k) => s.tiles[k]?.plot).filter((p): p is Plot => !!p);
    const eligible = plots.filter((p) =>
      upgrade === 'autoHarvest'
        ? !p.autoHarvest
        : upgrade === 'fertilizer'
          ? p.fertilizer < 1
          : p[upgrade] < 3,
    );
    const cost = B.plotCosts[upgrade] * eligible.length;
    if (!eligible.length || !this.pay(cost)) return false;
    eligible.forEach((p) => {
      if (upgrade === 'autoHarvest') p.autoHarvest = true;
      else p[upgrade]++;
    });
    this.changed();
    return true;
  }
  clearPlot(x: number, y: number) {
    const t = this.state.tiles[key(x, y)];
    if (!t?.plot || t.plot.crop) {
      this.notice('수확한 빈 밭만 정리할 수 있어요.');
      return false;
    }
    delete t.plot;
    this.changed();
    return true;
  }
  sell(index: number, quantity?: number) {
    const s = this.state,
      i = s.inventory[index];
    if (!s.merchant.present) {
      this.notice('상인이 방문한 날에만 판매할 수 있어요.');
      return false;
    }
    if (!i || i.type === 'seed' || i.type === 'other' || i.freshness <= 0) return false;
    const q = Math.min(quantity ?? i.quantity, i.quantity),
      unit = salePrice(s, i);
    if (q <= 0 || unit <= 0) return false;
    this.earn(unit * q, i.id, q);
    this.discover(i.id, 0, unit);
    i.quantity -= q;
    s.inventory = s.inventory.filter((i) => i.quantity > 0);
    if (s.tutorial === 7) {
      s.tutorial = 8;
      this.notice(`${unit * q}G 첫 수익! 건설 → 토지 구매에서 500G로 한 칸을 확장하세요.`);
    }
    this.changed(true);
    return true;
  }
  buyItem(id: string, price: number, type: Item['type'], quantity = 1) {
    const s = this.state;
    if (!s.merchant.present) return false;
    if (!canAdd(s, id)) {
      this.notice('가방이 가득 찼어요.');
      return false;
    }
    const cost = Math.ceil(price * (1 - s.merchant.discount)) * quantity;
    if (!this.pay(cost)) return false;
    addItem(s, id, type, quantity);
    this.changed();
    return true;
  }
  buySeed(id: string, quantity = 1) {
    const c = cropById[id];
    if (!c || level(this.state.farmXp) < c.unlockLevel) return false;
    if (
      id === 'goldberry' &&
      (!this.state.merchant.special || !this.state.skills.includes('rare-crop'))
    )
      return false;
    return this.buyItem(`seed:${id}`, c.seedPrice, 'seed', quantity);
  }
  research(id: string) {
    const s = this.state,
      d = skills.find((k) => k.id === id);
    if (!d || s.skills.includes(id)) return false;
    const own = level(d.branch === 'farm' ? s.farmXp : s.animalXp),
      other = level(d.branch === 'farm' ? s.animalXp : s.farmXp);
    if (own < d.level || other < d.cross || (d.requires && !s.skills.includes(d.requires))) {
      this.notice(
        `필요 레벨: ${d.branch === 'farm' ? '농사' : '목축'} ${d.level}, 상대 분야 ${d.cross}`,
      );
      return false;
    }
    if (s.debt && d.level >= 3) {
      this.notice('운영비를 먼저 납부해 주세요.');
      return false;
    }
    if (!this.pay(d.price)) return false;
    s.skills.push(id);
    this.changed(true);
    return true;
  }
  upgradeHouse() {
    const s = this.state,
      d = B.house[s.houseLevel];
    if (!d) return false;
    if (s.debt || level(s.farmXp) < d.farm || level(s.animalXp) < d.animal) {
      this.notice(
        s.debt
          ? '운영비를 먼저 납부해 주세요.'
          : `농사 Lv.${d.farm} / 목축 Lv.${d.animal}이 필요해요.`,
      );
      return false;
    }
    if (!this.pay(d.cost)) return false;
    s.houseLevel++;
    this.changed(true);
    return true;
  }
  makeAnimal(species: string, sex: 'F' | 'M', building: string, grade: 1 | 2 | 3 = 3): Animal {
    const s = this.state,
      d = animalById[species];
    return {
      id: `${species.toUpperCase()}-${String(s.nextId++).padStart(6, '0')}`,
      name: d.name,
      sex,
      species,
      age: 0,
      grade,
      stage: 'baby',
      production: 40 + (4 - grade) * 15,
      growth: 50,
      health: 100,
      fertility: 60,
      body: 50,
      traits: [],
      parents: [],
      children: [],
      births: 0,
      record: 0,
      lineage: '',
      building,
      fed: false,
      clean: true,
      products: 0,
    };
  }
  buyAnimal(species: string, sex: 'F' | 'M') {
    const s = this.state,
      d = animalById[species];
    if (
      !d ||
      !s.merchant.present ||
      level(s.animalXp) < d.unlockLevel ||
      !s.skills.includes(
        d.rare
          ? 'rare-animal'
          : species === 'goat'
            ? 'sheep'
            : ['goose', 'turkey'].includes(species)
              ? 'duck'
              : species,
      )
    )
      return false;
    if (d.rare && !s.merchant.special) return false;
    const barn = s.buildings.find((b) => b.type === d.building && this.barnSpace(b.id) > 0);
    if (!barn) {
      this.notice('해당 축사에 빈자리가 필요해요. 임신 개체도 한 자리를 예약해요.');
      return false;
    }
    if (!this.pay(Math.ceil(d.price * (1 - s.merchant.discount)))) return false;
    const a = this.makeAnimal(species, sex, barn.id);
    s.animals.push(a);
    this.discover(species, 1);
    this.changed(true);
    return true;
  }
  barnSpace(id: string) {
    return (
      B.animalCapacity -
      this.state.animals
        .filter((a) => a.building === id)
        .reduce((n, a) => n + 1 + (a.pregnant ? 1 : 0), 0)
    );
  }
  feed(id: string) {
    const a = this.state.animals.find((a) => a.id === id);
    if (!a || a.fed) return false;
    if (!consume(this.state, 'feed', 1)) {
      this.notice('기본 사료가 필요해요.');
      return false;
    }
    a.fed = true;
    a.health = Math.min(100, a.health + 5);
    this.xp('animal', 5);
    this.changed();
    return true;
  }
  clean(id: string) {
    const a = this.state.animals.find((a) => a.id === id);
    if (!a || a.clean) return false;
    a.clean = true;
    a.health = Math.min(100, a.health + 5);
    this.xp('animal', 5);
    this.changed();
    return true;
  }
  collect(id: string, automatic = false) {
    const s = this.state,
      a = s.animals.find((a) => a.id === id);
    if (!a || !a.products) return false;
    const d = animalById[a.species];
    if (
      !(automatic
        ? storedAdd(s, d.product, 'animal', a.products)
        : addItem(s, d.product, 'animal', a.products))
    ) {
      if (!automatic) this.notice('가방에 빈 공간이 필요해요.');
      return false;
    }
    this.discover(d.product, a.products);
    a.record += a.products;
    a.products = 0;
    this.xp('animal', B.xpAnimal);
    this.changed();
    return true;
  }
  upgradeBarn(id: string, type: 'feed' | 'clean' | 'collect' | 'processing') {
    const s = this.state,
      b = s.buildings.find((b) => b.id === id);
    const skill =
      type === 'feed'
        ? 'auto-feed'
        : type === 'collect'
          ? 'auto-collect'
          : type === 'processing'
            ? 'auto-farm'
            : 'auto-feed';
    if (!b || b.upgrades[type] || !s.skills.includes(skill)) {
      this.notice('스킬트리에서 자동화 기술을 연구해 주세요.');
      return false;
    }
    if (!this.pay(B.barnUpgrade)) return false;
    b.upgrades[type] = true;
    this.changed();
    return true;
  }
  breed(femaleId: string, maleId: string) {
    const s = this.state,
      f = s.animals.find((a) => a.id === femaleId),
      m = s.animals.find((a) => a.id === maleId);
    if (
      !s.skills.includes('breeding') ||
      !s.buildings.some((b) => ['breeding', 'breedlab'].includes(b.type))
    ) {
      this.notice('브리딩 기술과 브리딩 시설이 필요해요.');
      return false;
    }
    if (
      !f ||
      !m ||
      f.sex !== 'F' ||
      m.sex !== 'M' ||
      f.species !== m.species ||
      f.stage !== 'adult' ||
      m.stage !== 'adult' ||
      f.pregnant
    ) {
      this.notice('같은 종의 성체 암컷과 수컷을 선택하세요.');
      return false;
    }
    if (this.barnSpace(f.building) < 1) {
      this.notice('새끼를 위한 축사 공간이 필요해요.');
      return false;
    }
    if (!this.pay(B.breedingCost)) return false;
    f.pregnant = {
      days: B.gestation,
      father: m.id,
      grade: rollGrade(f.grade, m.grade, this.rng),
      traits: inheritTraits(f.traits, m.traits, this.rng),
    };
    this.xp('animal', B.xpBreed);
    this.changed(true);
    return true;
  }
  sellAnimal(id: string) {
    const s = this.state,
      a = s.animals.find((a) => a.id === id);
    if (!s.merchant.present || !a || a.pregnant) return false;
    const price = Math.floor(
      animalById[a.species].price * B.animalSellFactor * (4 - a.grade) * (1 + s.merchant.buyBonus),
    );
    this.earn(price, a.species, 1);
    s.ancestry.push(structuredClone(a));
    s.animals = s.animals.filter((x) => x.id !== id);
    this.changed(true);
    return true;
  }
  shipAnimal(id: string) {
    const s = this.state,
      a = s.animals.find((a) => a.id === id),
      b = s.buildings.find((b) => b.type === 'meatplant');
    if (
      !a ||
      a.pregnant ||
      !b ||
      !s.skills.includes('meat') ||
      s.jobs.some((j) => j.building === b.id)
    )
      return false;
    s.ancestry.push(structuredClone(a));
    s.animals = s.animals.filter((x) => x.id !== id);
    s.jobs.push({
      id: `J-${s.nextId++}`,
      recipe: 'shipment',
      building: b.id,
      days: B.shipmentDays,
      automatic: false,
      shipment: a.species,
      quantity: B.meatQuantity,
    });
    this.changed(true);
    return true;
  }
  process(id: string, buildingId?: string, automatic = false) {
    const s = this.state,
      r = recipeById[id],
      b = s.buildings.find(
        (b) =>
          b.type === r?.facility &&
          (!buildingId || b.id === buildingId) &&
          !s.jobs.some((j) => j.building === b.id),
      );
    if (
      !r ||
      !b ||
      !s.skills.includes(r.skill) ||
      Object.entries(r.inputs).some(([id, n]) => itemCount(s, id) < n)
    ) {
      this.notice('해금된 레시피, 빈 시설, 신선한 재료가 필요해요.');
      return false;
    }
    for (const [id, n] of Object.entries(r.inputs)) consume(s, id, n);
    s.jobs.push({ id: `J-${s.nextId++}`, recipe: id, building: b.id, days: r.days, automatic });
    this.changed(true);
    return true;
  }
  collectJob(id: string) {
    const s = this.state,
      j = s.jobs.find((j) => j.id === id);
    if (!j || j.days > 0) return false;
    const r = recipeById[j.recipe],
      out = j.shipment ? 'meat' : r.output,
      q = j.quantity ?? r.quantity;
    if (!storedAdd(s, out, j.shipment ? 'animal' : r.category, q)) {
      this.notice('보관 공간이 부족해요.');
      return false;
    }
    this.discover(out, q);
    s.jobs = s.jobs.filter((x) => x.id !== id);
    if (j.automatic && !j.shipment) this.process(j.recipe, j.building, true);
    this.changed(true);
    return true;
  }
  discard(index: number, compost = false) {
    const s = this.state,
      i = s.inventory[index];
    if (!i) return false;
    if (compost) {
      if (
        i.type !== 'crop' ||
        i.freshness > 0 ||
        !s.skills.includes('compost') ||
        !s.buildings.some((b) => b.type === 'compost')
      )
        return false;
      const q = i.quantity;
      s.inventory.splice(index, 1);
      storedAdd(s, 'fertilizer', 'other', q);
    } else s.inventory.splice(index, 1);
    this.changed();
    return true;
  }
  transfer(index: number, target: string) {
    if (!transfer(this.state, index, target)) {
      this.notice('목표 보관함의 슬롯이 부족해요.');
      return false;
    }
    this.changed();
    return true;
  }
  payDebt() {
    const s = this.state;
    const amount = Math.min(s.gold, s.debt);
    s.gold -= amount;
    s.debt -= amount;
    s.daily.expenses += amount;
    s.monthly.expenses += amount;
    this.changed(true);
  }
  applyBlueprint(index: number) {
    const s = this.state,
      p = s.blueprints[index];
    if (
      !p ||
      s.buildings.length !== p.buildings.length ||
      s.buildings.some((b) => !p.buildings.some((c) => c.id === b.id && c.type === b.type))
    ) {
      this.notice('현재 시설 구성이 설계도와 같아야 해요.');
      return false;
    }
    const temp = { ...s, buildings: [] as Building[] };
    for (const b of p.buildings) {
      if (!canPlace(temp, b.type, b.x, b.y, b.rotation)) {
        this.notice('설계도 공간을 비워 주세요.');
        return false;
      }
      temp.buildings.push({ ...b, upgrades: s.buildings.find((c) => c.id === b.id)!.upgrades });
    }
    s.buildings = temp.buildings;
    this.changed(true);
    return true;
  }
  tick(seconds: number) {
    if (this.paused) return;
    this.state.elapsed += Math.min(seconds, 1);
    if (this.state.elapsed >= B.daySeconds) this.endDay();
  }
  endDay() {
    const s = this.state,
      oldSeason = calendar(s.day).season;
    this.onSave();
    for (const t of Object.values(s.tiles)) {
      const p = t.plot;
      if (p?.crop) {
        const c = cropById[p.crop];
        if ((p.greenhouse || c.season === oldSeason) && (p.watered || p.irrigation > 0))
          p.growth = Math.min(c.growDays, p.growth + 1 + p.fertilizer);
        p.fertilizer = 0;
      }
    }
    decayInventory(s);
    for (const a of [...s.animals]) {
      a.age++;
      const d = animalById[a.species],
        b = s.buildings.find((b) => b.id === a.building);
      if (a.age >= maturityDays(a, d.matureDays)) a.stage = 'adult';
      if (a.stage === 'adult' && a.fed && a.clean && a.age % d.interval === 0)
        a.products += productionYield(a, d.product);
      if (a.pregnant && --a.pregnant.days <= 0) {
        const p = a.pregnant,
          child = this.makeAnimal(a.species, this.rng() < 0.5 ? 'F' : 'M', a.building, p.grade);
        child.traits = p.traits;
        child.parents = [a.id, p.father];
        child.lineage = a.lineage;
        const dad =
          s.animals.find((m) => m.id === p.father) ?? s.ancestry.find((m) => m.id === p.father);
        child.production = Math.round((a.production + (dad?.production ?? a.production)) / 2);
        child.growth = Math.round((a.growth + (dad?.growth ?? a.growth)) / 2);
        child.fertility = Math.round((a.fertility + (dad?.fertility ?? a.fertility)) / 2);
        child.body = Math.round((a.body + (dad?.body ?? a.body)) / 2);
        s.animals.push(child);
        a.children.push(child.id);
        dad?.children.push(child.id);
        a.births++;
        a.pregnant = undefined;
        s.daily.births++;
        s.monthly.births++;
        s.birthResults.push({ day: s.day + 1, animalId: child.id });
        this.discover(child.species, 1);
        this.notice(`${a.name}의 새끼가 태어났어요. ${child.grade}등급!`);
      }
      if (b?.upgrades.collect) this.collect(a.id, true);
      a.fed = false;
      a.clean = !!b?.upgrades.clean;
      if (b?.upgrades.feed && consume(s, 'feed', 1)) a.fed = true;
    }
    for (const j of [...s.jobs]) {
      j.days = Math.max(0, j.days - 1);
      if (!j.days && j.automatic) this.collectJob(j.id);
    }
    s.lastDaily = structuredClone(s.daily);
    s.history.push({ day: s.day, sales: s.daily.sales, expenses: s.daily.expenses, fees: 0 });
    if (s.history.length > 120) s.history.shift();
    s.daily = ledger();
    if (s.day % B.daysPerMonth === 0) {
      const fee = operatingFee(s.monthly.sales, s.houseLevel);
      s.lastMonthly = {
        ...structuredClone(s.monthly),
        fee,
        valueChange: farmValue(s) - s.monthStartingValue,
      };
      s.monthStartingValue = farmValue(s);
      const paid = Math.min(s.gold, fee);
      s.gold -= paid;
      s.debt += fee - paid;
      s.history[s.history.length - 1].fees = fee;
      s.monthly = ledger();
      if (s.debt) this.notice('운영비가 일부 미납되었어요. 관리 화면에서 납부할 수 있어요.');
    }
    s.day++;
    s.elapsed = 0;
    const season = calendar(s.day).season,
      r = this.rng();
    s.weather =
      r < 0.55
        ? 'sun'
        : r < 0.75
          ? 'cloud'
          : season === 'winter'
            ? 'snow'
            : season === 'summer' && r > 0.94
              ? 'storm'
              : 'rain';
    for (const t of Object.values(s.tiles)) {
      const p = t.plot;
      if (p) {
        p.watered =
          p.irrigation > 0 || (!p.greenhouse && (s.weather === 'rain' || s.weather === 'storm'));
        if (p.autoHarvest) this.harvest(t.x, t.y, true);
      }
    }
    s.merchant.present = false;
    if (s.day >= s.merchant.nextDay) {
      s.merchant.present = true;
      s.merchant.special =
        this.rng() < Math.min(0.95, B.specialChance + s.merchant.misses * B.specialPity);
      s.merchant.misses = s.merchant.special ? 0 : s.merchant.misses + 1;
      s.merchant.buyBonus = s.merchant.special
        ? B.merchantBonus[0] + this.rng() * (B.merchantBonus[1] - B.merchantBonus[0])
        : 0;
      s.merchant.discount = s.merchant.special
        ? B.merchantDiscount[0] + this.rng() * (B.merchantDiscount[1] - B.merchantDiscount[0])
        : 0;
      s.merchant.nextDay = s.day + 2 + Math.floor(this.rng() * 2);
      this.notice(s.merchant.special ? '특급상인이 방문했어요!' : '방문상인이 도착했어요.');
    }
    if (s.tutorial === 5 && Object.values(s.tiles).some((t) => t.plot && this.ready(t.plot)))
      s.tutorial = 6;
    const ready = Object.values(s.tiles).filter((t) => t.plot && this.ready(t.plot)).length;
    if (ready) this.notice(`${ready}개 작물을 수확할 수 있어요.`);
    const risk = s.inventory.filter(
      (i) => i.freshness < 50 && i.type !== 'seed' && i.type !== 'other',
    ).length;
    if (risk) this.notice(`신선도에 주의할 품목이 ${risk}개 있어요.`);
    const complete = s.jobs.filter((j) => !j.days).length;
    if (complete) this.notice(`${complete}개 가공 작업이 완료되었어요.`);
    this.changed(true);
    this.onDay();
  }
}
