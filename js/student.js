// 주인공 대학원생 두 명 (Dry lab: 후드티·학사모·안경 / Wet lab: 가운·보안경·니트릴 장갑)
// 웨이브(차수)가 지날수록 점점 지쳐 간다
// 단계 0 = 1차(아직 생생) · 1 = 2차(밤샘) · 2 = 3차(번아웃 직전) · 3 = 4차(영혼 가출) · 4 = 박사(좀비)
// 104×120 설계 좌표로 그리고(오른쪽을 살짝 본다) 절반 크기 스프라이트(52×60)에 담는다
// 움직이는 장식(먹구름·영혼·파리)은 스프라이트에 넣지 않고 매 프레임 extras() 로 그린다
(function (GS) {
  'use strict';
  const R = GS.R, TAU = R.TAU, P = GS.Renderer.prototype;
  const rr = R.roundRect, circle = R.circle, ell = R.ell, vgrad = R.vgrad;
  const OL = '#2b2d3b';
  const EL = [1, 5.5], ER = [13.5, 5.5]; // 머리 중심 기준 왼눈·오른눈

  // ───────── 걸음걸이: 단계가 오를수록 보폭이 줄고 발을 끈다 ─────────
  const GAITS = [
    { sw: [1, 0, -1, 0], up: [0, -2.5, 0, -2.5], cadence: 13 },             // 1차: 통통
    { sw: [0.7, 0, -0.7, 0], up: [0.8, -1.2, 0.8, -1.2], cadence: 11.5 },   // 2차: 터덜터덜
    { sw: [0.55, 0, -0.55, 0], up: [1.1, -0.8, 1.1, -0.8], cadence: 10 },   // 3차: 질질
    { sw: [0.55, 0, -0.55, 0], up: [1.1, -0.8, 1.1, -0.8], cadence: 9 },    // 4차
    { sw: [0.45, 0.1, -0.45, -0.1], up: [1.6, -0.2, 1.6, -0.2], cadence: 8 }, // 박사: 비틀비틀
  ];
  // frame 0~3 걷기, 4~5 숨쉬기, 6 눈 깜빡
  function pose(stage, frame) {
    const G = GAITS[stage];
    if (frame < 4) return { sw: G.sw[frame], up: G.up[frame], blink: false };
    return { sw: 0, up: frame === 5 ? (stage ? -0.8 : -1.2) : 0, blink: frame === 6 };
  }

  // ───────── 몸 ─────────
  function leg(x, cx, dx, lift, col, up, shoe) {
    x.fillStyle = col;
    x.strokeStyle = OL;
    x.lineWidth = 2.6;
    rr(x, cx - 6 + dx, 83 + up * 0.4, 12, 19 - lift, 5);
    x.fill();
    x.stroke();
    ell(x, cx + 3 + dx, 103 - lift, 9, 5);
    x.fillStyle = shoe || '#dee2e6';
    x.fill();
    x.stroke();
    if (shoe === '#ffffff') { // 새 운동화 줄무늬
      x.fillStyle = '#ff8787';
      x.fillRect(cx + dx - 2, 101 - lift, 6, 1.8);
    }
  }

  function arm(x, sx, sy, hx, hy, col, skin) {
    x.lineCap = 'round';
    x.strokeStyle = OL;
    x.lineWidth = 13;
    x.beginPath();
    x.moveTo(sx, sy);
    x.lineTo(hx, hy);
    x.stroke();
    x.strokeStyle = col;
    x.lineWidth = 8;
    x.stroke();
    circle(x, hx, hy + 2, 4.4);
    x.fillStyle = skin;
    x.fill();
    x.lineWidth = 2.2;
    x.strokeStyle = OL;
    x.stroke();
  }

  // 똑바로 선 몸통 (1차)
  function uprightTorso(x, c1, c2, c3, up) {
    x.fillStyle = vgrad(x, 58 + up, 92 + up, c1, c2);
    x.strokeStyle = OL;
    x.lineWidth = 2.6;
    rr(x, 37, 57 + up, 34, 32, 12);
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(20,30,90,0.35)'; // 캥거루 주머니
    x.lineWidth = 1.6;
    rr(x, 45, 75 + up, 19, 9, 4);
    x.stroke();
    x.strokeStyle = '#f1f3f5'; // 후드 끈
    x.lineWidth = 1.8;
    x.beginPath();
    x.moveTo(53, 62 + up);
    x.lineTo(52, 71 + up);
    x.moveTo(59, 62 + up);
    x.lineTo(60, 71 + up);
    x.stroke();
    x.fillStyle = c3; // 목 뒤 후드
    ell(x, 47, 59 + up, 13, 5);
    x.fill();
  }

  // 구부정한 몸통 (2차부터 등이 둥글게 말린다). ragged = 해진 밑단
  function torso(x, c1, c2, up, ragged) {
    x.beginPath();
    x.moveTo(40, 90 + up * 0.4);
    x.quadraticCurveTo(32, 74 + up, 42, 60 + up);
    x.quadraticCurveTo(54, 54 + up, 66, 60 + up);
    x.quadraticCurveTo(73, 72 + up, 70, 90 + up * 0.4);
    if (ragged) {
      for (let i = 0; i <= 6; i++) x.lineTo(70 - i * 5, 90 + up * 0.4 + (i % 2 ? 4 : 0));
    } else x.quadraticCurveTo(55, 94, 40, 90 + up * 0.4);
    x.closePath();
    x.fillStyle = vgrad(x, 56 + up, 92, c1, c2);
    x.fill();
    x.strokeStyle = OL;
    x.lineWidth = 2.6;
    x.stroke();
    x.strokeStyle = 'rgba(30,35,60,0.28)';
    x.lineWidth = 1.5;
    rr(x, 47, 76 + up, 17, 8, 4);
    x.stroke();
  }

  // ───────── 얼굴 ─────────
  function head(x, hx, hy, skin, skin2) {
    const g = x.createRadialGradient(hx - 5, hy - 8, 4, hx, hy, 23);
    g.addColorStop(0, skin);
    g.addColorStop(1, skin2);
    circle(x, hx, hy, 21);
    x.fillStyle = g;
    x.fill();
    x.strokeStyle = OL;
    x.lineWidth = 2.6;
    x.stroke();
  }

  function ear(x, hx, hy, skin) {
    circle(x, hx - 17, hy + 6, 4.6);
    x.fillStyle = skin;
    x.fill();
    x.lineWidth = 2;
    x.strokeStyle = OL;
    x.stroke();
  }

  // style: neat(단정) / messy(부스스) / flat(납작). strands = 삐친 가닥 [각도, 길이, 휨]
  function hair(x, hx, hy, col, style, strands) {
    x.fillStyle = col;
    x.beginPath();
    x.arc(hx, hy, 22.4, Math.PI * 0.86, Math.PI * 2.04);
    if (style === 'flat') {
      x.quadraticCurveTo(hx + 8, hy - 8, hx - 8, hy - 5);
      x.lineTo(hx - 15, hy + 4);
    } else if (style === 'neat') {
      x.lineTo(hx + 19, hy - 3);
      x.quadraticCurveTo(hx + 10, hy - 4, hx + 6, hy - 10);
      x.quadraticCurveTo(hx, hy - 3, hx - 9, hy - 6);
      x.lineTo(hx - 15, hy + 4);
    } else {
      x.lineTo(hx + 19, hy - 1);
      x.lineTo(hx + 15, hy - 6);
      x.lineTo(hx + 11, hy - 1);
      x.lineTo(hx + 7, hy - 9);
      x.lineTo(hx + 2, hy - 2);
      x.lineTo(hx - 3, hy - 9);
      x.lineTo(hx - 8, hy - 1);
      x.lineTo(hx - 12, hy - 6);
      x.lineTo(hx - 15, hy + 4);
    }
    x.lineTo(hx - 20, hy + 11);
    x.closePath();
    x.fill();
    x.strokeStyle = col;
    x.lineCap = 'round';
    x.lineWidth = 3.2;
    for (const [a, l, bend] of strands || []) {
      const sx = hx + Math.cos(a) * 20, sy = hy + Math.sin(a) * 20;
      const ex = hx + Math.cos(a) * (20 + l), ey = hy + Math.sin(a) * (20 + l);
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo((sx + ex) / 2 + bend, (sy + ey) / 2 - Math.abs(bend) * 0.4, ex, ey);
      x.stroke();
    }
  }

  // 다크서클 (depth 0 = 옅은 선 한 줄, 클수록 짙고 겹겹이)
  function bags(x, hx, hy, depth, col) {
    for (const [dx, dy] of [EL, ER]) {
      const cx = hx + dx, cy = hy + dy + 3.4;
      if (depth <= 0) {
        x.strokeStyle = 'rgba(132,94,170,0.35)';
        x.lineWidth = 1.4;
        x.beginPath();
        x.arc(cx, cy - 0.5, 3.8, 0.4, Math.PI - 0.4);
        x.stroke();
        continue;
      }
      x.fillStyle = col || 'rgba(105,75,150,0.42)';
      x.beginPath();
      x.ellipse(cx, cy, 5.2, 3 + depth, 0, 0.05, Math.PI - 0.05);
      x.ellipse(cx, cy - 0.6, 4.6, 1.2, 0, Math.PI - 0.05, 0.05, true);
      x.fill();
      x.strokeStyle = 'rgba(95,65,140,0.55)';
      x.lineWidth = 1.2;
      for (let k = 1; k <= Math.min(2, depth); k++) {
        x.beginPath();
        x.arc(cx, cy - 1.5 + k * 1.8, 4.4 - k * 0.5, 0.45, Math.PI - 0.45);
        x.stroke();
      }
    }
  }

  // 눈 (lid: 눈꺼풀이 내려온 정도 0~1, shine: 눈동자 반짝임)
  function eyes(x, hx, hy, lid, skin, shine) {
    for (const [dx, dy] of [EL, ER]) {
      const cx = hx + dx, cy = hy + dy;
      ell(x, cx, cy + 0.6, 3.4, 2.9);
      x.fillStyle = '#ffffff';
      x.fill();
      circle(x, cx + 0.5, cy + 1.2, 1.9);
      x.fillStyle = '#2b2d42';
      x.fill();
      if (shine) {
        x.fillStyle = '#ffffff';
        circle(x, cx + 1.1, cy + 0.5, 0.7);
        x.fill();
      }
      const ly = cy - 2.6 + 5.4 * lid;
      x.fillStyle = skin;
      x.beginPath();
      x.rect(cx - 4.2, cy - 3.6, 8.4, ly - (cy - 3.6));
      x.fill();
      x.strokeStyle = '#2b2d42';
      x.lineWidth = lid > 0.3 ? 2.2 : 1.8;
      x.lineCap = 'round';
      x.beginPath();
      x.moveTo(cx - 3.8, ly - 0.4);
      x.quadraticCurveTo(cx, ly + (lid > 0.3 ? 0.7 : -0.8), cx + 3.9, ly + (lid > 0.3 ? 0.9 : 0));
      x.stroke();
    }
  }

  function glasses(x, hx, hy, glare) {
    x.strokeStyle = '#2b2d42';
    x.lineWidth = 2;
    x.fillStyle = 'rgba(205,225,245,0.22)';
    for (const [dx, dy] of [EL, ER]) {
      circle(x, hx + dx, hy + dy + 0.5, 6.1);
      x.fill();
      x.stroke();
    }
    x.beginPath();
    x.moveTo(hx + EL[0] + 6.1, hy + 5.5);
    x.quadraticCurveTo(hx + 7.2, hy + 4.4, hx + ER[0] - 6.1, hy + 5.5);
    x.moveTo(hx + EL[0] - 6.1, hy + 5);
    x.lineTo(hx - 15, hy + 4);
    x.stroke();
    if (glare) {
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.lineWidth = 1.3;
      x.beginPath();
      x.arc(hx + ER[0], hy + ER[1] + 0.5, 4, Math.PI * 1.12, Math.PI * 1.42);
      x.stroke();
    }
  }

  function nose(x, hx, hy) {
    x.strokeStyle = 'rgba(150,95,70,0.55)';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(hx + 8.5, hy + 9);
    x.quadraticCurveTo(hx + 10, hy + 11.5, hx + 8, hy + 12);
    x.stroke();
  }

  // 입: line(무표정) / o(멍) / frown(시무룩) / open(헤 벌림) / zig(좀비)
  function mouth(x, hx, hy, kind) {
    const mx = hx + 8, my = hy + 15.5;
    x.strokeStyle = '#8a4a35';
    x.fillStyle = '#6b2f22';
    x.lineWidth = 1.7;
    x.beginPath();
    if (kind === 'o') { ell(x, mx, my, 2.2, 1.5); x.fill(); }
    else if (kind === 'frown') { x.moveTo(mx - 3.5, my + 1); x.quadraticCurveTo(mx, my - 1.8, mx + 3.5, my + 1); x.stroke(); }
    else if (kind === 'open') { ell(x, mx, my + 0.5, 3.2, 4); x.fill(); }
    else if (kind === 'zig') {
      x.moveTo(mx - 5, my);
      for (let i = 1; i <= 5; i++) x.lineTo(mx - 5 + i * 2, my + (i % 2 ? 1.6 : -0.6));
      x.stroke();
    } else { x.moveTo(mx - 3, my); x.quadraticCurveTo(mx, my + 1, mx + 3.5, my - 0.3); x.stroke(); }
  }

  // 학사모 (tilt: 기울기, dx·dy: 흘러내린 정도)
  function cap(x, hx, hy, tilt, sw, dx, dy) {
    x.save();
    x.translate(hx + 1 + dx, hy - 20 + dy);
    x.rotate(tilt);
    x.fillStyle = '#2b2f3a';
    ell(x, 0, 3, 17, 7);
    x.fill();
    x.fillStyle = '#22252e';
    x.strokeStyle = OL;
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(-26, -2);
    x.lineTo(0, -11);
    x.lineTo(26, -2);
    x.lineTo(0, 7);
    x.closePath();
    x.fill();
    x.stroke();
    x.strokeStyle = 'rgba(255,255,255,0.2)';
    x.lineWidth = 1.4;
    x.beginPath();
    x.moveTo(-20, -2.6);
    x.lineTo(0, -9.4);
    x.stroke();
    const ts = -sw * 2; // 술 흔들림
    x.strokeStyle = '#c9a227';
    x.lineWidth = 2.2;
    x.beginPath();
    x.moveTo(0, -2);
    x.lineTo(22, -1.5);
    x.quadraticCurveTo(25 + ts, 5, 24 + ts, 13);
    x.stroke();
    x.fillStyle = '#e0b52c';
    rr(x, 21.5 + ts, 12, 5, 7.5, 2);
    x.fill();
    circle(x, 0, -2, 2.3);
    x.fill();
    x.restore();
  }

  // 아이스 아메리카노 (level 1 가득 ~ 0 빈 컵)
  function coffee(x, cx, cy, level) {
    x.fillStyle = 'rgba(255,255,255,0.92)';
    x.strokeStyle = OL;
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx - 5.5, cy - 12);
    x.lineTo(cx + 5.5, cy - 12);
    x.lineTo(cx + 4, cy + 4);
    x.lineTo(cx - 4, cy + 4);
    x.closePath();
    x.fill();
    x.stroke();
    const top = cy + 3 - 12 * level;
    x.fillStyle = '#6f4326';
    x.beginPath();
    x.moveTo(cx - 4.4, top);
    x.lineTo(cx + 4.4, top);
    x.lineTo(cx + 3.6, cy + 3);
    x.lineTo(cx - 3.6, cy + 3);
    x.closePath();
    x.fill();
    x.strokeStyle = '#2f9e44';
    x.lineWidth = 2;
    x.beginPath();
    x.moveTo(cx + 1, cy - 12);
    x.lineTo(cx + 4, cy - 21);
    x.stroke();
  }

  // 구론산 병
  function bottle(x, cx, cy) {
    rr(x, cx - 4.5, cy - 9, 9, 16, 3);
    x.fillStyle = '#8d5524';
    x.fill();
    x.strokeStyle = OL;
    x.lineWidth = 1.8;
    x.stroke();
    x.fillStyle = '#ffd43b';
    x.fillRect(cx - 4, cy - 4, 8, 5);
    rr(x, cx - 2.5, cy - 14, 5, 6, 1.5);
    x.fillStyle = '#c92a2a';
    x.fill();
  }

  // 머리를 목 기준으로 앞으로 숙인다
  function nodHead(x, up, ang) {
    x.translate(52, 62 + up);
    x.rotate(ang);
    x.translate(-52, -62 - up);
  }

  // ───────── 단계별 모습 ─────────
  // 1차: 아직 생생하다 (파란 후드티, 반짝이는 눈, 반쯤 남은 아이스 아메리카노)
  function stage1(x, p) {
    const sw = p.sw, up = p.up, skin = '#ffe6cf', skin2 = '#f2c39e';
    leg(x, 47, -sw * 5, sw < 0 ? 3 : 0, '#283052', up, '#ffffff');
    arm(x, 43, 65 + up, 39 - sw * 6, 82 + up, '#364fc7', skin);
    leg(x, 61, sw * 5, sw > 0 ? 3 : 0, '#323c66', up, '#ffffff');
    uprightTorso(x, '#748ffc', '#4c6ef5', '#364fc7', up);
    const hx2 = 70 + sw * 5, hy2 = 78 + up;
    arm(x, 65, 65 + up, hx2, hy2, '#4c6ef5', skin);
    coffee(x, hx2 + 3, hy2 - 2, 0.75);
    const hx = 54, hy = 40 + up;
    head(x, hx, hy, skin, skin2);
    hair(x, hx, hy, '#2f2a3d', 'neat', [[-1.75, 6, 3]]);
    ear(x, hx, hy, '#ffd8b8');
    bags(x, hx, hy, 0);
    eyes(x, hx, hy, p.blink ? 1 : 0.12, skin, true);
    glasses(x, hx, hy, true);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'line');
    cap(x, hx, hy, 0, sw, 0, 0);
  }

  // 2차: 밤샘 3일차 (구부정, 반쯤 감긴 눈, 거의 다 마신 커피, 기울어진 학사모)
  function stage2(x, p) {
    const sw = p.sw, up = p.up, skin = '#f4e4d4', skin2 = '#d8bea6';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#353a4c', up);
    arm(x, 44, 65 + up, 41 - sw * 4, 86 + up, '#56617c', skin);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#3f455a', up);
    torso(x, '#8792ae', '#606b87', up);
    x.fillStyle = 'rgba(122,90,58,0.75)'; // 커피 얼룩
    ell(x, 58, 69 + up, 2.8, 2);
    x.fill();
    arm(x, 64, 66 + up, 68 + sw * 3, 86 + up, '#6e7995', skin);
    coffee(x, 71 + sw * 3, 85 + up, 0.25);
    const hx = 55, hy = 43 + up;
    x.save();
    nodHead(x, up, 0.08);
    head(x, hx, hy, skin, skin2);
    hair(x, hx, hy, '#3b3646', 'messy', [[-2.3, 9, 4], [-1.6, 12, -4], [-0.95, 9, 4], [-2.85, 8, -3], [-0.5, 6, 2]]);
    ear(x, hx, hy, '#f0d4bd');
    bags(x, hx, hy, 2);
    eyes(x, hx, hy, p.blink ? 1 : 0.55, skin);
    glasses(x, hx, hy, true);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'o');
    cap(x, hx, hy, -0.3, sw, -3, 1);
    x.restore();
  }

  // 3차: 번아웃 직전 (거의 감긴 눈, 짙은 다크서클, 구론산, 뒤로 흘러내린 학사모. 먹구름은 extras)
  function stage3(x, p) {
    const sw = p.sw, up = p.up, skin = '#f2e5d8', skin2 = '#d5c1ad';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#3a3f4f', up, '#ced4da');
    arm(x, 44, 65 + up, 42 - sw * 3, 88 + up, '#626a7f', skin);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#444a5c', up, '#ced4da');
    torso(x, '#9aa1b4', '#727a8e', up);
    x.fillStyle = 'rgba(122,90,58,0.7)'; // 얼룩이 늘었다
    ell(x, 58, 69 + up, 3, 2.2);
    x.fill();
    ell(x, 49, 82 + up, 2.4, 1.6);
    x.fill();
    arm(x, 64, 66 + up, 67 + sw * 3, 88 + up, '#848ca0', skin);
    bottle(x, 69 + sw * 3, 89 + up);
    const hx = 55, hy = 44 + up;
    x.save();
    nodHead(x, up, 0.11);
    head(x, hx, hy, skin, skin2);
    hair(x, hx, hy, '#3b3646', 'messy', [[-2.4, 10, 4], [-1.7, 13, -5], [-1.0, 11, 5], [-2.9, 9, -3], [-0.45, 8, 3], [-2.0, 7, 2]]);
    ear(x, hx, hy, '#eed5c0');
    bags(x, hx, hy, 3);
    eyes(x, hx, hy, p.blink ? 1 : 0.8, skin);
    glasses(x, hx, hy, false);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'frown');
    cap(x, hx, hy, -0.55, sw, -6, 3);
    x.restore();
  }

  // 4차: 영혼 가출 (빛바랜 회색, 초점 없는 점 눈, 헤 벌린 입. 빠져나가는 영혼은 extras)
  function stage4(x, p) {
    const sw = p.sw, up = p.up, skin = '#f3e8de', skin2 = '#d9c8b8';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#4a4f60', up, '#ced4da');
    arm(x, 44, 65 + up, 42 - sw * 3, 89 + up, '#8b94a7', skin);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#555b6e', up, '#ced4da');
    torso(x, '#b5bcca', '#9099ab', up);
    arm(x, 64, 66 + up, 67 + sw * 3, 90 + up, '#a4acbc', skin);
    const hx = 55, hy = 44 + up;
    x.save();
    nodHead(x, up, 0.12);
    head(x, hx, hy, skin, skin2);
    hair(x, hx, hy, '#4a4554', 'flat');
    x.strokeStyle = '#4a4554'; // 축 늘어진 바보털
    x.lineWidth = 3;
    x.beginPath();
    x.moveTo(hx - 3, hy - 21);
    x.quadraticCurveTo(hx + 4, hy - 31, hx + 11, hy - 23);
    x.stroke();
    ear(x, hx, hy, '#efdccc');
    bags(x, hx, hy, 3, 'rgba(110,90,150,0.38)');
    x.fillStyle = '#2b2d42'; // 서로 다른 곳을 보는 점 눈
    circle(x, hx + EL[0] - 1, hy + 6.8, 1.2);
    x.fill();
    circle(x, hx + ER[0] + 1.6, hy + 4.4, 1.1);
    x.fill();
    glasses(x, hx, hy, false);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'open');
    cap(x, hx, hy, 0.36, sw, 4, 0);
    x.restore();
  }

  // 박사: 좀비 (초록빛 피부, 앞으로 뻗은 팔, 해진 후드티, 금 간 안경, 이마 반창고. 파리는 extras)
  function stage5(x, p) {
    const sw = p.sw, up = p.up, skin = '#cfd9be', skin2 = '#a5b192';
    leg(x, 47, -sw * 4, sw < 0 ? 1 : 0, '#3d4150', up, '#adb5bd');
    arm(x, 44, 66 + up, 76, 69 + up + sw * 2, '#4f5566', skin);
    leg(x, 61, sw * 4, sw > 0 ? 1 : 0, '#474c5d', up, '#adb5bd');
    torso(x, '#6f7584', '#4e5463', up, true);
    x.strokeStyle = 'rgba(255,255,255,0.35)'; // 찢어진 자국
    x.lineWidth = 1.2;
    x.beginPath();
    x.moveTo(60, 66 + up);
    x.lineTo(63, 70 + up);
    x.lineTo(60, 73 + up);
    x.stroke();
    arm(x, 64, 67 + up, 84, 72 + up - sw * 2, '#5c6273', skin);
    const hx = 56, hy = 45 + up;
    x.save();
    nodHead(x, up, 0.16 + sw * 0.04);
    head(x, hx, hy, skin, skin2);
    hair(x, hx, hy, '#33303b', 'messy', [[-2.2, 7, 4], [-1.3, 9, -3], [-0.7, 6, 3]]);
    ear(x, hx, hy, '#c4cfb2');
    x.fillStyle = 'rgba(60,40,70,0.55)'; // 퀭한 눈
    for (const [dx, dy] of [EL, ER]) { ell(x, hx + dx, hy + dy + 1, 4.4, 4); x.fill(); }
    x.fillStyle = '#f8f9fa';
    for (const [dx, dy] of [EL, ER]) { circle(x, hx + dx + 0.6, hy + dy + 1.2, 1.1); x.fill(); }
    glasses(x, hx, hy, false);
    x.strokeStyle = '#2b2d42'; // 금 간 안경알
    x.lineWidth = 1;
    x.beginPath();
    x.moveTo(hx + ER[0] - 4, hy + ER[1] - 3);
    x.lineTo(hx + ER[0] + 1, hy + ER[1] + 1);
    x.lineTo(hx + ER[0] - 1, hy + ER[1] + 4);
    x.stroke();
    nose(x, hx, hy);
    mouth(x, hx, hy, 'zig');
    x.save(); // 이마 반창고
    x.translate(hx - 5, hy - 9);
    x.rotate(-0.5);
    x.fillStyle = '#ffe8cc';
    rr(x, -7, -2.5, 14, 5, 2);
    x.fill();
    x.strokeStyle = '#e8b78a';
    x.lineWidth = 0.8;
    x.stroke();
    x.restore();
    cap(x, hx, hy, 0.25, sw, 6, -1);
    x.restore();
  }

  // ───────── Wet lab: 흰 가운 · 보라색 니트릴 장갑 · 포니테일 · 이마 위 보안경 ─────────
  const GLOVE = '#845ef7';

  // 가운 (어깨부터 허벅지까지 덮는다). slouch = 구부정, ragged = 해진 밑단, stains = [x, y, r, 색]
  function coat(x, up, slouch, c1, c2, opt) {
    x.beginPath();
    if (slouch) {
      x.moveTo(37, 97);
      x.quadraticCurveTo(30, 76 + up, 42, 60 + up);
      x.quadraticCurveTo(54, 54 + up, 66, 60 + up);
      x.quadraticCurveTo(75, 77 + up, 73, 97);
    } else {
      x.moveTo(37, 97);
      x.lineTo(39, 64 + up);
      x.quadraticCurveTo(40, 57 + up, 47, 57 + up);
      x.lineTo(62, 57 + up);
      x.quadraticCurveTo(69, 57 + up, 69.5, 64 + up);
      x.lineTo(72, 97);
    }
    if (opt.ragged) for (let i = 0; i <= 7; i++) x.lineTo(73 - (i * 36) / 7, 97 + (i % 2 ? 4 : 0));
    x.closePath();
    x.fillStyle = vgrad(x, 56 + up, 98, c1, c2);
    x.fill();
    x.strokeStyle = OL;
    x.lineWidth = 2.6;
    x.stroke();
    x.fillStyle = opt.shirt || '#20c997'; // 안에 입은 티셔츠
    x.beginPath();
    x.moveTo(49, 59 + up);
    x.lineTo(61, 59 + up);
    x.lineTo(55, 71 + up);
    x.closePath();
    x.fill();
    x.strokeStyle = 'rgba(80,90,110,0.55)'; // 깃 · 여밈
    x.lineWidth = 1.6;
    x.beginPath();
    x.moveTo(48, 58 + up);
    x.lineTo(55, 74 + up);
    x.lineTo(62, 58 + up);
    x.moveTo(55, 74 + up);
    x.lineTo(55, 96);
    x.stroke();
    x.fillStyle = '#adb5bd'; // 단추
    circle(x, 57.5, 80 + up * 0.7, 1.4);
    x.fill();
    circle(x, 57.5, 88 + up * 0.4, 1.4);
    x.fill();
    x.fillStyle = '#e03131'; // 가슴 주머니에 꽂은 펜
    x.fillRect(43.5, 61.5 + up, 1.8, 5);
    x.fillStyle = '#1c7ed6';
    x.fillRect(46, 61 + up, 1.8, 5.5);
    x.strokeStyle = 'rgba(80,90,110,0.45)';
    x.lineWidth = 1.3;
    x.strokeRect(42, 65 + up, 9, 7);
    x.beginPath(); // 아래 주머니
    x.moveTo(41, 86 + up * 0.5);
    x.lineTo(50, 86 + up * 0.5);
    x.moveTo(60, 86 + up * 0.5);
    x.lineTo(69, 86 + up * 0.5);
    x.stroke();
    for (const [sx, sy, r, col] of opt.stains || []) { // 시약 얼룩
      x.fillStyle = col;
      ell(x, sx, sy + up * 0.6, r, r * 0.75);
      x.fill();
    }
  }

  // 뒤로 묶은 머리 (droop: 처진 정도, frizz: 삐져나온 가닥 수)
  function ponytail(x, hx, hy, col, droop, frizz) {
    x.fillStyle = col;
    x.beginPath();
    x.moveTo(hx - 14, hy - 11);
    x.quadraticCurveTo(hx - 35, hy - 7 + droop * 9, hx - 27 + droop * 3, hy + 15 + droop * 6);
    x.quadraticCurveTo(hx - 23, hy + 4, hx - 12, hy - 1);
    x.closePath();
    x.fill();
    x.strokeStyle = col;
    x.lineWidth = 2.2;
    x.lineCap = 'round';
    for (let i = 0; i < frizz; i++) {
      const t0 = 0.3 + i * 0.22, px = hx - 30 + i * 2, py = hy + t0 * 14;
      x.beginPath();
      x.moveTo(px, py);
      x.quadraticCurveTo(px - 6, py - 2 + i, px - 8, py + 4);
      x.stroke();
    }
    x.fillStyle = '#f06595'; // 머리끈
    circle(x, hx - 15, hy - 7, 2.6);
    x.fill();
  }

  // 옆으로 넘긴 앞머리. style: neat / messy / flat
  function sideHair(x, hx, hy, col, style, strands) {
    x.fillStyle = col;
    x.beginPath();
    x.arc(hx, hy, 22.4, Math.PI * 0.86, Math.PI * 2.04);
    if (style === 'flat') {
      x.quadraticCurveTo(hx + 8, hy - 8, hx - 8, hy - 5);
      x.lineTo(hx - 15, hy + 4);
    } else {
      x.lineTo(hx + 19, hy - 2);
      x.quadraticCurveTo(hx + 9, hy - 2, hx + 3, hy - 9);
      x.quadraticCurveTo(hx - 5, hy - 3, hx - 14, hy + 3);
      if (style === 'messy') x.lineTo(hx - 12, hy - 4);
    }
    x.lineTo(hx - 20, hy + 11);
    x.closePath();
    x.fill();
    x.strokeStyle = col;
    x.lineCap = 'round';
    x.lineWidth = 3;
    for (const [a, l, bend] of strands || []) {
      const sx = hx + Math.cos(a) * 20, sy = hy + Math.sin(a) * 20;
      const ex = hx + Math.cos(a) * (20 + l), ey = hy + Math.sin(a) * (20 + l);
      x.beginPath();
      x.moveTo(sx, sy);
      x.quadraticCurveTo((sx + ex) / 2 + bend, (sy + ey) / 2 - Math.abs(bend) * 0.4, ex, ey);
      x.stroke();
    }
  }

  // 보안경: 이마 위(dy 로 흘러내림) 또는 neck = 목에 걸침
  function goggles(x, hx, hy, dy, tilt, cracked, neck) {
    x.save();
    if (neck) {
      x.translate(hx + 2, hy + 25);
      x.rotate(0.1);
    } else {
      x.translate(hx + 7, hy - 10 + dy);
      x.rotate(tilt);
      x.strokeStyle = '#495057'; // 머리를 두른 끈
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(-29, 3);
      x.quadraticCurveTo(-18, -1, -12, 0);
      x.moveTo(13, 0);
      x.quadraticCurveTo(15, 0, 16, 2);
      x.stroke();
    }
    x.lineWidth = 1.8;
    x.strokeStyle = '#343a40';
    for (const lx of [-12.5, 1.5]) {
      rr(x, lx, -5, 11, 9, 4);
      x.fillStyle = 'rgba(165,216,255,0.75)';
      x.fill();
      x.stroke();
      x.strokeStyle = 'rgba(255,255,255,0.9)';
      x.beginPath();
      x.moveTo(lx + 2.5, -2.5);
      x.lineTo(lx + 5, -2.5);
      x.stroke();
      x.strokeStyle = '#343a40';
    }
    x.beginPath();
    x.moveTo(-1.5, -1);
    x.lineTo(1.5, -1);
    x.stroke();
    if (cracked) {
      x.strokeStyle = '#212529';
      x.lineWidth = 0.9;
      x.beginPath();
      x.moveTo(3, -4);
      x.lineTo(7, 0);
      x.lineTo(5, 3);
      x.moveTo(7, 0);
      x.lineTo(11, -1);
      x.stroke();
    }
    x.restore();
  }

  // 삼각 플라스크 (색 용액)
  function erlenmeyer(x, cx, cy, col, level) {
    x.beginPath();
    x.moveTo(cx - 2.5, cy - 13);
    x.lineTo(cx + 2.5, cy - 13);
    x.lineTo(cx + 2.5, cy - 7);
    x.lineTo(cx + 8, cy + 4);
    x.lineTo(cx - 8, cy + 4);
    x.lineTo(cx - 2.5, cy - 7);
    x.closePath();
    x.fillStyle = 'rgba(248,249,250,0.92)';
    x.fill();
    x.save();
    x.clip();
    x.fillStyle = col;
    x.fillRect(cx - 9, cy + 4 - 12 * level, 18, 14);
    x.fillStyle = 'rgba(255,255,255,0.4)';
    x.fillRect(cx - 9, cy + 4 - 12 * level, 18, 1.5);
    x.restore();
    x.strokeStyle = OL;
    x.lineWidth = 1.8;
    x.stroke();
  }

  // 비커에 담은 커피 (실험실 국룰)
  function beakerCoffee(x, cx, cy, level) {
    x.beginPath();
    x.moveTo(cx - 6, cy - 11);
    x.lineTo(cx + 7, cy - 11);
    x.lineTo(cx + 6, cy + 4);
    x.lineTo(cx - 5, cy + 4);
    x.closePath();
    x.fillStyle = 'rgba(248,249,250,0.92)';
    x.fill();
    x.save();
    x.clip();
    x.fillStyle = '#6f4326';
    x.fillRect(cx - 7, cy + 4 - 14 * level, 15, 16);
    x.restore();
    x.strokeStyle = OL;
    x.lineWidth = 1.8;
    x.stroke();
    x.strokeStyle = 'rgba(80,90,110,0.6)'; // 눈금
    x.lineWidth = 0.8;
    x.beginPath();
    for (let i = 0; i < 3; i++) { x.moveTo(cx - 4, cy - 7 + i * 4); x.lineTo(cx - 1, cy - 7 + i * 4); }
    x.stroke();
  }

  // 1차: 깨끗한 가운, 반짝이는 눈, 파란 용액이 든 플라스크
  function wet1(x, p) {
    const sw = p.sw, up = p.up, skin = '#ffe6cf', skin2 = '#f2c39e', hair = '#4a3426';
    leg(x, 47, -sw * 5, sw < 0 ? 3 : 0, '#343a40', up, '#ffffff');
    arm(x, 43, 65 + up, 39 - sw * 6, 82 + up, '#e9ecef', GLOVE);
    leg(x, 61, sw * 5, sw > 0 ? 3 : 0, '#3d434a', up, '#ffffff');
    coat(x, up, false, '#ffffff', '#e3e7ec', {});
    const hx2 = 70 + sw * 5, hy2 = 78 + up;
    arm(x, 65, 65 + up, hx2, hy2, '#f8f9fa', GLOVE);
    erlenmeyer(x, hx2 + 3, hy2 - 3, '#4dabf7', 0.6);
    const hx = 54, hy = 40 + up;
    ponytail(x, hx, hy, hair, 0, 0);
    head(x, hx, hy, skin, skin2);
    sideHair(x, hx, hy, hair, 'neat');
    ear(x, hx, hy, '#ffd8b8');
    bags(x, hx, hy, 0);
    eyes(x, hx, hy, p.blink ? 1 : 0.1, skin, true);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'line');
    goggles(x, hx, hy, 0, 0, false, false);
  }

  // 2차: 밤샘 실험 (구부정, 얼룩 두 개, 비커 커피, 삐뚤어진 보안경)
  function wet2(x, p) {
    const sw = p.sw, up = p.up, skin = '#f4e4d4', skin2 = '#d8bea6', hair = '#4a3426';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#343a40', up);
    arm(x, 44, 65 + up, 41 - sw * 4, 86 + up, '#e3e7ec', GLOVE);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#3d434a', up);
    coat(x, up, true, '#fbfbfc', '#dbe0e6', { stains: [[45, 80, 2.6, 'rgba(250,176,5,0.7)'], [64, 70, 2.2, 'rgba(240,101,149,0.6)']] });
    arm(x, 64, 66 + up, 68 + sw * 3, 86 + up, '#f1f3f5', GLOVE);
    beakerCoffee(x, 71 + sw * 3, 84 + up, 0.5);
    const hx = 55, hy = 43 + up;
    x.save();
    nodHead(x, up, 0.08);
    ponytail(x, hx, hy, hair, 0.3, 2);
    head(x, hx, hy, skin, skin2);
    sideHair(x, hx, hy, hair, 'messy', [[-1.6, 8, -3], [-2.6, 7, 3]]);
    ear(x, hx, hy, '#f0d4bd');
    bags(x, hx, hy, 2);
    eyes(x, hx, hy, p.blink ? 1 : 0.55, skin);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'o');
    goggles(x, hx, hy, 1, -0.15, false, false);
    x.restore();
  }

  // 3차: 번아웃 직전 (얼룩 투성이, 흘러내린 보안경, 거의 빈 비커. 먹구름은 extras)
  function wet3(x, p) {
    const sw = p.sw, up = p.up, skin = '#f2e5d8', skin2 = '#d5c1ad', hair = '#4a3426';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#343a40', up, '#ced4da');
    arm(x, 44, 65 + up, 42 - sw * 3, 88 + up, '#dde1e7', GLOVE);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#3d434a', up, '#ced4da');
    coat(x, up, true, '#f4f5f7', '#d1d6dd', {
      stains: [[45, 80, 3, 'rgba(250,176,5,0.75)'], [64, 70, 2.6, 'rgba(240,101,149,0.65)'], [52, 90, 2.4, 'rgba(64,192,87,0.6)'], [67, 86, 3.2, 'rgba(77,171,247,0.6)'], [41, 70, 2, 'rgba(121,80,242,0.55)']],
    });
    arm(x, 64, 66 + up, 67 + sw * 3, 88 + up, '#e9ecef', GLOVE);
    beakerCoffee(x, 69 + sw * 3, 89 + up, 0.12);
    const hx = 55, hy = 44 + up;
    x.save();
    nodHead(x, up, 0.11);
    ponytail(x, hx, hy, hair, 0.6, 4);
    head(x, hx, hy, skin, skin2);
    sideHair(x, hx, hy, hair, 'messy', [[-1.6, 10, -4], [-2.6, 9, 3], [-1.05, 8, 4], [-2.1, 7, -2]]);
    ear(x, hx, hy, '#eed5c0');
    bags(x, hx, hy, 3);
    eyes(x, hx, hy, p.blink ? 1 : 0.8, skin);
    nose(x, hx, hy);
    mouth(x, hx, hy, 'frown');
    goggles(x, hx, hy, 5, -0.3, false, false);
    x.restore();
  }

  // 4차: 영혼 가출 (누레진 가운, 목에 걸린 보안경, 점 눈. 영혼은 extras)
  function wet4(x, p) {
    const sw = p.sw, up = p.up, skin = '#f3e8de', skin2 = '#d9c8b8', hair = '#5a4a3f';
    leg(x, 47, -sw * 4, sw < 0 ? 2 : 0, '#495057', up, '#ced4da');
    arm(x, 44, 65 + up, 42 - sw * 3, 89 + up, '#cfd4da', GLOVE);
    leg(x, 61, sw * 4, sw > 0 ? 2 : 0, '#545b63', up, '#ced4da');
    coat(x, up, true, '#e6e8ec', '#bfc5ce', { shirt: '#96b5ad', stains: [[45, 80, 3, 'rgba(173,181,189,0.7)'], [66, 84, 3, 'rgba(173,181,189,0.6)']] });
    arm(x, 64, 66 + up, 67 + sw * 3, 90 + up, '#d8dce1', GLOVE);
    const hx = 55, hy = 44 + up;
    x.save();
    nodHead(x, up, 0.12);
    ponytail(x, hx, hy, hair, 1, 3);
    head(x, hx, hy, skin, skin2);
    sideHair(x, hx, hy, hair, 'flat');
    ear(x, hx, hy, '#efdccc');
    bags(x, hx, hy, 3, 'rgba(110,90,150,0.38)');
    x.fillStyle = '#2b2d42';
    circle(x, hx + EL[0] - 1, hy + 6.8, 1.2);
    x.fill();
    circle(x, hx + ER[0] + 1.6, hy + 4.4, 1.1);
    x.fill();
    nose(x, hx, hy);
    mouth(x, hx, hy, 'open');
    x.restore();
    goggles(x, hx, hy, 0, 0, false, true);
  }

  // 박사: 좀비 (초록빛 피부, 찢어진 가운, 형광 얼룩, 금 간 보안경. 파리는 extras)
  function wet5(x, p) {
    const sw = p.sw, up = p.up, skin = '#cfd9be', skin2 = '#a5b192', hair = '#3b3029';
    leg(x, 47, -sw * 4, sw < 0 ? 1 : 0, '#3d4150', up, '#adb5bd');
    arm(x, 44, 66 + up, 76, 69 + up + sw * 2, '#c3c9d0', skin);
    leg(x, 61, sw * 4, sw > 0 ? 1 : 0, '#474c5d', up, '#adb5bd');
    coat(x, up, true, '#d3d8de', '#9aa2ad', { shirt: '#5c7a72', ragged: true, stains: [[46, 80, 3.4, 'rgba(148,216,45,0.85)'], [64, 72, 2.8, 'rgba(148,216,45,0.8)'], [56, 92, 2.4, 'rgba(121,80,242,0.6)']] });
    arm(x, 64, 67 + up, 84, 72 + up - sw * 2, '#d0d5db', skin);
    x.fillStyle = GLOVE; // 찢어진 장갑 조각
    circle(x, 84, 75 + up - sw * 2, 2.2);
    x.fill();
    const hx = 56, hy = 45 + up;
    x.save();
    nodHead(x, up, 0.16 + sw * 0.04);
    ponytail(x, hx, hy, hair, 0.8, 4);
    head(x, hx, hy, skin, skin2);
    sideHair(x, hx, hy, hair, 'messy', [[-2.2, 7, 4], [-1.3, 9, -3], [-0.7, 6, 3]]);
    ear(x, hx, hy, '#c4cfb2');
    x.fillStyle = 'rgba(60,40,70,0.55)'; // 퀭한 눈
    for (const [dx, dy] of [EL, ER]) { ell(x, hx + dx, hy + dy + 1, 4.4, 4); x.fill(); }
    x.fillStyle = '#f8f9fa';
    for (const [dx, dy] of [EL, ER]) { circle(x, hx + dx + 0.6, hy + dy + 1.2, 1.1); x.fill(); }
    nose(x, hx, hy);
    mouth(x, hx, hy, 'zig');
    x.save(); // 뺨 반창고
    x.translate(hx - 7, hy + 12);
    x.rotate(0.4);
    x.fillStyle = '#ffe8cc';
    rr(x, -6, -2.3, 12, 4.6, 2);
    x.fill();
    x.strokeStyle = '#e8b78a';
    x.lineWidth = 0.8;
    x.stroke();
    x.restore();
    goggles(x, hx, hy, 0, 0.12, true, false);
    x.restore();
  }

  const PAINT = { dry: [stage1, stage2, stage3, stage4, stage5], wet: [wet1, wet2, wet3, wet4, wet5] };
  // 단계가 바뀔 때 머리 위에 잠깐 뜨는 말
  const LABELS = {
    dry: ['', '밤샘 모드…', '번아웃 직전…', '영혼 가출…', '좀비가 되었다…'],
    wet: ['', '밤샘 실험…', '번아웃 직전…', '영혼 가출…', '좀비가 되었다…'],
  };

  function paint(x, stage, p, char) {
    x.lineJoin = 'round';
    x.lineCap = 'round';
    (PAINT[char] || PAINT.dry)[stage](x, p);
  }

  // ───────── 움직이는 장식 (설계 좌표, 매 프레임) ─────────
  function extras(x, stage, t, up) {
    if (stage === 2) { // 3차: 머리 위 먹구름 + 빗방울
      const cx = 59, cy = 6 + up;
      x.fillStyle = 'rgba(73,80,87,0.92)';
      for (const [dx, dy, r] of [[-9, 2, 6.5], [0, -2, 8], [9, 2, 6.5], [4, 5, 6], [-4, 5, 6]]) {
        circle(x, cx + dx, cy + dy, r);
        x.fill();
      }
      x.strokeStyle = 'rgba(116,192,252,0.95)';
      x.lineWidth = 1.6;
      x.lineCap = 'round';
      for (let k = 0; k < 3; k++) {
        const ph = (t * 1.6 + k * 0.33) % 1;
        x.globalAlpha = 1 - ph;
        x.beginPath();
        x.moveTo(cx - 7 + k * 7, cy + 11 + ph * 10);
        x.lineTo(cx - 8 + k * 7, cy + 15 + ph * 10);
        x.stroke();
      }
      x.globalAlpha = 1;
    } else if (stage === 3) { // 4차: 입에서 빠져나가는 영혼
      const hx = 55, hy = 44 + up, rise = (t * 5) % 5;
      const wx = hx + 33 + Math.sin(t * 2.6) * 2.5, wy = hy - 4 - rise;
      x.save();
      x.globalAlpha = 0.92;
      x.fillStyle = '#ffffff';
      x.strokeStyle = 'rgba(110,130,175,0.95)';
      x.lineWidth = 1.6;
      x.beginPath();
      x.moveTo(hx + 10, hy + 15);
      x.bezierCurveTo(hx + 20, hy + 17, wx - 8, wy + 12, wx - 6.5, wy + 1);
      x.arc(wx, wy, 6.5, Math.PI, 0);
      x.bezierCurveTo(wx + 7, wy + 7, wx - 2, hy + 19, hx + 11, hy + 17.5);
      x.closePath();
      x.fill();
      x.stroke();
      x.fillStyle = '#2b2d42';
      circle(x, wx - 2.2, wy - 0.5, 1);
      x.fill();
      circle(x, wx + 2.2, wy - 0.5, 1);
      x.fill();
      x.restore();
    } else if (stage === 4) { // 박사: 맴도는 파리
      const hx = 56, hy = 45 + up;
      x.strokeStyle = 'rgba(73,80,87,0.8)';
      x.lineWidth = 1;
      for (let k = 0; k < 2; k++) {
        const a = t * 5 + k * Math.PI, fx = hx + Math.cos(a) * 16, fy = hy - 34 + Math.sin(a * 1.3) * 5;
        x.fillStyle = '#343a40';
        circle(x, fx, fy, 1.4);
        x.fill();
        x.beginPath();
        x.moveTo(fx - 2.5, fy - 1.5);
        x.lineTo(fx, fy);
        x.lineTo(fx + 2.5, fy - 1.5);
        x.stroke();
      }
    }
  }

  GS.Student = { pose, paint, extras, LABELS, GAITS };

  // ───────── 스프라이트 · 큰 그림 ─────────
  // char 'dry' / 'wet', stage 0~4, frame 0~3 걷기 · 4~5 숨쉬기 · 6 눈 깜빡
  P.playerSprite = function (stage, frame, char) {
    char = char || 'dry';
    return this.sprite('player:' + char + stage + ':' + frame, 52, 60, (x) => {
      x.scale(0.5, 0.5);
      paint(x, stage, pose(stage, frame), char);
    });
  };

  // 타이틀 화면·캐릭터 선택·소개 영상용 큰 주인공 그림 (1차 모습, 가로 px · 세로 1.16배)
  GS.heroCanvas = function (px, char) {
    const c = document.createElement('canvas');
    c.width = px;
    c.height = Math.round(px * 1.16);
    const x = c.getContext('2d');
    x.scale(px / 104, px / 104);
    paint(x, 0, pose(0, 4), char || 'dry');
    return c;
  };
  GS.heroDataURL = (px, char) => GS.heroCanvas(px, char).toDataURL();
})(window.GS = window.GS || {});
