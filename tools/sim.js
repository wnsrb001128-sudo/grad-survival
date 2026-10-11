// 헤드리스 밸런스 시뮬레이터. tools/sim.html 을 열고 콘솔에서:
//   GS.Sim.start(GS.Sim.plan({ seeds: 3 }))  → GS.Sim.work(15000) 을 끝날 때까지 반복 → GS.Sim.report()
(function (GS) {
  'use strict';
  const Sim = GS.Sim = {};
  const DT = 1 / 30;

  Sim.plan = function (o) {
    o = o || {};
    const list = [];
    const weapons = o.weapons || GS.data.config.startWeapons;
    const modes = o.modes || ['normal'];
    for (const mode of modes) {
      for (const weapon of weapons) {
        for (let s = 0; s < (o.seeds || 2); s++) list.push({ weapon, mode, seed: 1000 + s * 7919, maxTime: o.maxTime || 1500 });
      }
    }
    return list;
  };

  Sim.create = function (opt) {
    const g = new GS.Game({ seed: opt.seed, startWeapon: opt.weapon, viewW: 1280, viewH: 720 });
    const run = { opt, g, snaps: [], nextSnap: 60, judgment: null, hpMin: 1, t0: performance.now(), frames: 0 };
    g.on('choice', (c) => {
      if (c.type === 'judgment') run.judgment = { pass: c.pass, score: Math.round(c.score), level: g.player.level, kills: g.kills };
    });
    return run;
  };

  // n 프레임 진행, 끝나면 true
  Sim.stepN = function (run, n) {
    const g = run.g;
    for (let i = 0; i < n; i++) {
      GS.Bot.step(g, run.opt.mode);
      if (g.phase === 'playing') g.update(DT);
      run.frames++;
      const r = g.player.hp / g.player.maxHp;
      if (r < run.hpMin) run.hpMin = r;
      if (g.time >= run.nextSnap) {
        run.snaps.push({
          t: Math.round(g.time), lv: g.player.level, hp: Math.round(g.player.hp), kills: g.kills,
          score: Math.round(g.score), en: g.enemies.length, w: g.weapons.map((w) => w.id + w.level).join(' '),
        });
        run.nextSnap += 60;
      }
      if (g.phase === 'gameover' || g.phase === 'ending' || g.time >= run.opt.maxTime) return true;
    }
    return false;
  };

  Sim.finish = function (run) {
    const g = run.g;
    return {
      weapon: run.opt.weapon, mode: run.opt.mode, seed: run.opt.seed,
      end: g.phase, time: Math.round(g.time), phd: g.phd, phdTime: Math.round(g.phdTime),
      level: g.player.level, kills: g.kills, score: Math.round(g.score), hpMin: Math.round(run.hpMin * 100),
      judgment: run.judgment,
      evos: g.evolutions.map((e) => e.to + '@' + Math.round(e.time)),
      bosses: g.bossKills.map((b) => b.name + '@' + Math.round(b.time)),
      dmg: g.weapons.map((w) => w.def.name + ':' + Math.round(w.dmg)),
      passives: g.passives.map((p) => p.id + p.level).join(' '),
      snaps: run.snaps,
      ms: Math.round(performance.now() - run.t0), frames: run.frames,
    };
  };

  Sim.start = function (list) {
    Sim.queue = list.slice();
    Sim.cur = null;
    Sim.results = [];
  };

  // budgetMs 동안 계산하고 진행 상황 반환 (javascript 툴에서 반복 호출)
  Sim.work = function (budgetMs) {
    const end = performance.now() + (budgetMs || 10000);
    while (performance.now() < end) {
      if (!Sim.cur) {
        if (!Sim.queue.length) break;
        Sim.cur = Sim.create(Sim.queue.shift());
      }
      if (Sim.stepN(Sim.cur, 300)) {
        Sim.results.push(Sim.finish(Sim.cur));
        Sim.cur = null;
      }
    }
    return { done: Sim.results.length, left: Sim.queue.length + (Sim.cur ? 1 : 0), curTime: Sim.cur ? Math.round(Sim.cur.g.time) : null };
  };

  Sim.report = function () {
    return Sim.results.map((r) => {
      const j = r.judgment ? (r.judgment.pass ? 'PASS' : 'FAIL') + ' ' + r.judgment.score + ' L' + r.judgment.level : '-';
      return `${r.mode}/${r.weapon}#${r.seed}: ${r.end} t=${r.time} phd=${r.phdTime} lv=${r.level} kills=${r.kills} score=${r.score} hpMin=${r.hpMin}% judge=[${j}] evos=${r.evos.join(',')} bosses=${r.bosses.join(',')} ms=${r.ms}`;
    }).join('\n');
  };

  // 한 줄 요약: 각 웨이브가 끝나는 시점의 레벨·점수, 첫 진화, 판정, 사망 시각
  Sim.summary = function () {
    const ends = [];
    GS.data.chapters.reduce((s, ch) => { ends.push(s + ch.duration); return s + ch.duration; }, 0);
    return Sim.results.map((r) => {
      const at = (t) => { const s = r.snaps.find((x) => x.t === t); return s ? `L${s.lv}/${s.score}/hp${s.hp}` : '-'; };
      const j = r.judgment ? (r.judgment.pass ? 'PASS' : 'FAIL') + r.judgment.score : '-';
      const firstEvo = r.evos.length ? r.evos[0].split('@')[1] : '-';
      const waves = ends.map((t, i) => `${i + 1}차끝 ${at(t)}`).join(' | ');
      return `${r.mode[0]}/${r.weapon.padEnd(8)} ${r.end.padEnd(8)} t${String(r.time).padStart(4)} | ${waves} | evo1@${firstEvo} n${r.evos.length} | ${j} | phd${r.phdTime} | boss ${r.bosses.length} | hpMin${r.hpMin}%`;
    }).join('\n');
  };

  Sim.snapsReport = function (i) {
    const r = Sim.results[i];
    return r.snaps.map((s) => `${s.t}s lv${s.lv} hp${s.hp} k${s.kills} sc${s.score} en${s.en} | ${s.w}`).join('\n') + '\n' + r.dmg.join(', ') + '\n' + r.passives;
  };
})(window.GS = window.GS || {});
