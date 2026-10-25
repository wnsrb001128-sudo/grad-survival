// DOM 화면: 타이틀 / 캐릭터·시작 무기 선택 / 게임 방법 / 레벨업·보상·취업 판정 / 일시정지 / 결과
(function (GS) {
  'use strict';
  const U = GS.util;
  const REC_KEY = 'grad-survival-records-v1';
  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  function iconHTML(icon, cls) {
    cls = cls || '';
    if (typeof icon === 'string') return `<span class="ico ${cls}">${icon}</span>`;
    if (icon.custom) return `<img class="ico img ${cls}" src="${GS.iconDataURL(icon)}" alt="">`;
    const bg = icon.bg2 ? `linear-gradient(135deg, ${icon.bg}, ${icon.bg2})` : icon.bg;
    const len = icon.text.length, shape = (len >= 4 ? ' wide' : '') + (icon.key ? ' key' : '');
    return `<span class="ico badge${shape} ${cls}" style="background:${bg};color:${icon.fg || '#fff'}"><i class="len${Math.min(len, 3)}">${esc(icon.text)}</i></span>`;
  }

  // 초 → "2분", "2분 30초", "45초"
  function minSec(s) {
    const m = Math.floor(s / 60), r = s % 60;
    return m ? `${m}분${r ? ` ${r}초` : ''}` : `${r}초`;
  }

  // 축하 종이 꽃가루 (취업 성공)
  function confetti(layer, n) {
    const cols = ['#4c6ef5', '#fcc419', '#40c057', '#fa5252', '#be4bdb', '#22b8cf', '#ff922b'];
    let html = '';
    for (let i = 0; i < n; i++) {
      const dur = 2.4 + Math.random() * 2.2, delay = Math.random() * 0.9;
      const dx = (Math.random() - 0.5) * 260, r = (Math.random() < 0.5 ? -1 : 1) * (360 + Math.random() * 540);
      html += `<i style="left:${(Math.random() * 100).toFixed(1)}%;background:${cols[i % cols.length]};animation-duration:${dur.toFixed(2)}s;animation-delay:${delay.toFixed(2)}s;--dx:${dx.toFixed(0)}px;--r:${r.toFixed(0)}deg"></i>`;
    }
    const d = document.createElement('div');
    d.className = 'confetti';
    d.innerHTML = html;
    layer.appendChild(d);
  }

  // 게임 방법 공통 양식: 모든 탭이 같은 '묶음 상자'(색 띠 제목 + 내용)를 쓴다
  function hsec(color, title, sub, inner, cls) {
    return `<section class="hsec ${color}${cls ? ' ' + cls : ''}"><div class="hsec-head"><span class="hsec-badge">${title}</span>${sub ? `<span class="hsec-sub">${sub}</span>` : ''}</div>${inner}</section>`;
  }
  // 상자들을 2단(화면이 좁으면 1단)으로 흘려 담는다
  function hcols(html) { return `<div class="hcols">${html}</div>`; }
  // 글머리 목록 상자들: [색, 제목, 글머리 목록]
  function helpPage(blocks) {
    return hcols(blocks.map(([color, title, items]) => hsec(color, title, '', `<ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`)).join(''));
  }
  // [아이콘, 이름, 설명] 줄 목록 (화면 보는 법 · 성소 · 아이템)
  function legendList(rows) {
    return `<ul class="legend">${rows.map(([ic, t, d]) => `<li><span class="lg-ico">${ic}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul>`;
  }

  // 최고 기록 (브라우저 localStorage)
  GS.records = {
    load() {
      try { return JSON.parse(localStorage.getItem(REC_KEY)) || {}; } catch (e) { return {}; }
    },
    save(r) {
      try { localStorage.setItem(REC_KEY, JSON.stringify(r)); } catch (e) { /* 저장할 수 없는 환경 */ }
    },
  };

  // 온라인 기록판 (서버: api/scores.js). 배포된 사이트에서 Vercel 저장소를 연결해야 동작한다
  const NAME_KEY = 'grad-survival-name';
  const RESULT_LABEL = { job: '취업', phd: '박사', out: '번아웃' };
  GS.board = {
    url: 'api/scores',
    async get() {
      const r = await fetch(this.url, { cache: 'no-store' });
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    },
    async post(entry) {
      const r = await fetch(this.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(entry) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Object.assign(new Error(j.error || String(r.status)), { code: j.error || r.status, status: r.status });
      return j;
    },
    name() { try { return localStorage.getItem(NAME_KEY) || ''; } catch (e) { return ''; } },
    saveName(n) { try { localStorage.setItem(NAME_KEY, n); } catch (e) { /* 저장할 수 없는 환경 */ } },
  };

  class UI {
    constructor(root) {
      this.root = root;
      this.keyHandler = null;
      this.openedAt = 0;
    }

    clear() {
      this.root.innerHTML = '';
      this.keyHandler = null;
    }

    mount(cls, html) {
      this.root.innerHTML = `<div class="layer ${cls}">${html}</div>`;
      this.openedAt = performance.now();
      this.keyHandler = null;
      return this.root.firstElementChild;
    }

    handleKey(e) { return this.keyHandler ? this.keyHandler(e) : false; }

    ready(ms) { return performance.now() - this.openedAt > (ms || 250); }

    bind(layer, acts) {
      layer.querySelectorAll('[data-act]').forEach((el) => {
        el.addEventListener('click', () => {
          const fn = acts[el.dataset.act];
          if (fn) fn();
        });
      });
    }

    // 고르기 화면 공통: 카드 클릭·숫자키·화살표 → cb.pick(id), ESC → cb.back()
    pickList(layer, ids, cb) {
      const els = [...layer.querySelectorAll('[data-i]')];
      els.forEach((el, i) => el.addEventListener('click', () => cb.pick(ids[i])));
      this.bind(layer, cb);
      this.cardKeys(els, (i) => cb.pick(ids[i]));
      const inner = this.keyHandler;
      this.keyHandler = (e) => {
        if (e.code === 'Escape') { cb.back(); return true; }
        return inner(e);
      };
    }

    // 카드 키보드 조작: 1~4 바로 선택, ←→/AD 이동 후 Enter/Space
    // 카드가 한 장뿐이면 처음부터 골라 둬서 Enter/Space 만 눌러도 된다
    cardKeys(cards, onPick) {
      let sel = cards.length === 1 ? 0 : -1;
      const mark = () => cards.forEach((c, i) => c.classList.toggle('sel', i === sel));
      mark();
      this.keyHandler = (e) => {
        if (e.repeat || !this.ready()) return true;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= cards.length) { onPick(n - 1); return true; }
        if (['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(e.code)) { sel = (sel + 1) % cards.length; mark(); return true; }
        if (['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(e.code)) { sel = (sel - 1 + cards.length) % cards.length; mark(); return true; }
        if ((e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') && sel >= 0) { onPick(sel); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }

    cardHTML(d, i) {
      return `
        <button class="card ${d.cls || ''}" data-i="${i}" style="--i:${i}">
          <span class="card-key">${i + 1}</span>
          <div class="card-icon">${iconHTML(d.icon)}</div>
          <div class="card-body">
            <div class="card-name">${esc(d.name)}</div>
            <div class="card-tag">${esc(d.tag)}</div>
            <div class="card-desc">${esc(d.desc)}</div>
            ${d.flavor ? `<div class="card-flavor">"${esc(d.flavor)}"</div>` : ''}
          </div>
        </button>`;
    }

    // ───────── 타이틀 ─────────
    showTitle(cb) {
      const rec = GS.records.load(), cfg = GS.data.config;
      const recLine = rec.plays
        ? `<span>최고 실적 <b>${U.fmtNum(rec.bestScore || 0)}</b></span><span>취업 성공 <b>${rec.jobs || 0}</b>회</span><span>박사 최장 생존 <b>${U.fmtTime(rec.bestPhd || 0)}</b></span><span>플레이 <b>${rec.plays}</b>회</span>`
        : '<span>첫 학기를 시작해 보세요!</span>';
      // 제목은 마지막 낱말을 크게: "대학원에서 / 살아남기"
      const words = cfg.title.split(' '), last = words.pop();
      const logo = (words.length ? `<span class="t1">${esc(words.join(' '))}</span>` : '') + `<span class="t2">${esc(last)}</span>`;
      const layer = this.mount('title-screen', `
        <div class="title-box">
          <div class="title-heroes"><img class="title-hero" src="${GS.heroDataURL(240, 'dry')}" alt=""><img class="title-hero wet" src="${GS.heroDataURL(240, 'wet')}" alt=""></div>
          <h1>${logo}</h1>
          <p class="subtitle">${esc(cfg.subtitle)}</p>
          <div class="menu">
            <button class="btn primary big" data-act="start">게임 시작</button>
            <button class="btn big" data-act="help">게임 방법</button>
            <button class="btn big" data-act="intro">🎬 소개 영상</button>
            <button class="btn big" data-act="board">🏆 기록판</button>
          </div>
          <div class="records">${recLine}</div>
          <p class="hint"><kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 이동 · <kbd>ESC</kbd> 일시정지 · <kbd>Tab</kbd> 적 목록 · <kbd>M</kbd> 소리 켜기/끄기</p>
        </div>
        <p class="contact">문의 및 피드백 환영 : wnsrb011228@inha.edu</p>`);
      this.bind(layer, cb);
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) { cb.start(); return true; }
        return false;
      };
    }

    // ───────── 온라인 기록판: 최고 연구 실적 · 박사 최장 생존 TOP 10 ─────────
    showBoard(cb) {
      const layer = this.mount('modal', `
        <div class="panel wide board">
          <h2>🏆 기록판</h2>
          <p class="sub">모든 플레이어의 최고 기록이에요. 게임이 끝나면 결과 화면에서 닉네임과 함께 기록을 올릴 수 있어요.</p>
          <div class="board-cols">
            <section><h3>📊 최고 연구 실적</h3><ol class="board-list" data-b="score"><li class="muted">불러오는 중…</li></ol></section>
            <section><h3>🎓 박사 최장 생존</h3><ol class="board-list" data-b="phd"><li class="muted">불러오는 중…</li></ol></section>
          </div>
          <p class="board-note small muted"></p>
          <div class="actions"><button class="btn primary" data-act="back">닫기 (ESC)</button></div>
        </div>`);
      this.bind(layer, cb);
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Escape' || e.code === 'Enter')) { cb.back(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
      GS.board.get().then((d) => this.fillBoard(layer, d)).catch(() => {
        const rec = GS.records.load();
        layer.querySelectorAll('.board-list').forEach((el) => { el.innerHTML = '<li class="muted empty">온라인 기록판에 연결할 수 없어요.</li>'; });
        layer.querySelector('.board-note').innerHTML = `배포된 사이트에서 기록판 서버(저장소)를 연결해야 보여요. 이 브라우저의 내 기록: 최고 실적 <b>${U.fmtNum(rec.bestScore || 0)}</b> · 박사 최장 생존 <b>${U.fmtTime(rec.bestPhd || 0)}</b>`;
      });
    }

    fillBoard(layer, d) {
      const row = (x, i, kind) => `
        <li class="${i < 3 ? 'top' + (i + 1) : ''}">
          <span class="rk">${i < 3 ? ['🥇', '🥈', '🥉'][i] : i + 1}</span>
          <span class="nm">${esc(x.n)}</span>
          <span class="who-tag ${x.c === 'wet' ? 'wet' : 'dry'}">${x.c === 'wet' ? 'Wet' : 'Dry'}</span>
          <span class="rs">${RESULT_LABEL[x.r] || ''}</span>
          <b>${kind === 'score' ? U.fmtNum(x.v) : U.fmtTime(x.v)}</b>
        </li>`;
      for (const kind of ['score', 'phd']) {
        const el = layer.querySelector(`[data-b="${kind}"]`), list = (d && d[kind]) || [];
        if (el) el.innerHTML = list.length ? list.map((x, i) => row(x, i, kind)).join('') : '<li class="muted empty">아직 기록이 없어요. 첫 기록의 주인공이 되어 보세요!</li>';
      }
    }

    // ───────── 게임 소개 영상 (ESC·Enter 건너뛰기, Space·클릭 일시정지, ←→ 5초씩 앞뒤로, 끝나면 타이틀로) ─────────
    // media/intro.mp4 가 있으면 그 영상을, 없으면 게임 화면으로 직접 그리는 기본 소개 영상(js/intro.js)을 튼다
    showIntro(cb) {
      const src = GS.data.config.introVideo;
      const layer = this.mount('intro', `
        ${src ? `<video class="intro-video" src="${esc(src)}" playsinline preload="auto"></video>` : ''}
        <div class="intro-ui">
          <span class="intro-label">🎬 게임 소개 영상</span>
          <span class="intro-state">일시정지 · Space로 계속</span>
          <span class="intro-seek"></span>
          <span class="intro-keys"><kbd>←</kbd><kbd>→</kbd> 5초 이동 · <kbd>Space</kbd> 일시정지</span>
          <button class="btn intro-skip" data-act="skip">건너뛰기 ⏭ <kbd>ESC</kbd></button>
          <div class="intro-bar"><i></i></div>
        </div>`);
      const v = layer.querySelector('video'), bar = layer.querySelector('.intro-bar i'), seekEl = layer.querySelector('.intro-seek');
      let done = false, idleT = 0, ctl = null, seekT = 0;
      const close = () => {
        if (done) return;
        done = true;
        clearTimeout(idleT);
        if (v) v.pause();
        cb.back();
      };
      const builtin = () => {
        if (done || ctl) return;
        if (v) v.remove();
        layer.classList.add('builtin');
        layer.classList.remove('paused');
        ctl = cb.builtin();
      };
      const toggle = () => {
        if (ctl) {
          ctl.paused = !ctl.paused;
          layer.classList.toggle('paused', ctl.paused);
        } else if (v.paused) v.play().catch(() => {});
        else v.pause();
      };
      // ←→: 5초씩 앞뒤로 (기본 소개 영상은 그 시각의 장면을 다시 연출해 따라잡는다)
      const seek = (d) => {
        if (ctl) { if (ctl.seek) ctl.seek(ctl.time + d); }
        else if (v && v.duration) v.currentTime = Math.max(0, Math.min(v.duration - 0.1, v.currentTime + d));
        else return;
        seekEl.textContent = d < 0 ? `⏪ ${-d}초` : `${d}초 ⏩`;
        seekEl.classList.add('show');
        clearTimeout(seekT);
        seekT = setTimeout(() => seekEl.classList.remove('show'), 600);
      };
      // 마우스를 2초 동안 움직이지 않으면 버튼·막대를 숨긴다 (발표 화면을 깔끔하게)
      const wake = () => {
        layer.classList.remove('idle');
        clearTimeout(idleT);
        idleT = setTimeout(() => layer.classList.add('idle'), 2000);
      };
      const tick = () => {
        if (done) return;
        const k = ctl ? ctl.time / ctl.total : v && v.duration ? v.currentTime / v.duration : 0;
        bar.style.transform = `scaleX(${Math.min(1, k)})`;
        if (ctl && ctl.finished) setTimeout(close, 300);
        else requestAnimationFrame(tick);
      };
      if (v) {
        v.addEventListener('play', () => layer.classList.remove('paused'));
        v.addEventListener('pause', () => { if (!done && !v.ended && !ctl) layer.classList.add('paused'); });
        v.addEventListener('ended', () => setTimeout(close, 400));
        v.addEventListener('error', builtin); // 영상 파일이 없으면 기본 소개 영상
        v.play().catch((err) => { if (err && err.name === 'NotAllowedError') layer.classList.add('paused'); });
      } else builtin();
      layer.addEventListener('click', (e) => { if (!e.target.closest('button')) toggle(); });
      layer.addEventListener('mousemove', wake);
      this.bind(layer, { skip: close });
      wake();
      tick();
      this.keyHandler = (e) => {
        if (e.repeat) return true;
        if (e.code === 'Escape' || e.code === 'Enter') close();
        else if (e.code === 'Space') { toggle(); wake(); }
        else if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { seek(e.code === 'ArrowLeft' ? -5 : 5); wake(); }
        return true;
      };
    }

    // ───────── 캐릭터 선택 → 시작 무기 선택 ─────────
    showCharacter(cb) {
      const C = GS.data.characters, W = GS.data.weapons, ids = Object.keys(C);
      const cards = ids.map((id, i) => {
        const c = C[id], p = c.passive;
        const ws = c.startWeapons.map((w) => `<span class="mini" title="${esc(W[w].name)}">${iconHTML(W[w].icon, 'sm')}</span>`).join('');
        return `
          <button class="char-card ${id}" data-i="${i}" style="--i:${i}">
            <span class="card-key">${i + 1}</span>
            <div class="char-hero"><img src="${GS.heroDataURL(260, id)}" alt=""></div>
            <div class="char-info">
              <div class="char-name">${esc(c.name)} <span class="char-lab">${esc(c.lab)}</span></div>
              <div class="char-desc">${esc(c.desc)}</div>
              <div class="char-passive">
                <span class="cp-ico">${iconHTML(p.icon)}</span>
                <div><span class="cp-tag">기본 패시브</span> <b>${esc(p.name)}</b><span class="cp-desc">${esc(p.desc)}</span></div>
              </div>
              <div class="char-weapons"><span class="lbl">시작 무기 후보</span>${ws}</div>
              <div class="card-flavor">"${esc(p.flavor)}"</div>
            </div>
          </button>`;
      }).join('');
      const layer = this.mount('modal', `
        <div class="panel wide charsel">
          <h2>캐릭터 선택</h2>
          <p class="sub">어느 연구실 대학원생으로 살아남을까요? 캐릭터마다 시작 무기와 기본 패시브가 달라요.</p>
          <div class="chars">${cards}</div>
          <div class="actions"><button class="btn ghost" data-act="back">← 돌아가기</button></div>
        </div>`);
      this.pickList(layer, ids, cb);
    }

    showSelect(cb, charId) {
      const W = GS.data.weapons, ch = GS.data.characters[charId], ids = ch.startWeapons;
      const cards = ids.map((id, i) => this.cardHTML({ icon: W[id].icon, name: W[id].name, tag: `Lv 8 진화 → ${W[W[id].evolveTo].name}`, desc: W[id].desc, cls: charId }, i)).join('');
      const layer = this.mount('modal', `
        <div class="panel wide">
          <h2>시작 무기 선택</h2>
          <p class="sub"><span class="who ${charId}"><img src="${GS.heroDataURL(64, charId)}" alt="">${esc(ch.name)}</span> 어떤 무기로 대학원 생활을 시작할까요? 나머지 무기는 레벨업으로 얻을 수 있어요.</p>
          <div class="cards">${cards}</div>
          <div class="actions"><button class="btn ghost" data-act="back">← 캐릭터 다시 고르기</button></div>
        </div>`);
      this.pickList(layer, ids, cb);
    }

    // ───────── 게임 방법 (탭: 숫자키 1~6 또는 ←→로 이동) ─────────
    showHelp(cb) {
      const tabs = [
        ['기본 규칙', this.helpRules()],
        ['화면 보는 법', this.helpScreen()],
        ['무기', this.helpWeapons()],
        ['패시브', this.helpPassives()],
        ['적·보스', this.helpEnemies()],
        ['성소·아이템', this.helpPlaces()],
      ];
      const layer = this.mount('modal', `
        <div class="panel wide help">
          <h2>게임 방법</h2>
          <div class="tabs">${tabs.map((t, i) => `<button class="tab">${i + 1}. ${t[0]}</button>`).join('')}</div>
          <div class="tab-body"></div>
          <div class="actions"><button class="btn primary" data-act="back">닫기 (ESC)</button></div>
        </div>`);
      const body = layer.querySelector('.tab-body'), btns = [...layer.querySelectorAll('.tab')];
      let cur = 0;
      const show = (i) => {
        cur = (i + tabs.length) % tabs.length;
        btns.forEach((b, k) => b.classList.toggle('on', k === cur));
        body.innerHTML = tabs[cur][1];
        body.scrollTop = 0;
      };
      btns.forEach((b, i) => b.addEventListener('click', () => show(i)));
      this.bind(layer, cb);
      show(0);
      this.keyHandler = (e) => {
        if (e.repeat) return true;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= tabs.length) { show(n - 1); return true; }
        if (e.code === 'ArrowRight' || e.code === 'KeyD') { show(cur + 1); return true; }
        if (e.code === 'ArrowLeft' || e.code === 'KeyA') { show(cur - 1); return true; }
        if (e.code === 'Escape' || e.code === 'Enter') { cb.back(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }

    helpRules() {
      const c = GS.data.config, E = GS.data.enemies, P = GS.data.phd, C = GS.data.characters, W = GS.data.weapons;
      const bossList = [];
      GS.data.chapters.forEach((ch) => {
        if (ch.midBoss) bossList.push(`${esc(E[ch.midBoss.enemy].name)}(중간보스) ${U.fmtNum(E[ch.midBoss.enemy].score)}`);
        bossList.push(`${esc(E[ch.boss.enemy].name)} ${U.fmtNum(E[ch.boss.enemy].score)}`);
      });
      const bosses = bossList.join(' · ');
      const year = minSec(P.yearSeconds);
      const last = GS.data.chapters[GS.data.chapters.length - 1], fb = E[last.boss.enemy];
      return helpPage([
        ['blue', '🎯 목표', [
          `1차~4차 웨이브(석사 1~4학기)를 각 ${GS.data.chapters[0].duration / 60}분씩, 총 ${GS.data.chapters.reduce((s, ch) => s + ch.duration, 0) / 60}분 버티세요.`,
          `4차가 끝나는 순간 두 가지를 모두 해냈으면 <b>취업 성공(엔딩)</b>: ① <b>연구 실적 ${U.fmtNum(c.jobScore)} 이상</b> ② 4차 ${U.fmtTime(last.boss.t)}에 나오는 <b>최종 보스 「${esc(fb.name)}」 격파</b>. 실적이 넘쳐도 최종 보스를 못 잡으면 취업 실패예요.`,
          `하나라도 못 하면 <b>박사 과정</b>에 강제 진학합니다. 시간 제한이 없는 무한 웨이브로, 버틴 시간이 기록이 돼요. 시간이 갈수록 적이 단단해지고 ${year}마다 '박사 n년차'가 올라갑니다.`,
          "취업 조건을 채워도 <b>'그래도 박사 진학'</b>을 고르면 무한 모드를 이어서 할 수 있어요.",
          '<b>멘탈</b>(체력)이 0이 되면 번아웃, 게임 오버예요.',
        ]],
        ['teal', '🧑‍🔬 캐릭터', [
          "'게임 시작'을 누르면 <b>캐릭터</b> → <b>시작 무기</b> 순서로 골라요.",
          ...Object.keys(C).map((id) => {
            const ch = C[id], p = ch.passive;
            return `<b>${esc(ch.name)}</b>(${esc(ch.lab)}) — 시작 무기 ${ch.startWeapons.map((w) => esc(W[w].name)).join('·')} 중 하나. 기본 패시브 ${p.icon} <b>${esc(p.name)}</b>: ${esc(p.desc)}`;
          }),
          '기본 패시브는 처음부터 켜져 있어요. 레벨이 없고 패시브 칸도 차지하지 않아요.',
          '<b>전용 무기</b>는 그 캐릭터만 레벨업 카드로 얻어요. 나머지 무기와 패시브는 두 캐릭터 모두 얻을 수 있어요.',
        ]],
        ['gray', '🕹️ 조작', [
          'WASD(또는 방향키)로 이동. 공격은 전부 자동이에요.',
          '캐릭터·시작 무기·레벨업 카드는 숫자키 1~4 또는 클릭으로 골라요. A/D로 옮기고 Space·Enter로 골라도 돼요. 카드가 한 장뿐이면 처음부터 골라져 있어 Space·Enter만 누르면 돼요.',
          'ESC 또는 P: 일시정지 (일시정지 화면에서 게임 방법도 볼 수 있어요) · M: 소리 켜기/끄기',
          'Tab: 오른쪽에 이번 학기에 나오는 적 목록 보기, 다시 누르면 꺼져요 (처음엔 꺼져 있어요 · 1차~4차만)',
          '게임 창을 벗어나면 자동으로 일시정지돼요.',
          "타이틀 화면의 '🎬 소개 영상' 버튼으로 게임 소개 영상(약 1분)을 볼 수 있어요. ESC로 건너뛰고, Space나 클릭으로 멈췄다 이어 보고, ←→로 5초씩 앞뒤로 옮겨요.",
          "타이틀 화면의 '🏆 기록판'에서 모든 플레이어의 최고 기록(연구 실적 · 박사 최장 생존 TOP 10)을 볼 수 있어요. 게임이 끝나면 결과 화면에서 닉네임을 적고 기록을 올려요. 타이틀 아래의 내 기록은 이 브라우저에만 저장돼요.",
          '게임 방법은 숫자키 1~6 또는 ←→(A/D)로 탭을 옮기고, ESC·Enter로 닫아요.',
        ]],
        ['green', '📈 성장', [
          '적을 처치하면 <b>지식</b>(경험치 보석)이 떨어져요. 가까이 가면 빨려 들어옵니다. 값: 파랑(1~4) &lt; 초록(5~19) &lt; 보라(20 이상)',
          `바닥의 지식이 ${c.gemCap}개를 넘으면 가장 먼 지식이 새 지식에 합쳐져요. 사라지지는 않아요.`,
          `레벨업하면 카드 ${c.choiceCount}장 중 1장을 고릅니다. 행운이 높으면 가끔 4장이 나와요.`,
          `무기는 최대 ${c.slots.weapons}개, 패시브는 최대 ${c.slots.passives}개. 무기는 최대 Lv 8, 패시브는 최대 Lv 5 (복사기는 Lv 2).`,
          "<b>진화</b>: 기본 무기를 Lv 8까지 올리면 다음 레벨업이나 Accept 메일에서 노란 '진화!' 카드가 반드시 나와요.",
          '모든 칸이 최대 레벨이면 레벨업 창 대신 멘탈 15% 회복 + 연구 실적 보너스를 자동으로 받아요.',
        ]],
        ['yellow', '📊 연구 실적 (점수)', [
          '적을 처치할 때마다 올라요. 강한 적일수록 많이 주고, 엘리트는 12배예요.',
          `보스: ${bosses}`,
          '도망만 다니면 처치가 부족해 커트라인을 넘기 어려워요.',
        ]],
        ['red', '💥 피해', [
          `적에 닿거나 적이 던진 시험지·과제·질문·세균에 맞으면 멘탈이 줄어요. 같은 적에게는 ${c.player.contactCooldown}초에 한 번만 맞아요.`,
          '보스(중간보스 포함)는 저마다 <b>특수 패턴</b>이 있어요. 바닥에 빨간 예고 지역이 먼저 뜨고, 안쪽이 꽉 차는 순간 터져요. 빨간 지역 밖으로 피하세요. 단, 최종 보스의 「발표자 조명」은 반대로 <b>초록 테두리 조명 안</b>으로 들어가야 살아요 (모양별 설명은 화면 보는 법 탭, 보스별 설명은 적·보스 탭).',
          `최종 보스는 체력이 절반 아래로 떨어지면 <b>「수정 후 재심사」</b>로 모든 공격이 빨라져요.`,
          '방어력만큼 받는 피해가 줄어요 (최소 1).',
          `멘탈은 기본으로 초당 ${c.player.regen || 0}씩 회복돼요. 2남 휴게실을 얻으면 더 빨라져요.`,
        ]],
      ]);
    }

    helpScreen() {
      const C = GS.data.characters;
      const innate = Object.keys(C).map((id) => `${esc(C[id].name)} ${C[id].passive.icon} ${esc(C[id].passive.name)}`).join(' · ');
      const groups = [
        ['blue', '📊 화면 위쪽 · 가장자리 정보', '게임 상황을 알려 주는 표시', [
          ['<span class="sw xp"></span>', '맨 위 파란 막대', '지식(경험치). 오른쪽 끝에 레벨과 다음 레벨까지 필요한 지식. 레벨이 오르면 막대가 번쩍여요'],
          ['⏱️', '가운데 위 시계', '전체 경과 시간과 현재 웨이브, 웨이브 남은 시간 (박사 모드에서는 박사 n년차)'],
          ['<span class="sw sem"></span>', '시계 아래 학기 진행 막대', '이번 웨이브가 얼마나 지났는지. 작은 눈금은 이벤트(포위·떼·엘리트 등), 동그라미 아이콘은 중간보스·보스가 나오는 시각 (박사 모드에서는 1년이 얼마나 지났는지)'],
          ['📊', '오른쪽 위 패널', '연구 실적과 취업 커트라인 진행 막대 (노랑, 달성하면 초록), 그 아래 두 번째 취업 조건인 최종 보스 격파 (4차 등장까지 남은 시간 → 등장하면 \'필요!\' → 쓰러뜨리면 \'완료\'). 맨 아래는 처치 수'],
          ['👾', '오른쪽 적 목록 (Tab)', 'Tab을 누르면 오른쪽 위 패널 아래에 나타나고 다시 누르면 꺼져요 (처음엔 꺼져 있어요). 1차~4차 동안 이번 학기에 나오는 적 이름이 처음 나오는 순서대로 적혀 있고, 아직 안 나온 적은 흐리게 보이다가 처음 나오면 잠깐 노랗게 반짝여요 (보스가 부르는 적·쪼개져 나오는 적도 포함). 아래 칸은 중간보스·보스: 등장까지 남은 시간 → \'등장!\' → \'✓ 격파\'. 박사 과정에서는 보이지 않아요'],
          ['🎒', '왼쪽 위 칸', '윗줄은 무기, 아랫줄은 패시브. 숫자 = 레벨, MAX = 최대 레벨, ★(금색 칸) = 진화 무기'],
          ['<span class="sw innate">기본</span>', '패시브 줄 맨 앞 동그란 배지', `캐릭터의 기본 패시브 (${innate}). 처음부터 켜져 있고 패시브 칸을 차지하지 않아요`],
          ['<span class="sw cd"></span>', '무기 칸의 어두운 부채꼴', '다음 공격까지 남은 쿨타임. 어두운 부분이 줄어들어 사라지면 발사 (늘 켜져 있는 무기는 표시 없음)'],
          ['<span class="sw boss"></span>', '보스 막대', '보스가 나오면 얼굴·이름과 남은 체력이 보여요. 노란 부분은 방금 깎인 체력. 이름 앞 표시는 주황 = 중간보스, 빨강 = BOSS · FINAL BOSS. 보스가 여럿이면 먼저 나온 보스부터 위에서 아래로 막대가 모두 보여요 (4마리가 넘으면 나머지는 \'+ 보스 n마리 더\')'],
          ['➤', '화면 가장자리 화살표', '화면 밖에 있는 성소·보스·Accept 메일의 방향. 옆의 숫자는 대략적인 거리(m)'],
          ['💬', '화면 아래 알림', '이벤트 예고, 새로 나온 적, 처음 보는 보스 패턴 피하는 법, 아이템·성소 효과'],
        ]],
        ['green', '🧑‍🎓 내 캐릭터 상태', '캐릭터 주변과 화면 가장자리의 표시', [
          ['<span class="sw hp"></span>', '캐릭터 아래 막대', '멘탈. 초록 → 노랑(50% 미만) → 빨강(25% 미만). 하얀 부분은 방금 잃은 멘탈'],
          ['<span class="sw ring"></span>', '발밑 파란 고리의 화살표', '지금 바라보는(이동하는) 방향. 파리채는 이 방향으로만 휘둘러요'],
          ['😩', '점점 지쳐 가는 주인공', '웨이브가 바뀔 때마다 모습이 바뀌어요: 1차 아직 생생 → 2차 밤샘 3일차 → 3차 번아웃 직전(머리 위 먹구름) → 4차 영혼 가출 → 박사 과정 좀비. Wet lab은 가운에 얼룩이 늘고 고글이 점점 흘러내려요. 걸음도 점점 느릿해 보이지만 모습만 바뀌고 이동 속도·능력은 그대로예요'],
          ['<span class="sw red"></span>', '화면 가장자리 붉은빛', '방금 맞았거나 멘탈이 35% 미만 (심장 박동처럼 깜빡여요). 보스가 나타날 때도 잠깐 깜빡여요'],
          ['💧', '캐릭터 옆 식은땀', '멘탈이 30% 미만'],
          ['🟡', '캐릭터를 감싼 금빛 방어막', '무적 상태 (풋살 효과). 끝나기 직전에 깜빡여요'],
          ['🟢', '캐릭터 뒤 초록 잔상', '헬스장 효과로 이동 속도가 빨라진 상태'],
          ['🤧', '캐릭터 옆 🤧 + 초록빛', '감기에 걸려 느려진 상태'],
          ['💻', '"재부팅 중…" + 화면 깨짐', '윈도우 업데이트 폭발에 맞아 무기가 잠시 멈춘 상태'],
          ['<span class="sw ice"></span>', '가장자리 성에 + 푸른빛', '교수님 해외출장: 적이 모두 멈춘 상태'],
        ]],
        ['orange', '👾 적 표시와 적의 공격', '적의 공격은 모두 빨간색이에요', [
          ['🏷️', '적 아래 작은 글씨', '적 이름. 보스는 이름 앞에 등급이 붙어요 (주황 = 중간보스, 빨강 = BOSS · FINAL BOSS)'],
          ['⭐', '적 머리 위 ⭐ · 금색 테두리', '엘리트: 체력 8배, 처치하면 Accept 메일'],
          ['❗', '적 머리 위 ! + 붉은 띠', '곧 돌진해요. 붉은 띠가 돌진할 방향 (개인 프로그레스 미팅, Reviewer #2)'],
          ['🔵', '"업데이트 중 n%" + 파란 원', '100%가 되면 그 원 안이 폭발해요 (컴퓨터 강제 종료)'],
          ['<span class="sw aim"></span>', '적 주위로 조여드는 빨간 고리', '원거리 적(TA·취업 면접·학위논문 초고)이 곧 탄을 쏴요. 고리가 다 조여들면 발사'],
          ['🌀', '보스에게 모여드는 빛의 고리', '보스가 곧 탄막을 쏴요. 고리가 작아지면 발사 (빨강 = 질문, 파랑 = 시험지·할 일 목록, 초록 = 세균)'],
          ['<span class="sw shot"></span>', '붉게 빛나는 테두리 + 꼬리', '적의 공격(시험지·질문·세균·경고). 모든 적 탄은 붉은 테두리를 두르고 맨 위에 그려져요. 꼬리 반대쪽이 날아가는 방향이에요'],
          ['<span class="sw shot heavy"></span>', '진한 고리를 두른 탄', '보스(중간보스 포함)가 쏜 무거운 탄. 파리채로 막을 수 없어요. 파리채는 일반 적의 탄만 막아요'],
          ['<span class="sw plot"></span>', '바닥의 빨간 점과 점선', '플롯 그리기가 찍은 데이터 점. 점을 밟으면 피해, 점을 잇는 점선은 장식 (파란 경험치 보석과 다른 빨간색)'],
        ]],
        ['red', '🚨 보스 특수 패턴', '바닥에 빨간 예고 지역이 차오르다 꽉 차면 터져요', [
          ['<span class="sw hazard"></span>', '바닥의 빨간 예고 지역', '보스·중간보스의 특수 패턴이 곧 덮칠 곳. 빨간 지역 밖으로 피하세요 (「발표자 조명」만 반대로 조명 안이 안전). 처음 보는 패턴은 화면 아래 알림으로 피하는 법을 알려 줘요'],
          ['<span class="sw hz-cone"></span>', '빨간 부채꼴', '감기 「재채기」(부채꼴 안에 세균 분사) · 학회 구두 발표 「레이저 포인터」(화살표 방향으로 레이저가 한 번 쓸고 지나감)'],
          ['<span class="sw hz-stripes"></span>', '줄무늬 칸 ①~⑤', '기말고사 「OMR 답안 마킹」. 칸과 칸 사이 빈 줄이 안전해요'],
          ['<span class="sw hz-cross"></span>', '가로·세로 십자 칸', '연구비 정산 「엑셀 정산표」. 내가 선 자리의 행과 열이 칠해지고, 곧바로 한 번 더 와요. 대각선으로 빠져나가요'],
          ['<span class="sw hz-target"></span>', '과녁', '과제 킥오프 미팅 「로드맵 발사」. 내가 갈 곳을 노린 과녁마다 로켓이 떨어져요. 계속 움직이세요'],
          ['<span class="sw hz-rush"></span>', '굵은 화살표 띠 (>>>)', '과제 킥오프 미팅 「로켓 발진」. 보스가 멈춰 서서 띠를 띄우고, 1초 뒤 화살표 방향으로 순식간에 돌진해요. 띠 옆으로 비켜서세요. 돌진이 끝나면 잠깐 멈춰 서니 반격할 틈이에요'],
          ['🔍', '따라오는 돋보기 표적', '과제 정기 보고(박사 과정) 「진도 체크」. 표적이 내 걸음보다 조금 느리게 따라오다가, 멈추고 「확인!」이 뜨면 곧 그 자리가 터져요. 계속 움직이거나 멈추는 순간 빠져나가세요'],
          ['<span class="sw hz-rings"></span>', '숫자 3·2·1이 적힌 고리', '학회 논문 초록 작성 「마감 카운트다운」. 안쪽 고리부터 차례로 터져요. 바깥으로 달아나거나 이미 터진 안쪽으로 들어가요'],
          ['<span class="sw gap"></span>', '빨간 점선 + 초록 화살표', '학회 포스터 발표 「질문 행렬」이 밀려올 출발선. 초록 화살표가 가리키는 빈틈으로 빠져나가요'],
          ['<span class="sw spot"></span>', '빨갛게 물든 주변 + 초록 테두리 조명', '졸업논문 심사 「발표자 조명」. 2초 뒤 조명 밖이 전부 터져요. 캐릭터 옆 초록 화살표를 따라 조명 안으로 들어가세요'],
          ['<span class="sw hz-line"></span>', '빨간 점선', '박사 학위 논문 심사 「빨간펜 수정」. 점선을 따라 빨간펜이 긋고 지나가요. 선에서 비켜서세요'],
          ['<span class="sw hz-circle"></span>', '큰 원 + 「재심사」', '박사 학위 논문 심사 「재심사 도장」. 도장이 내려찍히기 전에 원 밖으로 피하세요'],
        ]],
        ['purple', '✨ 내 무기 효과', '적의 공격과 헷갈리지 않게 조금 연하게 그려요', [
          [iconHTML({ custom: 'swatter' }), '늘 휘젓는 파리채 + 옅은 부채꼴', '파리채(전기 모기채)는 늘 손에 들고 내가 바라보는 방향(발밑 파란 화살표)을 향해요. 적을 알아서 노리지 않으니 몸을 돌려 맞혀야 하지만, 맞으면 아주 아파요(「찰싹!」, 전기 모기채는 「지지직!」). 옅은 부채꼴(최대 90°)이 탄을 막는 범위로, 그 안으로 들어온 일반 적의 탄은 하얗게(전기 모기채는 파랗게) 터지며 사라져요. 보스가 쏜 진한 고리 탄은 못 막아요. 하얀 잔상은 방금 쓸고 지나간 자리예요'],
          ['<span class="sw pool"></span>', '바닥의 초록·보라 웅덩이', 'Wet lab의 시약병·과망간산칼륨이 만든 웅덩이. 그 위의 적만 피해를 입고, 내가 밟아도 괜찮아요'],
          ['🔢', '떠오르는 숫자', '흰색 = 준 피해, 노란색 = 보스에게 준 피해, 초록 +숫자 = 멘탈 회복'],
          ['💥', '무기 효과 글자', '「Delete」(게이밍 마우스) · 「딸깍!」(기계식 키보드) · 「과열!」(워크스테이션) · 「찰싹!」(파리채) · 「쾅!」(유전자 변형쥐)처럼 내 무기가 띄우는 연한 글자예요. 내 무기 효과에는 빨간색을 쓰지 않아요 (빨강 = 적의 공격)'],
        ]],
        ['yellow', '🗺️ 맵 · 물건', '바닥에 놓이거나 떠 있는 것들', [
          ['💎', '바닥의 보석', '지식. 파랑 < 초록 < 보라 순으로 값이 커요'],
          ['🏠', '바닥 그림 + 떠 있는 아이콘', '성소 (헬스장 매트, 증바람 단상, 회식 불판, 학회 탑승구, 풋살장). 아이콘을 두른 고리는 남은 시간, 점선 원 안에 들어가면 발동'],
          ['🎁', '빛을 뿜으며 떠 있는 물건', '아이템 (삼각김밥 · Ctrl+A · 휴강 공지 · 교수님 해외출장 · Accept 메일). 닿으면 바로 효과'],
          ['🌇', '연구실 조명', '웨이브가 지날수록 오전 → 오후 → 해 질 녘 → 밤샘 분위기로 바뀌고, 박사 과정은 더 어두워요. 분위기만 바뀌고 효과는 없어요'],
          ['<span class="sw note">TODO</span>', '배경의 가구·소품', '맵은 캐릭터마다 달라요. Dry lab은 시뮬레이션 연구실(책상·모니터·화이트보드·계산 서버·책장·소파·자판기·탕비실·복사기, 바닥의 종이·컵라면·커피컵), Wet lab은 실험 연구실(실험대·흄후드·클린벤치·-80℃ 냉동고·배양기·개수대·오토클레이브·시약장·가스통·동물실, 바닥의 피펫 팁·장갑·쏟은 시약·미끄럼 주의 표지판)이에요. 화이트보드의 수식과 포스트잇도 모두 분위기를 내는 장식이에요. 그 위를 그냥 지나갈 수 있고, 게임에는 아무 효과가 없어요.'],
        ]],
      ];
      return hcols(groups.map(([color, title, sub, rows]) => hsec(color, title, sub, legendList(rows))).join(''));
    }

    helpWeapons() {
      const W = GS.data.weapons, C = GS.data.characters, chars = Object.keys(C);
      const card = (id) => {
        const w = W[id], to = w.evolveTo ? W[w.evolveTo] : null;
        const lv = (w.levels || []).map((l, i) => `<span>Lv${i + 2} ${esc(l.text)}</span>`).join('');
        const starters = chars.filter((c) => C[c].startWeapons.indexOf(id) >= 0);
        // 시작 무기 표시 (공용 시작 무기는 어느 캐릭터의 시작 무기인지 적는다)
        const pill = starters.length ? ` <span class="pill start">${w.only ? '' : esc(starters.map((c) => C[c].name).join('·')) + ' '}시작 무기</span>` : '';
        return `
          <div class="wcard">
            <div class="whead">${iconHTML(w.icon)}<div><b>${esc(w.name)}</b>${pill}<div class="muted small">${esc(w.desc)}</div></div></div>
            <details class="lvbox"><summary>레벨별 강화 보기</summary><div class="levels">${lv}</div></details>
            <div class="evo">${to ? `🧬 Lv 8 → ${iconHTML(to.icon, 'sm')} <b>${esc(to.name)}</b> — ${esc(to.desc)}` : '🚫 진화 없음 — 슬롯만 차지하는 쓰레기 무기'}</div>
          </div>`;
      };
      // 공용(청록) → Dry lab 전용(파랑) → Wet lab 전용(보라) 순서로, 묶음마다 색을 달리해 한눈에 구분한다
      const base = Object.keys(W).filter((id) => W[id].tier === 'base');
      const LAB = { dry: ['💻', 'blue'], wet: ['🧪', 'purple'] };
      const groups = [{ color: 'teal', title: '🤝 공용 무기', sub: '두 캐릭터 모두 얻어요', ids: base.filter((id) => !W[id].only) }]
        .concat(['dry', 'wet'].filter((c) => C[c]).map((c) => ({
          color: LAB[c][1], title: `${LAB[c][0]} ${esc(C[c].name)} 전용 무기`, sub: `${esc(C[c].lab)} · ${esc(C[c].name)}만 얻어요`, ids: base.filter((id) => W[id].only === c),
        })));
      const secs = groups.filter((g) => g.ids.length).map((g) => hsec(g.color, g.title, `${g.sub} · ${g.ids.length}종`, `<div class="wgrid">${g.ids.map(card).join('')}</div>`, 'wsec')).join('');
      const starts = chars.map((c) => `${esc(C[c].name)}: ${C[c].startWeapons.map((w) => esc(W[w].name)).join('·')}`).join(' / ');
      return `<p class="hlead">캐릭터마다 시작 무기 4개 중 하나로 시작하고(${starts}), 나머지는 레벨업 카드로 얻어요. <b class="tc common">공용</b> 무기는 두 캐릭터 모두, <b class="tc dry">Dry lab 전용</b>·<b class="tc wet">Wet lab 전용</b> 무기는 그 캐릭터만 얻어요. 모든 무기는 패시브(공격력·쿨타임·범위 등)의 영향을 받아요.</p>${secs}`;
    }

    helpPassives() {
      const P = GS.data.passives, C = GS.data.characters, c = GS.data.config;
      const flavor = (p) => (p.flavor ? `<i class="pflavor">"${esc(p.flavor)}"</i>` : '');
      const innate = Object.keys(C).map((id) => {
        const p = C[id].passive;
        return `<div class="pcard innate ${id}">${iconHTML(p.icon)}<div><b>${esc(p.name)} <span class="pill ${id}">${esc(C[id].name)}</span></b><span class="small">${esc(p.desc)} · 처음부터 적용</span>${flavor(p)}</div></div>`;
      }).join('');
      const card = (id) => {
        const p = P[id];
        return `<div class="pcard">${iconHTML(p.icon)}<div><b>${esc(p.name)} <span class="muted small">최대 Lv ${p.max}</span></b><span class="small">레벨당 ${esc(p.desc)}</span>${flavor(p)}</div></div>`;
      };
      // 효과(stat)에 따라 공격 / 생존 / 이동·성장으로 묶는다 (목록에 없는 효과는 마지막 묶음으로)
      const GROUPS = [
        ['orange', '⚔️ 공격', '무기를 더 세게 · 빠르게 · 넓게', ['might', 'cooldown', 'area', 'amount', 'duration', 'projSpeed']],
        ['green', '🛡️ 생존', '멘탈을 지킨다', ['maxHp', 'armor', 'regen']],
        ['blue', '🎒 이동 · 성장', '더 빨리 움직이고 더 빨리 큰다', null],
      ];
      const used = new Set();
      const secs = GROUPS.map(([color, title, sub, stats]) => {
        const ids = Object.keys(P).filter((id) => !used.has(id) && (!stats || stats.indexOf(P[id].stat) >= 0));
        ids.forEach((id) => used.add(id));
        return ids.length ? hsec(color, title, `${sub} · ${ids.length}종`, `<div class="pgrid">${ids.map(card).join('')}</div>`) : '';
      }).join('');
      return `<p class="hlead">패시브는 레벨업 카드로 얻고, 레벨이 오를 때마다 효과가 쌓여요. 최대 ${c.slots.passives}개까지 가질 수 있어요.</p>
        ${hsec('gray', '🧬 캐릭터 기본 패시브', '처음부터 켜져 있고 레벨이 없어요 · 패시브 칸을 차지하지 않고, 아래 패시브와 효과가 합쳐져요', `<div class="pgrid">${innate}</div>`)}
        ${secs}`;
    }

    helpEnemies() {
      const E = GS.data.enemies, P = GS.data.phd, CH = GS.data.chapters;
      const EV = { ring: '사방에서 원형으로 둘러싸 조여 옴', line: '떼를 지어 화면을 가로지름', elite: '⭐ 엘리트 등장 (처치하면 Accept 메일)', burst: '한꺼번에 몰려옴' };
      const icon = (d) => (d.sprite.emoji
        ? `<span class="eico" style="background:${d.sprite.bg}">${d.sprite.emoji}</span>`
        : `<span class="eico txt" style="background:${d.sprite.bg}">${esc(d.sprite.text)}</span>`);
      const row = (d, pill) => `<li>${icon(d)}<div><b>${esc(d.name)}</b>${pill || ''} <span class="muted small">실적 ${U.fmtNum(d.score)}</span><div class="desc">${esc(d.desc)}</div></div></li>`;
      const BOSS = ' <span class="pill red">보스</span>', MID = ' <span class="pill orange">중간보스</span>', FINAL = ' <span class="pill red">최종 보스</span>';
      const COLORS = ['green', 'blue', 'purple', 'orange'], lastI = CH.length - 1;
      const sections = CH.map((ch, i) => {
        const list = Object.keys(E).filter((id) => E[id].tier === i + 1 && !E[id].boss).map((id) => row(E[id])).join('');
        const bosses = (ch.midBoss ? row(E[ch.midBoss.enemy], MID) : '') + row(E[ch.boss.enemy], i === lastI ? FINAL : BOSS);
        const timeline = ch.events.map((ev) => ({ t: ev.t, text: `${esc(E[ev.enemy].name)} — ${EV[ev.type]}` }));
        if (ch.midBoss) timeline.push({ t: ch.midBoss.t, text: `중간보스 ${esc(E[ch.midBoss.enemy].name)} 등장`, boss: true });
        timeline.push({ t: ch.boss.t, text: `${i === lastI ? '최종 보스' : '보스'} ${esc(E[ch.boss.enemy].name)} 등장`, boss: true });
        timeline.sort((a, b) => a.t - b.t);
        const tl = timeline.map((x) => `<li${x.boss ? ' class="b"' : ''}><b>${U.fmtTime(x.t)}</b> ${x.text}</li>`).join('');
        return hsec(COLORS[i % COLORS.length], `${ch.name} · ${ch.title}`, `${U.fmtTime(i * ch.duration)}~${U.fmtTime((i + 1) * ch.duration)} · 적 체력 ×${ch.hpMult || 1}`, `
          <div class="esub">일반 적</div><ul class="elist">${list}</ul>
          <div class="esub">중간보스 · 보스</div><ul class="elist bosses">${bosses}</ul>
          <div class="esub">⏱️ 이벤트 시각표</div><ul class="events">${tl}</ul>`);
      }).join('');
      // 박사 과정: 보스 등장 순서 + 박사 과정에서만 나오는 보스 (다른 보스는 각 웨이브 상자에 설명이 있다)
      const order = P.bosses.map((id, k) => `<li class="b"><b>${k + 1}</b> ${esc(E[id].name)}</li>`).join('<li class="arrow">→</li>');
      const phdOnly = P.bosses.filter((id) => E[id].tier === 5).map((id) => row(E[id], BOSS)).join('');
      const phd = hsec('dark', '🎓 박사 과정 (무한)', `1분마다 적 체력 +${Math.round(P.hpPerMin * 100)}%`, `
        <p class="muted small">3·4학기 적이 섞여 나오고 1분마다 적 체력이 ${Math.round(P.hpPerMin * 100)}%씩 늘어요. ${minSec(P.eventEvery)}마다 이벤트가 일어나요.</p>
        <div class="esub">보스 등장 순서 — ${minSec(P.bossFirst)} 뒤 첫 보스, 이후 ${minSec(P.bossEvery)}마다. 한 바퀴 돌면 처음부터 다시 나오고, 보스가 나올 때마다 체력 배율이 ${Math.round(P.bossHpGrowth * 100)}%씩 커져요</div>
        <ul class="events">${order}</ul>
        <div class="esub">박사 과정에서만 나오는 보스</div>
        <ul class="elist bosses">${phdOnly}</ul>`);
      return `<p class="hlead">이벤트 시각표의 시간은 각 웨이브가 시작된 뒤 지난 시간이에요. 웨이브가 바뀌어도 이전 적이 섞여 나와요.</p>${sections}${phd}`;
    }

    helpPlaces() {
      const S = GS.data.sanctuaries, I = GS.data.items, c = GS.data.config, sc = c.sanctuary;
      let total = 0;
      for (const id in S) total += S[id].weight;
      const sanct = Object.keys(S).map((id) => {
        const s = S[id];
        return [s.emoji, `${esc(s.name)} <span class="muted small">등장 확률 ${Math.round((s.weight / total) * 100)}%</span>`, esc(s.msg)];
      });
      const effectText = (ef) => {
        if (ef.heal) return `멘탈 ${ef.heal} 회복`;
        if (ef.vacuum) return '맵에 떨어진 지식을 전부 끌어당겨요';
        if (ef.nuke) return '화면 안의 일반 적 전멸 + 보스 최대 체력 10% 피해 + 적 투사체 제거';
        if (ef.freeze) return `${ef.freeze}초 동안 모든 적과 적 투사체가 멈춰요`;
        return '';
      };
      const items = Object.keys(I).filter((id) => id !== 'accept').map((id) => {
        const it = I[id];
        return [iconHTML(it.icon, 'sm'), `${esc(it.name)} <span class="muted small">일반 적 처치 시 ${+(it.chance * 100).toFixed(2)}%</span>`, effectText(it.effect)];
      });
      items.push(['📩', 'Accept 메일 <span class="muted small">엘리트·보스 처치 시 100%</span>', `보유 중인 무기·패시브를 랜덤 강화해요. 보통 1개, ${Math.round(c.chest.three * 100)}% 확률로 3개, ${Math.round(c.chest.five * 100)}% 확률로 5개 (행운이 높을수록 확률 증가). 진화할 수 있는 무기가 있으면 진화가 먼저 나와요.`]);
      return hcols(
        hsec('green', '🏠 성소', `시작 ${sc.first}초 뒤 첫 성소 · 동시에 최대 ${sc.maxActive}개`, `<p class="muted small">시작 ${sc.first}초 뒤 첫 성소가 열리고, 이후 ${sc.intervalMin}~${sc.intervalMax}초마다 조금 떨어진 곳에 하나씩 열려요. ${sc.lifetime}초가 지나면 닫히고, 동시에 최대 ${sc.maxActive}개까지 있어요. 화면 밖에 있으면 가장자리 화살표로 표시되고, 안에 들어가면 바로 효과가 발동해요.</p>${legendList(sanct)}`)
        + hsec('orange', '🎁 아이템', '닿으면 바로 효과', `<p class="muted small">닿으면 바로 효과가 발동해요. 지식 흡수 범위 안에 있으면 끌려와요.</p>${legendList(items)}`));
    }

    // ───────── 게임 중 선택 창 ─────────
    showChoice(game, c, onPick) {
      if (c.type === 'levelup' || c.type === 'augment') this.showOptions(game, c, onPick);
      else if (c.type === 'reward') this.showReward(game, c, onPick);
      else if (c.type === 'judgment') this.showJudgment(c, onPick);
    }

    buildBar(game) {
      const ws = game.weapons.map((w) => `<span class="mini ${w.def.tier === 'evolved' ? 'evo' : ''}">${iconHTML(w.def.icon, 'sm')}<b>${w.def.tier === 'evolved' ? '★' : w.level}</b></span>`).join('');
      const ps = game.passives.map((p) => `<span class="mini">${iconHTML(p.def.icon, 'sm')}<b>${p.level}</b></span>`).join('');
      const ew = '<span class="mini empty"></span>'.repeat(Math.max(0, game.cfg.slots.weapons - game.weapons.length));
      const ep = '<span class="mini empty"></span>'.repeat(Math.max(0, game.cfg.slots.passives - game.passives.length));
      const p0 = game.charDef.passive; // 캐릭터 기본 패시브 (칸을 차지하지 않는다)
      const inn = `<span class="mini innate ${game.character}" title="기본 패시브 ${esc(p0.name)}: ${esc(p0.desc)}">${iconHTML(p0.icon, 'sm')}</span>`;
      return `<div class="build"><div><span class="lbl">무기</span>${ws}${ew}</div><div><span class="lbl">패시브</span>${inn}${ps}${ep}</div></div>`;
    }

    showOptions(game, c, onPick) {
      const opts = c.options.map((o) => game.describeOption(o));
      const layer = this.mount('modal', `
        <div class="panel wide ${c.type}">
          <h2>${esc(c.title)}</h2>
          <p class="sub">${esc(c.sub || '')}</p>
          <div class="cards">${opts.map((d, i) => this.cardHTML(d, i)).join('')}</div>
          ${this.buildBar(game)}
        </div>`);
      const els = [...layer.querySelectorAll('.card')];
      let done = false;
      const pick = (i) => {
        if (done || !this.ready()) return;
        done = true;
        onPick(i);
      };
      els.forEach((el, i) => el.addEventListener('click', () => pick(i)));
      this.cardKeys(els, pick);
    }

    showReward(game, c, onPick) {
      const items = c.items.map((d, i) => `
        <li class="${d.cls || ''}" style="--i:${i}">${iconHTML(d.icon)}
          <div><b>${esc(d.name)}</b> <span class="tag">${esc(d.tag || '')}</span><div class="desc">${esc(d.desc || '')}</div></div>
        </li>`).join('');
      const layer = this.mount('modal', `
        <div class="panel">
          <h2>${esc(c.title)}</h2>
          <p class="sub">${esc(c.sub || '')}</p>
          <ul class="reward">${items}</ul>
          ${this.buildBar(game)}
          <div class="actions"><button class="btn primary" data-act="ok">확인 (Space)</button></div>
        </div>`);
      let done = false;
      const ok = () => {
        if (done || !this.ready(350)) return;
        done = true;
        onPick(0);
      };
      this.bind(layer, { ok });
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) { ok(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }

    showJudgment(c, onPick) {
      // 취업 조건 두 가지: 연구 실적 커트라인 + 최종 보스 격파
      const chk = (ok, text) => `<li class="${ok ? 'ok' : 'no'}"><span>${ok ? '✅' : '❌'}</span>${text}</li>`;
      const line = `<ul class="judge-list">
          ${chk(c.scoreOk, `연구 실적 <b>${U.fmtNum(c.score)}</b> / 커트라인 ${U.fmtNum(c.required)}`)}
          ${chk(c.bossDown, `최종 보스 「${esc(c.boss)}」 격파`)}
        </ul>`;
      const why = !c.scoreOk && !c.bossDown ? '실적도, 발표도 부족…' : !c.scoreOk ? '실적 부족…' : '발표를 끝내지 못했다…';
      const html = c.pass
        ? `<div class="panel judge pass">
            <div class="big-emoji">🎉</div>
            <h2>석사 졸업 심사 통과!</h2>${line}
            <p>4학기 동안 쌓은 실적으로 <b>취업에 성공</b>했습니다!</p>
            <div class="actions">
              <button class="btn primary" data-act="job">취업한다 (엔딩)</button>
              <button class="btn" data-act="phd">그래도 박사 진학 (무한 모드)</button>
            </div>
          </div>`
        : `<div class="panel judge fail">
            <div class="big-emoji">😱</div>
            <h2>${why}</h2>${line}
            <p>취업에 실패해 <b>박사 과정</b>에 강제 진학합니다.<br>박사 과정에는 시간 제한이 없습니다. 버틸 수 있을 만큼 버티세요.</p>
            <div class="actions"><button class="btn danger" data-act="phd">박사 과정 시작…</button></div>
          </div>`;
      const layer = this.mount('modal', html);
      if (c.pass) confetti(layer, 70);
      let done = false;
      const go = (i) => {
        if (done || !this.ready(700)) return;
        done = true;
        onPick(i);
      };
      this.bind(layer, { job: () => go(0), phd: () => go(c.pass ? 1 : 0) });
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) go(0);
        return true;
      };
    }

    // ───────── 일시정지 / 결과 ─────────
    weaponTable(rows) {
      return `<table class="tbl"><thead><tr><th>무기</th><th>레벨</th><th>누적 피해</th><th>처치</th></tr></thead><tbody>${rows.map((w) => `
        <tr><td>${iconHTML(w.icon, 'sm')} ${esc(w.name)}</td><td>${w.evolved ? '★ 진화' : 'Lv ' + w.level}</td><td>${U.fmtNum(w.dmg)}</td><td>${U.fmtNum(w.kills)}</td></tr>`).join('')}</tbody></table>`;
    }

    showPause(game, cb) {
      const rows = game.weapons.map((w) => ({ icon: w.def.icon, name: w.def.name, level: w.level, evolved: w.def.tier === 'evolved', dmg: w.dmg, kills: w.kills }));
      const p0 = game.charDef.passive;
      const ps = `<span class="chip innate ${game.character}">${iconHTML(p0.icon, 'sm')} ${esc(p0.name)} <b>기본</b></span>` + game.passives.map((p) => `<span class="chip">${iconHTML(p.def.icon, 'sm')} ${esc(p.def.name)} Lv${p.level}</span>`).join('');
      const s = game.stats;
      const layer = this.mount('modal', `
        <div class="panel">
          <h2>일시정지</h2>
          <p class="sub">${esc(game.charDef.name)} · ${esc(game.chapterLabel().title)} · 연구 실적 ${U.fmtNum(game.score)} · Lv ${game.player.level}</p>
          ${this.weaponTable(rows)}
          <div class="chips">${ps}</div>
          <p class="muted small">공격력 ${Math.round(s.might * 100)}% · 쿨타임 ${Math.round(s.cooldown * 100)}% · 범위 ${Math.round(s.area * 100)}% · 방어 ${s.armor} · 회복 ${s.regen.toFixed(2)}/초 · 이동 ${Math.round(s.moveSpeed * 100)}%</p>
          <div class="actions">
            <button class="btn primary" data-act="resume">계속하기</button>
            <button class="btn" data-act="help">게임 방법</button>
            <button class="btn" data-act="restart">처음부터</button>
            <button class="btn ghost" data-act="title">타이틀로</button>
          </div>
        </div>`);
      this.bind(layer, cb);
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Escape' || e.code === 'KeyP')) { cb.resume(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }

    showResult(res, newBest, cb) {
      let head;
      if (res.type === 'job') head = '<div class="big-emoji">🎉</div><h2>취업 성공!</h2><p class="sub">석사 4학기를 버티고 취업에 성공했습니다.</p>';
      else if (res.phd) head = `<div class="big-emoji">🎓</div><h2>${esc(res.stage)}, 번아웃…</h2><p class="sub">박사 과정에서 ${U.fmtTime(res.phdTime)} 동안 버텼습니다.</p>`;
      else head = `<div class="big-emoji">😵</div><h2>번아웃…</h2><p class="sub">${esc(res.stage)}에서 멘탈이 바닥났습니다.</p>`;
      const stats = [
        ['캐릭터', res.character], ['시작 무기', res.startWeapon], ['총 플레이 시간', U.fmtTime(res.time)], ['도달 단계', res.stage], ['레벨', 'Lv ' + res.level],
        ['처치', U.fmtNum(res.kills)], ['연구 실적', U.fmtNum(res.score) + (newBest ? ' 🏆' : '')], ['받은 피해', U.fmtNum(res.damageTaken)],
      ].map(([k, v], i) => `<div class="stat" style="--i:${i}"><span>${k}</span><b>${esc(v)}</b></div>`).join('');
      const evo = res.evolutions.length ? res.evolutions.map((e) => `${esc(e.from)} → <b>${esc(e.to)}</b> (${U.fmtTime(e.time)})`).join(' · ') : '없음';
      const boss = res.bossKills.length ? res.bossKills.map((b) => `${esc(b.name)} (${U.fmtTime(b.time)})`).join(' · ') : '없음';
      const layer = this.mount('modal', `
        <div class="panel wide result ${res.type === 'job' ? 'pass' : 'fail'}">
          ${head}
          ${newBest ? '<p class="best">🏆 최고 실적 갱신!</p>' : ''}
          <div class="stats">${stats}</div>
          ${this.weaponTable(res.weapons)}
          <p class="small"><b>진화</b> ${evo}</p>
          <p class="small"><b>격파한 보스</b> ${boss}</p>
          <div class="submit">
            <span class="submit-title">🏆 기록판에 올리기</span>
            <input class="nick" maxlength="12" placeholder="닉네임 (12자까지)" value="${esc(GS.board.name())}">
            <button class="btn" data-act="submit">올리기</button>
            <span class="submit-msg small"></span>
          </div>
          <div class="actions">
            <button class="btn primary" data-act="retry">다시 하기</button>
            <button class="btn" data-act="change">캐릭터·무기 바꾸기</button>
            <button class="btn ghost" data-act="title">타이틀로</button>
          </div>
        </div>`);
      if (res.type === 'job') confetti(layer, 90);
      // 기록판에 올리기: 닉네임은 다음 판을 위해 기억해 둔다
      const inp = layer.querySelector('.nick'), msg = layer.querySelector('.submit-msg'), sbtn = layer.querySelector('[data-act="submit"]');
      let sent = false;
      const submit = () => {
        if (sent) return;
        const name = inp.value.trim();
        if (!name) { msg.textContent = '닉네임을 적어 주세요'; msg.className = 'submit-msg small warn'; inp.focus(); return; }
        sent = true;
        sbtn.disabled = true;
        msg.textContent = '올리는 중…';
        msg.className = 'submit-msg small muted';
        GS.board.saveName(name);
        GS.board.post({ name, score: Math.round(res.score), phdTime: Math.round(res.phdTime || 0), char: res.charId, result: res.type === 'job' ? 'job' : res.phd ? 'phd' : 'out', level: res.level })
          .then((j) => {
            sbtn.textContent = '등록됨 ✓';
            msg.textContent = j.rank ? `등록 완료! 연구 실적 전체 ${j.rank}위` : '등록 완료!';
            msg.className = 'submit-msg small ok';
          })
          .catch((e) => {
            sent = false;
            sbtn.disabled = false;
            // 응답이 아예 없으면 인터넷 문제, 응답은 왔는데 실패면 서버 쪽 문제
            msg.textContent = !e.status ? '올리지 못했어요. 인터넷 연결을 확인해 주세요'
              : e.code === 'too_many' ? '너무 자주 올렸어요. 잠시 뒤 다시 시도해 주세요'
              : e.code === 'server' ? '기록판 서버에 문제가 생겼어요. 잠시 뒤 다시 시도해 주세요'
              : e.code === 'no_name' || e.code === 'bad_value' || e.code === 'bad_body' ? '기록을 올릴 수 없는 값이에요'
              : '기록판 서버가 아직 연결되지 않았어요 (배포 사이트에서 설정 필요)';
            msg.className = 'submit-msg small warn';
          });
      };
      inp.addEventListener('keydown', (e) => {
        e.stopPropagation(); // 글자를 쓰는 동안은 게임 단축키(M·WASD·Enter 다시 하기)가 동작하지 않게
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); submit(); }
      });
      this.bind(layer, Object.assign({}, cb, { submit }));
      this.keyHandler = (e) => {
        if (!e.repeat && e.code === 'Enter' && this.ready(700)) { cb.retry(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }
  }

  GS.UI = UI;
})(window.GS = window.GS || {});
