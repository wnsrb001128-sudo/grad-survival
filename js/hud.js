// HUD: 지식 막대 · 시계와 학기 진행 막대 · 보스 체력 · 연구 실적 · 무기/패시브 칸 · 화면 밖 표시 · 알림 · 배너
// 그리고 화면 전체 효과 (멘탈 위험 붉은빛, 해외출장 성에, 강제 재부팅 화면 깨짐, 번아웃 흑백)
(function (GS) {
  'use strict';
  const U = GS.util, R = GS.R, TAU = R.TAU, P = GS.Renderer.prototype;
  const rr = R.roundRect, FONT = R.FONT;
  const CH_COL = ['#3b5bdb', '#0ca678', '#f76707', '#7048e8'];

  // 가짜 그림자가 있는 흰 카드
  P.card = function (ctx, x, y, w, h, r, fill, stroke) {
    ctx.fillStyle = 'rgba(20,30,55,0.13)';
    rr(ctx, x + 1, y + 3, w, h, r);
    ctx.fill();
    ctx.fillStyle = fill || 'rgba(255,255,255,0.95)';
    rr(ctx, x, y, w, h, r);
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  P.shineSprite = function () {
    return this.sprite('shine', 120, 20, (x) => {
      const g = x.createLinearGradient(0, 0, 120, 0);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.6)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(30, 0);
      x.lineTo(120, 0);
      x.lineTo(90, 20);
      x.lineTo(0, 20);
      x.closePath();
      x.fill();
    });
  };

  // 교수님 해외출장: 화면 가장자리에 낀 성에
  P.frostSprite = function () {
    return this.sprite('frost', 640, 360, (x, w, h) => {
      x.drawImage(this.vignette('ice'), 0, 0, w, h);
      const rnd = GS.util.mulberry32(77);
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineCap = 'round';
      for (let i = 0; i < 110; i++) {
        const side = i % 4;
        const px = side < 2 ? rnd() * w : side === 2 ? rnd() * 50 : w - rnd() * 50;
        const py = side >= 2 ? rnd() * h : side === 0 ? rnd() * 40 : h - rnd() * 40;
        const s = 3 + rnd() * 7;
        x.lineWidth = 1;
        x.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = (k * Math.PI) / 3 + rnd() * 0.3;
          x.moveTo(px - Math.cos(a) * s, py - Math.sin(a) * s);
          x.lineTo(px + Math.cos(a) * s, py + Math.sin(a) * s);
        }
        x.stroke();
      }
    });
  };

  // ───────── 화면 전체 효과 ─────────
  P.drawOverlays = function (ctx, g) {
    const W = this.cssW, H = this.cssH, pl = g.player;
    if (g.freezeTimer > 0) {
      const k = Math.min(1, g.freezeTimer / 0.6);
      ctx.globalAlpha = 0.95 * k;
      ctx.drawImage(this.frostSprite(), 0, 0, W, H);
      ctx.fillStyle = 'rgba(165,216,255,0.12)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    const low = pl.hp / pl.maxHp;
    let red = 0;
    if (low < 0.35) red = ((0.35 - low) / 0.35) * (0.45 + 0.4 * Math.max(0, Math.sin(this.t * 6.5))); // 심장 박동
    if (pl.hurt > 0) red = Math.max(red, 0.45 + pl.hurt * 2.5);
    if (this.warn > 0) red = Math.max(red, Math.min(1, this.warn / 0.6) * (0.3 + 0.3 * Math.sin(this.t * 12)));
    if (red > 0.01) {
      ctx.globalAlpha = Math.min(0.95, red);
      ctx.drawImage(this.vignette('red'), 0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.glitch > 0 || g.jamTimer > 0) this.drawGlitch(ctx, g);
    let fl = this.flash;
    for (let i = 0; i < g.effects.length; i++) {
      const e = g.effects[i];
      if (e.kind === 'flash') fl = Math.max(fl, 0.75 * (1 - e.t / e.dur));
    }
    if (fl > 0.01) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.9, fl).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (g.phase === 'gameover') { // 번아웃: 색이 빠진다
      const k = Math.min(1, (this.deadT || 1) / 0.9);
      ctx.globalCompositeOperation = 'saturation';
      ctx.fillStyle = `rgba(128,128,128,${k.toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(20,22,32,${(0.22 * k).toFixed(3)})`;
      ctx.fillRect(0, 0, W, H);
    } else if (g.phase === 'ending') {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.glow('#fcc419', 128), -W * 0.2, -H * 0.4, W * 1.4, H * 1.4);
      ctx.globalAlpha = 1;
    }
  };

  // 윈도우 업데이트 강제 재부팅: 화면이 파랗게 깨진다
  P.drawGlitch = function (ctx, g) {
    const W = this.cssW, H = this.cssH, d = this.dpr;
    const k = Math.max(this.glitch / 0.75, g.jamTimer > 0 ? 0.25 : 0);
    ctx.fillStyle = `rgba(28,126,214,${(0.05 + 0.07 * k).toFixed(3)})`;
    ctx.fillRect(0, 0, W, H);
    if (g.phase !== 'playing') return;
    const n = Math.round(1 + k * 6);
    for (let i = 0; i < n; i++) {
      const y = Math.random() * H, h = 3 + Math.random() * 22, dx = (Math.random() - 0.5) * 46 * k;
      ctx.drawImage(this.canvas, 0, y * d, W * d, h * d, dx, y, W, h);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    for (let y = (this.t * 60) % 4; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  };

  // ───────── 화면 밖 성소 · 보스 · Accept 메일 방향 (숫자 = 대략적인 거리) ─────────
  P.drawIndicators = function (ctx, g) {
    const pl = g.player, W = this.cssW, H = this.cssH, z = this.zoom, m = 46;
    const mark = (x, y, icon, color, pulse) => {
      const sx = (x - pl.x) * z + W / 2, sy = (y - pl.y) * z + H / 2;
      if (sx > 0 && sx < W && sy > 0 && sy < H) return;
      const dx = sx - W / 2, dy = sy - H / 2;
      const t = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6));
      const ix = W / 2 + dx * t, iy = H / 2 + dy * t, a = Math.atan2(dy, dx);
      const s = pulse ? 1 + Math.sin(this.t * 8) * 0.1 : 1, r = 20 * s;
      ctx.fillStyle = 'rgba(20,30,55,0.18)';
      ctx.beginPath();
      ctx.arc(ix + 1, iy + 3, r + 1, 0, TAU);
      ctx.fill();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * (r + 13), iy + Math.sin(a) * (r + 13));
      ctx.lineTo(ix + Math.cos(a + 0.55) * (r + 1), iy + Math.sin(a + 0.55) * (r + 1));
      ctx.lineTo(ix + Math.cos(a - 0.55) * (r + 1), iy + Math.sin(a - 0.55) * (r + 1));
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(ix, iy, r, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = color;
      ctx.stroke();
      this.drawIcon(ctx, icon, ix, iy, 25 * s);
      const dist = Math.round(Math.hypot(x - pl.x, y - pl.y) / 10);
      ctx.font = `800 10px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, dist + 'm', ix - Math.cos(a) * (r + 10), iy - Math.sin(a) * (r + 10), color, '#fff', 3);
    };
    for (let i = 0; i < g.sanctuaries.length; i++) { const s = g.sanctuaries[i]; mark(s.x, s.y, s.def.emoji, s.def.color, false); }
    for (let i = 0; i < g.items.length; i++) { const it = g.items[i]; if (it.id === 'accept') mark(it.x, it.y, '📩', '#f59f00', true); }
    for (let i = 0; i < g.bigEnemies.length; i++) { const e = g.bigEnemies[i]; if (e.boss && e.active) mark(e.x, e.y, e.def.sprite.emoji || '👿', '#c92a2a', true); }
  };

  // ───────── HUD ─────────
  P.drawHUD = function (ctx, g, dt) {
    const s = this.ui, W = this.cssW / s;
    ctx.save();
    ctx.scale(s, s);
    this.drawXpBar(ctx, g, W, dt);
    this.drawClock(ctx, g, W);
    this.drawBossBar(ctx, g, W, dt);
    this.drawScorePanel(ctx, g, W, dt);
    this.drawSlots(ctx, g);
    ctx.restore();
  };

  P.drawXpBar = function (ctx, g, W, dt) {
    const pl = g.player, h = this.hud, BH = 16;
    if (h.lvl !== pl.level) {
      if (h.lvl) { h.lvlFlash = 1; h.xp = 0; }
      h.lvl = pl.level;
    }
    const k = Math.min(1, pl.xp / pl.xpNext);
    h.xp += (k - h.xp) * Math.min(1, dt * 12);
    h.lvlFlash = Math.max(0, h.lvlFlash - dt * 1.4);
    ctx.fillStyle = '#141b2e';
    ctx.fillRect(0, 0, W, BH);
    const fw = W * h.xp;
    if (!this.xpGrad) {
      this.xpGrad = ctx.createLinearGradient(0, 0, 0, BH);
      this.xpGrad.addColorStop(0, '#a5d8ff');
      this.xpGrad.addColorStop(0.45, '#4dabf7');
      this.xpGrad.addColorStop(1, '#3b5bdb');
    }
    ctx.fillStyle = this.xpGrad;
    ctx.fillRect(0, 0, fw, BH);
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.fillRect(0, 0, fw, BH * 0.4);
    const sx = (((this.t * 0.45) % 1.8) - 0.4) * W;
    if (sx < fw) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, fw, BH);
      ctx.clip();
      ctx.drawImage(this.shineSprite(), sx - 60, 0, 120, BH);
      ctx.restore();
    }
    if (fw > 2) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(fw - 2, 0, 2, BH);
    }
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
    for (let i = 1; i < 10; i++) ctx.fillRect(Math.round((W * i) / 10), 4, 1, BH - 8);
    if (h.lvlFlash > 0) {
      ctx.fillStyle = `rgba(200,235,255,${(h.lvlFlash * 0.85).toFixed(3)})`;
      ctx.fillRect(0, 0, W, BH);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.fillRect(0, BH, W, 2);
    ctx.font = `800 12px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    this.outlined(ctx, `Lv ${pl.level}  ·  지식 ${Math.floor(pl.xp)}/${pl.xpNext}`, W - 10, 8.5, '#fff', 'rgba(10,20,40,0.7)', 3);
  };

  P.drawClock = function (ctx, g, W) {
    const cx = W / 2, top = 24, cw = 236, chh = 64, col = g.phd ? '#343a40' : CH_COL[g.chapterIndex % 4];
    this.card(ctx, cx - cw / 2, top, cw, chh, 16, 'rgba(255,255,255,0.95)', 'rgba(30,40,70,0.08)');
    ctx.fillStyle = col;
    rr(ctx, cx - 28, top - 3, 56, 6, 3);
    ctx.fill();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = R.dfont(32);
    ctx.fillStyle = '#1f2a5a';
    ctx.fillText(U.fmtTime(g.phd ? g.phdTime : g.time), cx, top + 25);
    const lab = g.chapterLabel();
    const sub = g.phd ? `🎓 박사 ${g.phdYear}년차 · 끝이 없다` : `${lab.name} · ${lab.title}  —  남은 시간 ${U.fmtTime(g.chapters[g.chapterIndex].duration - g.chapterTime)}`;
    ctx.font = `700 12.5px ${FONT}`;
    ctx.fillStyle = '#495057';
    ctx.fillText(sub, cx, top + 49, cw - 14);
    this.drawSemesterBar(ctx, g, cx, top + chh + 14, cw, col);
  };

  // 이번 학기 진행 막대: 작은 눈금 = 이벤트, 동그라미 = 중간보스·보스 등장 시각
  P.drawSemesterBar = function (ctx, g, cx, y, w, col) {
    const x0 = cx - w / 2, E = g.data.enemies, marks = [];
    let k;
    if (g.phd) k = (g.phdTime % g.data.phd.yearSeconds) / g.data.phd.yearSeconds;
    else {
      const ch = g.chapters[g.chapterIndex];
      k = Math.min(1, g.chapterTime / ch.duration);
      for (let i = 0; i < ch.events.length; i++) marks.push({ t: ch.events[i].t / ch.duration });
      if (ch.midBoss) marks.push({ t: ch.midBoss.t / ch.duration, icon: E[ch.midBoss.enemy].sprite.emoji, c: '#f76707' });
      if (ch.boss) marks.push({ t: ch.boss.t / ch.duration, icon: E[ch.boss.enemy].sprite.emoji, c: '#e03131' });
    }
    ctx.fillStyle = 'rgba(20,30,55,0.16)';
    rr(ctx, x0, y, w, 6, 3);
    ctx.fill();
    ctx.fillStyle = col;
    rr(ctx, x0, y, Math.max(6, w * k), 6, 3);
    ctx.fill();
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i], mx = x0 + w * m.t, passed = m.t <= k;
      if (!m.icon) {
        ctx.fillStyle = passed ? 'rgba(255,255,255,0.85)' : 'rgba(20,30,55,0.35)';
        ctx.fillRect(mx - 1, y - 1, 2, 8);
        continue;
      }
      ctx.globalAlpha = passed ? 0.55 : 1;
      ctx.beginPath();
      ctx.arc(mx, y + 3, 9, 0, TAU);
      ctx.fillStyle = '#fff';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = m.c;
      ctx.stroke();
      this.drawIcon(ctx, m.icon, mx, y + 3.5, 12);
      ctx.globalAlpha = 1;
    }
    const kx = x0 + w * k;
    ctx.beginPath();
    ctx.arc(kx, y + 3, 4.5, 0, TAU);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = col;
    ctx.stroke();
  };

  // 보스 체력 막대: 살아 있는 보스마다 하나씩, 먼저 나온 보스부터 위에서 아래로 쌓는다
  // (둘 이상이면 얇은 막대로 바꾸고, 4개를 넘으면 나머지는 '+n'으로 줄여 적는다)
  P.drawBossBar = function (ctx, g, W, dt) {
    const h = this.hud, bars = h.bars || (h.bars = new Map()), list = h.bossList || (h.bossList = []);
    list.length = 0;
    for (let i = 0; i < g.bigEnemies.length; i++) {
      const e = g.bigEnemies[i];
      if (e.boss && e.active) list.push(e);
    }
    for (const id of bars.keys()) if (!list.some((e) => e.id === id)) bars.delete(id); // 쓰러진 보스의 막대 정리
    if (!list.length) return;
    list.sort((p, q) => p.born - q.born || p.id - q.id);
    const MAX = 4, n = Math.min(list.length, MAX), compact = list.length > 1;
    const bw = Math.max(240, Math.min(520, W - 640)), bx = W / 2 - bw / 2 + 14, step = 40;
    for (let i = 0; i < n; i++) {
      const e = list[i];
      let st = bars.get(e.id);
      if (!st) { st = { lag: 1, in: 0 }; bars.set(e.id, st); }
      const k = Math.max(0, e.hp / e.maxHp);
      st.lag = Math.max(k, st.lag - dt * 0.3);
      st.in = Math.min(1, st.in + dt * 2.5);
      this.bossBarRow(ctx, e, st, k, W, bx, 142 + i * step, bw, compact);
    }
    if (list.length > n) {
      ctx.font = `800 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, `+ 보스 ${list.length - n}마리 더`, W / 2, 142 + n * step - 6, '#c92a2a', '#fff', 3.5);
    }
  };

  // 보스 막대 한 줄: [등급] 이름 / 체력 막대(노란 부분 = 방금 깎인 체력) / 초상화
  P.bossBarRow = function (ctx, boss, st, k, W, bx, by, bw, compact) {
    const BH = compact ? 13 : 18, PR = compact ? 16 : 21;
    const shake = boss.flash > 0 ? (Math.random() - 0.5) * 2.5 : 0;
    ctx.save();
    ctx.globalAlpha = Math.min(1, st.in * 2);
    const sc = R.outBack(st.in);
    ctx.translate(W / 2 + shake, by + BH / 2);
    ctx.scale(sc, sc);
    ctx.translate(-W / 2, -(by + BH / 2));
    const def = boss.def, rank = boss.rank || def.rank || 'BOSS', tagCol = this.rankColor(rank);
    // 이름 줄: [BOSS] 이름
    const ny = by - (compact ? 10 : 12.5), th = compact ? 14 : 16;
    ctx.font = `900 ${compact ? 9 : 10}px ${FONT}`;
    const tw = ctx.measureText(rank).width + 12;
    rr(ctx, bx, ny - th / 2, tw, th, th / 2);
    ctx.fillStyle = tagCol;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(rank, bx + tw / 2, ny);
    ctx.font = `800 ${compact ? 12 : 13}px ${FONT}`;
    ctx.textAlign = 'left';
    this.outlined(ctx, def.name, bx + tw + 7, ny, '#212529', '#fff', 3.5);
    // 막대
    ctx.fillStyle = 'rgba(20,24,36,0.9)';
    rr(ctx, bx, by, bw, BH, BH / 2);
    ctx.fill();
    const iw = bw - 6, ih = BH - 6;
    ctx.fillStyle = '#ffe066';
    rr(ctx, bx + 3, by + 3, Math.max(6, iw * st.lag), ih, ih / 2);
    ctx.fill();
    const gr = ctx.createLinearGradient(0, by + 3, 0, by + BH - 3);
    gr.addColorStop(0, '#ff8787');
    gr.addColorStop(0.5, '#f03e3e');
    gr.addColorStop(1, '#a51111');
    ctx.fillStyle = gr;
    rr(ctx, bx + 3, by + 3, Math.max(6, iw * k), ih, ih / 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(bx + 6, by + 4, Math.max(0, iw * k - 6), compact ? 2 : 3);
    ctx.fillStyle = 'rgba(20,24,36,0.45)';
    for (let i = 1; i < 10; i++) ctx.fillRect(bx + 3 + (iw * i) / 10, by + 3, 1.2, ih);
    ctx.font = `800 ${compact ? 10 : 11}px ${FONT}`;
    ctx.textAlign = 'right';
    this.outlined(ctx, U.fmtNum(Math.max(0, boss.hp)), bx + bw - 8, by + BH / 2 + 0.5, '#fff', 'rgba(20,24,36,0.9)', 3);
    // 초상화
    const px = bx - 18, py = by + (compact ? 2 : 4);
    ctx.beginPath();
    ctx.arc(px, py, PR, 0, TAU);
    ctx.fillStyle = def.sprite.bg;
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#fff';
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.strokeStyle = tagCol;
    ctx.beginPath();
    ctx.arc(px, py, PR + 2, 0, TAU);
    ctx.stroke();
    this.drawIcon(ctx, def.sprite.emoji || '👿', px, py + 1, compact ? 20 : 26);
    ctx.restore();
  };

  P.drawScorePanel = function (ctx, g, W, dt) {
    const h = this.hud;
    h.score += (g.score - h.score) * Math.min(1, dt * 7);
    if (Math.abs(g.score - h.score) < 1) h.score = g.score;
    const pw = 256, ph = g.phd ? 62 : 104, px = W - pw - 12, py = 24;
    this.card(ctx, px, py, pw, ph, 14, 'rgba(255,255,255,0.95)', 'rgba(30,40,70,0.08)');
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `800 12px ${FONT}`;
    ctx.fillStyle = '#868e96';
    ctx.fillText('📊 연구 실적', px + 14, py + 21);
    ctx.textAlign = 'right';
    ctx.font = R.dfont(24);
    ctx.fillStyle = '#1f2a5a';
    ctx.fillText(U.fmtNum(h.score), px + pw - 14, py + 23);
    if (!g.phd) {
      const req = g.cfg.jobScore, k = Math.min(1, g.score / req), done = k >= 1, bw = pw - 28;
      ctx.fillStyle = '#e9ecef';
      rr(ctx, px + 14, py + 41, bw, 11, 5.5);
      ctx.fill();
      const gr = ctx.createLinearGradient(0, py + 41, 0, py + 52);
      gr.addColorStop(0, done ? '#8ce99a' : '#ffe066');
      gr.addColorStop(1, done ? '#2f9e44' : '#f59f00');
      ctx.fillStyle = gr;
      rr(ctx, px + 14, py + 41, Math.max(11, bw * k), 11, 5.5);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.fillRect(px + 18, py + 42.5, Math.max(0, bw * k - 8), 2.5);
      if (done) {
        ctx.globalAlpha = 0.35 + Math.sin(this.t * 4) * 0.2;
        ctx.strokeStyle = '#40c057';
        ctx.lineWidth = 3;
        rr(ctx, px + 12, py + 39, bw + 4, 15, 7.5);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = '#495057';
      ctx.textAlign = 'left';
      ctx.fillText(done ? '✅ 취업 커트라인 달성!' : `취업 커트라인 ${U.fmtNum(req)}`, px + 14, py + 68);
      ctx.textAlign = 'right';
      ctx.fillStyle = done ? '#2f9e44' : '#e67700';
      ctx.font = `900 12px ${FONT}`;
      ctx.fillText(`${Math.floor(k * 100)}%`, px + pw - 14, py + 68);
      // 두 번째 취업 조건: 4차 최종 보스 격파
      const down = g.finalBossDown(), last = g.chapterIndex === g.chapters.length - 1;
      const bt = g.chapters[g.chapters.length - 1].boss.t, alive = last && g.chapterTime >= bt && !down;
      ctx.textAlign = 'left';
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = down ? '#2f9e44' : '#495057';
      ctx.fillText(down ? '✅ 최종 보스 격파!' : `${g.data.enemies[g.finalBoss()].sprite.emoji || '👿'} 최종 보스 격파`, px + 14, py + 88);
      ctx.textAlign = 'right';
      ctx.font = `900 12px ${FONT}`;
      if (down) { ctx.fillStyle = '#2f9e44'; ctx.fillText('완료', px + pw - 14, py + 88); }
      else if (alive) {
        ctx.globalAlpha = 0.6 + Math.sin(this.t * 6) * 0.4;
        ctx.fillStyle = '#e8590c';
        ctx.fillText('필요!', px + pw - 14, py + 88);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = '#868e96';
        ctx.fillText(last ? `${U.fmtTime(bt - g.chapterTime)} 뒤 등장` : '4차에 등장', px + pw - 14, py + 88);
      }
    } else {
      ctx.font = `700 12px ${FONT}`;
      ctx.fillStyle = '#c92a2a';
      ctx.textAlign = 'left';
      ctx.fillText('박사 과정 — 버틴 시간이 기록이 된다', px + 14, py + 46);
    }
    const kt = `처치 ${U.fmtNum(g.kills)}`;
    ctx.font = `800 13px ${FONT}`;
    const kw = ctx.measureText(kt).width + 22;
    this.card(ctx, px + pw - kw, py + ph + 8, kw, 24, 12, 'rgba(255,255,255,0.92)');
    ctx.fillStyle = '#495057';
    ctx.textAlign = 'center';
    ctx.fillText(kt, px + pw - kw / 2, py + ph + 20.5);
  };

  // 쿨타임이 남은 비율 (0~1). 늘 켜져 있는 무기는 -1
  P.cooldownOf = function (w) {
    const bh = w.def.behavior, p = w.p, st = w.state;
    if (bh === 'orbit') return st.on === false && p.cooldown > 0 ? Math.max(0, 1 - st.t / p.cooldown) : -1;
    if (bh === 'cone') return !p.always && st.on === false ? Math.max(0, 1 - st.t / p.cooldown) : -1;
    if (bh === 'aura' || bh === 'agents' || bh === 'beam_spin' || bh === 'swing') return -1;
    return p.cooldown > 0 ? Math.min(1, Math.max(0, w.timer / p.cooldown)) : -1;
  };

  P.drawSlots = function (ctx, g) {
    const jam = g.jamTimer > 0;
    let x = 12;
    const y1 = 26, y2 = 76;
    for (let i = 0; i < g.weapons.length; i++) {
      const w = g.weapons[i], evo = w.def.tier === 'evolved';
      this.slot(ctx, w.def.icon, x, y1, 42, evo ? '★' : w.level >= w.maxLevel ? 'MAX' : String(w.level), evo, jam, this.cooldownOf(w));
      x += 46;
    }
    x = 12;
    this.innateSlot(ctx, g.charDef, x, y2, 34); // 캐릭터 기본 패시브 (패시브 칸을 차지하지 않는다)
    x += 42;
    for (let i = 0; i < g.passives.length; i++) {
      const p = g.passives[i];
      this.slot(ctx, p.def.icon, x, y2, 34, p.level >= p.def.max ? 'MAX' : String(p.level), false, false, -1);
      x += 38;
    }
    if (jam) {
      ctx.font = `800 13px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, `💻 윈도우 업데이트로 무기 정지 ${g.jamTimer.toFixed(1)}초`, 12, y2 + 50, '#1c7ed6', '#fff', 3.5);
    }
  };

  // 기본 패시브: 동그란 칸 + '기본' 표시
  P.innateSlot = function (ctx, ch, x, y, s) {
    const cx = x + s / 2, cy = y + s / 2, wet = ch === GS.data.characters.wet, col = wet ? '#7048e8' : '#3b5bdb';
    ctx.fillStyle = 'rgba(20,30,55,0.15)';
    ctx.beginPath();
    ctx.arc(cx + 1, cy + 3, s / 2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = wet ? '#f3f0ff' : '#edf2ff';
    ctx.beginPath();
    ctx.arc(cx, cy, s / 2, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = col;
    ctx.stroke();
    this.drawIcon(ctx, ch.passive.icon, cx, cy - 1, s * 0.6);
    ctx.font = `900 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    rr(ctx, cx - 12, y + s - 6, 24, 12, 6);
    ctx.fillStyle = col;
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText('기본', cx, y + s + 0.5);
  };

  P.slot = function (ctx, icon, x, y, s, label, gold, dim, cd) {
    ctx.fillStyle = 'rgba(20,30,55,0.15)';
    rr(ctx, x + 1, y + 3, s, s, 10);
    ctx.fill();
    const gr = ctx.createLinearGradient(0, y, 0, y + s);
    gr.addColorStop(0, gold ? '#fff9db' : '#ffffff');
    gr.addColorStop(1, gold ? '#ffd43b' : '#e9edf2');
    ctx.fillStyle = gr;
    rr(ctx, x, y, s, s, 10);
    ctx.fill();
    ctx.lineWidth = gold ? 2 : 1;
    ctx.strokeStyle = gold ? '#f59f00' : 'rgba(30,40,70,0.18)';
    ctx.stroke();
    if (gold) { // 진화 무기: 금빛이 스친다
      ctx.save();
      rr(ctx, x, y, s, s, 10);
      ctx.clip();
      const sx = ((this.t * 0.7) % 2.2) * s * 1.6 - s;
      ctx.drawImage(this.shineSprite(), x + sx, y, s * 1.2, s);
      ctx.restore();
    }
    if (dim) ctx.globalAlpha = 0.3;
    this.drawIcon(ctx, icon, x + s / 2, y + s / 2 - 1, s * 0.66);
    ctx.globalAlpha = 1;
    if (cd > 0.02 && !dim) { // 쿨타임: 시계 방향으로 걷히는 그림자
      ctx.save();
      rr(ctx, x, y, s, s, 10);
      ctx.clip();
      ctx.fillStyle = 'rgba(20,30,55,0.3)';
      ctx.beginPath();
      ctx.moveTo(x + s / 2, y + s / 2);
      ctx.arc(x + s / 2, y + s / 2, s, -Math.PI / 2, -Math.PI / 2 + TAU * cd);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.font = `900 ${Math.round(s * 0.27)}px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    this.outlined(ctx, label, x + s - 3, y + s - 3, gold ? '#d9480f' : '#212529', '#fff', 3);
  };

  // ───────── 알림 (화면 아래에서 위로 쌓인다) ─────────
  P.drawToasts = function (ctx, dt) {
    const s = this.ui, W = this.cssW / s, H = this.cssH / s;
    ctx.save();
    ctx.scale(s, s);
    let y = H - 38 - (this.toasts.length - 1) * 42;
    for (let i = 0; i < this.toasts.length; i++) {
      const t = this.toasts[i];
      t.t += dt;
      const ain = Math.min(1, t.t / 0.25), aout = t.t > 3.4 ? Math.max(0, (3.8 - t.t) / 0.4) : 1;
      const yy = y + (1 - R.outCubic(ain)) * 20;
      ctx.globalAlpha = Math.min(ain, aout);
      ctx.font = `700 15px ${FONT}`;
      const tw = Math.min(W - 40, ctx.measureText(t.text).width + 44), x0 = W / 2 - tw / 2;
      ctx.fillStyle = 'rgba(20,30,55,0.16)';
      rr(ctx, x0 + 1, yy - 14, tw, 34, 17);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.97)';
      rr(ctx, x0, yy - 17, tw, 34, 17);
      ctx.fill();
      ctx.save();
      ctx.clip();
      ctx.fillStyle = t.color;
      ctx.fillRect(x0, yy - 17, 7, 34);
      ctx.restore();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = t.color;
      rr(ctx, x0, yy - 17, tw, 34, 17);
      ctx.stroke();
      ctx.fillStyle = '#212529';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(t.text, W / 2 + 4, yy + 0.5, tw - 30);
      y += 42;
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    this.toasts = this.toasts.filter((t) => t.t < 3.8);
  };

  // ───────── 배너 (웨이브 시작 · 보스 등장/격파 · 진화 · 박사) ─────────
  P.drawBanner = function (ctx, dt) {
    const b = this.banners[0];
    if (!b) return;
    b.t += dt;
    const dur = 2.9;
    if (b.t > dur) { this.banners.shift(); return; }
    const s = this.ui, W = this.cssW / s, H = this.cssH / s;
    const kin = R.outCubic(Math.min(1, b.t / 0.35)), kout = b.t > dur - 0.4 ? (b.t - (dur - 0.4)) / 0.4 : 0;
    const slide = (1 - kin) * -W * 0.5 + R.outCubic(kout) * W * 0.5;
    const kind = b.kind, y = Math.max(H * 0.33, 236), bh = b.sub ? 112 : 86, top = y - 58;
    const dark = kind === 'boss' || kind === 'phd';
    const C = { chapter: '#3b5bdb', boss: '#ff6b6b', bossdown: '#e67700', evolve: '#e67700', phd: '#f8f9fa' }[kind] || '#3b5bdb';
    ctx.save();
    ctx.scale(s, s);
    ctx.globalAlpha = Math.max(0, Math.min(1, kin * 1.5, 1 - kout));
    // 띠 (양 끝은 투명하게)
    const band = ctx.createLinearGradient(0, 0, W, 0);
    const bc = dark ? (kind === 'boss' ? '30,8,12' : '18,20,28') : kind === 'evolve' || kind === 'bossdown' ? '255,244,214' : '255,255,255';
    band.addColorStop(0, `rgba(${bc},0)`);
    band.addColorStop(0.18, `rgba(${bc},0.93)`);
    band.addColorStop(0.82, `rgba(${bc},0.93)`);
    band.addColorStop(1, `rgba(${bc},0)`);
    ctx.fillStyle = band;
    ctx.fillRect(0, top, W, bh);
    if (kind === 'boss') { // 주의 테이프
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top - 6, W, 10);
      ctx.rect(0, top + bh - 4, W, 10);
      ctx.clip();
      ctx.fillStyle = '#fcc419';
      ctx.fillRect(0, top - 6, W, bh + 20);
      ctx.fillStyle = '#212529';
      const off = (this.t * 60) % 28;
      for (let x = -40 + off; x < W + 40; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, top - 6);
        ctx.lineTo(x + 14, top - 6);
        ctx.lineTo(x + 4, top + bh + 6);
        ctx.lineTo(x - 10, top + bh + 6);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    } else {
      const line = ctx.createLinearGradient(0, 0, W, 0);
      line.addColorStop(0, R.rgba(kind === 'phd' ? '#868e96' : C, 0));
      line.addColorStop(0.5, R.rgba(kind === 'phd' ? '#868e96' : C, 1));
      line.addColorStop(1, R.rgba(kind === 'phd' ? '#868e96' : C, 0));
      ctx.fillStyle = line;
      ctx.fillRect(0, top, W, 4);
      ctx.fillRect(0, top + bh - 4, W, 4);
    }
    if (kind === 'evolve' || kind === 'bossdown') {
      ctx.globalAlpha *= 0.6;
      const rs = 320;
      ctx.save();
      ctx.translate(W / 2, y);
      ctx.rotate(this.t * 0.6);
      ctx.drawImage(this.raysSprite('#fcc419'), -rs / 2, -rs / 2, rs, rs);
      ctx.restore();
      ctx.globalAlpha = Math.max(0, Math.min(1, kin * 1.5, 1 - kout));
    }
    ctx.translate(slide, 0);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (kind === 'boss' && Math.floor(this.t * 4) % 2 === 0) {
      ctx.font = `900 13px ${FONT}`;
      ctx.fillStyle = '#ffd43b';
      ctx.fillText('⚠  WARNING  ⚠', W / 2, top + 16);
    }
    const ts = 1 + (1 - kin) * 0.25;
    ctx.save();
    ctx.translate(W / 2, y - (b.sub ? 6 : 0));
    ctx.scale(ts, ts);
    ctx.font = R.dfont(42);
    ctx.lineJoin = 'round';
    ctx.lineWidth = 8;
    ctx.strokeStyle = dark ? 'rgba(0,0,0,0.5)' : '#ffffff';
    ctx.strokeText(b.title, 0, 0);
    ctx.fillStyle = C;
    ctx.fillText(b.title, 0, 0);
    ctx.restore();
    if (b.sub) {
      ctx.font = `700 17px ${FONT}`;
      ctx.fillStyle = dark ? '#ced4da' : '#495057';
      ctx.fillText(b.sub, W / 2, y + 36, W - 80);
    }
    ctx.restore();
  };
})(window.GS = window.GS || {});
