// 자동 플레이 봇: 밸런스 시뮬레이터(tools/sim.html)와 데모 모드에서 사용
// mode 'normal' = 적을 피하며 지식·성소를 챙기는 평범한 플레이어
// mode 'runner' = 싸움은 피하고 큰 원을 그리며 도망만 다니는 플레이어
(function (GS) {
  'use strict';
  const Bot = GS.Bot = {};

  const PASSIVE_PRIO = {
    americano: 62, energy: 60, copier: 64, monitor: 52, vitamin: 48, headphones: 50,
    pillow: 44, kickboard: 46, tumbler: 36, scholar: 40, yeot: 26, study: 32, lan: 30,
  };

  Bot.pick = function (g, c) {
    let bi = 0, bs = -1;
    for (let i = 0; i < c.options.length; i++) {
      const o = c.options[i];
      let s = 1;
      if (o.kind === 'evolve') s = 1000;
      else if (o.kind === 'weapon') {
        if (o.id === 'gemini') s = 3;
        else if (o.owned) s = 100 + o.owned.level * 4;
        else s = g.weapons.length < 4 ? 90 : 55;
      } else if (o.kind === 'passive') s = (PASSIVE_PRIO[o.id] || 30) + (o.owned ? 8 : 0);
      if (s > bs) { bs = s; bi = i; }
    }
    return bi;
  };

  Bot.move = function (g, mode) {
    const pl = g.player;
    const runner = mode === 'runner';
    let fx = 0, fy = 0;
    const en = g.enemies;
    // 근접형 무기(발열·책)만 있을 땐 적을 가까이 붙여야 한다
    const melee = g.weapons.length <= 2 && g.weapons.some((w) => w.def.behavior === 'aura' || w.def.behavior === 'orbit');
    const avoid = runner ? 320 : melee ? 70 : 150;
    for (let i = 0; i < en.length; i++) {
      const e = en[i];
      if (!e.active) continue;
      // 보스는 무기가 닿을 만한 거리까지는 붙어서 싸운다
      const dx = pl.x - e.x, dy = pl.y - e.y, R = e.boss && !runner ? 110 + e.r * 1.5 : avoid + e.r * 3, d2 = dx * dx + dy * dy;
      if (d2 > R * R || d2 < 1) continue;
      const d = Math.sqrt(d2), k = (R - d) / R;
      const wgt = ((e.boss ? 2.5 : 1) * k * k) / d;
      fx += dx * wgt;
      fy += dy * wgt;
    }
    const shots = g.enemyShots;
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i], dx = pl.x - s.x, dy = pl.y - s.y, d2 = dx * dx + dy * dy;
      if (d2 > 120 * 120 || d2 < 1) continue;
      const d = Math.sqrt(d2), k = (120 - d) / 120;
      fx += (dx / d) * 1.5 * k;
      fy += (dy / d) * 1.5 * k;
    }
    const danger = Math.hypot(fx, fy);
    // 목표: 성소(필요할 때) > 아이템 > 지식
    let tx = 0, ty = 0, tw = 0;
    let best = null, bd = Infinity;
    for (let i = 0; i < g.sanctuaries.length; i++) {
      const s = g.sanctuaries[i], d = Math.hypot(s.x - pl.x, s.y - pl.y);
      if (d < bd) { bd = d; best = s; }
    }
    const ef = best && best.def.effect;
    if (best && (pl.hp < pl.maxHp * (runner ? 0.5 : 0.75) || (!runner && (ef.augment || ef.upgrades || ef.nuke)))) {
      tx = best.x - pl.x; ty = best.y - pl.y; tw = 1.1;
    } else {
      let tgt = null, td = (runner ? 80 : 420) ** 2;
      for (let i = 0; i < g.items.length; i++) {
        const it = g.items[i], d = (it.x - pl.x) ** 2 + (it.y - pl.y) ** 2;
        if (d < td) { td = d; tgt = it; }
      }
      if (!tgt) { // 가치/거리 비율이 가장 좋은 지식
        let bs = 0;
        const lim = runner ? 80 : 520;
        for (let i = 0; i < g.gems.length; i++) {
          const gm = g.gems[i];
          if (gm.pull) continue;
          const d = Math.hypot(gm.x - pl.x, gm.y - pl.y);
          if (d > lim) continue;
          const s = gm.v / (d + 60);
          if (s > bs) { bs = s; tgt = gm; }
        }
      }
      if (tgt) { tx = tgt.x - pl.x; ty = tgt.y - pl.y; tw = 0.9; }
    }
    const tl = Math.hypot(tx, ty) || 1;
    const dn = danger > 0 ? Math.min(1.6, danger * 35) / danger : 0;
    const tk = danger > 0.15 ? 0.6 : 1;
    // 위험할 땐 옆으로 돌아 빠져나가도록 접선 성분 추가
    let mx = fx * dn - fy * dn * 0.45 + (tx / tl) * tw * tk;
    let my = fy * dn + fx * dn * 0.45 + (ty / tl) * tw * tk;
    if (Math.abs(mx) + Math.abs(my) < 0.05) {
      const a = g.time * 0.25;
      mx = Math.cos(a) * 0.5;
      my = Math.sin(a) * 0.5;
    }
    g.input.x = mx;
    g.input.y = my;
  };

  // 선택지가 떠 있으면 고르고, 아니면 이동 입력
  Bot.step = function (g, mode) {
    if (g.phase === 'choice') {
      const c = g.choice;
      if (c.type === 'levelup' || c.type === 'augment') g.choose(Bot.pick(g, c));
      else g.choose(0);
      return;
    }
    Bot.move(g, mode);
  };
})(window.GS = window.GS || {});
