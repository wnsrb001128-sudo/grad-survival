// 적이 떨어뜨리는 아이템 (지식=경험치는 항상 드롭, 아래는 확률 드롭)
// chance: 일반 적 처치 시 드롭 확률. accept 는 엘리트/보스 확정 드롭
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.items = {
    kimbap:  { name: '삼각김밥', icon: '🍙', chance: 0.004,  effect: { heal: 25 }, msg: '🍙 삼각김밥으로 멘탈 회복' },
    ctrl_a:  { name: 'Ctrl+A', icon: { text: 'Ctrl+A', bg: '#f8f9fa', fg: '#343a40', key: true }, chance: 0.0012, effect: { vacuum: true }, msg: '⌨️ Ctrl+A! 맵의 모든 지식 흡수' },
    hyugang: { name: '휴강 공지', icon: '📢', chance: 0.0007, effect: { nuke: true }, msg: '📢 휴강이다!! 화면의 적이 사라졌다' },
    trip:    { name: '교수님 해외출장', icon: '🧳', chance: 0.0008, effect: { freeze: 8 }, msg: '🧳 교수님 해외출장! 8초간 모든 업무 정지' },
    accept:  { name: 'Accept 메일', icon: '📩', effect: { chest: true } },
  };
})(window.GS = window.GS || {});
