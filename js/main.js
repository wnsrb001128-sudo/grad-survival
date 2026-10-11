// 시작점: 화면 전환, 키 입력, 게임 루프
// URL 옵션: ?start=pen (메뉴 건너뛰기) / ?demo (봇 자동 플레이) / ?speed=4 (빨리 감기) / ?seed=123
(function (GS) {
  'use strict';
  const params = new URLSearchParams(location.search);
  const renderer = new GS.Renderer(document.getElementById('game'));
  const ui = new GS.UI(document.getElementById('ui'));
  window.GS_UI = ui; // 디버그용
  const keys = {};
  const demo = params.has('demo');
  const speed = Math.max(1, Math.min(16, parseInt(params.get('speed'), 10) || 1));
  let game = null;
  let lastWeapon = null;

  function toTitle() {
    game = null;
    ui.showTitle({ start: toSelect, help: () => ui.showHelp({ back: toTitle }) });
  }

  function toSelect() {
    GS.Audio.init();
    game = null;
    ui.showSelect({ pick: startGame, back: toTitle });
  }

  function startGame(weaponId) {
    GS.Audio.init();
    lastWeapon = weaponId;
    ui.clear();
    renderer.toasts.length = 0;
    renderer.banners.length = 0;
    const seed = params.has('seed') ? parseInt(params.get('seed'), 10) : undefined;
    const g = new GS.Game({ startWeapon: weaponId, viewW: renderer.viewW, viewH: renderer.viewH, seed });
    g.on('choice', (c) => {
      if (demo) return; // 데모 모드에서는 봇이 고른다
      ui.showChoice(g, c, (i) => { ui.clear(); g.choose(i); });
    });
    g.on('toast', (t) => renderer.addToast(t));
    g.on('banner', (b) => renderer.showBanner(b));
    g.on('sfx', (n) => GS.Audio.play(n));
    g.on('newEnemy', (def) => {
      if (def.boss) return;
      const tip = def.desc.split('.')[0]; // 첫 문장만 (자세한 설명은 게임 방법 > 적·보스)
      renderer.addToast({ text: `새로운 적 ${def.sprite.emoji ? def.sprite.emoji + ' ' : ''}${def.name} — ${tip}`, color: '#adb5bd' });
    });
    g.on('gameover', onEnd);
    g.on('ending', onEnd);
    game = g;
    window.GS_GAME = g; // 디버그용
    g.start();
  }

  function onEnd(res) {
    const rec = GS.records.load();
    rec.plays = (rec.plays || 0) + 1;
    const newBest = res.score > (rec.bestScore || 0);
    if (newBest) rec.bestScore = Math.round(res.score);
    if (res.type === 'job') rec.jobs = (rec.jobs || 0) + 1;
    if (res.phd && res.phdTime > (rec.bestPhd || 0)) rec.bestPhd = Math.round(res.phdTime);
    GS.records.save(rec);
    const ended = game;
    setTimeout(() => {
      if (game !== ended) return;
      ui.showResult(res, newBest, { retry: () => startGame(lastWeapon), change: toSelect, title: toTitle });
    }, res.type === 'job' ? 200 : 1000);
  }

  function pauseGame() {
    if (!game || !game.pause()) return;
    showPauseMenu();
  }

  function showPauseMenu() {
    ui.showPause(game, {
      resume: resumeGame,
      restart: () => startGame(lastWeapon),
      title: toTitle,
      help: () => ui.showHelp({ back: showPauseMenu }),
    });
  }

  function resumeGame() {
    if (game && game.phase === 'paused') {
      ui.clear();
      game.resume();
    }
  }

  window.addEventListener('keydown', (e) => {
    if (ui.handleKey(e)) { e.preventDefault(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if ((e.code === 'Escape' || e.code === 'KeyP') && game && game.phase === 'playing') pauseGame();
    else if (e.code === 'KeyM') {
      GS.Audio.init();
      const muted = GS.Audio.toggleMute();
      renderer.addToast({ text: muted ? '🔇 소리 끔 (M)' : '🔊 소리 켬 (M)' });
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => {
    for (const k in keys) keys[k] = false;
    if (!demo && game && game.phase === 'playing') pauseGame();
  });
  window.addEventListener('pointerdown', () => GS.Audio.init());

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (game) {
      game.viewW = renderer.viewW;
      game.viewH = renderer.viewH;
      for (let s = 0; s < speed; s++) {
        if (demo) GS.Bot.step(game, 'normal');
        else {
          game.input.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
          game.input.y = (keys.KeyS || keys.ArrowDown ? 1 : 0) - (keys.KeyW || keys.ArrowUp ? 1 : 0);
        }
        if (game.phase !== 'playing') continue;
        // 프레임이 느릴 땐 두 번 나눠 계산해 빠른 투사체가 적을 뚫고 지나가지 않게 한다
        const steps = dt > 1 / 45 ? 2 : 1;
        for (let i = 0; i < steps && game.phase === 'playing'; i++) game.update(dt / steps);
      }
      renderer.draw(game, dt);
    } else {
      renderer.drawIdle(dt);
    }
    requestAnimationFrame(frame);
  }

  if (demo || params.has('start')) {
    const ids = GS.data.config.startWeapons;
    const id = params.get('start');
    startGame(ids.indexOf(id) >= 0 ? id : ids[(Math.random() * ids.length) | 0]);
  } else {
    toTitle();
  }
  requestAnimationFrame(frame);
})(window.GS = window.GS || {});
