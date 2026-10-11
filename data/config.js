// 전역 설정값. 밸런스 수치는 tools/sim.html 시뮬레이션으로 조정됨.
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.config = {
    title: '대학원에서 살아남기',
    subtitle: '석사 4학기, 졸업까지 살아남아라',

    // 화면에 보이는 월드 크기 기준 (창 크기와 무관하게 비슷한 시야 유지)
    view: { width: 1280, height: 720 },

    player: {
      maxHp: 100,            // 멘탈
      regen: 0.1,            // 기본 멘탈 회복 (초당)
      speed: 200,            // px/s
      radius: 16,
      magnet: 120,           // 지식(경험치) 흡수 반경 px
      contactCooldown: 0.6,  // 같은 적에게 다시 맞기까지(초)
    },

    slots: { weapons: 6, passives: 6 },
    choiceCount: 3,          // 레벨업 선택지 수 (행운으로 +1)
    maxEnemies: 400,
    gemCap: 300,             // 바닥 지식 개수 상한 (넘으면 합쳐짐)

    jobScore: 40000,         // 4차 종료 시 취업 커트라인 (연구 실적). 시뮬: 정상 플레이 3.4만~12만, 도망형 ~1.4만

    // Lv → Lv+1 필요 지식 = base + step*(Lv-1) + accel*(Lv-1)^2
    xp: { base: 4, step: 5.6, accel: 0.24 },

    // 성소(헬스·증바람·회식·학회·풋살) 등장 규칙
    sanctuary: { first: 24, intervalMin: 29, intervalMax: 40, lifetime: 45, maxActive: 2, distMin: 460, distMax: 740, radius: 44 },

    // Accept 메일(보상 상자) 보상 개수 확률 (행운 배율 적용)
    chest: { three: 0.22, five: 0.05 },

    damageNumbers: true,
    startWeapons: ['pen', 'mouse', 'keyboard', 'pc'],
  };
})(window.GS = window.GS || {});
