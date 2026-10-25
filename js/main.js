// 시작점: 화면 전환, 키 입력(Tab = 이번 학기 적 목록), 게임 루프
// URL 옵션: ?start=pen (메뉴 건너뛰기, 무기로 캐릭터를 정함) / ?char=wet (캐릭터, 무기는 아무거나) / ?demo (봇 자동 플레이) / ?speed=4 (빨리 감기) / ?seed=123
(function (GS) {
  'use strict';
  const params = new URLSearchParams(location.search);
  const renderer = new GS.Renderer(document.getElementById('game'));
  const ui = new GS.UI(document.getElementById('ui'));
  window.GS_UI = ui; // 디버그용
  window.GS_R = renderer;
  const keys = {};
  const demo = params.has('demo');
  const speed = Math.max(1, Math.min(16, parseInt(params.get('speed'), 10) || 1));
  let game = null;
  let intro = null; // 재생 중인 기본 소개 영상 (media/intro.mp4 가 없을 때)
  let lastWeapon = null, lastChar = 'dry';

  function toTitle() {
    game = null;
    intro = null;
    renderer.resetFx();
    ui.showTitle({ start: toCharacter, help: () => ui.showHelp({ back: toTitle }), intro: toIntro, board: () => ui.showBoard({ back: toTitle }) });
  }

  function toIntro() {
    GS.Audio.init();
    ui.showIntro({ back: toTitle, builtin: () => (intro = window.GS_INTRO = GS.Intro.create(renderer)) });
  }

  // 게임 시작: 캐릭터 → 시작 무기
  function toCharacter() {
    GS.Audio.init();
    game = null;
    ui.showCharacter({ pick: toSelect, back: toTitle });
  }

  function toSelect(charId) {
    ui.showSelect({ pick: (weaponId) => startGame(weaponId, charId), back: toCharacter }, charId);
  }

  function startGame(weaponId, charId) {
    GS.Audio.init();
    lastWeapon = weaponId;
    lastChar = charId;
    ui.clear();
    renderer.toasts.length = 0;
    renderer.banners.length = 0;
    const seed = params.has('seed') ? parseInt(params.get('seed'), 10) : undefined;
    const g = new GS.Game({ character: charId, startWeapon: weaponId, viewW: renderer.viewW, viewH: renderer.viewH, seed });
    renderer.attach(g); // 처치·피격·폭발 등 화면 연출
    g.on('choice', (c) => {
      if (demo) return; // 데모 모드에서는 봇이 고른다
      ui.showChoice(g, c, (i) => { ui.clear(); g.choose(i); });
    });
    g.on('toast', (t) => renderer.addToast(t));
    g.on('banner', (b) => renderer.showBanner(b));
    g.on('sfx', (n) => GS.Audio.play(n));
    g.on('newEnemy', (def) => {
      if (def.boss) return;
      const tip = def.desc.split(/\.(?:\s|$)/)[0]; // 첫 문장만 (자세한 설명은 게임 방법 > 적·보스). "4.5초" 같은 소수점은 자르지 않는다
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
      ui.showResult(res, newBest, { retry: () => startGame(lastWeapon, lastChar), change: toCharacter, title: toTitle });
    }, res.type === 'job' ? 200 : 1000);
  }

  function pauseGame() {
    if (!game || !game.pause()) return;
    showPauseMenu();
  }

  function showPauseMenu() {
    ui.showPause(game, {
      resume: resumeGame,
      restart: () => startGame(lastWeapon, lastChar),
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
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return; // 닉네임 입력 중에는 게임 단축키를 쓰지 않는다
    if (ui.handleKey(e)) { e.preventDefault(); return; }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code) || (e.code === 'Tab' && game)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if ((e.code === 'Escape' || e.code === 'KeyP') && game && game.phase === 'playing') pauseGame();
    else if (e.code === 'Tab' && game) { // 오른쪽 '이번 학기 적' 목록 켜기/끄기
      const on = renderer.toggleRoster();
      renderer.addToast({ text: game.phd ? '👾 적 목록은 1차~4차에만 보여요' : on ? '👾 이번 학기 적 목록 켬 (Tab)' : '👾 적 목록 끔 (Tab)' });
    } else if (e.code === 'KeyM') {
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
    requestAnimationFrame(frame); // 먼저 예약: 한 프레임에서 오류가 나도 게임이 멈추지 않게
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
    } else if (intro) {
      intro.update(dt);
    } else {
      renderer.drawIdle(dt);
    }
  }

  if (demo || params.has('start') || params.has('char')) {
    const C = GS.data.characters, pickOne = (a) => a[(Math.random() * a.length) | 0];
    const id = params.get('start');
    let ch = Object.keys(C).find((c) => C[c].startWeapons.indexOf(id) >= 0) || params.get('char');
    if (!C[ch]) ch = pickOne(Object.keys(C));
    startGame(C[ch].startWeapons.indexOf(id) >= 0 ? id : pickOne(C[ch].startWeapons), ch);
  } else {
    toTitle();
  }
  requestAnimationFrame(frame);
})(window.GS = window.GS || {});
