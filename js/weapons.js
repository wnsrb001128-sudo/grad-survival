// 무기 공격 방식(behavior)과 투사체 처리
(function (GS) {
  'use strict';
  const W = GS.Weapons = {};
  const TAU = Math.PI * 2;
  const KEY_GLYPHS = ['A', 'S', 'D', 'F', 'J', 'K', ';', 'Q', 'W', 'E', 'R', 'ㄱ', 'ㄴ', 'ㅏ', 'ㅓ', '?', '!', 'Fn'];

  // 레벨·스탯을 반영한 최종 수치 계산 (레벨업/패시브 변경 시 호출)
  W.refresh = function (g, w) {
    const def = w.def, b = def.base, s = g.stats;
    let dmg = b.damage || 0, cd = b.cooldown || 0, amt = b.amount || 0, pierce = b.pierce || 1;
    let area = 1, spd = 1, dur = b.duration || 0, hit = b.hitInterval || 0;
    const L = def.levels || [];
    for (let i = 0; i < w.level - 1 && i < L.length; i++) {
      const l = L[i];
      dmg += l.damage || 0; cd += l.cooldown || 0; amt += l.amount || 0; pierce += l.pierce || 0;
      area += l.area || 0; spd += l.speed || 0; dur += l.duration || 0; hit += l.hitInterval || 0;
    }
    const p = w.p || (w.p = {});
    for (const k in b) p[k] = b[k];
    p.damage = dmg * s.might;
    p.cooldown = Math.max(0.05, cd * s.cooldown);
    p.amount = Math.max(1, amt + s.amount);
    p.pierce = pierce < 0 ? 9999 : pierce;
    p.area = area * s.area;
    p.speed = (b.speed || 0) * spd * s.projSpeed;
    p.duration = dur * s.duration;
    p.hitInterval = Math.max(0.12, hit * (def.behavior === 'aura' ? s.cooldown : 1));
  };

  // 진화 등으로 무기가 바뀔 때 날아가던 투사체 정리
  W.cleanup = function (g, w) {
    for (let i = 0; i < g.projectiles.length; i++) if (g.projectiles[i].w === w) g.projectiles[i].dead = true;
  };

  W.update = function (g, dt) {
    if (g.jamTimer <= 0) {
      for (let i = 0; i < g.weapons.length; i++) {
        const w = g.weapons[i], fn = BEHAVIORS[w.def.behavior];
        if (fn) fn(g, w, dt);
      }
    }
    updateProjectiles(g, dt);
  };

  // 같은 무기가 같은 적을 interval 초 안에 다시 때리지 못하게
  function canHit(g, e, w, interval) {
    const last = e.lastHit[w.uid];
    if (last !== undefined && g.time - last < interval) return false;
    e.lastHit[w.uid] = g.time;
    return true;
  }

  function shoot(g, w, x, y, a, extra) {
    const p = w.p;
    const pr = {
      kind: 'bullet', w, x, y, a,
      vx: Math.cos(a) * p.speed, vy: Math.sin(a) * p.speed,
      r: (p.size || 8) * Math.sqrt(p.area),
      life: p.life || 1, t: 0,
      damage: p.damage, pierce: p.pierce, hits: [],
      kb: p.knockback || 0, style: w.def.style,
      homing: p.homing || 0, target: null, lock: false,
      glyph: null, spin: 0, rot: 0, fizzle: false, wob: 0, dead: false,
    };
    if (extra) Object.assign(pr, extra);
    g.projectiles.push(pr);
    return pr;
  }

  function shock(g, w, x, y, cfg, color) {
    g.projectiles.push({
      kind: 'shock', w, x, y, t: 0, dur: cfg.dur || 0.35, r0: 16, R: 16,
      r1: cfg.radius * w.p.area, damage: cfg.damage * g.stats.might, kb: cfg.knockback || 0,
      hits: new Set(), color, dead: false,
    });
  }

  const BEHAVIORS = {
    // 펜 / 교수님의 빨간펜: 가까운 적을 자동 조준해 끝까지 쫓아가 반드시 명중
    // (대상이 먼저 죽거나 관통이 남으면 근처의 다른 적으로 갈아탄다)
    shoot_lock(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player;
      const ts = g.nearestEnemies(pl.x, pl.y, p.range || 650, p.amount);
      if (!ts.length) { w.timer = 0.15; return; }
      w.timer = p.cooldown;
      const sp = ((p.spread || 6) * Math.PI) / 180;
      for (let i = 0; i < p.amount; i++) {
        const t = ts[i % ts.length], k = Math.floor(i / ts.length);
        // 적이 발사 수보다 적으면 같은 적에게 부채꼴로 던진다
        const a = Math.atan2(t.y - pl.y, t.x - pl.x) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * sp;
        shoot(g, w, pl.x + Math.cos(a) * 12, pl.y + Math.sin(a) * 12, a, { target: t, lock: true });
      }
    },

    // 마우스: 가까운 적 방향으로 곧게 날아가며 길 위의 적을 모두 관통
    shoot_nearest(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player;
      const ts = g.nearestEnemies(pl.x, pl.y, 720, p.amount);
      if (!ts.length) { w.timer = 0.15; return; }
      w.timer = p.cooldown;
      for (let i = 0; i < p.amount; i++) {
        const t = ts[i % ts.length];
        const a = Math.atan2(t.y - pl.y, t.x - pl.x) + (i >= ts.length ? (g.rand() - 0.5) * 0.4 : 0);
        shoot(g, w, pl.x, pl.y, a, { target: t });
      }
    },

    // 키보드 / 기계식 키보드: 사방으로 키캡 + (진화 시) 충격파
    radial(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player, st = w.state;
      w.timer = p.cooldown;
      st.rot = (st.rot || 0) + 0.39;
      const n = p.amount;
      for (let i = 0; i < n; i++) {
        const a = st.rot + (i / n) * TAU;
        shoot(g, w, pl.x, pl.y, a, { glyph: KEY_GLYPHS[(g.rand() * KEY_GLYPHS.length) | 0], spin: (g.rand() - 0.5) * 8 });
      }
      if (p.shockwave) {
        shock(g, w, pl.x, pl.y, p.shockwave, '#4dabf7');
        g.addText(pl.x, pl.y - 42, '딸깍!', '#1c7ed6', 18);
      }
    },

    // 개인 PC / 워크스테이션: 주변 지속 피해 (+ 진화 시 주기적 과열 폭발)
    aura(g, w, dt) {
      const p = w.p, pl = g.player, st = w.state;
      st.radius = (p.radius || 70) * p.area;
      if ((w.timer -= dt) <= 0) {
        w.timer = p.hitInterval;
        const list = g.enemiesNear(pl.x, pl.y, st.radius, g.qbuf);
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e.active) continue;
          const dx = e.x - pl.x, dy = e.y - pl.y, rr = st.radius + e.r * 0.5, d2 = dx * dx + dy * dy;
          if (d2 > rr * rr) continue;
          const d = Math.sqrt(d2) || 1;
          g.damageEnemy(e, p.damage, w, dx / d, dy / d, p.knockback || 0);
        }
        st.tick = 0.15;
      }
      if (st.tick > 0) st.tick -= dt;
      if (p.pulse) {
        st.pt = (st.pt === undefined ? p.pulse.every : st.pt) - dt;
        if (st.pt <= 0) {
          st.pt = p.pulse.every * g.stats.cooldown;
          shock(g, w, pl.x, pl.y, p.pulse, '#ff6b6b');
          g.addText(pl.x, pl.y - 46, '과열!', '#e03131', 18);
        }
      }
    },

    // 전공서적 / 학위논문: 주위를 도는 책
    orbit(g, w, dt) {
      const p = w.p, pl = g.player, st = w.state;
      if (st.on === undefined) { st.on = true; st.t = 0; st.ang = 0; st.pos = []; }
      st.t += dt;
      if (st.on) { if (st.t >= p.duration) { st.on = false; st.t = 0; } }
      else if (st.t >= p.cooldown) { st.on = true; st.t = 0; }
      st.pos.length = 0;
      if (!st.on) return;
      st.ang += p.speed * dt;
      const n = p.amount, R = (p.radius || 80) * p.area, sz = (p.size || 14) * Math.sqrt(p.area);
      st.size = sz;
      for (let i = 0; i < n; i++) {
        const a = st.ang + (i / n) * TAU;
        const x = pl.x + Math.cos(a) * R, y = pl.y + Math.sin(a) * R;
        st.pos.push(x, y);
        const list = g.enemiesNear(x, y, sz, g.qbuf);
        for (let j = 0; j < list.length; j++) {
          const e = list[j];
          if (!e.active) continue;
          const dx = e.x - x, dy = e.y - y, rr = sz + e.r;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (!canHit(g, e, w, p.hitInterval)) continue;
          const ex = e.x - pl.x, ey = e.y - pl.y, ed = Math.hypot(ex, ey) || 1;
          g.damageEnemy(e, p.damage, w, ex / ed, ey / ed, p.knockback || 0);
        }
      }
    },

    // 클로드: 따라다니는 AI 조수가 가장 위협적인 적에게 유도탄
    companion(g, w, dt) {
      const p = w.p, pl = g.player, st = w.state;
      if (st.x === undefined) { st.x = pl.x - 40; st.y = pl.y - 40; st.ph = 0; st.flash = 0; }
      st.ph += dt;
      const tx = pl.x + Math.cos(st.ph * 1.1) * 44, ty = pl.y - 34 + Math.sin(st.ph * 2.2) * 10;
      const k = Math.min(1, dt * 6);
      st.x += (tx - st.x) * k;
      st.y += (ty - st.y) * k;
      if (st.flash > 0) st.flash -= dt;
      if ((w.timer -= dt) > 0) return;
      const ts = g.strongestEnemies(pl.x, pl.y, p.range || 520, p.amount);
      if (!ts.length) { w.timer = 0.2; return; }
      w.timer = p.cooldown;
      for (let i = 0; i < p.amount; i++) {
        const t = ts[i % ts.length];
        const a = Math.atan2(t.y - st.y, t.x - st.x) + (i - (p.amount - 1) / 2) * 0.25;
        shoot(g, w, st.x, st.y, a, { target: t });
      }
      st.flash = 0.15;
    },

    // 클로드 코드: 서브에이전트들이 알아서 적을 처리
    agents(g, w, dt) {
      const p = w.p, pl = g.player, st = w.state;
      const list = st.list || (st.list = []);
      while (list.length < p.amount) list.push({ x: pl.x, y: pl.y, t: null, rt: 0, ph: g.rand() * TAU });
      while (list.length > p.amount) list.pop();
      const R = p.range || 600, sz = (p.size || 11) * Math.sqrt(p.area);
      st.size = sz;
      for (let ai = 0; ai < list.length; ai++) {
        const a = list[ai];
        a.rt -= dt;
        const t = a.t;
        if (!t || !t.active || a.rt <= 0 || (t.x - pl.x) * (t.x - pl.x) + (t.y - pl.y) * (t.y - pl.y) > R * R) {
          a.t = pickAgentTarget(g, a, list, R);
          a.rt = 1.0;
        }
        let tx, ty;
        if (a.t) { tx = a.t.x; ty = a.t.y; }
        else { a.ph += dt * 2.5; tx = pl.x + Math.cos(a.ph) * 70; ty = pl.y + Math.sin(a.ph) * 70; }
        const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy) || 1;
        const step = Math.min(d, p.speed * dt);
        a.x += (dx / d) * step;
        a.y += (dy / d) * step;
        const near = g.enemiesNear(a.x, a.y, sz, g.qbuf);
        for (let j = 0; j < near.length; j++) {
          const e = near[j];
          if (!e.active) continue;
          const ex = e.x - a.x, ey = e.y - a.y, rr = sz + e.r;
          if (ex * ex + ey * ey > rr * rr) continue;
          if (!canHit(g, e, w, p.hitInterval)) continue;
          const ed = Math.hypot(ex, ey) || 1;
          g.damageEnemy(e, p.damage, w, ex / ed, ey / ed, p.knockback || 0);
        }
      }
    },

    // GPT: 가까운 적 방향 관통 레이저
    beam(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player;
      const ts = g.nearestEnemies(pl.x, pl.y, 650, p.amount);
      if (!ts.length) { w.timer = 0.2; return; }
      w.timer = p.cooldown;
      for (let i = 0; i < p.amount; i++) {
        const t = ts[i % ts.length];
        const a = Math.atan2(t.y - pl.y, t.x - pl.x) + (i >= ts.length ? (i - ts.length + 1) * 0.35 : 0);
        g.projectiles.push({
          kind: 'beam', w, a, x: pl.x, y: pl.y, len: p.length * p.area, width: p.width * Math.sqrt(p.area),
          t: 0, dur: p.duration || 0.3, damage: p.damage, kb: p.knockback || 0, hits: new Set(), style: w.def.style, dead: false,
        });
      }
    },

    // Codex: 플레이어 주위를 도는 회전 레이저
    beam_spin(g, w, dt) {
      const p = w.p, pl = g.player, st = w.state;
      st.ang = (st.ang || 0) + p.speed * dt;
      const n = p.amount, len = p.length * p.area, wid = p.width * Math.sqrt(p.area);
      st.len = len;
      st.wid = wid;
      const list = g.enemiesNear(pl.x, pl.y, len, g.qbuf);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (!e.active) continue;
        const ex = e.x - pl.x, ey = e.y - pl.y, ed2 = ex * ex + ey * ey;
        if (ed2 > (len + e.r) * (len + e.r)) continue;
        for (let i = 0; i < n; i++) {
          const a = st.ang + (i / n) * TAU, cx = Math.cos(a), cy = Math.sin(a);
          if (ex * cx + ey * cy < 0) continue;
          if (Math.abs(ex * cy - ey * cx) > wid / 2 + e.r) continue;
          if (canHit(g, e, w, p.hitInterval)) {
            const ed = Math.sqrt(ed2) || 1;
            g.damageEnemy(e, p.damage, w, ex / ed, ey / ed, p.knockback || 0);
          }
          break;
        }
      }
    },

    // 제미나이: 아무 방향으로나 발사, 일부는 환각(피해 없음)
    random_shot(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player;
      w.timer = p.cooldown;
      for (let i = 0; i < p.amount; i++) {
        shoot(g, w, pl.x, pl.y, g.rand() * TAU, { fizzle: g.rand() < (p.fizzle || 0), wob: g.rand() * TAU });
      }
    },

    // 게이밍 마우스: 적 무리를 드래그 선택 후 Delete
    drag_select(g, w, dt) {
      if ((w.timer -= dt) > 0) return;
      const p = w.p, pl = g.player;
      const ts = g.nearestEnemies(pl.x, pl.y, 640, 24);
      if (!ts.length) { w.timer = 0.2; return; }
      w.timer = p.cooldown;
      for (let i = 0; i < p.amount; i++) {
        const t = ts[(g.rand() * ts.length) | 0];
        g.projectiles.push({
          kind: 'box', w, x: t.x + (g.rand() - 0.5) * 30, y: t.y + (g.rand() - 0.5) * 30,
          bw: p.boxW * p.area, bh: p.boxH * p.area, t: 0, delay: p.delay || 0.25, dur: (p.delay || 0.25) + 0.3,
          fired: false, damage: p.damage, dead: false,
        });
      }
    },
  };

  function pickAgentTarget(g, a, list, R) {
    const pl = g.player, en = g.enemies;
    let best = null, bd = Infinity;
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      if (!e.active) continue;
      if ((e.x - pl.x) * (e.x - pl.x) + (e.y - pl.y) * (e.y - pl.y) > R * R) continue;
      let taken = false;
      for (let k = 0; k < list.length; k++) if (list[k] !== a && list[k].t === e) { taken = true; break; }
      if (taken) continue;
      const d = (e.x - a.x) * (e.x - a.x) + (e.y - a.y) * (e.y - a.y);
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  // ───────── 투사체 ─────────
  function updateProjectiles(g, dt) {
    const ps = g.projectiles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.dead) continue;
      if (p.kind === 'bullet') updBullet(g, p, dt);
      else if (p.kind === 'shock') updShock(g, p, dt);
      else if (p.kind === 'beam') updBeam(g, p, dt);
      else if (p.kind === 'box') updBox(g, p, dt);
    }
    let j = 0;
    for (let i = 0; i < ps.length; i++) if (!ps[i].dead) ps[j++] = ps[i];
    ps.length = j;
  }

  function turnToward(p, want, maxTurn) {
    let cur = Math.atan2(p.vy, p.vx), diff = want - cur;
    while (diff > Math.PI) diff -= TAU;
    while (diff < -Math.PI) diff += TAU;
    cur += Math.max(-maxTurn, Math.min(maxTurn, diff));
    const sp = Math.hypot(p.vx, p.vy);
    p.vx = Math.cos(cur) * sp;
    p.vy = Math.sin(cur) * sp;
  }

  // 아직 맞히지 않은 가장 가까운 적 (펜이 다음 대상으로 갈아탈 때)
  function retarget(g, p) {
    const list = g.nearestEnemies(p.x, p.y, 360, 4);
    for (let i = 0; i < list.length; i++) if (p.hits.indexOf(list[i].id) < 0) return list[i];
    return null;
  }

  function updBullet(g, p, dt) {
    p.t += dt;
    if (p.t >= p.life) { p.dead = true; return; }
    if (p.target && !p.target.active) p.target = p.lock ? retarget(g, p) : null;
    if (p.target) {
      const t = p.target;
      if (p.lock) {
        // 반드시 명중: 매 프레임 대상 쪽으로 곧장 방향을 튼다 (펜이 어떤 적보다 빠르다)
        const dx = t.x - p.x, dy = t.y - p.y, d = Math.hypot(dx, dy) || 1, sp = Math.hypot(p.vx, p.vy);
        p.vx = (dx / d) * sp;
        p.vy = (dy / d) * sp;
      } else if (p.homing) turnToward(p, Math.atan2(t.y - p.y, t.x - p.x), p.homing * dt);
    }
    if (p.fizzle) turnToward(p, Math.atan2(p.vy, p.vx) + Math.sin(p.t * 9 + p.wob) * 2, 4 * dt);
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.a = Math.atan2(p.vy, p.vx);
    if (p.spin) p.rot += p.spin * dt;
    if (p.fizzle) return;
    const list = g.enemiesNear(p.x, p.y, p.r, g.qbuf);
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (!e.active) continue;
      const dx = e.x - p.x, dy = e.y - p.y, rr = p.r + e.r;
      if (dx * dx + dy * dy > rr * rr) continue;
      if (p.hits.indexOf(e.id) >= 0) continue;
      p.hits.push(e.id);
      const sp = Math.hypot(p.vx, p.vy) || 1;
      g.damageEnemy(e, p.damage, p.w, p.vx / sp, p.vy / sp, p.kb);
      if (--p.pierce <= 0) { p.dead = true; return; }
      if (p.lock) p.target = retarget(g, p); // 관통이 남았으면 다음 적을 쫓는다
    }
  }

  function updShock(g, p, dt) {
    p.t += dt;
    if (p.t >= p.dur) { p.dead = true; return; }
    p.R = p.r0 + (p.r1 - p.r0) * (p.t / p.dur);
    const list = g.enemiesNear(p.x, p.y, p.R, g.qbuf);
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (!e.active || p.hits.has(e.id)) continue;
      const dx = e.x - p.x, dy = e.y - p.y, d2 = dx * dx + dy * dy, rr = p.R + e.r;
      if (d2 > rr * rr) continue;
      p.hits.add(e.id);
      const d = Math.sqrt(d2) || 1;
      g.damageEnemy(e, p.damage, p.w, dx / d, dy / d, p.kb);
    }
  }

  function updBeam(g, p, dt) {
    p.t += dt;
    if (p.t >= p.dur) { p.dead = true; return; }
    const pl = g.player;
    p.x = pl.x;
    p.y = pl.y;
    const cx = Math.cos(p.a), cy = Math.sin(p.a);
    const list = g.enemiesNear(pl.x + (cx * p.len) / 2, pl.y + (cy * p.len) / 2, p.len / 2 + p.width, g.qbuf);
    for (let j = 0; j < list.length; j++) {
      const e = list[j];
      if (!e.active || p.hits.has(e.id)) continue;
      const ex = e.x - pl.x, ey = e.y - pl.y, proj = ex * cx + ey * cy;
      if (proj < -e.r || proj > p.len + e.r) continue;
      if (Math.abs(ex * cy - ey * cx) > p.width / 2 + e.r) continue;
      p.hits.add(e.id);
      g.damageEnemy(e, p.damage, p.w, cx, cy, p.kb);
    }
  }

  function updBox(g, p, dt) {
    p.t += dt;
    if (!p.fired && p.t >= p.delay) {
      p.fired = true;
      const hw = p.bw / 2, hh = p.bh / 2;
      const list = g.enemiesNear(p.x, p.y, Math.hypot(hw, hh), g.qbuf);
      for (let j = 0; j < list.length; j++) {
        const e = list[j];
        if (!e.active) continue;
        if (Math.abs(e.x - p.x) > hw + e.r * 0.5 || Math.abs(e.y - p.y) > hh + e.r * 0.5) continue;
        g.damageEnemy(e, p.damage, p.w, 0, 0, 0);
      }
      g.addText(p.x, p.y - hh - 6, 'Delete', '#e03131', 16);
    }
    if (p.t >= p.dur) p.dead = true;
  }
})(window.GS = window.GS || {});
