// 공용 유틸: 시드 난수, 수학 함수, 공간 분할 그리드
(function (GS) {
  'use strict';
  const U = GS.util = {};

  // 시드 고정 난수 (시뮬레이션 재현용)
  U.mulberry32 = function (seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  U.clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

  U.fmtTime = function (sec) {
    sec = Math.max(0, Math.floor(sec));
    const m = Math.floor(sec / 60), s = sec % 60;
    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
  };

  U.fmtNum = (n) => Math.floor(n).toLocaleString('ko-KR');

  // { key: weight } 에서 가중치 랜덤 선택
  U.weightedPick = function (rand, weights) {
    let total = 0, last = null;
    for (const k in weights) total += weights[k];
    let r = rand() * total;
    for (const k in weights) {
      last = k;
      r -= weights[k];
      if (r <= 0) return k;
    }
    return last;
  };

  // 공간 분할 그리드: 충돌 후보를 빠르게 찾기 위함 (작은 적만 넣는다)
  class Grid {
    constructor(cell) {
      this.cell = cell;
      this.map = new Map();
      this.free = [];
      this.used = [];
    }
    clear() {
      for (let i = 0; i < this.used.length; i++) {
        this.used[i].length = 0;
        this.free.push(this.used[i]);
      }
      this.used.length = 0;
      this.map.clear();
    }
    insert(e) {
      const k = Math.floor(e.x / this.cell) * 65536 + Math.floor(e.y / this.cell);
      let arr = this.map.get(k);
      if (!arr) {
        arr = this.free.pop() || [];
        this.map.set(k, arr);
        this.used.push(arr);
      }
      arr.push(e);
    }
    // out 배열에 (x,y) 반경 r 안 셀들의 원소를 담아 반환
    query(x, y, r, out) {
      out.length = 0;
      const c = this.cell;
      const x0 = Math.floor((x - r) / c), x1 = Math.floor((x + r) / c);
      const y0 = Math.floor((y - r) / c), y1 = Math.floor((y + r) / c);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const arr = this.map.get(cx * 65536 + cy);
          if (arr) for (let i = 0; i < arr.length; i++) out.push(arr[i]);
        }
      }
      return out;
    }
  }
  U.Grid = Grid;
})(window.GS = window.GS || {});
