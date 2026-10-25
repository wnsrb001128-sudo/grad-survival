// 적 생성·행동(AI)·보스 기술·보스 특수 패턴(예고 지역), 그리고 웨이브 스폰(Spawner)
(function (GS) {
  'use strict';
  const U = GS.util;
  const E = GS.Enemies = {};
  const TAU = Math.PI * 2;
  // 두 각도의 차이 (-π ~ π)
  const angDiff = (a, b) => {
    let d = (a - b) % TAU;
    if (d > Math.PI) d -= TAU;
    else if (d < -Math.PI) d += TAU;
    return d;
  };

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
    e.castT = 0; // 보스가 특수 패턴을 준비하는 동안 거의 멈춘다
    e.rank = o.rank || def.rank || 'BOSS'; // 보스 이름표·체력 막대에 쓰는 등급 (중간보스 / FINAL BOSS / BOSS)
    e.p2 = false; // phase2 (최종 보스 「수정 후 재심사」)에 들어갔는지
    e.rush = null; // 「로켓 발진」 돌진 상태 { t, a, speed, time, rest } (t < 0 이면 예고 중)
    e.born = g.time; // 등장 연출용
    g.enemies.push(e);
    if (!g.seen[id]) {
      g.seen[id] = true;
      g.emit('newEnemy', def);
    }
    if (!(id in g.chSeen)) g.chSeen[id] = g.chapterTime;
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
          if (e.shootT <= 0 && d < R.keep + 220) { // count 개를 부채꼴(spread)로, radial 이면 사방으로
            e.shootT = R.every;
            const a = Math.atan2(dy, dx), n = R.count || 1, dm = e.damage / e.def.damage;
            for (let k = 0; k < n; k++) {
              const ak = R.radial ? a + (k / n) * TAU : a + (k - (n - 1) / 2) * (R.spread || 0.2);
              E.shoot(g, e.x, e.y, ak, R.speed, R.damage * dm, R.style);
            }
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
      if (e.castT > 0) {
        e.castT -= dt;
        mx *= 0.15;
        my *= 0.15;
      }
      if (e.rush) { // 킥오프 「로켓 발진」: 예고가 끝나면 정해진 방향으로 빠르게 돌진하고, 끝나면 잠깐 멈춘다
        const r = e.rush;
        r.t += dt;
        if (r.t >= 0 && r.t < r.time) { mx = Math.cos(r.a) * r.speed; my = Math.sin(r.a) * r.speed; }
        else if (r.t >= r.time + r.rest) e.rush = null;
      }
      if (e.skillT) E.skills(g, e, dt);
      if (e.def.grow && e.stage < e.def.grow.labels.length - 1 && (e.growT -= dt) <= 0) E.grow(g, e);
      if (e.def.trail && (e.trailT -= dt) <= 0) { // 플롯 그리기: 지나간 자리에 데이터 점
        const T = e.def.trail;
        e.trailT = T.every;
        const s = E.shoot(g, e.x, e.y, 0, 0, T.damage * (e.damage / e.def.damage), 'plot', null, T.life);
        if (s) s.owner = e.id; // 같은 적이 찍은 점끼리 선으로 잇는다 (장식)
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
    g.emit('explode', e);
    if (dx * dx + dy * dy < rr * rr && pl.invuln <= 0) {
      g.hurtPlayer(B.damage * (e.damage / e.def.damage));
      g.jamTimer = Math.max(g.jamTimer, B.jam);
      g.toast('💻 윈도우 업데이트로 강제 재부팅! 무기가 잠시 멈춘다', '#74c0fc');
      g.sfx('jam');
    }
    e.active = false; // 자폭: 보상 없음
  };

  // 보스가 쏜 탄은 '무거운 탄': 파리채로 막을 수 없고 진한 고리를 둘러 그린다
  function heavy(e, s) { if (s && e && e.boss) s.heavy = true; return s; }

  E.skills = function (g, e, dt) {
    const sk = e.def.skills, p2 = e.def.phase2;
    if (p2 && !e.p2 && e.hp < e.maxHp * p2.at) { // 체력이 절반 아래: 모든 공격이 빨라진다
      e.p2 = true;
      if (p2.msg) g.toast(p2.msg, '#ff8787');
      E.shout(g, e, '수정 후 재심사!', '#e03131');
      g.sfx('warn');
    }
    for (let k = 0; k < sk.length; k++) {
      e.skillT[k] -= dt;
      if (e.skillT[k] > 0) continue;
      const s = sk[k];
      e.skillT[k] = s.every * (e.p2 ? p2.every : 1);
      const dm = e.damage / e.def.damage;
      switch (s.type) {
        case 'radial': {
          const off = g.rand() * TAU;
          for (let i = 0; i < s.count; i++) heavy(e, E.shoot(g, e.x, e.y, off + (i / s.count) * TAU, s.speed, s.damage * dm, s.style, s.slow));
          break;
        }
        case 'aimed': {
          const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
          for (let i = 0; i < s.count; i++) heavy(e, E.shoot(g, e.x, e.y, a + (i - (s.count - 1) / 2) * (s.spread || 0.18), s.speed, s.damage * dm, s.style));
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
        default:
          if (E.PATTERNS[s.type]) {
            E.PATTERNS[s.type](g, e, s, dm);
            if (s.tip && !g.tips[s.type]) { // 처음 보는 패턴은 피하는 법을 알려 준다
              g.tips[s.type] = true;
              g.toast(s.tip, '#ff8787');
            }
          }
      }
    }
  };

  // ───────── 보스 특수 패턴 ─────────
  // 빨간 예고 지역(hazard)을 띄우고, warn 초 동안 안쪽이 차오른 뒤 터진다 (dur 초 동안 닿으면 한 번 피해)
  // kind: circle 원 / band 긴 띠 / cone 부채꼴 / sweep 부채꼴을 쓸고 지나가는 빔 / wall 밀려오는 질문 벽(탄은 따로) /
  //       ring 고리(r0~r1, 조명 패턴은 바깥 전체)
  // delay 가 있으면 그만큼 늦게 나타나고, lead 가 있으면 나타날 때 플레이어가 갈 곳을 노린다
  E.shout = function (g, e, text, color) {
    g.addText(e.x, e.y - e.r - 30, text, color, 20);
  };

  E.PATTERNS = {
    // 감기: "에… 에…" 멈칫 → 플레이어 쪽 부채꼴에 세균 분사
    sneeze(g, e, s, dm) {
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x);
      e.castT = s.warn + 0.35;
      E.hazard(g, { kind: 'cone', style: 'sneeze', owner: e, follow: true, x: e.x, y: e.y, a, half: s.arc / 2, r: s.range,
        warn: s.warn, dur: 0.25, dmg: s.damage * dm, slow: s.slow, sk: s, dm });
      E.shout(g, e, '에… 에…', '#2f9e44');
    },
    // 기말고사: 플레이어 주변에 줄무늬 답안 칸 → 한꺼번에 칠한다
    omr(g, e, s, dm) {
      const pl = g.player, a = g.rand() < 0.5 ? Math.PI / 2 : 0;
      const pitch = s.width + s.gap, off = (g.rand() - 0.5) * pitch, nx = -Math.sin(a), ny = Math.cos(a);
      for (let i = 0; i < s.bands; i++) {
        const d = (i - (s.bands - 1) / 2) * pitch + off;
        E.hazard(g, { kind: 'band', style: 'omr', owner: e, x: pl.x + nx * d, y: pl.y + ny * d, a, w: s.width / 2, len: s.len / 2,
          warn: s.warn, dur: 0.3, dmg: s.damage * dm, idx: i });
      }
      e.castT = 0.6;
      E.shout(g, e, '답안 마킹!', '#e03131');
    },
    // 과제 킥오프: 플레이어가 갈 곳을 노린 과녁을 차례로 찍고 로켓 폭격
    strike(g, e, s, dm) {
      for (let i = 0; i < s.count; i++) {
        E.hazard(g, { kind: 'circle', style: 'rocket', owner: e, x: g.player.x, y: g.player.y, r: s.radius,
          warn: s.warn, dur: 0.2, dmg: s.damage * dm, delay: i * s.gap, lead: s.lead, scatter: i ? 40 : 0 });
      }
      E.shout(g, e, '로드맵 발사!', '#1971c2');
    },
    // 포스터 발표: 한쪽에서 빈틈 하나 있는 질문 벽이 밀려온다
    wall(g, e, s, dm) {
      const pl = g.player, dir = ((g.rand() * 4) | 0) * (Math.PI / 2) + (g.rand() - 0.5) * 0.5;
      const ux = Math.cos(dir), uy = Math.sin(dir), half = ((s.count - 1) / 2) * s.spacing;
      const g0 = Math.round((s.count - s.gap) / 2 + (g.rand() - 0.5) * s.count * 0.55); // 빈틈이 시작되는 칸
      const gapOff = (g0 + (s.gap - 1) / 2 - (s.count - 1) / 2) * s.spacing; // 빈틈 가운데 (벽 가운데 기준)
      E.hazard(g, { kind: 'wall', style: 'wall', owner: e, x: pl.x - ux * s.dist, y: pl.y - uy * s.dist, ux, uy, half, g0, gapOff,
        gapW: s.gap * s.spacing, speed: s.speed, warn: s.warn, dur: (s.dist * 2.2) / s.speed, dmg: 0, sk: s, dm, keep: true });
      E.shout(g, e, '질문 있습니다!', '#7048e8');
    },
    // 학회 구두 발표: 부채꼴을 레이저 포인터로 한 번 쓸고 지나간다
    laser(g, e, s, dm) {
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x), side = g.rand() < 0.5 ? 1 : -1;
      e.castT = s.warn + s.dur + 0.2;
      E.hazard(g, { kind: 'sweep', style: 'laser', owner: e, follow: true, x: e.x, y: e.y, a, half: s.arc / 2,
        a0: a - side * (s.arc / 2), a1: a + side * (s.arc / 2), r: s.range, w: s.width / 2, warn: s.warn, dur: s.dur, dmg: s.damage * dm });
      E.shout(g, e, '레이저 포인터!', '#e03131');
    },
    // 학위논문 심사: 플레이어를 가로지르는 빨간펜 줄 여러 개
    redpen(g, e, s, dm) {
      for (let i = 0; i < s.count; i++) {
        E.hazard(g, { kind: 'band', style: 'redpen', owner: e, x: g.player.x, y: g.player.y, a: g.rand() * Math.PI, w: s.width / 2, len: s.len / 2,
          warn: s.warn, dur: 0.22, dmg: s.damage * dm, delay: i * s.gap, lead: 0.3, scatter: 24, turn: true });
      }
      E.shout(g, e, '여기 수정하세요!', '#e03131');
    },
    // 학위논문 심사: 발밑에 큰 원 → 재심사 도장
    stamp(g, e, s, dm) {
      E.hazard(g, { kind: 'circle', style: 'stamp', owner: e, x: g.player.x, y: g.player.y, r: s.radius, warn: s.warn, dur: 0.25, dmg: s.damage * dm });
      e.castT = 0.8;
      E.shout(g, e, '재심사!', '#c92a2a');
    },
    // 연구비 정산: 플레이어가 선 자리를 지나는 가로·세로 띠(행과 열)를 칠한다. 두 번째 십자는 갈 곳을 노린다
    // 한 십자의 두 띠는 link 를 같이 써서, 교차점에 서 있어도 한 번만 맞는다
    excel(g, e, s, dm) {
      for (let i = 0; i < s.count; i++) {
        const link = { hit: false };
        for (let j = 0; j < 2; j++) {
          E.hazard(g, { kind: 'band', style: 'excel', owner: e, x: g.player.x, y: g.player.y, a: (j * Math.PI) / 2, w: s.width / 2, len: s.len / 2,
            warn: s.warn, dur: 0.3, dmg: s.damage * dm, delay: i * s.gap, lead: i ? 0.45 : 0, link });
        }
      }
      e.castT = 0.6;
      E.shout(g, e, '정산 마감!', '#2b8a3e');
    },
    // 학회 논문 초록 작성: 발밑을 중심으로 고리 여러 겹 → 안쪽 고리부터 gap 초 간격으로 터진다 (3 · 2 · 1)
    countdown(g, e, s, dm) {
      const pl = g.player;
      for (let i = 0; i < s.rings; i++) {
        E.hazard(g, { kind: 'ring', style: 'countdown', owner: e, x: pl.x, y: pl.y, r0: i * s.step, r1: (i + 1) * s.step,
          warn: s.warn + i * s.gap, dur: 0.25, dmg: s.damage * dm, label: String(s.rings - i) });
      }
      e.castT = 0.6;
      E.shout(g, e, '마감 3초 전!', '#e8590c');
    },
    // 과제 킥오프: 「로켓 발진」 플레이어 쪽으로 굵은 화살표 띠를 띄우고, warn 초 뒤 그 줄을 따라 돌진한 다음 rest 초 멈춘다
    // 띠는 예고(봇도 이걸 보고 피한다)이고, 피해는 돌진하는 보스 몸에 부딪힐 때만 (몸통 접촉 피해와 별도로 한 번)
    rush(g, e, s, dm) {
      const a = Math.atan2(g.player.y - e.y, g.player.x - e.x), L = s.len;
      e.rush = { t: -s.warn, a, time: s.time, speed: L / s.time, rest: s.rest };
      e.castT = s.warn + s.time + s.rest;
      E.hazard(g, { kind: 'band', style: 'rush', owner: e, x: e.x + (Math.cos(a) * L) / 2, y: e.y + (Math.sin(a) * L) / 2, a, w: e.r + 16, len: L / 2,
        warn: s.warn, dur: s.time, dmg: s.damage * dm, rush: true });
      E.shout(g, e, '로켓 발진!', '#1971c2');
    },
    // 과제 정기 보고: 돋보기 표적이 플레이어를 따라오다가(내 걸음보다 조금 느리게), 멈추면(확인!) 그 자리가 터진다
    check(g, e, s, dm) {
      for (let i = 0; i < s.count; i++) {
        E.hazard(g, { kind: 'circle', style: 'check', owner: e, x: g.player.x, y: g.player.y, r: s.radius,
          warn: s.warn, dur: 0.25, dmg: s.damage * dm, delay: i * s.gap, track: { speed: s.speed, lock: s.lock } });
      }
      e.castT = 0.5;
      E.shout(g, e, '진도 체크하겠습니다!', '#e67700');
    },
    // 졸업논문 심사: 보스 반대쪽 화면 안에 조명(안전한 원)을 켜고, 조명 밖을 전부 터뜨린다
    spotlight(g, e, s, dm) {
      const pl = g.player, a = Math.atan2(pl.y - e.y, pl.x - e.x) + (g.rand() - 0.5) * 2;
      const d = Math.max(60, Math.min(s.dist, Math.min(g.viewW, g.viewH) / 2 - s.radius - 30));
      E.hazard(g, { kind: 'ring', style: 'spot', owner: e, x: pl.x + Math.cos(a) * d, y: pl.y + Math.sin(a) * d, r0: s.radius, r1: 2400,
        warn: s.warn, dur: 0.3, dmg: s.damage * dm });
      e.castT = 0.8;
      E.shout(g, e, '발표자는 조명 안으로!', '#1864ab');
    },
  };

  E.hazard = function (g, h) {
    h.t = -(h.delay || 0);
    h.hit = false;
    h.fired = false;
    h.placed = h.t >= 0;
    h.oid = h.owner ? h.owner.id : 0;
    if (h.placed) g.sfx('warn');
    g.hazards.push(h);
    return h;
  };

  E.updateHazards = function (g, dt) {
    const hz = g.hazards;
    if (!hz.length || g.freezeTimer > 0) return;
    const pl = g.player;
    for (let i = hz.length - 1; i >= 0; i--) {
      const h = hz[i], o = h.owner;
      // 보스가 쓰러지면 남은 예고도 사라진다 (질문 벽은 이미 날아간 탄이 있으니 끝까지 둔다)
      if (o && (!o.active || o.id !== h.oid) && !(h.keep && h.fired)) { hz[i] = hz[hz.length - 1]; hz.pop(); continue; }
      h.t += dt;
      if (h.t < 0) continue;
      if (!h.placed) { // 늦게 나타나는 예고: 이때 플레이어가 갈 곳을 노린다
        h.placed = true;
        const sc = h.scatter || 0, ra = g.rand() * TAU, rd = g.rand() * sc;
        h.x = pl.x + (pl.vx || 0) * (h.lead || 0) + Math.cos(ra) * rd;
        h.y = pl.y + (pl.vy || 0) * (h.lead || 0) + Math.sin(ra) * rd;
        if (h.turn) h.a = g.rand() * Math.PI;
        g.sfx('warn');
      }
      if (h.follow && o && o.active) { h.x = o.x; h.y = o.y; }
      if (h.track && h.t < h.warn - h.track.lock) { // 진도 체크: 멈추기 전까지 플레이어를 일정 속도로 따라간다
        const tx = pl.x - h.x, ty = pl.y - h.y, td = Math.hypot(tx, ty), step = h.track.speed * dt;
        if (td > step) { h.x += (tx / td) * step; h.y += (ty / td) * step; } else { h.x = pl.x; h.y = pl.y; }
      }
      if (h.t >= h.warn) {
        if (!h.fired) { h.fired = true; E.fireHazard(g, h); }
        // 로켓 발진은 띠 전체가 아니라 돌진하는 보스 몸에 닿을 때만 맞는다
        const inside = h.rush ? !!(o && o.active && Math.hypot(pl.x - o.x, pl.y - o.y) < o.r + pl.r * 0.75) : E.inHazard(h, pl.x, pl.y, pl.r * 0.75);
        if (h.dmg && !h.hit && !(h.link && h.link.hit) && inside) {
          h.hit = true;
          if (h.link) h.link.hit = true;
          g.hazardHits++;
          g.hurtPlayer(h.dmg);
          if (h.slow) g.slowPlayer(h.slow.amt, h.slow.time);
        }
      }
      if (h.t >= h.warn + h.dur) { hz[i] = hz[hz.length - 1]; hz.pop(); }
    }
  };

  // 예고가 끝나 터지는 순간: 탄을 내보내는 패턴은 여기서 쏜다
  E.fireHazard = function (g, h) {
    g.sfx(h.style === 'laser' || h.style === 'wall' ? 'zap' : 'blast');
    g.emit('hazard', h);
    const s = h.sk;
    if (h.style === 'sneeze') {
      for (let i = 0; i < s.count; i++) {
        const a = h.a + (g.rand() - 0.5) * 2 * h.half, sp = s.speed * (0.65 + g.rand() * 0.6);
        heavy(h.owner, E.shoot(g, h.x + Math.cos(a) * 20, h.y + Math.sin(a) * 20, a, sp, s.damage * 0.7 * h.dm, 'germ', s.slow, 2.2));
      }
      if (h.owner) E.shout(g, h.owner, '에취!', '#2f9e44');
    } else if (h.style === 'wall') {
      const px = -h.uy, py = h.ux;
      for (let i = 0; i < s.count; i++) {
        if (i >= h.g0 && i < h.g0 + s.gap) continue;
        const o = (i - (s.count - 1) / 2) * s.spacing;
        heavy(h.owner, E.shoot(g, h.x + px * o, h.y + py * o, Math.atan2(h.uy, h.ux), s.speed, s.damage * h.dm, s.style, null, h.dur));
      }
    }
  };

  // 점(x, y)이 반지름 pr 만큼 예고 지역에 걸치는지
  E.inHazard = function (h, x, y, pr) {
    const dx = x - h.x, dy = y - h.y;
    switch (h.kind) {
      case 'circle': return dx * dx + dy * dy < (h.r + pr) * (h.r + pr);
      case 'band': {
        const c = Math.cos(h.a), s = Math.sin(h.a);
        return Math.abs(dx * c + dy * s) <= h.len + pr && Math.abs(-dx * s + dy * c) <= h.w + pr;
      }
      case 'cone': {
        const d = Math.hypot(dx, dy);
        if (d > h.r + pr) return false;
        if (d < pr + 24) return true;
        return Math.abs(angDiff(Math.atan2(dy, dx), h.a)) <= h.half + Math.asin(Math.min(1, pr / d));
      }
      case 'sweep': { // 지금 각도의 레이저(선분)에 닿는지
        const k = Math.min(1, Math.max(0, (h.t - h.warn) / h.dur)), a = h.a0 + (h.a1 - h.a0) * k;
        const c = Math.cos(a), s = Math.sin(a), along = dx * c + dy * s;
        return along > 0 && along < h.r + pr && Math.abs(-dx * s + dy * c) <= h.w + pr;
      }
      case 'ring': { // 고리 r0 ~ r1 (조명은 r1 이 아주 커서 '조명 밖 전부'. 몸이 조금이라도 걸치면 맞는다)
        const d = Math.hypot(dx, dy);
        return d + pr > h.r0 && d - pr < h.r1;
      }
    }
    return false;
  };

  // 봇용: 예고 지역 안에 있으면 빠져나갈 방향(단위 벡터), 아니면 null
  E.escape = function (h, x, y, pr) {
    const dx = x - h.x, dy = y - h.y;
    if (h.kind === 'wall') { // 벽이 다가오면 빈틈 쪽으로 옆걸음
      const t = Math.max(0, h.t - h.warn), wx = h.x + h.ux * h.speed * t, wy = h.y + h.uy * h.speed * t;
      const ahead = (x - wx) * h.ux + (y - wy) * h.uy;
      if (ahead < -30 || ahead > 420) return null;
      const px = -h.uy, py = h.ux, side = (x - wx) * px + (y - wy) * py - h.gapOff;
      if (Math.abs(side) < h.gapW / 2 - pr * 0.6) return null;
      const sg = side > 0 ? -1 : 1;
      return { x: px * sg, y: py * sg };
    }
    if (h.kind === 'sweep' || h.kind === 'cone') {
      const fake = { kind: 'cone', x: h.x, y: h.y, a: h.a, half: h.half, r: h.r };
      if (!E.inHazard(fake, x, y, pr)) return null;
      const d = Math.hypot(dx, dy) || 1, diff = angDiff(Math.atan2(dy, dx), h.a);
      const toEdge = (h.half - Math.abs(diff)) * d, toOut = h.r - d;
      if (toOut < toEdge) return { x: dx / d, y: dy / d };
      const sg = diff > 0 ? 1 : -1; // 가까운 모서리 쪽으로 돌아 나간다
      return { x: -dy / d * sg, y: dx / d * sg };
    }
    if (!E.inHazard(h, x, y, pr)) return null;
    if (h.kind === 'circle') {
      const d = Math.hypot(dx, dy);
      return d > 1 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
    }
    if (h.kind === 'ring') { // 조명은 안쪽으로, 카운트다운 고리는 바깥으로 달아난다
      const d = Math.hypot(dx, dy);
      if (h.r1 > 1000) return d > 1 ? { x: -dx / d, y: -dy / d } : null;
      return d > 1 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
    }
    const c = Math.cos(h.a), s = Math.sin(h.a), ly = -dx * s + dy * c, sg = ly >= 0 ? 1 : -1; // band: 가까운 긴 변 쪽
    return { x: -s * sg, y: c * sg };
  };

  // slow: { amt, time } 가 있으면 맞았을 때 플레이어가 느려진다 (감기 세균)
  // life: 남아 있는 시간(기본 6초). 속도 0 이면 바닥에 남는 점 (플롯 그리기)
  E.shoot = function (g, x, y, a, spd, dmg, style, slow, life) {
    if (g.enemyShots.length > 400) return null;
    const s = { x, y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: style === 'paper' || style === 'plot' ? 7 : 9, dmg, life: life || 6, style, a, slow: slow || null, born: g.time, owner: 0 };
    g.enemyShots.push(s);
    return s;
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

    onChapterStart() { this.timer = 0; this.ev = 0; this.bossDone = false; this.midDone = false; this.bossWarned = false; }

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
        const seg = this._phdSeg || (this._phdSeg = { pool: P.pool, batch: P.batch, rangedMax: P.rangedMax });
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
        const final = g.chapterIndex === g.chapters.length - 1; // 4차 보스 = 취업 조건인 최종 보스
        if (final && ch.boss && !this.bossWarned && g.chapterTime >= ch.boss.t - 10) {
          this.bossWarned = true;
          const fb = g.data.enemies[ch.boss.enemy];
          g.toast(`${fb.sprite.emoji || '⚠️'} 10초 뒤 최종 보스 「${fb.name}」 등장! 4학기가 끝나기 전에 쓰러뜨려야 취업`, '#ff8787');
          g.sfx('warn');
        }
        if (ch.boss && !this.bossDone && g.chapterTime >= ch.boss.t) {
          this.bossDone = true;
          this.spawnBoss(ch.boss.enemy, 1, ch.boss.msg, final ? 'FINAL BOSS' : '', final);
        }
      }
      const seg = this.segment();
      const n = g.enemies.length;
      // 최소 유지 수 미만이면 0.1초마다 batch 만큼 보충
      this.refillT -= dt;
      if (n < seg.min && this.refillT <= 0) {
        this.refillT = 0.1;
        this.spawnPool(seg.pool, Math.min(seg.batch, Math.ceil(seg.min - n)), seg.rangedMax);
      }
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = seg.interval;
        // 처치가 밀려도 필드 적이 끝없이 쌓이지 않도록 최소 유지 수의 약 2배에서 멈춘다
        if (n < (seg.cap || seg.min * 2 + 20)) this.spawnPool(seg.pool, seg.batch, seg.rangedMax);
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

    spawnPool(pool, n, rangedMax) {
      const g = this.g, hp = this.hpMult();
      let ranged = -1;
      for (let i = 0; i < n; i++) {
        if (g.enemies.length >= g.cfg.maxEnemies) return;
        const id = U.weightedPick(g.rand, pool);
        if (rangedMax !== undefined && g.data.enemies[id].ai === 'ranged') { // 탄을 쏘는 적은 정해진 수까지만
          if (ranged < 0) ranged = g.enemies.reduce((c, e) => c + (e.active && e.ai === 'ranged' ? 1 : 0), 0);
          if (ranged >= rangedMax) continue;
          ranged++;
        }
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

    // near: 화면 안(플레이어에서 조금 떨어진 곳)에 나타나 바로 보이게 한다 (최종 보스)
    spawnBoss(id, extraHp, msg, label, near) {
      const g = this.g;
      let p = this.randomEdge();
      if (near) {
        const a = g.rand() * TAU, d = Math.min(g.viewW, g.viewH) / 2 - 90;
        p = { x: g.player.x + Math.cos(a) * d, y: g.player.y + Math.sin(a) * d };
      }
      const e = E.spawn(g, id, p.x, p.y, { hpMult: this.hpMult() * (extraHp || 1), rank: label });
      g.emit('banner', { title: `${label || 'BOSS'} · ${e.def.name}`, sub: msg || '', kind: 'boss' });
      g.sfx('boss');
      return e;
    }
  }

  GS.Spawner = Spawner;
})(window.GS = window.GS || {});
