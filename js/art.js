// 스프라이트 그림: 적 · 무기 · 투사체 · 지식 · 아이템 · 성소 (주인공은 student.js)
// 처음 한 번만 오프스크린 캔버스에 그려 두고(캐시) 매 프레임에는 붙여 넣기만 한다
(function (GS) {
  'use strict';
  const R = GS.R, TAU = R.TAU, P = GS.Renderer.prototype;
  const rr = R.roundRect, shade = R.shade, rgba = R.rgba;
  const EMOJI = R.EMOJI, FONT = R.FONT;

  function circle(x, cx, cy, r) { x.beginPath(); x.arc(cx, cy, r, 0, TAU); }
  function ell(x, cx, cy, rx, ry, rot) { x.beginPath(); x.ellipse(cx, cy, rx, ry, rot || 0, 0, TAU); }
  // 부드러운 그림자 (스프라이트 해상도만큼 흐림을 키운다. 빛은 왼쪽 위에서)
  function soft(x, blur, off, col) {
    const k = x.k || 1;
    x.shadowColor = col || 'rgba(20,30,55,0.22)';
    x.shadowBlur = blur * k;
    x.shadowOffsetX = (off || 0) * 0.6 * k;
    x.shadowOffsetY = (off || 0) * k;
  }
  function hard(x) {
    x.shadowColor = 'rgba(0,0,0,0)';
    x.shadowBlur = 0;
    x.shadowOffsetX = 0;
    x.shadowOffsetY = 0;
  }
  function vgrad(x, y0, y1, a, b) {
    const g = x.createLinearGradient(0, y0, 0, y1);
    g.addColorStop(0, a);
    g.addColorStop(1, b);
    return g;
  }
  GS.R.circle = circle;
  GS.R.ell = ell;
  GS.R.soft = soft;
  GS.R.hard = hard;
  GS.R.vgrad = vgrad;

  // ───────── 이모지가 없는 아이콘 (데이터에서 icon: { custom: '이름' }) ─────────
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
        rr(x, 4, 18, 9, 34, 4.5); // 콩나물 줄기
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

    // 마이크로 피펫 (비스듬히)
    pipette(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.translate(32, 31);
      x.rotate(0.62);
      x.lineJoin = 'round';
      x.strokeStyle = '#495057';
      x.lineWidth = 2;
      rr(x, -5, -30, 10, 7, 3); // 누름 버튼
      x.fillStyle = '#e03131';
      x.fill();
      x.stroke();
      rr(x, -8, -24, 16, 27, 6); // 손잡이
      x.fillStyle = '#f8f9fa';
      x.fill();
      x.stroke();
      x.fillStyle = '#4dabf7';
      x.fillRect(-7, -15, 14, 5);
      x.fillStyle = '#ced4da';
      rr(x, 6, -14, 6, 10, 3); // 손가락 걸이
      x.fill();
      x.stroke();
      rr(x, -3, 2, 6, 15, 2); // 대롱
      x.fillStyle = '#dee2e6';
      x.fill();
      x.stroke();
      x.fillStyle = 'rgba(255,212,59,0.95)'; // 팁
      x.beginPath();
      x.moveTo(-3.5, 17);
      x.lineTo(3.5, 17);
      x.lineTo(0.6, 30);
      x.lineTo(-0.6, 30);
      x.closePath();
      x.fill();
      x.stroke();
      x.fillStyle = '#339af0'; // 방울
      x.beginPath();
      x.arc(0, 36, 3.2, 0, TAU);
      x.fill();
      x.restore();
    },

    // 8채널 피펫: 손잡이 아래로 팁이 여덟 개
    multipipette(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.translate(32, 30);
      x.rotate(0.25);
      x.lineJoin = 'round';
      x.strokeStyle = '#495057';
      x.lineWidth = 2;
      rr(x, -5, -29, 10, 7, 3);
      x.fillStyle = '#7048e8';
      x.fill();
      x.stroke();
      rr(x, -8, -23, 16, 22, 6);
      x.fillStyle = '#f8f9fa';
      x.fill();
      x.stroke();
      x.fillStyle = '#be4bdb';
      x.fillRect(-7, -15, 14, 4);
      rr(x, -24, -2, 48, 9, 3); // 매니폴드
      x.fillStyle = '#dee2e6';
      x.fill();
      x.stroke();
      for (let i = 0; i < 8; i++) {
        const tx = -21 + i * 6;
        x.fillStyle = 'rgba(255,212,59,0.95)';
        x.beginPath();
        x.moveTo(tx - 2, 7);
        x.lineTo(tx + 2, 7);
        x.lineTo(tx + 0.5, 20);
        x.lineTo(tx - 0.5, 20);
        x.closePath();
        x.fill();
        x.lineWidth = 1;
        x.stroke();
        x.fillStyle = ['#339af0', '#7950f2', '#e64980', '#20c997'][i % 4];
        x.beginPath();
        x.arc(tx, 24 + (i % 2) * 3, 2.2, 0, TAU);
        x.fill();
      }
      x.restore();
    },

    // 분젠 버너: 받침 + 금속관 + 파란 불꽃
    bunsen(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.lineJoin = 'round';
      x.strokeStyle = '#343a40';
      x.lineWidth = 2;
      x.fillStyle = '#495057'; // 받침
      x.beginPath();
      x.moveTo(14, 60);
      x.lineTo(50, 60);
      x.lineTo(44, 52);
      x.lineTo(20, 52);
      x.closePath();
      x.fill();
      x.stroke();
      const g = x.createLinearGradient(25, 0, 39, 0);
      g.addColorStop(0, '#adb5bd');
      g.addColorStop(0.5, '#f1f3f5');
      g.addColorStop(1, '#868e96');
      x.fillStyle = g;
      rr(x, 26, 26, 12, 27, 2);
      x.fill();
      x.stroke();
      x.fillStyle = '#343a40';
      rr(x, 28, 44, 8, 4, 1.5); // 공기 구멍
      x.fill();
      x.fillStyle = 'rgba(77,171,247,0.85)'; // 불꽃 (바깥 파랑, 안쪽 하늘)
      x.beginPath();
      x.moveTo(25, 26);
      x.quadraticCurveTo(22, 12, 32, 2);
      x.quadraticCurveTo(42, 12, 39, 26);
      x.closePath();
      x.fill();
      x.fillStyle = 'rgba(208,235,255,0.95)';
      x.beginPath();
      x.moveTo(28.5, 26);
      x.quadraticCurveTo(28, 17, 32, 11);
      x.quadraticCurveTo(36, 17, 35.5, 26);
      x.closePath();
      x.fill();
      x.restore();
    },

    // 과망간산칼륨(KMnO₄): 둥근 플라스크 속 짙은 보라색 산화제 + 라벨
    kmno4(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.lineJoin = 'round';
      x.strokeStyle = '#495057';
      x.lineWidth = 2.2;
      x.beginPath(); // 플라스크 모양
      x.moveTo(27, 6);
      x.lineTo(37, 6);
      x.lineTo(37, 24);
      x.arc(32, 41, 19, -Math.PI / 2 + 0.28, Math.PI * 1.5 - 0.28);
      x.closePath();
      x.fillStyle = 'rgba(233,236,239,0.9)';
      x.fill();
      x.save();
      x.clip();
      const g = x.createLinearGradient(0, 30, 0, 62); // 용액 (자줏빛 → 짙은 보라)
      g.addColorStop(0, '#cc5de8');
      g.addColorStop(1, '#5f3dc4');
      x.fillStyle = g;
      x.fillRect(0, 30, 64, 34);
      x.fillStyle = 'rgba(255,255,255,0.7)'; // 기포
      x.beginPath();
      x.arc(22, 53, 2.5, 0, TAU);
      x.arc(42, 50, 1.9, 0, TAU);
      x.arc(33, 57, 1.5, 0, TAU);
      x.fill();
      x.restore();
      x.stroke();
      x.fillStyle = '#868e96'; // 입구
      rr(x, 25, 3, 14, 5, 2);
      x.fill();
      rr(x, 15, 35, 34, 12, 2.5); // 라벨
      x.fillStyle = '#ffffff';
      x.fill();
      x.strokeStyle = '#7048e8';
      x.lineWidth = 1.3;
      x.stroke();
      x.fillStyle = '#5f3dc4';
      x.font = `900 9px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('KMnO₄', 32, 41.5);
      x.restore();
    },

    // 파리채 / 전기 모기채: 손잡이 + 그물 머리 (오른쪽 위를 향해 비스듬히)
    swatter(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.translate(32, 32);
      x.rotate(-Math.PI / 4);
      paintSwatter(x, false, -28, 0, 56);
      x.restore();
    },
    eswatter(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.translate(32, 32);
      x.rotate(-Math.PI / 4);
      paintSwatter(x, true, -28, 0, 56);
      x.restore();
    },

    // 유전자 변형쥐: 초록 형광으로 빛나는 쥐 (스프라이트와 같은 그림)
    gmomouse(x, size) {
      x.save();
      x.scale(size / 64, size / 64);
      x.translate(32, 33);
      x.scale(1.5, 1.5);
      x.translate(-20, -15);
      paintMouse(x, true, 0);
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

  // ───────── 공용 작은 스프라이트 ─────────
  P.emojiSprite = function (em, size) {
    return this.sprite('em:' + em + size, size, size, (x, w, h) => {
      x.font = `${Math.round(size * 0.82)}px ${EMOJI}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(em, w / 2, h / 2 + size * 0.06);
    });
  };

  // 아이콘: 이모지 문자열 / { custom } 직접 그린 아이콘 / { text, bg, fg, bg2, key } 배지
  // 4글자 이상 배지(Ctrl+A 등)는 찌그러지지 않게 가로로 긴 모양 → 그릴 때 drawIcon 으로 비율 유지
  P.iconSprite = function (icon, size) {
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
        rr(x, 1, 3, w - 2, h - 4, size * 0.2);
        x.fillStyle = '#adb5bd';
        x.fill();
        face = h - 5;
      }
      rr(x, 1, 1, w - 2, face, size * (icon.key ? 0.2 : 0.24));
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
      } else { // 배지 윗부분 광택
        x.save();
        x.clip();
        x.fillStyle = 'rgba(255,255,255,0.18)';
        x.fillRect(0, 0, w, face * 0.45);
        x.restore();
      }
      x.fillStyle = icon.fg || '#fff';
      x.font = `bold ${fs}px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(icon.text, w / 2, 1 + face / 2 + 1);
    });
  };

  // 아이콘을 (cx, cy) 중심에 그린다. box = 긴 변의 크기 (가로세로 비율 유지)
  P.drawIcon = function (ctx, icon, cx, cy, box) {
    const spr = this.iconSprite(icon, 32), k = box / Math.max(spr.dw, spr.dh);
    ctx.drawImage(spr, cx - (spr.dw * k) / 2, cy - (spr.dh * k) / 2, spr.dw * k, spr.dh * k);
  };

  // 바닥에 드리우는 둥근 그림자
  P.shadowSprite = function () {
    return this.sprite('shadow', 64, 32, (x) => {
      x.scale(1, 0.5);
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g.addColorStop(0, 'rgba(25,35,60,0.38)');
      g.addColorStop(0.55, 'rgba(25,35,60,0.18)');
      g.addColorStop(1, 'rgba(25,35,60,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 64, 64);
    });
  };

  // 색 번짐 (광원·오라)
  P.glow = function (color, size) {
    return this.sprite('glow:' + color + size, size, size, (x, w) => {
      const g = x.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, rgba(color, 0.8));
      g.addColorStop(0.35, rgba(color, 0.36));
      g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g;
      x.fillRect(0, 0, w, w);
    });
  };

  // 네 갈래 반짝임
  P.sparkSprite = function (color) {
    return this.sprite('spark:' + color, 24, 24, (x) => {
      x.translate(12, 12);
      x.fillStyle = color;
      x.beginPath();
      for (let i = 0; i < 4; i++) {
        const a = (i * Math.PI) / 2;
        x.lineTo(Math.cos(a) * 12, Math.sin(a) * 12);
        x.lineTo(Math.cos(a + Math.PI / 4) * 2.8, Math.sin(a + Math.PI / 4) * 2.8);
      }
      x.closePath();
      x.fill();
      x.fillStyle = '#fff';
      circle(x, 0, 0, 2.3);
      x.fill();
    });
  };

  // 투사체 꼬리 (왼쪽 투명 → 오른쪽 색)
  P.streak = function (color) {
    return this.sprite('streak:' + color, 64, 12, (x) => {
      const g = x.createLinearGradient(0, 0, 64, 0);
      g.addColorStop(0, rgba(color, 0));
      g.addColorStop(1, rgba(color, 0.6));
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, 6);
      x.lineTo(58, 1);
      x.arc(58, 6, 5, -Math.PI / 2, Math.PI / 2);
      x.closePath();
      x.fill();
    });
  };

  // 후광 (회전시키며 쓴다)
  P.raysSprite = function (color) {
    return this.sprite('rays:' + color, 128, 128, (x) => {
      x.translate(64, 64);
      const g = x.createRadialGradient(0, 0, 6, 0, 0, 64);
      g.addColorStop(0, rgba(color, 0.6));
      g.addColorStop(1, rgba(color, 0));
      x.fillStyle = g;
      for (let i = 0; i < 12; i++) {
        x.beginPath();
        x.moveTo(0, 0);
        x.arc(0, 0, 64, (i * TAU) / 12, (i * TAU) / 12 + TAU / 32);
        x.closePath();
        x.fill();
      }
    });
  };

  // ───────── 적: 반질반질한 동그란 몸 + 종종걸음 발 ─────────
  function paintEnemy(x, cx, cy, r, def, elite, stage, frame) {
    const base = def.sprite.bg, boss = !!def.boss;
    // 발 (frame 에 따라 번갈아 든다)
    const lift = [[0.17, 0], [0, 0], [0, 0.17], [0, 0]][frame];
    x.fillStyle = shade(base, -0.58);
    for (let s = -1; s <= 1; s += 2) {
      const l = s < 0 ? lift[0] : lift[1];
      ell(x, cx + s * r * 0.42, cy + r * 1.0 - l * r, r * 0.3, r * 0.22);
      x.fill();
    }
    // 테두리
    const lw = Math.max(1.6, r * (boss ? 0.11 : 0.1)) * (elite ? 1.5 : 1);
    circle(x, cx, cy, r);
    if (elite) {
      const g = x.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
      g.addColorStop(0, '#fff3bf');
      g.addColorStop(0.45, '#fcc419');
      g.addColorStop(1, '#d9480f');
      x.fillStyle = g;
    } else x.fillStyle = shade(base, -0.42);
    x.fill();
    // 몸 (왼쪽 위가 밝은 입체 그라데이션)
    const ri = r - lw;
    const g = x.createRadialGradient(cx - r * 0.38, cy - r * 0.45, r * 0.06, cx, cy, ri * 1.08);
    g.addColorStop(0, shade(base, 0.55));
    g.addColorStop(0.5, base);
    g.addColorStop(1, shade(base, -0.24));
    circle(x, cx, cy, ri);
    x.fillStyle = g;
    x.fill();
    // 아래쪽 반사광
    x.save();
    circle(x, cx, cy, ri);
    x.clip();
    x.strokeStyle = 'rgba(255,255,255,0.32)';
    x.lineWidth = Math.max(1, r * 0.07);
    x.beginPath();
    x.arc(cx, cy, ri - r * 0.06, 0.25, Math.PI - 0.25);
    x.stroke();
    x.restore();
    // 광택
    x.save();
    x.translate(cx - r * 0.34, cy - r * 0.47);
    x.rotate(-0.55);
    x.scale(1, 0.55);
    const hg = x.createRadialGradient(0, 0, 0, 0, 0, r * 0.44);
    hg.addColorStop(0, 'rgba(255,255,255,0.85)');
    hg.addColorStop(1, 'rgba(255,255,255,0)');
    circle(x, 0, 0, r * 0.44);
    x.fillStyle = hg;
    x.fill();
    x.restore();
    // 얼굴: 이모지 또는 글자 배지
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    if (def.sprite.emoji) {
      soft(x, r * 0.1, r * 0.05, 'rgba(0,0,0,0.3)');
      x.fillStyle = '#000'; // 컬러 이모지도 채우기 색의 투명도를 따라가므로 불투명하게
      x.font = `${Math.round(r * 1.14)}px ${EMOJI}`;
      x.fillText(def.sprite.emoji, cx, cy + r * 0.08);
      hard(x);
    } else {
      const t = def.grow ? def.grow.labels[stage] : def.sprite.text;
      x.font = R.dfont(Math.round(r * (t.length > 2 ? 0.78 : 0.98)));
      x.lineJoin = 'round';
      x.lineWidth = Math.max(2, r * 0.16);
      x.strokeStyle = shade(base, -0.5);
      x.strokeText(t, cx, cy + r * 0.06);
      x.fillStyle = def.sprite.fg || '#fff';
      x.fillText(t, cx, cy + r * 0.06);
    }
  }

  // 스프라이트의 (cx, cy) = 몸 중심. frame 0~3 = 걸음
  P.enemySprite = function (e, frame) {
    const key = 'eb:' + e.type + (e.elite ? '*' : '') + (e.stage || 0) + ':' + frame;
    const c = this.cache.get(key);
    if (c) return c;
    const r = e.r, pad = Math.ceil(r * 0.08) + 3;
    const W = Math.ceil(r * 2 + pad * 2), H = Math.ceil(r * 2.3 + pad * 2);
    const spr = this.sprite(key, W, H, (x) => paintEnemy(x, W / 2, pad + r, r, e.def, e.elite, e.stage || 0, frame));
    spr.cx = W / 2;
    spr.cy = pad + r;
    return spr;
  };

  // 적 아래 작은 이름표
  P.enemyLabel = function (e) {
    const key = 'el:' + e.type + (e.elite ? '*' : '');
    const c = this.cache.get(key);
    if (c) return c;
    const name = e.def.name, fs = e.elite ? 11 : 10;
    const m = this.measureCtx || (this.measureCtx = document.createElement('canvas').getContext('2d'));
    m.font = `800 ${fs}px ${FONT}`;
    const W = Math.ceil(m.measureText(name).width) + 10, H = fs + 7;
    return this.sprite(key, W, H, (x) => {
      x.font = `800 ${fs}px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      x.lineWidth = 3.4;
      x.strokeStyle = 'rgba(255,255,255,0.96)';
      x.strokeText(name, W / 2, H / 2);
      x.fillStyle = e.elite ? '#c25e00' : '#495057';
      x.fillText(name, W / 2, H / 2);
    });
  };

  // 보스 뒤에서 천천히 도는 톱니 테두리
  P.bossSpikes = function (e) {
    const r = e.r, S = Math.ceil(r * 2.9);
    return this.sprite('bspk:' + e.type, S, S, (x, w) => {
      const c = w / 2, n = 18, ro = r * 1.38, ri = r * 1.06, base = e.def.sprite.bg;
      x.beginPath();
      for (let i = 0; i < n * 2; i++) {
        const a = (i / (n * 2)) * TAU, d = i % 2 ? ri : ro;
        x.lineTo(c + Math.cos(a) * d, c + Math.sin(a) * d);
      }
      x.closePath();
      const g = x.createRadialGradient(c, c, ri * 0.9, c, c, ro);
      g.addColorStop(0, shade(base, -0.25));
      g.addColorStop(1, shade(base, -0.6));
      x.fillStyle = g;
      x.fill();
      x.lineJoin = 'round';
      x.lineWidth = 2;
      x.strokeStyle = 'rgba(255,255,255,0.35)';
      x.stroke();
    });
  };

  // 보스 이름표: [BOSS] 이름 (중간보스는 주황, BOSS · FINAL BOSS 는 빨강)
  P.rankColor = function (rank) { return rank === '중간보스' ? '#f76707' : rank === 'FINAL BOSS' ? '#c92a2a' : '#e03131'; };
  P.bossPlate = function (e) {
    const def = e.def, rank = e.rank || def.rank || 'BOSS';
    const key = 'bplate:' + e.type + ':' + rank;
    const c = this.cache.get(key);
    if (c) return c;
    const m = this.measureCtx || (this.measureCtx = document.createElement('canvas').getContext('2d'));
    m.font = `900 10px ${FONT}`;
    const tw = Math.ceil(m.measureText(rank).width) + 12;
    m.font = `800 14px ${FONT}`;
    const nw = Math.ceil(m.measureText(def.name).width);
    const W = tw + nw + 22, H = 26;
    return this.sprite(key, W, H, (x) => {
      soft(x, 4, 2, 'rgba(0,0,0,0.3)');
      rr(x, 1, 1, W - 2, H - 4, 11);
      x.fillStyle = 'rgba(25,28,40,0.9)';
      x.fill();
      hard(x);
      rr(x, 5, 5, tw, H - 12, 7);
      x.fillStyle = this.rankColor(rank);
      x.fill();
      x.textBaseline = 'middle';
      x.textAlign = 'center';
      x.font = `900 10px ${FONT}`;
      x.fillStyle = '#fff';
      x.fillText(rank, 5 + tw / 2, H / 2 - 1);
      x.textAlign = 'left';
      x.font = `800 14px ${FONT}`;
      x.fillText(def.name, tw + 12, H / 2 - 1);
    });
  };

  // ───────── 무기 · 투사체 ─────────
  P.penSprite = function (red) {
    return this.sprite(red ? 'redpen' : 'pen', 32, 12, (x) => {
      const c = 6;
      soft(x, 1.5, 1.2, 'rgba(0,0,0,0.25)');
      if (red) { // 빨간 수성 사인펜
        x.fillStyle = vgrad(x, c - 3.5, c + 3.5, '#ff6b6b', '#c92a2a');
        rr(x, 3, c - 3.5, 20, 7, 3);
        x.fill();
        hard(x);
        x.fillStyle = '#ffffff';
        x.fillRect(9, c - 2.4, 9, 4.8);
        x.fillStyle = '#e03131';
        x.font = `900 4px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('F', 13.5, c + 0.2);
        x.fillStyle = '#a51111';
        rr(x, 1, c - 4, 5, 8, 2);
        x.fill();
        x.fillStyle = '#f1f3f5';
        x.beginPath();
        x.moveTo(23, c - 3);
        x.lineTo(28, c - 1.4);
        x.lineTo(28, c + 1.4);
        x.lineTo(23, c + 3);
        x.fill();
        x.fillStyle = '#e03131';
        rr(x, 27.5, c - 1.4, 3.5, 2.8, 1.2);
        x.fill();
        return;
      }
      // 파란 볼펜: 몸통 · 클립 · 고무 그립 · 금속 촉
      x.fillStyle = vgrad(x, c - 2.6, c + 2.6, '#5c7cfa', '#1c3d8f');
      rr(x, 2, c - 2.6, 20, 5.2, 2.4);
      x.fill();
      hard(x);
      x.fillStyle = '#c5d0ff';
      x.fillRect(4, c - 1.9, 14, 1);
      x.fillStyle = '#adb5bd';
      rr(x, 3, c - 4, 9, 1.8, 0.8);
      x.fill();
      x.fillStyle = '#343a40';
      rr(x, 18, c - 2.8, 6, 5.6, 1.4);
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i < 3; i++) x.fillRect(19 + i * 1.8, c - 2.6, 0.7, 5.2);
      x.fillStyle = '#ced4da';
      x.beginPath();
      x.moveTo(24, c - 2.4);
      x.lineTo(29.5, c - 0.5);
      x.lineTo(29.5, c + 0.5);
      x.lineTo(24, c + 2.4);
      x.fill();
      x.fillStyle = '#212529';
      circle(x, 30, c, 0.9);
      x.fill();
    });
  };

  P.cursorSprite = function () {
    return this.sprite('cursor', 24, 24, (x) => {
      x.translate(6, 2);
      soft(x, 2, 1.5, 'rgba(0,0,0,0.35)');
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, 17);
      x.lineTo(4.2, 13);
      x.lineTo(7.2, 19.8);
      x.lineTo(10, 18.6);
      x.lineTo(7, 12);
      x.lineTo(12.4, 12);
      x.closePath();
      x.fillStyle = '#fff';
      x.fill();
      hard(x);
      x.lineJoin = 'round';
      x.lineWidth = 1.6;
      x.strokeStyle = '#111';
      x.stroke();
    });
  };

  // 키캡 (입체). mech = 기계식 키보드의 검은 키캡 + 하늘색 백라이트
  P.keySprite = function (glyph, mech) {
    return this.sprite('key:' + glyph + (mech ? 'm' : ''), 26, 26, (x) => {
      soft(x, 2, 1.5, 'rgba(0,0,0,0.3)');
      rr(x, 2, 4, 22, 20, 5);
      x.fillStyle = mech ? '#0b0d10' : '#adb5bd';
      x.fill();
      hard(x);
      if (mech) {
        x.strokeStyle = 'rgba(116,192,252,0.9)';
        x.lineWidth = 1.6;
        x.stroke();
      }
      rr(x, 4, 3, 18, 16, 4);
      x.fillStyle = mech ? vgrad(x, 3, 19, '#495057', '#212529') : vgrad(x, 3, 19, '#ffffff', '#e9ecef');
      x.fill();
      x.lineWidth = 1;
      x.strokeStyle = mech ? '#0b0d10' : '#868e96';
      x.stroke();
      x.fillStyle = mech ? '#74c0fc' : '#343a40';
      x.font = `900 ${glyph.length > 1 ? 8 : 11}px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(glyph, 13, 11.5);
    });
  };

  // 제미나이 별 / 환각(?)
  P.starSprite = function (fizzle) {
    return this.sprite(fizzle ? 'qstar' : 'star', 24, 24, (x) => {
      if (fizzle) {
        x.fillStyle = 'rgba(173,181,189,0.35)';
        circle(x, 12, 12, 9);
        x.fill();
        x.fillStyle = 'rgba(134,142,150,0.9)';
        x.font = `900 15px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('?', 12, 13);
        return;
      }
      const gr = x.createLinearGradient(2, 2, 22, 22);
      gr.addColorStop(0, '#4285f4');
      gr.addColorStop(0.55, '#9b72cb');
      gr.addColorStop(1, '#d96570');
      soft(x, 3, 0, 'rgba(66,133,244,0.6)');
      x.fillStyle = gr;
      x.beginPath();
      x.moveTo(12, 1);
      x.quadraticCurveTo(13.2, 10.8, 23, 12);
      x.quadraticCurveTo(13.2, 13.2, 12, 23);
      x.quadraticCurveTo(10.8, 13.2, 1, 12);
      x.quadraticCurveTo(10.8, 10.8, 12, 1);
      x.fill();
      hard(x);
      x.fillStyle = 'rgba(255,255,255,0.85)';
      circle(x, 12, 12, 1.8);
      x.fill();
    });
  };

  // 클로드 (따라다니는 주황 구슬)
  P.orbSprite = function () {
    return this.sprite('orb', 44, 44, (x) => {
      const g0 = x.createRadialGradient(22, 22, 8, 22, 22, 22);
      g0.addColorStop(0, 'rgba(217,119,87,0.55)');
      g0.addColorStop(1, 'rgba(217,119,87,0)');
      x.fillStyle = g0;
      x.fillRect(0, 0, 44, 44);
      const g = x.createRadialGradient(18, 17, 2, 22, 22, 13);
      g.addColorStop(0, '#f6b79b');
      g.addColorStop(0.6, '#d97757');
      g.addColorStop(1, '#a8492c');
      circle(x, 22, 22, 13);
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = '#8a3b22';
      x.lineWidth = 1.4;
      x.stroke();
      // 햇살 모양 마크
      x.strokeStyle = '#fff';
      x.lineCap = 'round';
      x.lineWidth = 2.2;
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU + 0.2, l = i % 2 ? 5.5 : 7.5;
        x.moveTo(22 + Math.cos(a) * 1.5, 22 + Math.sin(a) * 1.5);
        x.lineTo(22 + Math.cos(a) * l, 22 + Math.sin(a) * l);
      }
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.6)';
      ell(x, 17, 15.5, 4, 2.4, -0.6);
      x.fill();
    });
  };

  // 클로드 유도탄
  P.boltSprite = function () {
    return this.sprite('bolt', 20, 20, (x) => {
      const g = x.createRadialGradient(10, 10, 0, 10, 10, 10);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.3, '#ffc9a8');
      g.addColorStop(0.6, 'rgba(217,119,87,0.85)');
      g.addColorStop(1, 'rgba(217,119,87,0)');
      x.fillStyle = g;
      x.fillRect(0, 0, 20, 20);
    });
  };

  // 클로드 코드 서브에이전트 (작은 터미널 창)
  P.agentSprite = function () {
    return this.sprite('agent', 34, 28, (x) => {
      soft(x, 4, 2, 'rgba(217,119,87,0.6)');
      rr(x, 2, 2, 30, 24, 5);
      x.fillStyle = '#1f2329';
      x.fill();
      hard(x);
      x.strokeStyle = '#d97757';
      x.lineWidth = 1.6;
      x.stroke();
      x.fillStyle = '#343a40';
      rr(x, 3, 3, 28, 6, 3);
      x.fill();
      const dots = ['#ff6b6b', '#fcc419', '#51cf66'];
      for (let i = 0; i < 3; i++) {
        x.fillStyle = dots[i];
        circle(x, 7 + i * 4, 6, 1.3);
        x.fill();
      }
      x.fillStyle = '#d97757';
      x.font = `bold 11px Consolas, monospace`;
      x.textAlign = 'left';
      x.textBaseline = 'middle';
      x.fillText('>_', 7, 17.5);
    });
  };

  // 전공서적 (위에서 본 두꺼운 양장본)
  P.bookSprite = function (i) {
    const cols = [['#e03131', '#a51111'], ['#1c7ed6', '#174a8b'], ['#2f9e44', '#1b6e2c']][i % 3];
    return this.sprite('book' + (i % 3), 36, 40, (x) => {
      soft(x, 3, 2.5, 'rgba(0,0,0,0.28)');
      rr(x, 6, 4, 26, 32, 3); // 책장(종이) 두께
      x.fillStyle = '#f1f3f5';
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.lineWidth = 0.8;
      for (let k = 0; k < 4; k++) {
        x.beginPath();
        x.moveTo(30 + k * 0.4, 7);
        x.lineTo(30 + k * 0.4, 34);
        x.stroke();
      }
      rr(x, 4, 3, 25, 31, 3);
      x.fillStyle = vgrad(x, 3, 34, cols[0], cols[1]);
      x.fill();
      x.fillStyle = cols[1];
      x.fillRect(4, 3, 4, 31); // 책등
      x.fillStyle = 'rgba(255,255,255,0.92)';
      rr(x, 11, 9, 14, 8, 1.5);
      x.fill();
      x.fillStyle = cols[1];
      x.fillRect(13, 11.5, 10, 1.2);
      x.fillRect(13, 14, 7, 1.2);
      x.fillStyle = '#fcc419';
      x.fillRect(11, 26, 14, 1.4);
    });
  };

  // 학위논문 (검은 양장 + 금박)
  P.thesisSprite = function () {
    return this.sprite('thesis', 40, 46, (x) => {
      soft(x, 5, 2.5, 'rgba(240,140,0,0.55)');
      rr(x, 4, 3, 30, 38, 3);
      x.fillStyle = vgrad(x, 3, 41, '#343a40', '#0b0d10');
      x.fill();
      hard(x);
      x.strokeStyle = '#fcc419';
      x.lineWidth = 1.2;
      rr(x, 7, 6, 24, 32, 2);
      x.stroke();
      x.fillStyle = '#fcc419';
      x.font = `900 6px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('석사', 19, 14);
      x.fillText('학위논문', 19, 21);
      x.fillRect(12, 27, 14, 1);
      x.fillRect(14, 30, 10, 1);
      x.fillStyle = 'rgba(255,255,255,0.18)';
      x.fillRect(5, 4, 4, 36);
    });
  };

  // ───────── Wet lab 무기 ─────────
  // 피펫 방울 (오른쪽으로 날아가는 물방울: 둥근 쪽이 앞)
  P.dropSprite = function (evolved) {
    const c = evolved ? ['#e5dbff', '#9775fa', '#5f3dc4'] : ['#d0ebff', '#4dabf7', '#1864ab'];
    return this.sprite(evolved ? 'drop2' : 'drop', 20, 14, (x) => {
      soft(x, 3, 0, R.rgba(c[1], 0.6));
      x.beginPath();
      x.moveTo(2, 7);
      x.quadraticCurveTo(8, 2.2, 13, 2.2);
      x.arc(13, 7, 4.8, -Math.PI / 2, Math.PI / 2);
      x.quadraticCurveTo(8, 11.8, 2, 7);
      x.closePath();
      const g = x.createLinearGradient(0, 2, 0, 12);
      g.addColorStop(0, c[0]);
      g.addColorStop(1, c[1]);
      x.fillStyle = g;
      x.fill();
      hard(x);
      x.lineWidth = 1.2;
      x.strokeStyle = c[2];
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.9)';
      ell(x, 14, 5.2, 1.6, 1.1);
      x.fill();
    });
  };

  // 던지는 시약병 (시험관) / 과망간산칼륨 (둥근 플라스크)
  P.thrownSprite = function (style) {
    const pir = style === 'kmno4';
    return this.sprite('thrown:' + style, 24, 30, (x) => {
      x.lineJoin = 'round';
      soft(x, 3, 2, 'rgba(0,0,0,0.25)');
      x.beginPath();
      if (pir) {
        x.moveTo(10, 3);
        x.lineTo(14, 3);
        x.lineTo(14, 11);
        x.arc(12, 19, 8.5, -Math.PI / 2 + 0.24, Math.PI * 1.5 - 0.24);
      } else {
        x.moveTo(8, 3);
        x.lineTo(16, 3);
        x.lineTo(16, 23);
        x.arc(12, 23, 4, 0, Math.PI);
      }
      x.closePath();
      x.fillStyle = 'rgba(241,243,245,0.95)';
      x.fill();
      hard(x);
      x.save();
      x.clip();
      x.fillStyle = pir ? '#7048e8' : '#94d82d';
      x.fillRect(0, pir ? 15 : 13, 24, 20);
      x.fillStyle = 'rgba(255,255,255,0.45)';
      x.fillRect(0, pir ? 15 : 13, 24, 2);
      x.restore();
      x.strokeStyle = '#495057';
      x.lineWidth = 1.4;
      x.stroke();
      x.fillStyle = pir ? '#868e96' : '#a0522d'; // 마개
      R.roundRect(x, pir ? 9 : 7, 1, pir ? 6 : 10, 4, 1.5);
      x.fill();
      x.strokeStyle = 'rgba(255,255,255,0.8)';
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(pir ? 8 : 10, pir ? 17 : 7);
      x.lineTo(pir ? 8 : 10, pir ? 22 : 18);
      x.stroke();
    });
  };

  // 바닥 웅덩이 (불규칙한 물웅덩이, 가운데가 밝다)
  P.puddleSprite = function (style) {
    const pir = style === 'kmno4';
    const c = pir ? ['#d0bfff', '#9775fa', '#5f3dc4'] : ['#d8f5a2', '#a9e34b', '#5c940d'];
    return this.sprite('puddle:' + style, 120, 84, (x, w, h) => {
      x.beginPath();
      const n = 14;
      for (let i = 0; i <= n; i++) { // 울퉁불퉁한 가장자리
        const a = (i / n) * TAU, rr0 = 1 + Math.sin(i * 2.3) * 0.08 + Math.cos(i * 1.7) * 0.06;
        const px = w / 2 + Math.cos(a) * (w / 2 - 4) * rr0, py = h / 2 + Math.sin(a) * (h / 2 - 4) * rr0;
        if (i) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.closePath();
      const g = x.createRadialGradient(w * 0.45, h * 0.42, 4, w / 2, h / 2, w / 2);
      g.addColorStop(0, R.rgba(c[0], 0.85));
      g.addColorStop(0.6, R.rgba(c[1], 0.6));
      g.addColorStop(1, R.rgba(c[2], 0.55));
      x.fillStyle = g;
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = R.rgba(c[2], 0.7);
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.55)'; // 반사광
      ell(x, w * 0.36, h * 0.32, w * 0.14, h * 0.07, -0.3);
      x.fill();
    });
  };

  // 파리채 그림: (x0, y0) 손잡이 끝에서 +x 방향으로 길이 L. evo = 전기 모기채 (노란 손잡이 + 파란 전기 그물)
  function paintSwatter(x, evo, x0, y0, L) {
    const hl = L * 0.5, hw = L * 0.42, hh = L * 0.36, hx = x0 + hl; // 손잡이 길이, 머리 폭·높이, 머리 시작
    x.lineCap = 'round';
    x.strokeStyle = evo ? '#f59f00' : '#868e96'; // 손잡이
    x.lineWidth = L * 0.07;
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(hx + 2, y0);
    x.stroke();
    x.strokeStyle = evo ? '#fab005' : '#495057';
    x.lineWidth = L * 0.1;
    x.beginPath();
    x.moveTo(x0, y0);
    x.lineTo(x0 + hl * 0.35, y0);
    x.stroke();
    rr(x, hx, y0 - hh / 2, hw, hh, hh * 0.32); // 머리
    x.fillStyle = evo ? 'rgba(116,192,252,0.55)' : 'rgba(140,233,154,0.85)';
    x.fill();
    x.save();
    x.clip();
    x.strokeStyle = evo ? 'rgba(231,245,255,0.95)' : 'rgba(43,138,62,0.5)'; // 그물
    x.lineWidth = Math.max(0.6, L * 0.012);
    for (let i = 1; i < 6; i++) {
      x.beginPath();
      x.moveTo(hx + (hw * i) / 6, y0 - hh);
      x.lineTo(hx + (hw * i) / 6, y0 + hh);
      x.moveTo(hx, y0 - hh / 2 + (hh * i) / 6);
      x.lineTo(hx + hw, y0 - hh / 2 + (hh * i) / 6);
      x.stroke();
    }
    x.restore();
    rr(x, hx, y0 - hh / 2, hw, hh, hh * 0.32);
    x.strokeStyle = evo ? '#1c7ed6' : '#2b8a3e';
    x.lineWidth = L * 0.035;
    x.stroke();
    if (evo) { // 번개
      x.fillStyle = '#ffe066';
      x.strokeStyle = '#e67700';
      x.lineWidth = L * 0.015;
      const cx = hx + hw * 0.5, cy = y0, s = hh * 0.42;
      x.beginPath();
      x.moveTo(cx + s * 0.2, cy - s);
      x.lineTo(cx - s * 0.45, cy + s * 0.1);
      x.lineTo(cx, cy + s * 0.1);
      x.lineTo(cx - s * 0.2, cy + s);
      x.lineTo(cx + s * 0.45, cy - s * 0.1);
      x.lineTo(cx, cy - s * 0.1);
      x.closePath();
      x.fill();
      x.stroke();
    }
  }

  // 휘두를 때 쓰는 파리채 스프라이트 (+x 방향, 손잡이 끝이 왼쪽)
  P.swatterSprite = function (evo) {
    return this.sprite('swatter' + (evo ? 'E' : ''), 70, 30, (x) => paintSwatter(x, evo, 3, 15, 64));
  };

  // 실험쥐 그림 (옆모습, 오른쪽을 본다, 40×28 기준). frame 0/1 달리기
  // gmo = 유전자 변형쥐: 초록 형광으로 빛나고, 등에 DNA 이중 나선, 눈이 노랗게 빛난다
  function paintMouse(x, gmo, frame) {
    const body = gmo ? '#b2f2bb' : '#f8f9fa', line = gmo ? '#2b8a3e' : '#868e96';
    x.lineJoin = 'round';
    x.lineCap = 'round';
    x.strokeStyle = gmo ? '#40c057' : '#f783ac'; // 꼬리
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(9, 17);
    x.quadraticCurveTo(2, 14 + frame * 3, 3, 8);
    x.stroke();
    x.fillStyle = gmo ? '#2f9e44' : '#868e96'; // 발
    const fa = frame ? [13, 24] : [16, 21];
    for (const fx of fa) { ell(x, fx, 23, 2.4, 1.6); x.fill(); }
    if (gmo) soft(x, 6, 0, 'rgba(105,219,124,0.95)'); // 형광
    else soft(x, 2, 1.5, 'rgba(0,0,0,0.2)');
    ell(x, 17, 16, gmo ? 11 : 10, gmo ? 7.6 : 7); // 몸
    x.fillStyle = body;
    x.fill();
    hard(x);
    x.strokeStyle = line;
    x.lineWidth = 1.4;
    x.stroke();
    if (gmo) { // 등의 DNA 이중 나선
      x.lineWidth = 1.3;
      for (const [col, ph] of [['#ae3ec9', 0], ['#1c7ed6', Math.PI]]) {
        x.strokeStyle = col;
        x.beginPath();
        for (let i = 0; i <= 12; i++) {
          const px = 10 + i * 1.2, py = 13 + Math.sin(i * 0.75 + ph) * 2.2;
          if (i) x.lineTo(px, py); else x.moveTo(px, py);
        }
        x.stroke();
      }
      x.strokeStyle = 'rgba(73,80,87,0.55)';
      x.lineWidth = 0.7;
      x.beginPath();
      for (let i = 1; i < 12; i += 2) {
        const px = 10 + i * 1.2;
        x.moveTo(px, 13 + Math.sin(i * 0.75) * 2.2);
        x.lineTo(px, 13 + Math.sin(i * 0.75 + Math.PI) * 2.2);
      }
      x.stroke();
    }
    ell(x, 27, 13, gmo ? 6.6 : 6, gmo ? 5.4 : 5, -0.3); // 머리
    x.fillStyle = body;
    x.fill();
    x.strokeStyle = line;
    x.lineWidth = 1.4;
    x.stroke();
    circle(x, 24, 8, 3.4); // 귀
    x.fillStyle = gmo ? '#d3f9d8' : '#ffdeeb';
    x.fill();
    x.stroke();
    if (gmo) { // 노랗게 빛나는 눈
      soft(x, 3, 0, 'rgba(255,236,63,0.95)');
      x.fillStyle = '#fab005';
      circle(x, 29.5, 11.5, 1.7);
      x.fill();
      hard(x);
    } else {
      x.fillStyle = '#212529';
      circle(x, 29, 11.5, 1.2);
      x.fill();
    }
    x.fillStyle = gmo ? '#2b8a3e' : '#f06595'; // 코
    circle(x, 33, 14, 1.3);
    x.fill();
    x.strokeStyle = gmo ? 'rgba(43,138,62,0.7)' : 'rgba(73,80,87,0.6)'; // 수염
    x.lineWidth = 0.7;
    x.beginPath();
    x.moveTo(31, 15);
    x.lineTo(36, 14);
    x.moveTo(31, 16);
    x.lineTo(36, 17);
    x.stroke();
  }

  P.labMouseSprite = function (frame) {
    return this.sprite('labmouse:' + frame, 40, 28, (x) => paintMouse(x, false, frame));
  };
  // 유전자 변형쥐: 형광이 번지도록 조금 넉넉한 칸에 그린다
  P.gmoMouseSprite = function (frame) {
    return this.sprite('gmomouse:' + frame, 46, 34, (x) => {
      x.translate(3, 3);
      paintMouse(x, true, frame);
    });
  };

  // ───────── 적의 투사체 ─────────
  P.paperSprite = function () {
    return this.sprite('paper', 18, 14, (x) => {
      soft(x, 1.5, 1, 'rgba(0,0,0,0.3)');
      x.fillStyle = '#fff';
      x.beginPath();
      x.moveTo(1, 1);
      x.lineTo(13, 1);
      x.lineTo(17, 5);
      x.lineTo(17, 13);
      x.lineTo(1, 13);
      x.closePath();
      x.fill();
      hard(x);
      x.strokeStyle = '#868e96';
      x.lineWidth = 0.8;
      x.stroke();
      x.fillStyle = '#dee2e6';
      x.beginPath();
      x.moveTo(13, 1);
      x.lineTo(13, 5);
      x.lineTo(17, 5);
      x.fill();
      x.strokeStyle = '#4dabf7';
      x.beginPath();
      x.moveTo(3, 5);
      x.lineTo(11, 5);
      x.moveTo(3, 7.5);
      x.lineTo(14, 7.5);
      x.moveTo(3, 10);
      x.lineTo(10, 10);
      x.stroke();
      x.fillStyle = '#e03131';
      x.font = `900 6px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('F', 14, 10.5);
    });
  };

  // 질문 말풍선
  P.questionSprite = function () {
    return this.sprite('question', 26, 26, (x) => {
      soft(x, 4, 0, 'rgba(224,49,49,0.6)');
      x.fillStyle = '#e03131';
      x.beginPath();
      x.arc(13, 12, 9.5, 0, TAU);
      x.fill();
      x.beginPath();
      x.moveTo(8, 18);
      x.lineTo(5, 24);
      x.lineTo(13, 20);
      x.fill();
      hard(x);
      x.lineWidth = 1.5;
      x.strokeStyle = '#a51111';
      x.beginPath();
      x.arc(13, 12, 9.5, 0, TAU);
      x.stroke();
      x.fillStyle = '#fff';
      x.font = `900 14px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('?', 13, 13);
    });
  };

  // 감기 세균
  P.germSprite = function () {
    return this.sprite('germ', 26, 26, (x) => {
      x.translate(13, 13);
      soft(x, 4, 0, 'rgba(64,192,87,0.7)');
      x.strokeStyle = '#2b8a3e';
      x.lineWidth = 2;
      x.lineCap = 'round';
      x.beginPath();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        x.moveTo(Math.cos(a) * 6, Math.sin(a) * 6);
        x.lineTo(Math.cos(a) * 11, Math.sin(a) * 11);
      }
      x.stroke();
      hard(x);
      x.fillStyle = '#2b8a3e';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        circle(x, Math.cos(a) * 11, Math.sin(a) * 11, 1.9);
        x.fill();
      }
      const g = x.createRadialGradient(-2, -3, 1, 0, 0, 8);
      g.addColorStop(0, '#b2f2bb');
      g.addColorStop(1, '#40c057');
      circle(x, 0, 0, 7.5);
      x.fillStyle = g;
      x.fill();
      x.strokeStyle = '#2b8a3e';
      x.lineWidth = 1.4;
      x.stroke();
      x.fillStyle = '#1b4d24'; // 심술 난 얼굴
      circle(x, -2.6, -1, 1.1);
      x.fill();
      circle(x, 2.6, -1, 1.1);
      x.fill();
      x.strokeStyle = '#1b4d24';
      x.lineWidth = 1;
      x.beginPath();
      x.arc(0, 3.4, 2, Math.PI * 1.15, Math.PI * 1.85);
      x.stroke();
    });
  };

  // 발산 경고 (⚠)
  P.warnSprite = function () {
    return this.sprite('warn', 24, 22, (x) => {
      soft(x, 4, 0, 'rgba(250,82,82,0.6)');
      x.fillStyle = '#ffd43b';
      x.beginPath();
      x.moveTo(12, 1.5);
      x.lineTo(22.5, 20.5);
      x.lineTo(1.5, 20.5);
      x.closePath();
      x.fill();
      hard(x);
      x.lineJoin = 'round';
      x.lineWidth = 1.8;
      x.strokeStyle = '#212529';
      x.stroke();
      x.fillStyle = '#212529';
      x.font = `900 12px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('!', 12, 14);
    });
  };

  // 플롯 데이터 점 (matplotlib 'r--o' 처럼 빨간 마커: 파란 경험치 보석과 헷갈리지 않게)
  P.plotDotSprite = function () {
    return this.sprite('plotdot_r', 20, 20, (x) => {
      soft(x, 4, 0, 'rgba(224,49,49,0.65)');
      circle(x, 10, 10, 6.6);
      x.fillStyle = '#ff6b6b';
      x.fill();
      hard(x);
      x.lineWidth = 2.2;
      x.strokeStyle = '#a51111';
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.75)';
      circle(x, 8.2, 8, 1.9);
      x.fill();
    });
  };

  // 적의 공격 공통 표시: 붉게 빛나는 후광 + 얇은 테두리
  P.dangerHaloSprite = function () {
    return this.sprite('dangerhalo', 64, 64, (x) => {
      const g = x.createRadialGradient(32, 32, 6, 32, 32, 31);
      g.addColorStop(0, 'rgba(255,107,107,0)');
      g.addColorStop(0.45, 'rgba(255,107,107,0.28)');
      g.addColorStop(0.7, 'rgba(240,62,62,0.42)');
      g.addColorStop(1, 'rgba(240,62,62,0)');
      x.fillStyle = g;
      circle(x, 32, 32, 31);
      x.fill();
      x.strokeStyle = 'rgba(201,42,42,0.7)';
      x.lineWidth = 2;
      circle(x, 32, 32, 20);
      x.stroke();
    });
  };

  // 학위논문 심사 '재심사' 도장 자국
  P.stampSprite = function () {
    return this.sprite('stamp', 128, 128, (x) => {
      x.translate(64, 64);
      x.rotate(-0.18);
      x.strokeStyle = 'rgba(201,42,42,0.92)';
      x.lineWidth = 7;
      circle(x, 0, 0, 56);
      x.stroke();
      x.lineWidth = 2.5;
      circle(x, 0, 0, 46);
      x.stroke();
      x.fillStyle = 'rgba(201,42,42,0.92)';
      x.font = R.dfont(30);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('재심사', 0, 2);
      x.font = `900 11px ${FONT}`;
      x.fillText('학위논문 심사위원회', 0, -27);
      x.fillText('수정 후 재제출', 0, 30);
    });
  };

  // ───────── 지식(경험치 보석) · 아이템 ─────────
  const GEM = [['#74c0fc', '#1c7ed6'], ['#69db7c', '#2b8a3e'], ['#e599f7', '#9c36b5']];
  P.gemSprite = function (tier) {
    const s = [12, 15, 19][tier], c = GEM[tier];
    return this.sprite('gem' + tier, s + 4, s * 1.35 + 4, (x, w, h) => {
      const cx = w / 2, top = 2, bot = h - 2, mid = h * 0.42, hw = s / 2;
      soft(x, 2.5, 1.5, 'rgba(0,0,0,0.25)');
      x.beginPath();
      x.moveTo(cx, top);
      x.lineTo(cx + hw, mid);
      x.lineTo(cx, bot);
      x.lineTo(cx - hw, mid);
      x.closePath();
      x.fillStyle = c[1];
      x.fill();
      hard(x);
      // 면: 왼쪽 위 밝게, 오른쪽 아래 어둡게
      const face = (pts, col) => {
        x.beginPath();
        x.moveTo(pts[0], pts[1]);
        for (let i = 2; i < pts.length; i += 2) x.lineTo(pts[i], pts[i + 1]);
        x.closePath();
        x.fillStyle = col;
        x.fill();
      };
      face([cx, top, cx - hw, mid, cx, mid + 1], shade(c[0], 0.45));
      face([cx, top, cx + hw, mid, cx, mid + 1], c[0]);
      face([cx - hw, mid, cx, bot, cx, mid + 1], shade(c[1], 0.15));
      face([cx + hw, mid, cx, bot, cx, mid + 1], c[1]);
      x.lineJoin = 'round';
      x.lineWidth = 1;
      x.strokeStyle = shade(c[1], -0.35);
      x.beginPath();
      x.moveTo(cx, top);
      x.lineTo(cx + hw, mid);
      x.lineTo(cx, bot);
      x.lineTo(cx - hw, mid);
      x.closePath();
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.9)';
      x.beginPath();
      x.moveTo(cx - 1, top + 3);
      x.lineTo(cx - hw * 0.45, mid - 1);
      x.lineTo(cx - 0.5, mid - 2.5);
      x.closePath();
      x.fill();
    });
  };

  // ───────── 성소 바닥 그림 (헬스장 · 증바람 · 회식 · 학회 · 풋살) ─────────
  P.sanctuaryFloor = function (s) {
    const id = s.id, col = s.def.color;
    return this.sprite('sfloor:' + id, 180, 140, (x, w, h) => {
      const cx = w / 2, cy = h / 2;
      soft(x, 10, 4, 'rgba(20,30,55,0.22)');
      if (id === 'gym') { // 고무 매트 + 바벨 + 덤벨
        rr(x, 14, 18, 152, 104, 14);
        x.fillStyle = '#343a40';
        x.fill();
        hard(x);
        x.strokeStyle = col;
        x.lineWidth = 3;
        x.stroke();
        x.strokeStyle = 'rgba(255,255,255,0.06)';
        x.lineWidth = 1;
        for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(14, 30 + i * 16); x.lineTo(166, 30 + i * 16); x.stroke(); }
        x.fillStyle = '#adb5bd';
        x.fillRect(36, cy - 2, 108, 4);
        const plate = (px, ph) => { rr(x, px, cy - ph / 2, 7, ph, 2); x.fillStyle = '#212529'; x.fill(); x.strokeStyle = col; x.lineWidth = 1.5; x.stroke(); };
        plate(40, 34); plate(48, 28); plate(125, 28); plate(133, 34);
        x.fillStyle = '#495057';
        rr(x, 40, 94, 22, 6, 3); x.fill();
        rr(x, 118, 94, 22, 6, 3); x.fill();
        x.fillStyle = '#212529';
        for (const px of [38, 58, 116, 136]) { rr(x, px, 91, 6, 12, 2); x.fill(); }
      } else if (id === 'aram') { // 보라빛 육각 단상 (증강 칼바람)
        const hex = (r0) => {
          x.beginPath();
          for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; x.lineTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.78); }
          x.closePath();
        };
        hex(68);
        x.fillStyle = vgrad(x, 10, 130, '#5f3dc4', '#2b1a6b');
        x.fill();
        hard(x);
        x.strokeStyle = '#d0bfff';
        x.lineWidth = 3;
        x.stroke();
        hex(48);
        x.strokeStyle = 'rgba(208,191,255,0.55)';
        x.lineWidth = 2;
        x.stroke();
        hex(26);
        x.fillStyle = 'rgba(151,117,250,0.55)';
        x.fill();
        x.strokeStyle = 'rgba(255,255,255,0.4)';
        x.lineWidth = 1;
        x.beginPath();
        for (let i = 0; i < 6; i++) { const a = (i / 6) * TAU + Math.PI / 6; x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * 68, cy + Math.sin(a) * 53); }
        x.stroke();
      } else if (id === 'dinner') { // 고기 불판이 있는 원탁 + 소주
        ell(x, cx, cy, 76, 56);
        x.fillStyle = vgrad(x, 14, 126, '#e8c39e', '#c08552');
        x.fill();
        hard(x);
        x.strokeStyle = '#8d5a2b';
        x.lineWidth = 3;
        x.stroke();
        ell(x, cx, cy, 30, 23);
        x.fillStyle = '#343a40';
        x.fill();
        x.strokeStyle = '#868e96';
        x.lineWidth = 1;
        for (let i = -3; i <= 3; i++) { x.beginPath(); x.moveTo(cx + i * 7, cy - 21); x.lineTo(cx + i * 7, cy + 21); x.stroke(); }
        x.fillStyle = '#ff8787'; // 삼겹살
        for (let i = 0; i < 4; i++) { rr(x, cx - 20 + (i % 2) * 20, cy - 13 + (i >> 1) * 13, 16, 8, 3); x.fill(); }
        x.fillStyle = '#fff5f5';
        for (let i = 0; i < 4; i++) x.fillRect(cx - 18 + (i % 2) * 20, cy - 10 + (i >> 1) * 13, 12, 1.4);
        const plateAt = (px, py) => { ell(x, px, py, 10, 7); x.fillStyle = '#fff'; x.fill(); x.strokeStyle = '#dee2e6'; x.lineWidth = 1.5; x.stroke(); };
        plateAt(cx - 52, cy - 10); plateAt(cx + 52, cy + 8); plateAt(cx - 22, cy + 38); plateAt(cx + 26, cy - 38);
        for (const [bx, by] of [[cx + 46, cy - 24], [cx - 44, cy + 22]]) { // 초록 소주병
          rr(x, bx - 4, by - 12, 8, 18, 3);
          x.fillStyle = '#2f9e44';
          x.fill();
          x.fillStyle = '#b2f2bb';
          x.fillRect(bx - 3, by - 5, 6, 5);
          x.fillStyle = '#2b8a3e';
          x.fillRect(bx - 2, by - 16, 4, 5);
        }
      } else if (id === 'conference') { // 탑승구 카펫 + 비행기
        rr(x, 16, 24, 148, 92, 16);
        x.fillStyle = vgrad(x, 24, 116, '#4dabf7', '#1864ab');
        x.fill();
        hard(x);
        x.strokeStyle = '#d0ebff';
        x.lineWidth = 3;
        x.stroke();
        x.setLineDash([8, 6]);
        x.strokeStyle = 'rgba(255,255,255,0.55)';
        x.lineWidth = 2;
        x.beginPath();
        x.moveTo(26, cy);
        x.lineTo(154, cy);
        x.stroke();
        x.setLineDash([]);
        x.fillStyle = 'rgba(255,255,255,0.92)'; // 비행기 실루엣
        x.save();
        x.translate(cx, cy);
        x.rotate(-0.5);
        x.beginPath();
        x.ellipse(0, 0, 34, 6, 0, 0, TAU);
        x.fill();
        x.beginPath();
        x.moveTo(-4, -4); x.lineTo(-14, -30); x.lineTo(-6, -30); x.lineTo(12, -4);
        x.moveTo(-4, 4); x.lineTo(-14, 30); x.lineTo(-6, 30); x.lineTo(12, 4);
        x.moveTo(-26, -2); x.lineTo(-34, -13); x.lineTo(-29, -13); x.lineTo(-20, -2);
        x.moveTo(-26, 2); x.lineTo(-34, 13); x.lineTo(-29, 13); x.lineTo(-20, 2);
        x.fill();
        x.restore();
        x.fillStyle = '#fff';
        x.font = `900 11px ${FONT}`;
        x.textAlign = 'left';
        x.textBaseline = 'middle';
        x.fillText('GATE 7', 26, 36);
      } else { // 풋살장
        rr(x, 12, 20, 156, 100, 6);
        x.fillStyle = '#51cf66';
        x.fill();
        hard(x);
        x.fillStyle = 'rgba(255,255,255,0.08)';
        for (let i = 0; i < 6; i++) if (i % 2) x.fillRect(12 + i * 26, 20, 26, 100);
        x.strokeStyle = '#fff';
        x.lineWidth = 2.5;
        rr(x, 18, 26, 144, 88, 3);
        x.stroke();
        x.beginPath();
        x.moveTo(cx, 26);
        x.lineTo(cx, 114);
        x.stroke();
        circle(x, cx, cy, 16);
        x.stroke();
        rr(x, 18, cy - 20, 18, 40, 0);
        x.stroke();
        rr(x, 144, cy - 20, 18, 40, 0);
        x.stroke();
        x.strokeStyle = col;
        x.lineWidth = 3;
        rr(x, 12, 20, 156, 100, 6);
        x.stroke();
      }
    });
  };

  // 성소 위에 떠 있는 아이콘 + 이름
  P.sanctuaryBadge = function (s) {
    const def = s.def;
    return this.sprite('sbadge:' + s.id, 110, 92, (x, w) => {
      const cx = w / 2;
      soft(x, 8, 4, 'rgba(20,30,55,0.3)');
      circle(x, cx, 34, 28);
      x.fillStyle = '#fff';
      x.fill();
      hard(x);
      x.lineWidth = 4;
      x.strokeStyle = def.color;
      x.stroke();
      circle(x, cx, 34, 22);
      x.fillStyle = rgba(def.color, 0.12);
      x.fill();
      x.fillStyle = '#000';
      x.font = `30px ${EMOJI}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(def.emoji, cx, 36);
      x.font = `800 13px ${FONT}`;
      const tw = x.measureText(def.name).width + 18;
      soft(x, 4, 2, 'rgba(20,30,55,0.25)');
      rr(x, cx - tw / 2, 68, tw, 21, 10.5);
      x.fillStyle = def.color;
      x.fill();
      hard(x);
      x.fillStyle = '#fff';
      x.fillText(def.name, cx, 79);
    });
  };
})(window.GS = window.GS || {});
