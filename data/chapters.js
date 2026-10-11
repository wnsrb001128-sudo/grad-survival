// 웨이브(챕터) 데이터. 1차~4차 각 4분, 4차가 끝나면 연구 실적으로 취업 판정.
// hpMult: 이 챕터에서 나오는 적 체력 배율
// segments: t초부터 적용 (pool = 등장 적 가중치, min = 필드 최소 유지 수, interval/batch = 추가 소환 주기/수)
//           필드 적이 min×2+20 이상이면 추가 소환을 멈춘다 (cap 으로 직접 지정 가능)
// events: ring(원형 포위) / line(화면 횡단 떼) / elite(엘리트, Accept 메일 드롭) / burst(한꺼번에 소환)
// midBoss / boss: 정해진 시각에 등장하는 중간보스 / 보스
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.chapters = [
    {
      name: '1차', title: '석사 1학기', duration: 240, hpMult: 1,
      intro: '대학원 생활 시작! 수업과 시험을 버텨라',
      segments: [
        { t: 0,   pool: { lecture: 1 }, min: 6, interval: 1.0, batch: 1 },
        { t: 24,  pool: { lecture: 3, errand: 2 }, min: 12, interval: 0.67, batch: 1 },
        { t: 60,  pool: { lecture: 3, errand: 2, progress: 1 }, min: 18, interval: 0.9, batch: 2 },
        { t: 108, pool: { lecture: 2, errand: 2, progress: 2 }, min: 25, interval: 0.7, batch: 2 },
        { t: 156, pool: { lecture: 2, errand: 1, progress: 2 }, min: 32, interval: 0.6, batch: 2 },
      ],
      events: [
        { t: 80,  type: 'ring', enemy: 'midterm', count: 16, radius: 430, msg: '📝 중간고사 기간! 사방이 시험이다' },
        { t: 140, type: 'line', enemy: 'errand', count: 26, msg: '🏃 "이것 좀 부탁해" 교수님 심부름 폭주!' },
        { t: 160, type: 'elite', enemy: 'progress', msg: '⭐ 교수님이 진행 상황을 물어보신다' },
      ],
      midBoss: { t: 120, enemy: 'cold', msg: '🤧 환절기 감기에 걸렸다!' },
      boss: { t: 180, enemy: 'final_exam', msg: '기말고사가 시작되었다!' },
    },
    {
      name: '2차', title: '석사 2학기', duration: 240, hpMult: 1.25,
      intro: '조교 업무와 랩미팅의 늪',
      segments: [
        { t: 0,   pool: { la: 2, oa: 2, ta: 1, lecture: 1 }, min: 40, interval: 0.6, batch: 2 },
        { t: 48,  pool: { la: 2, ta: 2, oa: 2, grading: 1, lab_meeting: 1, plot: 1 }, min: 50, interval: 0.55, batch: 2 },
        { t: 104, pool: { la: 2, ta: 2, oa: 2, grading: 1, win_update: 1, lab_meeting: 1, plot: 2 }, min: 60, interval: 0.5, batch: 2 },
        { t: 160, pool: { la: 2, ta: 2, oa: 1, grading: 1, win_update: 2, lab_meeting: 2, plot: 2 }, min: 70, interval: 0.45, batch: 2 },
      ],
      events: [
        { t: 36,  type: 'line', enemy: 'oa', count: 30, msg: '🗂️ 행정 업무 폭주!' },
        { t: 60,  type: 'ring', enemy: 'lab_meeting', count: 14, radius: 430, msg: '📅 주간 랩미팅 시간! 다 같이 둘러앉았다' },
        { t: 72,  type: 'elite', enemy: 'la', msg: '⭐ 계산 서버가 다운됐다' },
        { t: 92,  type: 'burst', enemy: 'win_update', count: 6, msg: '💻 윈도우 업데이트 강제 재시작 예정!' },
        { t: 120, type: 'ring', enemy: 'ta', count: 18, radius: 440, msg: '📋 조교 업무에 포위됐다' },
        { t: 144, type: 'elite', enemy: 'grading', msg: '💯 기말 채점 몰아치기!' },
      ],
      boss: { t: 180, enemy: 'kickoff', msg: '과제 킥오프 미팅이 소집되었다!' },
    },
    {
      name: '3차', title: '석사 3학기', duration: 240, hpMult: 2.0,
      intro: '본격적인 연구 과제와 첫 학회',
      segments: [
        { t: 0,   pool: { project_meeting: 2, bug: 3, la: 1, ta: 1, lang: 1 }, min: 80, interval: 0.5, batch: 2 },
        { t: 48,  pool: { project_meeting: 3, revision: 2, bug: 2, nan: 1, win_update: 1, lang: 1 }, min: 90, interval: 0.45, batch: 2 },
        { t: 112, pool: { project_meeting: 3, revision: 2, bug: 2, nan: 2, lang: 2 }, min: 100, interval: 0.4, batch: 2 },
        { t: 168, pool: { project_meeting: 3, revision: 2, bug: 2, nan: 2, win_update: 1, lang: 1 }, min: 110, interval: 0.38, batch: 2 },
      ],
      events: [
        { t: 32,  type: 'elite', enemy: 'project_meeting', msg: '⭐ 과제 중간 점검이 잡혔다' },
        { t: 56,  type: 'line', enemy: 'bug', count: 30, msg: '🐛 버그 대량 발생! 디버깅 시작' },
        { t: 80,  type: 'line', enemy: 'minor_revision', count: 34, msg: '🔄 리뷰 코멘트 폭탄!' },
        { t: 100, type: 'burst', enemy: 'lang', count: 6, msg: '📝 졸업 요건: 어학 성적 제출 마감 임박!' },
        { t: 128, type: 'elite', enemy: 'revision' },
        { t: 148, type: 'ring', enemy: 'project_meeting', count: 18, radius: 450, msg: '💼 과제 미팅 연속 일정!' },
      ],
      boss: { t: 180, enemy: 'poster', msg: '학회 포스터 발표 세션 시작!' },
    },
    {
      name: '4차', title: '석사 4학기', duration: 240, hpMult: 2.8,
      intro: '졸업이 코앞. 실적을 쌓아 취업하자!',
      segments: [
        { t: 0,   pool: { proposal: 2, project_meeting: 2, revision: 2 }, min: 110, interval: 0.4, batch: 2 },
        { t: 56,  pool: { proposal: 3, reviewer2: 1, revision: 2 }, min: 120, interval: 0.38, batch: 2 },
        { t: 120, pool: { proposal: 3, reviewer2: 2, project_meeting: 1 }, min: 130, interval: 0.35, batch: 2 },
      ],
      events: [
        { t: 28,  type: 'line', enemy: 'deadline', count: 36, msg: '⏰ 마감 임박!!' },
        { t: 48,  type: 'elite', enemy: 'proposal', msg: '⭐ 제안서 수정 요청' },
        { t: 96,  type: 'ring', enemy: 'reviewer2', count: 14, radius: 460, msg: '😈 Reviewer #2 등장' },
        { t: 120, type: 'elite', enemy: 'reviewer2' },
        { t: 192, type: 'line', enemy: 'deadline', count: 44, msg: '⏰ 최종 마감!!' },
      ],
      boss: { t: 132, enemy: 'oral', msg: '학회 구두 발표 — 질문 공세가 쏟아진다!' },
    },
  ];

  // 4차 종료 시 실적이 커트라인 미만이면 진입하는 무한 웨이브
  GS.data.phd = {
    yearSeconds: 120,   // 박사 n년차 표시 간격
    pool: { proposal: 3, reviewer2: 2, project_meeting: 2, revision: 2, bug: 2, nan: 1, lang: 1, grading: 1, win_update: 1 },
    minStart: 130, minPerMin: 10, minMax: 300,
    intervalStart: 0.35, intervalPerMin: -0.012, intervalMin: 0.2, batch: 3,
    hpStart: 3.0, hpPerMin: 0.25,     // 체력 배율 = hpStart × (1 + hpPerMin × 경과 분)
    eventEvery: 28,
    events: [
      { type: 'line', enemy: 'deadline', count: 40, msg: '⏰ 마감이 또 왔다' },
      { type: 'ring', enemy: 'reviewer2', count: 16, radius: 460, msg: '😈 리뷰어들이 둘러쌌다' },
      { type: 'line', enemy: 'oa', count: 40, msg: '🗂️ 연구실 행정 업무 폭주' },
      { type: 'burst', enemy: 'win_update', count: 8, msg: '💻 연구실 PC 일괄 업데이트!' },
      { type: 'ring', enemy: 'proposal', count: 16, radius: 460, msg: '📑 과제 제안서 시즌' },
    ],
    bosses: ['defense', 'oral', 'kickoff', 'poster'],
    bossFirst: 48, bossEvery: 120, bossHpGrowth: 0.6,
  };
})(window.GS = window.GS || {});
