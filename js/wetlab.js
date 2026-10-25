// 실험 연구실 맵 (Wet lab 캐릭터): 실험대 · 흄후드·클린벤치 · 냉동고·냉장고·배양기 · 개수대·오토클레이브 · 시약장·가스통 · 동물실
// scene.js 의 맵 테마(THEMES.wet)를 채운다. Dry lab 은 scene.js 의 시뮬레이션 연구실. 가구는 장식일 뿐 게임에 영향이 없다
(function (GS) {
  'use strict';
  const R = GS.R, P = GS.Renderer.prototype, S = GS.Scene;
  const rr = R.roundRect, circle = R.circle, ell = R.ell, soft = R.soft, hard = R.hard, vgrad = R.vgrad;
  const FONT = R.FONT;
  const put = S.put;
  const GLOVE = '#845ef7';

  // ───────── 바닥: 에폭시를 바른 연한 민트빛 실험실 바닥 (큰 타일 + 은은한 얼룩) ─────────
  const WET_FLOOR = {
    key: 'wet', T: 128, N: 3, seed: 20261014, specks: 46,
    tones: ['#edf3f2', '#eaf1f0', '#eff5f4', '#e8efee', '#ecf2f1'],
    speck: ['#c3d2cf', '#d0dcda', '#b7c8c4', '#dce6e4', '#cfe0ea'],
    line: '#d3dfdc', lineDark: 'rgba(110,140,135,0.2)',
    extra(x, X, Y, T, rnd) {
      x.save();
      x.beginPath();
      x.rect(X, Y, T, T);
      x.clip();
      for (let k = 0; k < 3; k++) {
        const cx = X + rnd() * T, cy = Y + rnd() * T, r = 14 + rnd() * 26;
        const g = x.createRadialGradient(cx, cy, 0, cx, cy, r);
        g.addColorStop(0, 'rgba(255,255,255,0.4)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        x.fillStyle = g;
        x.fillRect(cx - r, cy - r, r * 2, r * 2);
      }
      x.restore();
    },
  };

  // ───────── 작은 실험 기구 ─────────
  // 시약병: by 바닥. body 병 색, cap 뚜껑, liq 투명 병 속 액체 (없으면 불투명 병)
  function bottle(x, cx, by, w, h, body, cap, liq) {
    const bh = h * 0.74, top = by - h, r = Math.min(3, w * 0.3);
    rr(x, cx - w / 2, by - bh, w, bh, r);
    x.fillStyle = body;
    x.fill();
    if (liq) {
      x.save();
      x.clip();
      x.fillStyle = liq;
      x.fillRect(cx - w / 2, by - bh * 0.6, w, bh);
      x.restore();
    }
    x.strokeStyle = 'rgba(30,40,60,0.35)';
    x.lineWidth = 0.7;
    rr(x, cx - w / 2, by - bh, w, bh, r);
    x.stroke();
    x.fillStyle = liq ? 'rgba(231,245,255,0.95)' : body; // 목
    x.fillRect(cx - w * 0.2, top + h * 0.12, w * 0.4, h * 0.16);
    rr(x, cx - w * 0.28, top, w * 0.56, h * 0.15, 1); // 뚜껑
    x.fillStyle = cap;
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.92)'; // 라벨
    x.fillRect(cx - w * 0.36, by - bh * 0.62, w * 0.72, bh * 0.34);
    x.fillStyle = 'rgba(0,0,0,0.28)';
    x.fillRect(cx - w * 0.26, by - bh * 0.52, w * 0.5, 0.8);
    x.fillStyle = 'rgba(255,255,255,0.4)'; // 반사광
    x.fillRect(cx - w * 0.4, by - bh * 0.92, w * 0.12, bh * 0.3);
  }

  // 삼각 플라스크: by 바닥, s 크기
  function erlen(x, cx, by, s, liq) {
    const nw = s * 0.32, top = by - s * 1.25;
    x.beginPath();
    x.moveTo(cx - nw / 2, top);
    x.lineTo(cx - nw / 2, top + s * 0.4);
    x.lineTo(cx - s * 0.62, by - s * 0.1);
    x.quadraticCurveTo(cx - s * 0.64, by, cx - s * 0.5, by);
    x.lineTo(cx + s * 0.5, by);
    x.quadraticCurveTo(cx + s * 0.64, by, cx + s * 0.62, by - s * 0.1);
    x.lineTo(cx + nw / 2, top + s * 0.4);
    x.lineTo(cx + nw / 2, top);
    x.closePath();
    x.fillStyle = 'rgba(231,245,255,0.8)';
    x.fill();
    if (liq) {
      x.save();
      x.clip();
      x.fillStyle = liq;
      x.fillRect(cx - s, by - s * 0.45, s * 2, s);
      x.restore();
    }
    x.strokeStyle = 'rgba(70,100,130,0.75)';
    x.lineWidth = 0.9;
    x.stroke();
    x.fillStyle = 'rgba(255,255,255,0.6)';
    x.fillRect(cx - s * 0.36, by - s * 0.4, s * 0.08, s * 0.28);
  }

  // 비커 (눈금 + 주둥이)
  function beaker(x, cx, by, w, h, liq, lvl) {
    rr(x, cx - w / 2, by - h, w, h, 2);
    x.fillStyle = 'rgba(231,245,255,0.8)';
    x.fill();
    if (liq) {
      x.save();
      x.clip();
      x.fillStyle = liq;
      x.fillRect(cx - w / 2, by - h * (lvl || 0.5), w, h);
      x.restore();
    }
    x.strokeStyle = 'rgba(70,100,130,0.75)';
    x.lineWidth = 0.9;
    rr(x, cx - w / 2, by - h, w, h, 2);
    x.stroke();
    x.beginPath();
    x.moveTo(cx - w / 2, by - h);
    x.lineTo(cx - w / 2 - 2, by - h - 1.5);
    for (let i = 0; i < 3; i++) {
      x.moveTo(cx + w * 0.1, by - h * (0.3 + i * 0.2));
      x.lineTo(cx + w * 0.38, by - h * (0.3 + i * 0.2));
    }
    x.stroke();
  }

  // 마이크로튜브 꽂이
  function tubeRack(x, X, Y, n, seed) {
    const cols = ['#ff8787', '#74c0fc', '#ffd43b', '#b2f2bb', '#e599f7', '#ffffff'];
    soft(x, 2, 1.5, 'rgba(0,0,0,0.3)');
    rr(x, X, Y + 6, n * 6 + 4, 10, 2);
    x.fillStyle = '#1c7ed6';
    x.fill();
    hard(x);
    for (let i = 0; i < n; i++) {
      if ((i * 7 + seed) % 5 === 0) continue; // 빈 칸
      rr(x, X + 3 + i * 6, Y, 4, 10, 1.6);
      x.fillStyle = cols[(i + seed) % cols.length];
      x.fill();
      x.strokeStyle = 'rgba(0,0,0,0.3)';
      x.lineWidth = 0.5;
      x.stroke();
    }
    rr(x, X, Y + 9, n * 6 + 4, 7, 2);
    x.fillStyle = '#339af0';
    x.fill();
  }

  // 50 mL 코니컬 튜브 꽂이
  function falconRack(x, X, Y) {
    soft(x, 2, 1.5, 'rgba(0,0,0,0.3)');
    rr(x, X, Y + 12, 46, 12, 2);
    x.fillStyle = '#f8f9fa';
    x.fill();
    hard(x);
    for (let i = 0; i < 5; i++) {
      const tx = X + 4 + i * 8.5;
      rr(x, tx, Y + 2, 6, 18, 2.5);
      x.fillStyle = 'rgba(231,245,255,0.95)';
      x.fill();
      x.fillStyle = ['rgba(250,82,82,0.55)', 'rgba(255,212,59,0.6)', 'rgba(77,171,247,0.5)'][i % 3];
      x.fillRect(tx + 0.5, Y + 10 + (i % 2) * 3, 5, 8 - (i % 2) * 3);
      rr(x, tx - 0.5, Y, 7, 4, 1);
      x.fillStyle = i % 2 ? '#1c7ed6' : '#f76707';
      x.fill();
    }
    rr(x, X, Y + 16, 46, 8, 2);
    x.fillStyle = '#e9ecef';
    x.fill();
    x.strokeStyle = '#ced4da';
    x.lineWidth = 0.8;
    x.stroke();
  }

  // 현미경 (옆모습)
  function microscope(x, cx, by) {
    soft(x, 3, 2, 'rgba(0,0,0,0.4)');
    rr(x, cx - 16, by - 7, 32, 7, 2); // 받침
    x.fillStyle = '#f1f3f5';
    x.fill();
    hard(x);
    x.fillStyle = '#e9ecef'; // C자 팔
    x.beginPath();
    x.moveTo(cx + 5, by - 7);
    x.quadraticCurveTo(cx + 17, by - 26, cx + 7, by - 42);
    x.lineTo(cx, by - 40);
    x.quadraticCurveTo(cx + 9, by - 25, cx - 2, by - 7);
    x.closePath();
    x.fill();
    x.strokeStyle = '#adb5bd';
    x.lineWidth = 0.8;
    x.stroke();
    x.fillStyle = '#343a40'; // 재물대
    x.fillRect(cx - 14, by - 21, 21, 3);
    x.fillStyle = '#fff3bf'; // 조명
    circle(x, cx - 4, by - 11, 2.4);
    x.fill();
    x.save(); // 경통 + 접안렌즈
    x.translate(cx + 2, by - 40);
    x.rotate(-0.5);
    rr(x, -4, -15, 8, 19, 2);
    x.fillStyle = '#f8f9fa';
    x.fill();
    x.stroke();
    x.fillStyle = '#343a40';
    x.fillRect(-4.5, -19, 9, 5);
    x.restore();
    x.fillStyle = '#adb5bd'; // 대물렌즈
    x.fillRect(cx - 6, by - 34, 4, 10);
    x.fillStyle = '#fab005';
    x.fillRect(cx - 6, by - 28, 4, 1.6);
    circle(x, cx + 8, by - 16, 3.6); // 초점 손잡이
    x.fillStyle = '#495057';
    x.fill();
  }

  // 피펫 거치대 (피펫 세 자루)
  function pipetteStand(x, cx, by) {
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, cx - 14, by - 5, 28, 5, 2);
    x.fillStyle = '#e9ecef';
    x.fill();
    hard(x);
    x.fillStyle = '#ced4da';
    x.fillRect(cx - 1.5, by - 46, 3, 42);
    rr(x, cx - 16, by - 46, 32, 5, 2);
    x.fillStyle = '#dee2e6';
    x.fill();
    const cols = ['#e03131', '#1c7ed6', '#fab005'];
    for (let i = 0; i < 3; i++) {
      const px = cx - 10 + i * 10;
      rr(x, px - 2.6, by - 45, 5.2, 28, 2);
      x.fillStyle = '#f8f9fa';
      x.fill();
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 0.6;
      x.stroke();
      rr(x, px - 2.2, by - 50, 4.4, 5, 1.5);
      x.fillStyle = cols[i];
      x.fill();
      x.fillStyle = '#868e96';
      x.fillRect(px - 0.9, by - 17, 1.8, 9);
    }
  }

  // 팁 상자 (뚜껑 너머로 팁 구멍)
  function tipBox(x, X, Y, col) {
    soft(x, 2, 1.5, 'rgba(0,0,0,0.35)');
    rr(x, X, Y, 24, 16, 2);
    x.fillStyle = col;
    x.fill();
    hard(x);
    rr(x, X + 2, Y + 2, 20, 10, 1);
    x.fillStyle = 'rgba(255,255,255,0.45)';
    x.fill();
    x.fillStyle = 'rgba(0,0,0,0.35)';
    for (let r = 0; r < 2; r++) for (let k = 0; k < 7; k++) { circle(x, X + 4.2 + k * 2.6, Y + 5 + r * 4, 0.8); x.fill(); }
  }

  // 핫플레이트 교반기 + 삼각 플라스크
  function stirrer(x, cx, by, liq) {
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, cx - 16, by - 10, 32, 10, 2);
    x.fillStyle = vgrad(x, by - 10, by, '#f8f9fa', '#dee2e6');
    x.fill();
    hard(x);
    rr(x, cx - 14, by - 13, 28, 4, 1.5);
    x.fillStyle = '#ced4da';
    x.fill();
    x.fillStyle = '#495057';
    circle(x, cx - 9, by - 5, 2);
    x.fill();
    circle(x, cx + 9, by - 5, 2);
    x.fill();
    x.fillStyle = '#ff6b6b';
    x.fillRect(cx - 2, by - 6, 4, 2);
    erlen(x, cx, by - 13, 13, liq);
    rr(x, cx - 4, by - 17, 8, 2, 1); // 교반 막대
    x.fillStyle = '#ffffff';
    x.fill();
  }

  // 세척병 (D.W.)
  function washBottle(x, cx, by) {
    rr(x, cx - 6, by - 18, 12, 18, 4);
    x.fillStyle = 'rgba(248,249,250,0.95)';
    x.fill();
    x.strokeStyle = '#adb5bd';
    x.lineWidth = 0.7;
    x.stroke();
    rr(x, cx - 4, by - 22, 8, 4, 1);
    x.fillStyle = '#1c7ed6';
    x.fill();
    x.strokeStyle = '#1c7ed6';
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(cx, by - 22);
    x.lineTo(cx, by - 27);
    x.lineTo(cx + 8, by - 30);
    x.stroke();
    x.fillStyle = '#1c7ed6';
    x.font = `900 4px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('D.W.', cx, by - 9);
  }

  // 원심분리기
  function centrifuge(x, cx, by) {
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, cx - 22, by - 22, 44, 22, 6);
    x.fillStyle = vgrad(x, by - 22, by, '#f8f9fa', '#dee2e6');
    x.fill();
    hard(x);
    x.strokeStyle = '#adb5bd';
    x.lineWidth = 0.8;
    x.stroke();
    ell(x, cx - 4, by - 19, 15, 5);
    x.fillStyle = '#ced4da';
    x.fill();
    x.stroke();
    ell(x, cx - 4, by - 19.5, 10, 3);
    x.fillStyle = 'rgba(116,192,252,0.45)';
    x.fill();
    rr(x, cx + 11, by - 13, 9, 6, 1);
    x.fillStyle = '#212529';
    x.fill();
    x.fillStyle = '#51cf66';
    x.fillRect(cx + 12, by - 11.5, 7, 2.6);
  }

  // 볼텍스 믹서
  function vortex(x, cx, by) {
    soft(x, 2, 1.5, 'rgba(0,0,0,0.35)');
    rr(x, cx - 9, by - 9, 18, 9, 3);
    x.fillStyle = '#f1f3f5';
    x.fill();
    hard(x);
    x.strokeStyle = '#adb5bd';
    x.lineWidth = 0.7;
    x.stroke();
    ell(x, cx, by - 10, 5, 2.2);
    x.fillStyle = '#343a40';
    x.fill();
    circle(x, cx + 5, by - 4, 1.4);
    x.fillStyle = '#fa5252';
    x.fill();
  }

  // 얼음 상자 (튜브가 꽂혀 있다)
  function iceBox(x, cx, by) {
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, cx - 15, by - 15, 30, 15, 3);
    x.fillStyle = vgrad(x, by - 15, by, '#4dabf7', '#1c7ed6');
    x.fill();
    hard(x);
    rr(x, cx - 13, by - 17, 26, 6, 2);
    x.fillStyle = '#e7f5ff';
    x.fill();
    const cols = ['#ff8787', '#ffd43b', '#b2f2bb', '#e599f7'];
    for (let i = 0; i < 4; i++) {
      rr(x, cx - 10 + i * 6, by - 22, 3.6, 7, 1.4);
      x.fillStyle = cols[i];
      x.fill();
    }
  }

  // 전기영동 장치 (위에서 본 모습) + 전원 장치 + 전선
  function gelRig(x, X, Y) {
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, X, Y, 42, 20, 3);
    x.fillStyle = 'rgba(208,235,255,0.9)';
    x.fill();
    hard(x);
    x.strokeStyle = '#74c0fc';
    x.lineWidth = 0.9;
    x.stroke();
    rr(x, X + 9, Y + 4, 24, 12, 1);
    x.fillStyle = 'rgba(255,255,255,0.75)';
    x.fill();
    for (let i = 0; i < 6; i++) {
      x.fillStyle = 'rgba(28,126,214,0.65)';
      x.fillRect(X + 11 + i * 3.7, Y + 5, 2, 1.2);
      x.fillStyle = 'rgba(132,94,247,0.55)';
      x.fillRect(X + 11 + i * 3.7, Y + 10 + (i % 3) * 0.8, 2, 1.2);
    }
    x.fillStyle = '#212529';
    x.fillRect(X + 3, Y + 3, 2, 14);
    x.fillStyle = '#e03131';
    x.fillRect(X + 37, Y + 3, 2, 14);
    const px = X + 56, py = Y + 4; // 전원 장치
    soft(x, 3, 2, 'rgba(0,0,0,0.35)');
    rr(x, px, py, 32, 18, 2);
    x.fillStyle = vgrad(x, py, py + 18, '#495057', '#343a40');
    x.fill();
    hard(x);
    rr(x, px + 3, py + 3, 17, 7, 1);
    x.fillStyle = '#0b0f14';
    x.fill();
    x.fillStyle = '#ff6b6b';
    x.font = `900 5px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('120V', px + 11.5, py + 6.8);
    x.fillStyle = '#e03131';
    circle(x, px + 26, py + 6, 1.8);
    x.fill();
    x.fillStyle = '#212529';
    circle(x, px + 26, py + 13, 1.8);
    x.fill();
    x.lineWidth = 1;
    x.strokeStyle = '#e03131';
    x.beginPath();
    x.moveTo(px + 26, py + 6);
    x.bezierCurveTo(px + 10, py - 8, X + 46, Y - 4, X + 38, Y + 3);
    x.stroke();
    x.strokeStyle = '#212529';
    x.beginPath();
    x.moveTo(px + 26, py + 13);
    x.bezierCurveTo(px + 4, py + 30, X + 2, Y + 30, X + 4, Y + 17);
    x.stroke();
  }

  // 키친타월 롤
  function paperRoll(x, cx, by) {
    soft(x, 2, 1.5, 'rgba(0,0,0,0.3)');
    rr(x, cx - 8, by - 20, 16, 20, 3);
    x.fillStyle = vgrad(x, by - 20, by, '#ffffff', '#e9ecef');
    x.fill();
    hard(x);
    ell(x, cx, by - 20, 8, 3);
    x.fillStyle = '#f1f3f5';
    x.fill();
    x.strokeStyle = '#ced4da';
    x.lineWidth = 0.7;
    x.stroke();
    ell(x, cx, by - 20, 3, 1.2);
    x.fillStyle = '#ced4da';
    x.fill();
  }

  // 실험용 둥근 의자 (등받이 없음)
  function stool(x, cx, y) {
    x.strokeStyle = '#868e96';
    x.lineWidth = 2;
    x.lineCap = 'round';
    x.beginPath();
    x.moveTo(cx - 8, y + 6);
    x.lineTo(cx - 12, y + 30);
    x.moveTo(cx + 8, y + 6);
    x.lineTo(cx + 12, y + 30);
    x.moveTo(cx, y + 6);
    x.lineTo(cx, y + 31);
    x.stroke();
    x.lineWidth = 1.4;
    ell(x, cx, y + 21, 11, 3);
    x.stroke();
    x.fillStyle = '#343a40';
    for (const fx of [cx - 12, cx + 12, cx]) { circle(x, fx, y + 31, 1.8); x.fill(); }
    soft(x, 3, 2, 'rgba(20,30,55,0.25)');
    ell(x, cx, y + 4, 13, 6);
    x.fillStyle = '#343a40';
    x.fill();
    hard(x);
    ell(x, cx, y + 2.5, 13, 5.5);
    x.fillStyle = vgrad(x, y - 3, y + 8, '#5c6a7a', '#3d4752');
    x.fill();
    x.fillStyle = 'rgba(255,255,255,0.2)';
    ell(x, cx - 4, y + 1, 5, 1.6);
    x.fill();
  }

  // 작은 글씨 (가운데 정렬)
  function label(x, text, cx, cy, px, col, weight) {
    x.fillStyle = col;
    x.font = `${weight || 800} ${px}px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, cx, cy);
  }

  // 문짝 + 손잡이 (하부장)
  function door(x, X, Y, W, H) {
    rr(x, X, Y, W, H, 3);
    x.fillStyle = vgrad(x, Y, Y + H, '#ffffff', '#eceff3');
    x.fill();
    x.strokeStyle = '#ced4da';
    x.lineWidth = 1;
    x.stroke();
    x.fillStyle = '#868e96';
    x.fillRect(X + W / 2 - 7, Y + 6, 14, 2.5);
  }

  // ───────── 실험대: 검은 에폭시 상판 + 흰 하부장 + 뒤쪽 시약 선반. v 마다 위에 놓인 기구가 다르다 ─────────
  P.benchSprite = function (v) {
    return this.sprite('bench' + v, 224, 180, (x) => {
      const rnd = GS.util.mulberry32(77 + v * 13);
      x.fillStyle = '#ced4da'; // 선반 기둥
      x.fillRect(14, 2, 4, 50);
      x.fillRect(206, 2, 4, 50);
      for (const sy of [24, 48]) {
        let bx = 24;
        while (bx < 198) {
          const w = 7 + rnd() * 6, h = 13 + rnd() * 6;
          if (rnd() < 0.12) { bx += 9; continue; }
          const k = rnd();
          const body = k < 0.35 ? '#8d5a2b' : k < 0.62 ? 'rgba(231,245,255,0.92)' : k < 0.82 ? '#f8f9fa' : '#d0ebff';
          const liq = k >= 0.35 && k < 0.62 ? ['rgba(77,171,247,0.6)', 'rgba(255,212,59,0.65)', 'rgba(250,82,82,0.5)', 'rgba(105,219,124,0.6)'][(rnd() * 4) | 0] : null;
          bottle(x, bx + w / 2, sy, w, h, body, ['#1c7ed6', '#e03131', '#2b2d42', '#f08c00', '#2f9e44'][(rnd() * 5) | 0], liq);
          bx += w + 2 + rnd() * 3;
        }
        x.fillStyle = vgrad(x, sy, sy + 4, '#f1f3f5', '#adb5bd');
        x.fillRect(12, sy, 200, 4);
      }
      soft(x, 12, 6, 'rgba(20,30,55,0.22)'); // 몸통 그림자
      rr(x, 6, 52, 212, 110, 6);
      x.fillStyle = '#d9dee4';
      x.fill();
      hard(x);
      rr(x, 6, 104, 212, 58, 5); // 하부장
      x.fillStyle = vgrad(x, 104, 162, '#f8f9fa', '#dfe4ea');
      x.fill();
      x.strokeStyle = '#c3cad3';
      x.lineWidth = 1.2;
      x.stroke();
      for (let i = 0; i < 4; i++) door(x, 12 + i * 51, 112, 47, 42);
      x.fillStyle = '#495057';
      x.fillRect(10, 156, 204, 6);
      rr(x, 4, 50, 216, 58, 6); // 검은 상판
      x.fillStyle = vgrad(x, 50, 108, '#4b535d', '#31373f');
      x.fill();
      x.strokeStyle = '#212529';
      x.lineWidth = 1.2;
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.25)';
      x.beginPath();
      x.moveTo(10, 51.6);
      x.lineTo(214, 51.6);
      x.stroke();
      rr(x, 4, 100, 216, 8, 3);
      x.fillStyle = '#23282f';
      x.fill();
      x.fillStyle = 'rgba(255,255,255,0.05)'; // 상판 반사
      x.beginPath();
      x.moveTo(40, 52);
      x.lineTo(96, 52);
      x.lineTo(70, 100);
      x.lineTo(14, 100);
      x.fill();
      // 위에 놓인 기구
      if (v === 0) {
        microscope(x, 52, 96);
        tubeRack(x, 92, 80, 8, 1);
        S.notebook(x, 150, 62, 0.08);
        beaker(x, 198, 96, 13, 15, 'rgba(77,171,247,0.55)', 0.55);
      } else if (v === 1) {
        pipetteStand(x, 38, 97);
        tipBox(x, 66, 72, '#4dabf7');
        tipBox(x, 94, 78, '#ffd43b');
        beaker(x, 140, 95, 15, 17, 'rgba(255,146,43,0.55)', 0.6);
        erlen(x, 168, 95, 12, 'rgba(105,219,124,0.6)');
        bottle(x, 194, 95, 11, 22, '#8d5a2b', '#2b2d42');
      } else if (v === 2) {
        stirrer(x, 50, 97, 'rgba(255,146,43,0.6)');
        washBottle(x, 90, 95);
        bottle(x, 110, 95, 11, 22, 'rgba(231,245,255,0.92)', '#1c7ed6', 'rgba(105,219,124,0.6)');
        S.notebook(x, 134, 60, -0.05);
        erlen(x, 196, 95, 11, 'rgba(250,82,82,0.5)');
      } else if (v === 3) {
        centrifuge(x, 52, 97);
        vortex(x, 100, 95);
        iceBox(x, 136, 97);
        tubeRack(x, 164, 80, 6, 3);
      } else if (v === 4) {
        gelRig(x, 22, 64);
        tipBox(x, 126, 76, '#e599f7');
        bottle(x, 166, 95, 12, 23, 'rgba(231,245,255,0.92)', '#1c7ed6', 'rgba(208,235,255,0.9)');
        label(x, 'TAE', 166, 87.5, 3.5, '#1c7ed6', 900);
        beaker(x, 194, 95, 13, 15, 'rgba(132,94,247,0.4)', 0.5);
      } else {
        S.notebook(x, 18, 62, -0.1);
        S.beakerCoffee(x, 72, 90);
        paperRoll(x, 98, 97);
        falconRack(x, 116, 72);
        ell(x, 186, 86, 15, 5); // 쏟은 시약
        x.fillStyle = 'rgba(116,192,252,0.35)';
        x.fill();
        erlen(x, 196, 82, 9);
      }
      stool(x, 64 + (v % 2) * 46, 144);
      if (v % 3 === 0) stool(x, 168, 146);
    });
  };

  // 실험대를 이어 붙인 한 줄 (이웃한 실험대는 늘 다른 모습)
  P.benchRow = function (ctx, X, Y, h, n) {
    const step = 1 + (h % 5);
    for (let i = 0; i < n; i++) put(ctx, this.benchSprite(((h >>> 3) + i * step) % 6), X + i * 216, Y);
  };

  // ───────── 흄후드 (v 0: 환류 장치, 1: 비커·시약병, 2: 클린벤치 — 안쪽에 보라색 UV 등) ─────────
  P.hoodSprite = function (v) {
    const bench = v === 2;
    return this.sprite('hood' + v, 156, 206, (x) => {
      x.fillStyle = vgrad(x, 0, 12, '#ced4da', '#dee2e6'); // 배기 덕트
      x.fillRect(64, 0, 28, 12);
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 6, 8, 144, 188, 5);
      x.fillStyle = vgrad(x, 8, 196, bench ? '#f8f9fa' : '#f1f3f5', bench ? '#e3e8ee' : '#d5dbe2');
      x.fill();
      hard(x);
      x.strokeStyle = '#c3cad3';
      x.lineWidth = 1.2;
      x.stroke();
      rr(x, 12, 14, 132, 20, 3); // 윗부분 표시창
      x.fillStyle = '#e9ecef';
      x.fill();
      rr(x, 18, 18, 32, 12, 2);
      x.fillStyle = '#212529';
      x.fill();
      label(x, bench ? 'UV ON' : '0.5 m/s', 34, 24.5, 6.5, bench ? '#b197fc' : '#51cf66', 900);
      label(x, bench ? 'CLEAN BENCH' : 'FUME HOOD', 98, 24.5, 7, '#495057', 900);
      rr(x, 14, 38, 128, 86, 3); // 작업 공간
      x.fillStyle = vgrad(x, 38, 124, bench ? '#efe9ff' : '#f8f9fa', bench ? '#d6c8ff' : '#e3e7ec');
      x.fill();
      x.fillStyle = bench ? '#cfc2f7' : '#dfe4ea'; // 작업 바닥
      x.fillRect(14, 110, 128, 14);
      if (v === 0) { // 환류 장치: 스탠드 + 둥근 플라스크 + 냉각기 + 가열 맨틀
        x.fillStyle = '#868e96';
        x.fillRect(40, 48, 3, 70);
        x.fillRect(32, 116, 22, 4);
        x.fillStyle = '#495057';
        x.fillRect(42, 66, 22, 3);
        x.fillRect(42, 96, 20, 3);
        rr(x, 62, 52, 10, 46, 4); // 냉각기
        x.fillStyle = 'rgba(165,216,255,0.75)';
        x.fill();
        x.strokeStyle = 'rgba(70,100,130,0.7)';
        x.lineWidth = 0.9;
        x.stroke();
        x.fillStyle = 'rgba(231,245,255,0.9)';
        x.fillRect(65.5, 50, 3, 50);
        x.strokeStyle = '#74c0fc'; // 냉각수 호스
        x.lineWidth = 1.6;
        x.beginPath();
        x.moveTo(72, 58);
        x.quadraticCurveTo(92, 56, 96, 74);
        x.moveTo(62, 92);
        x.quadraticCurveTo(48, 100, 52, 114);
        x.stroke();
        x.beginPath(); // 가열 맨틀
        x.moveTo(52, 116);
        x.quadraticCurveTo(67, 98, 82, 116);
        x.closePath();
        x.fillStyle = '#8d5a2b';
        x.fill();
        circle(x, 67, 106, 9); // 둥근 플라스크
        x.fillStyle = 'rgba(231,245,255,0.85)';
        x.fill();
        x.save();
        x.clip();
        x.fillStyle = 'rgba(255,146,43,0.65)';
        x.fillRect(56, 106, 22, 12);
        x.restore();
        x.strokeStyle = 'rgba(70,100,130,0.75)';
        x.stroke();
        bottle(x, 112, 118, 13, 26, '#8d5a2b', '#2b2d42');
        bottle(x, 128, 118, 10, 20, 'rgba(231,245,255,0.92)', '#e03131', 'rgba(250,82,82,0.5)');
      } else if (v === 1) {
        beaker(x, 38, 118, 16, 20, 'rgba(255,212,59,0.6)', 0.55);
        erlen(x, 66, 118, 14, 'rgba(77,171,247,0.55)');
        bottle(x, 92, 118, 13, 28, '#8d5a2b', '#e03131');
        bottle(x, 110, 118, 12, 24, 'rgba(231,245,255,0.92)', '#2f9e44', 'rgba(105,219,124,0.6)');
        washBottle(x, 128, 118);
      } else { // 클린벤치: 배지 병 · 페트리 접시 · 분젠 버너
        bottle(x, 34, 118, 14, 28, 'rgba(231,245,255,0.92)', '#fab005', 'rgba(250,82,82,0.45)');
        bottle(x, 52, 118, 12, 24, 'rgba(231,245,255,0.92)', '#1c7ed6', 'rgba(255,135,135,0.5)');
        for (let i = 0; i < 4; i++) { // 페트리 접시 더미
          ell(x, 84, 116 - i * 3.2, 11, 3);
          x.fillStyle = i === 3 ? 'rgba(255,236,153,0.9)' : 'rgba(231,245,255,0.95)';
          x.fill();
          x.strokeStyle = 'rgba(70,100,130,0.5)';
          x.lineWidth = 0.7;
          x.stroke();
        }
        rr(x, 112, 110, 14, 6, 2); // 분젠 버너
        x.fillStyle = '#868e96';
        x.fill();
        x.fillStyle = '#adb5bd';
        x.fillRect(116.5, 92, 5, 18);
        x.fillStyle = 'rgba(77,171,247,0.75)';
        x.beginPath();
        x.moveTo(116.5, 92);
        x.quadraticCurveTo(119, 78, 121.5, 92);
        x.fill();
        const uv = x.createRadialGradient(78, 44, 4, 78, 44, 90); // 보라색 UV 빛
        uv.addColorStop(0, 'rgba(151,117,250,0.35)');
        uv.addColorStop(1, 'rgba(151,117,250,0)');
        x.fillStyle = uv;
        x.fillRect(14, 38, 128, 86);
        x.fillStyle = '#9775fa';
        x.fillRect(20, 40, 116, 3);
      }
      rr(x, 14, 38, 128, 50, 2); // 유리 새시
      x.fillStyle = bench ? 'rgba(151,117,250,0.14)' : 'rgba(165,216,255,0.22)';
      x.fill();
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 1.5;
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.4)';
      x.beginPath();
      x.moveTo(20, 40);
      x.lineTo(50, 40);
      x.lineTo(32, 86);
      x.lineTo(20, 86);
      x.fill();
      rr(x, 30, 84, 96, 5, 2.5); // 손잡이
      x.fillStyle = '#868e96';
      x.fill();
      if (!bench) { // 경고 스티커
        x.fillStyle = '#fcc419';
        x.beginPath();
        x.moveTo(128, 44);
        x.lineTo(137, 60);
        x.lineTo(119, 60);
        x.closePath();
        x.fill();
        x.strokeStyle = '#212529';
        x.lineWidth = 0.9;
        x.stroke();
        label(x, '!', 128, 55, 9, '#212529', 900);
      }
      rr(x, 10, 122, 136, 8, 3); // 작업대 앞 턱
      x.fillStyle = vgrad(x, 122, 130, '#f8f9fa', '#ced4da');
      x.fill();
      door(x, 12, 132, 64, 58); // 아래 수납장
      door(x, 80, 132, 64, 58);
      if (!bench) {
        rr(x, 22, 150, 44, 14, 2);
        x.fillStyle = '#fff5f5';
        x.fill();
        x.strokeStyle = '#e03131';
        x.lineWidth = 1;
        x.stroke();
        label(x, '산 · 염기', 44, 157.5, 7, '#c92a2a', 900);
        rr(x, 90, 150, 44, 14, 2);
        x.fillStyle = '#fcc419';
        x.fill();
        label(x, '인화성', 112, 157.5, 7, '#c92a2a', 900);
      }
      x.fillStyle = '#495057';
      x.fillRect(12, 194, 10, 6);
      x.fillRect(134, 194, 10, 6);
    });
  };

  // 노란·검은 빗금 안전선 (흄후드 앞 바닥)
  P.hazardLine = function (ctx, X, Y, W) {
    const spr = this.sprite('hazard', 96, 8, (x) => {
      x.fillStyle = '#fcc419';
      x.fillRect(0, 0, 96, 8);
      x.fillStyle = '#343a40';
      for (let i = -1; i < 9; i++) {
        x.beginPath();
        x.moveTo(i * 12, 8);
        x.lineTo(i * 12 + 6, 8);
        x.lineTo(i * 12 + 14, 0);
        x.lineTo(i * 12 + 8, 0);
        x.closePath();
        x.fill();
      }
    });
    ctx.globalAlpha = 0.85;
    for (let dx = 0; dx < W; dx += 96) {
      const w = Math.min(96, W - dx);
      ctx.drawImage(spr, 0, 0, spr.width * (w / 96), spr.height, X + dx, Y, w, 8);
    }
    ctx.globalAlpha = 1;
  };

  // ───────── 저온 보관 · 배양 ─────────
  // -80℃ 초저온 냉동고
  P.freezerSprite = function () {
    return this.sprite('freezer', 100, 184, (x) => {
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 6, 6, 88, 170, 5);
      x.fillStyle = vgrad(x, 6, 176, '#ffffff', '#dfe4ea');
      x.fill();
      hard(x);
      x.strokeStyle = '#c3cad3';
      x.lineWidth = 1.2;
      x.stroke();
      rr(x, 12, 12, 76, 26, 3);
      x.fillStyle = '#e9ecef';
      x.fill();
      rr(x, 17, 16, 42, 18, 2);
      x.fillStyle = '#1a1d23';
      x.fill();
      label(x, '-80℃', 38, 25.5, 10, '#ff6b6b', 900);
      x.fillStyle = '#51cf66';
      circle(x, 68, 21, 2);
      x.fill();
      x.fillStyle = '#fab005';
      circle(x, 78, 21, 2);
      x.fill();
      x.fillStyle = '#ced4da';
      x.fillRect(12, 42, 76, 1.5);
      rr(x, 77, 60, 7, 56, 3.5); // 손잡이
      x.fillStyle = vgrad(x, 60, 116, '#adb5bd', '#868e96');
      x.fill();
      x.save(); // 붙여 둔 쪽지
      x.translate(36, 80);
      x.rotate(-0.06);
      soft(x, 3, 2, 'rgba(20,30,55,0.2)');
      x.fillStyle = '#ffec99';
      x.fillRect(-18, -14, 36, 28);
      hard(x);
      label(x, '샘플', 0, -5, 7, '#5c4a00', 900);
      label(x, '정리 좀!', 0, 5, 7, '#5c4a00', 900);
      x.restore();
      label(x, 'ULT FREEZER', 50, 128, 6, '#868e96', 900);
      x.fillStyle = '#ced4da';
      for (let i = 0; i < 6; i++) x.fillRect(18 + i * 11, 154, 7, 12);
      x.fillStyle = '#495057';
      x.fillRect(10, 174, 10, 6);
      x.fillRect(80, 174, 10, 6);
    });
  };

  // 4℃ 냉장고 (유리문 너머 시약)
  P.fridgeSprite = function () {
    return this.sprite('fridge', 100, 184, (x) => {
      const rnd = GS.util.mulberry32(404);
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 6, 6, 88, 170, 5);
      x.fillStyle = vgrad(x, 6, 176, '#f1f3f5', '#ced4da');
      x.fill();
      hard(x);
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 1.2;
      x.stroke();
      rr(x, 12, 11, 76, 18, 3);
      x.fillStyle = '#343a40';
      x.fill();
      label(x, '4℃', 50, 20.5, 9, '#74c0fc', 900);
      rr(x, 12, 33, 76, 136, 3); // 유리문 안쪽
      x.fillStyle = '#eef6fc';
      x.fill();
      for (let s = 0; s < 4; s++) {
        const y = 62 + s * 30;
        let bx = 16;
        while (bx < 80) {
          const w = 7 + rnd() * 7;
          if (rnd() < 0.3) { // 상자
            rr(x, bx, y - 12, w + 4, 12, 1);
            x.fillStyle = ['#ffc9c9', '#d0ebff', '#fff3bf', '#d3f9d8'][(rnd() * 4) | 0];
            x.fill();
            bx += w + 6;
          } else {
            bottle(x, bx + w / 2, y, w, 15 + rnd() * 9, rnd() < 0.4 ? '#8d5a2b' : 'rgba(231,245,255,0.95)', ['#1c7ed6', '#e03131', '#2f9e44', '#f08c00'][(rnd() * 4) | 0], rnd() < 0.5 ? 'rgba(255,135,135,0.5)' : 'rgba(77,171,247,0.45)');
            bx += w + 2;
          }
        }
        x.fillStyle = '#adb5bd';
        x.fillRect(14, y, 72, 2);
      }
      rr(x, 12, 33, 76, 136, 3); // 유리
      x.fillStyle = 'rgba(208,235,255,0.25)';
      x.fill();
      x.strokeStyle = '#868e96';
      x.lineWidth = 2;
      x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.35)';
      x.beginPath();
      x.moveTo(16, 36);
      x.lineTo(40, 36);
      x.lineTo(20, 120);
      x.lineTo(16, 120);
      x.fill();
      rr(x, 80, 80, 5, 40, 2.5);
      x.fillStyle = '#495057';
      x.fill();
      x.fillStyle = '#495057';
      x.fillRect(10, 174, 10, 6);
      x.fillRect(80, 174, 10, 6);
    });
  };

  // CO₂ 배양기 두 대 (위아래로 쌓음)
  P.incubatorSprite = function () {
    return this.sprite('incubator', 104, 178, (x) => {
      for (let k = 0; k < 2; k++) {
        const y = 6 + k * 84;
        soft(x, 10, 6, 'rgba(20,30,55,0.22)');
        rr(x, 6, y, 92, 80, 5);
        x.fillStyle = vgrad(x, y, y + 80, '#f8f9fa', '#dee2e6');
        x.fill();
        hard(x);
        x.strokeStyle = '#c3cad3';
        x.lineWidth = 1.2;
        x.stroke();
        rr(x, 12, y + 7, 80, 18, 3);
        x.fillStyle = '#343a40';
        x.fill();
        label(x, '37.0℃', 34, y + 16.5, 7.5, '#69db7c', 900);
        label(x, 'CO₂ 5%', 70, y + 16.5, 7, '#74c0fc', 900);
        x.fillStyle = '#ced4da';
        x.fillRect(12, y + 29, 80, 1.2);
        rr(x, 82, y + 38, 5, 28, 2.5);
        x.fillStyle = '#868e96';
        x.fill();
        label(x, k ? '세포 배양 중' : '건드리지 마시오', 46, y + 54, 6.5, '#868e96', 800);
      }
      x.fillStyle = '#495057';
      x.fillRect(10, 172, 10, 6);
      x.fillRect(84, 172, 10, 6);
    });
  };

  // 액체질소 듀어 (김이 피어오른다)
  P.dewarSprite = function () {
    return this.sprite('dewar', 56, 84, (x) => {
      soft(x, 6, 4, 'rgba(20,30,55,0.25)');
      rr(x, 8, 24, 40, 54, 14);
      const g = x.createLinearGradient(8, 0, 48, 0);
      g.addColorStop(0, '#f1f3f5');
      g.addColorStop(0.45, '#dee2e6');
      g.addColorStop(1, '#adb5bd');
      x.fillStyle = g;
      x.fill();
      hard(x);
      x.strokeStyle = '#868e96';
      x.lineWidth = 1;
      x.stroke();
      rr(x, 20, 14, 16, 12, 3);
      x.fillStyle = '#ced4da';
      x.fill();
      x.stroke();
      rr(x, 18, 10, 20, 6, 3);
      x.fillStyle = '#495057';
      x.fill();
      rr(x, 16, 42, 24, 14, 2);
      x.fillStyle = '#ffffff';
      x.fill();
      label(x, 'LN₂', 28, 49.5, 8, '#1c7ed6', 900);
      x.strokeStyle = 'rgba(255,255,255,0.95)'; // 김
      x.lineWidth = 2.2;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(24, 9);
      x.bezierCurveTo(20, 5, 28, 3, 24, -1);
      x.moveTo(32, 9);
      x.bezierCurveTo(36, 5, 29, 3, 34, 0);
      x.stroke();
      x.strokeStyle = 'rgba(173,181,189,0.5)';
      x.lineWidth = 0.8;
      x.stroke();
    });
  };

  // ───────── 세척 · 멸균 ─────────
  // 개수대 + 벽의 유리 기구 건조대 + 세안기 표지
  P.sinkSprite = function () {
    return this.sprite('sink', 178, 170, (x) => {
      soft(x, 6, 3, 'rgba(20,30,55,0.2)'); // 건조대 (페그보드)
      rr(x, 34, 0, 112, 60, 4);
      x.fillStyle = '#f1f3f5';
      x.fill();
      hard(x);
      x.strokeStyle = '#ced4da';
      x.lineWidth = 1;
      x.stroke();
      x.fillStyle = '#ced4da';
      for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) { circle(x, 42 + c * 12, 8 + r * 14, 1.1); x.fill(); }
      x.save(); // 거꾸로 꽂아 말리는 유리 기구
      for (let i = 0; i < 5; i++) {
        const gx = 48 + i * 21, gy = 14 + (i % 2) * 14;
        x.save();
        x.translate(gx, gy);
        x.rotate(Math.PI);
        if (i % 2) beaker(x, 0, 0, 12, 15);
        else erlen(x, 0, 0, 10);
        x.restore();
      }
      x.restore();
      rr(x, 4, 8, 24, 30, 3); // 세안기 표지
      x.fillStyle = '#2f9e44';
      x.fill();
      ell(x, 16, 19, 7, 4);
      x.fillStyle = '#ffffff';
      x.fill();
      circle(x, 16, 19, 2.4);
      x.fillStyle = '#2f9e44';
      x.fill();
      label(x, '세안기', 16, 31, 6, '#ffffff', 900);
      soft(x, 12, 6, 'rgba(20,30,55,0.22)'); // 개수대
      rr(x, 6, 58, 166, 104, 5);
      x.fillStyle = '#d9dee4';
      x.fill();
      hard(x);
      rr(x, 6, 104, 166, 58, 5);
      x.fillStyle = vgrad(x, 104, 162, '#f8f9fa', '#dfe4ea');
      x.fill();
      x.strokeStyle = '#c3cad3';
      x.lineWidth = 1.2;
      x.stroke();
      for (let i = 0; i < 3; i++) door(x, 12 + i * 54, 112, 50, 42);
      x.fillStyle = '#495057';
      x.fillRect(10, 156, 158, 6);
      rr(x, 4, 58, 170, 50, 6); // 상판 (스테인리스)
      x.fillStyle = vgrad(x, 58, 108, '#f1f3f5', '#ced4da');
      x.fill();
      x.strokeStyle = '#adb5bd';
      x.stroke();
      rr(x, 4, 100, 170, 8, 3);
      x.fillStyle = '#adb5bd';
      x.fill();
      rr(x, 36, 64, 72, 32, 7); // 싱크볼
      x.fillStyle = vgrad(x, 64, 96, '#868e96', '#ced4da');
      x.fill();
      rr(x, 40, 68, 64, 25, 5);
      x.fillStyle = vgrad(x, 68, 93, '#adb5bd', '#dee2e6');
      x.fill();
      circle(x, 72, 84, 3);
      x.fillStyle = '#495057';
      x.fill();
      x.strokeStyle = '#868e96'; // 거위목 수도꼭지
      x.lineWidth = 3.5;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(72, 64);
      x.lineTo(72, 44);
      x.quadraticCurveTo(72, 36, 80, 36);
      x.quadraticCurveTo(88, 36, 88, 46);
      x.stroke();
      x.fillStyle = '#495057';
      circle(x, 64, 62, 2.6);
      x.fill();
      circle(x, 80, 62, 2.6);
      x.fill();
      rr(x, 120, 64, 11, 20, 2); // 손 세정제
      x.fillStyle = '#ffffff';
      x.fill();
      x.strokeStyle = '#ced4da';
      x.lineWidth = 0.8;
      x.stroke();
      x.fillStyle = '#495057';
      x.fillRect(123, 59, 5, 5);
      rr(x, 138, 70, 28, 16, 2); // 장갑 상자 (보라색 니트릴 장갑)
      x.fillStyle = '#f8f9fa';
      x.fill();
      x.stroke();
      x.fillStyle = GLOVE;
      x.beginPath();
      x.moveTo(146, 72);
      x.quadraticCurveTo(150, 62, 156, 66);
      x.quadraticCurveTo(160, 70, 158, 74);
      x.closePath();
      x.fill();
      label(x, 'M', 152, 81, 6, GLOVE, 900);
    });
  };

  // 오토클레이브 (고압 멸균기)
  P.autoclaveSprite = function () {
    return this.sprite('autoclave', 130, 158, (x) => {
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 6, 10, 118, 138, 6);
      x.fillStyle = vgrad(x, 10, 148, '#f8f9fa', '#ced4da');
      x.fill();
      hard(x);
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 1.2;
      x.stroke();
      rr(x, 6, 4, 118, 14, 5);
      x.fillStyle = '#e9ecef';
      x.fill();
      x.stroke();
      rr(x, 14, 20, 102, 22, 3); // 조작판
      x.fillStyle = '#343a40';
      x.fill();
      rr(x, 19, 24, 46, 14, 2);
      x.fillStyle = '#0b0f14';
      x.fill();
      label(x, '121℃ 20min', 42, 31.5, 6.5, '#ff6b6b', 900);
      x.fillStyle = '#51cf66';
      circle(x, 78, 31, 2.2);
      x.fill();
      x.fillStyle = '#ff6b6b';
      circle(x, 88, 31, 2.2);
      x.fill();
      x.fillStyle = '#adb5bd';
      rr(x, 96, 26, 14, 10, 2);
      x.fill();
      const cx = 60, cy = 92; // 둥근 문 + 손잡이 바퀴
      circle(x, cx, cy, 36);
      x.fillStyle = vgrad(x, cy - 36, cy + 36, '#e9ecef', '#adb5bd');
      x.fill();
      x.strokeStyle = '#868e96';
      x.lineWidth = 3;
      x.stroke();
      circle(x, cx, cy, 27);
      x.fillStyle = vgrad(x, cy - 27, cy + 27, '#f8f9fa', '#dee2e6');
      x.fill();
      x.strokeStyle = '#495057';
      x.lineWidth = 3;
      for (let i = 0; i < 3; i++) {
        const a = -0.5 + (i * Math.PI * 2) / 3;
        x.beginPath();
        x.moveTo(cx, cy);
        x.lineTo(cx + Math.cos(a) * 17, cy + Math.sin(a) * 17);
        x.stroke();
        circle(x, cx + Math.cos(a) * 17, cy + Math.sin(a) * 17, 3);
        x.fillStyle = '#495057';
        x.fill();
      }
      circle(x, cx, cy, 6);
      x.fill();
      circle(x, 108, 66, 9); // 압력계
      x.fillStyle = '#ffffff';
      x.fill();
      x.strokeStyle = '#495057';
      x.lineWidth = 1.5;
      x.stroke();
      x.strokeStyle = '#e03131';
      x.beginPath();
      x.moveTo(108, 66);
      x.lineTo(113, 61);
      x.stroke();
      rr(x, 94, 116, 26, 16, 2); // 고온 주의
      x.fillStyle = '#fcc419';
      x.fill();
      label(x, '고온 주의', 107, 124.5, 6.5, '#c92a2a', 900);
      x.fillStyle = '#adb5bd';
      for (let i = 0; i < 5; i++) x.fillRect(18 + i * 9, 136, 6, 6);
      x.fillStyle = '#495057';
      x.fillRect(12, 146, 10, 6);
      x.fillRect(108, 146, 10, 6);
    });
  };

  // 의료 폐기물 통 (생물 위험 표시)
  P.bioBinSprite = function () {
    return this.sprite('biobin', 46, 58, (x) => {
      soft(x, 5, 3, 'rgba(20,30,55,0.25)');
      x.beginPath();
      x.moveTo(6, 16);
      x.lineTo(40, 16);
      x.lineTo(37, 54);
      x.lineTo(9, 54);
      x.closePath();
      x.fillStyle = vgrad(x, 16, 54, '#ff8787', '#e03131');
      x.fill();
      hard(x);
      rr(x, 3, 9, 40, 9, 3);
      x.fillStyle = '#c92a2a';
      x.fill();
      x.strokeStyle = '#212529'; // 생물 위험 표시: 고리 세 개
      x.lineWidth = 1.6;
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        circle(x, 23 + Math.cos(a) * 5, 34 + Math.sin(a) * 5, 4.6);
        x.stroke();
      }
      circle(x, 23, 34, 2);
      x.fillStyle = '#212529';
      x.fill();
      label(x, '의료폐기물', 23, 49, 5, '#ffffff', 900);
    });
  };

  // 폐액통
  P.carboySprite = function () {
    return this.sprite('carboy', 42, 58, (x) => {
      soft(x, 5, 3, 'rgba(20,30,55,0.25)');
      rr(x, 6, 16, 30, 38, 5);
      x.fillStyle = 'rgba(248,249,250,0.97)';
      x.fill();
      hard(x);
      x.save();
      x.clip();
      x.fillStyle = 'rgba(255,212,59,0.45)';
      x.fillRect(6, 34, 30, 22);
      x.restore();
      x.strokeStyle = '#adb5bd';
      x.lineWidth = 1;
      rr(x, 6, 16, 30, 38, 5);
      x.stroke();
      x.lineWidth = 3; // 손잡이
      x.strokeStyle = '#dee2e6';
      x.beginPath();
      x.moveTo(12, 17);
      x.quadraticCurveTo(14, 6, 24, 9);
      x.stroke();
      rr(x, 25, 8, 9, 8, 2);
      x.fillStyle = '#fab005';
      x.fill();
      rr(x, 10, 24, 22, 11, 2);
      x.fillStyle = '#ffffff';
      x.fill();
      x.strokeStyle = '#e03131';
      x.lineWidth = 0.8;
      x.stroke();
      label(x, '폐액', 21, 30, 6.5, '#c92a2a', 900);
    });
  };

  // ───────── 시약장 · 가스 ─────────
  // v 0·2: 유리문 시약장 (병 배치가 다르다), 1: 노란 인화성 물질 보관함
  P.cabinetSprite = function (v) {
    return this.sprite('cab' + v, 112, 184, (x) => {
      const rnd = GS.util.mulberry32(303 + v);
      soft(x, 12, 7, 'rgba(20,30,55,0.25)');
      rr(x, 6, 6, 100, 172, 5);
      x.fillStyle = v === 1 ? vgrad(x, 6, 178, '#ffe066', '#f59f00') : vgrad(x, 6, 178, '#f1f3f5', '#ced4da');
      x.fill();
      hard(x);
      x.strokeStyle = v === 1 ? '#e67700' : '#adb5bd';
      x.lineWidth = 1.2;
      x.stroke();
      if (v !== 1) {
        label(x, '시약장', 56, 16, 8, '#495057', 900);
        for (let d = 0; d < 2; d++) {
          const dx = 12 + d * 46;
          rr(x, dx, 24, 42, 146, 3);
          x.fillStyle = '#f8fbff';
          x.fill();
          for (let s = 0; s < 4; s++) {
            const y = 56 + s * 34;
            let bx = dx + 3;
            while (bx < dx + 36) {
              const w = 6 + rnd() * 5;
              bottle(x, bx + w / 2, y, w, 16 + rnd() * 10, rnd() < 0.45 ? '#8d5a2b' : 'rgba(231,245,255,0.95)', ['#1c7ed6', '#e03131', '#2b2d42', '#2f9e44', '#f08c00'][(rnd() * 5) | 0], rnd() < 0.6 ? ['rgba(77,171,247,0.5)', 'rgba(255,212,59,0.6)', 'rgba(250,82,82,0.45)', 'rgba(105,219,124,0.55)'][(rnd() * 4) | 0] : null);
              bx += w + 1.6;
            }
            x.fillStyle = '#adb5bd';
            x.fillRect(dx + 1, y, 40, 2);
          }
          rr(x, dx, 24, 42, 146, 3);
          x.fillStyle = 'rgba(208,235,255,0.22)';
          x.fill();
          x.strokeStyle = '#868e96';
          x.lineWidth = 1.6;
          x.stroke();
          x.fillStyle = 'rgba(255,255,255,0.35)';
          x.beginPath();
          x.moveTo(dx + 3, 26);
          x.lineTo(dx + 16, 26);
          x.lineTo(dx + 5, 90);
          x.lineTo(dx + 3, 90);
          x.fill();
          x.fillStyle = '#495057';
          x.fillRect(d ? dx + 4 : dx + 36, 92, 2.5, 16);
        }
      } else {
        for (let d = 0; d < 2; d++) {
          rr(x, 12 + d * 46, 14, 42, 156, 3);
          x.strokeStyle = 'rgba(166,93,0,0.6)';
          x.lineWidth = 1;
          x.stroke();
        }
        x.fillStyle = '#495057';
        x.fillRect(51, 82, 2.5, 18);
        x.fillRect(59, 82, 2.5, 18);
        x.save(); // 인화성 표시 (빨간 마름모 + 불꽃)
        x.translate(56, 46);
        x.rotate(Math.PI / 4);
        x.fillStyle = '#ffffff';
        x.fillRect(-14, -14, 28, 28);
        x.strokeStyle = '#e03131';
        x.lineWidth = 3;
        x.strokeRect(-14, -14, 28, 28);
        x.restore();
        x.fillStyle = '#212529';
        x.beginPath();
        x.moveTo(56, 34);
        x.bezierCurveTo(64, 42, 63, 50, 61, 54);
        x.bezierCurveTo(60, 58, 52, 58, 51, 54);
        x.bezierCurveTo(49, 49, 53, 47, 54, 42);
        x.bezierCurveTo(56, 46, 57, 46, 56, 34);
        x.fill();
        label(x, '인화성 물질', 56, 116, 11, '#c92a2a', 900);
        label(x, 'FLAMMABLE', 56, 132, 9, '#212529', 900);
        label(x, '화기 엄금', 56, 148, 8, '#212529', 800);
      }
      x.fillStyle = '#495057';
      x.fillRect(10, 176, 10, 6);
      x.fillRect(92, 176, 10, 6);
    });
  };

  // 가스 실린더 (v 0: 질소 회색, 1: 이산화탄소 파랑, 2: 산소 초록) + 감압기 + 고정 사슬
  P.cylinderSprite = function (v) {
    const C = [['#adb5bd', 'N₂'], ['#4dabf7', 'CO₂'], ['#51cf66', 'O₂']][v % 3];
    return this.sprite('cyl' + v, 38, 130, (x) => {
      soft(x, 6, 4, 'rgba(20,30,55,0.25)');
      rr(x, 8, 28, 22, 98, 10);
      const g = x.createLinearGradient(8, 0, 30, 0);
      g.addColorStop(0, R.shade(C[0], 0.3));
      g.addColorStop(0.45, C[0]);
      g.addColorStop(1, R.shade(C[0], -0.3));
      x.fillStyle = g;
      x.fill();
      hard(x);
      x.strokeStyle = R.shade(C[0], -0.4);
      x.lineWidth = 1;
      x.stroke();
      rr(x, 14, 16, 10, 14, 2); // 밸브
      x.fillStyle = '#868e96';
      x.fill();
      x.fillStyle = '#ffffff'; // 감압기 압력계 두 개
      x.strokeStyle = '#495057';
      x.lineWidth = 1.2;
      for (const gx of [9, 29]) {
        circle(x, gx, 13, 5.5);
        x.fill();
        x.stroke();
      }
      x.strokeStyle = '#e03131';
      x.lineWidth = 0.9;
      x.beginPath();
      x.moveTo(9, 13);
      x.lineTo(12, 10);
      x.moveTo(29, 13);
      x.lineTo(26, 11);
      x.stroke();
      rr(x, 11, 52, 16, 14, 2);
      x.fillStyle = '#ffffff';
      x.fill();
      label(x, C[1], 19, 59.5, 7, '#212529', 900);
      x.strokeStyle = '#495057'; // 고정 사슬
      x.lineWidth = 1.4;
      for (let i = 0; i < 6; i++) { ell(x, 7 + i * 4.8, 82, 2.6, 1.6); x.stroke(); }
    });
  };

  // ───────── 동물실: 실험쥐 사육 선반 ─────────
  P.cageRackSprite = function () {
    return this.sprite('cagerack', 208, 182, (x) => {
      soft(x, 10, 6, 'rgba(20,30,55,0.2)');
      x.fillStyle = '#adb5bd';
      x.fillRect(8, 4, 5, 168);
      x.fillRect(195, 4, 5, 168);
      hard(x);
      rr(x, 52, 2, 104, 13, 3); // 표지
      x.fillStyle = '#1c7ed6';
      x.fill();
      label(x, '동물실 · 출입 기록 필수', 104, 8.8, 7, '#ffffff', 900);
      for (let r = 0; r < 3; r++) {
        const sy = 66 + r * 52;
        for (let c = 0; c < 3; c++) {
          const cx = 16 + c * 61, cy = sy - 44;
          rr(x, cx, cy, 56, 42, 4); // 투명 사육 상자
          x.fillStyle = 'rgba(231,245,255,0.8)';
          x.fill();
          x.strokeStyle = '#a5d8ff';
          x.lineWidth = 1;
          x.stroke();
          rr(x, cx + 2, cy + 30, 52, 11, 3); // 깔짚
          x.fillStyle = '#f4d9a8';
          x.fill();
          const n = 1 + ((r + c * 2) % 2);
          for (let m = 0; m < n; m++) { // 실험쥐
            const mx = cx + 14 + m * 16 + ((r * 7 + c * 5) % 8), my = cy + 30;
            x.strokeStyle = '#ffc9c9';
            x.lineWidth = 1;
            x.beginPath();
            x.moveTo(mx - 6, my);
            x.quadraticCurveTo(mx - 11, my - 1, mx - 12, my - 5);
            x.stroke();
            ell(x, mx, my - 2, 6.5, 4);
            x.fillStyle = '#ffffff';
            x.fill();
            x.strokeStyle = '#ced4da';
            x.lineWidth = 0.7;
            x.stroke();
            circle(x, mx + 6, my - 4, 3.4);
            x.fill();
            x.stroke();
            circle(x, mx + 5, my - 7.5, 1.8);
            x.fillStyle = '#ffc9c9';
            x.fill();
            circle(x, mx + 7.6, my - 4.6, 0.8);
            x.fillStyle = '#e03131';
            x.fill();
          }
          rr(x, cx - 1, cy - 3, 58, 8, 3); // 파란 뚜껑
          x.fillStyle = '#4dabf7';
          x.fill();
          x.strokeStyle = '#1c7ed6';
          x.lineWidth = 0.6;
          for (let k = 0; k < 7; k++) {
            x.beginPath();
            x.moveTo(cx + 6 + k * 7, cy - 2);
            x.lineTo(cx + 6 + k * 7, cy + 4);
            x.stroke();
          }
          rr(x, cx + 44, cy + 6, 6, 16, 2); // 물병
          x.fillStyle = 'rgba(165,216,255,0.9)';
          x.fill();
          rr(x, cx + 3, cy + 9, 14, 11, 1); // 사육 카드
          x.fillStyle = '#ffffff';
          x.fill();
          x.fillStyle = ['#fa5252', '#4dabf7', '#51cf66'][(r + c) % 3];
          x.fillRect(cx + 3, cy + 9, 14, 3);
          x.fillStyle = '#adb5bd';
          x.fillRect(cx + 5, cy + 14, 10, 1);
          x.fillRect(cx + 5, cy + 17, 7, 1);
        }
        x.fillStyle = vgrad(x, sy, sy + 4, '#dee2e6', '#868e96'); // 선반
        x.fillRect(8, sy, 192, 4);
      }
      x.fillStyle = '#343a40'; // 바퀴
      for (const wx of [10, 197]) { circle(x, wx, 176, 4); x.fill(); }
    });
  };

  // 가운 걸이 (흰 가운 둘 + 보안경)
  P.coatRackSprite = function () {
    return this.sprite('coatrack', 92, 156, (x) => {
      x.strokeStyle = '#868e96';
      x.lineWidth = 3;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(46, 14);
      x.lineTo(46, 142);
      x.moveTo(30, 150);
      x.lineTo(46, 140);
      x.lineTo(62, 150);
      x.moveTo(34, 18);
      x.lineTo(58, 18);
      x.stroke();
      for (let i = 0; i < 2; i++) {
        const cx = 30 + i * 32, top = 20 + i * 4;
        x.save();
        x.translate(cx, top);
        x.rotate(i ? 0.06 : -0.06);
        soft(x, 5, 3, 'rgba(20,30,55,0.2)');
        x.beginPath(); // 가운
        x.moveTo(-8, 0);
        x.lineTo(8, 0);
        x.lineTo(15, 14);
        x.lineTo(16, 82);
        x.lineTo(-16, 82);
        x.lineTo(-15, 14);
        x.closePath();
        x.fillStyle = vgrad(x, 0, 82, '#ffffff', '#e3e8ee');
        x.fill();
        hard(x);
        x.strokeStyle = '#ced4da';
        x.lineWidth = 1;
        x.stroke();
        x.beginPath(); // 깃
        x.moveTo(-8, 0);
        x.lineTo(0, 16);
        x.lineTo(8, 0);
        x.stroke();
        x.beginPath();
        x.moveTo(0, 16);
        x.lineTo(0, 82);
        x.stroke();
        x.strokeRect(-12, 40, 9, 9); // 주머니
        if (i === 0) { // 주머니에 꽂힌 펜
          x.fillStyle = '#1c7ed6';
          x.fillRect(-10, 36, 1.6, 7);
          x.fillStyle = '#e03131';
          x.fillRect(-7, 37, 1.6, 6);
        } else { // 주머니에 넣어 둔 장갑
          x.fillStyle = GLOVE;
          x.beginPath();
          x.moveTo(-11, 40);
          x.quadraticCurveTo(-9, 32, -5, 35);
          x.lineTo(-4, 40);
          x.closePath();
          x.fill();
        }
        x.restore();
      }
      x.strokeStyle = '#495057'; // 걸어 둔 보안경
      x.lineWidth = 1.2;
      x.beginPath();
      x.moveTo(40, 18);
      x.quadraticCurveTo(46, 30, 52, 18);
      x.stroke();
      rr(x, 38, 24, 16, 7, 3);
      x.fillStyle = 'rgba(165,216,255,0.85)';
      x.fill();
      x.stroke();
    });
  };

  // ───────── 바닥 소품 ─────────
  // 0 쏟은 시약, 1 피펫 팁, 2 니트릴 장갑, 3 구긴 킴와이프, 4 마이크로튜브, 5 '미끄럼 주의' 표지판, 6 라벨 테이프, 7 프로토콜 종이, 8 시약 얼룩
  P.wetDecalSprite = function (k) {
    const SZ = [[34, 22], [22, 16], [24, 24], [16, 15], [10, 18], [30, 40], [30, 18], [24, 30], [30, 20]][k];
    return this.sprite('wdecal' + k, SZ[0], SZ[1], (x, w, h) => {
      if (k === 0) {
        x.fillStyle = 'rgba(116,192,252,0.3)';
        x.beginPath();
        x.moveTo(4, 12);
        x.bezierCurveTo(2, 3, 14, 1, 20, 4);
        x.bezierCurveTo(28, 1, 33, 9, 30, 14);
        x.bezierCurveTo(28, 21, 14, 21, 9, 18);
        x.bezierCurveTo(4, 19, 5, 15, 4, 12);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,0.55)';
        ell(x, 13, 8, 4, 1.4, -0.2);
        x.fill();
      } else if (k === 1) {
        const tip = (tx, ty, a, col) => {
          x.save();
          x.translate(tx, ty);
          x.rotate(a);
          x.fillStyle = col;
          x.beginPath();
          x.moveTo(-6, -1.8);
          x.lineTo(5, -0.5);
          x.lineTo(5, 0.5);
          x.lineTo(-6, 1.8);
          x.closePath();
          x.fill();
          x.restore();
        };
        tip(7, 6, 0.4, 'rgba(255,212,59,0.95)');
        tip(14, 10, -0.8, 'rgba(77,171,247,0.9)');
        tip(9, 12, 2.2, 'rgba(255,212,59,0.95)');
      } else if (k === 2) {
        soft(x, 2, 1, 'rgba(20,30,55,0.2)');
        x.fillStyle = GLOVE;
        rr(x, 6, 10, 12, 12, 4); // 손바닥
        x.fill();
        hard(x);
        for (let i = 0; i < 4; i++) { // 손가락
          rr(x, 6.2 + i * 3, 2 + Math.abs(i - 1.5), 2.6, 10, 1.3);
          x.fill();
        }
        rr(x, 15, 11, 7, 3, 1.5);
        x.fill();
        x.fillStyle = 'rgba(255,255,255,0.25)';
        x.fillRect(8, 13, 2, 6);
      } else if (k === 3) {
        soft(x, 2, 1, 'rgba(20,30,55,0.18)');
        x.fillStyle = '#f8fbff';
        x.beginPath();
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2, d = i % 2 ? 5 : 7;
          x.lineTo(8 + Math.cos(a) * d, 7.5 + Math.sin(a) * d);
        }
        x.closePath();
        x.fill();
        hard(x);
        x.strokeStyle = '#d0ebff';
        x.lineWidth = 0.8;
        x.stroke();
      } else if (k === 4) {
        soft(x, 1.5, 1, 'rgba(20,30,55,0.2)');
        x.fillStyle = 'rgba(231,245,255,0.95)';
        x.beginPath();
        x.moveTo(2.5, 6);
        x.lineTo(7.5, 6);
        x.lineTo(7, 14);
        x.lineTo(5, 17);
        x.lineTo(3, 14);
        x.closePath();
        x.fill();
        hard(x);
        x.strokeStyle = 'rgba(70,100,130,0.6)';
        x.lineWidth = 0.6;
        x.stroke();
        rr(x, 2, 3, 6, 3, 1); // 뚜껑
        x.fillStyle = '#ff8787';
        x.fill();
        x.fillStyle = 'rgba(255,135,135,0.5)';
        x.fillRect(3.4, 10, 3.2, 3.5);
      } else if (k === 5) { // 미끄럼 주의 A자 표지판
        soft(x, 4, 3, 'rgba(20,30,55,0.25)');
        x.beginPath();
        x.moveTo(15, 2);
        x.lineTo(27, 37);
        x.lineTo(3, 37);
        x.closePath();
        x.fillStyle = '#fcc419';
        x.fill();
        hard(x);
        x.strokeStyle = '#e67700';
        x.lineWidth = 1;
        x.stroke();
        x.fillStyle = '#212529'; // 미끄러지는 사람
        circle(x, 13, 14, 1.8);
        x.fill();
        x.strokeStyle = '#212529';
        x.lineWidth = 1.4;
        x.lineCap = 'round';
        x.beginPath();
        x.moveTo(13, 16);
        x.lineTo(16, 22);
        x.lineTo(20, 24);
        x.moveTo(16, 22);
        x.lineTo(12, 25);
        x.moveTo(14, 18);
        x.lineTo(19, 17);
        x.moveTo(8, 27);
        x.lineTo(22, 27);
        x.stroke();
        label(x, '미끄럼 주의', 15, 32, 4.4, '#212529', 900);
      } else if (k === 6) {
        circle(x, 9, 9, 7); // 라벨 테이프 롤
        x.fillStyle = '#ffa8a8';
        x.fill();
        circle(x, 9, 9, 3.4);
        x.fillStyle = '#ffffff';
        x.fill();
        x.save();
        x.translate(21, 10);
        x.rotate(0.3);
        x.fillStyle = '#ffa8a8';
        x.fillRect(-6, -2, 12, 4);
        x.fillStyle = '#495057';
        x.fillRect(-4, -0.5, 7, 1);
        x.restore();
      } else if (k === 7) {
        soft(x, 2, 1, 'rgba(20,30,55,0.15)');
        x.fillStyle = '#fff';
        x.fillRect(2, 2, w - 4, h - 4);
        hard(x);
        x.fillStyle = '#495057';
        x.fillRect(5, 4.5, 10, 1.6);
        x.strokeStyle = '#ced4da';
        x.lineWidth = 0.6;
        for (let i = 0; i < 4; i++) {
          x.strokeRect(5, 9 + i * 4.5, 2.4, 2.4); // 체크 칸
          x.fillStyle = '#ced4da';
          x.fillRect(9, 10 + i * 4.5, i === 3 ? 6 : 10, 1);
        }
        x.strokeStyle = '#2f9e44';
        x.lineWidth = 0.8;
        x.beginPath();
        x.moveTo(5.3, 10.5);
        x.lineTo(6.2, 11.4);
        x.lineTo(7.8, 9.2);
        x.moveTo(5.3, 15);
        x.lineTo(6.2, 15.9);
        x.lineTo(7.8, 13.7);
        x.stroke();
      } else {
        x.fillStyle = 'rgba(192,235,117,0.28)';
        ell(x, 15, 10, 13, 7.5, 0.2);
        x.fill();
        x.strokeStyle = 'rgba(148,216,45,0.3)';
        x.lineWidth = 1.5;
        x.stroke();
      }
    });
  };

  // ───────── 묶음 배치 (scene.js 와 같은 규칙: 760 칸마다 하나, 크기는 최대 약 600×460) ─────────
  const WET_CLUSTERS = [
    [20, function (ctx, X, Y, h) { // 실험대 한 줄
      const n = 2 + (h % 2);
      this.benchRow(ctx, X, Y, h, n);
      if (h & 4) put(ctx, this.carboySprite(), X + n * 216 + 12, Y + 104);
    }],
    [10, function (ctx, X, Y, h) { // 마주 보는 실험대 두 줄
      this.benchRow(ctx, X, Y, h, 2);
      this.benchRow(ctx, X, Y + 200, h >>> 7, 2);
      put(ctx, this.bioBinSprite(), X + 446, Y + 128);
    }],
    [10, function (ctx, X, Y, h) { // 흄후드 · 클린벤치 줄 (앞 바닥에 노란 안전선)
      const n = 2 + (h % 2);
      for (let i = 0; i < n; i++) put(ctx, this.hoodSprite((h >>> (i * 2 + 1)) % 3), X + i * 150, Y);
      this.hazardLine(ctx, X, Y + 222, n * 150 + 6);
      put(ctx, this.carboySprite(), X + n * 150 + 14, Y + 148);
      if (h & 8) put(ctx, this.carboySprite(), X + n * 150 + 34, Y + 162);
    }],
    [9, function (ctx, X, Y) { // 저온 보관 · 배양
      put(ctx, this.freezerSprite(), X, Y);
      put(ctx, this.fridgeSprite(), X + 98, Y);
      put(ctx, this.incubatorSprite(), X + 200, Y + 6);
      put(ctx, this.dewarSprite(), X + 312, Y + 104);
    }],
    [8, function (ctx, X, Y) { // 세척 · 멸균
      put(ctx, this.sinkSprite(), X, Y);
      put(ctx, this.autoclaveSprite(), X + 184, Y + 12);
      put(ctx, this.bioBinSprite(), X + 322, Y + 112);
    }],
    [8, function (ctx, X, Y, h) { // 시약장 · 가스 실린더 (순서와 종류는 칸마다 다르다)
      const glass = h & 16 ? 2 : 0, swap = h & 32;
      put(ctx, this.cabinetSprite(swap ? 1 : glass), X, Y);
      put(ctx, this.cabinetSprite(swap ? glass : 1), X + 114, Y);
      const n = 2 + (h & 1);
      for (let i = 0; i < n; i++) put(ctx, this.cylinderSprite(((h >>> 2) + i) % 3), X + 236 + i * 34, Y + 56);
    }],
    [6, function (ctx, X, Y, h) { // 동물실
      put(ctx, this.cageRackSprite(), X, Y);
      put(ctx, this.pillarSprite(h % 3, true), X + 236, Y + 4);
    }],
    [8, function (ctx, X, Y, h) { // 사무 공간: 실험 노트·데이터 정리 책상 + 가운 걸이 + 화이트보드
      this.drawCarpet(ctx, X - 16, Y + 18, 2 * 186 + 32, 140);
      this.deskRow(ctx, X, Y, h, 2, true);
      put(ctx, this.coatRackSprite(), X + 392, Y + 4);
      put(ctx, this.boardSprite(h % 4, true), X + 40, Y + 196);
    }],
    [5, function (ctx, X, Y, h) { // 기둥
      put(ctx, this.pillarSprite(h % 3, true), X + 60, Y);
      put(ctx, this.boxSprite(), X + 160, Y + 100);
      if (h & 2) put(ctx, this.carboySprite(), X + 176, Y + 64);
    }],
    [12, null], // 빈 칸 (바닥 소품만)
  ];

  // 미끄럼 주의 표지판(5)은 드물게
  const WET_DECALS = [0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 4, 5, 6, 6, 7, 7, 8, 8, 0];

  S.THEMES.wet = { floor: WET_FLOOR, decal: 'wetDecalSprite', decals: WET_DECALS, flat: [0, 5, 8], pick: S.picker(WET_CLUSTERS) };
})(window.GS = window.GS || {});
