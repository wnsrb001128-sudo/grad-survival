// 연구실 배경: 바닥 타일 · 천장 조명 · 가구 묶음 · 바닥 소품, 그리고 타이틀 화면 뒤에서 도는 장면 (적에게 쫓기는 대학원생)
// 맵은 캐릭터마다 다르다: Dry lab = 시뮬레이션 연구실(이 파일: 책상·화이트보드·서버·책장·휴게실·탕비실·복사기)
//                        Wet lab = 실험 연구실(wetlab.js: 실험대·흄후드·냉동고·오토클레이브·시약장·동물실)
// 가구는 장식일 뿐 게임에 영향이 없다
(function (GS) {
  'use strict';
  const R = GS.R, TAU = R.TAU, P = GS.Renderer.prototype;
  const rr = R.roundRect, shade = R.shade, circle = R.circle, ell = R.ell, soft = R.soft, hard = R.hard, vgrad = R.vgrad;
  const FONT = R.FONT;
  const NOTES = ['논문 읽기', 'TODO', 'D-7', '수렴 확인!', '교수님 면담', 'Rebuttal', 'git push', '졸업'];
  const WET_NOTES = ['오토클레이브 예약', '-80 정리', '폐액 버리기', '배양 D+3', '세포 계대', '항체 주문', 'MSDS', '졸업'];
  const JET = ['#1d3d8f', '#1c7ed6', '#22b8cf', '#51cf66', '#fcc419', '#f76707', '#e03131'];
  const CELL = 760;      // 가구 묶음 하나가 들어가는 칸
  const DECAL = 250;     // 바닥 소품 칸
  const LIGHT = 560;     // 천장 조명 간격

  // ───────── 바닥 (타일 + 잔점 무늬, N×N 타일을 패턴으로 반복). F: 맵 테마의 바닥 색 ─────────
  const DRY_FLOOR = { // 밝은 회색 사무실 타일
    key: 'dry', T: 96, N: 4, seed: 20261013, specks: 70,
    tones: ['#f4f6f9', '#f1f4f7', '#f6f7fa', '#f0f3f6', '#f3f5f8'],
    speck: ['#c9d0d8', '#d6dce3', '#bfc7d0', '#dfe4ea', '#e8d9c5'],
    line: '#dde2e8', lineDark: 'rgba(150,160,175,0.18)',
  };
  P.floorPattern = function (ctx, F) {
    F = F || DRY_FLOOR;
    this.floorPats = this.floorPats || {};
    if (this.floorPats[F.key]) return this.floorPats[F.key];
    const T = F.T, N = F.N, S = T * N, FR = 2;
    const c = document.createElement('canvas');
    c.width = c.height = S * FR;
    const x = c.getContext('2d');
    x.scale(FR, FR);
    const rnd = GS.util.mulberry32(F.seed);
    const tones = F.tones, speck = F.speck;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        const X = i * T, Y = j * T;
        x.fillStyle = tones[(rnd() * tones.length) | 0];
        x.fillRect(X, Y, T, T);
        const g = x.createLinearGradient(X, Y, X + T, Y + T); // 타일마다 은은한 광택
        g.addColorStop(0, 'rgba(255,255,255,0.55)');
        g.addColorStop(0.5, 'rgba(255,255,255,0)');
        g.addColorStop(1, 'rgba(180,190,205,0.12)');
        x.fillStyle = g;
        x.fillRect(X, Y, T, T);
        for (let k = 0; k < F.specks; k++) {
          x.globalAlpha = 0.25 + rnd() * 0.55;
          x.fillStyle = speck[(rnd() * speck.length) | 0];
          const s = 0.5 + rnd() * 1.5;
          x.fillRect(X + rnd() * T, Y + rnd() * T, s, s * (0.6 + rnd() * 0.8));
        }
        x.globalAlpha = 1;
        if (F.extra) F.extra(x, X, Y, T, rnd);
        x.fillStyle = 'rgba(255,255,255,0.95)'; // 줄눈 (위·왼쪽은 밝게, 아래·오른쪽은 어둡게)
        x.fillRect(X, Y + 1, T, 1);
        x.fillRect(X + 1, Y, 1, T);
        x.fillStyle = F.line;
        x.fillRect(X, Y, T, 1);
        x.fillRect(X, Y, 1, T);
        x.fillStyle = F.lineDark;
        x.fillRect(X, Y + T - 1, T, 1);
        x.fillRect(X + T - 1, Y, 1, T);
      }
    }
    const pat = ctx.createPattern(c, 'repeat');
    if (pat.setTransform && window.DOMMatrix) pat.setTransform(new DOMMatrix([1 / FR, 0, 0, 1 / FR, 0, 0]));
    this.floorPats[F.key] = pat;
    return pat;
  };

  // 천장 조명이 바닥에 비친 밝은 자국
  P.lightPool = function () {
    return this.sprite('lightpool', 160, 100, (x, w, h) => {
      x.translate(w / 2, h / 2);
      x.scale(w / 2, h / 2);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 1);
      g.addColorStop(0, 'rgba(255,255,255,0.75)');
      g.addColorStop(0.5, 'rgba(255,255,255,0.3)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.fillRect(-1, -1, 2, 2);
    });
  };

  // ───────── 모니터 화면 내용 ─────────
  function screen(x, X, Y, W, H, kind, seed) {
    x.save();
    x.beginPath();
    x.rect(X, Y, W, H);
    x.clip();
    const lh = H / 7;
    if (kind === 'code') {
      x.fillStyle = '#1e2330';
      x.fillRect(X, Y, W, H);
      const cols = ['#82aaff', '#c3e88d', '#f78c6c', '#c792ea', '#89ddff', '#ffcb6b'];
      for (let i = 0; i < 6; i++) {
        const ind = [0, 1, 2, 2, 1, 0][i] * 4;
        x.fillStyle = cols[(i + seed) % cols.length];
        x.fillRect(X + 5 + ind, Y + 2.5 + i * lh, (W - 12 - ind) * (0.3 + (((i + seed) * 37) % 55) / 100), Math.max(1.3, lh * 0.45));
      }
      x.fillStyle = '#2b3245';
      x.fillRect(X, Y, 3, H);
    } else if (kind === 'term') {
      x.fillStyle = '#0b0f14';
      x.fillRect(X, Y, W, H);
      x.fillStyle = '#51cf66';
      for (let i = 0; i < 5; i++) x.fillRect(X + 3, Y + 3 + i * lh, (W - 8) * (0.25 + (((i + seed) * 29) % 60) / 100), Math.max(1.2, lh * 0.4));
      x.fillStyle = '#ff8787';
      x.fillRect(X + 3, Y + 3 + 5 * lh, W * 0.35, Math.max(1.2, lh * 0.4)); // 빨간 에러 한 줄
    } else if (kind === 'plot') {
      x.fillStyle = '#ffffff';
      x.fillRect(X, Y, W, H);
      x.strokeStyle = '#e9ecef';
      x.lineWidth = 0.6;
      for (let i = 1; i < 4; i++) {
        x.beginPath();
        x.moveTo(X + 4, Y + (H * i) / 4);
        x.lineTo(X + W - 2, Y + (H * i) / 4);
        x.stroke();
      }
      x.strokeStyle = '#495057';
      x.lineWidth = 0.9;
      x.beginPath();
      x.moveTo(X + 4, Y + 2);
      x.lineTo(X + 4, Y + H - 3);
      x.lineTo(X + W - 2, Y + H - 3);
      x.stroke();
      const curve = (col, k, off) => {
        x.strokeStyle = col;
        x.lineWidth = 1.2;
        x.beginPath();
        for (let i = 0; i <= 30; i++) {
          const px = X + 5 + ((W - 8) * i) / 30, py = Y + 3 + (H - 8) * (1 - Math.exp(-i / k)) * 0.9 + Math.sin(i * 1.7 + off) * 0.8;
          if (i) x.lineTo(px, H + Y - (py - Y)); else x.moveTo(px, H + Y - (py - Y));
        }
        x.stroke();
      };
      curve('#1c7ed6', 5, 0);
      curve('#f76707', 8, 2);
    } else if (kind === 'cfd') { // 원기둥 뒤 와류 (유동 해석 결과)
      const g = x.createLinearGradient(X, Y, X, Y + H);
      g.addColorStop(0, JET[0]);
      g.addColorStop(0.3, JET[1]);
      g.addColorStop(0.5, JET[2]);
      g.addColorStop(0.7, JET[1]);
      g.addColorStop(1, JET[0]);
      x.fillStyle = g;
      x.fillRect(X, Y, W, H);
      const cy = Y + H / 2, r = H * 0.16, cx = X + W * 0.24;
      for (let i = 0; i < 5; i++) {
        const vx = cx + r * 2 + i * W * 0.15, vy = cy + (i % 2 ? 1 : -1) * H * 0.14;
        ell(x, vx, vy, W * 0.08, H * 0.13);
        x.fillStyle = i % 2 ? JET[5] : JET[4];
        x.fill();
        ell(x, vx, vy, W * 0.04, H * 0.07);
        x.fillStyle = i % 2 ? JET[6] : JET[3];
        x.fill();
      }
      circle(x, cx, cy, r);
      x.fillStyle = '#f8f9fa';
      x.fill();
    } else if (kind === 'heat') {
      const n = 8, m = 5;
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < m; j++) {
          const v = (Math.sin(i * 0.9 + seed) + Math.cos(j * 1.3 + seed * 0.5) + 2) / 4;
          x.fillStyle = JET[Math.min(6, Math.floor(v * 7))];
          x.fillRect(X + (W * i) / n, Y + (H * j) / m, W / n + 0.5, H / m + 0.5);
        }
      }
    } else if (kind === 'gel') { // 전기영동 젤 사진 (왼쪽 첫 줄은 사다리)
      x.fillStyle = '#10141c';
      x.fillRect(X, Y, W, H);
      const lanes = 6, lw = (W - 6) / lanes;
      for (let l = 0; l < lanes; l++) {
        const lx = X + 3 + l * lw;
        x.fillStyle = 'rgba(120,160,255,0.08)';
        x.fillRect(lx + 1, Y + 2, lw - 2, H - 4);
        const bands = l === 0 ? [0.18, 0.3, 0.42, 0.52, 0.62, 0.72, 0.82] : [0.25 + ((l * 37 + seed) % 40) / 100, 0.55 + ((l * 23) % 25) / 100];
        for (const b of bands) {
          x.fillStyle = l === 0 ? 'rgba(220,235,255,0.75)' : 'rgba(235,245,255,0.95)';
          x.fillRect(lx + 2, Y + H * b, lw - 4, Math.max(1.2, H * 0.045));
        }
      }
    } else if (kind === 'cells') { // 형광 현미경 사진 (초록 세포 + 파란 핵)
      x.fillStyle = '#05080c';
      x.fillRect(X, Y, W, H);
      for (let i = 0; i < 9; i++) {
        const cx = X + ((i * 41 + seed * 13) % 100) / 100 * W, cy = Y + ((i * 67 + seed * 7) % 100) / 100 * H, r = H * (0.1 + (i % 3) * 0.03);
        ell(x, cx, cy, r * 1.3, r, i);
        x.fillStyle = 'rgba(64,192,87,0.75)';
        x.fill();
        circle(x, cx, cy, r * 0.45);
        x.fillStyle = 'rgba(77,171,247,0.95)';
        x.fill();
      }
    } else if (kind === 'bars') { // 막대그래프 + 오차 막대 + 별표 (유의성)
      x.fillStyle = '#ffffff';
      x.fillRect(X, Y, W, H);
      x.strokeStyle = '#495057';
      x.lineWidth = 0.9;
      x.beginPath();
      x.moveTo(X + 4, Y + 3);
      x.lineTo(X + 4, Y + H - 3);
      x.lineTo(X + W - 2, Y + H - 3);
      x.stroke();
      const hs = [0.35, 0.62, 0.86], cols = ['#adb5bd', '#4dabf7', '#f76707'], bw = (W - 14) / 4;
      hs.forEach((v, i) => {
        const bx = X + 8 + i * bw * 1.3, bh = (H - 10) * v;
        x.fillStyle = cols[i];
        x.fillRect(bx, Y + H - 3 - bh, bw, bh);
        x.strokeStyle = '#212529';
        x.lineWidth = 0.7;
        x.beginPath();
        x.moveTo(bx + bw / 2, Y + H - 3 - bh - 3);
        x.lineTo(bx + bw / 2, Y + H - 3 - bh + 2);
        x.stroke();
      });
      x.fillStyle = '#212529';
      x.font = `900 ${Math.max(5, H * 0.2)}px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'top';
      x.fillText('**', X + 8 + 2 * bw * 1.3 + bw / 2, Y + 0.5);
    } else if (kind === 'excel') { // 실험 데이터 표
      x.fillStyle = '#ffffff';
      x.fillRect(X, Y, W, H);
      x.fillStyle = '#2f9e44';
      x.fillRect(X, Y, W, H * 0.16);
      x.strokeStyle = '#dee2e6';
      x.lineWidth = 0.6;
      for (let i = 1; i < 6; i++) {
        x.beginPath();
        x.moveTo(X, Y + H * 0.16 + (i * H * 0.84) / 6);
        x.lineTo(X + W, Y + H * 0.16 + (i * H * 0.84) / 6);
        x.moveTo(X + (i * W) / 5, Y + H * 0.16);
        x.lineTo(X + (i * W) / 5, Y + H);
        x.stroke();
      }
      x.fillStyle = '#868e96';
      for (let r = 0; r < 5; r++) for (let k = 0; k < 4; k++) x.fillRect(X + 2 + (k * W) / 5, Y + H * 0.2 + (r * H * 0.84) / 6, W * (0.08 + ((r + k + seed) % 3) * 0.03), Math.max(1, H * 0.05));
      x.fillStyle = 'rgba(250,82,82,0.35)';
      x.fillRect(X + (3 * W) / 5, Y + H * 0.16 + (3 * H * 0.84) / 6, W / 5, (H * 0.84) / 6);
    } else { // pdf 논문
      x.fillStyle = '#f1f3f5';
      x.fillRect(X, Y, W, H);
      x.fillStyle = '#ffffff';
      x.fillRect(X + W * 0.12, Y + 2, W * 0.76, H - 2);
      x.fillStyle = '#343a40';
      x.fillRect(X + W * 0.2, Y + 4, W * 0.6, Math.max(1.4, lh * 0.5));
      x.fillStyle = '#adb5bd';
      for (let i = 0; i < 5; i++) x.fillRect(X + W * 0.18, Y + 4 + (i + 1.4) * lh, W * (i === 2 ? 0.3 : 0.64), Math.max(1, lh * 0.32));
      x.fillStyle = '#d0ebff';
      x.fillRect(X + W * 0.52, Y + 3 + 3.4 * lh, W * 0.3, lh * 2);
    }
    x.restore();
    x.fillStyle = 'rgba(255,255,255,0.09)'; // 화면 유리 반사
    x.beginPath();
    x.moveTo(X, Y);
    x.lineTo(X + W * 0.45, Y);
    x.lineTo(X + W * 0.2, Y + H);
    x.lineTo(X, Y + H);
    x.closePath();
    x.fill();
  }

  function monitor(x, mx, my, mw, mh, kind, seed) {
    x.fillStyle = '#868e96';
    x.fillRect(mx + mw / 2 - 3, my + mh - 1, 6, 8);
    ell(x, mx + mw / 2, my + mh + 8, Math.min(13, mw * 0.22), 3.6);
    x.fillStyle = '#adb5bd';
    x.fill();
    soft(x, 4, 2, 'rgba(20,30,55,0.25)');
    rr(x, mx, my, mw, mh, 3);
    x.fillStyle = '#23272e';
    x.fill();
    hard(x);
    screen(x, mx + 2.5, my + 2.5, mw - 5, mh - 6, kind, seed);
    x.fillStyle = '#3a3f47';
    x.fillRect(mx + 2, my + mh - 3, mw - 4, 1.5);
  }

  function chair(x, cx, y, col) {
    x.strokeStyle = '#495057';
    x.lineWidth = 3;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - 15, y + 36);
    x.lineTo(cx + 15, y + 36);
    x.moveTo(cx, y + 28);
    x.lineTo(cx, y + 38);
    x.stroke();
    x.fillStyle = '#212529';
    for (const [wx, wy] of [[cx - 16, y + 38], [cx + 16, y + 38], [cx, y + 40]]) {
      circle(x, wx, wy, 2.6);
      x.fill();
    }
    rr(x, cx - 21, y + 16, 42, 13, 6);
    x.fillStyle = shade(col, -0.3);
    x.fill();
    soft(x, 4, 2, 'rgba(20,30,55,0.25)');
    rr(x, cx - 18, y, 36, 26, 10);
    x.fillStyle = vgrad(x, y, y + 26, shade(col, 0.15), shade(col, -0.15));
    x.fill();
    hard(x);
    x.strokeStyle = shade(col, -0.45);
    x.lineWidth = 1.4;
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.18)';
    x.beginPath();
    x.moveTo(cx - 10, y + 5);
    x.lineTo(cx + 10, y + 5);
    x.stroke();
  }

  function mug(x, cx, cy, col) {
    soft(x, 2, 1.5, 'rgba(20,30,55,0.25)');
    rr(x, cx - 6, cy - 6, 12, 13, 3);
    x.fillStyle = col;
    x.fill();
    hard(x);
    ell(x, cx, cy - 6, 6, 2.4);
    x.fillStyle = '#6f4326';
    x.fill();
    x.strokeStyle = col;
    x.lineWidth = 2;
    x.beginPath();
    x.arc(cx + 7, cy, 3, -1.2, 1.2);
    x.stroke();
  }

  function papers(x, X, Y, n) {
    for (let i = 0; i < n; i++) {
      x.save();
      x.translate(X + 14, Y + 12);
      x.rotate((i - n / 2) * 0.12);
      soft(x, 2, 1, 'rgba(20,30,55,0.15)');
      x.fillStyle = '#ffffff';
      x.fillRect(-13, -11, 26, 22);
      hard(x);
      x.strokeStyle = '#dee2e6';
      x.lineWidth = 0.8;
      x.strokeRect(-13, -11, 26, 22);
      x.fillStyle = '#ced4da';
      for (let k = 0; k < 4; k++) x.fillRect(-10, -7 + k * 4.5, k === 3 ? 10 : 18, 1.2);
      x.restore();
    }
  }

  function ramen(x, cx, cy) {
    soft(x, 2, 1.5, 'rgba(20,30,55,0.25)');
    x.fillStyle = '#ffffff';
    x.beginPath();
    x.moveTo(cx - 9, cy - 6);
    x.lineTo(cx + 9, cy - 6);
    x.lineTo(cx + 7, cy + 8);
    x.lineTo(cx - 7, cy + 8);
    x.closePath();
    x.fill();
    hard(x);
    x.fillStyle = '#e03131';
    x.fillRect(cx - 8, cy - 1, 16, 4);
    ell(x, cx, cy - 6, 9, 3);
    x.fillStyle = '#f2c94c';
    x.fill();
    x.strokeStyle = '#e8590c';
    x.lineWidth = 0.8;
    x.stroke();
    x.strokeStyle = '#495057'; // 젓가락
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(cx - 2, cy - 7);
    x.lineTo(cx + 8, cy - 16);
    x.moveTo(cx + 1, cy - 7);
    x.lineTo(cx + 10, cy - 14);
    x.stroke();
  }

  // 펼친 실험 노트 (손글씨 줄)
  function notebook(x, X, Y, rot) {
    x.save();
    x.translate(X + 18, Y + 12);
    x.rotate(rot || 0);
    soft(x, 2, 1, 'rgba(20,30,55,0.18)');
    x.fillStyle = '#fffdf6';
    x.fillRect(-18, -12, 36, 24);
    hard(x);
    x.fillStyle = '#1c3d6e'; // 제본선
    x.fillRect(-0.8, -12, 1.6, 24);
    x.strokeStyle = '#d0ebff';
    x.lineWidth = 0.5;
    for (let i = 0; i < 5; i++) {
      x.beginPath();
      x.moveTo(-16, -7 + i * 4);
      x.lineTo(16, -7 + i * 4);
      x.stroke();
    }
    x.strokeStyle = '#495057';
    x.lineWidth = 0.7;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      for (const s of [-1, 1]) {
        const x0 = s < 0 ? -15 : 3, len = i === 3 ? 6 : 11;
        x.moveTo(x0, -8 + i * 4);
        for (let k = 1; k <= 6; k++) x.lineTo(x0 + (len * k) / 6, -8 + i * 4 + (k % 2 ? -0.7 : 0.5));
      }
      x.stroke();
    }
    x.restore();
  }

  // 비커에 담은 커피 (실험실 국룰)
  function beakerCoffee(x, cx, cy) {
    soft(x, 2, 1.5, 'rgba(20,30,55,0.22)');
    rr(x, cx - 7, cy - 9, 14, 17, 2);
    x.fillStyle = 'rgba(231,245,255,0.9)';
    x.fill();
    hard(x);
    x.fillStyle = '#6f4326';
    x.fillRect(cx - 6, cy - 2, 12, 9);
    x.strokeStyle = 'rgba(80,110,140,0.7)';
    x.lineWidth = 0.9;
    rr(x, cx - 7, cy - 9, 14, 17, 2);
    x.stroke();
    x.beginPath(); // 주둥이 + 눈금
    x.moveTo(cx - 7, cy - 9);
    x.lineTo(cx - 9, cy - 10.5);
    for (let i = 0; i < 3; i++) {
      x.moveTo(cx + 2, cy - 5 + i * 4);
      x.lineTo(cx + 6, cy - 5 + i * 4);
    }
    x.stroke();
  }

  function sticky(x, X, Y, col, text) {
    soft(x, 2, 1, 'rgba(20,30,55,0.2)');
    x.fillStyle = col;
    x.fillRect(X, Y, 14, 13);
    hard(x);
    if (text) {
      x.fillStyle = 'rgba(0,0,0,0.55)';
      x.font = `800 4px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, X + 7, Y + 6.5, 13);
    }
  }

  // ───────── 가구 (빛은 왼쪽 위, 그림자는 오른쪽 아래) ─────────
  // 책상: 위에서 비스듬히 본 모습. 모니터는 의자 쪽(화면 아래)을 본다
  // 0~5 Dry lab 책상, 6~8 Wet lab 책상 (젤 사진 · 형광 사진 · 실험 데이터 표)
  const DESK_SCREENS = [['code'], ['code', 'plot'], ['term'], ['cfd'], ['pdf', 'plot'], ['heat'], ['gel'], ['cells', 'bars'], ['excel']];
  // 깜빡이는 커서 위치 (책상 그림 기준)
  const DESK_CURSOR = [[78, 33], [40, 33], [76, 44], null, null, null, null, null, null];
  P.deskSprite = function (v) {
    return this.sprite('desk' + v, 190, 152, (x) => {
      soft(x, 12, 6, 'rgba(20,30,55,0.2)');
      rr(x, 8, 34, 174, 74, 6);
      x.fillStyle = '#dfe4ea';
      x.fill();
      hard(x);
      rr(x, 8, 88, 174, 20, 5);
      x.fillStyle = vgrad(x, 88, 108, '#e9edf2', '#cfd6de');
      x.fill();
      rr(x, 8, 34, 174, 60, 6);
      x.fillStyle = vgrad(x, 34, 94, '#ffffff', '#f2f4f7');
      x.fill();
      x.strokeStyle = '#d0d6de';
      x.lineWidth = 1.4;
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.95)';
      x.beginPath();
      x.moveTo(14, 35.6);
      x.lineTo(176, 35.6);
      x.stroke();
      x.fillStyle = '#adb5bd';
      x.fillRect(15, 106, 5, 12);
      x.fillRect(170, 106, 5, 12);
      // 모니터 / 노트북
      const sc = DESK_SCREENS[v];
      if (v === 2) { // 노트북
        soft(x, 4, 2, 'rgba(20,30,55,0.25)');
        rr(x, 66, 18, 56, 38, 3);
        x.fillStyle = '#ced4da';
        x.fill();
        hard(x);
        screen(x, 69, 21, 50, 32, 'term', v);
        rr(x, 60, 55, 68, 16, 3);
        x.fillStyle = vgrad(x, 55, 71, '#e9ecef', '#ced4da');
        x.fill();
        x.fillStyle = '#adb5bd';
        for (let i = 0; i < 3; i++) x.fillRect(64, 58 + i * 3.5, 60, 1.6);
      } else if (sc.length === 2 && v === 4) { // 와이드 모니터 한 대에 논문 + 그래프
        monitor(x, 34, 8, 116, 38, 'pdf', v);
        screen(x, 92, 10.5, 55.5, 32, 'plot', v);
      } else if (sc.length === 2) {
        monitor(x, 30, 10, 60, 36, sc[0], v);
        monitor(x, 98, 10, 60, 36, sc[1], v);
      } else monitor(x, 64, 8, 62, 38, sc[0], v);
      if (v !== 2) { // 키보드 · 마우스
        soft(x, 2, 1.5, 'rgba(20,30,55,0.2)');
        rr(x, 66, 64, 52, 14, 3);
        x.fillStyle = v === 5 ? '#343a40' : '#f1f3f5';
        x.fill();
        hard(x);
        x.strokeStyle = v === 5 ? '#212529' : '#ced4da';
        x.lineWidth = 1;
        x.stroke();
        x.fillStyle = v === 5 ? '#74c0fc' : '#ced4da';
        for (let r = 0; r < 3; r++) for (let k = 0; k < 10; k++) x.fillRect(69 + k * 4.7, 66.5 + r * 3.8, 3.4, 2.4);
        ell(x, 128, 71, 3.6, 5);
        x.fillStyle = '#e9ecef';
        x.fill();
        x.strokeStyle = '#adb5bd';
        x.stroke();
      }
      // 책상마다 다른 소품
      if (v === 0) { mug(x, 156, 62, '#ffffff'); papers(x, 14, 58, 3); sticky(x, 112, 16, '#ffe066', 'D-7'); }
      if (v === 1) { mug(x, 166, 66, '#4dabf7'); papers(x, 12, 62, 2); }
      if (v === 2) { // 구론산 병 + 과자
        rr(x, 146, 52, 9, 17, 3);
        x.fillStyle = '#8d5524';
        x.fill();
        x.fillStyle = '#ffd43b';
        x.fillRect(146, 58, 9, 5);
        x.fillStyle = '#c92a2a';
        rr(x, 150, 47, 4, 6, 1);
        x.fill();
        rr(x, 22, 60, 24, 16, 4);
        x.fillStyle = '#fab005';
        x.fill();
        x.fillStyle = '#e8590c';
        x.fillRect(25, 65, 18, 5);
        papers(x, 132, 70, 1);
      }
      if (v === 3) { ramen(x, 156, 66); papers(x, 12, 58, 4); sticky(x, 64, 10, '#ffc9c9', 'NaN?'); sticky(x, 112, 12, '#ffe066', '수렴!'); }
      if (v === 4) {
        papers(x, 12, 60, 2);
        x.fillStyle = '#2f9e44'; // 작은 선인장
        rr(x, 158, 44, 10, 16, 5);
        x.fill();
        rr(x, 154, 58, 18, 10, 2);
        x.fillStyle = '#e8590c';
        x.fill();
      }
      if (v === 5) { mug(x, 150, 58, '#fff'); mug(x, 164, 66, '#ffd8a8'); mug(x, 22, 64, '#e9ecef'); sticky(x, 44, 66, '#d3f9d8', '졸업'); }
      if (v === 6) { notebook(x, 12, 60, -0.08); beakerCoffee(x, 158, 64); sticky(x, 112, 14, '#ffc9c9', '재실험'); }
      if (v === 7) { notebook(x, 132, 70, 0.1); mug(x, 22, 64, '#be4bdb'); sticky(x, 62, 12, '#ffe066', 'n=3'); }
      if (v === 8) { notebook(x, 14, 58, 0.05); notebook(x, 18, 64, -0.06); beakerCoffee(x, 160, 62); sticky(x, 112, 14, '#d3f9d8', '배양 D+3'); }
      chair(x, 95, 104, ['#5c7cfa', '#495057', '#e8590c', '#20c997', '#7950f2', '#868e96', '#be4bdb', '#15aabf', '#fab005'][v]);
    });
  };

  // 화이트보드 (바퀴 달린 스탠드, 화면 쪽을 본다). wet: 실험 연구실 판서
  P.boardSprite = function (v, wet) {
    const EQ = wet ? [
      ['C₁V₁ = C₂V₂', '1× PBS, pH 7.4'],
      ['PCR: 95℃ → 58℃ → 72℃ ×35', 'Tm = 4(G+C) + 2(A+T)'],
      ['OD600 = 0.6 → IPTG 유도', '37℃, 200 rpm, O/N'],
      ['n = 3, p < 0.05 ???', 'western blot 3트째…'],
    ] : [
      ['∂u/∂t + (u·∇)u = −∇p + ν∇²u', 'Re = UL / ν'],
      ['min ‖Ax − b‖²', 'Δt < Δx / c  (CFL)'],
      ['mesh ×2 → 계산 시간 ×8', 'error ~ O(h²)'],
      ['loss → NaN ???', 'lr: 1e-4 → 1e-5'],
    ];
    const notes = wet ? WET_NOTES : NOTES;
    return this.sprite('board' + (wet ? 'w' : '') + v, 216, 160, (x) => {
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 4;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(28, 112);
      x.lineTo(22, 148);
      x.moveTo(188, 112);
      x.lineTo(194, 148);
      x.moveTo(24, 138);
      x.lineTo(192, 138);
      x.stroke();
      x.fillStyle = '#495057';
      for (const wx of [22, 194]) { circle(x, wx, 150, 4); x.fill(); }
      soft(x, 10, 5, 'rgba(20,30,55,0.22)');
      rr(x, 6, 4, 204, 116, 6);
      x.fillStyle = vgrad(x, 4, 120, '#e9ecef', '#c4cbd3');
      x.fill();
      hard(x);
      rr(x, 11, 9, 194, 106, 3);
      x.fillStyle = '#ffffff';
      x.fill();
      const eq = EQ[v % EQ.length];
      x.textBaseline = 'top';
      x.textAlign = 'left';
      x.font = 'italic 13px "Cambria Math","Times New Roman",serif';
      x.fillStyle = '#1c7ed6';
      x.fillText(eq[0], 18, 16, 182);
      x.fillStyle = '#c92a2a';
      x.fillText(eq[1], 18, 38, 120);
      x.strokeStyle = '#495057';
      x.lineWidth = 1.5;
      x.beginPath();
      x.moveTo(20, 62);
      x.lineTo(20, 100);
      x.lineTo(116, 100);
      x.stroke();
      x.strokeStyle = '#2f9e44';
      x.beginPath();
      for (let i = 0; i <= 45; i++) {
        const px = 22 + i * 2, py = 96 - 30 * (1 - Math.exp(-i / 10)) + Math.sin(i * 1.3) * 2;
        if (i) x.lineTo(px, py); else x.moveTo(px, py);
      }
      x.stroke();
      x.save(); // 포스트잇
      x.translate(166, 80);
      x.rotate(0.05 - v * 0.03);
      soft(x, 3, 2, 'rgba(20,30,55,0.2)');
      x.fillStyle = ['#ffec99', '#ffc9c9', '#d3f9d8', '#d0ebff'][v % 4];
      x.fillRect(-25, -21, 50, 42);
      hard(x);
      x.fillStyle = 'rgba(0,0,0,0.06)';
      x.fillRect(-25, -21, 50, 6);
      x.fillStyle = '#5c4a00';
      x.font = `800 10px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(notes[v % notes.length], 0, 2, 46);
      x.restore();
      x.fillStyle = '#ced4da'; // 마커 받침 + 마커
      rr(x, 46, 115, 124, 6, 2);
      x.fill();
      const mk = ['#1c7ed6', '#e03131', '#212529', '#2f9e44'];
      for (let i = 0; i < 4; i++) {
        x.fillStyle = mk[i];
        rr(x, 56 + i * 22, 112, 16, 4, 2);
        x.fill();
      }
    });
  };

  // 계산 서버 랙 (LED 는 world 에서 깜빡인다)
  P.serverSprite = function () {
    return this.sprite('server', 86, 156, (x) => {
      soft(x, 10, 6, 'rgba(20,30,55,0.25)');
      rr(x, 6, 14, 72, 134, 5);
      x.fillStyle = '#2b2f36';
      x.fill();
      hard(x);
      x.beginPath(); // 윗면
      x.moveTo(6, 16);
      x.lineTo(14, 6);
      x.lineTo(84, 6);
      x.lineTo(78, 16);
      x.closePath();
      x.fillStyle = '#495057';
      x.fill();
      for (let i = 0; i < 7; i++) {
        const y = 22 + i * 17;
        rr(x, 11, y, 62, 13, 2);
        x.fillStyle = vgrad(x, y, y + 13, '#454b54', '#33383f');
        x.fill();
        x.fillStyle = '#23272d';
        for (let k = 0; k < 7; k++) x.fillRect(16 + k * 4, y + 3, 2, 7);
        x.fillStyle = '#868e96';
        x.fillRect(50, y + 5, 6, 3);
      }
      x.fillStyle = 'rgba(255,255,255,0.06)'; // 유리문 반사
      x.beginPath();
      x.moveTo(6, 14);
      x.lineTo(40, 14);
      x.lineTo(10, 148);
      x.lineTo(6, 148);
      x.fill();
      x.fillStyle = '#212529';
      x.fillRect(10, 146, 8, 6);
      x.fillRect(66, 146, 8, 6);
    });
  };

  // 책장 (정면). 책 색·두께는 고정 난수
  P.shelfSprite = function (v) {
    return this.sprite('shelf' + v, 158, 136, (x) => {
      const rnd = GS.util.mulberry32(91 + v * 17);
      const books = ['#e03131', '#1c7ed6', '#2f9e44', '#f08c00', '#7048e8', '#495057', '#0c8599', '#d6336c', '#fab005', '#ced4da'];
      soft(x, 10, 6, 'rgba(20,30,55,0.22)');
      rr(x, 4, 6, 150, 124, 4);
      x.fillStyle = '#e9ecef';
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.lineWidth = 1.5;
      x.stroke();
      for (let s = 0; s < 3; s++) {
        const y0 = 12 + s * 39, y1 = y0 + 33;
        x.fillStyle = '#d5dbe2';
        x.fillRect(10, y0, 138, 33);
        let bx = 13;
        while (bx < 140) {
          const bw = 5 + rnd() * 7, bh = 22 + rnd() * 10;
          if (rnd() < 0.08 && bx > 20) { bx += 8; continue; } // 빈칸
          const col = books[(rnd() * books.length) | 0];
          const lean = rnd() < 0.07;
          x.save();
          if (lean) { x.translate(bx, y1); x.rotate(0.22); x.translate(-bx, -y1); }
          x.fillStyle = col;
          x.fillRect(bx, y1 - bh, bw, bh);
          x.fillStyle = 'rgba(255,255,255,0.35)';
          x.fillRect(bx + 1, y1 - bh + 3, bw - 2, 1.4);
          x.fillRect(bx + 1, y1 - 6, bw - 2, 1.2);
          x.fillStyle = 'rgba(0,0,0,0.15)';
          x.fillRect(bx + bw - 1, y1 - bh, 1, bh);
          x.restore();
          bx += bw + 0.6;
        }
        x.fillStyle = '#f8f9fa';
        x.fillRect(8, y1, 142, 4);
        x.fillStyle = '#c3cad3';
        x.fillRect(8, y1 + 4, 142, 1.5);
      }
    });
  };

  // 2남 휴게실 소파 (담요와 베개가 놓여 있다)
  P.sofaSprite = function () {
    return this.sprite('sofa', 214, 118, (x) => {
      const C = '#7d8fa9';
      soft(x, 12, 6, 'rgba(20,30,55,0.22)');
      rr(x, 14, 8, 186, 52, 18);
      x.fillStyle = vgrad(x, 8, 60, shade(C, 0.1), shade(C, -0.12));
      x.fill();
      hard(x);
      rr(x, 22, 46, 170, 44, 10);
      x.fillStyle = vgrad(x, 46, 90, shade(C, 0.22), shade(C, -0.05));
      x.fill();
      x.strokeStyle = shade(C, -0.3);
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(107, 50);
      x.lineTo(107, 86);
      x.stroke();
      for (const ax of [4, 182]) {
        rr(x, ax, 36, 28, 60, 12);
        x.fillStyle = vgrad(x, 36, 96, shade(C, 0.12), shade(C, -0.2));
        x.fill();
        x.strokeStyle = shade(C, -0.35);
        x.stroke();
      }
      x.fillStyle = '#343a40';
      for (const lx of [14, 194]) x.fillRect(lx, 96, 6, 8);
      x.save(); // 베개
      x.translate(46, 44);
      x.rotate(-0.25);
      rr(x, -16, -11, 32, 22, 9);
      x.fillStyle = '#fff3bf';
      x.fill();
      x.strokeStyle = '#e9c46a';
      x.stroke();
      x.restore();
      x.fillStyle = '#ffd8a8'; // 구겨진 담요
      x.beginPath();
      x.moveTo(110, 52);
      x.bezierCurveTo(130, 44, 160, 60, 186, 50);
      x.lineTo(190, 94);
      x.bezierCurveTo(170, 102, 140, 90, 116, 98);
      x.closePath();
      x.fill();
      x.strokeStyle = '#f08c00';
      x.lineWidth = 1;
      x.beginPath();
      x.moveTo(126, 60);
      x.bezierCurveTo(140, 66, 156, 62, 176, 70);
      x.moveTo(122, 78);
      x.bezierCurveTo(140, 84, 160, 76, 182, 84);
      x.stroke();
    });
  };

  // 낮은 탁자 (피자 박스 · 캔 · 과자)
  P.lowTableSprite = function () {
    return this.sprite('lowtable', 128, 78, (x) => {
      soft(x, 8, 4, 'rgba(20,30,55,0.2)');
      rr(x, 6, 18, 116, 40, 6);
      x.fillStyle = '#f1f3f5';
      x.fill();
      hard(x);
      rr(x, 6, 52, 116, 10, 4);
      x.fillStyle = '#ced4da';
      x.fill();
      x.fillStyle = '#868e96';
      x.fillRect(12, 60, 5, 10);
      x.fillRect(111, 60, 5, 10);
      rr(x, 18, 10, 52, 40, 3); // 피자 박스
      x.fillStyle = '#d9a066';
      x.fill();
      rr(x, 22, 14, 44, 32, 2);
      x.fillStyle = '#f8f0e3';
      x.fill();
      x.fillStyle = '#f59f00';
      x.beginPath();
      x.moveTo(44, 30);
      x.arc(44, 30, 14, 0.2, 2.6);
      x.closePath();
      x.fill();
      x.fillStyle = '#e03131';
      for (const [px, py] of [[48, 36], [40, 39], [52, 32]]) { circle(x, px, py, 2.2); x.fill(); }
      for (const [cx, col] of [[84, '#e03131'], [96, '#1c7ed6']]) {
        rr(x, cx, 18, 9, 15, 3);
        x.fillStyle = col;
        x.fill();
        x.fillStyle = '#dee2e6';
        x.fillRect(cx + 1, 18, 7, 2);
      }
      rr(x, 98, 34, 18, 14, 4);
      x.fillStyle = '#fab005';
      x.fill();
    });
  };

  // 자판기 (구론산도 판다)
  P.vendingSprite = function () {
    return this.sprite('vending', 86, 150, (x) => {
      soft(x, 10, 6, 'rgba(20,30,55,0.22)');
      rr(x, 6, 6, 74, 138, 6);
      x.fillStyle = vgrad(x, 6, 144, '#e7f5ff', '#bfd7ea');
      x.fill();
      hard(x);
      x.strokeStyle = '#74c0fc';
      x.lineWidth = 2;
      x.stroke();
      rr(x, 12, 14, 48, 84, 3);
      x.fillStyle = '#1f2a3d';
      x.fill();
      const cans = ['#e03131', '#1c7ed6', '#8d5524', '#fab005', '#2f9e44', '#f8f9fa'];
      for (let r = 0; r < 4; r++) {
        for (let k = 0; k < 4; k++) {
          rr(x, 15 + k * 11.5, 18 + r * 20, 8, 14, 2);
          x.fillStyle = cans[(r * 4 + k * 3) % cans.length];
          x.fill();
        }
        x.fillStyle = '#495057';
        x.fillRect(13, 33 + r * 20, 46, 2);
      }
      x.fillStyle = 'rgba(255,255,255,0.12)';
      x.beginPath();
      x.moveTo(12, 14);
      x.lineTo(34, 14);
      x.lineTo(16, 98);
      x.lineTo(12, 98);
      x.fill();
      for (let i = 0; i < 5; i++) {
        rr(x, 64, 18 + i * 12, 10, 7, 2);
        x.fillStyle = i === 2 ? '#ff6b6b' : '#ffffff';
        x.fill();
      }
      rr(x, 14, 108, 44, 18, 3);
      x.fillStyle = '#343a40';
      x.fill();
      x.fillStyle = '#212529';
      x.fillRect(8, 142, 8, 6);
      x.fillRect(70, 142, 8, 6);
    });
  };

  // 회의 테이블 + 의자 6개
  P.meetingSprite = function () {
    return this.sprite('meeting', 256, 176, (x) => {
      for (let i = 0; i < 3; i++) { // 뒷줄 의자 (등받이 윗부분만 보인다)
        rr(x, 50 + i * 60, 14, 36, 30, 10);
        x.fillStyle = '#868e96';
        x.fill();
        x.strokeStyle = '#495057';
        x.lineWidth = 1.2;
        x.stroke();
      }
      soft(x, 12, 6, 'rgba(20,30,55,0.2)');
      rr(x, 16, 34, 224, 84, 16);
      x.fillStyle = '#dfe4ea';
      x.fill();
      hard(x);
      rr(x, 16, 104, 224, 16, 8);
      x.fillStyle = vgrad(x, 104, 120, '#e9edf2', '#cfd6de');
      x.fill();
      rr(x, 16, 34, 224, 76, 16);
      x.fillStyle = vgrad(x, 34, 110, '#ffffff', '#f1f3f6');
      x.fill();
      x.strokeStyle = '#d0d6de';
      x.lineWidth = 1.4;
      x.stroke();
      // 노트북 · 서류 · 물병
      for (const [lx, ly] of [[44, 50], [150, 56]]) {
        rr(x, lx, ly, 34, 22, 3);
        x.fillStyle = '#ced4da';
        x.fill();
        screen(x, lx + 2, ly + 2, 30, 15, lx < 100 ? 'plot' : 'pdf', lx);
      }
      papers(x, 96, 62, 3);
      for (const bx of [128, 206]) {
        rr(x, bx, 46, 8, 20, 3);
        x.fillStyle = 'rgba(165,216,255,0.85)';
        x.fill();
        x.fillStyle = '#1c7ed6';
        x.fillRect(bx + 1, 46, 6, 4);
      }
      for (let i = 0; i < 3; i++) chair(x, 68 + i * 60, 118, '#868e96');
    });
  };

  // 탕비실 카운터 (커피 머신 · 전자레인지 · 정수기 · 종이컵)
  P.counterSprite = function () {
    return this.sprite('counter', 262, 130, (x) => {
      soft(x, 10, 6, 'rgba(20,30,55,0.2)');
      rr(x, 4, 56, 254, 64, 4);
      x.fillStyle = '#e9ecef';
      x.fill();
      hard(x);
      for (let i = 0; i < 4; i++) {
        rr(x, 9 + i * 62, 66, 58, 50, 3);
        x.fillStyle = vgrad(x, 66, 116, '#f8f9fa', '#e3e7ec');
        x.fill();
        x.strokeStyle = '#ced4da';
        x.lineWidth = 1;
        x.stroke();
        x.fillStyle = '#adb5bd';
        x.fillRect(31 + i * 62, 72, 14, 2.5);
      }
      rr(x, 2, 46, 258, 14, 3);
      x.fillStyle = vgrad(x, 46, 60, '#f1f3f5', '#ced4da');
      x.fill();
      // 커피 머신
      soft(x, 4, 2, 'rgba(20,30,55,0.25)');
      rr(x, 16, 6, 44, 46, 5);
      x.fillStyle = vgrad(x, 6, 52, '#495057', '#212529');
      x.fill();
      hard(x);
      x.fillStyle = '#adb5bd';
      rr(x, 22, 12, 32, 8, 2);
      x.fill();
      x.fillStyle = '#51cf66';
      circle(x, 50, 16, 1.6);
      x.fill();
      rr(x, 30, 28, 16, 18, 2);
      x.fillStyle = '#111';
      x.fill();
      x.fillStyle = '#fff';
      rr(x, 33, 36, 10, 10, 2);
      x.fill();
      // 전자레인지
      soft(x, 4, 2, 'rgba(20,30,55,0.25)');
      rr(x, 74, 18, 66, 34, 4);
      x.fillStyle = '#f8f9fa';
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.stroke();
      rr(x, 79, 23, 42, 24, 3);
      x.fillStyle = '#343a40';
      x.fill();
      x.fillStyle = '#51cf66';
      x.font = `800 6px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('0:30', 131, 27);
      x.fillStyle = '#adb5bd';
      for (let i = 0; i < 3; i++) x.fillRect(126, 32 + i * 5, 10, 2.5);
      // 정수기
      soft(x, 4, 2, 'rgba(20,30,55,0.25)');
      rr(x, 156, 0, 36, 52, 5);
      x.fillStyle = vgrad(x, 0, 52, '#ffffff', '#e9ecef');
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.stroke();
      rr(x, 162, 22, 24, 18, 3);
      x.fillStyle = '#dee2e6';
      x.fill();
      x.fillStyle = '#1c7ed6';
      circle(x, 168, 10, 3);
      x.fill();
      x.fillStyle = '#e03131';
      circle(x, 180, 10, 3);
      x.fill();
      // 종이컵 · 커피 스틱
      for (let i = 0; i < 4; i++) {
        x.fillStyle = i % 2 ? '#f8f9fa' : '#e9ecef';
        x.beginPath();
        x.moveTo(206, 44 - i * 5);
        x.lineTo(218, 44 - i * 5);
        x.lineTo(217, 49 - i * 5);
        x.lineTo(207, 49 - i * 5);
        x.fill();
      }
      x.fillStyle = '#e8590c';
      for (let i = 0; i < 5; i++) x.fillRect(228 + i * 4, 36, 2.5, 12);
    });
  };

  // 복사기 ("급할 때만 용지가 걸린다")
  P.printerSprite = function () {
    return this.sprite('printer', 108, 108, (x) => {
      soft(x, 10, 6, 'rgba(20,30,55,0.22)');
      rr(x, 8, 34, 92, 66, 6);
      x.fillStyle = vgrad(x, 34, 100, '#f1f3f5', '#ced4da');
      x.fill();
      hard(x);
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 1.2;
      x.stroke();
      for (let i = 0; i < 2; i++) {
        rr(x, 14, 62 + i * 17, 80, 13, 3);
        x.fillStyle = '#e9ecef';
        x.fill();
        x.stroke();
        x.fillStyle = '#868e96';
        x.fillRect(46, 67 + i * 17, 16, 2.5);
      }
      rr(x, 12, 22, 84, 16, 4);
      x.fillStyle = vgrad(x, 22, 38, '#ffffff', '#dee2e6');
      x.fill();
      x.stroke();
      x.fillStyle = '#fff'; // 걸린 종이
      x.save();
      x.translate(30, 28);
      x.rotate(-0.25);
      x.fillRect(-8, -16, 22, 18);
      x.strokeStyle = '#ced4da';
      x.strokeRect(-8, -16, 22, 18);
      x.restore();
      rr(x, 60, 40, 32, 16, 3);
      x.fillStyle = '#343a40';
      x.fill();
      rr(x, 63, 43, 20, 10, 2);
      x.fillStyle = '#c92a2a';
      x.fill();
      x.fillStyle = '#fff';
      x.font = `800 5px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText('용지걸림', 73, 48.5);
      x.fillStyle = '#212529';
      x.fillRect(14, 98, 8, 6);
      x.fillRect(86, 98, 8, 6);
    });
  };

  // 기둥 + 게시물 (wet: 실험실 안전 게시물)
  P.pillarSprite = function (v, wet) {
    const POST = wet ? [['MSDS 비치', '시약 확인'], ['연구실 안전교육', '필수!'], ['보호구 착용', '가운·장갑']] : [['세미나 공지', '목 4시'], ['연구실 안전교육', '필수!'], ['논문 마감', 'D-3']];
    return this.sprite('pillar' + (wet ? 'w' : '') + v, 88, 156, (x) => {
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 10, 18, 66, 132, 2);
      x.fillStyle = vgrad(x, 18, 150, '#eef1f4', '#d5dbe2');
      x.fill();
      hard(x);
      x.beginPath();
      x.moveTo(10, 18);
      x.lineTo(18, 8);
      x.lineTo(84, 8);
      x.lineTo(76, 18);
      x.closePath();
      x.fillStyle = '#f8f9fa';
      x.fill();
      x.fillStyle = 'rgba(0,0,0,0.05)';
      x.fillRect(62, 18, 14, 132);
      const p = POST[v % POST.length];
      x.save();
      x.translate(42, 66);
      x.rotate(-0.04);
      soft(x, 3, 2, 'rgba(20,30,55,0.2)');
      x.fillStyle = '#fff';
      x.fillRect(-22, -26, 44, 54);
      hard(x);
      x.fillStyle = wet ? ['#2f9e44', '#1c7ed6', '#f08c00'][v % 3] : v === 2 ? '#e03131' : '#1c7ed6';
      x.fillRect(-22, -26, 44, 10);
      x.fillStyle = '#fff';
      x.font = `800 6px ${FONT}`;
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(p[0], 0, -21, 42);
      x.fillStyle = '#343a40';
      x.font = `900 9px ${FONT}`;
      x.fillText(p[1], 0, -6, 40);
      x.fillStyle = '#ced4da';
      for (let i = 0; i < 4; i++) x.fillRect(-16, 4 + i * 5, i === 3 ? 18 : 32, 1.6);
      x.fillStyle = 'rgba(255,236,153,0.85)';
      x.fillRect(-8, -30, 16, 6);
      x.restore();
    });
  };

  // 화분: 0 둥근 잎, 1 산세베리아, 2 몬스테라
  P.plantSprite = function (v) {
    return this.sprite('plant' + v, 66, 92, (x) => {
      const leaf = (cx, cy, rx, ry, rot, col) => { ell(x, cx, cy, rx, ry, rot); x.fillStyle = col; x.fill(); };
      soft(x, 8, 5, 'rgba(20,30,55,0.22)');
      x.beginPath(); // 화분
      x.moveTo(16, 58);
      x.lineTo(50, 58);
      x.lineTo(46, 86);
      x.lineTo(20, 86);
      x.closePath();
      x.fillStyle = vgrad(x, 58, 86, '#ffffff', '#dfe4ea');
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.lineWidth = 1.2;
      x.stroke();
      ell(x, 33, 58, 17, 4.5);
      x.fillStyle = '#6f4e37';
      x.fill();
      if (v === 1) {
        for (let i = 0; i < 6; i++) {
          const bx = 22 + i * 4.5, h = 34 + ((i * 7) % 16);
          x.fillStyle = i % 2 ? '#2b8a3e' : '#37b24d';
          x.beginPath();
          x.moveTo(bx - 3, 58);
          x.quadraticCurveTo(bx - 4 + (i - 2.5), 58 - h * 0.6, bx + (i - 2.5) * 1.6, 58 - h);
          x.quadraticCurveTo(bx + 4 + (i - 2.5), 58 - h * 0.6, bx + 3, 58);
          x.fill();
          x.fillStyle = 'rgba(255,255,170,0.45)';
          x.fillRect(bx - 0.4, 58 - h * 0.7, 0.8, h * 0.6);
        }
      } else if (v === 2) {
        const L = [[18, 38, -0.7], [46, 36, 0.7], [32, 24, 0], [24, 50, -1.2], [44, 50, 1.2]];
        for (const [lx, ly, rot] of L) {
          leaf(lx, ly, 14, 9, rot, '#2f9e44');
          x.strokeStyle = '#1b6e2c';
          x.lineWidth = 1;
          x.beginPath();
          x.moveTo(lx - Math.cos(rot) * 12, ly - Math.sin(rot) * 12);
          x.lineTo(lx + Math.cos(rot) * 12, ly + Math.sin(rot) * 12);
          x.stroke();
          x.fillStyle = 'rgba(255,255,255,0.18)';
          ell(x, lx - 3, ly - 3, 5, 2.5, rot);
          x.fill();
        }
      } else {
        const L = [[20, 44], [46, 44], [33, 30], [25, 34], [41, 34], [33, 46], [16, 52], [50, 52]];
        L.forEach(([lx, ly], i) => leaf(lx, ly, 11, 9, i, i % 3 ? '#40c057' : '#2f9e44'));
        x.fillStyle = 'rgba(255,255,255,0.22)';
        for (const [lx, ly] of [[29, 27], [43, 31], [17, 41]]) { ell(x, lx, ly, 4, 2.5, -0.6); x.fill(); }
      }
    });
  };

  P.binSprite = function () {
    return this.sprite('bin', 38, 46, (x) => {
      soft(x, 5, 3, 'rgba(20,30,55,0.22)');
      x.beginPath();
      x.moveTo(5, 12);
      x.lineTo(33, 12);
      x.lineTo(30, 42);
      x.lineTo(8, 42);
      x.closePath();
      x.fillStyle = vgrad(x, 12, 42, '#adb5bd', '#868e96');
      x.fill();
      hard(x);
      ell(x, 19, 12, 14, 4.5);
      x.fillStyle = '#495057';
      x.fill();
      x.fillStyle = '#fff';
      for (const [px, py] of [[14, 9], [22, 7], [18, 4]]) {
        circle(x, px, py, 4.5);
        x.fill();
        x.strokeStyle = '#ced4da';
        x.lineWidth = 0.8;
        x.stroke();
      }
    });
  };

  P.boxSprite = function () {
    return this.sprite('cbox', 52, 46, (x) => {
      soft(x, 6, 4, 'rgba(20,30,55,0.22)');
      x.fillStyle = '#c99a63';
      x.fillRect(6, 18, 40, 24);
      hard(x);
      x.beginPath();
      x.moveTo(6, 18);
      x.lineTo(12, 8);
      x.lineTo(50, 8);
      x.lineTo(46, 18);
      x.closePath();
      x.fillStyle = '#ddb27f';
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.6)';
      x.fillRect(24, 8, 6, 34);
      x.fillStyle = '#495057';
      x.font = `800 5px ${FONT}`;
      x.textAlign = 'center';
      x.fillText('취급주의', 18, 33);
    });
  };

  // 카펫 (책상 구역 바닥)
  P.carpetSprite = function () {
    return this.sprite('carpet', 120, 120, (x) => {
      x.fillStyle = '#e4e9f0';
      x.fillRect(0, 0, 120, 120);
      const rnd = GS.util.mulberry32(5);
      for (let i = 0; i < 260; i++) {
        x.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.5)' : 'rgba(120,135,160,0.12)';
        x.fillRect(rnd() * 120, rnd() * 120, 1.2, 1.2);
      }
      x.strokeStyle = 'rgba(120,135,160,0.12)';
      x.lineWidth = 1;
      x.strokeRect(0.5, 0.5, 59, 59);
      x.strokeRect(60.5, 60.5, 59, 59);
      x.strokeRect(60.5, 0.5, 59, 59);
      x.strokeRect(0.5, 60.5, 59, 59);
    });
  };

  // 바닥 소품: 0 종이, 1 구긴 종이, 2 컵라면, 3 커피컵, 4 포스트잇, 5 커피 얼룩, 6 전선, 7 구론산 병
  P.decalSprite = function (k) {
    const S = [[24, 30], [16, 15], [22, 24], [14, 18], [16, 16], [28, 20], [76, 26], [12, 20]][k];
    return this.sprite('decal' + k, S[0], S[1], (x, w, h) => {
      if (k === 0) {
        soft(x, 2, 1, 'rgba(20,30,55,0.15)');
        x.fillStyle = '#fff';
        x.fillRect(2, 2, w - 4, h - 4);
        hard(x);
        x.fillStyle = '#dee2e6';
        for (let i = 0; i < 5; i++) x.fillRect(5, 6 + i * 4, i === 4 ? 8 : w - 10, 1.2);
        x.fillStyle = '#e03131';
        x.fillRect(w - 9, h - 9, 4, 4);
      } else if (k === 1) {
        soft(x, 2, 1, 'rgba(20,30,55,0.2)');
        x.fillStyle = '#f8f9fa';
        x.beginPath();
        const n = 9;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * TAU, d = i % 2 ? 5 : 7;
          x.lineTo(8 + Math.cos(a) * d, 7.5 + Math.sin(a) * d);
        }
        x.closePath();
        x.fill();
        hard(x);
        x.strokeStyle = '#ced4da';
        x.lineWidth = 0.8;
        x.stroke();
        x.beginPath();
        x.moveTo(5, 6);
        x.lineTo(9, 9);
        x.lineTo(11, 5);
        x.stroke();
      } else if (k === 2) ramen(x, 11, 14);
      else if (k === 3) {
        soft(x, 2, 1, 'rgba(20,30,55,0.2)');
        x.fillStyle = '#fff';
        x.beginPath();
        x.moveTo(2, 4);
        x.lineTo(12, 4);
        x.lineTo(10.5, 16);
        x.lineTo(3.5, 16);
        x.closePath();
        x.fill();
        hard(x);
        x.fillStyle = '#a0522d';
        x.fillRect(2.6, 8, 8.8, 4);
        ell(x, 7, 4, 5, 1.8);
        x.fillStyle = '#495057';
        x.fill();
      } else if (k === 4) sticky(x, 1, 1, '#ffe066', '');
      else if (k === 5) {
        x.strokeStyle = 'rgba(140,90,50,0.22)';
        x.lineWidth = 2.5;
        ell(x, 14, 10, 11, 7);
        x.stroke();
        x.fillStyle = 'rgba(140,90,50,0.1)';
        x.fill();
      } else if (k === 6) {
        x.strokeStyle = '#495057';
        x.lineWidth = 2.2;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(3, 18);
        x.bezierCurveTo(20, 2, 34, 24, 50, 12);
        x.bezierCurveTo(58, 6, 64, 10, 66, 13);
        x.stroke();
        x.fillStyle = '#f8f9fa';
        rr(x, 64, 8, 10, 10, 2);
        x.fill();
        x.strokeStyle = '#adb5bd';
        x.lineWidth = 1;
        x.stroke();
      } else {
        soft(x, 2, 1, 'rgba(20,30,55,0.2)');
        rr(x, 2, 4, 8, 15, 3);
        x.fillStyle = '#8d5524';
        x.fill();
        hard(x);
        x.fillStyle = '#ffd43b';
        x.fillRect(2, 9, 8, 4);
        x.fillStyle = '#c92a2a';
        x.fillRect(3.5, 1, 5, 4);
      }
    });
  };

  // ───────── 가구 배치 (칸마다 해시로 고른 묶음) ─────────
  function put(ctx, spr, X, Y) { ctx.drawImage(spr, X, Y, spr.dw, spr.dh); }

  P.drawCarpet = function (ctx, X, Y, W, H) {
    const c = this.carpetSprite();
    ctx.save();
    ctx.beginPath();
    R.roundRect(ctx, X, Y, W, H, 10);
    ctx.clip();
    for (let x = X; x < X + W; x += 120) for (let y = Y; y < Y + H; y += 120) ctx.drawImage(c, x, y, 120, 120);
    ctx.restore();
    ctx.strokeStyle = 'rgba(120,135,160,0.25)';
    ctx.lineWidth = 2;
    R.roundRect(ctx, X, Y, W, H, 10);
    ctx.stroke();
  };

  P.deskRow = function (ctx, X, Y, h, n, wet) {
    for (let i = 0; i < n; i++) {
      const v = wet ? 6 + ((h >>> (i * 3)) % 3) : (h >>> (i * 3)) % 6;
      put(ctx, this.deskSprite(v), X + i * 186, Y);
      const cur = DESK_CURSOR[v];
      if (cur && ((this.t * 1.6 + i * 0.37) % 1) < 0.55) {
        ctx.fillStyle = v === 2 ? '#51cf66' : '#e9ecef';
        ctx.fillRect(X + i * 186 + cur[0], Y + cur[1], 3, 1.6);
      }
    }
  };

  P.serverLeds = function (ctx, X, Y, seed) {
    for (let i = 0; i < 7; i++) {
      const on = Math.sin(this.t * (5 + (i % 3)) + i * 1.9 + seed) > -0.2;
      ctx.fillStyle = on ? (i % 3 === 2 ? '#4dabf7' : '#51cf66') : '#2b3a2e';
      ctx.fillRect(X + 60, Y + 25 + i * 17, 3, 3);
      ctx.fillStyle = Math.sin(this.t * 11 + i * 3.1 + seed * 2) > 0.6 ? '#fcc419' : '#3a3f47';
      ctx.fillRect(X + 66, Y + 25 + i * 17, 3, 3);
    }
  };

  // 묶음 종류: [가중치, 그리기]. 묶음 크기는 최대 약 560×420
  const CLUSTERS = [
    [26, function (ctx, X, Y, h) { // 책상 줄
      const n = 2 + (h % 2);
      this.drawCarpet(ctx, X - 16, Y + 18, n * 186 + 32, 140);
      this.deskRow(ctx, X, Y, h, n);
      if (h & 4) put(ctx, this.plantSprite((h >>> 5) % 3), X + n * 186 + 4, Y + 40);
    }],
    [12, function (ctx, X, Y, h) { // 책상 두 줄 (마주 보는 자리)
      this.drawCarpet(ctx, X - 16, Y + 18, 404, 330);
      this.deskRow(ctx, X, Y, h, 2);
      this.deskRow(ctx, X, Y + 190, h >>> 7, 2);
      put(ctx, this.binSprite(), X + 382, Y + 120);
    }],
    [11, function (ctx, X, Y, h) { // 회의 공간
      put(ctx, this.boardSprite(h % 4), X + 20, Y);
      put(ctx, this.meetingSprite(), X, Y + 168);
      put(ctx, this.plantSprite(2), X + 262, Y + 40);
    }],
    [9, function (ctx, X, Y, h) { // 계산 서버실
      for (let i = 0; i < 3; i++) {
        put(ctx, this.serverSprite(), X + i * 88, Y);
        this.serverLeds(ctx, X + i * 88, Y, i * 2 + (h % 7));
      }
      put(ctx, this.printerSprite(), X + 300, Y + 50);
      put(ctx, this.decalSprite(6), X + 30, Y + 170);
    }],
    [9, function (ctx, X, Y, h) { // 휴게 공간 (소파 · 탁자 · 자판기)
      put(ctx, this.sofaSprite(), X, Y);
      put(ctx, this.lowTableSprite(), X + 44, Y + 130);
      put(ctx, this.vendingSprite(), X + 250, Y - 20);
      put(ctx, this.plantSprite(h % 3), X + 340, Y + 50);
    }],
    [8, function (ctx, X, Y, h) { // 책장
      put(ctx, this.shelfSprite(h % 5), X, Y);
      put(ctx, this.shelfSprite((h >>> 4) % 5), X + 160, Y);
      if (h & 8) put(ctx, this.shelfSprite((h >>> 8) % 5), X + 320, Y);
      put(ctx, this.boxSprite(), X + 40, Y + 150);
      put(ctx, this.plantSprite(1), X + 488, Y + 40);
    }],
    [7, function (ctx, X, Y) { // 탕비실
      put(ctx, this.counterSprite(), X, Y);
      put(ctx, this.binSprite(), X + 272, Y + 70);
      put(ctx, this.printerSprite(), X + 330, Y + 14);
    }],
    [6, function (ctx, X, Y, h) { // 기둥
      put(ctx, this.pillarSprite(h % 3), X + 60, Y);
      put(ctx, this.boxSprite(), X + 160, Y + 100);
      if (h & 2) put(ctx, this.boxSprite(), X + 176, Y + 80);
    }],
    [12, null], // 빈 칸 (바닥 소품만)
  ];
  // 가중치에 따라 묶음 하나를 고른다 (null = 빈 칸)
  function picker(list) {
    let total = 0;
    list.forEach((c) => { total += c[0]; });
    return (h) => {
      let r = h % total;
      for (let i = 0; i < list.length; i++) {
        r -= list[i][0];
        if (r < 0) return list[i][1];
      }
      return null;
    };
  }

  // ───────── 맵 테마 (캐릭터 id 와 같은 이름). wet 은 wetlab.js 가 채운다 ─────────
  // floor: 바닥 색, decal(k): 바닥 소품 그림, decals: 나올 수 있는 소품 번호(여러 번 넣으면 자주 나옴), flat: 돌리지 않고 놓는 소품, pick(h): 가구 묶음
  const THEMES = {
    dry: { floor: DRY_FLOOR, decal: 'decalSprite', decals: [0, 1, 2, 3, 4, 5, 6, 7], flat: [5, 6], pick: picker(CLUSTERS) },
  };

  // 배경 전체: 바닥 → 조명 → 바닥 소품 → 가구. theme: 'dry'(시뮬레이션 연구실) / 'wet'(실험 연구실)
  P.drawBackground = function (ctx, camX, camY, theme) {
    const TH = THEMES[theme] || THEMES.dry;
    const cw = this.canvas.width, ch = this.canvas.height, z = this.wz;
    const left = camX - cw / 2 / z, top = camY - ch / 2 / z, right = left + cw / z, bottom = top + ch / z;
    ctx.setTransform(z, 0, 0, z, cw / 2 - camX * z, ch / 2 - camY * z);
    ctx.fillStyle = this.floorPattern(ctx, TH.floor);
    ctx.fillRect(left, top, right - left, bottom - top);
    // 천장 조명
    const lp = this.lightPool();
    for (let gx = Math.floor((left - 340) / LIGHT); gx * LIGHT <= right + 340; gx++) {
      for (let gy = Math.floor((top - 220) / LIGHT); gy * LIGHT <= bottom + 220; gy++) {
        if (R.hash(gx * 7 + 3, gy * 5 + 1) % 4 === 0) continue;
        ctx.drawImage(lp, gx * LIGHT - 300, gy * LIGHT - 190, 600, 380);
      }
    }
    // 바닥 소품
    for (let gx = Math.floor(left / DECAL) - 1; gx <= Math.floor(right / DECAL); gx++) {
      for (let gy = Math.floor(top / DECAL) - 1; gy <= Math.floor(bottom / DECAL); gy++) {
        const h = R.hash(gx + 9173, gy - 4021);
        if (h % 100 >= 34) continue;
        const k = TH.decals[(h >>> 8) % TH.decals.length], spr = this[TH.decal](k);
        const x = gx * DECAL + 30 + ((h >>> 12) % 190), y = gy * DECAL + 30 + ((h >>> 20) % 190);
        if (TH.flat.indexOf(k) >= 0) put(ctx, spr, x, y);
        else {
          this.drawRot(ctx, spr, x, y, ((h >>> 3) % 628) / 100, spr.dw, spr.dh);
          ctx.setTransform(z, 0, 0, z, cw / 2 - camX * z, ch / 2 - camY * z);
        }
      }
    }
    // 가구 묶음
    for (let cx = Math.floor((left - 600) / CELL); cx <= Math.floor(right / CELL); cx++) {
      for (let cy = Math.floor((top - 460) / CELL); cy <= Math.floor(bottom / CELL); cy++) {
        const h = R.hash(cx, cy), fn = TH.pick(h);
        if (!fn) continue;
        const X = cx * CELL + 40 + ((h >>> 9) % 120), Y = cy * CELL + 40 + ((h >>> 17) % 150);
        if (X > right || Y > bottom || X + 600 < left || Y + 460 < top) continue;
        fn.call(this, ctx, X, Y, h >>> 3);
      }
    }
  };

  // wetlab.js (실험 연구실 맵) 에서 함께 쓰는 그리기 도구
  GS.Scene = { THEMES, picker, put, chair, mug, papers, sticky, notebook, beakerCoffee, screen, monitor };

  // ───────── 타이틀 화면 배경: 적에게 쫓기며 펜을 던지는 대학원생 ─────────
  const PARADE = ['lecture', 'errand', 'progress', 'la', 'ta', 'oa', 'plot', 'bug', 'nan', 'lang', 'revision', 'deadline', 'reviewer2', 'proposal', 'win_update', 'grading', 'lab_meeting', 'project_meeting'];

  P.makeIdleScene = function () {
    const E = GS.data.enemies, chasers = [];
    for (let i = 0; i < 16; i++) {
      const type = PARADE[i % PARADE.length], def = E[type];
      chasers.push({ type, def, r: def.radius, elite: i === 7, stage: 0, home: 150 + i * 46 + (i % 3) * 14, off: 150 + i * 46, y: ((i * 37) % 90) - 45, anim: i * 1.7, x: 0, flash: 0 });
      if (i === 7) chasers[i].r *= 1.45;
    }
    return { x: 0, y: 0, chasers, pens: [], penT: 1.2, ph: 0 };
  };

  P.drawIdle = function (dt) {
    this.t += dt;
    this.wt += dt;
    const sc = this.idleScene || (this.idleScene = this.makeIdleScene());
    const ctx = this.ctx, cw = this.canvas.width, ch = this.canvas.height;
    sc.x += dt * 120;
    const camX = sc.x, camY = Math.sin(this.t * 0.15) * 40;
    this.wz = this.zoom * this.dpr;
    this.wox = cw / 2 - camX * this.wz;
    this.woy = ch / 2 - camY * this.wz;
    this.updateAmbient([255, 255, 255, 0, 0.12], dt);
    this.drawBackground(ctx, camX, camY);
    this.worldTf(ctx);
    // 주인공은 화면 아래쪽에서 오른쪽으로 달린다
    const px = camX + this.viewW * 0.2, py = camY + this.viewH * 0.4;
    this.updateParts(dt);
    sc.ph += dt * 11;
    const sh = this.shadowSprite();
    // 쫓아오는 적
    for (const c of sc.chasers) {
      c.off += (c.home - c.off) * Math.min(1, dt * 0.8);
      c.x = px - c.off;
      c.cy = py + c.y + Math.sin(this.t * 1.3 + c.anim) * 6;
      if (c.flash > 0) c.flash -= dt;
    }
    sc.chasers.sort((a, b) => a.cy - b.cy);
    for (const c of sc.chasers) {
      const ph = this.t * 9 + c.anim, frame = ((ph / (Math.PI / 2)) | 0) % 4;
      ctx.drawImage(sh, c.x - c.r * 1.05, c.cy + c.r * 0.78, c.r * 2.1, c.r * 0.75);
      const spr = this.enemySprite(c, frame), bob = -Math.abs(Math.sin(ph)) * c.r * 0.1;
      ctx.drawImage(spr, c.x - spr.cx, c.cy - spr.cy + bob, spr.dw, spr.dh);
      if (c.flash > 0) {
        ctx.globalAlpha = c.flash / 0.12;
        ctx.drawImage(this.tinted(spr, '#ffffff'), c.x - spr.cx, c.cy - spr.cy + bob, spr.dw, spr.dh);
        ctx.globalAlpha = 1;
      }
      const L = this.enemyLabel(c);
      ctx.drawImage(L, c.x - L.dw / 2, c.cy + c.r * 1.25, L.dw, L.dh);
    }
    // 뒤로 던지는 펜
    sc.penT -= dt;
    if (sc.penT <= 0) {
      sc.penT = 0.55 + Math.random() * 0.5;
      const target = sc.chasers[(Math.random() * 8) | 0];
      sc.pens.push({ x: px - 10, y: py - 8, target });
    }
    for (let i = sc.pens.length - 1; i >= 0; i--) {
      const p = sc.pens[i], t = p.target, dx = t.x - p.x, dy = t.cy - p.y, d = Math.hypot(dx, dy) || 1;
      const step = 900 * dt;
      if (d < step + t.r) {
        t.flash = 0.12;
        t.off = t.home + 260 + Math.random() * 200;
        this.burst(t.x, t.cy, 7, [R.shade(t.def.sprite.bg, -0.12), R.shade(t.def.sprite.bg, -0.4)], 220, 0.5, 4, 420);
        this.part(R.PK.RING, t.x, t.cy, 0, 0, 0.3, t.r * 1.7, R.shade(t.def.sprite.bg, -0.15));
        sc.pens.splice(i, 1);
        continue;
      }
      p.x += (dx / d) * step;
      p.y += (dy / d) * step;
      const a = Math.atan2(dy, dx);
      this.drawRot(ctx, this.streak('#364fc7'), p.x - Math.cos(a) * 16, p.y - Math.sin(a) * 16, a, 34, 5);
      this.drawRot(ctx, this.penSprite(false), p.x, p.y, a, 30, 11);
      this.worldTf(ctx);
    }
    this.drawParts(ctx);
    // 주인공 둘 (Wet lab이 살짝 뒤에서 함께 달린다)
    const f = ((sc.ph / (Math.PI / 2)) | 0) % 4, f2 = (f + 1) % 4;
    ctx.drawImage(sh, px - 66, py - 8, 40, 13);
    ctx.drawImage(this.playerSprite(0, f2, 'wet'), px - 72, py - 57, 52, 60);
    ctx.drawImage(sh, px - 20, py + 12, 40, 13);
    ctx.drawImage(this.playerSprite(0, f, 'dry'), px - 26, py - 37, 52, 60);
    // 땀방울
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#74c0fc';
    const sy = py - 30 + ((this.t * 40) % 14);
    ctx.beginPath();
    ctx.moveTo(px - 16, sy - 5);
    ctx.quadraticCurveTo(px - 12, sy, px - 16, sy + 2);
    ctx.quadraticCurveTo(px - 20, sy, px - 16, sy - 5);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawAmbient(ctx);
    this.drawToasts(ctx, dt);
  };
})(window.GS = window.GS || {});
