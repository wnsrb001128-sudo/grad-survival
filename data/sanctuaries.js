// 성소: 맵에 주기적으로 열리는 휴식처. 들어가면 효과 발동 후 사라진다.
// weight 가 클수록 자주 등장 (헬스 > 증바람 > 회식 > 학회 > 풋살)
// effect: heal(최대 멘탈 비율) / speed(이동속도 +비율), speedTime / invuln(무적 초)
//         nuke(화면 적 정리) / augment(증강 3택1) / upgrades(랜덤 강화 개수)
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.sanctuaries = {
    gym: {
      name: '헬스장', emoji: '🏋️', color: '#40c057', weight: 40,
      effect: { heal: 0.4, speed: 0.25, speedTime: 15 },
      msg: '운동 완료! 멘탈 40% 회복 + 15초간 이동 속도 증가',
    },
    aram: {
      name: '증바람', emoji: '🎮', color: '#7950f2', weight: 26,
      effect: { heal: 0.2, augment: true },
      msg: '증강 칼바람 한 판! 증강을 하나 고르자',
    },
    dinner: {
      name: '회식', emoji: '🍻', color: '#f76707', weight: 18,
      effect: { heal: 1.0, speed: -0.2, speedTime: 6 },
      msg: '배부르게 먹었다! 멘탈 완전 회복 (숙취로 잠시 느려짐)',
    },
    conference: {
      name: '학회 출장', emoji: '✈️', color: '#1c7ed6', weight: 11,
      effect: { heal: 0.3, upgrades: 3 },
      msg: '학회에서 견문을 넓혔다! 랜덤 강화 3개',
    },
    futsal: {
      name: '풋살', emoji: '⚽', color: '#e64980', weight: 5,
      effect: { heal: 0.5, nuke: true, invuln: 8 },
      msg: '스트레스 해소! 화면의 적 전멸 + 8초 무적',
    },
  };
})(window.GS = window.GS || {});
