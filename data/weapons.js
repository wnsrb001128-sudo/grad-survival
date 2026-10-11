// 무기 데이터.
// tier: 'base'(기본 무기, 레벨업으로 획득) / 'evolved'(최대 레벨 도달 시 진화로만 획득)
// behavior: js/weapons.js 의 공격 방식 이름
// levels[i]: Lv(i+2)로 올릴 때 더해지는 값 (최대 Lv 8). area/speed 는 배율(+0.2 = +20%)
// icon: 이모지 문자열 또는 { text, bg, fg, bg2 } 배지
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.weapons = {
    // ───────── 기본 무기 (시작 무기 후보) ─────────
    pen: {
      name: '펜', icon: '🖊️', tier: 'base', behavior: 'shoot_lock', style: 'pen',
      desc: '가장 가까운 적에게 펜을 던진다. 끝까지 쫓아가 반드시 명중한다.',
      base: { damage: 8, cooldown: 0.95, amount: 1, pierce: 1, speed: 600, life: 1.4, size: 7, knockback: 60, spread: 6, range: 650 },
      levels: [
        { amount: 1, text: '투사체 +1' },
        { damage: 3, text: '피해 +3' },
        { amount: 1, text: '투사체 +1' },
        { damage: 3, pierce: 1, text: '피해 +3, 관통 +1' },
        { amount: 1, text: '투사체 +1' },
        { cooldown: -0.15, text: '쿨타임 -0.15초' },
        { amount: 1, pierce: 1, text: '투사체 +1, 관통 +1' },
      ],
      evolveTo: 'red_pen',
    },
    mouse: {
      name: '마우스', icon: '🖱️', tier: 'base', behavior: 'shoot_nearest', style: 'cursor',
      desc: '가장 가까운 적 쪽으로 커서를 곧게 날린다. 피해는 약하지만 지나가는 길의 적을 모두 관통한다.',
      base: { damage: 6, cooldown: 1.0, amount: 1, pierce: -1, speed: 520, life: 1.2, size: 9, knockback: 40 },
      levels: [
        { amount: 1, text: '커서 +1' },
        { cooldown: -0.15, text: '쿨타임 -0.15초' },
        { damage: 3, text: '피해 +3' },
        { amount: 1, text: '커서 +1' },
        { area: 0.3, text: '커서 크기 +30%' },
        { amount: 1, text: '커서 +1' },
        { damage: 4, text: '피해 +4' },
      ],
      evolveTo: 'gaming_mouse',
    },
    keyboard: {
      name: '키보드', icon: '⌨️', tier: 'base', behavior: 'radial', style: 'key',
      desc: '사방으로 키캡을 난사한다.',
      base: { damage: 8, cooldown: 1.3, amount: 4, pierce: 1, speed: 380, life: 0.75, size: 9, knockback: 70 },
      levels: [
        { amount: 2, text: '키캡 +2' },
        { damage: 3, text: '피해 +3' },
        { amount: 2, text: '키캡 +2' },
        { cooldown: -0.2, text: '쿨타임 -0.2초' },
        { damage: 3, pierce: 1, text: '피해 +3, 관통 +1' },
        { amount: 2, text: '키캡 +2' },
        { damage: 4, text: '피해 +4' },
      ],
      evolveTo: 'mech_keyboard',
    },
    pc: {
      name: '개인 PC', icon: '🖥️', tier: 'base', behavior: 'aura', style: 'heat',
      desc: '본체 발열로 주변 적에게 계속 피해를 준다.',
      base: { damage: 9, hitInterval: 0.55, radius: 105, knockback: 30 },
      levels: [
        { area: 0.15, damage: 1, text: '범위 +15%, 피해 +1' },
        { damage: 2, text: '피해 +2' },
        { hitInterval: -0.05, text: '타격 간격 -0.05초' },
        { area: 0.15, damage: 2, text: '범위 +15%, 피해 +2' },
        { damage: 2, text: '피해 +2' },
        { hitInterval: -0.05, area: 0.1, text: '타격 간격 -0.05초, 범위 +10%' },
        { damage: 3, text: '피해 +3' },
      ],
      evolveTo: 'workstation',
    },

    // ───────── 레벨업으로 얻는 무기 ─────────
    textbook: {
      name: '전공서적', icon: '📕', tier: 'base', behavior: 'orbit', style: 'book',
      desc: '두꺼운 전공서적이 주위를 돌며 적을 후려친다.',
      base: { damage: 12, cooldown: 3.2, duration: 3.0, amount: 1, radius: 85, speed: 3.2, size: 16, knockback: 140, hitInterval: 0.5 },
      levels: [
        { amount: 1, text: '책 +1' },
        { area: 0.2, speed: 0.25, text: '범위 +20%, 회전 속도 +25%' },
        { duration: 0.5, damage: 5, text: '지속 +0.5초, 피해 +5' },
        { amount: 1, text: '책 +1' },
        { area: 0.2, text: '범위 +20%' },
        { damage: 6, duration: 0.5, text: '피해 +6, 지속 +0.5초' },
        { amount: 1, text: '책 +1' },
      ],
      evolveTo: 'thesis',
    },
    claude: {
      name: '클로드', icon: { text: '✻', bg: '#d97757' }, tier: 'base', behavior: 'companion', style: 'claude',
      desc: '옆에 붙어 다니는 AI 조수. 가장 위협적인 적을 골라 유도탄을 쏜다.',
      base: { damage: 15, cooldown: 1.15, amount: 1, pierce: 1, speed: 520, life: 2.0, size: 8, knockback: 60, homing: 9, range: 520 },
      levels: [
        { damage: 5, text: '피해 +5' },
        { amount: 1, text: '유도탄 +1' },
        { cooldown: -0.15, text: '쿨타임 -0.15초' },
        { damage: 6, text: '피해 +6' },
        { amount: 1, text: '유도탄 +1' },
        { pierce: 1, cooldown: -0.1, text: '관통 +1, 쿨타임 -0.1초' },
        { damage: 8, text: '피해 +8' },
      ],
      evolveTo: 'claude_code',
    },
    gpt: {
      name: 'GPT', icon: { text: 'GPT', bg: '#10a37f' }, tier: 'base', behavior: 'beam', style: 'gpt',
      desc: '가장 가까운 적을 향해 관통 레이저(답변)를 발사한다.',
      base: { damage: 20, cooldown: 2.0, amount: 1, length: 430, width: 16, duration: 0.3, knockback: 40 },
      levels: [
        { damage: 6, text: '피해 +6' },
        { amount: 1, text: '레이저 +1' },
        { cooldown: -0.3, text: '쿨타임 -0.3초' },
        { area: 0.2, text: '범위 +20%' },
        { damage: 8, text: '피해 +8' },
        { amount: 1, text: '레이저 +1' },
        { cooldown: -0.2, damage: 6, text: '쿨타임 -0.2초, 피해 +6' },
      ],
      evolveTo: 'codex',
    },
    gemini: {
      name: '제미나이', icon: { text: '✦', bg: '#4285f4', bg2: '#a142f4' }, tier: 'base', behavior: 'random_shot', style: 'gemini',
      desc: '아무 방향으로나 쏜다. 가끔 엉뚱한 답(환각)을 낸다. 진화 불가.',
      base: { damage: 5, cooldown: 1.6, amount: 2, pierce: 1, speed: 300, life: 1.2, size: 7, knockback: 20, fizzle: 0.3 },
      levels: [
        { damage: 1, text: '피해 +1 (아마도)' },
        { amount: 1, text: '투사체 +1' },
        { damage: 1, text: '피해 +1' },
        { cooldown: -0.1, text: '쿨타임 -0.1초' },
        { damage: 1, text: '피해 +1' },
        { amount: 1, text: '투사체 +1' },
        { damage: 2, text: '피해 +2… 이게 최선입니다' },
      ],
      weight: 80,
      evolveTo: null,
    },

    // ───────── 진화 무기 (기본 무기 최대 레벨 → 진화) ─────────
    red_pen: {
      name: '교수님의 빨간펜', icon: '🖍️', tier: 'evolved', behavior: 'shoot_lock', style: 'red_pen',
      desc: '쉴 새 없이 쏟아지는 첨삭. 적을 끝까지 쫓아가 4마리까지 꿰뚫는다.',
      base: { damage: 15, cooldown: 0.15, amount: 2, pierce: 4, speed: 760, life: 1.2, size: 8, knockback: 50, spread: 8, range: 650 },
    },
    gaming_mouse: {
      name: '게이밍 마우스', icon: '🖱️', tier: 'evolved', behavior: 'drag_select', style: 'dragbox',
      desc: '적 무리를 드래그로 선택한 뒤 통째로 Delete 한다.',
      base: { damage: 45, cooldown: 1.1, amount: 2, boxW: 230, boxH: 160, delay: 0.25 },
    },
    mech_keyboard: {
      name: '기계식 키보드(청축)', icon: '⌨️', tier: 'evolved', behavior: 'radial', style: 'key_mech',
      desc: '키캡 난사 + 귀를 찢는 "딸깍!" 충격파로 주변을 밀어낸다.',
      base: { damage: 20, cooldown: 0.85, amount: 12, pierce: 2, speed: 460, life: 0.8, size: 10, knockback: 90,
        shockwave: { damage: 35, radius: 210, knockback: 260 } },
    },
    workstation: {
      name: '워크스테이션', icon: '🖥️', tier: 'evolved', behavior: 'aura', style: 'heat_ws',
      desc: 'GPU 풀가동. 거대한 열기와 주기적인 과열 폭발.',
      base: { damage: 22, hitInterval: 0.4, radius: 140, knockback: 50,
        pulse: { every: 3.2, damage: 70, radius: 300, knockback: 300 } },
    },
    thesis: {
      name: '학위논문', icon: '📜', tier: 'evolved', behavior: 'orbit', style: 'thesis',
      desc: '내 학위논문. 멈추지 않고 영원히 회전한다.',
      base: { damage: 30, cooldown: 0, duration: Infinity, amount: 5, radius: 115, speed: 3.6, size: 20, knockback: 180, hitInterval: 0.4 },
    },
    claude_code: {
      name: '클로드 코드', icon: { text: '>_', bg: '#d97757' }, tier: 'evolved', behavior: 'agents', style: 'agent',
      desc: '서브에이전트를 여러 개 띄워 적을 알아서 처리한다.',
      base: { damage: 26, amount: 4, speed: 430, size: 11, hitInterval: 0.3, knockback: 80, range: 600 },
    },
    codex: {
      name: 'Codex', icon: { text: '</>', bg: '#111827', fg: '#7ee0c3' }, tier: 'evolved', behavior: 'beam_spin', style: 'codex',
      desc: '코드를 실행하듯 회전 레이저가 쉬지 않고 주변을 쓸어버린다.',
      base: { damage: 24, amount: 3, length: 330, width: 20, speed: 2.4, hitInterval: 0.3, knockback: 60 },
    },
  };
})(window.GS = window.GS || {});
