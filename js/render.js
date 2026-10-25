// 캔버스 그리기의 뼈대: 해상도·스프라이트 캐시·카메라 흔들림·파티클·이벤트 연출과 그리기 순서
// 그림은 art.js(스프라이트) / world.js(연구실 배경·적·무기·이펙트) / hud.js(HUD·알림·배너)에 나뉘어 있다
(function (GS) {
  'use strict';
  const U = GS.util;
  const TAU = Math.PI * 2;
  const MAX_PARTS = 900;

  // ───────── 공용 그리기 도구 (다른 그리기 파일에서 GS.R 로 쓴다) ─────────
  const R = GS.R = {
    TAU,
    EMOJI: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif',
    FONT: '"Pretendard","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif',
    DISPLAY: '"Black Han Sans","Pretendard","Malgun Gothic","Apple SD Gothic Neo",sans-serif',
  };

  R.roundRect = function (x, X, Y, W, H, r) {
    r = Math.max(0, Math.min(r, W / 2, H / 2));
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + W, Y, X + W, Y + H, r);
    x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r);
    x.arcTo(X, Y, X + W, Y, r);
    x.closePath();
  };

  R.hash = function (x, y) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  };

  const rgbCache = new Map();
  function rgb(hex) {
    let c = rgbCache.get(hex);
    if (c) return c;
    let h = hex.charAt(0) === '#' ? hex.slice(1) : hex;
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    const n = parseInt(h, 16);
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, c);
    return c;
  }
  // amt > 0 이면 흰색 쪽으로, < 0 이면 검은색 쪽으로 섞은 색 (#rrggbb)
  R.shade = function (hex, amt) {
    const c = rgb(hex), t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    const v = (i) => Math.round(c[i] + (t - c[i]) * p);
    return '#' + ((1 << 24) + (v(0) << 16) + (v(1) << 8) + v(2)).toString(16).slice(1);
  };
  R.rgba = function (hex, a) {
    const c = rgb(hex);
    return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
  };
  R.outCubic = (k) => 1 - Math.pow(1 - k, 3);
  R.outBack = (k) => 1 + 2.70158 * Math.pow(k - 1, 3) + 1.70158 * Math.pow(k - 1, 2);

  // 제목·숫자용 굵은 글꼴. 웹 글꼴(Black Han Sans)을 못 불러왔으면 기본 글꼴을 가장 굵게
  R.hasDisplay = false;
  R.dfont = (px) => (R.hasDisplay ? `${px}px ${R.DISPLAY}` : `900 ${px}px ${R.FONT}`);

  // 파티클 종류
  const PK = R.PK = { CHUNK: 0, SPARK: 1, GLOW: 2, RING: 3, STAR: 4, PAPER: 5, DUST: 6, CONFETTI: 7 };

  // 웨이브마다 바뀌는 연구실 조명: [r, g, b, 색 진하기, 가장자리 어둡기]
  const AMBIENT = [
    [255, 255, 255, 0, 0.12],    // 1학기: 밝은 오전
    [255, 196, 120, 0.05, 0.14], // 2학기: 오후 햇살
    [255, 140, 80, 0.07, 0.17],  // 3학기: 해 질 녘
    [70, 95, 190, 0.08, 0.22],   // 4학기: 밤샘
    [50, 35, 80, 0.13, 0.3],     // 박사: 끝이 없다
  ];

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cache = new Map();
      this.toasts = [];
      this.banners = [];
      this.t = 0;          // 화면 시간 (항상 흐른다)
      this.wt = 0;         // 월드 시간 (게임 진행 중에만 흐른다)
      this.rosterOn = false; // Tab: 오른쪽 '이번 학기 적' 목록 (처음엔 꺼져 있고, 게임을 다시 시작해도 그대로)
      this.rosterK = 0;
      this.parts = [];
      this.pool = [];
      this.vis = [];
      this.plotBuf = [];
      this.resetFx();
      this.resize();
      window.addEventListener('resize', () => this.resize());
      this.watchFonts();
    }

    resetFx() {
      this.parts.length = 0;
      this.shake = 0;
      this.shakeX = 0;
      this.shakeY = 0;
      this.flash = 0;
      this.warn = 0;
      this.glitch = 0;
      this.deadT = 0;
      this.amb = null;
      this.face = 1;
      this.walkPh = 0;
      this.pStage = null; // 지금 그리는 주인공 모습 단계 (웨이브에 따라 바뀐다)
      this.stageFx = 0;
      this.dustT = 0;
      this.emberT = 0;
      this.marks = []; // 보스 패턴이 터진 자리에 잠깐 남는 자국
      this.hud = { xp: 0, lvl: 0, lvlFlash: 0, score: 0, bars: new Map(), hpLag: 1 }; // bars: 보스별 체력 막대 상태
      this.noHud = false; // 소개 영상: 화면 위 정보(HUD)·가장자리 화살표를 숨긴다
      this.camOffX = 0;   // 소개 영상: 카메라를 옮긴다 (화면을 나눠 여러 게임을 한꺼번에 보여 줄 때)
      this.camOffY = 0;
    }

    resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = window.innerWidth, h = window.innerHeight;
      this.dpr = dpr;
      this.cssW = w;
      this.cssH = h;
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';
      const base = GS.data.config.view;
      this.zoom = Math.min(w / base.width, h / base.height);
      this.viewW = w / this.zoom;
      this.viewH = h / this.zoom;
      this.ui = U.clamp(Math.min(w / 1280, h / 720), 0.72, 1.4);
      const res = this.zoom * dpr > 1.6 ? 3 : 2;
      if (res !== this.res) { this.res = res; this.cache.clear(); }
    }

    // 웹 글꼴이 늦게 도착하면 글자가 들어간 스프라이트를 다시 그린다
    watchFonts() {
      const fs = document.fonts;
      if (!fs) return;
      let timer = 0;
      const refresh = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
          let ok = false;
          fs.forEach((f) => { if (f.family.replace(/["']/g, '') === 'Black Han Sans' && f.status === 'loaded') ok = true; });
          R.hasDisplay = ok;
          this.cache.clear();
        }, 150);
      };
      if (fs.addEventListener) fs.addEventListener('loadingdone', refresh);
      try {
        fs.load('20px "Black Han Sans"', '대학원에서 살아남기 0123456789').then(refresh, () => {});
        fs.load('700 20px "Pretendard"', '대학원 수업 연구 실적');
        fs.load('800 20px "Pretendard"', '대학원 수업 연구 실적');
      } catch (e) { /* 글꼴을 못 불러오면 기본 글꼴 사용 */ }
    }

    // ───────── 스프라이트 캐시 ─────────
    sprite(key, w, h, draw) {
      let c = this.cache.get(key);
      if (c) return c;
      // 큰 그림(가구·성소 바닥 등)은 해상도를 2배까지만: 고해상도 화면에서 메모리를 아낀다
      const res = w * h > 12000 ? Math.min(this.res, 2) : this.res;
      c = document.createElement('canvas');
      c.width = Math.max(1, Math.ceil(w * res));
      c.height = Math.max(1, Math.ceil(h * res));
      const x = c.getContext('2d');
      x.k = res;
      x.scale(res, res);
      draw(x, w, h);
      c.dw = w;
      c.dh = h;
      c.key = key;
      this.cache.set(key, c);
      return c;
    }

    // 스프라이트를 한 가지 색으로 칠한 실루엣 (맞았을 때 번쩍임, 얼음, 피격 등)
    tinted(spr, color) {
      const key = 'tint:' + spr.key + color;
      let c = this.cache.get(key);
      if (c) return c;
      c = document.createElement('canvas');
      c.width = spr.width;
      c.height = spr.height;
      const x = c.getContext('2d');
      x.drawImage(spr, 0, 0);
      x.globalCompositeOperation = 'source-in';
      x.fillStyle = color;
      x.fillRect(0, 0, c.width, c.height);
      c.dw = spr.dw;
      c.dh = spr.dh;
      c.cx = spr.cx;
      c.cy = spr.cy;
      c.key = key;
      this.cache.set(key, c);
      return c;
    }

    // ───────── 공통 그리기 헬퍼 ─────────
    worldTf(ctx) { ctx.setTransform(this.wz, 0, 0, this.wz, this.wox, this.woy); }

    drawRot(ctx, spr, x, y, a, w, h) {
      const c = Math.cos(a), s = Math.sin(a), z = this.wz;
      ctx.setTransform(z * c, z * s, -z * s, z * c, this.wox + x * z, this.woy + y * z);
      ctx.drawImage(spr, -w / 2, -h / 2, w, h);
    }

    outlined(ctx, text, x, y, fill, stroke, lw) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = lw;
      ctx.strokeStyle = stroke;
      ctx.strokeText(text, x, y);
      ctx.fillStyle = fill;
      ctx.fillText(text, x, y);
    }

    addToast(t) {
      this.toasts.push({ text: t.text, color: t.color || '#868e96', t: 0 });
      if (this.toasts.length > 4) this.toasts.shift();
    }

    showBanner(b) {
      if (this.banners.length > 3) this.banners.shift();
      this.banners.push(Object.assign({ t: 0 }, b));
    }

    // 새 게임에 연출 이벤트 연결 (로직은 그대로, 화면 효과만 붙인다)
    attach(g) {
      this.resetFx();
      g.on('kill', (e) => this.onKill(e));
      g.on('hit', (e) => this.onHit(e));
      g.on('explode', (e) => this.onExplode(e));
      g.on('nuke', () => { this.addShake(12); this.flash = Math.max(this.flash, 0.6); });
      g.on('hazard', (h) => this.onHazard(h));
      g.on('deflect', (s) => { // 파리채로 쳐 낸 적의 탄: 하얀(전기 모기채는 파란) 팝
        this.part(PK.RING, s.x, s.y, 0, 0, 0.22, 16, s.evo ? '#74c0fc' : '#ffffff');
        this.burst(s.x, s.y, 3, s.evo ? ['#a5d8ff', '#ffe066'] : ['#ffffff', '#dee2e6'], 170, 0.25, 3, 0);
      });
      g.on('sfx', (n) => this.onSfx(n, g));
    }

    // ───────── 파티클 ─────────
    part(kind, x, y, vx, vy, life, size, color) {
      if (this.parts.length >= MAX_PARTS) return null;
      const p = this.pool.pop() || {};
      p.k = kind;
      p.x = x;
      p.y = y;
      p.vx = vx;
      p.vy = vy;
      p.life = life;
      p.max = life;
      p.s = size;
      p.c = color;
      p.rot = Math.random() * TAU;
      p.vr = 0;
      p.drag = 3;
      p.grav = 0;
      this.parts.push(p);
      return p;
    }

    updateParts(dt) {
      if (dt <= 0) return;
      const ps = this.parts;
      for (let i = ps.length - 1; i >= 0; i--) {
        const p = ps[i];
        p.life -= dt;
        if (p.life <= 0) {
          ps[i] = ps[ps.length - 1];
          ps.pop();
          this.pool.push(p);
          continue;
        }
        const d = Math.exp(-p.drag * dt);
        p.vx *= d;
        p.vy = p.vy * d + p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.vr * dt;
      }
    }

    // 사방으로 튀는 조각
    burst(x, y, n, colors, speed, life, size, grav) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = speed * (0.45 + Math.random() * 0.75);
        const p = this.part(PK.CHUNK, x, y, Math.cos(a) * sp, Math.sin(a) * sp - speed * 0.25, life * (0.6 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), colors[i % colors.length]);
        if (p) { p.grav = grav || 0; p.drag = 2.4; }
      }
    }

    sparkle(x, y, n, color, spread) {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, d = Math.random() * spread;
        const p = this.part(PK.STAR, x + Math.cos(a) * d, y + Math.sin(a) * d, Math.cos(a) * 30, -30 - Math.random() * 50, 0.5 + Math.random() * 0.5, 7 + Math.random() * 6, color);
        if (p) p.drag = 1.5;
      }
    }

    addShake(a) { this.shake = Math.min(24, Math.max(this.shake, a)); }

    // ───────── 게임 이벤트 → 화면 연출 ─────────
    onKill(e) {
      const base = e.def.sprite.bg, big = e.boss ? 3 : e.elite ? 2 : e.r > 19 ? 1 : 0;
      const load = this.parts.length;
      let n = [6, 9, 18, 50][big];
      if (big === 0) n = load > 650 ? 1 : load > 420 ? 3 : n;
      const mid = R.shade(base, -0.12), dark = R.shade(base, -0.4);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * TAU, sp = (80 + Math.random() * 150) * (1 + big * 0.5);
        const p = this.part(PK.CHUNK, e.x + Math.cos(a) * e.r * 0.4, e.y + Math.sin(a) * e.r * 0.4,
          Math.cos(a) * sp, Math.sin(a) * sp - 70, 0.4 + Math.random() * 0.35, (3 + Math.random() * 3.5) * (1 + big * 0.35), i % 3 === 0 ? dark : mid);
        if (p) { p.grav = 430; p.drag = 2.2; }
      }
      if (load < 700 || big) this.part(PK.RING, e.x, e.y, 0, 0, 0.3, e.r * 1.75, big >= 2 ? '#f59f00' : mid);
      if (big >= 2) this.sparkle(e.x, e.y, big === 3 ? 18 : 8, '#fcc419', e.r);
      if (e.boss) {
        this.addShake(18);
        this.flash = Math.max(this.flash, 0.55);
        for (let i = 0; i < 26; i++) { // 보스가 남긴 서류가 흩날린다
          const a = Math.random() * TAU, sp = 120 + Math.random() * 260;
          const p = this.part(PK.PAPER, e.x, e.y, Math.cos(a) * sp, Math.sin(a) * sp - 120, 1.1 + Math.random() * 0.8, 1, '#fff');
          if (p) { p.grav = 160; p.drag = 1.6; p.vr = (Math.random() - 0.5) * 12; }
        }
        for (let i = 0; i < 3; i++) this.part(PK.RING, e.x, e.y, 0, 0, 0.45 + i * 0.18, e.r * (2.4 + i * 1.3), i ? '#fab005' : '#e03131');
      }
    }

    onHit(e) {
      if (this.hitBudget <= 0) return;
      this.hitBudget--;
      let dx = e.hdx || 0, dy = e.hdy || 0;
      if (!dx && !dy) { const a = Math.random() * TAU; dx = Math.cos(a); dy = Math.sin(a); }
      const x = e.x - dx * e.r * 0.6, y = e.y - dy * e.r * 0.6, base = Math.atan2(dy, dx);
      for (let i = 0; i < 2; i++) {
        const a = base + (Math.random() - 0.5) * 1.5, sp = 240 + Math.random() * 260;
        const p = this.part(PK.SPARK, x, y, Math.cos(a) * sp, Math.sin(a) * sp, 0.14 + Math.random() * 0.1, 2.2, i ? '#ff922b' : '#fab005');
        if (p) p.drag = 6;
      }
    }

    // 보스 특수 패턴이 터지는 순간
    onHazard(h) {
      const ms = this.marks;
      if (h.style === 'rocket') {
        this.addShake(7);
        this.burst(h.x, h.y, 14, ['#ff922b', '#fa5252', '#ffd43b', '#495057'], 300, 0.55, 6, 260);
        this.part(PK.RING, h.x, h.y, 0, 0, 0.45, h.r * 1.15, '#f76707');
        this.part(PK.GLOW, h.x, h.y, 0, 0, 0.35, h.r * 0.9, '#ffd43b');
        if (ms.length < 40) ms.push({ kind: 'scorch', x: h.x, y: h.y, r: h.r * 0.9, t: 0, dur: 1.4 });
      } else if (h.style === 'stamp') {
        this.addShake(16);
        this.flash = Math.max(this.flash, 0.35);
        this.part(PK.RING, h.x, h.y, 0, 0, 0.5, h.r * 1.35, '#e03131');
        this.burst(h.x, h.y, 12, ['#e03131', '#ff8787', '#c92a2a'], 260, 0.5, 6, 200);
        if (ms.length < 40) ms.push({ kind: 'stamp', x: h.x, y: h.y, r: h.r, rot: (Math.random() - 0.5) * 0.5, t: 0, dur: 1.8 });
      } else if (h.style === 'omr' || h.style === 'redpen' || h.style === 'excel') {
        this.addShake(h.style === 'redpen' ? 6 : h.style === 'excel' ? 4 : 3);
        const c = Math.cos(h.a), s = Math.sin(h.a), col = h.style === 'omr' ? ['#495057', '#868e96'] : h.style === 'excel' ? ['#e03131', '#ffc9c9'] : ['#e03131', '#ff8787'];
        for (let i = 0; i < 6; i++) {
          const d = (Math.random() - 0.5) * 2 * h.len;
          this.burst(h.x + c * d, h.y + s * d, 2, col, 160, 0.4, 4, 200);
        }
        if (ms.length < 40) ms.push({ kind: h.style === 'omr' ? 'omr' : 'ink', x: h.x, y: h.y, a: h.a, len: h.len, w: h.w, t: 0, dur: h.style === 'omr' ? 0.8 : 1.1 });
      } else if (h.style === 'sneeze') {
        this.addShake(5);
        for (let i = 0; i < 6; i++) {
          const a = h.a + (Math.random() - 0.5) * 2 * h.half, d = h.r * (0.25 + Math.random() * 0.7);
          const p = this.part(PK.GLOW, h.x + Math.cos(a) * d, h.y + Math.sin(a) * d, Math.cos(a) * 60, Math.sin(a) * 60, 0.6, 22, '#8ce99a');
          if (p) p.drag = 2;
        }
      } else if (h.style === 'laser') {
        this.addShake(4);
        this.part(PK.GLOW, h.x, h.y, 0, 0, 0.3, 50, '#fa5252');
      } else if (h.style === 'rush') { // 로켓 발진: 출발점에서 불꽃과 연기
        this.addShake(8);
        const sx = h.x - Math.cos(h.a) * h.len, sy = h.y - Math.sin(h.a) * h.len;
        this.burst(sx, sy, 14, ['#ff922b', '#ffd43b', '#fa5252', '#adb5bd'], 260, 0.5, 6, 0);
        this.part(PK.RING, sx, sy, 0, 0, 0.35, h.w * 1.6, '#ff922b');
      } else if (h.style === 'check') { // 진도 체크: 표적 자리가 빨갛게 터진다
        this.addShake(6);
        this.part(PK.RING, h.x, h.y, 0, 0, 0.4, h.r * 1.2, '#e03131');
        this.burst(h.x, h.y, 10, ['#e03131', '#ff8787', '#ffd8a8'], 240, 0.45, 5, 200);
      } else if (h.style === 'countdown') { // 고리를 따라 터지는 불꽃
        this.addShake(5);
        const rm = (h.r0 + h.r1) / 2;
        this.part(PK.RING, h.x, h.y, 0, 0, 0.35, h.r1 * 1.06, '#fa5252');
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * Math.PI * 2;
          this.burst(h.x + Math.cos(a) * rm, h.y + Math.sin(a) * rm, 1, ['#ff922b', '#fa5252', '#ffd43b'], 150, 0.4, 4, 160);
        }
      } else if (h.style === 'spot') { // 조명 밖 전체가 터진다
        this.addShake(14);
        this.flash = Math.max(this.flash, 0.3);
        this.part(PK.RING, h.x, h.y, 0, 0, 0.45, h.r0 * 1.6, '#ffd43b');
      }
    }

    onExplode(e) {
      this.addShake(8);
      const B = e.def.bomb;
      this.burst(e.x, e.y, 16, ['#339af0', '#74c0fc', '#1c7ed6', '#d0ebff'], 320, 0.6, 5, 200);
      this.part(PK.RING, e.x, e.y, 0, 0, 0.5, B.radius, '#1c7ed6');
      this.part(PK.GLOW, e.x, e.y, 0, 0, 0.35, B.radius * 0.8, '#74c0fc');
    }

    onSfx(n, g) {
      const pl = g.player;
      switch (n) {
        case 'hurt': this.addShake(6); break;
        case 'levelup':
          this.part(PK.RING, pl.x, pl.y, 0, 0, 0.55, 90, '#4dabf7');
          this.part(PK.GLOW, pl.x, pl.y, 0, 0, 0.5, 70, '#74c0fc');
          this.sparkle(pl.x, pl.y, 12, '#339af0', 34);
          break;
        case 'evolve':
          this.addShake(6);
          this.flash = Math.max(this.flash, 0.4);
          for (let i = 0; i < 3; i++) this.part(PK.RING, pl.x, pl.y, 0, 0, 0.5 + i * 0.2, 110 + i * 70, '#f59f00');
          this.sparkle(pl.x, pl.y, 26, '#fcc419', 60);
          break;
        case 'boss': this.warn = 2.6; this.addShake(9); break;
        case 'bossdown': this.addShake(18); break;
        case 'chest': this.sparkle(pl.x, pl.y - 16, 16, '#fcc419', 40); break;
        case 'item': this.sparkle(pl.x, pl.y - 10, 8, '#22b8cf', 26); break;
        case 'sanctuary': this.sparkle(pl.x, pl.y, 18, '#51cf66', 50); break;
        case 'jam': this.glitch = 0.75; this.addShake(8); break;
        case 'dead': this.addShake(22); this.deadT = 0.001; break;
        case 'chapter': this.flash = Math.max(this.flash, 0.5); break;
        case 'gem':
          if (this.gemBudget-- > 0) {
            const p = this.part(PK.STAR, pl.x + (Math.random() - 0.5) * 22, pl.y - 4 + (Math.random() - 0.5) * 22, 0, -50, 0.35, 8, '#4dabf7');
            if (p) p.drag = 2;
          }
          break;
      }
    }

    // ───────── 메인 그리기 ─────────
    draw(g, dt) {
      this.t += dt;
      const wdt = g.phase === 'playing' ? dt : 0;
      this.wt += wdt;
      this.dt = dt;
      this.wdt = wdt;
      this.hitBudget = 16;
      this.gemBudget = 3;
      this.updateParts(wdt);
      this.shake *= Math.exp(-dt * 9);
      if (this.shake < 0.3) this.shake = 0;
      this.shakeX = (Math.random() * 2 - 1) * this.shake;
      this.shakeY = (Math.random() * 2 - 1) * this.shake;
      this.flash = Math.max(0, this.flash - dt * 1.6);
      this.warn = Math.max(0, this.warn - dt);
      this.glitch = Math.max(0, this.glitch - dt);
      if (this.deadT > 0) this.deadT += dt;

      const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height, pl = g.player;
      this.wz = this.zoom * this.dpr;
      const camX = pl.x + this.shakeX + this.camOffX, camY = pl.y + this.shakeY + this.camOffY;
      this.wox = cw / 2 - camX * this.wz;
      this.woy = ch / 2 - camY * this.wz;
      this.updateAmbient(AMBIENT[g.phd ? 4 : Math.min(3, g.chapterIndex)], dt);
      this.drawBackground(ctx, camX, camY, g.character); // 캐릭터마다 다른 맵
      this.worldTf(ctx);
      for (let i = this.marks.length - 1; i >= 0; i--) { // 패턴 자국은 게임 시간으로 사라진다
        const m = this.marks[i];
        m.t += wdt;
        if (m.t >= m.dur) this.marks.splice(i, 1);
      }
      const b = {
        x0: camX - this.viewW / 2 - 60, x1: camX + this.viewW / 2 + 60,
        y0: camY - this.viewH / 2 - 60, y1: camY + this.viewH / 2 + 60,
      };
      this.drawSanctuaries(ctx, g);
      this.drawGems(ctx, g, b);
      this.drawItems(ctx, g);
      this.drawAuras(ctx, g, wdt);          // 내 무기 효과는 조금 연하게 (world.js MY_AREA · MY_SHOT)
      this.drawPools(ctx, g, b);
      this.drawMarks(ctx);
      this.drawHazards(ctx, g, 'floor');    // 보스 패턴 예고 (바닥)
      this.drawGroundShots(ctx, g, b);
      this.drawEnemies(ctx, g, b);
      this.drawWeaponUnder(ctx, g);
      this.drawPlayer(ctx, g, wdt);
      this.drawWeaponStates(ctx, g);
      this.drawProjectiles(ctx, g, b);
      this.drawEffects(ctx, g);
      this.drawParts(ctx);
      this.drawTexts(ctx, g);
      this.drawHazards(ctx, g, 'top');      // 예고 테두리 · 레이저 · 빨간펜
      this.drawEnemyShots(ctx, g, b);       // 적의 공격은 맨 위에 (무엇에도 가려지지 않게)
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawAmbient(ctx);
      this.drawOverlays(ctx, g);
      if (!this.noHud) {
        this.drawRoster(ctx, g, dt); // 오른쪽 '이번 학기 적' 목록, Tab 으로 켜고 끈다 (화면 밖 화살표가 그 위에 보이도록 먼저)
        this.drawIndicators(ctx, g);
        this.drawHUD(ctx, g, dt);
      }
      this.drawToasts(ctx, dt);
      this.drawBanner(ctx, dt);
    }

    // ───────── 조명 (웨이브별 색감 + 가장자리 어둡게) ─────────
    updateAmbient(target, dt) {
      const a = this.amb || (this.amb = target.slice());
      const k = Math.min(1, dt * 0.7);
      for (let i = 0; i < 5; i++) a[i] += (target[i] - a[i]) * k;
    }

    drawAmbient(ctx) {
      const a = this.amb, W = this.cssW, H = this.cssH;
      if (!a) return;
      if (a[3] > 0.003) {
        ctx.fillStyle = `rgba(${a[0] | 0},${a[1] | 0},${a[2] | 0},${a[3].toFixed(3)})`;
        ctx.fillRect(0, 0, W, H);
      }
      ctx.globalAlpha = Math.min(1, a[4]);
      ctx.drawImage(this.vignette('dark'), 0, 0, W, H);
      ctx.globalAlpha = 1;
    }

    // 화면 가장자리 그라데이션 (작게 그려 두고 화면 크기로 늘려 쓴다)
    vignette(kind) {
      return this.sprite('vig:' + kind, 160, 90, (x, w, h) => {
        x.save();
        x.translate(w / 2, h / 2);
        x.scale(w / 2, h / 2);
        const g = x.createRadialGradient(0, 0, 0.35, 0, 0, 1.42);
        const col = kind === 'red' ? '224,49,49' : kind === 'ice' ? '116,192,252' : '18,28,52';
        g.addColorStop(0, `rgba(${col},0)`);
        g.addColorStop(kind === 'dark' ? 0.55 : 0.45, `rgba(${col},0)`);
        g.addColorStop(1, `rgba(${col},1)`);
        x.fillStyle = g;
        x.fillRect(-1, -1, 2, 2);
        x.restore();
      });
    }
  }

  GS.Renderer = Renderer;
})(window.GS = window.GS || {});
