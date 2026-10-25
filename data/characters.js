// 플레이어 캐릭터. 시작 무기 후보와 기본 패시브가 다르다
// passive: 처음부터 적용되는 기본 패시브 (패시브 칸을 차지하지 않음). stats 는 패시브와 같은 스탯에 더해진다
// 무기 데이터의 only: 'dry' / 'wet' 는 그 캐릭터만 얻을 수 있는 전용 무기
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.characters = {
    dry: {
      name: 'Dry lab', lab: '시뮬레이션 연구실',
      desc: '하루 종일 모니터 앞에서 시뮬레이션을 돌린다. 키보드·마우스·개인 PC가 무기.',
      startWeapons: ['pen', 'mouse', 'keyboard', 'pc'],
      passive: {
        name: '병렬 연산', icon: '🗄️', desc: '모든 무기 공격 간격(쿨타임) -8%',
        stats: { cooldown: -0.08 }, flavor: '계산은 서버가 다 한다',
      },
    },
    wet: {
      name: 'Wet lab', lab: '실험 연구실',
      desc: '가운을 입고 실험대 앞에 서 있다. 피펫·시약병·분젠 버너·실험쥐가 무기.',
      startWeapons: ['pipette', 'flask', 'bunsen', 'labmouse'],
      passive: {
        name: '실험 가운', icon: '🥼', desc: '받는 피해 -1, 최대 멘탈 +10%',
        stats: { armor: 1, maxHp: 0.1 }, flavor: '얼룩 하나하나가 실험 기록이다',
      },
    },
  };
})(window.GS = window.GS || {});
