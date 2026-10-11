// 게임 핵심 로직 (화면 그리기와 분리되어 있어 시뮬레이터에서도 그대로 돌아간다)
(function (GS) {
  'use strict';
  const U = GS.util;

  // 배율 스탯은 1.0 기준, 패시브 보너스를 더한다(합연산)
  const STAT_BASE = {
    might: 1, cooldown: 1, area: 1, duration: 1, projSpeed: 1, amount: 0,
    maxHp: 1, regen: 0, armor: 0, moveSpeed: 1, magnet: 1, luck: 1, growth: 1,
  };

  class Game {
    constructor(opts) {
      opts = opts || {};
      this.data = GS.data;
      this.cfg = GS.data.config;
      this.seed = opts.seed != null ? opts.seed : (Math.random() * 2147483647) | 0;
      this.rand = U.mulberry32(this.seed);
      this.viewW = opts.viewW || this.cfg.view.width;
      this.viewH = opts.viewH || this.cfg.view.height;
      this.startWeapon = opts.startWeapon || this.cfg.startWeapons[0];
      this.listeners = {};
      this.init();
    }

    init() {
      const c = this.cfg;
      this.time = 0;
      this.phase = 'playing';           // playing / choice / paused / gameover / ending
      this.chapters = this.data.chapters;
      this.chapterIndex = 0;
      this.chapterTime = 0;
      this.phd = false;
      this.phdTime = 0;
      this.phdYear = 1;
      this.uid = 1;
      this.player = {
        x: 0, y: 0, r: c.player.radius,
        hp: c.player.maxHp, maxHp: c.player.maxHp,
        level: 1, xp: 0, xpNext: 0,
        fx: 1, fy: 0, moving: false,
        slowTimer: 0, slowAmt: 0, buffs: [], invuln: 0, hurt: 0,
      };
      this.player.xpNext = this.xpFor(1);
      this.input = { x: 0, y: 0 };
      this.enemies = [];
      this.bigEnemies = [];
      this.enemyPool = [];
      this.projectiles = [];
      this.enemyShots = [];
      this.gems = [];
      this.items = [];
      this.sanctuaries = [];
      this.effects = [];
      this.texts = [];
      this.weapons = [];
      this.passives = [];
      this.score = 0;
      this.kills = 0;
      this.damageTaken = 0;
      this.pendingLevelUps = 0;
      this.choice = null;
      this.freezeTimer = 0;
      this.jamTimer = 0;
      this.sanctuaryTimer = c.sanctuary.first;
      this.seen = {};
      this.evolutions = [];
      this.bossKills = [];
      this.result = null;
      this.grid = new U.Grid(64);
      this.qbuf = [];
      this.stats = Object.assign({}, STAT_BASE);
      this.spawner = new GS.Spawner(this);
      this.recomputeStats();
      this.addWeapon(this.startWeapon);
      this.spawner.onChapterStart();
    }

    // UI 연결 후 호출: 첫 챕터 배너
    start() {
      const ch = this.chapters[0];
      this.emit('banner', { title: `${ch.name} · ${ch.title}`, sub: ch.intro, kind: 'chapter' });
    }

    on(name, fn) { (this.listeners[name] || (this.listeners[name] = [])).push(fn); }
    emit(name, arg) {
      const l = this.listeners[name];
      if (l) for (let i = 0; i < l.length; i++) l[i](arg);
    }
    toast(text, color) { this.emit('toast', { text, color }); }
    sfx(name) { this.emit('sfx', name); }

    // ───────── 메인 루프 ─────────
    update(dt) {
      if (this.phase !== 'playing') return;
      this.time += dt;
      this.updateChapter(dt);
      if (this.phase !== 'playing') return;
      if (this.freezeTimer > 0) this.freezeTimer -= dt;
      if (this.jamTimer > 0) this.jamTimer -= dt;
      this.updatePlayer(dt);
      this.spawner.update(dt);
      GS.Enemies.update(this, dt);
      this.rebuildGrid();
      GS.Weapons.update(this, dt);
      GS.Enemies.updateShots(this, dt);
      this.updateContact();
      this.updatePickups(dt);
      if (this.phase === 'playing') this.updateSanctuaries(dt);
      this.updateEffects(dt);
      this.compact();
      if (this.player.hp <= 0) {
        this.player.hp = 0;
        this.sfx('dead');
        this.finish('dead');
        return;
      }
      if (this.pendingLevelUps > 0 && this.phase === 'playing') this.openLevelUp();
    }

    // ───────── 챕터(웨이브) / 취업 판정 / 박사 ─────────
    chapterLabel() {
      if (this.phd) return { name: '박사', title: `박사 ${this.phdYear}년차` };
      const ch = this.chapters[this.chapterIndex];
      return { name: ch.name, title: ch.title };
    }

    updateChapter(dt) {
      if (this.phd) {
        this.phdTime += dt;
        const y = 1 + Math.floor(this.phdTime / this.data.phd.yearSeconds);
        if (y !== this.phdYear) {
          this.phdYear = y;
          this.emit('banner', { title: `박사 ${y}년차`, sub: '졸업은… 언제?', kind: 'phd' });
          this.sfx('chapter');
        }
        return;
      }
      this.chapterTime += dt;
      const ch = this.chapters[this.chapterIndex];
      if (this.chapterTime < ch.duration) return;
      if (this.chapterIndex < this.chapters.length - 1) {
        this.chapterTime -= ch.duration;
        this.chapterIndex++;
        this.spawner.onChapterStart();
        const n = this.chapters[this.chapterIndex];
        this.emit('banner', { title: `${n.name} · ${n.title}`, sub: n.intro, kind: 'chapter' });
        this.sfx('chapter');
      } else {
        this.chapterTime = ch.duration;
        this.openJudgment();
      }
    }

    openJudgment() {
      const pass = this.score >= this.cfg.jobScore;
      this.sfx(pass ? 'clear' : 'fail');
      this.openChoice({ type: 'judgment', pass, score: this.score, required: this.cfg.jobScore });
    }

    startPhd(voluntary) {
      this.phd = true;
      this.phdTime = 0;
      this.phdYear = 1;
      this.spawner.onPhdStart();
      this.emit('banner', {
        title: '박사 1년차',
        sub: voluntary ? '스스로 박사 과정에 진학했다… 끝은 없다' : '취업 실패… 박사 과정에 강제 진학. 끝은 없다',
        kind: 'phd',
      });
    }

    finish(type) {
      this.phase = type === 'job' ? 'ending' : 'gameover';
      this.result = this.buildResult(type);
      this.emit(type === 'job' ? 'ending' : 'gameover', this.result);
    }

    pause() { if (this.phase === 'playing') { this.phase = 'paused'; return true; } return false; }
    resume() { if (this.phase === 'paused') this.phase = 'playing'; }

    // ───────── 플레이어 ─────────
    updatePlayer(dt) {
      const pl = this.player, s = this.stats;
      let ix = this.input.x, iy = this.input.y;
      const len = Math.hypot(ix, iy);
      pl.moving = len > 0.01;
      if (pl.moving) { ix /= len; iy /= len; pl.fx = ix; pl.fy = iy; }
      let mult = s.moveSpeed;
      for (let i = pl.buffs.length - 1; i >= 0; i--) {
        const b = pl.buffs[i];
        b.time -= dt;
        if (b.time <= 0) pl.buffs.splice(i, 1);
        else mult += b.speed;
      }
      if (pl.slowTimer > 0) { pl.slowTimer -= dt; mult -= pl.slowAmt; }
      const spd = this.cfg.player.speed * Math.max(0.3, mult);
      if (pl.moving) { pl.x += ix * spd * dt; pl.y += iy * spd * dt; }
      if (s.regen > 0 && pl.hp < pl.maxHp) pl.hp = Math.min(pl.maxHp, pl.hp + s.regen * dt);
      if (pl.invuln > 0) pl.invuln -= dt;
      if (pl.hurt > 0) pl.hurt -= dt;
    }

    recomputeStats() {
      const s = Object.assign({}, STAT_BASE);
      s.regen = this.cfg.player.regen || 0;
      for (let i = 0; i < this.passives.length; i++) {
        const p = this.passives[i];
        s[p.def.stat] += p.def.per * p.level;
      }
      s.cooldown = Math.max(0.4, s.cooldown);
      this.stats = s;
      const pl = this.player;
      const newMax = Math.round(this.cfg.player.maxHp * s.maxHp);
      if (newMax > pl.maxHp) pl.hp += newMax - pl.maxHp;
      pl.maxHp = newMax;
      if (pl.hp > newMax) pl.hp = newMax;
      for (let i = 0; i < this.weapons.length; i++) GS.Weapons.refresh(this, this.weapons[i]);
    }

    heal(v) {
      const pl = this.player, before = pl.hp;
      pl.hp = Math.min(pl.maxHp, pl.hp + v);
      const d = pl.hp - before;
      if (d >= 1) this.addText(pl.x, pl.y - 34, '+' + Math.round(d), '#2f9e44', 18);
    }

    hurtPlayer(dmg) {
      const pl = this.player;
      if (pl.invuln > 0 || this.phase !== 'playing') return;
      const d = Math.max(1, dmg - this.stats.armor);
      pl.hp -= d;
      pl.hurt = 0.2;
      this.damageTaken += d;
      this.sfx('hurt');
    }

    // ───────── 경험치(지식) / 레벨업 / 선택지 ─────────
    xpFor(level) {
      const x = this.cfg.xp, n = level - 1;
      return Math.round(x.base + x.step * n + x.accel * n * n);
    }

    gainXp(v) {
      const pl = this.player;
      pl.xp += v * this.stats.growth;
      while (pl.xp >= pl.xpNext) {
        pl.xp -= pl.xpNext;
        pl.level++;
        pl.xpNext = this.xpFor(pl.level);
        this.pendingLevelUps++;
      }
    }

    choiceCount() {
      const extra = Math.min(0.8, (this.stats.luck - 1) * 1.2);
      return this.cfg.choiceCount + (this.rand() < extra ? 1 : 0);
    }

    openChoice(c) {
      this.choice = c;
      this.phase = 'choice';
      this.emit('choice', c);
    }

    openLevelUp() {
      this.pendingLevelUps--;
      const options = this.rollOptions(this.choiceCount(), false);
      if (options[0].kind === 'heal') {
        // 모든 슬롯이 만렙이면 창을 띄우지 않고 보너스만 지급
        this.heal(this.player.maxHp * 0.15);
        this.score += this.fillerScore();
        return;
      }
      this.sfx('levelup');
      this.openChoice({ type: 'levelup', title: '레벨 업!', sub: `Lv ${this.player.level - this.pendingLevelUps}`, options });
    }

    findEvolvable() {
      for (let i = 0; i < this.weapons.length; i++) {
        const w = this.weapons[i];
        if (w.def.tier === 'base' && w.def.evolveTo && w.level >= w.maxLevel) return w;
      }
      return null;
    }

    // 레벨업 후보 뽑기. ownedOnly = 보유 아이템 강화만 (Accept 메일)
    rollOptions(n, ownedOnly) {
      const out = [];
      const evo = this.findEvolvable();
      if (evo) out.push({ kind: 'evolve', weapon: evo, def: this.data.weapons[evo.def.evolveTo] });
      const pool = [];
      const WD = this.data.weapons, PD = this.data.passives;
      const wFree = !ownedOnly && this.weapons.length < this.cfg.slots.weapons;
      for (const id in WD) {
        const def = WD[id];
        if (def.tier !== 'base') continue;
        const owned = this.weapons.find((w) => w.baseId === id);
        if (owned) {
          if (owned.def === def && owned.level < owned.maxLevel) pool.push({ kind: 'weapon', id, def, owned, w: def.weight || 100 });
        } else if (wFree) pool.push({ kind: 'weapon', id, def, owned: null, w: def.weight || 100 });
      }
      const pFree = !ownedOnly && this.passives.length < this.cfg.slots.passives;
      for (const id in PD) {
        const def = PD[id];
        const owned = this.passives.find((p) => p.id === id);
        if (owned) {
          if (owned.level < def.max) pool.push({ kind: 'passive', id, def, owned, w: def.weight || 100 });
        } else if (pFree) pool.push({ kind: 'passive', id, def, owned: null, w: def.weight || 100 });
      }
      while (out.length < n && pool.length) {
        let total = 0;
        for (let i = 0; i < pool.length; i++) total += pool[i].w;
        let r = this.rand() * total, k = 0;
        for (; k < pool.length - 1; k++) { r -= pool[k].w; if (r <= 0) break; }
        out.push(pool[k]);
        pool.splice(k, 1);
      }
      if (!out.length && !ownedOnly) out.push({ kind: 'heal' }, { kind: 'score' });
      return out;
    }

    fillerScore() { return this.phd ? 200 : 40 * (this.chapterIndex + 1); }

    describeOption(o) {
      if (o.kind === 'weapon') {
        if (!o.owned) return { icon: o.def.icon, name: o.def.name, tag: 'NEW 무기', desc: o.def.desc, cls: 'new' };
        const lv = o.owned.level, next = lv + 1, isMax = next === o.owned.maxLevel;
        let desc = o.def.levels[lv - 1].text;
        if (isMax) desc += o.def.evolveTo ? ' · 다음 레벨업에 진화!' : ' · (진화 없음)';
        return { icon: o.def.icon, name: o.def.name, tag: `Lv ${lv} → ${next}${isMax ? ' MAX' : ''}`, desc, cls: '' };
      }
      if (o.kind === 'passive') {
        const lv = o.owned ? o.owned.level : 0;
        return { icon: o.def.icon, name: o.def.name, tag: o.owned ? `Lv ${lv} → ${lv + 1}` : 'NEW 패시브', desc: o.def.desc, flavor: o.def.flavor, cls: o.owned ? 'passive' : 'new passive' };
      }
      if (o.kind === 'evolve') {
        return { icon: o.def.icon, name: o.def.name, tag: `진화! ${o.weapon.def.name} →`, desc: o.def.desc, cls: 'evolve' };
      }
      if (o.kind === 'heal') return { icon: '🍵', name: '멘탈 케어', tag: '회복', desc: '멘탈 30% 회복', cls: '' };
      return { icon: '📄', name: '실적 정리', tag: '연구 실적', desc: `연구 실적 +${this.fillerScore()}`, cls: '' };
    }

    // UI/봇이 선택지를 고르면 호출
    choose(i) {
      const c = this.choice;
      if (!c) return;
      this.choice = null;
      this.phase = 'playing';
      if (c.type === 'judgment') {
        if (c.pass && i === 0) this.finish('job');
        else this.startPhd(c.pass);
        return;
      }
      if ((c.type === 'levelup' || c.type === 'augment') && c.options[i]) this.applyOption(c.options[i]);
      this.sfx('select');
    }

    applyOption(o) {
      switch (o.kind) {
        case 'weapon':
          if (o.owned) { o.owned.level++; GS.Weapons.refresh(this, o.owned); }
          else this.addWeapon(o.id);
          break;
        case 'passive':
          if (o.owned) o.owned.level++;
          else this.passives.push({ id: o.id, def: o.def, level: 1 });
          this.recomputeStats();
          break;
        case 'evolve': this.evolveWeapon(o.weapon); break;
        case 'heal': this.heal(this.player.maxHp * 0.3); break;
        case 'score': this.score += this.fillerScore(); break;
      }
    }

    addWeapon(id) {
      const def = this.data.weapons[id];
      const w = {
        uid: this.uid++, id, baseId: id, def, level: 1,
        maxLevel: (def.levels ? def.levels.length : 0) + 1,
        timer: 0.3, state: {}, p: null, dmg: 0, kills: 0,
      };
      this.weapons.push(w);
      GS.Weapons.refresh(this, w);
      return w;
    }

    evolveWeapon(w) {
      const from = w.def, to = this.data.weapons[from.evolveTo];
      GS.Weapons.cleanup(this, w);
      w.id = from.evolveTo;
      w.def = to;
      w.level = 1;
      w.maxLevel = 1;
      w.timer = 0.2;
      w.state = {};
      GS.Weapons.refresh(this, w);
      this.evolutions.push({ from: from.name, to: to.name, time: this.time });
      this.emit('banner', { title: '진화!', sub: `${from.name} → ${to.name}`, kind: 'evolve' });
      this.sfx('evolve');
    }

    // ───────── 전투 ─────────
    damageEnemy(e, amount, w, dx, dy, kb) {
      if (!e.active || amount <= 0) return;
      const dealt = Math.min(amount, e.hp);
      e.hp -= amount;
      e.flash = 0.1;
      if (w) w.dmg += dealt;
      if (kb && e.kbResist < 1) {
        const k = kb * (1 - e.kbResist);
        e.kbx += dx * k;
        e.kby += dy * k;
      }
      if (this.cfg.damageNumbers && this.time - e.lastText > 0.15) {
        e.lastText = this.time;
        this.addText(e.x + (this.rand() - 0.5) * 12, e.y - e.r, '' + Math.round(amount), e.boss ? '#ffd43b' : '#ffffff', e.boss ? 18 : 14, true);
      }
      if (e.hp <= 0) this.killEnemy(e, w);
    }

    killEnemy(e, w) {
      e.active = false;
      this.kills++;
      if (w) w.kills++;
      this.score += e.score;
      this.spawnGem(e.x, e.y, e.xp);
      if (e.boss || e.elite) this.spawnItem('accept', e.x, e.y);
      else this.rollDrop(e);
      if (e.def.split) GS.Enemies.split(this, e);
      if (e.def.onDeath) GS.Enemies.deathBurst(this, e);
      if (this.effects.length < 160) this.effects.push({ kind: 'puff', x: e.x, y: e.y, t: 0, dur: 0.3, r: e.r, color: e.def.sprite.bg });
      if (e.boss) {
        this.bossKills.push({ name: e.def.name, time: this.time });
        this.emit('banner', { title: `${e.def.name} 격파!`, sub: `연구 실적 +${U.fmtNum(e.score)}`, kind: 'boss' });
        this.sfx('bossdown');
      }
    }

    // 화면 안 일반 적 전멸, 보스는 최대 체력 10% 피해 (휴강 공지 / 풋살)
    nuke() {
      const pl = this.player, hw = this.viewW / 2 + 40, hh = this.viewH / 2 + 40;
      const list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active || Math.abs(e.x - pl.x) > hw || Math.abs(e.y - pl.y) > hh) continue;
        if (e.boss) this.damageEnemy(e, e.maxHp * 0.1, null, 0, 0, 0);
        else this.damageEnemy(e, e.hp + 1, null, 0, 0, 0);
      }
      this.enemyShots.length = 0;
      this.effects.push({ kind: 'flash', t: 0, dur: 0.45 });
    }

    updateContact() {
      if (this.freezeTimer > 0) return;
      const pl = this.player;
      this.contactCheck(this.grid.query(pl.x, pl.y, pl.r + 30, this.qbuf));
      this.contactCheck(this.bigEnemies);
    }

    contactCheck(list) {
      const pl = this.player, cd = this.cfg.player.contactCooldown;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active || e.contactCd > 0) continue;
        const rr = pl.r + e.r * 0.8, dx = e.x - pl.x, dy = e.y - pl.y;
        if (dx * dx + dy * dy > rr * rr) continue;
        e.contactCd = cd;
        this.hurtPlayer(e.damage);
        const oh = e.def.onHit;
        if (oh && oh.slow) this.slowPlayer(oh.slow, oh.time);
      }
    }

    // 감기: amt 비율만큼 time 초 동안 느려짐 (무적이면 무시)
    slowPlayer(amt, time) {
      const pl = this.player;
      if (pl.invuln > 0) return;
      pl.slowTimer = Math.max(pl.slowTimer, time);
      pl.slowAmt = amt;
    }

    // ───────── 드롭 / 픽업 ─────────
    rollDrop(e) {
      const items = this.data.items;
      for (const id in items) {
        const it = items[id];
        if (it.chance && this.rand() < it.chance) { this.spawnItem(id, e.x, e.y); return; }
      }
    }

    spawnItem(id, x, y) {
      this.items.push({ id, def: this.data.items[id], x, y, t: 0, pull: false, spd: 0 });
    }

    spawnGem(x, y, v) {
      const gems = this.gems;
      if (gems.length >= this.cfg.gemCap) {
        // 상한 초과: 가장 먼 지식을 새 지식에 합쳐 경험치가 플레이어 주변에 남도록
        const pl = this.player;
        let fi = -1, fd = -1;
        for (let i = 0; i < gems.length; i++) {
          const g = gems[i];
          if (g.pull) continue;
          const d = (g.x - pl.x) * (g.x - pl.x) + (g.y - pl.y) * (g.y - pl.y);
          if (d > fd) { fd = d; fi = i; }
        }
        if (fi >= 0) {
          v += gems[fi].v;
          gems[fi] = gems[gems.length - 1];
          gems.pop();
        }
      }
      gems.push({ x: x + (this.rand() - 0.5) * 8, y: y + (this.rand() - 0.5) * 8, v, pull: false, spd: 0 });
    }

    updatePickups(dt) {
      const pl = this.player;
      const R = this.cfg.player.magnet * this.stats.magnet, R2 = R * R;
      const gems = this.gems;
      for (let i = gems.length - 1; i >= 0; i--) {
        const g = gems[i];
        const dx = pl.x - g.x, dy = pl.y - g.y, d2 = dx * dx + dy * dy;
        if (!g.pull && d2 < R2) { g.pull = true; g.spd = 60; }
        if (!g.pull) continue;
        const d = Math.sqrt(d2) || 1;
        g.spd = Math.min(1100, g.spd + 1500 * dt);
        const step = Math.min(d, g.spd * dt);
        g.x += (dx / d) * step;
        g.y += (dy / d) * step;
        if (d < pl.r + 8) {
          gems[i] = gems[gems.length - 1];
          gems.pop();
          this.gainXp(g.v);
          this.sfx('gem');
        }
      }
      const its = this.items, IR2 = R2 * 0.5;
      for (let i = its.length - 1; i >= 0; i--) {
        const it = its[i];
        it.t += dt;
        const dx = pl.x - it.x, dy = pl.y - it.y, d2 = dx * dx + dy * dy;
        if (!it.pull && d2 < IR2) { it.pull = true; it.spd = 60; }
        if (it.pull) {
          const d = Math.sqrt(d2) || 1;
          it.spd = Math.min(900, it.spd + 1200 * dt);
          const step = Math.min(d, it.spd * dt);
          it.x += (dx / d) * step;
          it.y += (dy / d) * step;
        }
        const rr = pl.r + 22;
        if (d2 < rr * rr) {
          its[i] = its[its.length - 1];
          its.pop();
          this.applyItem(it);
          if (this.phase !== 'playing') return;
        }
      }
    }

    applyItem(it) {
      const ef = it.def.effect;
      if (ef.heal) this.heal(ef.heal);
      if (ef.vacuum) for (let i = 0; i < this.gems.length; i++) { const g = this.gems[i]; g.pull = true; g.spd = Math.max(g.spd, 250); }
      if (ef.nuke) this.nuke();
      if (ef.freeze) this.freezeTimer = Math.max(this.freezeTimer, ef.freeze);
      if (it.def.msg) this.toast(it.def.msg);
      this.sfx(ef.chest ? 'chest' : 'item');
      if (ef.chest) this.openChest();
    }

    openChest() {
      const c = this.cfg.chest, luck = this.stats.luck, r = this.rand();
      const count = r < c.five * luck ? 5 : r < (c.five + c.three) * luck ? 3 : 1;
      const items = this.grantUpgrades(count, true);
      this.openChoice({ type: 'reward', title: '📩 Accept 메일 도착!', sub: count > 1 ? `무려 ${count}개의 보상!` : '논문이 게재 승인되었다', items });
    }

    // 랜덤 강화 count 개를 바로 적용하고 표시용 목록을 돌려준다
    grantUpgrades(count, ownedOnly) {
      const got = [];
      for (let i = 0; i < count; i++) {
        const o = this.rollOptions(1, ownedOnly)[0];
        if (!o) {
          this.heal(this.player.maxHp * 0.2);
          got.push({ icon: '🍵', name: '멘탈 회복', tag: '+20%', desc: '' });
          continue;
        }
        got.push(this.describeOption(o));
        this.applyOption(o);
      }
      return got;
    }

    // ───────── 성소 ─────────
    updateSanctuaries(dt) {
      const sc = this.cfg.sanctuary, pl = this.player;
      this.sanctuaryTimer -= dt;
      if (this.sanctuaryTimer <= 0) {
        this.sanctuaryTimer = sc.intervalMin + this.rand() * (sc.intervalMax - sc.intervalMin);
        if (this.sanctuaries.length < sc.maxActive) this.spawnSanctuary();
      }
      const rr = sc.radius + pl.r;
      for (let i = this.sanctuaries.length - 1; i >= 0; i--) {
        const s = this.sanctuaries[i];
        s.life -= dt;
        s.t += dt;
        const dx = pl.x - s.x, dy = pl.y - s.y;
        if (dx * dx + dy * dy < rr * rr) {
          this.sanctuaries.splice(i, 1);
          this.activateSanctuary(s);
          if (this.phase !== 'playing') return;
          continue;
        }
        if (s.life <= 0) this.sanctuaries.splice(i, 1);
      }
    }

    spawnSanctuary() {
      const defs = this.data.sanctuaries, w = {};
      for (const id in defs) w[id] = defs[id].weight;
      const id = U.weightedPick(this.rand, w), def = defs[id], sc = this.cfg.sanctuary;
      const a = this.rand() * Math.PI * 2;
      const d = sc.distMin + this.rand() * (sc.distMax - sc.distMin);
      this.sanctuaries.push({ id, def, x: this.player.x + Math.cos(a) * d, y: this.player.y + Math.sin(a) * d, life: sc.lifetime, maxLife: sc.lifetime, t: 0 });
      this.toast(`${def.emoji} 근처에 '${def.name}' 이(가) 열렸다!`, def.color);
    }

    activateSanctuary(s) {
      const ef = s.def.effect, pl = this.player;
      if (ef.heal) this.heal(pl.maxHp * ef.heal);
      if (ef.speed) pl.buffs.push({ speed: ef.speed, time: ef.speedTime });
      if (ef.invuln) pl.invuln = Math.max(pl.invuln, ef.invuln);
      if (ef.nuke) this.nuke();
      this.toast(`${s.def.emoji} ${s.def.msg}`, s.def.color);
      this.sfx('sanctuary');
      this.effects.push({ kind: 'ring', x: s.x, y: s.y, t: 0, dur: 0.6, r: 140, color: s.def.color });
      if (ef.augment) {
        this.openChoice({ type: 'augment', title: '🎮 증강 선택!', sub: '칼바람 한 판 하고 왔더니 머리가 맑아졌다', options: this.rollOptions(3, false) });
      } else if (ef.upgrades) {
        this.openChoice({ type: 'reward', title: '✈️ 학회 출장', sub: '견문을 넓히고 돌아왔다', items: this.grantUpgrades(ef.upgrades, false) });
      }
    }

    // ───────── 탐색 헬퍼 ─────────
    rebuildGrid() {
      const g = this.grid, big = this.bigEnemies, list = this.enemies;
      g.clear();
      big.length = 0;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active) continue;
        if (e.r > 24) big.push(e);
        else g.insert(e);
      }
    }

    // 반경 r 근처의 적 후보 (정확한 충돌 판정은 호출하는 쪽에서)
    enemiesNear(x, y, r, out) {
      this.grid.query(x, y, r + 24, out);
      const big = this.bigEnemies;
      for (let i = 0; i < big.length; i++) out.push(big[i]);
      return out;
    }

    // 가까운 순 n마리 (공유 버퍼를 돌려주므로 바로 사용할 것)
    nearestEnemies(x, y, range, n) {
      return this.topEnemies(x, y, range, n, false);
    }

    // 최대 체력이 큰 순(보스·엘리트 우선) n마리
    strongestEnemies(x, y, range, n) {
      return this.topEnemies(x, y, range, n, true);
    }

    topEnemies(x, y, range, n, byHp) {
      const out = this._tb || (this._tb = []), ks = this._tk || (this._tk = []);
      out.length = 0;
      ks.length = 0;
      const r2 = range * range, list = this.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active) continue;
        const dx = e.x - x, dy = e.y - y, d2 = dx * dx + dy * dy;
        if (d2 > r2) continue;
        const key = byHp ? -e.maxHp * 1e6 + d2 : d2;
        if (out.length < n) { out.push(e); ks.push(key); }
        else if (key < ks[n - 1]) { out[n - 1] = e; ks[n - 1] = key; }
        else continue;
        for (let k = out.length - 1; k > 0 && ks[k - 1] > ks[k]; k--) {
          const te = out[k]; out[k] = out[k - 1]; out[k - 1] = te;
          const tk = ks[k]; ks[k] = ks[k - 1]; ks[k - 1] = tk;
        }
      }
      return out;
    }

    // ───────── 연출용 텍스트·이펙트 ─────────
    addText(x, y, text, color, size, minor) {
      if (minor && this.texts.length > 90) return;
      this.texts.push({ x, y, text, color, size, t: 0, dur: minor ? 0.55 : 1.2 });
    }

    updateEffects(dt) {
      const tx = this.texts;
      for (let i = tx.length - 1; i >= 0; i--) {
        const t = tx[i];
        t.t += dt;
        t.y -= 28 * dt;
        if (t.t >= t.dur) { tx[i] = tx[tx.length - 1]; tx.pop(); }
      }
      const ef = this.effects;
      for (let i = ef.length - 1; i >= 0; i--) {
        const e = ef[i];
        e.t += dt;
        if (e.t >= e.dur) { ef[i] = ef[ef.length - 1]; ef.pop(); }
      }
    }

    compact() {
      const en = this.enemies, pool = this.enemyPool;
      let j = 0;
      for (let i = 0; i < en.length; i++) {
        const e = en[i];
        if (e.active) en[j++] = e;
        else if (pool.length < 600) pool.push(e);
      }
      en.length = j;
    }

    // ───────── 결과 ─────────
    buildResult(type) {
      const ch = this.chapters[this.chapterIndex];
      return {
        type,
        phd: this.phd,
        time: this.time,
        phdTime: this.phdTime,
        stage: this.phd ? `박사 ${this.phdYear}년차` : `${ch.name} · ${ch.title}`,
        level: this.player.level,
        kills: this.kills,
        score: this.score,
        required: this.cfg.jobScore,
        damageTaken: Math.round(this.damageTaken),
        weapons: this.weapons
          .map((w) => ({ name: w.def.name, icon: w.def.icon, level: w.level, evolved: w.def.tier === 'evolved', max: w.level >= w.maxLevel, dmg: Math.round(w.dmg), kills: w.kills }))
          .sort((a, b) => b.dmg - a.dmg),
        passives: this.passives.map((p) => ({ name: p.def.name, icon: p.def.icon, level: p.level })),
        evolutions: this.evolutions.slice(),
        bossKills: this.bossKills.slice(),
      };
    }
  }

  GS.Game = Game;
})(window.GS = window.GS || {});
