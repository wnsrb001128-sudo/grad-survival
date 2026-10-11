// 적 생성·행동(AI)·보스 기술, 그리고 웨이브 스폰(Spawner)
(function (GS) {
  'use strict';
  const U = GS.util;
  const E = GS.Enemies = {};
  const TAU = Math.PI * 2;

  E.spawn = function (g, id, x, y, o) {
    o = o || {};
    const def = g.data.enemies[id];
    const e = g.enemyPool.pop() || {};
    const elite = !!o.elite;
    e.id = g.uid++;
    e.type = id;
    e.def = def;
    e.active = true;
    e.x = x;
    e.y = y;
    e.kbx = 0;
    e.kby = 0;
    e.elite = elite;
    e.boss = !!def.boss;
    e.maxHp = e.hp = Math.round(def.hp * (o.hpMult || 1) * (elite ? 8 : 1));
    e.r = def.radius * (elite ? 1.45 : 1);
    e.speed = def.speed * (o.speedMult || 1);
    e.damage = def.damage * (o.dmgMult || 1) * (elite ? 1.25 : 1);
    e.xp = def.xp * (elite ? 12 : 1);
    e.score = def.score * (elite ? 12 : 1);
    e.kbResist = e.boss ? 1 : elite ? Math.max(0.75, def.kbResist || 0) : def.kbResist || 0;
    e.ai = o.ai || def.ai;
    e.st = 0;
    e.stT = 0;
    e.dx = o.dx || 0;
    e.dy = o.dy || 0;
    e.cx = o.cx || 0;
    e.cy = o.cy || 0;
    e.life = o.life || 0;
    e.flash = 0;
    e.contactCd = 0;
    e.lastText = -1;
    e.lastHit = {};
    e.skillT = def.skills ? def.skills.map((s) => (s.first !== undefined ? s.first : s.every * 0.6)) : null;
    e.shootT = def.ranged ? def.ranged.every * (0.4 + g.rand() * 0.6) : 0;
    e.trailT = def.trail ? def.trail.every : 0;
    e.stage = 0;
    e.growT = def.grow ? def.grow.every : 0;
    e.anim = g.rand() * 10;
    g.enemies.push(e);
    if (!g.seen[id]) {
      g.seen[id] = true;
      g.emit('newEnemy', def);
    }
    return e;
  };

  E.update = function (g, dt) {
    const pl = g.player, frozen = g.freezeTimer > 0;
    const relX = g.viewW / 2 + 380, relY = g.viewH / 2 + 380;
    const grid = g.grid, q = g.qbuf2 || (g.qbuf2 = []);
    const decay = Math.exp(-9 * dt);
    const list = g.enemies;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active) continue;
      if (e.flash > 0) e.flash -= dt;
      if (e.contactCd > 0) e.contactCd -= dt;
      if (frozen) continue;
      const dx = pl.x - e.x, dy = pl.y - e.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      let mx = 0, my = 0;
      switch (e.ai) {
        case 'chase':
          mx = (dx / d) * e.speed;
          my = (dy / d) * e.speed;
          break;
        case 'zigzag': { // 버그: 다가오면서 좌우로 흔들린다
          const Z = e.def.zigzag, w = Math.sin(g.time * Z.freq + e.anim) * Z.amp;
          const nx = dx / d, ny = dy / d, k = e.speed / Math.sqrt(1 + w * w);
          mx = (nx - ny * w) * k;
          my = (ny + nx * w) * k;
          break;
        }
        case 'dash': {
          const D = e.def.dash;
          if (e.st === 0) {
            mx = (dx / d) * e.speed;
            my = (dy / d) * e.speed;
            if (d < D.range) { e.st = 1; e.stT = D.windup; }
          } else if (e.st === 1) { // 멈칫 (예고)
            e.stT -= dt;
            if (e.stT <= 0) { e.st = 2; e.stT = D.time; e.dx = dx / d; e.dy = dy / d; }
          } else if (e.st === 2) { // 돌진
            mx = e.dx * e.speed * D.mult;
            my = e.dy * e.speed * D.mult;
            e.stT -= dt;
            if (e.stT <= 0) { e.st = 3; e.stT = D.rest; }
          } else {
            mx = (dx / d) * e.speed * 0.4;
            my = (dy / d) * e.speed * 0.4;
            e.stT -= dt;
            if (e.stT <= 0) e.st = 0;
          }
          break;
        }
        case 'ranged': {
          const R = e.def.ranged;
          if (d > R.keep + 40) { mx = (dx / d) * e.speed; my = (dy / d) * e.speed; }
          else if (d < R.keep - 60) { mx = (-dx / d) * e.speed * 0.7; my = (-dy / d) * e.speed * 0.7; }
          else { mx = (-dy / d) * e.speed * 0.4; my = (dx / d) * e.speed * 0.4; }
          e.shootT -= dt;
          if (e.shootT <= 0 && d < R.keep + 220) {
            e.shootT = R.every;
            E.shoot(g, e.x, e.y, Math.atan2(dy, dx), R.speed, R.damage * (e.damage / e.def.damage), R.style);
          }
          break;
        }
        case 'bomber': { // 윈도우 업데이트: 가까이 오면 카운트다운 후 자폭
          const B = e.def.bomb;
          if (e.st === 0) {
            mx = (dx / d) * e.speed;
            my = (dy / d) * e.speed;
            if (d < B.trigger) { e.st = 1; e.stT = B.fuse; }
          } else {
            mx = (dx / d) * e.speed * 0.25;
            my = (dy / d) * e.speed * 0.25;
            e.stT -= dt;
            if (e.stT <= 0) { E.explode(g, e); continue; }
          }
          break;
        }
        case 'line':
          mx = e.dx * e.speed;
          my = e.dy * e.speed;
          e.life -= dt;
          if (e.life <= 0) { e.active = false; continue; }
          break;
        case 'ring': {
          const cx = e.cx - e.x, cy = e.cy - e.y, cd = Math.hypot(cx, cy) || 1;
          if (cd > 8) { mx = (cx / cd) * e.speed; my = (cy / cd) * e.speed; }
          e.life -= dt;
          if (e.life <= 0) { e.active = false; continue; }
          break;
        }
      }
      // 겹침 완화 (작은 적끼리만)
      if (e.r <= 24 && e.ai !== 'line') {
        grid.query(e.x, e.y, e.r * 2, q);
        let sx = 0, sy = 0, cnt = 0;
        for (let j = 0; j < q.length && cnt < 6; j++) {
          const o = q[j];
          if (o === e || !o.active) continue;
          const ox = e.x - o.x, oy = e.y - o.y, rr = e.r + o.r, d2 = ox * ox + oy * oy;
          if (d2 < rr * rr && d2 > 0.01) {
            const od = Math.sqrt(d2), push = (rr - od) / rr;
            sx += (ox / od) * push;
            sy += (oy / od) * push;
            cnt++;
          }
        }
        mx += sx * 60;
        my += sy * 60;
      }
      if (e.skillT) E.skills(g, e, dt);
      if (e.def.grow && e.stage < e.def.grow.labels.length - 1 && (e.growT -= dt) <= 0) E.grow(g, e);
      if (e.def.trail && (e.trailT -= dt) <= 0) { // 플롯 그리기: 지나간 자리에 데이터 점
        const T = e.def.trail;
        e.trailT = T.every;
        E.shoot(g, e.x, e.y, 0, 0, T.damage * (e.damage / e.def.damage), 'plot', null, T.life);
      }
      e.x += (mx + e.kbx) * dt;
      e.y += (my + e.kby) * dt;
      e.kbx *= decay;
      e.kby *= decay;
      // 너무 멀어진 적은 플레이어 진행 방향 앞쪽으로 재배치
      if (e.ai !== 'line' && e.ai !== 'ring' && (Math.abs(e.x - pl.x) > relX || Math.abs(e.y - pl.y) > relY)) {
        const p = g.spawner.edgePoint(pl.x - e.x, pl.y - e.y);
        e.x = p.x;
        e.y = p.y;
      }
    }
  };

  E.explode = function (g, e) {
    const B = e.def.bomb, pl = g.player;
    const dx = pl.x - e.x, dy = pl.y - e.y, rr = B.radius + pl.r;
    g.effects.push({ kind: 'ring', x: e.x, y: e.y, t: 0, dur: 0.45, r: B.radius, color: '#1c7ed6' });
    g.addText(e.x, e.y - e.r - 6, '강제 재시작!', '#1c7ed6', 17);
    if (dx * dx + dy * dy < rr * rr && pl.invuln <= 0) {
      g.hurtPlayer(B.damage * (e.damage / e.def.damage));
      g.jamTimer = Math.max(g.jamTimer, B.jam);
      g.toast('💻 윈도우 업데이트로 강제 재부팅! 무기가 잠시 멈춘다', '#74c0fc');
      g.sfx('jam');
    }
    e.active = false; // 자폭: 보상 없음
  };

  E.skills = function (g, e, dt) {
    const sk = e.def.skills;
    for (let k = 0; k < sk.length; k++) {
      e.skillT[k] -= dt;
      if (e.skillT[k] > 0) continue;
      const s = sk[k];
      e.skillT[k] = s.every;
      const dm = e.damage / e.def.damage;
      switch (s.type) {
        case 'radial': {
          const off = g.rand() * TAU;
          for (let i = 0; i < s.count; i++) E.shoot(g, e.x, e.y, off + (i / s.count) * TAU, s.speed, s.damage * dm, s.style, s.slow);
          break;
        }
        case 'aimed': {
          const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
          for (let i = 0; i < s.count; i++) E.shoot(g, e.x, e.y, a + (i - (s.count - 1) / 2) * (s.spread || 0.18), s.speed, s.damage * dm, s.style);
          break;
        }
        case 'summon': {
          const hp = g.spawner.hpMult();
          for (let i = 0; i < s.count; i++) {
            if (g.enemies.length >= g.cfg.maxEnemies + 60) break;
            const id = s.pool[(g.rand() * s.pool.length) | 0];
            const a = g.rand() * TAU;
            E.spawn(g, id, e.x + Math.cos(a) * (e.r + 26), e.y + Math.sin(a) * (e.r + 26), { hpMult: hp });
          }
          if (s.msg) g.toast(s.msg);
          break;
        }
        case 'ring':
          g.spawner.ring(s.enemy, s.count, s.radius, s.life || 12);
          if (s.msg) g.toast(s.msg);
          break;
      }
    }
  };

  // slow: { amt, time } 가 있으면 맞았을 때 플레이어가 느려진다 (감기 세균)
  // life: 남아 있는 시간(기본 6초). 속도 0 이면 바닥에 남는 점 (플롯 그리기)
  E.shoot = function (g, x, y, a, spd, dmg, style, slow, life) {
    if (g.enemyShots.length > 400) return;
    g.enemyShots.push({ x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: style === 'paper' || style === 'plot' ? 7 : 9, dmg, life: life || 6, style, a, slow: slow || null });
  };

  E.updateShots = function (g, dt) {
    const pl = g.player, frozen = g.freezeTimer > 0, shots = g.enemyShots;
    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      let dead = false;
      if (!frozen) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.life -= dt;
        const dx = s.x - pl.x, dy = s.y - pl.y, rr = s.r + pl.r * 0.8;
        if (dx * dx + dy * dy < rr * rr) {
          g.hurtPlayer(s.dmg);
          if (s.slow) g.slowPlayer(s.slow.amt, s.slow.time);
          dead = true;
        }
        else if (s.life <= 0) dead = true;
      }
      if (dead) { shots[i] = shots[shots.length - 1]; shots.pop(); }
    }
  };

  // 어학 성적 취득: 점수가 오를 때마다 커지고 단단해진다
  E.grow = function (g, e) {
    const G = e.def.grow;
    e.growT = G.every;
    e.stage++;
    e.hp *= G.hp;
    e.maxHp = Math.round(e.maxHp * G.hp);
    e.r *= G.size;
    e.damage *= G.dmg;
    e.xp = Math.round(e.xp * G.hp);
    e.score = Math.round(e.score * G.hp);
    g.addText(e.x, e.y - e.r - 8, G.labels[e.stage] + '점!', '#0c8599', 14);
  };

  // 시뮬레이션 발산: 죽을 때 사방으로 탄을 튀긴다
  E.deathBurst = function (g, e) {
    const o = e.def.onDeath, dm = e.damage / e.def.damage, off = g.rand() * TAU;
    for (let i = 0; i < o.count; i++) E.shoot(g, e.x, e.y, off + (i / o.count) * TAU, o.speed, o.damage * dm, o.style);
  };

  // 메이저 리비전 → 마이너 리비전 분열
  E.split = function (g, e) {
    const sp = e.def.split, hp = g.spawner.hpMult();
    for (let i = 0; i < sp.count; i++) {
      if (g.enemies.length >= g.cfg.maxEnemies + 60) break;
      const a = (i / sp.count) * TAU + g.rand();
      E.spawn(g, sp.into, e.x + Math.cos(a) * 14, e.y + Math.sin(a) * 14, { hpMult: hp });
    }
  };

  // ───────── 웨이브 스폰 ─────────
  class Spawner {
    constructor(g) {
      this.g = g;
      this.timer = 0;
      this.refillT = 0;
      this.ev = 0;
      this.bossDone = false;
      this.phdEventT = 0;
      this.phdBossT = 0;
      this.phdBossN = 0;
      this.pt = { x: 0, y: 0 };
    }

    onChapterStart() { this.timer = 0; this.ev = 0; this.bossDone = false; this.midDone = false; }

    onPhdStart() {
      const P = this.g.data.phd;
      this.timer = 0;
      this.phdEventT = P.eventEvery;
      this.phdBossT = P.bossFirst;
      this.phdBossN = 0;
    }

    hpMult() {
      const g = this.g;
      if (!g.phd) return g.chapters[g.chapterIndex].hpMult || 1;
      const P = g.data.phd;
      return P.hpStart * (1 + (P.hpPerMin * g.phdTime) / 60);
    }

    segment() {
      const g = this.g;
      if (g.phd) {
        const P = g.data.phd, m = g.phdTime / 60;
        const seg = this._phdSeg || (this._phdSeg = { pool: P.pool, batch: P.batch });
        seg.min = Math.min(P.minMax, P.minStart + P.minPerMin * m);
        seg.interval = Math.max(P.intervalMin, P.intervalStart + P.intervalPerMin * m);
        return seg;
      }
      const ch = g.chapters[g.chapterIndex];
      let seg = ch.segments[0];
      for (let i = 0; i < ch.segments.length; i++) if (ch.segments[i].t <= g.chapterTime) seg = ch.segments[i];
      return seg;
    }

    update(dt) {
      const g = this.g;
      if (g.phd) this.phdUpdate(dt);
      else {
        const ch = g.chapters[g.chapterIndex];
        while (this.ev < ch.events.length && ch.events[this.ev].t <= g.chapterTime) this.event(ch.events[this.ev++]);
        if (ch.midBoss && !this.midDone && g.chapterTime >= ch.midBoss.t) {
          this.midDone = true;
          this.spawnBoss(ch.midBoss.enemy, 1, ch.midBoss.msg, '중간보스');
        }
        if (ch.boss && !this.bossDone && g.chapterTime >= ch.boss.t) {
          this.bossDone = true;
          this.spawnBoss(ch.boss.enemy, 1, ch.boss.msg);
        }
      }
      const seg = this.segment();
      const n = g.enemies.length;
      // 최소 유지 수 미만이면 0.1초마다 batch 만큼 보충
      this.refillT -= dt;
      if (n < seg.min && this.refillT <= 0) {
        this.refillT = 0.1;
        this.spawnPool(seg.pool, Math.min(seg.batch, Math.ceil(seg.min - n)));
      }
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = seg.interval;
        // 처치가 밀려도 필드 적이 끝없이 쌓이지 않도록 최소 유지 수의 약 2배에서 멈춘다
        if (n < (seg.cap || seg.min * 2 + 20)) this.spawnPool(seg.pool, seg.batch);
      }
    }

    phdUpdate(dt) {
      const g = this.g, P = g.data.phd;
      this.phdEventT -= dt;
      if (this.phdEventT <= 0) {
        this.phdEventT = P.eventEvery;
        this.event(P.events[(g.rand() * P.events.length) | 0]);
      }
      this.phdBossT -= dt;
      if (this.phdBossT <= 0) {
        this.phdBossT = P.bossEvery;
        const id = P.bosses[this.phdBossN % P.bosses.length];
        this.spawnBoss(id, 1 + P.bossHpGrowth * this.phdBossN, '박사 과정의 시련');
        this.phdBossN++;
      }
    }

    spawnPool(pool, n) {
      const g = this.g, hp = this.hpMult();
      for (let i = 0; i < n; i++) {
        if (g.enemies.length >= g.cfg.maxEnemies) return;
        const id = U.weightedPick(g.rand, pool);
        const p = this.randomEdge();
        E.spawn(g, id, p.x, p.y, { hpMult: hp });
      }
    }

    // 플레이어 기준 (dx,dy) 방향으로 화면 바로 바깥 지점 (공유 객체 반환)
    edgePoint(dx, dy) {
      const g = this.g, W = g.viewW / 2 + 70, H = g.viewH / 2 + 70;
      const ax = Math.abs(dx) || 1e-6, ay = Math.abs(dy) || 1e-6;
      const t = Math.min(W / ax, H / ay);
      this.pt.x = g.player.x + dx * t;
      this.pt.y = g.player.y + dy * t;
      return this.pt;
    }

    randomEdge() {
      const a = this.g.rand() * TAU;
      return this.edgePoint(Math.cos(a), Math.sin(a));
    }

    event(ev) {
      const g = this.g;
      if (ev.msg) g.toast(ev.msg, '#ffd43b');
      switch (ev.type) {
        case 'ring': this.ring(ev.enemy, ev.count, ev.radius || 440, ev.life || 14); break;
        case 'line': this.line(ev.enemy, ev.count); break;
        case 'elite': {
          const p = this.randomEdge();
          E.spawn(g, ev.enemy, p.x, p.y, { hpMult: this.hpMult(), elite: true });
          break;
        }
        case 'burst': {
          const hp = this.hpMult();
          for (let i = 0; i < ev.count; i++) {
            const p = this.randomEdge();
            E.spawn(g, ev.enemy, p.x, p.y, { hpMult: hp });
          }
          break;
        }
      }
    }

    // 원형 포위: 플레이어를 둘러싸고 천천히 조여 온다
    ring(id, count, radius, life) {
      const g = this.g, pl = g.player, hp = this.hpMult();
      for (let i = 0; i < count; i++) {
        if (g.enemies.length >= g.cfg.maxEnemies + 80) break;
        const a = (i / count) * TAU;
        E.spawn(g, id, pl.x + Math.cos(a) * radius, pl.y + Math.sin(a) * radius, { hpMult: hp, ai: 'ring', cx: pl.x, cy: pl.y, life, speedMult: 0.55 });
      }
    }

    // 화면 횡단 떼: 한쪽에서 반대쪽으로 지나간다
    line(id, count) {
      const g = this.g, pl = g.player, hp = this.hpMult();
      const side = (g.rand() * 4) | 0;
      const W = g.viewW / 2 + 80, H = g.viewH / 2 + 80;
      const def = g.data.enemies[id];
      const span = (side < 2 ? W : H) * 2 + 320;
      for (let i = 0; i < count; i++) {
        if (g.enemies.length >= g.cfg.maxEnemies + 80) break;
        const off = (g.rand() - 0.5) * 1.8, lag = g.rand() * 140;
        let x, y, dx = 0, dy = 0;
        if (side === 0) { x = pl.x - W - lag; y = pl.y + off * H; dx = 1; }
        else if (side === 1) { x = pl.x + W + lag; y = pl.y + off * H; dx = -1; }
        else if (side === 2) { x = pl.x + off * W; y = pl.y - H - lag; dy = 1; }
        else { x = pl.x + off * W; y = pl.y + H + lag; dy = -1; }
        E.spawn(g, id, x, y, { hpMult: hp, ai: 'line', dx, dy, life: span / def.speed });
      }
    }

    spawnBoss(id, extraHp, msg, label) {
      const g = this.g, p = this.randomEdge();
      const e = E.spawn(g, id, p.x, p.y, { hpMult: this.hpMult() * (extraHp || 1) });
      g.emit('banner', { title: `${label || 'BOSS'} · ${e.def.name}`, sub: msg || '', kind: 'boss' });
      g.sfx('boss');
      return e;
    }
  }

  GS.Spawner = Spawner;
})(window.GS = window.GS || {});
