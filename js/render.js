// 캔버스 그리기: 배경(연구실 바닥) / 적 / 무기 / 이펙트 / HUD / 토스트·배너
(function (GS) {
  'use strict';
  const U = GS.util;
  const TAU = Math.PI * 2;
  const EMOJI = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';
  const FONT = '"Pretendard","Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const BOOKS = ['📕', '📘', '📗'];
  const NOTES = ['논문 읽기', 'TODO', 'D-7', '수렴 확인!', '교수님 면담', 'Rebuttal', 'git push', '졸업'];

  function roundRect(x, X, Y, W, H, r) {
    r = Math.min(r, W / 2, H / 2);
    x.beginPath();
    x.moveTo(X + r, Y);
    x.arcTo(X + W, Y, X + W, Y + H, r);
    x.arcTo(X + W, Y + H, X, Y + H, r);
    x.arcTo(X, Y + H, X, Y, r);
    x.arcTo(X, Y, X + W, Y, r);
    x.closePath();
  }

  function hash(x, y) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  // 이모지가 없는 아이콘은 직접 그린다: 데이터에서 icon: { custom: '이름' } 으로 사용
  GS.customIcons = {
    // 에어팟: 하얀 무선 이어폰 한 쌍 (64x64 기준으로 그린 뒤 size 에 맞춰 축소)
    airpods(x, size) {
      const bud = (mirror) => {
        x.save();
        if (mirror) { x.translate(64, 0); x.scale(-1, 1); }
        x.translate(9, 6);
        x.rotate(-0.12);
        x.fillStyle = '#ffffff';
        x.strokeStyle = '#9aa3ad';
        x.lineWidth = 2.4;
        roundRect(x, 4, 18, 9, 34, 4.5); // 콩나물 줄기
        x.fill();
        x.stroke();
        x.beginPath();
        x.ellipse(9, 13, 10.5, 10, 0, 0, TAU); // 이어버드 머리
        x.fill();
        x.stroke();
        x.fillStyle = '#495057';
        x.beginPath();
        x.ellipse(13.5, 14, 3.2, 4, 0, 0, TAU); // 스피커 구멍
        x.fill();
        x.fillStyle = '#ced4da';
        x.fillRect(5.5, 47, 6, 3.5); // 줄기 끝 마이크
        x.restore();
      };
      x.save();
      x.scale(size / 64, size / 64);
      bud(false);
      bud(true);
      x.restore();
    },
  };

  // DOM(카드·게임 방법)에서 쓸 직접 그린 아이콘 이미지
  const iconUrls = {};
  GS.iconDataURL = function (icon) {
    if (!iconUrls[icon.custom]) {
      const c = document.createElement('canvas');
      c.width = c.height = 96;
      GS.customIcons[icon.custom](c.getContext('2d'), 96);
      iconUrls[icon.custom] = c.toDataURL();
    }
    return iconUrls[icon.custom];
  };

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.cache = new Map();
      this.toasts = [];
      this.banners = [];
      this.t = 0;
      this.idle = { x: 0, y: 0 };
      this.resize();
      window.addEventListener('resize', () => this.resize());
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

    // ───────── 스프라이트 캐시 ─────────
    sprite(key, w, h, draw) {
      let c = this.cache.get(key);
      if (c) return c;
      c = document.createElement('canvas');
      c.width = Math.ceil(w * this.res);
      c.height = Math.ceil(h * this.res);
      const x = c.getContext('2d');
      x.scale(this.res, this.res);
      draw(x, w, h);
      c.dw = w;
      c.dh = h;
      this.cache.set(key, c);
      return c;
    }

    emojiSprite(em, size) {
      return this.sprite('em:' + em + size, size, size, (x, w, h) => {
        x.font = `${Math.round(size * 0.82)}px ${EMOJI}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(em, w / 2, h / 2 + size * 0.06);
      });
    }

    // 아이콘: 이모지 문자열 / { custom } 직접 그린 아이콘 / { text, bg, fg, bg2, key } 배지
    // 4글자 이상 배지(Ctrl+A 등)는 찌그러지지 않게 가로로 긴 모양 → 그릴 때 drawIcon 으로 비율 유지
    iconSprite(icon, size) {
      if (typeof icon === 'string') return this.emojiSprite(icon, size);
      if (icon.custom) return this.sprite('custom:' + icon.custom + size, size, size, (x) => GS.customIcons[icon.custom](x, size));
      const len = icon.text.length, wide = len >= 4;
      const fs = Math.round(size * (wide ? 0.36 : len === 3 ? 0.32 : len === 2 ? 0.42 : 0.56));
      let w = size;
      if (wide) {
        const m = this.measureCtx || (this.measureCtx = document.createElement('canvas').getContext('2d'));
        m.font = `bold ${fs}px ${FONT}`;
        w = Math.max(size, Math.ceil(m.measureText(icon.text).width + size * 0.5));
      }
      const h = wide ? Math.round(size * 0.78) : size;
      return this.sprite('badge:' + icon.text + icon.bg + size, w, h, (x) => {
        let face = h - 2;
        if (icon.key) { // 키보드 키캡: 아래쪽 그림자 + 윗면
          roundRect(x, 1, 3, w - 2, h - 4, size * 0.2);
          x.fillStyle = '#adb5bd';
          x.fill();
          face = h - 5;
        }
        roundRect(x, 1, 1, w - 2, face, size * (icon.key ? 0.2 : 0.24));
        if (icon.bg2) {
          const gr = x.createLinearGradient(0, 0, w, h);
          gr.addColorStop(0, icon.bg);
          gr.addColorStop(1, icon.bg2);
          x.fillStyle = gr;
        } else x.fillStyle = icon.bg;
        x.fill();
        if (icon.key) {
          x.lineWidth = 1.5;
          x.strokeStyle = '#868e96';
          x.stroke();
        }
        x.fillStyle = icon.fg || '#fff';
        x.font = `bold ${fs}px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(icon.text, w / 2, 1 + face / 2 + 1);
      });
    }

    // 아이콘을 (cx, cy) 중심에 그린다. box = 긴 변의 크기 (가로세로 비율 유지)
    drawIcon(ctx, icon, cx, cy, box) {
      const spr = this.iconSprite(icon, 32), k = box / Math.max(spr.dw, spr.dh);
      ctx.drawImage(spr, cx - (spr.dw * k) / 2, cy - (spr.dh * k) / 2, spr.dw * k, spr.dh * k);
    }

    // 적 그림 + 아래쪽 작은 이름표 (보스는 이름을 따로 크게 그린다). spr.cy = 원 중심 높이
    enemySprite(e) {
      const key = 'e:' + e.type + (e.elite ? '*' : '') + (e.stage ? '#' + e.stage : '');
      const cached = this.cache.get(key);
      if (cached) return cached;
      const def = e.def, r = e.r, S = Math.ceil(r * 2 + 8);
      const label = def.boss ? '' : def.name, fs = e.elite ? 11 : 10;
      let W = S, H = S;
      if (label) {
        const m = this.measureCtx || (this.measureCtx = document.createElement('canvas').getContext('2d'));
        m.font = `bold ${fs}px ${FONT}`;
        W = Math.max(S, Math.ceil(m.measureText(label).width) + 8);
        H = S + fs + 3;
      }
      const spr = this.sprite(key, W, H, (x, w) => {
        const cx = w / 2, cy = S / 2;
        x.beginPath();
        x.arc(cx, cy, r, 0, TAU);
        x.fillStyle = def.sprite.bg;
        x.fill();
        x.lineWidth = e.elite ? 3 : 2;
        x.strokeStyle = e.elite ? '#f59f00' : 'rgba(0,0,0,0.35)';
        x.stroke();
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        if (def.sprite.emoji) {
          x.font = `${Math.round(r * 1.2)}px ${EMOJI}`;
          x.fillText(def.sprite.emoji, cx, cy + r * 0.07);
        } else {
          const t = def.grow ? def.grow.labels[e.stage] : def.sprite.text; // 어학 성적: 현재 점수
          x.fillStyle = def.sprite.fg || '#fff';
          x.font = `bold ${Math.round(r * (t.length > 2 ? 0.75 : 0.95))}px ${FONT}`;
          x.fillText(t, cx, cy + 1);
        }
        if (label) {
          x.font = `bold ${fs}px ${FONT}`;
          x.textBaseline = 'top';
          x.lineJoin = 'round';
          x.lineWidth = 3;
          x.strokeStyle = 'rgba(255,255,255,0.92)';
          x.strokeText(label, cx, S - 2);
          x.fillStyle = '#495057';
          x.fillText(label, cx, S - 2);
        }
      });
      spr.cy = S / 2;
      return spr;
    }

    playerSprite() {
      return this.sprite('player', 46, 46, (x) => {
        x.beginPath();
        x.arc(23, 23, 19, 0, TAU);
        x.fillStyle = '#fff';
        x.fill();
        x.lineWidth = 3;
        x.strokeStyle = '#3b5bdb';
        x.stroke();
        x.font = `26px ${EMOJI}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('🧑‍🎓', 23, 24);
      });
    }

    penSprite(red) {
      return this.sprite(red ? 'redpen' : 'pen', red ? 34 : 28, 12, (x, w, h) => {
        const c = h / 2;
        if (red) {
          x.fillStyle = 'rgba(250,82,82,0.25)';
          roundRect(x, 0, 0, w, h, 6);
          x.fill();
        }
        x.fillStyle = red ? '#e03131' : '#1c3d8f';
        roundRect(x, 3, c - 2.5, w - 11, 5, 2);
        x.fill();
        x.fillStyle = red ? '#ffc9c9' : '#adb5bd';
        x.beginPath();
        x.moveTo(w - 8, c - 2.5);
        x.lineTo(w - 1, c);
        x.lineTo(w - 8, c + 2.5);
        x.fill();
        x.fillStyle = red ? '#a51111' : '#364fc7';
        x.fillRect(3, c - 3.5, 4, 7);
      });
    }

    cursorSprite() {
      return this.sprite('cursor', 22, 22, (x) => {
        x.translate(6, 2);
        x.beginPath();
        x.moveTo(0, 0);
        x.lineTo(0, 16);
        x.lineTo(4, 12);
        x.lineTo(7, 19);
        x.lineTo(9.5, 18);
        x.lineTo(6.5, 11);
        x.lineTo(11.5, 11);
        x.closePath();
        x.fillStyle = '#fff';
        x.fill();
        x.lineWidth = 1.6;
        x.strokeStyle = '#111';
        x.stroke();
      });
    }

    keySprite(glyph, mech) {
      return this.sprite('key:' + glyph + (mech ? 'm' : ''), 24, 24, (x) => {
        roundRect(x, 2, 3, 20, 19, 4);
        x.fillStyle = mech ? '#111418' : '#ced4da';
        x.fill();
        roundRect(x, 2, 2, 20, 17, 4);
        x.fillStyle = mech ? '#343a40' : '#f8f9fa';
        x.fill();
        x.lineWidth = 1;
        x.strokeStyle = mech ? '#74c0fc' : '#868e96';
        x.stroke();
        x.fillStyle = mech ? '#74c0fc' : '#343a40';
        x.font = `bold ${glyph.length > 1 ? 8 : 11}px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(glyph, 12, 11);
      });
    }

    glowDot(color, size) {
      return this.sprite('dot:' + color + size, size, size, (x, w) => {
        const gr = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
        gr.addColorStop(0, '#fff');
        gr.addColorStop(0.35, color);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, w, w);
      });
    }

    starSprite(fizzle) {
      return this.sprite(fizzle ? 'qstar' : 'star', 20, 20, (x) => {
        if (fizzle) {
          x.fillStyle = 'rgba(134,142,150,0.85)';
          x.font = `bold 15px ${FONT}`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillText('?', 10, 11);
          return;
        }
        const gr = x.createLinearGradient(0, 0, 20, 20);
        gr.addColorStop(0, '#4285f4');
        gr.addColorStop(1, '#a142f4');
        x.fillStyle = gr;
        x.beginPath();
        x.moveTo(10, 0);
        x.quadraticCurveTo(11, 9, 20, 10);
        x.quadraticCurveTo(11, 11, 10, 20);
        x.quadraticCurveTo(9, 11, 0, 10);
        x.quadraticCurveTo(9, 9, 10, 0);
        x.fill();
      });
    }

    agentSprite() {
      return this.sprite('agent', 28, 28, (x) => {
        x.beginPath();
        x.arc(14, 14, 12, 0, TAU);
        x.fillStyle = '#d97757';
        x.fill();
        x.lineWidth = 2;
        x.strokeStyle = '#fff';
        x.stroke();
        x.fillStyle = '#fff';
        x.font = `bold 10px Consolas, monospace`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('>_', 14, 14);
      });
    }

    orbSprite() {
      return this.sprite('orb', 36, 36, (x) => {
        const gr = x.createRadialGradient(18, 18, 6, 18, 18, 18);
        gr.addColorStop(0, 'rgba(217,119,87,0.6)');
        gr.addColorStop(1, 'rgba(217,119,87,0)');
        x.fillStyle = gr;
        x.fillRect(0, 0, 36, 36);
        x.beginPath();
        x.arc(18, 18, 11, 0, TAU);
        x.fillStyle = '#d97757';
        x.fill();
        x.fillStyle = '#fff';
        x.font = `bold 15px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('✻', 18, 19);
      });
    }

    gemSprite(tier) {
      const col = ['#4dabf7', '#40c057', '#be4bdb'][tier], s = [12, 15, 19][tier];
      return this.sprite('gem' + tier, s, s + 4, (x, w, h) => {
        x.beginPath();
        x.moveTo(w / 2, 1);
        x.lineTo(w - 1, h / 2);
        x.lineTo(w / 2, h - 1);
        x.lineTo(1, h / 2);
        x.closePath();
        x.fillStyle = col;
        x.fill();
        x.lineWidth = 1;
        x.strokeStyle = 'rgba(0,0,0,0.3)';
        x.stroke();
        x.fillStyle = 'rgba(255,255,255,0.7)';
        x.beginPath();
        x.moveTo(w / 2, 3);
        x.lineTo(w * 0.7, h / 2);
        x.lineTo(w / 2, h / 2);
        x.closePath();
        x.fill();
      });
    }

    paperSprite() {
      return this.sprite('paper', 16, 12, (x) => {
        x.fillStyle = '#fff';
        x.fillRect(1, 1, 14, 10);
        x.strokeStyle = '#868e96';
        x.lineWidth = 1;
        x.strokeRect(1, 1, 14, 10);
        x.strokeStyle = '#fa5252';
        x.beginPath();
        x.moveTo(3, 4); x.lineTo(13, 4);
        x.moveTo(3, 7); x.lineTo(10, 7);
        x.stroke();
      });
    }

    questionSprite() {
      return this.sprite('question', 22, 22, (x) => {
        x.beginPath();
        x.arc(11, 11, 9, 0, TAU);
        x.fillStyle = '#e03131';
        x.fill();
        x.fillStyle = '#fff';
        x.font = `bold 13px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('?', 11, 12);
      });
    }

    sanctuarySprite(s) {
      const def = s.def;
      return this.sprite('s:' + s.id, 104, 80, (x, w, h) => {
        roundRect(x, 4, 4, w - 8, h - 8, 14);
        x.fillStyle = '#fff';
        x.fill();
        x.lineWidth = 3;
        x.strokeStyle = def.color;
        x.stroke();
        x.font = `32px ${EMOJI}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(def.emoji, w / 2, 32);
        x.font = `bold 14px ${FONT}`;
        x.fillStyle = '#212529';
        x.fillText(def.name, w / 2, 60);
      });
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
      this.toasts.push({ text: t.text, color: t.color || '#495057', t: 0 });
      if (this.toasts.length > 4) this.toasts.shift();
    }

    showBanner(b) {
      if (this.banners.length > 3) this.banners.shift();
      this.banners.push(Object.assign({ t: 0 }, b));
    }

    // ───────── 메인 그리기 ─────────
    draw(g, dt) {
      this.t += dt;
      const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
      const pl = g.player;
      this.wz = this.zoom * this.dpr;
      this.wox = cw / 2 - pl.x * this.wz;
      this.woy = ch / 2 - pl.y * this.wz;
      this.drawBackground(ctx, pl.x, pl.y);
      this.worldTf(ctx);
      const b = {
        x0: pl.x - this.viewW / 2 - 60, x1: pl.x + this.viewW / 2 + 60,
        y0: pl.y - this.viewH / 2 - 60, y1: pl.y + this.viewH / 2 + 60,
      };
      this.drawSanctuaries(ctx, g);
      this.drawGems(ctx, g, b);
      this.drawItems(ctx, g);
      this.drawAuras(ctx, g);
      this.drawEnemies(ctx, g, b);
      this.drawPlayer(ctx, g);
      this.drawWeaponStates(ctx, g);
      this.drawProjectiles(ctx, g, b);
      this.drawEnemyShots(ctx, g, b);
      this.drawEffects(ctx, g);
      this.drawTexts(ctx, g);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawOverlays(ctx, g);
      this.drawIndicators(ctx, g);
      this.drawHUD(ctx, g);
      this.drawToasts(ctx, dt);
      this.drawBanner(ctx, dt);
    }

    // 타이틀 화면 배경 (천천히 흐르는 연구실 바닥)
    drawIdle(dt) {
      this.t += dt;
      this.idle.x += dt * 30;
      this.idle.y += dt * 12;
      this.wz = this.zoom * this.dpr;
      this.drawBackground(this.ctx, this.idle.x, this.idle.y);
      this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      this.drawToasts(this.ctx, dt);
    }

    // 배경: 하얀 타일 바닥의 시뮬레이션 연구실 (책상·모니터·화이트보드·계산 서버·화분은 장식)
    drawBackground(ctx, camX, camY) {
      const cw = this.canvas.width, ch = this.canvas.height, z = this.wz;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#f2f4f6';
      ctx.fillRect(0, 0, cw, ch);
      const left = camX - cw / 2 / z, top = camY - ch / 2 / z, right = left + cw / z, bottom = top + ch / z;
      // 바닥 타일 (아주 연한 체크무늬 + 줄눈)
      const T = 80, ts = T * z;
      ctx.fillStyle = '#f8f9fa';
      for (let tx = Math.floor(left / T); tx * T <= right; tx++) {
        for (let ty = Math.floor(top / T); ty * T <= bottom; ty++) {
          if ((tx + ty) & 1) continue;
          ctx.fillRect(Math.floor((tx * T - left) * z), Math.floor((ty * T - top) * z), Math.ceil(ts) + 1, Math.ceil(ts) + 1);
        }
      }
      ctx.strokeStyle = '#e6e9ed';
      ctx.lineWidth = Math.max(1, Math.round(this.dpr));
      ctx.beginPath();
      for (let x = Math.floor(left / T) * T; x <= right; x += T) {
        const sx = Math.round((x - left) * z) + 0.5;
        ctx.moveTo(sx, 0);
        ctx.lineTo(sx, ch);
      }
      for (let y = Math.floor(top / T) * T; y <= bottom; y += T) {
        const sy = Math.round((y - top) * z) + 0.5;
        ctx.moveTo(0, sy);
        ctx.lineTo(cw, sy);
      }
      ctx.stroke();
      // 연구실 가구 (위치는 좌표 해시로 고정, 플레이어·적은 그냥 지나간다)
      ctx.setTransform(z, 0, 0, z, cw / 2 - camX * z, ch / 2 - camY * z);
      const cell = 400;
      for (let cx = Math.floor(left / cell) - 1; cx <= Math.floor(right / cell); cx++) {
        for (let cy = Math.floor(top / cell) - 1; cy <= Math.floor(bottom / cell); cy++) {
          const h = hash(cx, cy), kind = h % 100;
          if (kind >= 72) continue;
          const wx = cx * cell + 20 + ((h >>> 7) % 160), wy = cy * cell + 20 + ((h >>> 15) % 180);
          let spr;
          if (kind < 30) spr = this.deskSprite((h >>> 23) % 3);
          else if (kind < 44) spr = this.boardSprite((h >>> 23) % 4);
          else if (kind < 54) spr = this.serverSprite();
          else spr = this.plantSprite();
          ctx.drawImage(spr, wx, wy, spr.dw, spr.dh);
          if (kind >= 44 && kind < 54) { // 서버 LED 깜빡임
            for (let i = 0; i < 6; i += 2) {
              ctx.fillStyle = Math.sin(this.t * 7 + i * 1.7 + cx * 3 + cy) > 0 ? '#51cf66' : '#c3fae8';
              ctx.beginPath();
              ctx.arc(wx + 62, wy + 18.5 + i * 17, 2.4, 0, TAU);
              ctx.fill();
            }
          }
        }
      }
    }

    // 책상 (위에서 본 모습): v 0 = 모니터 1대, 1 = 듀얼 모니터, 2 = 노트북
    deskSprite(v) {
      return this.sprite('desk' + v, 176, 124, (x) => {
        x.fillStyle = 'rgba(0,0,0,0.05)';
        roundRect(x, 7, 10, 166, 72, 8);
        x.fill();
        x.fillStyle = '#ffffff';
        roundRect(x, 2, 4, 166, 72, 8);
        x.fill();
        x.strokeStyle = '#d6dbe1';
        x.lineWidth = 2;
        x.stroke();
        const code = ['#74c0fc', '#63e6be', '#ffd43b', '#b197fc'];
        const monitor = (mx, my, w) => {
          x.fillStyle = '#2f343b';
          roundRect(x, mx, my, w, 30, 3);
          x.fill();
          for (let i = 0; i < 4; i++) {
            x.fillStyle = code[(i + v) % 4];
            x.globalAlpha = 0.85;
            x.fillRect(mx + 5 + (i % 2) * 6, my + 5 + i * 6, w * (0.3 + ((i * 37 + mx) % 40) / 100), 2.5);
          }
          x.globalAlpha = 1;
          x.fillStyle = '#adb5bd';
          x.fillRect(mx + w / 2 - 6, my + 30, 12, 5);
        };
        if (v === 1) { monitor(26, 10, 54); monitor(90, 10, 54); }
        else if (v === 0) monitor(56, 10, 60);
        else { // 노트북 화면에는 수렴 그래프
          x.fillStyle = '#ced4da';
          roundRect(x, 58, 10, 60, 40, 4);
          x.fill();
          x.fillStyle = '#343a40';
          roundRect(x, 62, 13, 52, 26, 2);
          x.fill();
          x.strokeStyle = '#69db7c';
          x.lineWidth = 1.5;
          x.beginPath();
          for (let i = 0; i <= 44; i++) {
            const px = 64 + i * 1.1, py = 17 + 18 * (1 - Math.exp(-i / 9)) + Math.sin(i * 1.4) * 1.5;
            if (i) x.lineTo(px, py); else x.moveTo(px, py);
          }
          x.stroke();
        }
        // 키보드·마우스·머그컵·서류 더미
        x.fillStyle = '#e9ecef';
        x.strokeStyle = '#ced4da';
        x.lineWidth = 1;
        roundRect(x, 62, 52, 50, 12, 2);
        x.fill();
        x.stroke();
        roundRect(x, 120, 53, 8, 11, 4);
        x.fill();
        x.stroke();
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.arc(150, 30, 8, 0, TAU);
        x.fill();
        x.strokeStyle = '#adb5bd';
        x.lineWidth = 2;
        x.stroke();
        x.fillStyle = '#8d6e63';
        x.beginPath();
        x.arc(150, 30, 5, 0, TAU);
        x.fill();
        x.fillStyle = '#f8f9fa';
        x.strokeStyle = '#dee2e6';
        x.lineWidth = 1;
        x.fillRect(10, 40, 30, 26);
        x.strokeRect(10, 40, 30, 26);
        x.strokeRect(13, 37, 30, 26);
        // 의자 (등받이가 아래쪽)
        x.fillStyle = '#ced4da';
        x.beginPath();
        x.arc(87, 96, 13, 0, TAU);
        x.fill();
        x.fillStyle = '#adb5bd';
        roundRect(x, 71, 110, 32, 7, 3);
        x.fill();
      });
    }

    // 화이트보드: 시뮬레이션 연구실다운 수식과 그래프, 포스트잇
    boardSprite(v) {
      const EQ = [
        ['∂u/∂t + (u·∇)u = −∇p + ν∇²u', 'Re = UL / ν'],
        ['min ‖Ax − b‖²', 'Δt < Δx / c  (CFL)'],
        ['mesh ×2 → 계산 시간 ×8', 'error ~ O(h²)'],
        ['loss → NaN ???', 'lr: 1e-4 → 1e-5'],
      ];
      return this.sprite('board' + v, 212, 128, (x) => {
        x.fillStyle = 'rgba(0,0,0,0.05)';
        roundRect(x, 9, 10, 198, 108, 6);
        x.fill();
        x.fillStyle = '#ffffff';
        roundRect(x, 4, 4, 198, 108, 6);
        x.fill();
        x.strokeStyle = '#adb5bd';
        x.lineWidth = 4;
        x.stroke();
        const eq = EQ[v % EQ.length];
        x.textBaseline = 'top';
        x.textAlign = 'left';
        x.font = 'italic 13px "Cambria Math","Times New Roman",serif';
        x.fillStyle = '#1c7ed6';
        x.fillText(eq[0], 14, 14, 180);
        x.fillStyle = '#c92a2a';
        x.fillText(eq[1], 14, 36, 120);
        x.strokeStyle = '#495057';
        x.lineWidth = 1.5;
        x.beginPath();
        x.moveTo(16, 62);
        x.lineTo(16, 98);
        x.lineTo(112, 98);
        x.stroke();
        x.strokeStyle = '#2f9e44';
        x.beginPath();
        for (let i = 0; i <= 45; i++) {
          const px = 18 + i * 2, py = 94 - 30 * (1 - Math.exp(-i / 10)) + Math.sin(i * 1.3) * 2;
          if (i) x.lineTo(px, py); else x.moveTo(px, py);
        }
        x.stroke();
        x.fillStyle = '#ffec99';
        x.fillRect(138, 58, 50, 42);
        x.fillStyle = '#7a5c00';
        x.font = `bold 10px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText(NOTES[v % NOTES.length], 163, 79, 46);
        x.fillStyle = '#ced4da';
        x.fillRect(44, 113, 118, 6);
      });
    }

    // 계산 서버 랙
    serverSprite() {
      return this.sprite('server', 86, 126, (x) => {
        x.fillStyle = 'rgba(0,0,0,0.06)';
        roundRect(x, 9, 9, 72, 112, 6);
        x.fill();
        x.fillStyle = '#e9ecef';
        roundRect(x, 4, 4, 72, 112, 6);
        x.fill();
        x.strokeStyle = '#adb5bd';
        x.lineWidth = 2;
        x.stroke();
        for (let i = 0; i < 6; i++) {
          const y = 12 + i * 17;
          x.fillStyle = '#dee2e6';
          roundRect(x, 10, y, 60, 13, 2);
          x.fill();
          x.fillStyle = '#adb5bd';
          x.fillRect(16, y + 5, 30, 2.5);
        }
      });
    }

    plantSprite() {
      return this.sprite('plant', 58, 58, (x) => {
        x.fillStyle = 'rgba(0,0,0,0.06)';
        x.beginPath();
        x.arc(31, 32, 20, 0, TAU);
        x.fill();
        x.fillStyle = '#ffffff';
        x.beginPath();
        x.arc(29, 29, 18, 0, TAU);
        x.fill();
        x.strokeStyle = '#ced4da';
        x.lineWidth = 2;
        x.stroke();
        x.fillStyle = '#69db7c';
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * TAU;
          x.save();
          x.translate(29 + Math.cos(a) * 9, 29 + Math.sin(a) * 9);
          x.rotate(a);
          x.beginPath();
          x.ellipse(0, 0, 12, 5, 0, 0, TAU);
          x.fill();
          x.restore();
        }
        x.fillStyle = '#40c057';
        x.beginPath();
        x.arc(29, 29, 5, 0, TAU);
        x.fill();
      });
    }

    drawSanctuaries(ctx, g) {
      for (let i = 0; i < g.sanctuaries.length; i++) {
        const s = g.sanctuaries[i], def = s.def;
        const pulse = 1 + Math.sin(this.t * 3 + i) * 0.07;
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = def.color;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 74 * pulse, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = def.color;
        ctx.lineWidth = 3;
        ctx.setLineDash([10, 8]);
        ctx.beginPath();
        ctx.arc(s.x, s.y, 50, this.t, this.t + TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        const spr = this.sanctuarySprite(s);
        ctx.drawImage(spr, s.x - 52, s.y - 46 + Math.sin(this.t * 2 + i) * 3, 104, 80);
        const k = Math.max(0, s.life / s.maxLife);
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(s.x - 38, s.y + 40, 76, 5);
        ctx.fillStyle = def.color;
        ctx.fillRect(s.x - 38, s.y + 40, 76 * k, 5);
      }
    }

    drawGems(ctx, g, b) {
      const gems = g.gems;
      for (let i = 0; i < gems.length; i++) {
        const gm = gems[i];
        if (gm.x < b.x0 || gm.x > b.x1 || gm.y < b.y0 || gm.y > b.y1) continue;
        const spr = this.gemSprite(gm.v >= 20 ? 2 : gm.v >= 5 ? 1 : 0);
        ctx.drawImage(spr, gm.x - spr.dw / 2, gm.y - spr.dh / 2, spr.dw, spr.dh);
      }
    }

    drawItems(ctx, g) {
      for (let i = 0; i < g.items.length; i++) {
        const it = g.items[i], bob = Math.sin(this.t * 4 + i) * 3;
        if (it.id === 'accept') {
          ctx.globalAlpha = 0.35 + Math.sin(this.t * 5) * 0.15;
          ctx.fillStyle = '#ffd43b';
          ctx.beginPath();
          ctx.arc(it.x, it.y + bob, 26, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        this.drawIcon(ctx, it.def.icon, it.x, it.y + bob, typeof it.def.icon === 'string' ? 32 : 54);
      }
    }

    drawAuras(ctx, g) {
      if (g.jamTimer > 0) return;
      const pl = g.player;
      for (let i = 0; i < g.weapons.length; i++) {
        const w = g.weapons[i];
        if (w.def.behavior !== 'aura') continue;
        const R = w.state.radius || 80, ws = w.def.style === 'heat_ws';
        const gr = ctx.createRadialGradient(pl.x, pl.y, R * 0.15, pl.x, pl.y, R);
        gr.addColorStop(0, ws ? 'rgba(255,107,107,0.04)' : 'rgba(255,169,77,0.03)');
        gr.addColorStop(0.75, ws ? 'rgba(240,62,62,0.2)' : 'rgba(255,146,43,0.17)');
        gr.addColorStop(1, ws ? 'rgba(201,42,42,0.34)' : 'rgba(253,126,20,0.28)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, R, 0, TAU);
        ctx.fill();
        if (w.state.tick > 0) {
          ctx.strokeStyle = ws ? 'rgba(224,49,49,0.55)' : 'rgba(253,126,20,0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }
    }

    drawEnemies(ctx, g, b) {
      const list = g.enemies;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.active || e.x < b.x0 - e.r || e.x > b.x1 + e.r || e.y < b.y0 - e.r || e.y > b.y1 + e.r) continue;
        const spr = this.enemySprite(e);
        const shake = (e.ai === 'dash' && e.st === 1) || (e.ai === 'bomber' && e.st === 1) ? (Math.random() - 0.5) * 3 : 0;
        const ex = e.x + shake, ey = e.y + Math.sin(this.t * 8 + e.anim) * 1.2;
        if (e.boss) {
          ctx.fillStyle = 'rgba(0,0,0,0.15)';
          ctx.beginPath();
          ctx.ellipse(e.x, e.y + e.r * 0.95, e.r * 0.9, e.r * 0.3, 0, 0, TAU);
          ctx.fill();
        }
        ctx.drawImage(spr, ex - spr.dw / 2, ey - spr.cy, spr.dw, spr.dh);
        if (e.flash > 0) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(ex, ey, e.r, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        if (e.ai === 'dash' && e.st === 1) {
          ctx.font = `bold 20px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          this.outlined(ctx, '!', e.x, e.y - e.r - 12, '#e03131', '#fff', 4);
        } else if (e.ai === 'bomber' && e.st === 1) {
          const B = e.def.bomb, k = 1 - e.stT / B.fuse;
          ctx.globalAlpha = 0.1 + k * 0.12;
          ctx.fillStyle = '#1c7ed6';
          ctx.beginPath();
          ctx.arc(e.x, e.y, B.radius, 0, TAU);
          ctx.fill();
          ctx.globalAlpha = 1;
          ctx.strokeStyle = '#1c7ed6';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 6, -Math.PI / 2, -Math.PI / 2 + TAU * k);
          ctx.stroke();
          ctx.font = `bold 12px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          this.outlined(ctx, `업데이트 중 ${Math.floor(k * 100)}%`, e.x, e.y - e.r - 14, '#1c7ed6', '#fff', 3);
        }
        if (e.elite) {
          ctx.font = `14px ${EMOJI}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('⭐', e.x, e.y - e.r - 8);
        }
        if (e.boss) {
          ctx.font = `bold 15px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          this.outlined(ctx, e.def.name, e.x, e.y + e.r + 16, '#fff', '#212529', 4);
        }
      }
      if (g.freezeTimer > 0) {
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#a5d8ff';
        for (let i = 0; i < list.length; i++) {
          const e = list[i];
          if (!e.active || e.x < b.x0 || e.x > b.x1 || e.y < b.y0 || e.y > b.y1) continue;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r + 2, 0, TAU);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    }

    drawPlayer(ctx, g) {
      const pl = g.player;
      ctx.fillStyle = 'rgba(0,0,0,0.14)';
      ctx.beginPath();
      ctx.ellipse(pl.x, pl.y + 18, 16, 6, 0, 0, TAU);
      ctx.fill();
      if (pl.invuln > 0) {
        ctx.strokeStyle = 'rgba(250,176,5,0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pl.x, pl.y, 27 + Math.sin(this.t * 10) * 2, 0, TAU);
        ctx.stroke();
      }
      if (pl.hurt > 0 && Math.floor(this.t * 30) % 2 === 0) ctx.globalAlpha = 0.45;
      const bob = pl.moving ? Math.sin(this.t * 14) * 1.5 : 0;
      ctx.drawImage(this.playerSprite(), pl.x - 23, pl.y - 23 + bob, 46, 46);
      ctx.globalAlpha = 1;
      const fx = pl.fx, fy = pl.fy, ax = pl.x + fx * 31, ay = pl.y + fy * 31;
      ctx.fillStyle = 'rgba(59,91,219,0.75)';
      ctx.beginPath();
      ctx.moveTo(ax + fx * 7, ay + fy * 7);
      ctx.lineTo(ax - fy * 5, ay + fx * 5);
      ctx.lineTo(ax + fy * 5, ay - fx * 5);
      ctx.closePath();
      ctx.fill();
      const k = Math.max(0, pl.hp / pl.maxHp), bw = 46;
      ctx.fillStyle = 'rgba(33,37,41,0.75)';
      ctx.fillRect(pl.x - bw / 2 - 1, pl.y + 25, bw + 2, 7);
      ctx.fillStyle = k > 0.5 ? '#40c057' : k > 0.25 ? '#fab005' : '#fa5252';
      ctx.fillRect(pl.x - bw / 2, pl.y + 26, bw * k, 5);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (g.jamTimer > 0) {
        ctx.font = `bold 13px ${FONT}`;
        this.outlined(ctx, '💻 재부팅 중…', pl.x, pl.y - 36, '#1c7ed6', '#fff', 3);
      } else if (pl.slowTimer > 0) {
        ctx.font = `16px ${EMOJI}`;
        ctx.fillText('🤧', pl.x + 22, pl.y - 22);
      }
    }

    drawWeaponStates(ctx, g) {
      const pl = g.player, jam = g.jamTimer > 0;
      for (let wi = 0; wi < g.weapons.length; wi++) {
        const w = g.weapons[wi], st = w.state, bh = w.def.behavior;
        if (bh === 'orbit' && st.pos && st.pos.length && !jam) {
          const thesis = w.def.style === 'thesis', sz = (st.size || 16) * 2.2;
          for (let i = 0; i < st.pos.length; i += 2) {
            const x = st.pos[i], y = st.pos[i + 1];
            if (thesis) {
              ctx.globalAlpha = 0.3;
              ctx.fillStyle = '#ffd43b';
              ctx.beginPath();
              ctx.arc(x, y, sz * 0.55, 0, TAU);
              ctx.fill();
              ctx.globalAlpha = 1;
            }
            const spr = this.emojiSprite(thesis ? '📜' : BOOKS[(i / 2) % 3], 40);
            this.drawRot(ctx, spr, x, y, Math.sin(this.t * 4 + i) * 0.35, sz, sz);
          }
          this.worldTf(ctx);
        } else if (bh === 'companion' && st.x !== undefined) {
          ctx.globalAlpha = jam ? 0.35 : 1;
          const s = 36 * (1 + (st.flash > 0 ? 0.15 : 0));
          ctx.drawImage(this.orbSprite(), st.x - s / 2, st.y - s / 2, s, s);
          ctx.globalAlpha = 1;
        } else if (bh === 'agents' && st.list) {
          ctx.globalAlpha = jam ? 0.35 : 1;
          const spr = this.agentSprite(), s = (st.size || 11) * 2.4;
          for (let i = 0; i < st.list.length; i++) ctx.drawImage(spr, st.list[i].x - s / 2, st.list[i].y - s / 2, s, s);
          ctx.globalAlpha = 1;
        } else if (bh === 'beam_spin' && st.len && !jam) {
          const n = w.p.amount;
          ctx.lineCap = 'round';
          for (let i = 0; i < n; i++) {
            const a = st.ang + (i / n) * TAU, ex = pl.x + Math.cos(a) * st.len, ey = pl.y + Math.sin(a) * st.len;
            ctx.strokeStyle = 'rgba(17,24,39,0.22)';
            ctx.lineWidth = st.wid;
            ctx.beginPath();
            ctx.moveTo(pl.x, pl.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            ctx.strokeStyle = 'rgba(126,224,195,0.95)';
            ctx.lineWidth = st.wid * 0.3;
            ctx.stroke();
          }
          ctx.lineCap = 'butt';
        }
      }
    }

    drawProjectiles(ctx, g, b) {
      const ps = g.projectiles;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p.kind !== 'bullet' || p.x < b.x0 || p.x > b.x1 || p.y < b.y0 || p.y > b.y1) continue;
        switch (p.style) {
          case 'pen': this.drawRot(ctx, this.penSprite(false), p.x, p.y, p.a, 28, 12); break;
          case 'red_pen': this.drawRot(ctx, this.penSprite(true), p.x, p.y, p.a, 34, 12); break;
          case 'cursor': this.drawRot(ctx, this.cursorSprite(), p.x, p.y, p.a + 1.9, p.r * 2.4, p.r * 2.4); break;
          case 'key':
          case 'key_mech': this.drawRot(ctx, this.keySprite(p.glyph || 'A', p.style === 'key_mech'), p.x, p.y, p.rot, 24, 24); break;
          case 'gemini': this.drawRot(ctx, this.starSprite(p.fizzle), p.x, p.y, p.fizzle ? 0 : this.t * 5, 20, 20); break;
          default: this.drawRot(ctx, this.glowDot('#ff8c42', 20), p.x, p.y, 0, 20, 20);
        }
      }
      this.worldTf(ctx);
      const pl = g.player;
      for (let i = 0; i < ps.length; i++) {
        const p = ps[i];
        if (p.kind === 'shock') {
          const k = p.t / p.dur;
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 8 * (1 - k) + 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.R, 0, TAU);
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (p.kind === 'beam') {
          const k = 1 - p.t / p.dur, ex = pl.x + Math.cos(p.a) * p.len, ey = pl.y + Math.sin(p.a) * p.len;
          ctx.lineCap = 'round';
          ctx.strokeStyle = `rgba(16,163,127,${0.4 * k})`;
          ctx.lineWidth = p.width * 1.8;
          ctx.beginPath();
          ctx.moveTo(pl.x, pl.y);
          ctx.lineTo(ex, ey);
          ctx.stroke();
          ctx.strokeStyle = `rgba(230,255,246,${0.95 * k})`;
          ctx.lineWidth = p.width * 0.5;
          ctx.stroke();
          ctx.lineCap = 'butt';
        } else if (p.kind === 'box') {
          const x = p.x - p.bw / 2, y = p.y - p.bh / 2;
          if (!p.fired) {
            const k = p.t / p.delay;
            ctx.fillStyle = 'rgba(34,139,230,0.13)';
            ctx.fillRect(x, y, p.bw * k, p.bh * k);
            ctx.setLineDash([8, 6]);
            ctx.strokeStyle = '#1c7ed6';
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y, p.bw * k, p.bh * k);
            ctx.setLineDash([]);
            ctx.drawImage(this.cursorSprite(), x + p.bw * k - 6, y + p.bh * k - 4, 22, 22);
          } else {
            const k = 1 - (p.t - p.delay) / (p.dur - p.delay);
            ctx.fillStyle = `rgba(250,82,82,${0.3 * k})`;
            ctx.fillRect(x, y, p.bw, p.bh);
          }
        }
      }
    }

    drawEnemyShots(ctx, g, b) {
      const shots = g.enemyShots;
      if (!shots.length) return;
      const paper = this.paperSprite(), q = this.questionSprite();
      for (let i = 0; i < shots.length; i++) {
        const s = shots[i];
        if (s.x < b.x0 || s.x > b.x1 || s.y < b.y0 || s.y > b.y1) continue;
        if (s.style === 'plot') { // 데이터 점: 사라지기 1초 전부터 흐려진다
          ctx.setTransform(this.wz, 0, 0, this.wz, this.wox, this.woy);
          ctx.globalAlpha = Math.min(1, s.life);
          ctx.fillStyle = '#4dabf7';
          ctx.strokeStyle = '#1864ab';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(s.x, s.y, 6, 0, TAU);
          ctx.fill();
          ctx.stroke();
          ctx.globalAlpha = 1;
        } else if (s.style === 'question') this.drawRot(ctx, q, s.x, s.y, 0, 22, 22);
        else if (s.style === 'germ') this.drawRot(ctx, this.emojiSprite('🦠', 24), s.x, s.y, this.t * 2, 22, 22);
        else if (s.style === 'warn') this.drawRot(ctx, this.emojiSprite('⚠️', 24), s.x, s.y, 0, 20, 20);
        else this.drawRot(ctx, paper, s.x, s.y, s.a + this.t * 3, 16, 12);
      }
      this.worldTf(ctx);
    }

    drawEffects(ctx, g) {
      const ef = g.effects;
      for (let i = 0; i < ef.length; i++) {
        const e = ef[i], k = e.t / e.dur;
        if (e.kind === 'puff') {
          ctx.globalAlpha = 0.45 * (1 - k);
          ctx.fillStyle = e.color;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (1 + k * 0.9), 0, TAU);
          ctx.fill();
        } else if (e.kind === 'ring') {
          ctx.globalAlpha = 1 - k;
          ctx.strokeStyle = e.color;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.arc(e.x, e.y, e.r * (0.4 + k * 0.8), 0, TAU);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
    }

    drawTexts(ctx, g) {
      const tx = g.texts;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < tx.length; i++) {
        const t = tx[i], k = t.t / t.dur;
        ctx.globalAlpha = k > 0.7 ? (1 - k) / 0.3 : 1;
        ctx.font = `bold ${t.size}px ${FONT}`;
        this.outlined(ctx, t.text, t.x, t.y, t.color, 'rgba(33,37,41,0.85)', 3);
      }
      ctx.globalAlpha = 1;
    }

    drawOverlays(ctx, g) {
      const W = this.cssW, H = this.cssH, pl = g.player;
      if (g.freezeTimer > 0) {
        ctx.fillStyle = 'rgba(165,216,255,0.16)';
        ctx.fillRect(0, 0, W, H);
      }
      const low = pl.hp / pl.maxHp;
      if (low < 0.35 || pl.hurt > 0) {
        const k = Math.min(0.5, pl.hurt > 0 ? 0.3 + (0.35 - Math.min(0.35, low)) : (0.35 - low) * 1.3);
        const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.32, W / 2, H / 2, Math.max(W, H) * 0.72);
        gr.addColorStop(0, 'rgba(224,49,49,0)');
        gr.addColorStop(1, `rgba(224,49,49,${k})`);
        ctx.fillStyle = gr;
        ctx.fillRect(0, 0, W, H);
      }
      for (let i = 0; i < g.effects.length; i++) {
        const e = g.effects[i];
        if (e.kind !== 'flash') continue;
        ctx.fillStyle = `rgba(255,255,255,${0.75 * (1 - e.t / e.dur)})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    // 화면 밖 성소·보스·Accept 메일 방향 표시
    drawIndicators(ctx, g) {
      const pl = g.player, W = this.cssW, H = this.cssH, z = this.zoom, m = 40;
      const mark = (x, y, icon, color) => {
        const sx = (x - pl.x) * z + W / 2, sy = (y - pl.y) * z + H / 2;
        if (sx > 0 && sx < W && sy > 0 && sy < H) return;
        const dx = sx - W / 2, dy = sy - H / 2;
        const t = Math.min((W / 2 - m) / Math.abs(dx || 1e-6), (H / 2 - m) / Math.abs(dy || 1e-6));
        const ix = W / 2 + dx * t, iy = H / 2 + dy * t, a = Math.atan2(dy, dx);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ix + Math.cos(a) * 30, iy + Math.sin(a) * 30);
        ctx.lineTo(ix + Math.cos(a + 0.5) * 20, iy + Math.sin(a + 0.5) * 20);
        ctx.lineTo(ix + Math.cos(a - 0.5) * 20, iy + Math.sin(a - 0.5) * 20);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ix, iy, 19, 0, TAU);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = color;
        ctx.stroke();
        this.drawIcon(ctx, icon, ix, iy, 26);
      };
      for (let i = 0; i < g.sanctuaries.length; i++) { const s = g.sanctuaries[i]; mark(s.x, s.y, s.def.emoji, s.def.color); }
      for (let i = 0; i < g.items.length; i++) { const it = g.items[i]; if (it.id === 'accept') mark(it.x, it.y, '📩', '#f59f00'); }
      for (let i = 0; i < g.bigEnemies.length; i++) { const e = g.bigEnemies[i]; if (e.boss && e.active) mark(e.x, e.y, e.def.sprite.emoji || '👿', '#c92a2a'); }
    }

    // ───────── HUD ─────────
    drawHUD(ctx, g) {
      const s = this.ui, W = this.cssW / s;
      ctx.save();
      ctx.scale(s, s);
      const pl = g.player;
      ctx.fillStyle = 'rgba(33,37,41,0.88)';
      ctx.fillRect(0, 0, W, 16);
      ctx.fillStyle = '#4dabf7';
      ctx.fillRect(0, 0, W * Math.min(1, pl.xp / pl.xpNext), 16);
      ctx.font = `bold 12px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#fff';
      ctx.fillText(`Lv ${pl.level}  ·  지식 ${Math.floor(pl.xp)}/${pl.xpNext}`, W - 10, 8.5);
      // 타이머 · 챕터
      ctx.textAlign = 'center';
      ctx.font = `900 32px ${FONT}`;
      this.outlined(ctx, U.fmtTime(g.phd ? g.phdTime : g.time), W / 2, 46, '#212529', '#fff', 6);
      const lab = g.chapterLabel();
      const sub = g.phd ? `🎓 박사 ${g.phdYear}년차 · 끝이 없다` : `${lab.name} · ${lab.title}  —  남은 시간 ${U.fmtTime(g.chapters[g.chapterIndex].duration - g.chapterTime)}`;
      ctx.font = `bold 14px ${FONT}`;
      this.outlined(ctx, sub, W / 2, 73, '#495057', '#fff', 4);
      // 보스 체력
      let boss = null;
      for (let i = 0; i < g.bigEnemies.length; i++) {
        const e = g.bigEnemies[i];
        if (e.boss && e.active && (!boss || e.maxHp > boss.maxHp)) boss = e;
      }
      if (boss) {
        const bw = Math.max(220, Math.min(520, W - 560)), bx = W / 2 - bw / 2, by = 88;
        ctx.fillStyle = 'rgba(33,37,41,0.88)';
        roundRect(ctx, bx, by, bw, 22, 6);
        ctx.fill();
        ctx.fillStyle = '#fa5252';
        roundRect(ctx, bx + 3, by + 3, Math.max(6, (bw - 6) * Math.max(0, boss.hp / boss.maxHp)), 16, 4);
        ctx.fill();
        ctx.font = `bold 12px ${FONT}`;
        ctx.fillStyle = '#fff';
        ctx.fillText(`${boss.def.rank || 'BOSS'} · ${boss.def.name}  ${U.fmtNum(Math.max(0, boss.hp))}`, W / 2, by + 12);
      }
      this.drawScorePanel(ctx, g, W);
      this.drawSlots(ctx, g);
      ctx.restore();
    }

    drawScorePanel(ctx, g, W) {
      const pw = 250, ph = g.phd ? 56 : 76, px = W - pw - 12, py = 24;
      ctx.fillStyle = 'rgba(255,255,255,0.93)';
      roundRect(ctx, px, py, pw, ph, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = 'left';
      ctx.font = `bold 12px ${FONT}`;
      ctx.fillStyle = '#868e96';
      ctx.fillText('📊 연구 실적', px + 12, py + 21);
      ctx.textAlign = 'right';
      ctx.font = `900 20px ${FONT}`;
      ctx.fillStyle = '#212529';
      ctx.fillText(U.fmtNum(g.score), px + pw - 12, py + 24);
      ctx.font = `12px ${FONT}`;
      if (!g.phd) {
        const req = g.cfg.jobScore, k = Math.min(1, g.score / req);
        ctx.fillStyle = '#e9ecef';
        roundRect(ctx, px + 12, py + 34, pw - 24, 10, 5);
        ctx.fill();
        ctx.fillStyle = k >= 1 ? '#40c057' : '#fab005';
        roundRect(ctx, px + 12, py + 34, Math.max(10, (pw - 24) * k), 10, 5);
        ctx.fill();
        ctx.fillStyle = '#495057';
        ctx.textAlign = 'left';
        ctx.fillText(k >= 1 ? '✅ 취업 커트라인 달성!' : `취업 커트라인 ${U.fmtNum(req)}`, px + 12, py + 64);
        ctx.textAlign = 'right';
        ctx.fillText(`${Math.floor(k * 100)}%`, px + pw - 12, py + 64);
      } else {
        ctx.fillStyle = '#c92a2a';
        ctx.textAlign = 'left';
        ctx.fillText('박사 과정 — 버틴 시간이 기록이 된다', px + 12, py + 44);
      }
      ctx.font = `bold 13px ${FONT}`;
      ctx.textAlign = 'right';
      this.outlined(ctx, `처치 ${U.fmtNum(g.kills)}`, px + pw - 4, py + ph + 18, '#495057', '#fff', 3);
    }

    drawSlots(ctx, g) {
      const jam = g.jamTimer > 0;
      let x = 12;
      const y1 = 24, y2 = 70;
      for (let i = 0; i < g.weapons.length; i++) {
        const w = g.weapons[i], evo = w.def.tier === 'evolved';
        this.slot(ctx, w.def.icon, x, y1, 40, evo ? '★' : w.level >= w.maxLevel ? 'MAX' : String(w.level), evo, jam);
        x += 44;
      }
      x = 12;
      for (let i = 0; i < g.passives.length; i++) {
        const p = g.passives[i];
        this.slot(ctx, p.def.icon, x, y2, 32, p.level >= p.def.max ? 'MAX' : String(p.level), false, false);
        x += 36;
      }
      if (jam) {
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        this.outlined(ctx, `💻 윈도우 업데이트로 무기 정지 ${g.jamTimer.toFixed(1)}초`, 12, y2 + 46, '#1c7ed6', '#fff', 3);
      }
    }

    slot(ctx, icon, x, y, s, label, gold, dim) {
      ctx.fillStyle = gold ? '#fff3bf' : 'rgba(255,255,255,0.93)';
      roundRect(ctx, x, y, s, s, 8);
      ctx.fill();
      ctx.lineWidth = gold ? 2 : 1;
      ctx.strokeStyle = gold ? '#f59f00' : 'rgba(0,0,0,0.15)';
      ctx.stroke();
      if (dim) ctx.globalAlpha = 0.3;
      this.drawIcon(ctx, icon, x + s / 2, y + s / 2 - 2, s * 0.72);
      ctx.globalAlpha = 1;
      ctx.font = `bold ${Math.round(s * 0.27)}px ${FONT}`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'alphabetic';
      this.outlined(ctx, label, x + s - 2, y + s - 2, gold ? '#e67700' : '#212529', '#fff', 3);
    }

    // 알림은 화면 아래쪽에서 위로 쌓인다
    drawToasts(ctx, dt) {
      const s = this.ui, W = this.cssW / s, H = this.cssH / s;
      ctx.save();
      ctx.scale(s, s);
      let y = H - 34 - (this.toasts.length - 1) * 38;
      for (let i = 0; i < this.toasts.length; i++) {
        const t = this.toasts[i];
        t.t += dt;
        ctx.globalAlpha = t.t < 0.2 ? t.t / 0.2 : t.t > 3.4 ? Math.max(0, (3.8 - t.t) / 0.4) : 1;
        ctx.font = `bold 15px ${FONT}`;
        const tw = Math.min(W - 40, ctx.measureText(t.text).width + 32);
        ctx.fillStyle = 'rgba(255,255,255,0.96)';
        roundRect(ctx, W / 2 - tw / 2, y - 16, tw, 32, 16);
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = t.color;
        ctx.stroke();
        ctx.fillStyle = '#212529';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(t.text, W / 2, y + 1, W - 60);
        y += 38;
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      this.toasts = this.toasts.filter((t) => t.t < 3.8);
    }

    drawBanner(ctx, dt) {
      const b = this.banners[0];
      if (!b) return;
      b.t += dt;
      const dur = 2.8;
      if (b.t > dur) { this.banners.shift(); return; }
      const a = b.t < 0.25 ? b.t / 0.25 : b.t > dur - 0.4 ? (dur - b.t) / 0.4 : 1;
      const s = this.ui, W = this.cssW / s, H = this.cssH / s;
      ctx.save();
      ctx.scale(s, s);
      ctx.globalAlpha = a;
      const y = H * 0.3, bh = b.sub ? 100 : 72;
      const color = { chapter: '#3b5bdb', boss: '#c92a2a', evolve: '#e67700', phd: '#212529' }[b.kind] || '#3b5bdb';
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(0, y - 48, W, bh);
      ctx.fillStyle = color;
      ctx.fillRect(0, y - 48, W, 4);
      ctx.fillRect(0, y - 52 + bh, W, 4);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 38px ${FONT}`;
      ctx.fillStyle = color;
      ctx.fillText(b.title, W / 2, y - 10);
      if (b.sub) {
        ctx.font = `bold 18px ${FONT}`;
        ctx.fillStyle = '#495057';
        ctx.fillText(b.sub, W / 2, y + 28);
      }
      ctx.restore();
    }
  }

  GS.Renderer = Renderer;
})(window.GS = window.GS || {});
