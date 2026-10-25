// 월드 그리기: 성소 · 지식 · 아이템 · 오라 · 적 · 주인공 · 무기 · 투사체 · 이펙트 · 파티클 · 피해 숫자
(function (GS) {
  'use strict';
  const R = GS.R, TAU = R.TAU, P = GS.Renderer.prototype, PK = R.PK;
  const FONT = R.FONT;
  const byY = (a, b) => a.y - b.y;
  const ITEM_COL = { kimbap: '#51cf66', ctrl_a: '#4dabf7', hyugang: '#ff6b6b', trip: '#22b8cf', accept: '#fcc419' };
  const GEM_COL = ['#4dabf7', '#40c057', '#be4bdb'];
  const SHOT_COL = { question: '#e03131', germ: '#40c057', paper: '#1c7ed6', warn: '#f59f00' };
  // 내 무기 효과는 조금 연하게 그려 적의 공격(붉은 테두리)이 눈에 잘 띄게 한다
  const MY_AREA = 0.6;  // 넓게 퍼지는 효과: 발열 오라 · 불꽃 · 증기 · 웅덩이 · 레이저 · 충격파
  const MY_SHOT = 0.82; // 작은 투사체와 따라다니는 것: 펜 · 키캡 · 방울 · 책 · 클로드 · 쥐
  const MY_TEXT = 0.78; // 내가 준 피해 숫자
  const HZ = '250,82,82'; // 보스 패턴 예고 빨강
  const GPT_TEXT = '물론이죠! 좋은 질문이에요. 단계별로 설명해 드릴게요… ';
  const CODE_GLYPHS = ['</>', '{ }', '=>', '();', '[ ]', '&&'];

  // ───────── 성소 ─────────
  P.drawSanctuaries = function (ctx, g) {
    const t = this.wt, R0 = g.cfg.sanctuary.radius + g.player.r;
    for (let i = 0; i < g.sanctuaries.length; i++) {
      const s = g.sanctuaries[i], def = s.def;
      const appear = Math.min(1, s.t / 0.5), k = Math.max(0, s.life / s.maxLife);
      const fl = this.sanctuaryFloor(s);
      ctx.globalAlpha = appear;
      ctx.drawImage(fl, s.x - fl.dw / 2, s.y - fl.dh / 2, fl.dw, fl.dh);
      ctx.globalAlpha = appear * (0.4 + Math.sin(t * 3 + i) * 0.12);
      ctx.drawImage(this.glow(def.color, 128), s.x - 100, s.y - 100, 200, 200);
      ctx.globalAlpha = appear;
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 9]);
      ctx.lineDashOffset = -t * 30;
      ctx.beginPath();
      ctx.arc(s.x, s.y, R0 + 6 + Math.sin(t * 3 + i) * 3, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // 떠 있는 아이콘 + 남은 시간 고리 (끝나 갈수록 깜빡인다)
      const bob = Math.sin(t * 2.2 + i) * 4, by = s.y - 96 + bob;
      if (s.life < 8 && Math.floor(this.t * 6) % 2) ctx.globalAlpha = appear * 0.45;
      const bd = this.sanctuaryBadge(s);
      ctx.drawImage(bd, s.x - bd.dw / 2, by, bd.dw, bd.dh);
      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(s.x, by + 34, 33, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = def.color;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(s.x, by + 34, 33, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.globalAlpha = 1;
      if (this.wdt > 0 && Math.random() < 0.2) {
        const p = this.part(PK.STAR, s.x + (Math.random() - 0.5) * 120, s.y + (Math.random() - 0.5) * 70, 0, -45, 0.9, 7, def.color);
        if (p) p.drag = 0.5;
      }
    }
  };

  // ───────── 지식 · 아이템 ─────────
  P.drawGems = function (ctx, g, b) {
    const gems = g.gems, t = this.wt;
    for (let i = 0; i < gems.length; i++) {
      const gm = gems[i];
      if (gm.x < b.x0 || gm.x > b.x1 || gm.y < b.y0 || gm.y > b.y1) continue;
      const tier = gm.v >= 20 ? 2 : gm.v >= 5 ? 1 : 0, spr = this.gemSprite(tier);
      const bob = gm.pull ? 0 : Math.sin(t * 3 + i * 0.7) * 2;
      if (tier) {
        ctx.globalAlpha = 0.45 + Math.sin(t * 4 + i) * 0.15;
        const s = tier === 2 ? 44 : 32;
        ctx.drawImage(this.glow(GEM_COL[tier], 64), gm.x - s / 2, gm.y - s / 2 + bob, s, s);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(spr, gm.x - spr.dw / 2, gm.y - spr.dh / 2 + bob, spr.dw, spr.dh);
      const tw = (t * 0.7 + i * 0.618) % 1; // 가끔 반짝
      if (tw < 0.07) {
        const s = 12 * Math.sin((tw / 0.07) * Math.PI);
        ctx.drawImage(this.sparkSprite('#ffffff'), gm.x + 3 - s / 2, gm.y - 5 - s / 2 + bob, s, s);
      }
    }
  };

  P.drawItems = function (ctx, g) {
    const sh = this.shadowSprite();
    for (let i = 0; i < g.items.length; i++) {
      const it = g.items[i], acc = it.id === 'accept', col = ITEM_COL[it.id] || '#4dabf7';
      const bob = Math.sin(this.wt * 4 + i) * 4;
      ctx.drawImage(sh, it.x - 16, it.y + 16, 32, 10);
      ctx.globalAlpha = acc ? 0.95 : 0.6;
      const rs = acc ? 120 : 80;
      this.drawRot(ctx, this.raysSprite(col), it.x, it.y + bob, this.wt * 0.8 + i, rs, rs);
      this.worldTf(ctx);
      ctx.globalAlpha = 1;
      ctx.drawImage(this.glow(col, 64), it.x - 30, it.y + bob - 30, 60, 60);
      const box = typeof it.def.icon === 'string' ? (acc ? 40 : 32) : 54;
      this.drawIcon(ctx, it.def.icon, it.x, it.y + bob, box * (1 + Math.sin(this.wt * 6 + i) * 0.04));
    }
  };

  // ───────── 개인 PC / 워크스테이션 열기 ─────────
  P.auraSprite = function (ws) {
    return this.sprite(ws ? 'aura_ws' : 'aura', 200, 200, (x) => {
      const g = x.createRadialGradient(100, 100, 12, 100, 100, 100);
      if (ws) { // 워크스테이션: 더 뜨거운 진한 주황 (빨강은 적의 공격·보스 예고에만 쓴다)
        g.addColorStop(0, 'rgba(255,192,120,0.06)');
        g.addColorStop(0.7, 'rgba(253,126,20,0.2)');
        g.addColorStop(0.93, 'rgba(232,89,12,0.36)');
        g.addColorStop(1, 'rgba(232,89,12,0.05)');
      } else {
        g.addColorStop(0, 'rgba(255,169,77,0.04)');
        g.addColorStop(0.7, 'rgba(255,146,43,0.15)');
        g.addColorStop(0.93, 'rgba(253,126,20,0.3)');
        g.addColorStop(1, 'rgba(253,126,20,0.04)');
      }
      x.fillStyle = g;
      R.circle(x, 100, 100, 100);
      x.fill();
    });
  };

  // 워크스테이션 GPU 팬 날개
  P.fanSprite = function () {
    return this.sprite('fan', 200, 200, (x) => {
      x.translate(100, 100);
      x.fillStyle = 'rgba(201,42,42,0.1)';
      for (let i = 0; i < 7; i++) {
        x.rotate(TAU / 7);
        x.beginPath();
        x.moveTo(8, 0);
        x.quadraticCurveTo(60, -30, 96, -8);
        x.quadraticCurveTo(60, 6, 8, 10);
        x.closePath();
        x.fill();
      }
      x.strokeStyle = 'rgba(201,42,42,0.25)';
      x.lineWidth = 3;
      R.circle(x, 0, 0, 14);
      x.stroke();
    });
  };

  P.drawAuras = function (ctx, g, wdt) {
    if (g.jamTimer > 0) return;
    const pl = g.player;
    for (let i = 0; i < g.weapons.length; i++) {
      const w = g.weapons[i];
      if (w.def.behavior !== 'aura') continue;
      const Rr = w.state.radius || 80, ws = w.def.style === 'heat_ws';
      ctx.globalAlpha = MY_AREA;
      ctx.drawImage(this.auraSprite(ws), pl.x - Rr, pl.y - Rr, Rr * 2, Rr * 2);
      if (ws) {
        this.drawRot(ctx, this.fanSprite(), pl.x, pl.y, this.wt * 5, Rr * 1.9, Rr * 1.9);
        this.worldTf(ctx);
      }
      ctx.strokeStyle = ws ? '#f76707' : '#fd7e14';
      ctx.lineWidth = 2;
      for (let k = 0; k < 3; k++) { // 바깥으로 퍼지는 아지랑이
        const ph = (this.wt * 0.7 + k / 3) % 1;
        ctx.globalAlpha = (1 - ph) * 0.3 * MY_AREA;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, Rr * (0.2 + ph * 0.8), 0, TAU);
        ctx.stroke();
      }
      ctx.globalAlpha = MY_AREA;
      ctx.strokeStyle = ws ? `hsla(${(this.wt * 120) % 360},90%,55%,0.75)` : 'rgba(253,126,20,0.6)';
      ctx.lineWidth = w.state.tick > 0 ? 4 : 2.5;
      ctx.setLineDash(ws ? [18, 6] : [10, 8]);
      ctx.lineDashOffset = -this.wt * 24;
      ctx.beginPath();
      ctx.arc(pl.x, pl.y, Rr, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      if (wdt > 0) { // 불씨
        this.emberT -= wdt;
        if (this.emberT <= 0) {
          this.emberT = ws ? 0.03 : 0.05;
          const a = Math.random() * TAU, d = Rr * Math.sqrt(Math.random());
          const p = this.part(PK.GLOW, pl.x + Math.cos(a) * d, pl.y + Math.sin(a) * d, Math.cos(a) * 20, -30 - Math.random() * 40, 0.6 + Math.random() * 0.4, 4 + Math.random() * 3, ws ? '#ffa94d' : '#ff922b');
          if (p) { p.drag = 0.6; p.my = true; }
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 플롯 그리기가 남긴 데이터 점 (바닥에 남아 적보다 아래에 그린다) ─────────
  P.drawGroundShots = function (ctx, g, b) {
    const shots = g.enemyShots, buf = this.plotBuf;
    buf.length = 0;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      if (s.style !== 'plot' || s.x < b.x0 || s.x > b.x1 || s.y < b.y0 || s.y > b.y1) continue;
      buf.push(s);
    }
    if (!buf.length) return;
    buf.sort((a, c) => (a.owner || 0) - (c.owner || 0) || a.born - c.born);
    ctx.strokeStyle = '#fa5252'; // 빨강: 파란 경험치 보석과 헷갈리지 않게
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    for (let i = 1; i < buf.length; i++) { // 점을 잇는 선 (장식)
      const a = buf[i - 1], c = buf[i];
      if (!a.owner || a.owner !== c.owner) continue;
      ctx.globalAlpha = Math.min(1, a.life, c.life) * 0.55;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    const dot = this.plotDotSprite();
    for (let i = 0; i < buf.length; i++) {
      const s = buf[i], age = g.time - (s.born || 0);
      const pop = (age < 0.2 ? R.outBack(Math.max(0, age / 0.2)) : 1) * (1 + Math.sin(this.t * 8 + i) * 0.06);
      ctx.globalAlpha = Math.min(1, s.life);
      ctx.drawImage(dot, s.x - 10 * pop, s.y - 10 * pop, 20 * pop, 20 * pop);
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 적 ─────────
  P.alertSprite = function () {
    return this.sprite('alert', 24, 30, (x) => {
      R.soft(x, 3, 2, 'rgba(224,49,49,0.5)');
      R.roundRect(x, 2, 2, 20, 20, 7);
      x.fillStyle = '#e03131';
      x.fill();
      x.beginPath();
      x.moveTo(8, 21);
      x.lineTo(12, 28);
      x.lineTo(16, 21);
      x.fill();
      R.hard(x);
      x.fillStyle = '#fff';
      x.font = `900 16px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('!', 12, 13);
    });
  };

  P.drawEnemies = function (ctx, g, b) {
    const list = g.enemies, vis = this.vis, wt = this.wt, frozen = g.freezeTimer > 0;
    vis.length = 0;
    for (let i = 0; i < list.length; i++) {
      const e = list[i];
      if (!e.active || e.x < b.x0 - e.r || e.x > b.x1 + e.r || e.y < b.y0 - e.r || e.y > b.y1 + e.r) continue;
      vis.push(e);
    }
    vis.sort(byY);
    const sh = this.shadowSprite(), pl = g.player;
    // 1) 바닥: 보스 오라 · 그림자 · 폭발 예고 · 돌진 예고선
    for (let i = 0; i < vis.length; i++) {
      const e = vis[i], r = e.r;
      if (e.boss) {
        const s = r * (3.8 + Math.sin(wt * 3) * 0.25);
        ctx.globalAlpha = 0.5;
        ctx.drawImage(this.glow(e.def.sprite.bg, 128), e.x - s / 2, e.y - s / 2, s, s);
        ctx.globalAlpha = 1;
        const sp = this.bossSpikes(e);
        this.drawRot(ctx, sp, e.x, e.y, wt * 0.5, sp.dw, sp.dh);
        this.worldTf(ctx);
      } else if (e.elite) {
        const s = r * 3.2;
        ctx.globalAlpha = 0.45 + Math.sin(wt * 4 + e.anim) * 0.15;
        ctx.drawImage(this.glow('#fcc419', 64), e.x - s / 2, e.y - s / 2, s, s);
        ctx.globalAlpha = 1;
      }
      ctx.drawImage(sh, e.x - r * 1.05, e.y + r * 0.72, r * 2.1, r * 0.72);
      if (e.ai === 'bomber' && e.st === 1) this.drawBombZone(ctx, e);
      else if (e.ai === 'dash' && e.st === 1) {
        const dx = pl.x - e.x, dy = pl.y - e.y, d = Math.hypot(dx, dy) || 1, L = Math.min(d, e.def.dash.range);
        const k = 1 - e.stT / e.def.dash.windup, ux = dx / d, uy = dy / d, ex = e.x + ux * L, ey = e.y + uy * L;
        ctx.strokeStyle = `rgba(${HZ},${(0.14 + k * 0.26).toFixed(3)})`;
        ctx.lineWidth = r * 1.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(e.x, e.y);
        ctx.lineTo(ex, ey);
        ctx.stroke();
        ctx.strokeStyle = `rgba(201,42,42,${(0.35 + k * 0.5).toFixed(3)})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([9, 7]);
        ctx.lineDashOffset = -this.t * 60;
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineCap = 'butt';
        ctx.fillStyle = `rgba(201,42,42,${(0.4 + k * 0.5).toFixed(3)})`; // 화살촉
        ctx.beginPath();
        ctx.moveTo(ex + ux * 15, ey + uy * 15);
        ctx.lineTo(ex - uy * 11 - ux * 4, ey + ux * 11 - uy * 4);
        ctx.lineTo(ex + uy * 11 - ux * 4, ey - ux * 11 - uy * 4);
        ctx.closePath();
        ctx.fill();
      }
    }
    // 2) 몸통
    for (let i = 0; i < vis.length; i++) this.drawEnemyBody(ctx, g, vis[i], frozen);
    // 3) 머리 위 표시 · 이름표
    for (let i = 0; i < vis.length; i++) this.drawEnemyMarks(ctx, vis[i]);
  };

  P.drawBombZone = function (ctx, e) {
    const B = e.def.bomb, k = 1 - e.stT / B.fuse;
    ctx.fillStyle = `rgba(28,126,214,${0.12 + k * 0.16})`;
    ctx.beginPath();
    ctx.arc(e.x, e.y, B.radius, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(28,126,214,0.22)';
    ctx.beginPath();
    ctx.arc(e.x, e.y, B.radius * k, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; // 흰 밑줄로 어느 바닥에서나 또렷하게
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(e.x, e.y, B.radius, 0, TAU);
    ctx.stroke();
    ctx.strokeStyle = '#1864ab';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([10, 7]);
    ctx.lineDashOffset = -this.t * 40;
    ctx.stroke();
    ctx.setLineDash([]);
  };

  P.drawEnemyBody = function (ctx, g, e, frozen) {
    const r = e.r, ph = frozen ? e.anim : this.wt * (7 + e.speed * 0.025) + e.anim * 3;
    const frame = ((((ph / (Math.PI / 2)) | 0) % 4) + 4) % 4;
    const spr = this.enemySprite(e, frame);
    let sx = 1 + Math.sin(ph * 2) * 0.035, sy = 1 - Math.sin(ph * 2) * 0.035;
    const bob = frozen ? 0 : -Math.abs(Math.sin(ph)) * r * 0.07;
    if (e.flash > 0) {
      const k = Math.min(1, e.flash / 0.1);
      sx += 0.16 * k;
      sy -= 0.12 * k;
    }
    let a = 1;
    const age = g.time - (e.born === undefined ? -9 : e.born);
    if (age < 0.3) { // 등장: 톡 튀어나온다
      const k = Math.max(0, age / 0.3), s = Math.max(0.05, R.outBack(k));
      sx *= s;
      sy *= s;
      a = Math.min(1, k * 2.5);
    }
    let ox = 0, oy = 0;
    if ((e.ai === 'dash' || e.ai === 'bomber') && e.st === 1) {
      ox = (Math.random() - 0.5) * 3.5;
      oy = (Math.random() - 0.5) * 2;
    }
    const w = spr.dw * sx, h = spr.dh * sy;
    const X = e.x + ox - spr.cx * sx, Y = e.y + r + oy - (spr.cy + r) * sy + bob;
    if (e.ai === 'dash' && e.st === 2) { // 돌진 잔상
      for (let k = 3; k >= 1; k--) {
        ctx.globalAlpha = 0.12 * (4 - k);
        ctx.drawImage(spr, X - e.dx * 14 * k, Y - e.dy * 14 * k, w, h);
      }
    }
    ctx.globalAlpha = a;
    ctx.drawImage(spr, X, Y, w, h);
    if (e.flash > 0) {
      ctx.globalAlpha = a * Math.min(1, e.flash / 0.1) * 0.85;
      ctx.drawImage(this.tinted(spr, '#ffffff'), X, Y, w, h);
    }
    if (e.ai === 'bomber' && e.st === 1 && (this.t * (4 + (1 - e.stT / e.def.bomb.fuse) * 10)) % 1 < 0.5) {
      ctx.globalAlpha = 0.45;
      ctx.drawImage(this.tinted(spr, '#4dabf7'), X, Y, w, h);
    }
    if (frozen) {
      ctx.globalAlpha = 0.5;
      ctx.drawImage(this.tinted(spr, '#a5d8ff'), X, Y, w, h);
    }
    ctx.globalAlpha = 1;
  };

  P.drawEnemyMarks = function (ctx, e) {
    const r = e.r;
    if (!e.boss) {
      const L = this.enemyLabel(e);
      ctx.drawImage(L, e.x - L.dw / 2, e.y + r * 1.2, L.dw, L.dh);
    }
    if (e.ai === 'dash' && e.st === 1) {
      const k = 1 - e.stT / e.def.dash.windup, s = 1 + Math.sin(k * Math.PI) * 0.3;
      ctx.drawImage(this.alertSprite(), e.x - 12 * s, e.y - r - 32 * s, 24 * s, 30 * s);
    } else if (e.ai === 'bomber' && e.st === 1) {
      const k = 1 - e.stT / e.def.bomb.fuse;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(28,126,214,0.22)';
      ctx.beginPath();
      ctx.arc(e.x, e.y, r + 6, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = '#1c7ed6';
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(e.x, e.y, r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k);
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.font = `800 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, `업데이트 중 ${Math.floor(k * 100)}%`, e.x, e.y - r - 18, '#1c7ed6', '#fff', 3.5);
    }
    if (e.ai === 'ranged' && e.shootT > 0 && e.shootT < 0.45) { // 원거리 적이 곧 쏜다: 빨간 고리가 조여든다
      const k = 1 - e.shootT / 0.45;
      ctx.globalAlpha = 0.35 + k * 0.6;
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 2 + k * 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * (2.2 - k * 1.1), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (e.elite) {
      const y = e.y - r - 11 + Math.sin(this.wt * 4 + e.anim) * 2;
      ctx.drawImage(this.emojiSprite('⭐', 32), e.x - 10, y - 10, 20, 20);
      const sp = this.sparkSprite('#fcc419');
      for (let k = 0; k < 2; k++) {
        const a = this.wt * 2.6 + k * Math.PI + e.anim, s = 8 + Math.sin(this.wt * 8 + k) * 3;
        ctx.drawImage(sp, e.x + Math.cos(a) * r * 1.3 - s / 2, e.y + Math.sin(a) * r * 0.7 - s / 2, s, s);
      }
    }
    if (e.boss) {
      const pl = this.bossPlate(e);
      ctx.drawImage(pl, e.x - pl.dw / 2, e.y + r * 1.3, pl.dw, pl.dh);
      this.drawBossCharge(ctx, e);
    }
  };

  // 보스가 탄막을 쏘기 직전: 빛이 모이는 예고
  P.drawBossCharge = function (ctx, e) {
    const sk = e.def.skills;
    if (!sk || !e.skillT) return;
    for (let k = 0; k < sk.length; k++) {
      const s = sk[k];
      if (s.type !== 'radial' && s.type !== 'aimed') continue;
      const left = e.skillT[k];
      if (left > 0.6 || left < 0) continue;
      const c = 1 - left / 0.6, col = SHOT_COL[s.style] || '#e03131';
      ctx.globalAlpha = c * 0.55;
      const gs = e.r * 3;
      ctx.drawImage(this.glow(col, 128), e.x - gs / 2, e.y - gs / 2, gs, gs);
      ctx.globalAlpha = c * 0.9;
      ctx.strokeStyle = col;
      ctx.lineWidth = 2 + c * 4;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * (2.4 - c * 1.2), 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }
  };

  // ───────── 주인공 ─────────
  P.shieldSprite = function () {
    return this.sprite('shield', 80, 80, (x) => {
      const g = x.createRadialGradient(40, 40, 18, 40, 40, 38);
      g.addColorStop(0, 'rgba(255,236,153,0)');
      g.addColorStop(0.75, 'rgba(255,212,59,0.22)');
      g.addColorStop(1, 'rgba(250,176,5,0.75)');
      x.fillStyle = g;
      R.circle(x, 40, 40, 38);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = 3;
      x.lineCap = 'round';
      x.beginPath();
      x.arc(40, 40, 31, Math.PI * 1.1, Math.PI * 1.45);
      x.stroke();
    });
  };

  // 웨이브가 바뀌어 더 지친 모습이 될 때: 연기 퐁 + 머리 위 한마디
  const STAGE_COL = ['#4c6ef5', '#4c6ef5', '#495057', '#7048e8', '#5c940d'];
  P.stageChange = function (pl, stage) {
    this.stageFx = 1.6;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU, p = this.part(PK.DUST, pl.x + Math.cos(a) * 14, pl.y - 6 + Math.sin(a) * 10, Math.cos(a) * 70, Math.sin(a) * 45 - 20, 0.75, 13, '#adb5bd');
      if (p) p.drag = 2.5;
    }
    this.part(PK.RING, pl.x, pl.y - 6, 0, 0, 0.5, 48, STAGE_COL[stage]);
  };

  P.drawPlayer = function (ctx, g, wdt) {
    const pl = g.player, z = this.wz, S = GS.Student;
    const stage = g.phd ? 4 : Math.min(3, g.chapterIndex); // 1차 → 2차 → 3차 → 4차 → 박사로 갈수록 지쳐 간다
    if (this.pStage !== stage) {
      if (this.pStage !== null) this.stageChange(pl, stage);
      this.pStage = stage;
    }
    if (pl.fx < -0.15) this.face = -1;
    else if (pl.fx > 0.15) this.face = 1;
    if (pl.moving) this.walkPh += wdt * S.GAITS[stage].cadence;
    // 발밑 고리와 이동 방향 화살표
    ctx.strokeStyle = 'rgba(59,91,219,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(pl.x, pl.y + 17, 24, 9, 0, 0, TAU);
    ctx.stroke();
    const ax = pl.x + pl.fx * 31, ay = pl.y + 17 + pl.fy * 12, an = Math.atan2(pl.fy * 0.4, pl.fx);
    ctx.fillStyle = 'rgba(59,91,219,0.9)';
    ctx.beginPath();
    ctx.moveTo(ax + Math.cos(an) * 7, ay + Math.sin(an) * 7);
    ctx.lineTo(ax + Math.cos(an + 2.3) * 6, ay + Math.sin(an + 2.3) * 6);
    ctx.lineTo(ax + Math.cos(an - 2.3) * 6, ay + Math.sin(an - 2.3) * 6);
    ctx.closePath();
    ctx.fill();
    ctx.drawImage(this.shadowSprite(), pl.x - 20, pl.y + 11, 40, 13);
    if (pl.moving && wdt > 0) {
      this.dustT -= wdt;
      if (this.dustT <= 0) {
        this.dustT = 0.15;
        const p = this.part(PK.DUST, pl.x - pl.fx * 10 + (Math.random() - 0.5) * 8, pl.y + 17, -pl.fx * 25, -12, 0.45, 8, '#ced4da');
        if (p) p.drag = 2;
      }
    }
    let frame;
    if (pl.moving) frame = ((this.walkPh / (Math.PI / 2)) | 0) % 4;
    else frame = this.t % 4.2 < 0.13 ? 6 : Math.sin(this.t * 2.4) > 0.3 ? 5 : 4;
    const spr = this.playerSprite(stage, frame, g.character), flip = this.face < 0;
    const put = (s, alpha, ox, oy) => {
      ctx.globalAlpha = alpha;
      ctx.setTransform(flip ? -z : z, 0, 0, z, this.wox + (pl.x + ox) * z, this.woy + (pl.y - 37 + oy) * z);
      ctx.drawImage(s, -26, 0, 52, 60);
    };
    let fast = false;
    for (let i = 0; i < pl.buffs.length; i++) if (pl.buffs[i].speed > 0) fast = true;
    if (fast && pl.moving) { // 헬스장 버프: 잔상
      const ghost = this.tinted(spr, '#69db7c');
      put(ghost, 0.22, -pl.fx * 22, -pl.fy * 22);
      put(ghost, 0.35, -pl.fx * 11, -pl.fy * 11);
    }
    const blinkHurt = pl.hurt > 0 && Math.floor(this.t * 30) % 2 === 0;
    put(spr, blinkHurt ? 0.6 : 1, 0, 0);
    if (pl.hurt > 0) put(this.tinted(spr, '#ff6b6b'), 0.6, 0, 0);
    else if (pl.slowTimer > 0) put(this.tinted(spr, '#69db7c'), 0.28, 0, 0);
    if (this.stageFx > 1.2) put(this.tinted(spr, '#ffffff'), ((this.stageFx - 1.2) / 0.4) * 0.9, 0, 0); // 모습이 바뀌는 순간 번쩍
    if (stage >= 2) { // 먹구름 · 영혼 · 파리 (스프라이트 설계 좌표로 그린다)
      ctx.globalAlpha = 1;
      ctx.setTransform((flip ? -z : z) * 0.5, 0, 0, z * 0.5, this.wox + (pl.x + (flip ? 26 : -26)) * z, this.woy + (pl.y - 37) * z);
      S.extras(ctx, stage, this.wt, S.pose(stage, frame).up);
    }
    this.worldTf(ctx);
    ctx.globalAlpha = 1;
    if (this.stageFx > 0) {
      this.stageFx -= this.dt;
      const k = Math.max(0, this.stageFx) / 1.6;
      ctx.globalAlpha = Math.min(1, k * 3);
      ctx.font = R.dfont(15);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, S.LABELS[g.character][stage], pl.x, pl.y - 60 - (1 - k) * 14, STAGE_COL[stage], '#fff', 4);
      ctx.globalAlpha = 1;
    }
    if (pl.invuln > 0) { // 풋살 무적: 금빛 방어막
      const s = 76 + Math.sin(this.t * 8) * 3;
      ctx.globalAlpha = pl.invuln < 1.5 && Math.floor(this.t * 8) % 2 ? 0.4 : 0.95;
      this.drawRot(ctx, this.shieldSprite(), pl.x, pl.y - 6, this.t * 1.5, s, s);
      this.worldTf(ctx);
      ctx.globalAlpha = 1;
    }
    // 멘탈 막대 (최근에 잃은 만큼 하얗게 남았다가 줄어든다)
    const k = Math.max(0, pl.hp / pl.maxHp), h = this.hud;
    h.hpLag = Math.max(k, h.hpLag - this.dt * 0.6);
    if (h.hpLag > 1) h.hpLag = 1;
    const bw = 48, bx = pl.x - bw / 2, by = pl.y + 29;
    ctx.fillStyle = 'rgba(25,30,45,0.8)';
    R.roundRect(ctx, bx - 1.5, by - 1.5, bw + 3, 8, 4);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    if (h.hpLag > k) ctx.fillRect(bx + bw * k, by, bw * (h.hpLag - k), 5);
    ctx.fillStyle = k > 0.5 ? '#40c057' : k > 0.25 ? '#fab005' : '#fa5252';
    R.roundRect(ctx, bx, by, Math.max(2.5, bw * k), 5, 2.5);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillRect(bx + 1, by + 0.6, Math.max(0, bw * k - 2), 1.4);
    // 상태 표시
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (g.jamTimer > 0) {
      for (let i = 0; i < 6; i++) { // 윈도우 로딩 점
        const a = this.t * 6 - i * 0.45;
        ctx.globalAlpha = 1 - i * 0.14;
        ctx.fillStyle = '#1c7ed6';
        ctx.beginPath();
        ctx.arc(pl.x + Math.cos(a) * 9, pl.y - 58 + Math.sin(a) * 9, 2.4, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.font = `800 13px ${FONT}`;
      this.outlined(ctx, '💻 재부팅 중…', pl.x, pl.y - 42, '#1c7ed6', '#fff', 3.5);
    } else if (pl.slowTimer > 0) {
      ctx.drawImage(this.emojiSprite('🤧', 32), pl.x + 12, pl.y - 52 + Math.sin(this.t * 5) * 2, 22, 22);
    }
    if (k < 0.3 && g.phase === 'playing') { // 멘탈 위험: 식은땀
      const sy = pl.y - 30 + ((this.t * 30) % 14);
      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#74c0fc';
      const sx = pl.x - this.face * 16;
      ctx.beginPath();
      ctx.moveTo(sx, sy - 5);
      ctx.quadraticCurveTo(sx + 4, sy, sx, sy + 2);
      ctx.quadraticCurveTo(sx - 4, sy, sx, sy - 5);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  };

  // ───────── 무기 (주위를 도는 책 · 클로드 · 서브에이전트 · Codex) ─────────
  // 원을 따라 도는 것들 뒤에 남는 꼬리 (원뿔 그라데이션). n 개가 같은 간격으로 돈다
  P.orbitTrail = function (ctx, cx, cy, ang, n, rad, width, rgb, alpha, len, fill) {
    if (!ctx.createConicGradient) return;
    const cg = ctx.createConicGradient(ang + 0.002, cx, cy);
    const L = Math.min(len, (TAU / n) * 0.9) / TAU;
    cg.addColorStop(0, `rgba(${rgb},0)`);
    for (let i = 1; i <= n; i++) {
      const p = i / n;
      cg.addColorStop(Math.max(0, p - L), `rgba(${rgb},0)`);
      cg.addColorStop(Math.max(0, p - 0.001), `rgba(${rgb},${alpha})`);
      if (i < n) cg.addColorStop(p, `rgba(${rgb},0)`);
    }
    if (fill) {
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, TAU);
      ctx.fill();
    } else {
      ctx.strokeStyle = cg;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, TAU);
      ctx.stroke();
    }
  };

  P.drawWeaponStates = function (ctx, g) {
    const pl = g.player, jam = g.jamTimer > 0;
    for (let wi = 0; wi < g.weapons.length; wi++) {
      const w = g.weapons[wi], st = w.state, bh = w.def.behavior;
      if (bh === 'orbit' && st.pos && st.pos.length && !jam) {
        const thesis = w.def.style === 'thesis', sz = (st.size || 16) * 2.3, n = st.pos.length / 2;
        const a0 = Math.atan2(st.pos[1] - pl.y, st.pos[0] - pl.x), rad = Math.hypot(st.pos[0] - pl.x, st.pos[1] - pl.y);
        ctx.globalAlpha = MY_SHOT;
        this.orbitTrail(ctx, pl.x, pl.y, a0, n, rad, sz * 0.75, thesis ? '252,196,25' : '116,143,252', thesis ? 0.5 : 0.38, 1.1);
        for (let i = 0; i < st.pos.length; i += 2) {
          const x = st.pos[i], y = st.pos[i + 1], ang = Math.atan2(y - pl.y, x - pl.x);
          if (thesis) {
            ctx.globalAlpha = 0.5 * MY_SHOT;
            ctx.drawImage(this.glow('#fcc419', 64), x - sz * 0.7, y - sz * 0.7, sz * 1.4, sz * 1.4);
            ctx.globalAlpha = MY_SHOT;
          }
          const spr = thesis ? this.thesisSprite() : this.bookSprite(i / 2);
          this.drawRot(ctx, spr, x, y, ang + Math.PI / 2 + Math.sin(this.wt * 5 + i) * 0.15, sz * (spr.dw / spr.dh), sz);
        }
        this.worldTf(ctx);
        ctx.globalAlpha = 1;
      } else if (bh === 'companion' && st.x !== undefined) {
        ctx.globalAlpha = (jam ? 0.35 : 1) * MY_SHOT;
        const s = 42 * (1 + Math.sin(this.wt * 4) * 0.05 + (st.flash > 0 ? 0.2 : 0));
        ctx.drawImage(this.orbSprite(), st.x - s / 2, st.y - s / 2, s, s);
        ctx.fillStyle = '#d97757';
        for (let k = 0; k < 3; k++) { // 생각 중인 점
          const a = this.wt * 3 + (k * TAU) / 3;
          ctx.beginPath();
          ctx.arc(st.x + Math.cos(a) * 20, st.y + Math.sin(a) * 9, 2, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else if (bh === 'agents' && st.list && (w.def.style === 'labmouse' || w.def.style === 'gmomouse')) {
        // 실험쥐 / 유전자 변형쥐: 쫓는 적 쪽을 보며 종종거린다
        const gmo = w.def.style === 'gmomouse', s = (st.size || 9) * (gmo ? 3.7 : 3.6), z = this.wz;
        ctx.globalAlpha = (jam ? 0.35 : 1) * MY_SHOT;
        for (let i = 0; i < st.list.length; i++) {
          const fr = Math.floor(this.wt * 12 + i) % 2, a = st.list[i], spr = gmo ? this.gmoMouseSprite(fr) : this.labMouseSprite(fr);
          if (a.t) a.face = a.t.x < a.x ? -1 : 1;
          const f = a.face || 1, bob = Math.abs(Math.sin(this.wt * 14 + i)) * 1.5;
          ctx.drawImage(this.shadowSprite(), a.x - s * 0.4, a.y + s * 0.18, s * 0.8, s * 0.22);
          ctx.setTransform(f * z, 0, 0, z, this.wox + a.x * z, this.woy + (a.y - bob) * z);
          ctx.drawImage(spr, -s / 2, -s * 0.45, s, s * 0.7);
          this.worldTf(ctx);
        }
        ctx.globalAlpha = 1;
      } else if (bh === 'swing' && st.R) {
        // 파리채 / 전기 모기채: 늘 손에 들고 부채꼴 안을 휘젓는다
        // 옅은 부채꼴 = 적의 탄을 쳐 내는 범위, 하얀(파란) 잔상 = 방금 쓸고 지나간 자리
        const evo = w.def.tier === 'evolved', spr = this.swatterSprite(evo), al = jam ? 0.35 : 1;
        const sector = (rad, from, to) => {
          ctx.beginPath();
          ctx.moveTo(pl.x, pl.y);
          ctx.arc(pl.x, pl.y, rad, from, to);
          ctx.closePath();
        };
        ctx.globalAlpha = al * 0.16 * MY_AREA;
        ctx.fillStyle = evo ? '#74c0fc' : '#adb5bd';
        sector(st.R, st.dir - st.half, st.dir + st.half);
        ctx.fill();
        ctx.globalAlpha = al * 0.45 * MY_AREA;
        ctx.strokeStyle = evo ? '#4dabf7' : '#adb5bd';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, st.R, st.dir - st.half, st.dir + st.half);
        ctx.stroke();
        const tr = Math.max(-0.9, Math.min(0.9, st.vel * 0.07)); // 잔상 길이 (휘젓는 속도에 비례)
        if (Math.abs(tr) > 0.02) {
          const lo = Math.min(st.blade, st.blade - tr), hi = Math.max(st.blade, st.blade - tr);
          ctx.globalAlpha = al * 0.5 * MY_AREA;
          ctx.fillStyle = evo ? '#a5d8ff' : '#ffffff';
          sector(st.R, lo, hi);
          ctx.fill();
          ctx.globalAlpha = al * 0.8 * MY_AREA;
          ctx.strokeStyle = evo ? '#4dabf7' : '#ced4da';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(pl.x, pl.y, st.R, lo, hi);
          ctx.stroke();
        }
        ctx.globalAlpha = al * MY_SHOT;
        const L = st.R * 0.95;
        this.drawRot(ctx, spr, pl.x + Math.cos(st.blade) * L * 0.5, pl.y + Math.sin(st.blade) * L * 0.5, st.blade, L, (L * 30) / 70);
        this.worldTf(ctx);
        if (evo && !jam && this.wdt > 0 && Math.random() < 0.35) { // 찌릿: 그물 끝에서 튀는 전기
          const sa = st.blade + (Math.random() - 0.5) * 0.3, sx = pl.x + Math.cos(sa) * st.R, sy = pl.y + Math.sin(sa) * st.R;
          const p = this.part(PK.SPARK, sx, sy, (Math.random() - 0.5) * 420, (Math.random() - 0.5) * 420, 0.14, 2, Math.random() < 0.5 ? '#74c0fc' : '#ffe066');
          if (p) { p.drag = 5; p.my = true; }
        }
        ctx.globalAlpha = 1;
      } else if (bh === 'agents' && st.list) {
        ctx.globalAlpha = (jam ? 0.35 : 1) * MY_SHOT;
        ctx.strokeStyle = 'rgba(217,119,87,0.3)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 6]);
        ctx.lineDashOffset = -this.wt * 30;
        ctx.beginPath();
        for (let i = 0; i < st.list.length; i++) {
          ctx.moveTo(pl.x, pl.y - 10);
          ctx.lineTo(st.list[i].x, st.list[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
        const spr = this.agentSprite(), s = (st.size || 11) * 2.7, gl = this.glow('#d97757', 64);
        for (let i = 0; i < st.list.length; i++) {
          const a = st.list[i];
          ctx.drawImage(gl, a.x - s * 0.8, a.y - s * 0.8, s * 1.6, s * 1.6);
          ctx.drawImage(spr, a.x - s / 2, a.y - (s * 0.82) / 2, s, s * 0.82);
          if ((this.t * 2 + i * 0.3) % 1 < 0.5) {
            ctx.fillStyle = '#d97757';
            ctx.fillRect(a.x + s * 0.12, a.y + s * 0.05, s * 0.1, s * 0.16);
          }
        }
        ctx.globalAlpha = 1;
      }
    }
  };

  // 분젠 버너 불꽃 / 오토클레이브 증기: 부채꼴 (안쪽이 밝고 끝으로 갈수록 투명)
  P.drawCones = function (ctx, g, w, st) {
    const pl = g.player, steam = w.def.style === 'steam', n = w.p.amount, t = this.wt;
    const fl = 1 + Math.sin(t * 31) * 0.04 + Math.sin(t * 17) * 0.03;
    ctx.globalAlpha = MY_AREA;
    if (steam) this.orbitTrail(ctx, pl.x, pl.y, st.ang + st.half, n, st.len * 0.95, 0, '165,216,255', 0.22, 0.8, true);
    for (let i = 0; i < n; i++) {
      const a = st.ang + (i / n) * TAU, len = st.len * fl;
      const g0 = ctx.createRadialGradient(pl.x, pl.y, 6, pl.x, pl.y, len);
      if (steam) {
        g0.addColorStop(0, 'rgba(255,255,255,0.95)');
        g0.addColorStop(0.45, 'rgba(208,235,255,0.75)');
        g0.addColorStop(0.8, 'rgba(165,216,255,0.4)');
        g0.addColorStop(1, 'rgba(165,216,255,0)');
      } else {
        g0.addColorStop(0, 'rgba(255,249,219,0.95)');
        g0.addColorStop(0.3, 'rgba(255,212,59,0.9)');
        g0.addColorStop(0.65, 'rgba(253,126,20,0.7)');
        g0.addColorStop(1, 'rgba(224,49,49,0)');
      }
      ctx.fillStyle = g0;
      ctx.beginPath();
      ctx.moveTo(pl.x + Math.cos(a) * 10, pl.y + Math.sin(a) * 10);
      ctx.arc(pl.x, pl.y, len, a - st.half, a + st.half);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = steam ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.55)'; // 가운데 뜨거운 심지
      ctx.beginPath();
      ctx.moveTo(pl.x + Math.cos(a) * 10, pl.y + Math.sin(a) * 10);
      ctx.arc(pl.x, pl.y, len * 0.55, a - st.half * 0.35, a + st.half * 0.35);
      ctx.closePath();
      ctx.fill();
      if (this.wdt > 0 && Math.random() < 0.5) { // 불티 · 김
        const d = len * (0.4 + Math.random() * 0.6), aa = a + (Math.random() - 0.5) * st.half * 1.6;
        const p = this.part(PK.GLOW, pl.x + Math.cos(aa) * d, pl.y + Math.sin(aa) * d, Math.cos(aa) * 60, Math.sin(aa) * 60 - 30, 0.4, steam ? 9 : 5, steam ? '#d0ebff' : '#ff922b');
        if (p) { p.drag = 2; p.my = true; }
      }
    }
    ctx.globalAlpha = 1;
  };

  // 바닥에 남은 시약 웅덩이 (적보다 아래에 그린다)
  P.drawPools = function (ctx, g, b) {
    const ps = g.projectiles;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.kind !== 'pool' || p.x < b.x0 - p.R || p.x > b.x1 + p.R || p.y < b.y0 - p.R || p.y > b.y1 + p.R) continue;
      const a = Math.min(1, p.t / 0.15, (p.dur - p.t) / 0.5), grow = 0.7 + 0.3 * Math.min(1, p.t / 0.2);
      const R = p.R * grow, spr = this.puddleSprite(p.style);
      ctx.globalAlpha = Math.max(0, a) * MY_AREA;
      ctx.drawImage(spr, p.x - R * 1.15, p.y - R * 0.8, R * 2.3, R * 1.6);
      const col = p.style === 'kmno4' ? 'rgba(229,219,255,0.95)' : 'rgba(244,252,227,0.95)';
      ctx.strokeStyle = col; // 보글보글 올라오는 기포
      ctx.lineWidth = 1.4;
      for (let k = 0; k < 4; k++) {
        const ph = ((p.t * 1.4 + k * 0.29 + (p.x % 7) * 0.1) % 1 + 1) % 1; // 왼쪽(x<0)에서도 0~1
        const bx = p.x + Math.cos(k * 2.4 + p.y) * R * 0.55, by = p.y + Math.sin(k * 1.9 + p.x) * R * 0.35;
        ctx.globalAlpha = Math.max(0, a) * (1 - ph) * MY_AREA;
        ctx.beginPath();
        ctx.arc(bx, by - ph * 4, 1.5 + ph * 3.5, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // 주인공보다 아래에 그리는 무기 효과 (Codex 회전 레이저 · 불꽃 · 증기): 캐릭터가 가려지지 않게
  P.drawWeaponUnder = function (ctx, g) {
    const pl = g.player;
    if (g.jamTimer > 0) return;
    for (let wi = 0; wi < g.weapons.length; wi++) {
      const w = g.weapons[wi], st = w.state;
      if (w.def.behavior === 'cone' && st.on && st.len) this.drawCones(ctx, g, w, st);
      else if (w.def.behavior === 'beam_spin' && st.len) {
        const n = w.p.amount;
        ctx.globalAlpha = MY_AREA;
        this.orbitTrail(ctx, pl.x, pl.y, st.ang, n, st.len, 0, '32,201,151', 0.28, 0.9, true);
        ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const a = st.ang + (i / n) * TAU, ex = pl.x + Math.cos(a) * st.len, ey = pl.y + Math.sin(a) * st.len;
          ctx.beginPath();
          ctx.moveTo(pl.x + Math.cos(a) * 16, pl.y + Math.sin(a) * 16);
          ctx.lineTo(ex, ey);
          ctx.strokeStyle = 'rgba(17,24,39,0.3)';
          ctx.lineWidth = st.wid * 1.2;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(32,201,151,0.85)';
          ctx.lineWidth = st.wid * 0.55;
          ctx.stroke();
          ctx.strokeStyle = 'rgba(230,255,246,0.95)';
          ctx.lineWidth = st.wid * 0.18;
          ctx.stroke();
          ctx.drawImage(this.glow('#20c997', 64), ex - 18, ey - 18, 36, 36);
        }
        ctx.lineCap = 'butt';
        ctx.font = `800 11px Consolas, monospace`; // 레이저를 따라 흐르는 코드
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0b5345';
        const z = this.wz;
        for (let i = 0; i < n; i++) {
          const a = st.ang + (i / n) * TAU, c = Math.cos(a), s = Math.sin(a);
          ctx.setTransform(z * c, z * s, -z * s, z * c, this.wox + pl.x * z, this.woy + pl.y * z);
          for (let k = 0; k < 3; k++) {
            const d = ((this.wt * 120 + k * 110) % (st.len - 60)) + 40;
            ctx.fillText(CODE_GLYPHS[(i + k) % CODE_GLYPHS.length], d, 0.5);
          }
        }
        this.worldTf(ctx);
        ctx.globalAlpha = 1;
      }
    }
  };

  // ───────── 투사체 ─────────
  P.drawProjectiles = function (ctx, g, b) {
    const ps = g.projectiles, pl = g.player;
    ctx.globalAlpha = MY_SHOT;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.kind !== 'bullet' || p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
      const ca = Math.cos(p.a), sa = Math.sin(p.a);
      switch (p.style) {
        case 'pen':
        case 'red_pen': {
          const red = p.style === 'red_pen', L = red ? 48 : 36;
          this.drawRot(ctx, this.streak(red ? '#e03131' : '#364fc7'), p.x - ca * L * 0.5, p.y - sa * L * 0.5, p.a, L, red ? 8 : 6);
          this.drawRot(ctx, this.penSprite(red), p.x, p.y, p.a, red ? 34 : 32, red ? 13 : 12);
          break;
        }
        case 'cursor': { // 윈도우 마우스 자취처럼 잔상이 따라온다
          const s = p.r * 2.6, spr = this.cursorSprite(), sp = Math.hypot(p.vx, p.vy) || 1;
          for (let k = 3; k >= 1; k--) {
            ctx.globalAlpha = 0.14 * (4 - k) * MY_SHOT;
            this.drawRot(ctx, spr, p.x - (p.vx / sp) * k * 13, p.y - (p.vy / sp) * k * 13, p.a + 1.9, s, s);
          }
          ctx.globalAlpha = MY_SHOT;
          this.drawRot(ctx, spr, p.x, p.y, p.a + 1.9, s, s);
          break;
        }
        case 'key':
        case 'key_mech': {
          const mech = p.style === 'key_mech';
          if (mech) {
            ctx.globalAlpha = 0.7 * MY_SHOT;
            this.drawRot(ctx, this.glow('#74c0fc', 64), p.x, p.y, 0, 40, 40);
            ctx.globalAlpha = MY_SHOT;
          }
          this.drawRot(ctx, this.keySprite(p.glyph || 'A', mech), p.x, p.y, p.rot, 26, 26);
          break;
        }
        case 'drop': { // 피펫 방울
          const evo = p.w.def.tier === 'evolved';
          this.drawRot(ctx, this.streak(evo ? '#9775fa' : '#4dabf7'), p.x - ca * 10, p.y - sa * 10, p.a, 22, 7);
          this.drawRot(ctx, this.dropSprite(evo), p.x, p.y, p.a, 15, 10.5);
          break;
        }
        case 'gemini':
          if (!p.fizzle) {
            ctx.globalAlpha = 0.6 * MY_SHOT;
            this.drawRot(ctx, this.glow('#9b72cb', 64), p.x, p.y, 0, 34, 34);
            ctx.globalAlpha = MY_SHOT;
          }
          this.drawRot(ctx, this.starSprite(p.fizzle), p.x, p.y, p.fizzle ? Math.sin(this.wt * 6 + i) * 0.4 : this.wt * 5, 24, 24);
          break;
        default: // 클로드 유도탄: 혜성처럼 꼬리를 끈다
          this.drawRot(ctx, this.streak('#e8590c'), p.x - ca * 13, p.y - sa * 13, p.a, 30, 13);
          this.drawRot(ctx, this.boltSprite(), p.x, p.y, 0, 24, 24);
      }
    }
    this.worldTf(ctx);
    const sh = this.shadowSprite();
    for (let i = 0; i < ps.length; i++) { // 포물선을 그리며 날아가는 시약병
      const p = ps[i];
      if (p.kind !== 'lob' || p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
      const k = Math.min(1, p.t / p.dur), hgt = Math.sin(k * Math.PI) * Math.min(70, Math.hypot(p.tx - p.sx, p.ty - p.sy) * 0.3);
      ctx.drawImage(sh, p.x - 9, p.y - 3, 18, 7);
      this.drawRot(ctx, this.thrownSprite(p.style), p.x, p.y - hgt, p.rot, 16, 20);
    }
    this.worldTf(ctx);
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      if (p.kind === 'shock') { // 딸깍! 충격파 / 과열 폭발
        const k = p.t / p.dur;
        ctx.globalAlpha = (1 - k) * 0.16 * MY_AREA;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.R, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = (1 - k) * MY_AREA;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 10 * (1 - k) + 2;
        ctx.stroke();
        ctx.globalAlpha = (1 - k) * 0.5 * MY_AREA;
        ctx.lineWidth = 2;
        for (const f of [0.82, 0.64]) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.R * f, 0, TAU);
          ctx.stroke();
        }
        ctx.globalAlpha = MY_SHOT;
      } else if (p.kind === 'beam') { // GPT 답변 레이저
        const k = Math.min(1, (1 - p.t / p.dur) * 1.6), ca = Math.cos(p.a), sa = Math.sin(p.a);
        const ex = pl.x + ca * p.len, ey = pl.y + sa * p.len;
        ctx.globalAlpha = MY_AREA;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(pl.x + ca * 18, pl.y + sa * 18);
        ctx.lineTo(ex, ey);
        ctx.strokeStyle = `rgba(16,163,127,${0.25 * k})`;
        ctx.lineWidth = p.width * 2.4;
        ctx.stroke();
        ctx.strokeStyle = `rgba(32,201,151,${0.8 * k})`;
        ctx.lineWidth = p.width;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${0.95 * k})`;
        ctx.lineWidth = p.width * 0.32;
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.globalAlpha = k * MY_AREA;
        ctx.drawImage(this.glow('#20c997', 64), pl.x - 22, pl.y - 22, 44, 44);
        ctx.drawImage(this.glow('#20c997', 64), ex - 30, ey - 30, 60, 60);
        const z = this.wz; // 레이저 위로 흘러가는 답변
        ctx.setTransform(z * ca, z * sa, -z * sa, z * ca, this.wox + pl.x * z, this.woy + pl.y * z);
        ctx.save();
        ctx.beginPath();
        ctx.rect(14, -p.width, p.len - 14, p.width * 2);
        ctx.clip();
        ctx.font = `800 ${Math.max(9, Math.round(p.width * 0.62))}px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = 'rgba(8,80,62,0.95)';
        ctx.fillText(GPT_TEXT + GPT_TEXT, 18 - (p.t * 260) % 120, 0.5);
        ctx.restore();
        this.worldTf(ctx);
        ctx.globalAlpha = MY_SHOT;
      } else if (p.kind === 'box') { // 게이밍 마우스 드래그 선택 → Delete
        const x = p.x - p.bw / 2, y = p.y - p.bh / 2;
        ctx.globalAlpha = MY_AREA;
        if (!p.fired) {
          const k = p.t / p.delay, w = p.bw * k, h = p.bh * k;
          ctx.fillStyle = 'rgba(34,139,230,0.14)';
          ctx.fillRect(x, y, w, h);
          const gr = ctx.createLinearGradient(x, y, x + p.bw, y + p.bh);
          const hue = (this.t * 200) % 360;
          gr.addColorStop(0, `hsl(${hue},90%,55%)`);
          gr.addColorStop(0.5, `hsl(${(hue + 120) % 360},90%,55%)`);
          gr.addColorStop(1, `hsl(${(hue + 240) % 360},90%,55%)`);
          ctx.strokeStyle = gr;
          ctx.lineWidth = 2.5;
          ctx.setLineDash([8, 6]);
          ctx.lineDashOffset = -this.t * 40;
          ctx.strokeRect(x, y, w, h);
          ctx.setLineDash([]);
          ctx.drawImage(this.cursorSprite(), x + w - 6, y + h - 4, 24, 24);
        } else {
          const k = Math.max(0, 1 - (p.t - p.delay) / (p.dur - p.delay));
          if (!p.fxDone) { // 내 공격은 파랑 (빨강은 적의 공격에만 쓴다)
            p.fxDone = true;
            this.burst(p.x, p.y, 14, ['#4dabf7', '#a5d8ff', '#1c7ed6', '#e7f5ff'], 260, 0.5, 6, 300);
          }
          ctx.fillStyle = `rgba(34,139,230,${0.3 * k})`;
          ctx.fillRect(x, y, p.bw, p.bh);
          ctx.strokeStyle = `rgba(24,100,171,${k})`;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, p.bw, p.bh);
        }
      }
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 적의 투사체: 모두 붉은 후광과 꼬리를 달고, 맨 위에 조금 크게 그린다 ─────────
  P.drawEnemyShots = function (ctx, g, b) {
    const shots = g.enemyShots;
    if (!shots.length) return;
    const paper = this.paperSprite(), q = this.questionSprite(), germ = this.germSprite(), warn = this.warnSprite();
    const halo = this.dangerHaloSprite(), tail = this.streak('#f03e3e'), pulse = 0.78 + Math.sin(this.t * 10) * 0.22;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      if (s.style === 'plot' || s.x < b.x0 || s.x > b.x1 || s.y < b.y0 || s.y > b.y1) continue;
      const sp = Math.hypot(s.vx, s.vy);
      if (sp > 1) { // 날아오는 방향을 알려 주는 꼬리
        ctx.globalAlpha = 0.6;
        this.drawRot(ctx, tail, s.x - (s.vx / sp) * 17, s.y - (s.vy / sp) * 17, Math.atan2(s.vy, s.vx), 36, 11);
      }
      ctx.globalAlpha = pulse;
      this.drawRot(ctx, halo, s.x, s.y, 0, 48, 48);
      ctx.globalAlpha = 1;
      if (s.heavy) { // 보스 탄: 진한 고리 (파리채로 못 막음)
        this.worldTf(ctx);
        ctx.strokeStyle = 'rgba(134,14,14,0.9)';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 16, 0, TAU);
        ctx.stroke();
      }
      if (s.style === 'question') {
        const k = 1 + Math.sin(this.wt * 10 + i) * 0.08;
        this.drawRot(ctx, q, s.x, s.y, 0, 31 * k, 31 * k);
      } else if (s.style === 'germ') this.drawRot(ctx, germ, s.x, s.y, this.wt * 3 + i, 31, 31);
      else if (s.style === 'warn') {
        const k = 1 + Math.sin(this.wt * 14 + i) * 0.12;
        this.drawRot(ctx, warn, s.x, s.y, 0, 28 * k, 26 * k);
      } else this.drawRot(ctx, paper, s.x, s.y, s.a + this.wt * 4, 24, 19);
    }
    ctx.globalAlpha = 1;
    this.worldTf(ctx);
  };

  // ───────── 보스 특수 패턴 예고: 빨간 지역이 안쪽부터 차오르다 꽉 차면 터진다 ─────────
  // layer 'floor': 바닥에 까는 채움 (적보다 아래) / 'top': 테두리·표시·터지는 효과 (모든 것 위)
  P.drawHazards = function (ctx, g, layer) {
    const hz = g.hazards;
    if (!hz.length) return;
    const top = layer === 'top';
    for (let i = 0; i < hz.length; i++) {
      const h = hz[i];
      if (h.t < 0) continue;
      const k = Math.min(1, h.t / h.warn), live = h.t >= h.warn, ka = live ? Math.min(1, (h.t - h.warn) / h.dur) : 0;
      if (h.kind === 'circle') this.hzCircle(ctx, h, k, live, ka, top);
      else if (h.kind === 'band') this.hzBand(ctx, h, k, live, ka, top);
      else if (h.kind === 'cone' || h.kind === 'sweep') this.hzSector(ctx, h, k, live, ka, top);
      else if (h.kind === 'wall' && top) this.hzWall(ctx, h, k, live, g.player);
      else if (h.kind === 'ring') this.hzRing(ctx, h, k, live, ka, top, g.player);
    }
    ctx.globalAlpha = 1;
    ctx.setLineDash([]);
    ctx.lineCap = 'butt';
    this.worldTf(ctx);
  };

  // 예고 테두리: 점선이 돌고, 터질 때가 다가올수록 빠르게 깜빡인다
  P.hzBlink = function (k) { return 0.72 + Math.sin(this.t * (10 + k * 14)) * 0.28 * k; };

  // 원: 로켓 과녁 / 재심사 도장
  P.hzCircle = function (ctx, h, k, live, ka, top) {
    if (!top) {
      if (live) return;
      ctx.fillStyle = `rgba(${HZ},${0.1 + k * 0.12})`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r, 0, TAU);
      ctx.fill();
      ctx.fillStyle = `rgba(${HZ},0.22)`;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * k, 0, TAU);
      ctx.fill();
      return;
    }
    if (live) { // 터지는 섬광
      ctx.globalAlpha = 1 - ka;
      ctx.fillStyle = h.style === 'rocket' ? 'rgba(255,212,59,0.6)' : 'rgba(201,42,42,0.5)';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * (0.85 + ka * 0.3), 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = this.hzBlink(k);
    ctx.strokeStyle = '#e03131';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -this.t * 40;
    ctx.beginPath();
    ctx.arc(h.x, h.y, h.r, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
    const left = h.warn - h.t;
    if (h.style === 'rocket') { // 과녁: 십자선 + 가운데 점, 마지막 0.45초에 로켓이 떨어진다
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [cx, cy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.moveTo(h.x + cx * h.r * 0.55, h.y + cy * h.r * 0.55);
        ctx.lineTo(h.x + cx * h.r * 1.14, h.y + cy * h.r * 1.14);
      }
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r * 0.4, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = '#e03131';
      ctx.beginPath();
      ctx.arc(h.x, h.y, 4, 0, TAU);
      ctx.fill();
      if (left < 0.45) {
        const f = 1 - left / 0.45;
        ctx.globalAlpha = 0.35 + f * 0.3;
        ctx.drawImage(this.shadowSprite(), h.x - 22 * f, h.y - 6 * f, 44 * f, 12 * f);
        ctx.globalAlpha = 1;
        this.drawRot(ctx, this.emojiSprite('🚀', 64), h.x, h.y - (1 - f) * 300 - 18, Math.PI * 0.75, 44, 44);
        this.worldTf(ctx);
      }
    } else if (h.style === 'check') { // 진도 체크: 돋보기 표적 + 십자선. 따라오는 동안 '진도 체크 중…', 멈추면 '확인!'
      const locked = h.t >= h.warn - (h.track ? h.track.lock : 0);
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [cx, cy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        ctx.moveTo(h.x + cx * h.r * 0.42, h.y + cy * h.r * 0.42);
        ctx.lineTo(h.x + cx * h.r * 0.86, h.y + cy * h.r * 0.86);
      }
      ctx.stroke();
      this.drawRot(ctx, this.emojiSprite('🔍', 64), h.x, h.y, locked ? 0 : Math.sin(this.t * 6) * 0.25, 34, 34);
      this.worldTf(ctx);
      ctx.font = `900 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, locked ? '확인!' : '진도 체크 중…', h.x, h.y - h.r - 14, '#e03131', '#fff', 4);
    } else { // 도장: 가운데 '재심사', 마지막 0.35초에 도장이 내려온다
      ctx.font = R.dfont(Math.round(h.r * 0.34));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = `rgba(201,42,42,${(0.25 + k * 0.45).toFixed(3)})`;
      ctx.fillText('재심사', h.x, h.y + 2);
      if (left < 0.35) {
        const f = 1 - left / 0.35, s = h.r * (3.2 - f * 1.1);
        ctx.globalAlpha = 0.2 + f * 0.55;
        ctx.drawImage(this.stampSprite(), h.x - s / 2, h.y - s / 2 - (1 - f) * 60, s, s);
      }
    }
    ctx.globalAlpha = 1;
  };

  // 긴 띠: OMR 답안 칸 / 빨간펜 줄 / 엑셀 행·열 / 로켓 발진 화살표 (띠 좌표: x = 길이 방향, y = 폭 방향)
  P.hzBand = function (ctx, h, k, live, ka, top) {
    const z = this.wz, c = Math.cos(h.a), s = Math.sin(h.a), L = h.len, W = h.w, omr = h.style === 'omr', excel = h.style === 'excel', rush = h.style === 'rush';
    ctx.setTransform(z * c, z * s, -z * s, z * c, this.wox + h.x * z, this.woy + h.y * z);
    if (!top) {
      if (!live) {
        ctx.fillStyle = `rgba(${HZ},${(omr || excel || rush ? 0.12 : 0.07) + k * 0.12})`;
        ctx.fillRect(-L, -W, L * 2, W * 2);
        ctx.fillStyle = `rgba(${HZ},0.2)`;
        ctx.fillRect(-L, -W * k, L * 2, W * 2 * k);
      }
      this.worldTf(ctx);
      return;
    }
    if (live) {
      if (omr) { // 컴퓨터용 사인펜으로 한쪽 끝부터 칠한다
        ctx.fillStyle = 'rgba(33,37,41,0.85)';
        ctx.fillRect(-L, -W * 0.82, L * 2 * Math.min(1, ka * 1.5), W * 1.64);
      } else if (excel) { // 셀 채우기: 가운데(내가 섰던 칸)부터 양 끝으로 번진다
        const f = Math.min(1, ka * 1.8);
        ctx.globalAlpha = 1 - ka * 0.5;
        ctx.fillStyle = 'rgba(224,49,49,0.55)';
        ctx.fillRect(-L * f, -W, L * 2 * f, W * 2);
        ctx.globalAlpha = 1;
      } else if (rush) { // 로켓 발진: 출발점에서 지금 보스 자리까지 로켓 연기 자국
        const o = h.owner, at = o ? Math.max(-L, Math.min(L, (o.x - h.x) * c + (o.y - h.y) * s)) : -L + L * 2 * ka;
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.5 * (1 - ka * 0.4);
        ctx.strokeStyle = '#adb5bd';
        ctx.lineWidth = W * 1.5;
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.lineTo(at, 0);
        ctx.stroke();
        ctx.globalAlpha = 0.65;
        ctx.strokeStyle = '#ff922b';
        ctx.lineWidth = W * 0.6;
        ctx.stroke();
        ctx.globalAlpha = 1;
        ctx.lineCap = 'butt';
      } else { // 빨간펜이 긋고 지나간다
        const x1 = -L + L * 2 * Math.min(1, ka * 1.6);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(224,49,49,0.35)';
        ctx.lineWidth = W * 2.4;
        ctx.beginPath();
        ctx.moveTo(-L, 0);
        ctx.lineTo(x1, 0);
        ctx.stroke();
        ctx.strokeStyle = '#e03131';
        ctx.lineWidth = W * 1.3;
        ctx.stroke();
        ctx.lineCap = 'butt';
        ctx.drawImage(this.penSprite(true), x1 - 24, -9, 48, 18);
      }
      this.worldTf(ctx);
      return;
    }
    ctx.globalAlpha = this.hzBlink(k);
    ctx.strokeStyle = '#e03131';
    if (omr) {
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-L, -W, L * 2, W * 2);
    } else if (excel) { // 엑셀 시트의 한 행(열): 테두리 + 셀 칸막이
      ctx.lineWidth = 2.5;
      ctx.strokeRect(-L, -W, L * 2, W * 2);
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const cw = W * 1.7;
      for (let x = -cw / 2 - Math.floor((L - cw / 2) / cw) * cw; x < L; x += cw) {
        ctx.moveTo(x, -W);
        ctx.lineTo(x, W);
      }
      ctx.stroke();
    } else if (rush) { // 로켓 발진: 점선 테두리 + 돌진 방향으로 흘러가는 화살표(>>>)
      ctx.lineWidth = 3;
      ctx.setLineDash([14, 9]);
      ctx.lineDashOffset = -this.t * 60;
      ctx.strokeRect(-L, -W, L * 2, W * 2);
      ctx.setLineDash([]);
      ctx.lineWidth = 6;
      ctx.lineJoin = 'round';
      const step = 54, off = (this.t * 160) % step;
      ctx.beginPath();
      for (let x = -L + 24 + off; x < L - 8; x += step) {
        ctx.moveTo(x - 14, -W * 0.45);
        ctx.lineTo(x + 6, 0);
        ctx.lineTo(x - 14, W * 0.45);
      }
      ctx.stroke();
      ctx.lineJoin = 'miter';
    } else {
      ctx.lineWidth = 3;
      ctx.setLineDash([16, 10]);
      ctx.lineDashOffset = -this.t * 70;
      ctx.beginPath();
      ctx.moveTo(-L, 0);
      ctx.lineTo(L, 0);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(224,49,49,0.4)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(-L, -W, L * 2, W * 2);
    }
    this.worldTf(ctx);
    if (omr) { // 답안 칸 동그라미 ①~⑤ (글자는 늘 바로 서게 월드 좌표로)
      ctx.lineWidth = 2;
      ctx.font = `900 ${Math.round(W * 0.8)}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e03131';
      const step = W * 3.4;
      for (let x = -L + step / 2, n = 0; x < L; x += step, n++) {
        const wx = h.x + c * x, wy = h.y + s * x;
        ctx.beginPath();
        ctx.arc(wx, wy, W * 0.62, 0, TAU);
        ctx.stroke();
        ctx.fillText(String((n % 5) + 1), wx, wy + 1);
      }
    }
    ctx.globalAlpha = 1;
  };

  // 부채꼴: 재채기 / 레이저 포인터 (sweep 은 터진 뒤 빔이 a0 → a1 로 쓸고 지나간다)
  P.hzSector = function (ctx, h, k, live, ka, top) {
    const a0 = h.a - h.half, a1 = h.a + h.half, sweep = h.kind === 'sweep';
    const sector = (rad, from, to) => {
      ctx.beginPath();
      ctx.moveTo(h.x, h.y);
      ctx.arc(h.x, h.y, rad, from, to);
      ctx.closePath();
    };
    if (!top) {
      if (!live) {
        ctx.fillStyle = `rgba(${HZ},${0.08 + k * 0.12})`;
        sector(h.r, a0, a1);
        ctx.fill();
        ctx.fillStyle = `rgba(${HZ},0.2)`;
        sector(h.r * k, a0, a1);
        ctx.fill();
      } else if (sweep) { // 아직 레이저가 지나가지 않은 곳
        const a = h.a0 + (h.a1 - h.a0) * ka;
        ctx.fillStyle = `rgba(${HZ},0.12)`;
        sector(h.r, Math.min(a, h.a1), Math.max(a, h.a1));
        ctx.fill();
      }
      return;
    }
    if (!live) {
      ctx.globalAlpha = this.hzBlink(k);
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -this.t * 40;
      sector(h.r, a0, a1);
      ctx.stroke();
      ctx.setLineDash([]);
      if (sweep) { // 레이저가 출발하는 가장자리 + 쓸고 갈 방향 화살표
        const dir = h.a1 > h.a0 ? 1 : -1, ar = h.r * 0.78;
        ctx.strokeStyle = '#c92a2a';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(h.x, h.y);
        ctx.lineTo(h.x + Math.cos(h.a0) * h.r, h.y + Math.sin(h.a0) * h.r);
        ctx.stroke();
        ctx.lineWidth = 4;
        ctx.beginPath();
        const e0 = h.a0 + dir * 0.12, e1 = h.a0 + dir * (0.12 + Math.abs(h.a1 - h.a0) * 0.45);
        ctx.arc(h.x, h.y, ar, Math.min(e0, e1), Math.max(e0, e1));
        ctx.stroke();
        const tip = e1, tx = h.x + Math.cos(tip) * ar, ty = h.y + Math.sin(tip) * ar;
        const tg = tip + (dir * Math.PI) / 2; // 원을 따라가는 방향
        ctx.fillStyle = '#c92a2a';
        ctx.beginPath();
        ctx.moveTo(tx + Math.cos(tg) * 14, ty + Math.sin(tg) * 14);
        ctx.lineTo(tx + Math.cos(tg + 2.4) * 11, ty + Math.sin(tg + 2.4) * 11);
        ctx.lineTo(tx + Math.cos(tg - 2.4) * 11, ty + Math.sin(tg - 2.4) * 11);
        ctx.closePath();
        ctx.fill();
      } else { // 재채기: 부채꼴 안의 세균
        const germ = this.germSprite();
        for (let j = 0; j < 4; j++) {
          const a = h.a + (j - 1.5) * h.half * 0.5, d = h.r * (0.42 + (j % 2) * 0.28);
          this.drawRot(ctx, germ, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, this.t * 2 + j, 20, 20);
        }
        this.worldTf(ctx);
      }
      ctx.globalAlpha = 1;
    } else if (sweep) { // 레이저 빔 + 끝의 빨간 점
      const a = h.a0 + (h.a1 - h.a0) * ka, ca = Math.cos(a), sa = Math.sin(a), r0 = (h.owner ? h.owner.r : 30) * 0.7;
      const ex = h.x + ca * h.r, ey = h.y + sa * h.r;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(h.x + ca * r0, h.y + sa * r0);
      ctx.lineTo(ex, ey);
      ctx.strokeStyle = 'rgba(255,107,107,0.35)';
      ctx.lineWidth = h.w * 5;
      ctx.stroke();
      ctx.strokeStyle = '#f03e3e';
      ctx.lineWidth = h.w * 1.8;
      ctx.stroke();
      ctx.strokeStyle = '#fff5f5';
      ctx.lineWidth = h.w * 0.55;
      ctx.stroke();
      ctx.lineCap = 'butt';
      ctx.drawImage(this.glow('#fa5252', 64), ex - 26, ey - 26, 52, 52);
      ctx.fillStyle = '#e03131';
      ctx.beginPath();
      ctx.arc(ex, ey, 6, 0, TAU);
      ctx.fill();
    }
  };

  // 고리: 마감 카운트다운(겹겹이 고리가 안쪽부터 터진다, 숫자 3·2·1) /
  //       발표자 조명(조명 밖 전체가 터진다. 초록 테두리 조명 안이 안전, 플레이어 옆에 초록 화살표)
  P.hzRing = function (ctx, h, k, live, ka, top, pl) {
    const spot = h.style === 'spot';
    const annulus = (r0, r1) => {
      ctx.beginPath();
      ctx.arc(h.x, h.y, r1, 0, TAU);
      if (r0 > 0) {
        ctx.moveTo(h.x + r0, h.y);
        ctx.arc(h.x, h.y, r0, 0, TAU, true);
      }
    };
    if (!top) {
      if (live) return;
      if (spot) { // 조명 밖이 점점 붉어지고, 조명 안은 따뜻하게 밝다
        ctx.fillStyle = `rgba(${HZ},${0.1 + k * 0.2})`;
        annulus(h.r0, h.r1);
        ctx.fill();
        ctx.globalAlpha = 0.7 + k * 0.3;
        ctx.drawImage(this.glow('#fff9db', 64), h.x - h.r0 * 1.3, h.y - h.r0 * 1.3, h.r0 * 2.6, h.r0 * 2.6);
        ctx.globalAlpha = 1;
      } else {
        ctx.fillStyle = `rgba(${HZ},${0.1 + k * 0.12})`;
        annulus(h.r0, h.r1);
        ctx.fill();
        ctx.fillStyle = `rgba(${HZ},0.22)`;
        annulus(h.r0, h.r0 + (h.r1 - h.r0) * k);
        ctx.fill();
      }
      return;
    }
    if (live) { // 터지는 섬광
      ctx.globalAlpha = (1 - ka) * (spot ? 0.4 : 0.6);
      ctx.fillStyle = spot ? '#e03131' : '#ff6b6b';
      annulus(h.r0, h.r1);
      ctx.fill();
      ctx.globalAlpha = 1;
      return;
    }
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.lineDashOffset = -this.t * 40;
    if (spot) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = '#2f9e44';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r0, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `900 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, '조명 안으로!', h.x, h.y - h.r0 - 16, '#2b8a3e', '#fff', 4);
      const dx = h.x - pl.x, dy = h.y - pl.y, d = Math.hypot(dx, dy);
      if (d > h.r0 - pl.r) { // 플레이어 옆에서 조명 쪽을 가리키는 초록 화살표
        const ux = dx / d, uy = dy / d, ax = pl.x + ux * 44, ay = pl.y + uy * 44, sz = 15;
        ctx.fillStyle = '#2f9e44';
        ctx.beginPath();
        ctx.moveTo(ax + ux * sz, ay + uy * sz);
        ctx.lineTo(ax - ux * sz * 0.6 - uy * sz * 0.75, ay - uy * sz * 0.6 + ux * sz * 0.75);
        ctx.lineTo(ax - ux * sz * 0.6 + uy * sz * 0.75, ay - uy * sz * 0.6 - ux * sz * 0.75);
        ctx.closePath();
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#fff';
        ctx.stroke();
      }
    } else {
      ctx.globalAlpha = this.hzBlink(k);
      ctx.strokeStyle = '#e03131';
      ctx.beginPath();
      ctx.arc(h.x, h.y, h.r1, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      // 카운트다운 숫자: 고리 위쪽 가운데
      const ry = h.y - (h.r0 + h.r1) / 2;
      ctx.font = R.dfont(26);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, h.label || '', h.x, ry, '#e03131', '#fff', 5);
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  };

  // 질문 벽: 출발선(빨간 점선)과 밀려올 방향 화살표, 빈틈(초록 화살표)
  // 벽이 아직 화면 밖에 있으면 표시는 화면 가장자리 안쪽에 대신 그린다 (벽이 화면에 들어오면 벽을 따라간다)
  P.hzWall = function (ctx, h, k, live, pl) {
    const px = -h.uy, py = h.ux, t = live ? h.t - h.warn : 0;
    let wx = h.x + h.ux * h.speed * t, wy = h.y + h.uy * h.speed * t;
    // 화면 위쪽은 시계·보스 막대, 아래쪽은 알림이 있어 그만큼 더 안쪽에 그린다
    const mx = 70, my = h.uy > 0 ? 180 : 125;
    const reach = Math.min((this.viewW / 2 - mx) / (Math.abs(h.ux) || 1e-6), (this.viewH / 2 - my) / (Math.abs(h.uy) || 1e-6));
    const ahead = (pl.x - wx) * h.ux + (pl.y - wy) * h.uy; // 벽에서 플레이어까지 (밀려오는 방향으로)
    if (ahead > reach) {
      wx += h.ux * (ahead - reach);
      wy += h.uy * (ahead - reach);
    }
    const g0 = h.gapOff - h.gapW / 2, g1 = h.gapOff + h.gapW / 2;
    const arrow = (x, y, ux, uy, s, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(x + ux * s, y + uy * s);
      ctx.lineTo(x - ux * s * 0.6 - uy * s * 0.75, y - uy * s * 0.6 + ux * s * 0.75);
      ctx.lineTo(x - ux * s * 0.6 + uy * s * 0.75, y - uy * s * 0.6 - ux * s * 0.75);
      ctx.closePath();
      ctx.fill();
    };
    if (!live) {
      ctx.globalAlpha = this.hzBlink(k);
      ctx.strokeStyle = '#e03131';
      ctx.lineWidth = 5;
      ctx.setLineDash([12, 8]);
      ctx.lineDashOffset = -this.t * 40;
      ctx.beginPath();
      ctx.moveTo(wx - px * h.half, wy - py * h.half);
      ctx.lineTo(wx + px * g0, wy + py * g0);
      ctx.moveTo(wx + px * g1, wy + py * g1);
      ctx.lineTo(wx + px * h.half, wy + py * h.half);
      ctx.stroke();
      ctx.setLineDash([]);
      for (let o = -h.half + 30; o < h.half; o += 96) {
        if (o > g0 - 36 && o < g1 + 36) continue;
        arrow(wx + px * o + h.ux * 34, wy + py * o + h.uy * 34, h.ux, h.uy, 13, '#e03131');
      }
    }
    // 빈틈: 날아오는 동안에도 초록 화살표로 표시
    const gx = wx + px * h.gapOff, gy = wy + py * h.gapOff;
    ctx.globalAlpha = live ? 0.6 : 0.95;
    ctx.strokeStyle = '#2f9e44';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(wx + px * g0, wy + py * g0);
    ctx.lineTo(wx + px * g1, wy + py * g1);
    ctx.stroke();
    arrow(gx + h.ux * 30, gy + h.uy * 30, h.ux, h.uy, 18, '#2f9e44');
    if (!live) {
      ctx.font = `900 15px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      this.outlined(ctx, '빈틈', gx + h.ux * 62, gy + h.uy * 62, '#2b8a3e', '#fff', 4);
    }
    ctx.globalAlpha = 1;
  };

  // 패턴이 터진 자리에 잠깐 남는 자국 (로켓 그을음 · 도장 · 칠한 답안 칸 · 빨간펜 자국)
  P.drawMarks = function (ctx) {
    const ms = this.marks;
    for (let i = 0; i < ms.length; i++) {
      const m = ms[i], k = 1 - m.t / m.dur;
      if (m.kind === 'scorch') {
        ctx.globalAlpha = k * 0.55;
        ctx.drawImage(this.glow('#495057', 64), m.x - m.r, m.y - m.r * 0.8, m.r * 2, m.r * 1.6);
      } else if (m.kind === 'stamp') {
        ctx.globalAlpha = Math.min(1, k * 1.6) * 0.85;
        this.drawRot(ctx, this.stampSprite(), m.x, m.y, m.rot, m.r * 2.1, m.r * 2.1);
        this.worldTf(ctx);
      } else { // omr 칠한 칸 · 빨간펜 자국
        const z = this.wz, c = Math.cos(m.a), s = Math.sin(m.a);
        ctx.setTransform(z * c, z * s, -z * s, z * c, this.wox + m.x * z, this.woy + m.y * z);
        ctx.globalAlpha = k * (m.kind === 'omr' ? 0.7 : 0.6);
        ctx.fillStyle = m.kind === 'omr' ? '#343a40' : '#e03131';
        ctx.fillRect(-m.len, -m.w * (m.kind === 'omr' ? 0.82 : 0.55), m.len * 2, m.w * (m.kind === 'omr' ? 1.64 : 1.1));
        this.worldTf(ctx);
      }
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 게임이 만든 이펙트 (처치 연기 · 폭발 고리 · 성소 고리) ─────────
  P.drawEffects = function (ctx, g) {
    const ef = g.effects;
    for (let i = 0; i < ef.length; i++) {
      const e = ef[i], k = e.t / e.dur;
      if (e.kind === 'puff') {
        const s = e.r * (2 + k * 1.6);
        ctx.globalAlpha = 0.4 * (1 - k);
        ctx.drawImage(this.glow(e.color, 64), e.x - s / 2, e.y - s / 2, s, s);
      } else if (e.kind === 'ring') {
        const rad = e.r * (0.4 + R.outCubic(k) * 0.8);
        ctx.globalAlpha = (1 - k) * 0.2;
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1 - k;
        ctx.strokeStyle = e.color;
        ctx.lineWidth = 7 * (1 - k) + 2;
        ctx.stroke();
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(e.x, e.y, rad * 0.7, 0, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 파티클 ─────────
  P.drawParts = function (ctx) {
    const ps = this.parts;
    if (!ps.length) return;
    let rot = false;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i], k = p.life / p.max, m = p.my ? MY_AREA : 1;
      switch (p.k) {
        case PK.CHUNK: {
          const s = p.s * (0.4 + k * 0.6);
          ctx.globalAlpha = Math.min(1, k * 2.5) * m;
          ctx.fillStyle = p.c;
          ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s);
          break;
        }
        case PK.SPARK:
          ctx.globalAlpha = k * m;
          ctx.strokeStyle = p.c;
          ctx.lineWidth = p.s;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04);
          ctx.stroke();
          break;
        case PK.GLOW: {
          const s = p.s * (0.5 + k * 0.7);
          ctx.globalAlpha = Math.min(1, k * 1.6) * m;
          ctx.drawImage(this.glow(p.c, 64), p.x - s, p.y - s, s * 2, s * 2);
          break;
        }
        case PK.RING:
          ctx.globalAlpha = k;
          ctx.strokeStyle = p.c;
          ctx.lineWidth = 1 + 5 * k;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.s * (1 - 0.7 * k * k), 0, TAU);
          ctx.stroke();
          break;
        case PK.STAR: {
          const s = p.s * Math.sin(k * Math.PI);
          ctx.globalAlpha = Math.min(1, k * 2);
          ctx.drawImage(this.sparkSprite(p.c), p.x - s / 2, p.y - s / 2, s, s);
          break;
        }
        case PK.DUST: {
          const s = p.s * (1.8 - k);
          ctx.globalAlpha = k * 0.45;
          ctx.drawImage(this.glow(p.c, 32), p.x - s, p.y - s * 0.6, s * 2, s * 1.2);
          break;
        }
        case PK.PAPER:
          ctx.globalAlpha = Math.min(1, k * 2);
          this.drawRot(ctx, this.paperSprite(), p.x, p.y, p.rot, 19 * (0.6 + 0.4 * Math.abs(Math.sin(p.rot))), 15);
          rot = true;
          break;
        case PK.CONFETTI:
          ctx.globalAlpha = Math.min(1, k * 2);
          this.drawRot(ctx, this.glow(p.c, 32), p.x, p.y, p.rot, p.s, p.s * 0.5);
          rot = true;
          break;
      }
      if (rot) { this.worldTf(ctx); rot = false; }
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 피해 숫자 · 글자 (톡 튀어 오른다) ─────────
  P.drawTexts = function (ctx, g) {
    const tx = g.texts, z = this.wz;
    if (!tx.length) return;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    let last = '';
    for (let i = 0; i < tx.length; i++) {
      const t = tx[i], k = t.t / t.dur;
      const pop = k < 0.12 ? 0.5 + (k / 0.12) * 0.8 : k < 0.25 ? 1.3 - ((k - 0.12) / 0.13) * 0.3 : 1;
      ctx.globalAlpha = (k > 0.7 ? (1 - k) / 0.3 : 1) * (t.minor ? MY_TEXT : 1);
      ctx.setTransform(z * pop, 0, 0, z * pop, this.wox + t.x * z, this.woy + t.y * z);
      const f = R.dfont(t.size);
      if (f !== last) { ctx.font = f; last = f; }
      ctx.lineWidth = Math.max(3, t.size * 0.26);
      ctx.strokeStyle = 'rgba(22,27,42,0.92)';
      ctx.strokeText(t.text, 0, 0);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, 0, 0);
    }
    ctx.globalAlpha = 1;
    this.worldTf(ctx);
  };
})(window.GS = window.GS || {});
