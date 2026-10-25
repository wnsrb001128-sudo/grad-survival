// 패시브 아이템. stat 에 per × 레벨 만큼 더해진다 (배율 스탯은 1.0 기준 합연산).
// flavor: 게임에 영향 없는 한마디 (레벨업 카드·게임 방법에 표시)
(function (GS) {
  'use strict';
  GS.data = GS.data || {};

  GS.data.passives = {
    americano:  { name: 'FAV 커피',      icon: '☕', stat: 'might',     per: 0.10,  max: 5, desc: '공격력 +10%',
      flavor: '파브인지 페이브인지?' },
    energy:     { name: '구론산',        icon: '⚡', stat: 'cooldown',  per: -0.08, max: 5, desc: '무기 공격 간격(쿨타임) -8%',
      flavor: '교수님도 학생 때 마시던 그 맛' },
    vitamin:    { name: '영양제',        icon: '💊', stat: 'maxHp',     per: 0.20,  max: 5, desc: '최대 멘탈 +20%',
      flavor: '크레아틴+밀크시슬+오메가3+종합비타민+아르기닌+프로틴+유산균+마그네슘' },
    pillow:     { name: '2남 휴게실',    icon: '🛋️', stat: 'regen',     per: 0.25,  max: 5, desc: '초당 멘탈 회복 +0.25',
      flavor: '이상한 냄새가 난다' },
    headphones: { name: '에어팟',        icon: { custom: 'airpods' }, stat: 'armor', per: 1, max: 5, desc: '받는 피해 -1',
      flavor: '한쪽은 늘 어딘가로 사라진다' },
    kickboard:  { name: '지쿠터',        icon: '🛴', stat: 'moveSpeed', per: 0.10,  max: 5, desc: '이동 속도 +10%',
      flavor: '헬멧 안 쓰면 벌금' },
    monitor:    { name: '듀얼 모니터',   icon: '📺', stat: 'area',      per: 0.10,  max: 5, desc: '모든 공격의 범위·크기 +10%',
      flavor: '한쪽 화면은 유튜브 전용' },
    tumbler:    { name: '텀블러',        icon: '🥤', stat: 'duration',  per: 0.10,  max: 5, desc: '지속 시간 +10% (전공서적이 도는 시간, GPT 레이저 유지 시간)',
      flavor: '설거지는 내일의 나에게' },
    copier:     { name: '복사기',        icon: '📠', stat: 'amount',    per: 1,     max: 2, desc: '모든 무기 발사 수 +1 (책·레이저·에이전트 개수 포함, 파리채는 늘 1개)',
      flavor: '급할 때만 용지가 걸린다' },
    lan:        { name: '기가 랜선',     icon: '🔌', stat: 'projSpeed', per: 0.10,  max: 5, desc: '투사체 속도 +10% (책·Codex 회전, 클로드 코드 이동도 빨라짐)',
      flavor: '연구실 와이파이는 믿을 수 없다' },
    scholar:    { name: '구글 스칼라',   icon: '🔍', stat: 'magnet',    per: 0.30,  max: 5, desc: '지식 흡수 범위 +30%',
      flavor: '내 인용 수 확인은 하루 다섯 번' },
    yeot:       { name: '합격 엿',       icon: '🍬', stat: 'luck',      per: 0.10,  max: 5, desc: '행운 +10% (선택지 4개 확률↑)',
      flavor: '붙어라, 제발' },
    study:      { name: '논문 스터디',   icon: '📖', stat: 'growth',    per: 0.08,  max: 5, desc: '지식(경험치) 획득 +8%',
      flavor: '발표 차례는 왜 늘 나인가' },
  };
})(window.GS = window.GS || {});
