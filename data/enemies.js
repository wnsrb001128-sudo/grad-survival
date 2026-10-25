// 적 데이터. tier = 등장 레벨(1~4), boss = 보스 여부
// ai: chase(추적) / dash(멈칫 후 돌진) / ranged(거리 유지 + 원거리) / bomber(카운트다운 후 자폭)
//     line, ring 은 이벤트에서 지정 (화면 횡단 떼 / 원형 포위)
// skills: 주기적으로 쓰는 기술 (radial 탄막, aimed 조준탄, summon 소환, ring 포위)
//   보스 특수 패턴 (빨간 예고 지역이 warn 초 동안 차오른 뒤 터진다. tip 은 처음 쓸 때 화면 아래 알림):
//   sneeze 재채기 부채꼴 / omr 줄무늬 답안 칸 / strike 예측 과녁 폭격 / wall 빈틈 있는 질문 벽 /
//   laser 부채꼴을 쓸고 지나가는 레이저 / redpen 가로지르는 빨간펜 / stamp 큰 원 도장 /
//   excel 가로·세로 십자 띠 / countdown 안쪽부터 차례로 터지는 고리 / spotlight 조명(안전한 원) 밖 전체 /
//   check 플레이어를 따라오다 멈춘 뒤 터지는 돋보기 표적 / rush 화살표 띠를 띄운 뒤 그 줄을 따라 보스가 돌진
// 보스가 쏜 탄(기술·패턴)은 파리채로 막을 수 없다 (일반 적의 탄만 막힘)
// phase2: 체력이 at 비율 아래로 떨어지면 모든 기술 주기에 every 를 곱한다 (최종 보스 「수정 후 재심사」)
// 중간보스는 data/chapters.js 의 midBoss 로 지정한다 (보스 막대·이름표에 '중간보스'로 표시)
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.enemies = {
    // ───────── 1렙: 석사 1학기 ─────────
    lecture: {
      name: '대학원 수업', tier: 1, sprite: { emoji: '📚', bg: '#748ffc' },
      hp: 7, damage: 5, speed: 72, radius: 15, xp: 1, score: 1, ai: 'chase',
      desc: '가장 흔한 적. 느리지만 꾸준히 몰려온다.',
    },
    errand: {
      name: '교수님 심부름', tier: 1, sprite: { emoji: '🏃', bg: '#ffe066' },
      hp: 5, damage: 3, speed: 112, radius: 12, xp: 1, score: 1, ai: 'chase',
      desc: '빠르지만 약하다. 수시로 튀어나와 발목을 잡는다.',
    },
    progress: {
      name: '개인 프로그레스 미팅', tier: 1, sprite: { emoji: '📊', bg: '#ffc078' },
      hp: 26, damage: 8, speed: 66, radius: 16, xp: 2, score: 2, ai: 'dash',
      dash: { range: 320, windup: 0.6, time: 0.5, mult: 3.4, rest: 0.5 },
      desc: '가까이 오면 멈칫(머리 위 !)한 뒤 빠르게 돌진한다.',
    },
    midterm: {
      name: '중간고사', tier: 1, sprite: { emoji: '📝', bg: '#ff8787' },
      hp: 55, damage: 9, speed: 58, radius: 18, xp: 4, score: 5, ai: 'chase', kbResist: 0.4,
      desc: '1차 1:20 "중간고사 기간" 이벤트에서 딱 한 번, 사방을 둘러싸며 나온다. 단단하고 잘 밀리지 않는다.',
    },
    cold: {
      name: '감기', tier: 1, boss: true, rank: '중간보스', sprite: { emoji: '🤧', bg: '#8ce99a' },
      hp: 450, damage: 10, speed: 76, radius: 32, xp: 30, score: 250, ai: 'chase',
      onHit: { slow: 0.3, time: 2 },
      skills: [
        { type: 'radial', every: 3.6, count: 8, speed: 170, damage: 6, style: 'germ', slow: { amt: 0.3, time: 2 } },
        { type: 'sneeze', every: 8, first: 4, warn: 1.1, range: 300, arc: 0.95, count: 14, speed: 250, damage: 9, slow: { amt: 0.35, time: 2.5 },
          tip: '🤧 재채기 예고! 빨간 부채꼴이 꽉 차기 전에 밖으로 피하세요' },
      ],
      desc: '1학기 중간보스. 3.6초마다 기침으로 세균 8개를 흩뿌린다. 특수 패턴 「재채기」: "에… 에…" 하며 멈칫하고 플레이어 쪽에 빨간 부채꼴을 띄운 뒤, 1.1초 뒤 "에취!" 하며 부채꼴 안을 세균으로 뒤덮는다. 닿거나 세균에 맞으면 잠깐 느려진다.',
    },
    final_exam: {
      name: '기말고사', tier: 1, boss: true, sprite: { emoji: '📝', bg: '#e03131' },
      hp: 1100, damage: 14, speed: 68, radius: 40, xp: 60, score: 600, ai: 'chase',
      skills: [
        { type: 'radial', every: 3.5, count: 10, speed: 190, damage: 9, style: 'paper' },
        { type: 'omr', every: 8, first: 5, warn: 1.4, bands: 5, width: 50, gap: 76, len: 640, damage: 13,
          tip: '📝 OMR 답안 마킹! 빨간 칸이 칠해지기 전에 칸과 칸 사이로 피하세요' },
      ],
      desc: '1학기 보스. 3.5초마다 시험지 10장을 사방으로 흩뿌린다. 특수 패턴 「OMR 답안 마킹」: 플레이어 주변에 빨간 답안 칸 5줄을 띄우고 1.4초 뒤 한꺼번에 칠한다. 칸과 칸 사이 빈 줄로 피하자.',
    },

    // ───────── 2렙: 석사 2학기 ─────────
    la: {
      name: 'LA', tier: 2, sprite: { text: 'LA', bg: '#20c997' },
      hp: 45, damage: 9, speed: 80, radius: 16, xp: 3, score: 3, ai: 'chase',
      desc: '연구실 조교 업무. 체력이 높고 묵직하게 따라온다.',
    },
    ta: {
      name: 'TA', tier: 2, sprite: { text: 'TA', bg: '#4dabf7' },
      hp: 32, damage: 7, speed: 78, radius: 16, xp: 3, score: 3, ai: 'ranged',
      ranged: { keep: 260, every: 2.6, speed: 230, damage: 6, style: 'paper' },
      desc: '거리를 두고 2.6초마다 과제·퀴즈를 던진다. 수업 조교 업무.',
    },
    oa: {
      name: 'OA', tier: 2, sprite: { text: 'OA', bg: '#adb5bd' },
      hp: 20, damage: 6, speed: 128, radius: 13, xp: 2, score: 2, ai: 'chase',
      desc: '약하지만 빠르다. 떼를 지어 화면을 가로지르기도 한다. 행정 업무.',
    },
    win_update: {
      name: '컴퓨터 강제 종료', tier: 2, sprite: { emoji: '💻', bg: '#339af0' },
      hp: 38, damage: 6, speed: 92, radius: 16, xp: 3, score: 3, ai: 'bomber',
      bomb: { trigger: 110, fuse: 1.6, radius: 130, damage: 20, jam: 1.5 },
      desc: '가까이 오면 "업데이트 중 n%" 카운트다운 후 폭발한다. 파란 원 안에서 맞으면 피해 + 무기 1.5초 정지. 먼저 처치하거나 원 밖으로 피하자.',
    },
    plot: {
      name: '플롯 그리기', tier: 2, sprite: { emoji: '📈', bg: '#d0ebff' },
      hp: 40, damage: 8, speed: 85, radius: 16, xp: 3, score: 4, ai: 'chase',
      trail: { every: 0.35, damage: 6, life: 4 },
      desc: '지나간 자리에 데이터 점(빨간 점)을 찍으며 다닌다. 점을 밟으면 피해를 입고, 점은 4초 뒤 사라진다.',
    },
    grading: {
      name: '시험 채점', tier: 2, sprite: { emoji: '💯', bg: '#ff922b' },
      hp: 90, damage: 8, speed: 55, radius: 19, xp: 5, score: 6, ai: 'chase', kbResist: 0.5,
      skills: [{ type: 'summon', every: 4.5, first: 2, pool: ['answer_sheet'], count: 2 }],
      desc: '4.5초마다 답안지 2장을 소환한다. 단단한 답안지 더미라 먼저 처치하는 게 좋다.',
    },
    answer_sheet: {
      name: '답안지', tier: 2, sprite: { emoji: '📄', bg: '#e9ecef' },
      hp: 10, damage: 5, speed: 140, radius: 11, xp: 1, score: 1, ai: 'chase',
      desc: '빠르고 약하다. 채점해도 채점해도 끝이 없다.',
    },
    lab_meeting: {
      name: '주간 랩미팅', tier: 2, sprite: { emoji: '👥', bg: '#4c6ef5' },
      hp: 70, damage: 10, speed: 70, radius: 18, xp: 4, score: 5, ai: 'chase', kbResist: 0.3,
      desc: '매주 돌아온다. 단단하고, 랩미팅 시간에는 다 같이 둘러앉아 플레이어를 포위한다.',
    },
    grant: {
      name: '연구비 정산', tier: 2, boss: true, sprite: { emoji: '🧾', bg: '#38d9a9' },
      hp: 1000, damage: 10, speed: 74, radius: 38, xp: 70, score: 700, ai: 'chase',
      skills: [
        { type: 'radial', every: 4.5, count: 8, speed: 190, damage: 6, style: 'paper' },
        { type: 'excel', every: 8, first: 4, count: 2, gap: 0.9, warn: 1.2, width: 64, len: 1100, damage: 10,
          tip: '🧾 엑셀 정산표! 내가 선 자리의 가로줄·세로줄이 칠해져요. 대각선으로 빠져나가세요' },
      ],
      desc: '2학기 중간보스. 4.5초마다 영수증 8장을 사방으로 흩뿌린다. 특수 패턴 「엑셀 정산표」: 플레이어가 선 자리를 지나는 가로줄·세로줄(행과 열)을 빨갛게 표시하고 1.2초 뒤 한꺼번에 칠한다. 곧바로 한 번 더 쓰니 대각선으로 빠져나가자.',
    },
    kickoff: {
      name: '과제 킥오프 미팅', tier: 2, boss: true, sprite: { emoji: '🚀', bg: '#1971c2' },
      hp: 4200, damage: 16, speed: 72, radius: 44, xp: 120, score: 1500, ai: 'chase',
      skills: [
        { type: 'summon', every: 6, pool: ['la', 'ta', 'oa', 'lab_meeting'], count: 5, msg: '🚀 "자, 역할 분담하겠습니다"' },
        { type: 'aimed', every: 3.5, count: 5, spread: 0.22, speed: 260, damage: 10, style: 'paper' },
        { type: 'strike', every: 9, first: 4, count: 5, gap: 0.4, warn: 1.25, radius: 82, lead: 0.8, damage: 15,
          tip: '🚀 로드맵 발사! 빨간 과녁에 로켓이 떨어져요. 멈추지 말고 계속 움직이세요' },
        { type: 'rush', every: 11, first: 7, warn: 1.0, len: 560, time: 0.45, rest: 0.8, damage: 14,
          tip: '🚀 로켓 발진! 킥오프 미팅이 화살표 방향으로 돌진해요. 띠 옆으로 비켜서세요' },
      ],
      desc: '2학기 보스. 6초마다 LA·TA·OA·주간 랩미팅 5명을 불러 역할을 나누고, 3.5초마다 할 일 목록 5장을 던진다. 특수 패턴 두 가지. 「로드맵 발사」: 플레이어가 갈 곳을 노려 빨간 과녁 5개를 차례로 찍고, 과녁마다 1.25초 뒤 로켓이 떨어져 터진다. 계속 움직이자. 「로켓 발진」: 멈춰 서서 플레이어 쪽으로 굵은 화살표 띠를 띄우고, 1초 뒤 그 줄을 따라 순식간에 돌진한다(부딪히면 크게 아프다). 띠 옆으로 비켜서자. 돌진이 끝나면 잠깐 멈춰 선다.',
    },

    // ───────── 3렙: 석사 3학기 ─────────
    project_meeting: {
      name: '과제 미팅', tier: 3, sprite: { emoji: '💼', bg: '#9775fa' },
      hp: 160, damage: 13, speed: 70, radius: 19, xp: 6, score: 8, ai: 'chase', kbResist: 0.6,
      desc: '단단하고 넉백에 강하다. 연구 과제 회의.',
    },
    bug: {
      name: '버그', tier: 3, sprite: { emoji: '🐛', bg: '#94d82d' },
      hp: 30, damage: 8, speed: 115, radius: 12, xp: 2, score: 3, ai: 'zigzag',
      zigzag: { amp: 0.9, freq: 5 },
      desc: '지그재그로 움직여 맞히기 어렵다. 잡아도 잡아도 또 나온다.',
    },
    nan: {
      name: '시뮬레이션 발산', tier: 3, sprite: { text: 'NaN', bg: '#fa5252' },
      hp: 110, damage: 12, speed: 66, radius: 18, xp: 5, score: 6, ai: 'chase', kbResist: 0.3,
      onDeath: { count: 8, speed: 210, damage: 6, style: 'warn' },
      desc: '처치하면 값이 발산하며 경고 8개(⚠️)를 사방으로 튀긴다. 가까이에서 잡지 말 것.',
    },
    lang: {
      name: '어학 성적 취득', tier: 3, sprite: { text: '600', bg: '#15aabf' },
      hp: 120, damage: 12, speed: 72, radius: 17, xp: 5, score: 6, ai: 'chase',
      grow: { every: 4, hp: 1.35, size: 1.12, dmg: 1.15, labels: ['600', '750', '880', '990'] },
      desc: '4초마다 점수가 올라(600→750→880→990) 커지고 단단해진다. 990점이 되기 전에 빨리 처치하자.',
    },
    // 리비전·Reviewer #2·마감은 3·4차 적 종류를 늘리려고 추가한 적 (빼도 됨)
    revision: {
      name: '메이저 리비전', tier: 3, sprite: { emoji: '🔄', bg: '#f06595' },
      hp: 95, damage: 11, speed: 78, radius: 17, xp: 4, score: 5, ai: 'chase',
      split: { into: 'minor_revision', count: 3 },
      desc: '처치하면 마이너 리비전 3개로 쪼개진다.',
    },
    minor_revision: {
      name: '마이너 리비전', tier: 3, sprite: { emoji: '🔄', bg: '#faa2c1' },
      hp: 26, damage: 7, speed: 108, radius: 12, xp: 1, score: 2, ai: 'chase',
      desc: '메이저 리비전이 쪼개진 것. 작지만 빠르다.',
    },
    submission: {
      name: '학회 논문 초록 작성', tier: 3, boss: true, sprite: { emoji: '📤', bg: '#fd7e14' },
      hp: 3000, damage: 18, speed: 70, radius: 44, xp: 140, score: 1400, ai: 'chase',
      skills: [
        { type: 'aimed', every: 3.4, count: 5, spread: 0.2, speed: 250, damage: 8, style: 'paper' },
        { type: 'summon', every: 11, pool: ['minor_revision', 'bug'], count: 3, msg: '📤 "제출 직전에 버그 발견!"' },
        { type: 'countdown', every: 9, first: 5, rings: 3, step: 80, warn: 1.3, gap: 0.45, damage: 16,
          tip: '⏳ 마감 카운트다운! 빨간 고리가 안쪽부터 차례로 터져요. 바깥으로 달아나거나 이미 터진 안쪽으로 들어가세요' },
      ],
      desc: '3학기 중간보스. 3.4초마다 원고 5장을 조준해 던지고, 11초마다 마이너 리비전·버그 3마리를 부른다. 특수 패턴 「마감 카운트다운」: 플레이어 발밑을 중심으로 빨간 고리 3겹(3·2·1)이 생기고, 1.3초 뒤 안쪽 고리부터 0.45초 간격으로 차례로 터진다. 바깥으로 달아나거나 이미 터진 안쪽으로 들어가자.',
    },
    poster: {
      name: '학회 포스터 발표', tier: 3, boss: true, sprite: { emoji: '🖼️', bg: '#7048e8' },
      hp: 14000, damage: 20, speed: 64, radius: 50, xp: 250, score: 3000, ai: 'chase',
      skills: [
        { type: 'ring', every: 8, enemy: 'poster_board', count: 14, radius: 330, msg: '🪧 포스터 세션! 포스터 보드에 둘러싸였다' },
        { type: 'radial', every: 4.5, count: 14, speed: 210, damage: 9, style: 'question' },
        { type: 'wall', every: 10, first: 6, warn: 1.3, count: 25, spacing: 32, gap: 3, dist: 480, speed: 200, damage: 12, style: 'question',
          tip: '🙋 질문 행렬! 질문이 벽처럼 밀려와요. 초록 화살표가 가리키는 빈틈으로 빠져나가세요' },
      ],
      desc: '3학기 보스. 8초마다 포스터 보드로 플레이어를 둘러싸 가두고, 4.5초마다 질문을 사방으로 던진다. 특수 패턴 「질문 행렬」: 화면 한쪽에서 질문이 벽처럼 줄지어 밀려온다. 초록 화살표가 가리키는 빈틈으로 빠져나가자.',
    },
    poster_board: {
      name: '포스터 보드', tier: 3, sprite: { emoji: '🪧', bg: '#d0bfff' },
      hp: 70, damage: 10, speed: 60, radius: 16, xp: 1, score: 1, ai: 'chase',
      desc: '원을 그리며 천천히 조여 오는 벽. 12초 뒤 사라진다.',
    },

    // ───────── 4렙: 석사 4학기 (최종 단계) ─────────
    proposal: {
      name: '과제 제안서 작성', tier: 4, sprite: { emoji: '📑', bg: '#fab005' },
      hp: 380, damage: 17, speed: 70, radius: 21, xp: 10, score: 15, ai: 'chase', kbResist: 0.8,
      desc: '거대하고 끈질기다. 거의 밀리지 않는다.',
    },
    reviewer2: {
      name: 'Reviewer #2', tier: 4, sprite: { text: 'R2', bg: '#c92a2a' },
      hp: 230, damage: 15, speed: 90, radius: 17, xp: 8, score: 12, ai: 'dash',
      dash: { range: 340, windup: 0.5, time: 0.55, mult: 3.6, rest: 0.4 },
      desc: '멈칫(!)한 뒤 아주 빠르게 돌진한다. 악명 높은 2번 리뷰어.',
    },
    // 4학기 원거리 적 (탄막): 쏘기 직전 몸 주위로 빨간 고리가 조여든다
    interview: {
      name: '취업 면접', tier: 4, sprite: { emoji: '👔', bg: '#364fc7' },
      hp: 200, damage: 14, speed: 76, radius: 17, xp: 8, score: 12, ai: 'ranged', kbResist: 0.3,
      ranged: { keep: 280, every: 2.8, speed: 240, damage: 8, style: 'question', count: 3, spread: 0.24 },
      desc: '거리를 두고 2.8초마다 압박 질문 3개를 부채꼴로 던진다. 석사 4학기는 취업 면접 시즌.',
    },
    thesis_draft: {
      name: '학위논문 초고', tier: 4, sprite: { emoji: '📓', bg: '#e599f7' },
      hp: 280, damage: 15, speed: 60, radius: 19, xp: 9, score: 13, ai: 'ranged', kbResist: 0.5,
      ranged: { keep: 320, every: 3.6, speed: 190, damage: 7, style: 'paper', count: 6, radial: true },
      desc: '거리를 두고 3.6초마다 고쳐 쓴 원고 6장을 사방으로 뿌린다. 쓰고 또 써도 끝나지 않는다.',
    },
    deadline: {
      name: '마감', tier: 4, sprite: { emoji: '⏰', bg: '#ff6b6b' },
      hp: 60, damage: 12, speed: 175, radius: 13, xp: 2, score: 3, ai: 'chase',
      desc: '아주 빠르다. 떼를 지어 화면을 가로지른다.',
    },
    oral: {
      name: '학회 구두 발표', tier: 4, boss: true, sprite: { emoji: '🎤', bg: '#343a40' },
      hp: 3200, damage: 26, speed: 70, radius: 56, xp: 300, score: 3000, ai: 'chase',
      skills: [
        { type: 'radial', every: 3.2, count: 18, speed: 220, damage: 12, style: 'question' },
        { type: 'summon', every: 12, pool: ['reviewer2'], count: 2, msg: '😈 "질문 있습니다"' },
        { type: 'laser', every: 7.5, first: 4, warn: 1.2, dur: 1.0, range: 440, arc: 2.0, width: 14, damage: 18,
          tip: '🔴 레이저 포인터! 빨간 부채꼴을 레이저가 쓸고 지나가요. 멀리 또는 옆으로 빠지세요' },
      ],
      desc: '4학기 중간보스. 3.2초마다 질문 18개를 퍼붓고, 12초마다 Reviewer #2 2명을 부른다. 특수 패턴 「레이저 포인터」: 플레이어 쪽으로 빨간 부채꼴을 띄운 뒤 레이저로 그 안을 한 번 쓸고 지나간다. 부채꼴 밖(멀리 또는 옆)으로 빠지자.',
    },
    thesis_defense: {
      name: '졸업논문 심사', tier: 4, boss: true, sprite: { emoji: '📜', bg: '#1864ab' },
      hp: 6000, damage: 28, speed: 72, radius: 58, xp: 600, score: 8000, ai: 'chase',
      skills: [
        { type: 'radial', every: 3.2, count: 14, speed: 215, damage: 12, style: 'question' },
        { type: 'aimed', every: 5, count: 3, spread: 0.2, speed: 280, damage: 12, style: 'paper' },
        { type: 'summon', every: 12, pool: ['reviewer2', 'proposal'], count: 2, msg: '📜 "심사위원 질문 하나만 더 드리겠습니다"' },
        { type: 'spotlight', every: 11, first: 6, warn: 2.0, radius: 100, dist: 200, damage: 22,
          tip: '🔦 발표자 조명! 조명 밖이 전부 터져요. 초록 화살표를 따라 동그란 조명 안으로 들어가세요' },
      ],
      phase2: { at: 0.5, every: 0.75, msg: '📝 「수정 후 재심사」! 심사가 더 깐깐해졌다 (모든 공격이 빨라짐)' },
      desc: '최종 보스. 4학기가 끝나기 전에 쓰러뜨려야 취업할 수 있다. 3.2초마다 질문 14개를 사방으로, 5초마다 수정 요청 3장을 조준해 던지고, 12초마다 심사위원(Reviewer #2·과제 제안서 작성) 2명을 부른다. 특수 패턴 「발표자 조명」: 주변이 빨갛게 물들며 근처에 동그란 조명이 켜지고, 2초 뒤 조명 밖이 전부 터진다. 초록 화살표를 따라 조명 안으로 들어가자. 체력이 절반 아래로 떨어지면 「수정 후 재심사」로 모든 공격이 빨라진다.',
    },

    // ───────── 박사 과정 전용 (보스 등장 순서는 data/chapters.js 의 GS.data.phd.bosses) ─────────
    // 과제 정기 보고: 2학기의 과제 킥오프 미팅이 박사 과정에서 매달 돌아오는 정기 보고가 됐다 (고유 패턴 「진도 체크」)
    report: {
      name: '과제 정기 보고', tier: 5, boss: true, sprite: { emoji: '📋', bg: '#f08c00' },
      hp: 6000, damage: 20, speed: 72, radius: 48, xp: 300, score: 3000, ai: 'chase',
      skills: [
        { type: 'summon', every: 8, pool: ['project_meeting', 'proposal', 'revision'], count: 4, msg: '📋 "이번 달 진행 상황 보고해 주세요"' },
        { type: 'aimed', every: 3.5, count: 5, spread: 0.22, speed: 270, damage: 14, style: 'paper' },
        { type: 'check', every: 9, first: 5, count: 3, gap: 1.1, warn: 2.2, lock: 0.7, speed: 150, radius: 80, damage: 20,
          tip: '🔍 진도 체크! 돋보기 표적이 나를 따라와요. 표적이 멈추면(확인!) 바로 빠져나가세요' },
      ],
      desc: '박사 과정 두 번째 보스. 과제 킥오프 미팅이 매달 돌아오는 정기 보고가 됐다. 8초마다 과제 미팅·과제 제안서 작성·메이저 리비전 4명을 부르고, 3.5초마다 보고서 5장을 조준해 던진다. 특수 패턴 「진도 체크」: 돋보기 표적 3개가 1.1초 간격으로 나타나 플레이어를 따라온다(내 걸음보다 조금 느림). 1.5초 뒤 표적이 멈추고 「확인!」이 뜨면 0.7초 뒤 그 자리가 터진다. 계속 움직이거나, 멈추는 순간 빠져나가자.',
    },
    defense: {
      name: '박사 학위 논문 심사', tier: 5, boss: true, sprite: { emoji: '🎓', bg: '#212529' },
      hp: 14000, damage: 30, speed: 74, radius: 58, xp: 600, score: 8000, ai: 'chase',
      skills: [
        { type: 'radial', every: 3, count: 20, speed: 230, damage: 16, style: 'question' },
        { type: 'aimed', every: 3.2, count: 5, spread: 0.16, speed: 300, damage: 18, style: 'paper' },
        { type: 'summon', every: 8, pool: ['reviewer2', 'proposal'], count: 3, msg: '🎓 "심사위원 추가 질문입니다"' },
        { type: 'redpen', every: 9, first: 5, count: 3, gap: 0.5, warn: 0.95, len: 960, width: 24, damage: 20,
          tip: '🖍️ 빨간펜 수정! 빨간 점선을 따라 빨간펜이 긋고 지나가요. 선에서 비켜서세요' },
        { type: 'stamp', every: 15, first: 11, warn: 1.6, radius: 150, damage: 32,
          tip: '🔴 재심사 도장! 큰 원 밖으로 피하세요' },
      ],
      desc: '박사 과정 마지막(네 번째) 보스. 질문 탄막·조준 공격·심사위원 소환에 더해 특수 패턴 두 가지를 쓴다. 「빨간펜 수정」: 플레이어를 가로지르는 빨간 점선 3줄이 차례로 생긴 뒤 빨간펜이 긋고 지나간다. 「재심사 도장」: 플레이어 발밑에 큰 원이 찍히고 1.6초 뒤 도장이 쾅 내려찍힌다. 원 밖으로 피하자.',
    },
  };
})(window.GS = window.GS || {});
