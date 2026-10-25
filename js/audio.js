// 효과음: 외부 파일 없이 WebAudio 로 합성 (M 키로 켜기/끄기)
(function (GS) {
  'use strict';
  const A = GS.Audio = { ctx: null, master: null, muted: false, last: {} };
  const MIN_GAP = { gem: 0.04, hurt: 0.15, item: 0.1, select: 0.05, warn: 0.25, blast: 0.1, zap: 0.15, swing: 0.16 };

  A.init = function () {
    if (A.ctx) {
      if (A.ctx.state === 'suspended') A.ctx.resume();
      return;
    }
    try {
      const C = window.AudioContext || window.webkitAudioContext;
      A.ctx = new C();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.22;
      A.master.connect(A.ctx.destination);
    } catch (e) {
      A.ctx = null;
    }
  };

  function tone(type, f0, f1, dur, vol, delay) {
    const c = A.ctx, t = c.currentTime + (delay || 0);
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(A.master);
    o.start(t);
    o.stop(t + dur + 0.03);
  }

  const arp = (notes, gap, type, vol) => notes.forEach((f, i) => tone(type || 'triangle', f, 0, 0.22, vol || 0.12, i * gap));

  const SFX = {
    gem: () => tone('sine', 1250, 1650, 0.05, 0.035),
    hurt: () => tone('square', 230, 90, 0.14, 0.07),
    levelup: () => arp([523, 659, 784], 0.07),
    select: () => tone('sine', 660, 990, 0.08, 0.08),
    evolve: () => arp([523, 659, 784, 1046, 1318], 0.08, 'triangle', 0.14),
    boss: () => { tone('sawtooth', 110, 70, 0.7, 0.12); tone('sawtooth', 117, 73, 0.7, 0.08, 0.06); },
    bossdown: () => arp([392, 523, 659, 784, 1046], 0.06, 'square', 0.08),
    chest: () => arp([659, 880, 1175], 0.09, 'triangle', 0.13),
    item: () => tone('triangle', 880, 1320, 0.12, 0.1),
    sanctuary: () => arp([440, 554, 659, 880], 0.08, 'sine', 0.13),
    chapter: () => arp([392, 523, 659], 0.12, 'triangle', 0.12),
    jam: () => { tone('square', 300, 120, 0.3, 0.08); tone('square', 150, 60, 0.4, 0.06, 0.25); },
    clear: () => arp([523, 659, 784, 1046, 784, 1046], 0.11, 'triangle', 0.14),
    fail: () => arp([392, 330, 262, 196], 0.16, 'sawtooth', 0.08),
    dead: () => arp([330, 262, 196, 131], 0.15, 'sawtooth', 0.09),
    warn: () => { tone('square', 880, 0, 0.07, 0.05); tone('square', 880, 0, 0.07, 0.05, 0.11); }, // 보스 패턴 예고 (삐빅)
    blast: () => { tone('sawtooth', 160, 45, 0.28, 0.12); tone('square', 90, 40, 0.3, 0.06); },  // 예고 지역이 터질 때
    zap: () => tone('sawtooth', 1400, 300, 0.25, 0.05),                                           // 레이저 · 질문 벽
    swing: () => tone('triangle', 520, 170, 0.09, 0.05),                                         // 파리채 휘두르기
  };

  A.play = function (name) {
    if (A.muted || !A.ctx || !SFX[name]) return;
    const now = A.ctx.currentTime, gap = MIN_GAP[name] || 0.02;
    if (A.last[name] && now - A.last[name] < gap) return;
    A.last[name] = now;
    try { SFX[name](); } catch (e) { /* 소리 실패는 무시 */ }
  };

  A.toggleMute = function () {
    A.muted = !A.muted;
    return A.muted;
  };
})(window.GS = window.GS || {});
