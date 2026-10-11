// 적 데이터. tier = 등장 레벨(1~4), boss = 보스 여부
// ai: chase(추적) / dash(멈칫 후 돌진) / ranged(거리 유지 + 원거리) / bomber(카운트다운 후 자폭)
//     line, ring 은 이벤트에서 지정 (화면 횡단 떼 / 원형 포위)
// skills: 주기적으로 쓰는 기술 (radial 탄막, aimed 조준탄, summon 소환, ring 포위)
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
      skills: [{ type: 'radial', every: 3, count: 8, speed: 170, damage: 6, style: 'germ', slow: { amt: 0.3, time: 2 } }],
      desc: '1학기 중간보스. 3초마다 기침으로 세균 8개를 흩뿌린다. 닿거나 세균에 맞으면 2초 동안 30% 느려진다.',
    },
    final_exam: {
      name: '기말고사', tier: 1, boss: true, sprite: { emoji: '📝', bg: '#e03131' },
      hp: 1100, damage: 14, speed: 68, radius: 40, xp: 60, score: 600, ai: 'chase',
      skills: [{ type: 'radial', every: 3.5, count: 10, speed: 190, damage: 9, style: 'paper' }],
      desc: '1학기 보스. 3.5초마다 시험지 10장을 사방으로 흩뿌린다.',
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
      ranged: { keep: 260, every: 2.6, speed: 230, damage: 8, style: 'paper' },
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
      desc: '지나간 자리에 데이터 점(파란 점)을 찍으며 다닌다. 점을 밟으면 피해를 입고, 점은 4초 뒤 사라진다.',
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
    kickoff: {
      name: '과제 킥오프 미팅', tier: 2, boss: true, sprite: { emoji: '🚀', bg: '#1971c2' },
      hp: 4200, damage: 16, speed: 72, radius: 44, xp: 120, score: 1500, ai: 'chase',
      skills: [
        { type: 'summon', every: 6, pool: ['la', 'ta', 'oa', 'lab_meeting'], count: 5, msg: '🚀 "자, 역할 분담하겠습니다"' },
        { type: 'aimed', every: 3.5, count: 5, spread: 0.22, speed: 260, damage: 11, style: 'paper' },
      ],
      desc: '2학기 보스. 6초마다 LA·TA·OA·주간 랩미팅 5명을 불러 역할을 나누고, 3.5초마다 할 일 목록 5장을 플레이어 쪽으로 던진다.',
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
      onDeath: { count: 8, speed: 210, damage: 10, style: 'warn' },
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
    poster: {
      name: '학회 포스터 발표', tier: 3, boss: true, sprite: { emoji: '🖼️', bg: '#7048e8' },
      hp: 14000, damage: 20, speed: 64, radius: 50, xp: 250, score: 3000, ai: 'chase',
      skills: [
        { type: 'ring', every: 8, enemy: 'poster_board', count: 14, radius: 330, msg: '🪧 포스터 세션! 포스터 보드에 둘러싸였다' },
        { type: 'radial', every: 4, count: 14, speed: 210, damage: 12, style: 'question' },
      ],
      desc: '3학기 보스. 8초마다 포스터 보드 14개로 플레이어를 둘러싸 가두고, 4초마다 질문을 사방으로 던진다.',
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
      hp: 230, damage: 18, speed: 90, radius: 17, xp: 8, score: 12, ai: 'dash',
      dash: { range: 340, windup: 0.5, time: 0.55, mult: 3.6, rest: 0.4 },
      desc: '멈칫(!)한 뒤 아주 빠르게 돌진한다. 악명 높은 2번 리뷰어.',
    },
    deadline: {
      name: '마감', tier: 4, sprite: { emoji: '⏰', bg: '#ff6b6b' },
      hp: 60, damage: 12, speed: 175, radius: 13, xp: 2, score: 3, ai: 'chase',
      desc: '아주 빠르다. 떼를 지어 화면을 가로지른다.',
    },
    oral: {
      name: '학회 구두 발표', tier: 4, boss: true, sprite: { emoji: '🎤', bg: '#343a40' },
      hp: 12000, damage: 26, speed: 70, radius: 56, xp: 500, score: 6000, ai: 'chase',
      skills: [
        { type: 'radial', every: 2.8, count: 18, speed: 220, damage: 14, style: 'question' },
        { type: 'summon', every: 9, pool: ['reviewer2'], count: 2, msg: '😈 "질문 있습니다"' },
      ],
      desc: '최종 보스. 2.8초마다 질문 18개를 사방으로 퍼붓고, 9초마다 Reviewer #2를 부른다. 잡으면 실적 +6,000.',
    },

    // ───────── 박사 과정 전용 ─────────
    defense: {
      name: '박사 학위논문 심사', tier: 5, boss: true, sprite: { emoji: '🎓', bg: '#212529' },
      hp: 60000, damage: 30, speed: 74, radius: 58, xp: 600, score: 8000, ai: 'chase',
      skills: [
        { type: 'radial', every: 2.4, count: 20, speed: 230, damage: 16, style: 'question' },
        { type: 'aimed', every: 3.2, count: 5, spread: 0.16, speed: 300, damage: 18, style: 'paper' },
        { type: 'summon', every: 8, pool: ['reviewer2', 'proposal'], count: 3, msg: '🎓 "심사위원 추가 질문입니다"' },
      ],
      desc: '박사 과정 보스. 질문 탄막, 조준 공격, 심사위원(Reviewer #2·제안서) 소환을 모두 쓴다.',
    },
  };
})(window.GS = window.GS || {});
