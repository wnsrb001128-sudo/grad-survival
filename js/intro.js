// 게임 소개 영상 (발표용 플레이 설명, 약 1분): media/intro.mp4 가 없을 때 타이틀의 '소개 영상' 버튼으로 재생된다
// 게임 엔진으로 장면을 직접 연출해 그린다 (창 크기에 맞춰 선명하게). 장면은 아래 SCENES 에서 고치고,
// tools/intro.html 에서 같은 영상을 MP4 파일로 내보낼 수 있다
// 순서: 타이틀 → 캐릭터 → 기본 플레이 → 진화 → 보스 패턴(4분할) → 학기 진행 → 결말 → 박사 과정 → 마무리
(function (GS) {
  'use strict';
  const RR = GS.R;
  const SW = 1280, SH = 720; // 글자·카드 배치 기준 크기 (실제 화면에 맞춰 늘어난다)
  const TAU = Math.PI * 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const URL_TEXT = 'grad-survival.vercel.app';

  // 자막 (명사형으로 끝낸다)
  const CAP = {
    char: 'Dry lab · Wet lab — 캐릭터마다 다른 전용 무기와 맵',
    move: '이동만 하면 무기가 알아서 공격',
    level: '지식을 모아 레벨업 — 무기 및 패시브 설정',
    evolve: '같은 무기 Lv 8 달성 시 진화',
    patterns: '다양한 보스 공격 패턴',
    semester: '4분 간격으로 학기 진행',
    ending: '실적 40,000 + 최종 보스 격파 시 취업 / 실패 시 박사 과정(무한 모드)',
    phd1: '박사 과정 — 시간 제한 없는 무한 웨이브, 버틴 시간이 곧 기록',
    phd2: '2분마다 보스 등장, 갈수록 강해지는 적',
  };
  // 보스 패턴 4분할: 왼쪽 위 → 오른쪽 위 → 왼쪽 아래 → 오른쪽 아래. 칸마다 패턴을 every 초마다 다시 쓴다
  // over: 4분할 칸 안에 다 보이도록 패턴 수치를 조금 바꾼다
  const QUADS = [
    { label: '1학기 · 기말고사', name: '「OMR 답안 마킹」', col: '#ff8787', char: 'dry', weapon: 'pen', chapter: 0, boss: 'final_exam', bx: 300, by: -150, pattern: 'omr', every: 2.4, crowd: ['lecture', 'errand'] },
    { label: '2학기 · 과제 킥오프 미팅', name: '「로켓 발진」', col: '#74c0fc', char: 'wet', weapon: 'pipette', chapter: 1, boss: 'kickoff', bx: -330, by: -20, pattern: 'rush', every: 2.6, crowd: ['la', 'oa'] },
    { label: '3학기 · 학회 포스터 발표', name: '「질문 행렬」', col: '#b197fc', char: 'dry', weapon: 'textbook', chapter: 2, boss: 'poster', bx: 300, by: 170, pattern: 'wall', every: 2.5, crowd: ['project_meeting', 'bug'], over: { dist: 230, warn: 0.6, speed: 260 } },
    { label: '4학기 · 졸업논문 심사', name: '「발표자 조명」', col: '#ffd43b', char: 'wet', weapon: 'flask', chapter: 3, boss: 'thesis_defense', rank: 'FINAL BOSS', bx: -320, by: -110, pattern: 'spotlight', every: 3, crowd: ['proposal'] },
  ];
  const QZ = 0.62; // 4분할 칸의 확대 배율 (한 칸에 보스와 패턴이 다 들어오게 멀리서 본다)
  // 학기 진행 장면의 학기 이름표
  const SEMS = [
    ['1차 · 석사 1학기', '아직 생생', '#4c6ef5'],
    ['2차 · 석사 2학기', '밤샘 3일차', '#f08c00'],
    ['3차 · 석사 3학기', '번아웃 직전', '#e8590c'],
    ['4차 · 석사 4학기', '영혼 가출', '#7048e8'],
  ];
  const SEM_ENEMIES = [
    ['lecture', 'errand', 'progress', 'lecture'],
    ['la', 'ta', 'oa', 'lab_meeting'],
    ['project_meeting', 'bug', 'nan', 'revision'],
    ['proposal', 'reviewer2', 'interview', 'deadline'],
  ];
  // 학기 진행 장면 오른쪽의 '등장 적' 목록: 그 학기에 새로 나오는 적 (보스가 부르거나 쪼개져 나오는 적은 뺀다)
  // 아래에 붙는 중간보스 · 보스는 data/chapters.js 에서 가져온다
  const SEM_ROSTER = [
    ['lecture', 'errand', 'progress', 'midterm'],
    ['la', 'ta', 'oa', 'lab_meeting', 'win_update', 'grading', 'plot'],
    ['project_meeting', 'revision', 'bug', 'nan', 'lang'],
    ['proposal', 'reviewer2', 'deadline', 'interview', 'thesis_draft'],
  ];
  const SEM_STEP = 2.3; // 학기 진행 장면에서 한 학기를 보여 주는 시간 (초)
  // 레벨업 · 진화 카드 (게임의 카드와 같은 모양으로 다시 그린다)
  const CARDS = [
    { kind: 'weapon', icon: { custom: 'swatter' }, name: '파리채', tag: '새 무기!', isNew: true, desc: '바라보는 방향을 휘젓는 근접 무기. 일반 적의 탄을 막아 낸다' },
    { kind: 'passive', icon: '☕', name: 'FAV 커피', tag: '패시브 · 새로 얻기', isNew: true, desc: '공격력 +10%' },
    { kind: 'weapon', icon: '⌨️', name: '키보드', tag: 'Lv 1 → 2', desc: '키캡 +2' },
  ];
  const EVO_CARD = { kind: 'evolve', icon: '🖍️', name: '교수님의 빨간펜', tag: '진화! 펜 →', desc: '쉴 새 없이 쏟아지는 첨삭. 적을 끝까지 쫓아가 4마리까지 꿰뚫는다' };
  const JUDGE = {
    job: { title: '4학기 종료 · 취업 판정', rows: [[true, '연구 실적 52,340 / 40,000'], [true, '최종 보스 「졸업논문 심사」 격파']], result: '취업 성공!', icon: '🎉', color: '#2f9e44',
      note: '취업 후에도 원하면 「그래도 박사 진학」으로 무한 모드 선택 가능' },
    phd: { title: '4학기 종료 · 취업 판정', rows: [[true, '연구 실적 46,120 / 40,000'], [false, '최종 보스 「졸업논문 심사」 격파']], result: '박사 과정 진학 — 끝없는 무한 모드', icon: '🎓', color: '#7048e8' },
  };

  // 영상에 나오는 모든 글자 (MP4 를 만들기 전에 이 글자들의 웹 글꼴을 미리 불러온다)
  function texts() {
    const C = GS.data.characters, W = GS.data.weapons, cfg = GS.data.config, E = GS.data.enemies, CH = GS.data.chapters;
    const out = [cfg.title, cfg.subtitle, URL_TEXT, '레벨 업! 카드 1장을 고르세요 진화!'];
    for (const k in CAP) out.push(CAP[k]);
    QUADS.forEach((q) => out.push(q.label + ' ' + q.name));
    SEMS.forEach((s) => out.push(s[0] + ' ' + s[1]));
    SEM_ROSTER.forEach((ids, i) => {
      out.push(CH[i].name + ' 등장 적 ' + ids.map((id) => E[id].name).join(' '));
      [CH[i].midBoss, CH[i].boss].forEach((b) => { if (b) out.push(E[b.enemy].name); });
    });
    out.push('중간보스 보스 최종 보스');
    CARDS.concat([EVO_CARD]).forEach((c) => out.push(c.name + ' ' + c.tag + ' ' + c.desc));
    for (const k in JUDGE) out.push(JUDGE[k].title + ' ' + JUDGE[k].result + ' ' + (JUDGE[k].note || '') + ' ' + JUDGE[k].rows.map((r) => r[1]).join(' '));
    for (const id in C) out.push(C[id].name + ' ' + C[id].lab + ' ' + Object.keys(W).filter((w) => W[w].only === id).map((w) => W[w].name).join(' '));
    return out.join(' ');
  }

  function create(R) {
    const x = R.ctx, FONT = RR.FONT, E = GS.Enemies;
    const heroes = [GS.heroCanvas(400, 'dry'), GS.heroCanvas(400, 'wet')]; // 끝 장면의 두 주인공
    try { // 게임 안에서 재생할 때도 영상 글자의 웹 글꼴을 미리 받아 둔다
      const all = texts();
      document.fonts.load('40px "Black Han Sans"', all);
      [600, 700, 800, 900].forEach((w) => document.fonts.load(`${w} 26px "Pretendard"`, all));
    } catch (e) { /* 글꼴을 못 받으면 기본 글꼴로 그린다 */ }

    // ───────── 그리기 도구 ─────────
    function stage() { // 1280×720 기준 좌표를 화면 가운데에 맞춘다
      const s = Math.min(R.cssW / SW, R.cssH / SH), ox = (R.cssW - SW * s) / 2, oy = (R.cssH - SH * s) / 2;
      x.setTransform(R.dpr * s, 0, 0, R.dpr * s, R.dpr * ox, R.dpr * oy);
    }
    function fill(color) {
      x.setTransform(1, 0, 0, 1, 0, 0);
      x.fillStyle = color;
      x.fillRect(0, 0, R.canvas.width, R.canvas.height);
    }
    function white(a) { if (a > 0) fill(`rgba(255,255,255,${clamp01(a).toFixed(3)})`); }
    function fadeIn(t) { white(0.8 * (1 - t / 0.4)); } // 장면이 바뀔 때 부드럽게 밝아지며 넘어간다
    function dim(a) { if (a > 0) fill(`rgba(20,27,46,${clamp01(a).toFixed(3)})`); }
    function wrap(text, maxW) { // 띄어쓰기 단위로 줄 나누기 (현재 글꼴 기준)
      const lines = [];
      let cur = '';
      for (const w of text.split(' ')) {
        const t = cur ? cur + ' ' + w : w;
        if (cur && x.measureText(t).width > maxW) { lines.push(cur); cur = w; } else cur = t;
      }
      if (cur) lines.push(cur);
      return lines;
    }
    // 게임 제목 로고: 작은 줄 + 큰 줄
    function logo(cx, cy, s, alpha) {
      const words = GS.data.config.title.split(' '), big = words.pop(), small = words.join(' ');
      stage();
      x.save();
      x.globalAlpha = alpha;
      x.translate(cx, cy);
      x.scale(s, s);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.lineJoin = 'round';
      if (small) {
        x.font = RR.dfont(46);
        if ('letterSpacing' in x) x.letterSpacing = '10px';
        x.lineWidth = 10;
        x.strokeStyle = '#fff';
        x.strokeText(small, 0, -70);
        x.fillStyle = '#3b5bdb';
        x.fillText(small, 0, -70);
        if ('letterSpacing' in x) x.letterSpacing = '0px';
      }
      x.font = RR.dfont(132);
      x.lineWidth = 16;
      x.strokeStyle = '#fff';
      x.strokeText(big, 0, 30);
      const g = x.createLinearGradient(0, -30, 0, 90);
      g.addColorStop(0, '#5c7cfa');
      g.addColorStop(0.5, '#3b5bdb');
      g.addColorStop(1, '#1f2a5a');
      x.shadowColor = 'rgba(31,42,90,0.3)';
      x.shadowBlur = 24 * R.dpr;
      x.shadowOffsetY = 10 * R.dpr;
      x.fillStyle = g;
      x.fillText(big, 0, 30);
      x.restore();
    }
    // 아래쪽 자막 (k: 0 → 1 로 떠오른다). 길면 글자를 줄여 한 줄에 맞춘다
    function caption(text, k) {
      if (k <= 0) return;
      stage();
      x.save();
      x.globalAlpha = clamp01(k);
      const y = SH - 70 + (1 - RR.outCubic(clamp01(k))) * 30;
      let size = 30;
      x.font = `800 ${size}px ${FONT}`;
      const tw = x.measureText(text).width;
      if (tw > SW - 190) {
        size = Math.max(22, Math.floor((size * (SW - 190)) / tw));
        x.font = `800 ${size}px ${FONT}`;
      }
      const w = x.measureText(text).width + 70;
      RR.roundRect(x, SW / 2 - w / 2, y - 31, w, 62, 31);
      x.fillStyle = 'rgba(20,27,46,0.88)';
      x.fill();
      x.fillStyle = '#ffffff';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.fillText(text, SW / 2, y + 1);
      x.restore();
    }
    // 4분할 칸의 왼쪽 위 이름표 (칸 위치는 실제 화면 기준, 크기는 영상 기준)
    function quadLabel(col, row, q, k) {
      const a = clamp01(k);
      if (a <= 0) return;
      const sc = Math.min(R.cssW / SW, R.cssH / SH) * R.dpr, cw = R.canvas.width, ch = R.canvas.height;
      x.save();
      x.setTransform(sc, 0, 0, sc, (col * cw) / 2 + 14 * sc, (row * ch) / 2 + 14 * sc);
      x.globalAlpha = a;
      x.font = `800 17px ${FONT}`;
      const w1 = x.measureText(q.label).width;
      x.font = RR.dfont(26);
      const w2 = x.measureText(q.name).width;
      const w = w1 + w2 + 52, h = 46, dx = -(1 - RR.outCubic(a)) * 30;
      RR.roundRect(x, dx, 0, w, h, 23);
      x.fillStyle = 'rgba(20,27,46,0.88)';
      x.fill();
      x.textAlign = 'left';
      x.textBaseline = 'middle';
      x.font = `800 17px ${FONT}`;
      x.fillStyle = q.col;
      x.fillText(q.label, dx + 20, h / 2 + 1);
      x.font = RR.dfont(26);
      x.fillStyle = '#ffffff';
      x.fillText(q.name, dx + 32 + w1, h / 2 + 2);
      x.restore();
    }
    // 위쪽 가운데 이름표 (학기 진행)
    function topChip(title, sub, col, k) {
      const a = clamp01(k);
      if (a <= 0) return;
      stage();
      x.save();
      x.globalAlpha = a;
      x.font = RR.dfont(36);
      const w1 = x.measureText(title).width;
      x.font = `800 22px ${FONT}`;
      const w2 = x.measureText(sub).width;
      const w = w1 + w2 + 92, h = 70, px = SW / 2 - w / 2, py = 34 - (1 - RR.outCubic(a)) * 20;
      RR.roundRect(x, px, py, w, h, 35);
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = col;
      x.stroke();
      x.textBaseline = 'middle';
      x.textAlign = 'left';
      x.font = RR.dfont(36);
      x.fillStyle = '#1f2a5a';
      x.fillText(title, px + 34, py + h / 2 + 1);
      RR.roundRect(x, px + 34 + w1 + 14, py + 18, w2 + 24, 34, 17);
      x.fillStyle = col;
      x.fill();
      x.font = `800 22px ${FONT}`;
      x.fillStyle = '#ffffff';
      x.fillText(sub, px + 34 + w1 + 26, py + h / 2 + 1);
      x.restore();
    }
    // 적 얼굴: 몸 색 동그라미 + 이모지(또는 LA·TA 같은 글자)
    function enemyIcon(d, cx, cy, r) {
      const sp = d.sprite;
      x.beginPath();
      x.arc(cx, cy, r, 0, TAU);
      x.fillStyle = sp.bg;
      x.fill();
      x.lineWidth = 2;
      x.strokeStyle = RR.shade(sp.bg, -0.35);
      x.stroke();
      if (sp.emoji) {
        R.drawIcon(x, sp.emoji, cx, cy + 0.5, r * 1.3);
        return;
      }
      x.save();
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = RR.dfont(Math.round(r * (sp.text.length > 2 ? 0.75 : 0.95)));
      x.lineJoin = 'round';
      x.lineWidth = 3;
      x.strokeStyle = RR.shade(sp.bg, -0.5);
      x.strokeText(sp.text, cx, cy + 1);
      x.fillStyle = sp.fg || '#fff';
      x.fillText(sp.text, cx, cy + 1);
      x.restore();
    }
    // 학기 진행: 오른쪽 '등장 적' 목록 (일반 적 → 중간보스 · 보스)
    // s = 학기(0~3), ts = 그 학기를 보여 준 지 지난 시간, h = 패널 높이 (학기가 바뀌면 부드럽게 늘고 준다)
    const ROW = 40, BROW = 46;
    const rosterH = (s) => 70 + SEM_ROSTER[s].length * ROW + 22 + 2 * BROW + 10;
    function semRoster(s, ts, h, k) {
      const a = clamp01(k);
      if (a <= 0) return;
      const E = GS.data.enemies, CH = GS.data.chapters, ch = CH[s], col = SEMS[s][2], last = s === CH.length - 1;
      const ids = SEM_ROSTER[s], w = 340, px = SW - w - 28 + (1 - RR.outCubic(a)) * 40, py = 128;
      const row = (i) => clamp01((ts - 0.05 - i * 0.07) / 0.25); // 학기가 바뀌면 위에서부터 한 줄씩
      stage();
      x.save();
      x.globalAlpha = a;
      x.shadowColor = 'rgba(20,27,46,0.2)';
      x.shadowBlur = 20 * R.dpr;
      x.shadowOffsetY = 6 * R.dpr;
      RR.roundRect(x, px, py, w, h, 22);
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.fill();
      x.shadowColor = 'transparent';
      x.lineWidth = 3;
      x.strokeStyle = col;
      x.stroke();
      x.clip(); // 패널이 늘어나는 동안 줄이 밖으로 삐져나오지 않게
      x.textAlign = 'left';
      x.textBaseline = 'middle';
      x.font = RR.dfont(28);
      x.fillStyle = col;
      x.fillText(`${ch.name} 등장 적`, px + 24, py + 38);
      ids.forEach((id, i) => {
        const kr = row(i);
        if (kr <= 0) return;
        const d = E[id], cy = py + 70 + i * ROW + ROW / 2, ox = (1 - RR.outCubic(kr)) * 16;
        x.globalAlpha = a * kr;
        enemyIcon(d, px + 42 + ox, cy, 15);
        x.font = `800 22px ${FONT}`;
        x.fillStyle = '#343a40';
        x.fillText(d.name, px + 68 + ox, cy + 1, w - 90);
      });
      const by = py + 70 + ids.length * ROW + 10;
      x.globalAlpha = a * row(ids.length); // 구분선은 보스 줄과 함께 나타난다
      x.fillStyle = 'rgba(30,40,70,0.12)';
      x.fillRect(px + 22, by, w - 44, 2);
      [[ch.midBoss, '중간보스', '#f76707'], [ch.boss, last ? '최종 보스' : '보스', last ? '#c92a2a' : '#e03131']].forEach(([b, rank, rc], j) => {
        const kr = row(ids.length + j);
        if (!b || kr <= 0) return;
        const d = E[b.enemy], cy = by + 12 + j * BROW + BROW / 2, ox = (1 - RR.outCubic(kr)) * 16;
        x.globalAlpha = a * kr;
        x.font = `900 14px ${FONT}`;
        const tw = x.measureText(rank).width + 18;
        RR.roundRect(x, px + 22 + ox, cy - 14, tw, 28, 14);
        x.fillStyle = rc;
        x.fill();
        x.fillStyle = '#ffffff';
        x.textAlign = 'center';
        x.fillText(rank, px + 22 + ox + tw / 2, cy + 1);
        x.textAlign = 'left';
        enemyIcon(d, px + 22 + ox + tw + 22, cy, 15);
        const nx = px + 22 + ox + tw + 44;
        x.font = `800 21px ${FONT}`;
        x.fillStyle = '#343a40';
        x.fillText(d.name, nx, cy + 1, px + w - 18 - nx);
      });
      x.restore();
    }
    // 레벨업 · 진화 카드
    function card(cx, cy, o, k, sel) {
      const a = clamp01(k);
      if (a <= 0) return;
      const w = 240, h = 312, evo = o.kind === 'evolve';
      const accent = o.kind === 'passive' ? '#2f9e44' : evo ? '#f59f00' : '#4c6ef5';
      const tint = o.kind === 'passive' ? '#ebfbee' : evo ? '#fff3bf' : '#edf2ff';
      stage();
      x.save();
      x.globalAlpha = a;
      const lift = sel ? 10 * clamp01(sel) : 0, s = 0.92 + 0.08 * RR.outBack(a);
      x.translate(cx, cy + (1 - a) * 30 - lift);
      x.scale(s, s);
      if (evo) { // 진화 카드: 금빛으로 빛난다
        x.globalAlpha = a * 0.5;
        x.drawImage(R.glow('#ffd43b', 64), -w * 0.8, -h * 0.75, w * 1.6, h * 1.5);
        x.globalAlpha = a;
      }
      RR.roundRect(x, -w / 2, -h / 2 + 6, w, h, 18);
      x.fillStyle = evo ? '#e8a400' : sel ? '#c5d0e6' : '#dde3ec';
      x.fill();
      RR.roundRect(x, -w / 2, -h / 2, w, h, 18);
      const bg = x.createLinearGradient(0, -h / 2, 0, h / 2);
      bg.addColorStop(0, evo ? '#fff9db' : '#ffffff');
      bg.addColorStop(1, evo ? '#ffe08a' : '#f5f7fb');
      x.fillStyle = bg;
      x.fill();
      x.lineWidth = sel || evo ? 3 : 2;
      x.strokeStyle = sel || evo ? accent : '#e3e8ef';
      x.stroke();
      x.save();
      RR.roundRect(x, -w / 2, -h / 2, w, h, 18);
      x.clip();
      x.fillStyle = accent;
      x.fillRect(-w / 2, -h / 2, w, 7);
      if (o.isNew) { // NEW 띠
        x.save();
        x.translate(w / 2 - 34, -h / 2 + 30);
        x.rotate(0.61);
        x.fillStyle = '#fa5252';
        x.fillRect(-60, -11, 120, 22);
        x.fillStyle = '#fff';
        x.font = `900 12px ${FONT}`;
        x.textAlign = 'center';
        x.textBaseline = 'middle';
        x.fillText('NEW', 0, 1);
        x.restore();
      }
      x.restore();
      const iy = -h / 2 + 82;
      const ig = x.createRadialGradient(-12, iy - 14, 4, 0, iy, 44);
      ig.addColorStop(0, '#ffffff');
      ig.addColorStop(1, tint);
      x.beginPath();
      x.arc(0, iy, 44, 0, TAU);
      x.fillStyle = ig;
      x.fill();
      x.lineWidth = 4;
      x.strokeStyle = '#ffffff';
      x.stroke();
      R.drawIcon(x, o.icon, 0, iy, 54);
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = `900 22px ${FONT}`;
      x.fillStyle = '#1f2a5a';
      x.fillText(o.name, 0, iy + 70);
      x.font = `900 15px ${FONT}`;
      x.fillStyle = o.kind === 'passive' ? '#2b8a3e' : evo ? '#d9480f' : '#3b5bdb';
      x.fillText(o.tag, 0, iy + 98);
      x.font = `600 16px ${FONT}`;
      x.fillStyle = '#495057';
      wrap(o.desc, w - 40).forEach((ln, i) => x.fillText(ln, 0, iy + 128 + i * 23));
      x.restore();
    }
    // 4학기가 끝날 때의 취업 판정 창 (항목이 하나씩 체크된다)
    function judgePanel(o, t) {
      const a = clamp01(t / 0.3);
      if (a <= 0) return;
      stage();
      x.save();
      x.globalAlpha = a;
      const w = 680, h = o.note ? 290 : 262, px = SW / 2 - w / 2, py = 26 + (1 - RR.outCubic(a)) * 24; // 위쪽에 두어 아래의 주인공이 보이게
      x.shadowColor = 'rgba(0,0,0,0.25)';
      x.shadowBlur = 30 * R.dpr;
      RR.roundRect(x, px, py, w, h, 28);
      x.fillStyle = 'rgba(255,255,255,0.97)';
      x.fill();
      x.shadowBlur = 0;
      x.lineWidth = 4;
      x.strokeStyle = o.color;
      x.stroke();
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = RR.dfont(32);
      x.fillStyle = '#1f2a5a';
      x.fillText(o.title, SW / 2, py + 44);
      o.rows.forEach(([ok, text], i) => {
        const k = clamp01((t - 0.5 - i * 0.5) / 0.3);
        if (k <= 0) return;
        const y = py + 98 + i * 50;
        x.globalAlpha = a * k;
        RR.roundRect(x, px + 50, y - 22, w - 100, 44, 14);
        x.fillStyle = ok ? '#ebfbee' : '#fff5f5';
        x.fill();
        R.drawIcon(x, ok ? '✅' : '❌', px + 84, y, 30 * (0.7 + 0.3 * RR.outBack(k)));
        x.textAlign = 'left';
        x.font = `800 23px ${FONT}`;
        x.fillStyle = ok ? '#2b8a3e' : '#c92a2a';
        x.fillText(text, px + 112, y + 1);
      });
      const kr = clamp01((t - 0.5 - o.rows.length * 0.5) / 0.35);
      if (kr > 0) {
        x.globalAlpha = a * kr;
        const s = 0.8 + 0.2 * RR.outBack(kr);
        x.save();
        x.translate(SW / 2, py + 224);
        x.scale(s, s);
        x.font = RR.dfont(36);
        const tw = x.measureText(o.result).width;
        R.drawIcon(x, o.icon, -tw / 2 - 26, 0, 38);
        x.textAlign = 'left';
        x.fillStyle = o.color;
        x.fillText(o.result, -tw / 2 + 4, 2);
        x.restore();
      }
      const kn = o.note ? clamp01((t - 1 - o.rows.length * 0.5) / 0.35) : 0;
      if (kn > 0) { // 취업해도 원하면 박사 과정 (게임의 '그래도 박사 진학' 버튼)
        x.globalAlpha = a * kn;
        x.textAlign = 'center';
        x.font = `700 18px ${FONT}`;
        x.fillStyle = '#7048e8';
        x.fillText(o.note, SW / 2, py + 264);
      }
      x.restore();
    }
    // 종이 꽃가루 (취업 성공): 정해진 규칙으로 떨어진다 (영상을 몇 번 만들어도 같은 모양)
    const CONF = ['#4c6ef5', '#fcc419', '#40c057', '#ff922b', '#be4bdb', '#22b8cf'];
    function confetti(t) {
      stage();
      for (let i = 0; i < 80; i++) {
        const sp = 260 + ((i * 37) % 180), y = -20 + (t - (i % 9) * 0.06) * sp;
        if (y < -20 || y > SH + 20) continue;
        const cx = ((i * 157) % SW) + Math.sin(t * 3 + i) * 26;
        x.save();
        x.translate(cx, y);
        x.rotate(t * 5 + i);
        x.fillStyle = CONF[i % CONF.length];
        x.fillRect(-6, -3.5, 12, 7);
        x.restore();
      }
    }
    // 캐릭터 소개 이름표: 이름 · 연구실 · 전용 무기
    function charPlate(cx, id, col, k) {
      const a = clamp01(k);
      if (a <= 0) return;
      const C = GS.data.characters[id], W = GS.data.weapons;
      stage();
      x.save();
      x.globalAlpha = a;
      const w = 520, h = 168, px = cx - w / 2, py = 26 - (1 - RR.outCubic(a)) * 24;
      RR.roundRect(x, px, py, w, h, 24);
      x.fillStyle = 'rgba(255,255,255,0.95)';
      x.fill();
      x.lineWidth = 3;
      x.strokeStyle = col;
      x.stroke();
      x.textAlign = 'left';
      x.textBaseline = 'middle';
      x.font = RR.dfont(44);
      x.fillStyle = col;
      const nw = x.measureText(C.name).width;
      x.fillText(C.name, px + 28, py + 44);
      x.font = `800 21px ${FONT}`;
      x.fillStyle = '#495057';
      x.fillText(C.lab, px + 40 + nw, py + 48);
      Object.keys(W).filter((wid) => W[wid].tier === 'base' && W[wid].only === id).forEach((wid, i) => {
        const ix = px + 30 + i * 120;
        RR.roundRect(x, ix, py + 82, 108, 70, 14);
        x.fillStyle = '#f1f3f5';
        x.fill();
        R.drawIcon(x, W[wid].icon, ix + 54, py + 106, 32);
        x.textAlign = 'center';
        x.font = `800 15px ${FONT}`;
        x.fillStyle = '#343a40';
        x.fillText(W[wid].name, ix + 54, py + 138);
      });
      x.restore();
    }

    // ───────── 연출용 게임 ─────────
    // 적은 직접 배치하고(스포너 끔), 플레이어는 다치지 않는다. 움직임은 봇이 맡는다
    function staged(o) {
      const g = new GS.Game({ seed: o.seed || 7, character: o.char || 'dry', startWeapon: o.weapon || 'pen', viewW: R.viewW, viewH: R.viewH });
      g.staged = true; // 게임의 Tab 적 목록은 영상에 나오지 않게
      R.attach(g);
      R.noHud = !!o.noHud;
      R.banners.length = 0; // 앞 장면의 배너가 넘어오지 않게
      R.toasts.length = 0;
      g.spawner.update = () => {};
      g.hurtPlayer = () => {};
      if (o.weapons) {
        g.weapons.length = 0;
        o.weapons.forEach((id) => g.addWeapon(id));
      }
      if (o.passives) {
        o.passives.forEach(([id, lv]) => g.passives.push({ id, def: GS.data.passives[id], level: lv }));
        g.recomputeStats();
      }
      if (o.chapter !== undefined) {
        g.chapterIndex = o.chapter;
        g.chapterTime = o.ct || 60;
        g.time = o.chapter * 240 + g.chapterTime;
      }
      if (o.phd) { g.phd = true; g.phdTime = 40; }
      g.player.level = o.level || 12;
      g.player.xpNext = g.xpFor(g.player.level);
      g.player.xp = g.player.xpNext * 0.4;
      g.gainXp = () => {}; // 영상 도중 저절로 레벨업하지 않게 (경험치 막대는 장면에서 직접 채운다)
      return g;
    }
    // 플레이어 둘레에 적 배치 (ids 를 돌아가며)
    function crowd(g, ids, n, r0, r1, hp, ox, oy) {
      const pl = g.player;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + i * 0.37, d = r0 + ((i * 53) % 100) / 100 * (r1 - r0);
        E.spawn(g, ids[i % ids.length], pl.x + (ox || 0) + Math.cos(a) * d, pl.y + (oy || 0) + Math.sin(a) * d * 0.7, { hpMult: hp || 2 });
      }
    }
    // 보스 배치: 다른 기술은 막아 두고, 장면에서 정한 패턴만 쓴다
    function boss(g, id, dx, dy, rank) {
      const b = E.spawn(g, id, g.player.x + dx, g.player.y + dy, { hpMult: 60, rank });
      b.skillT = b.skillT.map(() => 1e9);
      return b;
    }
    const skillOf = (b, type) => b.def.skills.find((s) => s.type === type);
    // 장면을 시작하기 전에 게임을 잠깐 미리 돌려, 막 소환된 적이 다 나타나고 공격이 오가는 순간부터 보여 준다
    function preroll(g, sec) {
      for (let i = 0; i < Math.round((sec || 0.8) * 30); i++) {
        GS.Bot.step(g, 'normal');
        if (g.phase === 'playing') g.update(1 / 30);
      }
    }
    function play(g, dt) {
      GS.Bot.step(g, 'normal');
      if (g.phase === 'playing') g.update(dt);
      R.draw(g, dt);
    }
    function setLevel(g, w, lv) {
      w.level = lv;
      GS.Weapons.refresh(g, w);
    }
    // ───────── 장면 (dur 초 동안 frame(t, dt) 로 그린다. start 는 장면이 시작될 때 한 번) ─────────
    const SCENES = [
      {
        name: '① 타이틀', dur: 4,
        start() {
          R.resetFx();
          R.toasts.length = 0;
          R.banners.length = 0;
          R.idleScene = null;
        },
        frame(t, dt) {
          R.drawIdle(dt);
          stage();
          const veil = x.createRadialGradient(SW / 2, SH * 0.42, 60, SW / 2, SH * 0.42, 640);
          veil.addColorStop(0, 'rgba(255,255,255,0.9)');
          veil.addColorStop(1, 'rgba(255,255,255,0.2)');
          x.fillStyle = veil;
          x.fillRect(-SW, -SH, SW * 3, SH * 3);
          const k = clamp01((t - 0.15) / 0.45);
          logo(SW / 2, SH * 0.4, 1.25 - 0.25 * RR.outBack(k), k);
          stage();
          x.globalAlpha = clamp01((t - 0.6) / 0.4);
          x.font = `700 28px ${FONT}`;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillStyle = '#495057';
          x.fillText(GS.data.config.subtitle, SW / 2, SH * 0.4 + 128);
          x.globalAlpha = 1;
          white(1 - t / 0.35);
        },
      },
      {
        name: '② 캐릭터', dur: 6,
        start() { // 화면을 반으로 나눠 왼쪽 Dry lab, 오른쪽 Wet lab 연구실을 동시에 보여 준다
          this.gd = staged({ char: 'dry', weapons: ['keyboard', 'mouse'], noHud: true, seed: 21 });
          this.gd.player.x = -170; // 책상·모니터 묶음이 옆에 보이는 자리
          this.gd.player.y = -440;
          crowd(this.gd, ['lecture', 'errand', 'lecture', 'progress'], 14, 200, 380, 1.5);
          this.gw = staged({ char: 'wet', weapons: ['pipette', 'flask'], noHud: true, seed: 22 });
          this.gw.player.x = 9000; // 두 게임의 연출(파티클)이 섞이지 않게 멀리 떨어뜨린다
          crowd(this.gw, ['lecture', 'errand', 'lecture', 'progress'], 14, 200, 380, 1.5);
          preroll(this.gd);
          preroll(this.gw);
          R.noHud = true;
        },
        frame(t, dt) {
          const cw = R.canvas.width, ch = R.canvas.height, half = R.viewW / 4;
          for (const [g, left] of [[this.gd, true], [this.gw, false]]) {
            GS.Bot.step(g, 'normal');
            g.update(dt);
            x.save();
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.beginPath();
            x.rect(left ? 0 : cw / 2, 0, cw / 2, ch);
            x.clip();
            R.camOffX = left ? half : -half;
            R.draw(g, dt / 2); // 한 장에 두 번 그리므로 화면 시간은 반씩 흐르게
            x.restore();
          }
          R.camOffX = 0;
          x.setTransform(1, 0, 0, 1, 0, 0); // 가운데 칸막이
          x.fillStyle = 'rgba(31,42,90,0.25)';
          x.fillRect(cw / 2 - 5 * R.dpr, 0, 10 * R.dpr, ch);
          x.fillStyle = '#ffffff';
          x.fillRect(cw / 2 - 3 * R.dpr, 0, 6 * R.dpr, ch);
          charPlate(SW * 0.25, 'dry', '#3b5bdb', (t - 0.3) / 0.4);
          charPlate(SW * 0.75, 'wet', '#7048e8', (t - 0.6) / 0.4);
          caption(CAP.char, (t - 1) / 0.4);
          fadeIn(t);
        },
      },
      {
        name: '③ 기본 플레이', dur: 9,
        start() { // 1학기 초반: 펜·키보드로 대학원 수업과 교수님 심부름을 상대하며 지식을 모은다
          const g = staged({ char: 'dry', weapons: ['pen', 'keyboard'], chapter: 0, ct: 40, level: 4, seed: 31 });
          setLevel(g, g.weapons[0], 2);
          crowd(g, ['lecture', 'errand', 'lecture', 'errand', 'progress'], 26, 230, 470, 1.2);
          for (let i = 0; i < 14; i++) {
            const a = i * 2.4, d = 90 + (i % 5) * 45;
            g.spawnGem(g.player.x + Math.cos(a) * d, g.player.y + Math.sin(a) * d, i % 4 === 0 ? 6 : 2);
          }
          preroll(g, 0.6);
          g.score = 412;
          g.kills = 88;
          R.hud.score = g.score;
          this.g = g;
          this.picked = false;
        },
        frame(t, dt) {
          const g = this.g, pl = g.player;
          const menu = t >= 4.5 && t < 7.1; // 레벨업 카드가 떠 있는 동안 게임은 멈춘다
          if (!menu) {
            if (t < 4.5) pl.xp = pl.xpNext * Math.min(0.985, 0.32 + (t / 4.5) * 0.68); // 경험치 막대가 차오른다
            if (t >= 7.1 && !this.picked) { // 파리채를 골랐다
              this.picked = true;
              g.addWeapon('swatter');
              pl.level = 5;
              pl.xp = pl.xpNext * 0.04;
            }
            play(g, dt);
          } else {
            R.draw(g, 0);
            const ka = clamp01((t - 4.5) / 0.3) * (1 - clamp01((t - 6.8) / 0.3));
            dim(0.55 * ka);
            stage();
            x.globalAlpha = ka;
            x.textAlign = 'center';
            x.textBaseline = 'middle';
            x.font = RR.dfont(46);
            x.lineJoin = 'round';
            x.lineWidth = 8;
            x.strokeStyle = 'rgba(20,27,46,0.6)';
            x.strokeText('레벨 업!', SW / 2, 112);
            x.fillStyle = '#ffe066';
            x.fillText('레벨 업!', SW / 2, 112);
            x.font = `700 20px ${FONT}`;
            x.fillStyle = '#ffffff';
            x.fillText('카드 1장을 고르세요', SW / 2, 152);
            x.globalAlpha = 1;
            const out = 1 - clamp01((t - 6.8) / 0.3);
            CARDS.forEach((c, i) => card(SW / 2 + (i - 1) * 270, 350, c, Math.min(clamp01((t - 4.55 - i * 0.1) / 0.35), out), i === 0 ? clamp01((t - 5.9) / 0.2) : 0));
          }
          caption(t < 4.5 ? CAP.move : CAP.level, t < 4.5 ? (t - 0.4) / 0.35 : (t - 4.5) / 0.25);
          fadeIn(t);
        },
      },
      {
        name: '④ 진화', dur: 4.5,
        start() { // 2학기: 펜이 Lv 8 → 교수님의 빨간펜으로 진화
          const g = staged({ char: 'dry', weapons: ['pen', 'keyboard', 'swatter'], chapter: 1, ct: 100, level: 23, seed: 41 });
          setLevel(g, g.weapons[0], 8);
          setLevel(g, g.weapons[1], 4);
          crowd(g, ['la', 'ta', 'oa', 'lab_meeting'], 34, 210, 480, 2);
          preroll(g);
          this.g = g;
          this.evolved = false;
        },
        frame(t, dt) {
          const g = this.g;
          if (t < 1.8) {
            R.draw(g, 0);
            const ka = clamp01(t / 0.25) * (1 - clamp01((t - 1.5) / 0.3));
            dim(0.5 * ka);
            card(SW / 2, 330, EVO_CARD, Math.min(clamp01((t - 0.1) / 0.35), 1 - clamp01((t - 1.5) / 0.3)), 0);
          } else {
            if (!this.evolved) {
              this.evolved = true;
              g.evolveWeapon(g.weapons[0]);
              R.showBanner({ title: '진화!', sub: '펜 → 교수님의 빨간펜', kind: 'evolve' });
            }
            play(g, dt);
          }
          caption(CAP.evolve, (t - 0.3) / 0.35);
          fadeIn(t);
        },
      },
      {
        name: '⑤ 보스 패턴 4분할', dur: 9,
        start() { // 네 보스의 패턴을 화면 네 칸에 동시에 보여 준다 (칸마다 따로 돌아가는 게임)
          this.qs = QUADS.map((q, i) => {
            const g = staged({ char: q.char, weapons: [q.weapon], chapter: q.chapter, ct: 185, noHud: true, seed: 50 + i });
            g.viewW = R.viewW / 2 / QZ; // 칸 하나에 보이는 넓이 (조명 위치 등을 칸 안에 맞춘다)
            g.viewH = R.viewH / 2 / QZ;
            g.player.x = (i % 2) * 30000; // 네 게임의 연출(파티클)이 섞이지 않게 멀리 떨어뜨린다
            g.player.y = ((i / 2) | 0) * 30000;
            crowd(g, q.crowd, 6, 420, 560, 2);
            const b = boss(g, q.boss, q.bx, q.by, q.rank || 'BOSS');
            preroll(g, 0.5);
            return { q, g, b, next: 0.15 };
          });
          R.noHud = true;
        },
        frame(t, dt) {
          const cw = R.canvas.width, ch = R.canvas.height, z0 = R.zoom, vw = R.viewW, vh = R.viewH, wz = z0 * QZ * R.dpr;
          this.qs.forEach((o, i) => {
            const col = i % 2, row = (i / 2) | 0;
            if (t >= o.next) {
              o.next += o.q.every;
              E.PATTERNS[o.q.pattern](o.g, o.b, Object.assign({}, skillOf(o.b, o.q.pattern), o.q.over || {}), 1);
            }
            GS.Bot.step(o.g, 'normal');
            o.g.update(dt);
            x.save();
            x.setTransform(1, 0, 0, 1, 0, 0);
            x.beginPath();
            x.rect((col * cw) / 2, (row * ch) / 2, cw / 2, ch / 2);
            x.clip();
            R.zoom = z0 * QZ;
            R.viewW = cw / wz; // 화면 밖이라 안 그리는 범위를 칸에 맞춘다
            R.viewH = ch / wz;
            R.camOffX = ((col ? -1 : 1) * cw) / 4 / wz; // 칸 가운데에 그 게임의 주인공이 오게
            R.camOffY = ((row ? -1 : 1) * ch) / 4 / wz;
            R.pStage = o.g.phd ? 4 : Math.min(3, o.g.chapterIndex); // 칸마다 학기가 달라도 모습 바뀌는 연출이 나오지 않게
            R.amb = null; // 칸마다 그 학기의 조명
            R.shake = 0;
            R.flash = 0;
            R.draw(o.g, dt / 4); // 한 장에 네 번 그리므로 화면 시간은 4분의 1씩
            x.restore();
          });
          R.zoom = z0;
          R.viewW = vw;
          R.viewH = vh;
          R.camOffX = 0;
          R.camOffY = 0;
          x.setTransform(1, 0, 0, 1, 0, 0); // 칸막이
          x.fillStyle = 'rgba(31,42,90,0.25)';
          x.fillRect(cw / 2 - 5 * R.dpr, 0, 10 * R.dpr, ch);
          x.fillRect(0, ch / 2 - 5 * R.dpr, cw, 10 * R.dpr);
          x.fillStyle = '#ffffff';
          x.fillRect(cw / 2 - 3 * R.dpr, 0, 6 * R.dpr, ch);
          x.fillRect(0, ch / 2 - 3 * R.dpr, cw, 6 * R.dpr);
          QUADS.forEach((q, i) => quadLabel(i % 2, (i / 2) | 0, q, (t - 0.2 - i * 0.12) / 0.35));
          caption(CAP.patterns, (t - 0.5) / 0.35);
          fadeIn(t);
        },
      },
      {
        name: '⑥ 학기 진행', dur: 9.5,
        start() { // 2.3초마다 학기가 넘어가며 적이 바뀌고, 주인공이 점점 지쳐 간다. 오른쪽에는 그 학기에 나오는 적 목록
          const g = staged({ char: 'dry', weapons: ['pen', 'keyboard', 'textbook'], chapter: 0, ct: 120, noHud: true, seed: 61 });
          crowd(g, SEM_ENEMIES[0], 14, 260, 460, 2);
          preroll(g);
          this.g = g;
          this.sem = 0;
          this.ph = rosterH(0);
        },
        frame(t, dt) {
          const g = this.g, s = Math.min(3, Math.floor(t / SEM_STEP));
          if (s !== this.sem) {
            this.sem = s;
            g.chapterIndex = s;
            R.amb = null; // 연구실 조명도 그 학기의 분위기로 바로 바꾼다
            crowd(g, SEM_ENEMIES[s], 14, 300, 480, 2 + s);
          }
          R.camOffX = 150; // 주인공을 조금 왼쪽에 두어 오른쪽 적 목록에 싸움이 가리지 않게
          play(g, dt);
          R.camOffX = 0;
          this.ph += (rosterH(s) - this.ph) * Math.min(1, dt * 12);
          const sem = SEMS[s];
          topChip(sem[0], sem[1], sem[2], s === 0 ? (t - 0.15) / 0.3 : 1);
          semRoster(s, t - s * SEM_STEP, this.ph, (t - 0.3) / 0.4);
          caption(CAP.semester, (t - 0.4) / 0.35);
          fadeIn(t);
        },
      },
      {
        name: '⑦ 결말', dur: 7,
        start() { // 앞 절반: 취업 성공 / 뒤 절반: 박사 과정 진학
          this.ga = staged({ char: 'dry', weapons: ['red_pen', 'thesis', 'swatter'], chapter: 3, ct: 200, noHud: true, seed: 71 });
          crowd(this.ga, SEM_ENEMIES[3], 16, 260, 460, 4);
          preroll(this.ga);
          this.gb = null;
        },
        frame(t, dt) {
          if (t < 3.5) {
            play(this.ga, dt);
            dim(0.42 * clamp01(t / 0.4));
            judgePanel(JUDGE.job, t - 0.2);
            if (t > 2.1) confetti(t - 2.1);
          } else {
            if (!this.gb) {
              this.gb = staged({ char: 'dry', weapons: ['red_pen'], chapter: 3, ct: 200, phd: true, noHud: true, seed: 72 });
              crowd(this.gb, ['proposal', 'project_meeting'], 10, 330, 480, 6);
              preroll(this.gb, 0.4);
              R.pStage = 3; // 4학기 모습에서 박사 좀비로 바뀌는 연출(연기 + '좀비가 되었다…')이 나오게
            }
            play(this.gb, dt);
            dim(0.42);
            judgePanel(JUDGE.phd, t - 3.6);
          }
          caption(CAP.ending, (t - 0.3) / 0.35);
          fadeIn(t);
          if (t >= 3.5 && t < 3.9) white(0.8 * (1 - (t - 3.5) / 0.4));
        },
      },
      {
        name: '⑧ 박사 과정', dur: 7,
        start() { // 좀비가 된 주인공, 박사 3년차. 보스가 겹쳐 나오고 「진도 체크」 표적이 쫓아온다
          const g = staged({ char: 'dry', weapons: ['red_pen', 'thesis', 'eswatter'], chapter: 3, ct: 200, phd: true, level: 58, seed: 81 });
          g.phdTime = 262;
          g.phdYear = 3;
          g.score = 63120;
          g.kills = 9450;
          crowd(g, ['proposal', 'reviewer2', 'project_meeting', 'revision', 'bug', 'nan'], 20, 280, 480, 9);
          this.rep = boss(g, 'report', 310, -70, 'BOSS');
          this.oral = boss(g, 'oral', -330, 110, 'BOSS');
          this.rep.hp = this.rep.maxHp * 0.72;
          this.oral.hp = this.oral.maxHp * 0.4;
          this.oral.skillT[this.oral.def.skills.findIndex((sk) => sk.type === 'radial')] = 0.8; // 구두 발표의 질문 탄막
          preroll(g, 0.6);
          R.hud.score = g.score;
          this.g = g;
          this.f1 = false;
          this.f2 = false;
          this.f3 = false;
        },
        frame(t, dt) {
          const g = this.g;
          if (!this.f1 && t >= 0.3) { this.f1 = true; E.PATTERNS.check(g, this.rep, skillOf(this.rep, 'check'), 1); }
          if (!this.f2 && t >= 3.7) { this.f2 = true; E.PATTERNS.laser(g, this.oral, skillOf(this.oral, 'laser'), 1); }
          if (!this.f3 && t >= 4.8) { this.f3 = true; E.PATTERNS.check(g, this.rep, skillOf(this.rep, 'check'), 1); }
          play(g, dt);
          if (t < 3.5) caption(CAP.phd1, (t - 0.25) / 0.35);
          else caption(CAP.phd2, (t - 3.5) / 0.3);
          fadeIn(t);
        },
      },
      {
        name: '⑨ 마무리', dur: 4,
        frame(t) {
          fill('#f8f9fb');
          stage();
          x.drawImage(heroes[0], SW / 2 - 480, SH / 2 - 132, 200, 232);
          x.save(); // Wet lab은 거울에 비춰 Dry lab과 마주 보게
          x.translate(SW / 2 - 130, 0);
          x.scale(-1, 1);
          x.drawImage(heroes[1], 0, SH / 2 - 144, 200, 232);
          x.restore();
          logo(SW / 2 + 110, SH / 2 - 40, 0.8, 1);
          stage();
          const k = clamp01((t - 0.2) / 0.5);
          x.globalAlpha = k;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.font = `700 26px ${FONT}`;
          x.fillStyle = '#495057';
          x.fillText(GS.data.config.subtitle, SW / 2 + 110, SH / 2 + 82);
          x.font = `800 22px ${FONT}`;
          x.fillStyle = '#868e96';
          x.fillText(URL_TEXT, SW / 2 + 110, SH / 2 + 128);
          x.globalAlpha = 1;
          white(1 - t / 0.4);
        },
      },
    ];
    const total = SCENES.reduce((s, sc) => s + sc.dur, 0);

    // ───────── 재생기: update(dt) 마다 시간을 흘리고 한 장을 그린다 ─────────
    let si = -1, lt = 0, T = 0;
    return {
      total,
      paused: false,
      finished: false,
      get time() { return T; },
      // target 초로 옮긴다 (←→ 키). 그 시각이 들어 있는 장면을 처음부터 다시 연출하고,
      // 장면 안에서는 그림 없이 빠르게 감은 뒤 한 장만 그린다
      seek(target) {
        target = Math.max(0, Math.min(total - 0.05, target));
        let k = 0, acc = 0;
        while (k < SCENES.length - 1 && acc + SCENES[k].dur <= target) { acc += SCENES[k].dur; k++; }
        si = k;
        lt = 0;
        T = acc;
        this.finished = false;
        const sc = SCENES[si];
        if (sc.start) sc.start.call(sc);
        const off = target - acc;
        if (off > 0) {
          const draw = R.draw, idle = R.drawIdle;
          R.draw = function () {};
          R.drawIdle = function () {};
          try {
            for (let t = 0; t < off - 1e-6;) {
              const d = Math.min(1 / 30, off - t);
              t += d;
              sc.frame.call(sc, t, d);
            }
          } finally {
            R.draw = draw;
            R.drawIdle = idle;
          }
          lt = off;
          T = target;
        }
        sc.frame.call(sc, lt, 0);
      },
      update(dt) {
        if (this.paused) dt = 0;
        if (si < 0) {
          si = 0;
          lt = 0;
          if (SCENES[0].start) SCENES[0].start.call(SCENES[0]);
        } else {
          lt += dt;
          T = Math.min(total, T + dt);
        }
        while (lt >= SCENES[si].dur && si < SCENES.length - 1) {
          lt -= SCENES[si].dur;
          si++;
          if (SCENES[si].start) SCENES[si].start.call(SCENES[si]);
        }
        const sc = SCENES[si];
        sc.frame.call(sc, Math.min(lt, sc.dur), dt);
        if (T >= total) {
          this.finished = true;
          R.noHud = false;
          R.camOffX = 0;
        }
      },
    };
  }

  GS.Intro = { create, texts };
})(window.GS = window.GS || {});
