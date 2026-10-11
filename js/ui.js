// DOM 화면: 타이틀 / 시작 무기 선택 / 게임 방법 / 레벨업·보상·취업 판정 / 일시정지 / 결과
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

  // 게임 방법 공통 양식 ('1. 기본 규칙'과 동일): 2단, 각 단은 [제목, 글머리 목록] 묶음
  function helpPage(left, right) {
    const col = (blocks) => blocks.map(([title, items]) => `<h3>${title}</h3><ul>${items.map((t) => `<li>${t}</li>`).join('')}</ul>`).join('');
    return `<div class="help-cols"><section>${col(left)}</section><section>${col(right)}</section></div>`;
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

    // 카드 키보드 조작: 1~4 바로 선택, ←→/AD 이동 후 Enter/Space
    cardKeys(cards, onPick) {
      let sel = -1;
      const mark = () => cards.forEach((c, i) => c.classList.toggle('sel', i === sel));
      this.keyHandler = (e) => {
        if (e.repeat || !this.ready()) return true;
        const n = parseInt(e.key, 10);
        if (n >= 1 && n <= cards.length) { onPick(n - 1); return true; }
        if (['ArrowRight', 'KeyD', 'ArrowDown', 'KeyS'].includes(e.code)) { sel = (sel + 1) % cards.length; mark(); return true; }
        if (['ArrowLeft', 'KeyA', 'ArrowUp', 'KeyW'].includes(e.code)) { sel = (sel - 1 + cards.length) % cards.length; mark(); return true; }
        if ((e.code === 'Enter' || e.code === 'Space') && sel >= 0) { onPick(sel); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }

    cardHTML(d, i) {
      return `
        <button class="card ${d.cls || ''}" data-i="${i}">
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
        ? `최고 실적 <b>${U.fmtNum(rec.bestScore || 0)}</b> · 취업 성공 <b>${rec.jobs || 0}</b>회 · 박사 최장 생존 <b>${U.fmtTime(rec.bestPhd || 0)}</b> · 플레이 ${rec.plays}회`
        : '첫 학기를 시작해 보세요!';
      const layer = this.mount('title-screen', `
        <div class="title-box">
          <div class="title-emoji">🧑‍🎓</div>
          <h1>${esc(cfg.title)}</h1>
          <p class="subtitle">${esc(cfg.subtitle)}</p>
          <div class="menu">
            <button class="btn primary big" data-act="start">게임 시작</button>
            <button class="btn big" data-act="help">게임 방법</button>
          </div>
          <p class="records">${recLine}</p>
          <p class="hint">WASD 이동 · ESC 일시정지 · M 소리 켜기/끄기</p>
        </div>`);
      this.bind(layer, cb);
      this.keyHandler = (e) => {
        if (!e.repeat && (e.code === 'Enter' || e.code === 'Space')) { cb.start(); return true; }
        return false;
      };
    }

    showSelect(cb) {
      const W = GS.data.weapons, ids = GS.data.config.startWeapons;
      const cards = ids.map((id, i) => this.cardHTML({ icon: W[id].icon, name: W[id].name, tag: `Lv 8 진화 → ${W[W[id].evolveTo].name}`, desc: W[id].desc }, i)).join('');
      const layer = this.mount('modal', `
        <div class="panel wide">
          <h2>시작 무기 선택</h2>
          <p class="sub">어떤 무기로 대학원 생활을 시작할까요? 나머지 무기는 레벨업으로 얻을 수 있어요.</p>
          <div class="cards">${cards}</div>
          <div class="actions"><button class="btn ghost" data-act="back">← 돌아가기</button></div>
        </div>`);
      const els = [...layer.querySelectorAll('.card')];
      els.forEach((el, i) => el.addEventListener('click', () => cb.pick(ids[i])));
      this.bind(layer, cb);
      this.cardKeys(els, (i) => cb.pick(ids[i]));
      const inner = this.keyHandler;
      this.keyHandler = (e) => {
        if (e.code === 'Escape') { cb.back(); return true; }
        return inner(e);
      };
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
      const c = GS.data.config, E = GS.data.enemies, P = GS.data.phd;
      const bossList = [];
      GS.data.chapters.forEach((ch) => {
        if (ch.midBoss) bossList.push(`${esc(E[ch.midBoss.enemy].name)}(중간보스) ${U.fmtNum(E[ch.midBoss.enemy].score)}`);
        bossList.push(`${esc(E[ch.boss.enemy].name)} ${U.fmtNum(E[ch.boss.enemy].score)}`);
      });
      const bosses = bossList.join(' · ');
      const year = minSec(P.yearSeconds);
      return helpPage([
        ['🎯 목표', [
          `1차~4차 웨이브(석사 1~4학기)를 각 ${GS.data.chapters[0].duration / 60}분씩, 총 ${GS.data.chapters.reduce((s, ch) => s + ch.duration, 0) / 60}분 버티세요.`,
          `4차가 끝나는 순간 <b>연구 실적이 ${U.fmtNum(c.jobScore)} 이상</b>이면 <b>취업 성공(엔딩)</b>.`,
          `모자라면 <b>박사 과정</b>에 강제 진학합니다. 시간 제한이 없는 무한 웨이브로, 버틴 시간이 기록이 돼요. 시간이 갈수록 적이 단단해지고 ${year}마다 '박사 n년차'가 올라갑니다.`,
          "커트라인을 넘겨도 <b>'그래도 박사 진학'</b>을 고르면 무한 모드를 이어서 할 수 있어요.",
          '<b>멘탈</b>(체력)이 0이 되면 번아웃, 게임 오버예요.',
        ]],
        ['🕹️ 조작', [
          'WASD(또는 방향키)로 이동. 공격은 전부 자동이에요.',
          '레벨업 카드는 숫자키 1~4 또는 클릭으로 골라요. A/D로 옮기고 Space·Enter로 골라도 돼요.',
          'ESC 또는 P: 일시정지 (일시정지 화면에서 게임 방법도 볼 수 있어요) · M: 소리 켜기/끄기',
          '게임 창을 벗어나면 자동으로 일시정지돼요.',
        ]],
      ], [
        ['📈 성장', [
          '적을 처치하면 <b>지식</b>(경험치 보석)이 떨어져요. 가까이 가면 빨려 들어옵니다. 값: 파랑(1~4) &lt; 초록(5~19) &lt; 보라(20 이상)',
          `바닥의 지식이 ${c.gemCap}개를 넘으면 가장 먼 지식이 새 지식에 합쳐져요. 사라지지는 않아요.`,
          `레벨업하면 카드 ${c.choiceCount}장 중 1장을 고릅니다. 행운이 높으면 가끔 4장이 나와요.`,
          `무기는 최대 ${c.slots.weapons}개, 패시브는 최대 ${c.slots.passives}개. 무기는 최대 Lv 8, 패시브는 최대 Lv 5 (복사기는 Lv 2).`,
          "<b>진화</b>: 기본 무기를 Lv 8까지 올리면 다음 레벨업이나 Accept 메일에서 노란 '진화!' 카드가 반드시 나와요.",
          '모든 칸이 최대 레벨이면 레벨업 창 대신 멘탈 15% 회복 + 연구 실적 보너스를 자동으로 받아요.',
        ]],
        ['📊 연구 실적 (점수)', [
          '적을 처치할 때마다 올라요. 강한 적일수록 많이 주고, 엘리트는 12배예요.',
          `보스: ${bosses}`,
          '도망만 다니면 처치가 부족해 커트라인을 넘기 어려워요.',
        ]],
        ['💥 피해', [
          `적에 닿거나 적이 던진 시험지·과제·질문·세균에 맞으면 멘탈이 줄어요. 같은 적에게는 ${c.player.contactCooldown}초에 한 번만 맞아요.`,
          '방어력만큼 받는 피해가 줄어요 (최소 1).',
          `멘탈은 기본으로 초당 ${c.player.regen || 0}씩 회복돼요. 2남 휴게실을 얻으면 더 빨라져요.`,
        ]],
      ]);
    }

    helpScreen() {
      const rows = [
        ['<span class="sw xp"></span>', '맨 위 파란 막대', '지식(경험치). 오른쪽 끝에 레벨과 다음 레벨까지 필요한 지식'],
        ['⏱️', '가운데 위 시계', '전체 경과 시간과 현재 웨이브, 웨이브 남은 시간 (박사 모드에서는 박사 n년차)'],
        ['📊', '오른쪽 위 패널', '연구 실적과 취업 커트라인 진행 막대 (노랑, 달성하면 초록). 그 아래는 처치 수'],
        ['🎒', '왼쪽 위 칸', '윗줄은 무기, 아랫줄은 패시브. 숫자 = 레벨, MAX = 최대 레벨, ★(노란 칸) = 진화 무기'],
        ['<span class="sw boss"></span>', '빨간 보스 막대', '보스가 나오면 위쪽에 이름과 남은 체력이 보여요'],
        ['➤', '화면 가장자리 화살표', '화면 밖에 있는 성소·보스·Accept 메일의 방향'],
        ['<span class="sw hp"></span>', '캐릭터 아래 막대', '멘탈. 초록 → 노랑(50% 미만) → 빨강(25% 미만)'],
        ['🔹', '캐릭터 옆 파란 삼각형', '지금 바라보는(이동하는) 방향'],
        ['<span class="sw red"></span>', '화면 가장자리 붉은빛', '방금 맞았거나 멘탈이 35% 미만'],
        ['<span class="sw ice"></span>', '화면 전체 푸른빛', '교수님 해외출장: 적이 모두 멈춘 상태'],
        ['🟡', '캐릭터 주위 노란 원', '무적 상태 (풋살 효과)'],
        ['🤧', '캐릭터 옆 🤧', '감기에 걸려 느려진 상태'],
        ['💻', '"재부팅 중…"', '윈도우 업데이트 폭발에 맞아 무기가 잠시 멈춘 상태'],
        ['❗', '적 머리 위 !', '곧 돌진해요 (개인 프로그레스 미팅, Reviewer #2)'],
        ['🔵', '"업데이트 중 n%" + 파란 원', '100%가 되면 그 원 안이 폭발해요 (컴퓨터 강제 종료)'],
        ['⭐', '적 머리 위 ⭐ · 금색 테두리', '엘리트: 체력 8배, 처치하면 Accept 메일'],
        ['🔢', '떠오르는 숫자', '흰색 = 준 피해, 노란색 = 보스에게 준 피해, 초록 +숫자 = 멘탈 회복'],
        ['🏷️', '적 아래 작은 글씨', '적 이름'],
        ['💬', '화면 아래 알림', '이벤트 예고, 새로 나온 적, 아이템·성소 효과'],
        ['<span class="sw note">TODO</span>', '배경의 책상·모니터·화이트보드·서버·화분', '시뮬레이션 연구실 분위기를 내는 장식이에요. 화이트보드의 수식과 "논문 읽기", "D-7" 같은 포스트잇도 마찬가지예요. 그 위를 그냥 지나갈 수 있고, 게임에는 아무 효과가 없어요.'],
      ];
      return `<ul class="legend">${rows.map(([ic, t, d]) => `<li><span class="lg-ico">${ic}</span><div><b>${t}</b><span>${d}</span></div></li>`).join('')}</ul>`;
    }

    helpWeapons() {
      const W = GS.data.weapons, start = GS.data.config.startWeapons;
      const cards = Object.keys(W).filter((id) => W[id].tier === 'base').map((id) => {
        const w = W[id], to = w.evolveTo ? W[w.evolveTo] : null;
        const lv = (w.levels || []).map((l, i) => `<span>Lv${i + 2} ${esc(l.text)}</span>`).join('');
        return `
          <div class="wcard">
            <div class="whead">${iconHTML(w.icon)}<div><b>${esc(w.name)}</b>${start.indexOf(id) >= 0 ? ' <span class="pill">시작 무기</span>' : ''}<div class="muted small">${esc(w.desc)}</div></div></div>
            <div class="levels">${lv}</div>
            <div class="evo">${to ? `🧬 Lv 8 → ${iconHTML(to.icon, 'sm')} <b>${esc(to.name)}</b> — ${esc(to.desc)}` : '🚫 진화 없음 — 슬롯만 차지하는 쓰레기 무기'}</div>
          </div>`;
      }).join('');
      return `<p class="muted center">시작 무기(펜·마우스·키보드·개인 PC) 중 하나로 시작하고, 나머지는 레벨업 카드로 얻어요. 모든 무기는 패시브(공격력·쿨타임·범위 등)의 영향을 받아요.</p><div class="wgrid">${cards}</div>`;
    }

    helpPassives() {
      const P = GS.data.passives;
      const cards = Object.keys(P).map((id) => {
        const p = P[id];
        return `<div class="pcard">${iconHTML(p.icon)}<div><b>${esc(p.name)}</b><span class="muted small">레벨당 ${esc(p.desc)} · 최대 Lv ${p.max}</span></div></div>`;
      }).join('');
      return `<p class="muted center">패시브는 레벨업 카드로 얻고, 레벨이 오를 때마다 효과가 쌓여요.</p><div class="pgrid">${cards}</div>`;
    }

    helpEnemies() {
      const E = GS.data.enemies, P = GS.data.phd;
      const EV = { ring: '사방에서 원형으로 둘러싸 조여 옴', line: '떼를 지어 화면을 가로지름', elite: '⭐ 엘리트 등장 (처치하면 Accept 메일)', burst: '한꺼번에 몰려옴' };
      const icon = (d) => (d.sprite.emoji
        ? `<span class="eico" style="background:${d.sprite.bg}">${d.sprite.emoji}</span>`
        : `<span class="eico txt" style="background:${d.sprite.bg}">${esc(d.sprite.text)}</span>`);
      const row = (d, pill) => `<li>${icon(d)}<div><b>${esc(d.name)}</b>${pill || ''} <span class="muted small">실적 ${U.fmtNum(d.score)}</span><div class="desc">${esc(d.desc)}</div></div></li>`;
      const BOSS = ' <span class="pill red">보스</span>', MID = ' <span class="pill orange">중간보스</span>';
      const sections = GS.data.chapters.map((ch, i) => {
        const list = Object.keys(E).filter((id) => E[id].tier === i + 1 && !E[id].boss).map((id) => row(E[id])).join('');
        const timeline = ch.events.map((ev) => ({ t: ev.t, text: `${esc(E[ev.enemy].name)} — ${EV[ev.type]}` }));
        if (ch.midBoss) timeline.push({ t: ch.midBoss.t, text: `중간보스 ${esc(E[ch.midBoss.enemy].name)} 등장` });
        timeline.push({ t: ch.boss.t, text: `보스 ${esc(E[ch.boss.enemy].name)} 등장` });
        timeline.sort((a, b) => a.t - b.t);
        return `
          <section class="enemy-sec">
            <h3>${ch.name} · ${ch.title} <span class="muted small">${U.fmtTime(i * ch.duration)}~${U.fmtTime((i + 1) * ch.duration)} · 적 체력 ×${ch.hpMult || 1}</span></h3>
            <ul class="elist">${list}${ch.midBoss ? row(E[ch.midBoss.enemy], MID) : ''}${row(E[ch.boss.enemy], BOSS)}</ul>
            <ul class="events">${timeline.map((x) => `<li>${U.fmtTime(x.t)} · ${x.text}</li>`).join('')}</ul>
          </section>`;
      }).join('');
      return `
        <p class="muted center">시간은 각 웨이브가 시작된 뒤 지난 시간이에요. 웨이브가 바뀌어도 이전 적이 섞여 나와요.</p>
        ${sections}
        <section class="enemy-sec">
          <h3>🎓 박사 과정 (무한)</h3>
          <ul class="elist">${row(E.defense, BOSS)}</ul>
          <p class="muted small">3·4학기 적이 섞여 나오고 1분마다 적 체력이 ${Math.round(P.hpPerMin * 100)}%씩 늘어요. ${minSec(P.eventEvery)}마다 이벤트, ${minSec(P.bossEvery)}마다 보스(${P.bosses.map((id) => esc(E[id].name)).join(' → ')} 순)가 나와요.</p>
        </section>`;
    }

    helpPlaces() {
      const S = GS.data.sanctuaries, I = GS.data.items, c = GS.data.config, sc = c.sanctuary;
      let total = 0;
      for (const id in S) total += S[id].weight;
      const sanct = Object.keys(S).map((id) => {
        const s = S[id];
        return `<li><span class="lg-ico">${s.emoji}</span><div><b>${esc(s.name)} <span class="muted small">등장 확률 ${Math.round((s.weight / total) * 100)}%</span></b><span>${esc(s.msg)}</span></div></li>`;
      }).join('');
      const effectText = (ef) => {
        if (ef.heal) return `멘탈 ${ef.heal} 회복`;
        if (ef.vacuum) return '맵에 떨어진 지식을 전부 끌어당겨요';
        if (ef.nuke) return '화면 안의 일반 적 전멸 + 보스 최대 체력 10% 피해 + 적 투사체 제거';
        if (ef.freeze) return `${ef.freeze}초 동안 모든 적과 적 투사체가 멈춰요`;
        return '';
      };
      const items = Object.keys(I).filter((id) => id !== 'accept').map((id) => {
        const it = I[id];
        return `<li><span class="lg-ico">${iconHTML(it.icon, 'sm')}</span><div><b>${esc(it.name)} <span class="muted small">일반 적 처치 시 ${+(it.chance * 100).toFixed(2)}%</span></b><span>${effectText(it.effect)}</span></div></li>`;
      }).join('');
      return `
        <div class="help-cols">
          <section>
            <h3>🏠 성소</h3>
            <p class="muted small">시작 ${sc.first}초 뒤 첫 성소가 열리고, 이후 ${sc.intervalMin}~${sc.intervalMax}초마다 조금 떨어진 곳에 하나씩 열려요. ${sc.lifetime}초가 지나면 닫히고, 동시에 최대 ${sc.maxActive}개까지 있어요. 화면 밖에 있으면 가장자리 화살표로 표시되고, 안에 들어가면 바로 효과가 발동해요.</p>
            <ul class="legend">${sanct}</ul>
          </section>
          <section>
            <h3>🎁 아이템</h3>
            <p class="muted small">닿으면 바로 효과가 발동해요. 지식 흡수 범위 안에 있으면 끌려와요.</p>
            <ul class="legend">${items}
              <li><span class="lg-ico">📩</span><div><b>Accept 메일 <span class="muted small">엘리트·보스 처치 시 100%</span></b><span>보유 중인 무기·패시브를 랜덤 강화해요. 보통 1개, ${Math.round(c.chest.three * 100)}% 확률로 3개, ${Math.round(c.chest.five * 100)}% 확률로 5개 (행운이 높을수록 확률 증가). 진화할 수 있는 무기가 있으면 진화가 먼저 나와요.</span></div></li>
            </ul>
          </section>
        </div>`;
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
      return `<div class="build"><div><span class="lbl">무기</span>${ws}${ew}</div><div><span class="lbl">패시브</span>${ps}${ep}</div></div>`;
    }

    showOptions(game, c, onPick) {
      const opts = c.options.map((o) => game.describeOption(o));
      const layer = this.mount('modal', `
        <div class="panel wide">
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
      const items = c.items.map((d) => `
        <li class="${d.cls || ''}">${iconHTML(d.icon)}
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
      const line = `<p class="score-line">연구 실적 <b>${U.fmtNum(c.score)}</b> / 취업 커트라인 ${U.fmtNum(c.required)}</p>`;
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
            <h2>실적 부족…</h2>${line}
            <p>취업에 실패해 <b>박사 과정</b>에 강제 진학합니다.<br>박사 과정에는 시간 제한이 없습니다. 버틸 수 있을 만큼 버티세요.</p>
            <div class="actions"><button class="btn danger" data-act="phd">박사 과정 시작…</button></div>
          </div>`;
      const layer = this.mount('modal', html);
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
      const ps = game.passives.map((p) => `<span class="chip">${iconHTML(p.def.icon, 'sm')} ${esc(p.def.name)} Lv${p.level}</span>`).join('') || '<span class="muted">패시브 없음</span>';
      const s = game.stats;
      const layer = this.mount('modal', `
        <div class="panel">
          <h2>일시정지</h2>
          <p class="sub">${esc(game.chapterLabel().title)} · 연구 실적 ${U.fmtNum(game.score)} · Lv ${game.player.level}</p>
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
        ['총 플레이 시간', U.fmtTime(res.time)], ['도달 단계', res.stage], ['레벨', 'Lv ' + res.level],
        ['처치', U.fmtNum(res.kills)], ['연구 실적', U.fmtNum(res.score) + (newBest ? ' 🏆' : '')], ['받은 피해', U.fmtNum(res.damageTaken)],
      ].map(([k, v]) => `<div class="stat"><span>${k}</span><b>${esc(v)}</b></div>`).join('');
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
          <div class="actions">
            <button class="btn primary" data-act="retry">다시 하기</button>
            <button class="btn" data-act="change">무기 바꿔 시작</button>
            <button class="btn ghost" data-act="title">타이틀로</button>
          </div>
        </div>`);
      this.bind(layer, cb);
      this.keyHandler = (e) => {
        if (!e.repeat && e.code === 'Enter' && this.ready(700)) { cb.retry(); return true; }
        return MOVE_KEYS.includes(e.code);
      };
    }
  }

  GS.UI = UI;
})(window.GS = window.GS || {});
