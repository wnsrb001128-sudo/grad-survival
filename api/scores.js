// 온라인 기록판 API (Vercel 서버리스 함수)
//   GET  /api/scores  → { score: [...], phd: [...] }  최고 연구 실적 · 박사 최장 생존 TOP 10
//   POST /api/scores  { name, score, phdTime, char, result, level } → 기록 등록 후 { score, phd, rank }
// 저장소: Vercel 프로젝트에 연결한 Upstash Redis (Storage 탭). 연결하면 아래 환경 변수가 자동으로 생긴다.
// 비밀 토큰은 서버(이 파일)에서만 쓰고 브라우저에는 보내지 않는다.
// 연결할 때 접두사를 붙였어도 찾는다 (예: STORAGE_KV_REST_API_URL). 접두사 없는 이름이 먼저.
function findDb() {
  const env = process.env, keys = Object.keys(env).sort((a, b) => a.length - b.length);
  for (const [u, t] of [['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'], ['KV_REST_API_URL', 'KV_REST_API_TOKEN']]) {
    for (const k of keys) {
      if (k !== u && !k.endsWith('_' + u)) continue;
      const tk = k.slice(0, k.length - u.length) + t;
      if (env[k] && env[tk]) return [env[k], env[tk]];
    }
  }
  return ['', ''];
}
const [DB_URL, DB_TOKEN] = findDb();

const BOARDS = { score: 'gs:lb:score', phd: 'gs:lb:phd' };
const SHOW = 10;   // 보여 줄 순위
const KEEP = 100;  // 저장해 두는 기록 수 (넘치면 낮은 기록부터 지운다)
const RATE = 8;    // 같은 IP 에서 1분에 올릴 수 있는 횟수

// Upstash REST API: 여러 명령을 한 번에 보낸다
async function redis(cmds) {
  const r = await fetch(DB_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + DB_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  const out = await r.json();
  return out.map((x) => {
    if (x && x.error) throw new Error(x.error);
    return x ? x.result : null;
  });
}

// [멤버, 점수, 멤버, 점수 …] → [{ ...기록, v: 점수 }]
function parse(arr) {
  const out = [];
  for (let i = 0; arr && i + 1 < arr.length; i += 2) {
    try { out.push(Object.assign(JSON.parse(arr[i]), { v: Number(arr[i + 1]) })); } catch (e) { /* 깨진 항목은 건너뛴다 */ }
  }
  return out;
}

async function top() {
  const [a, b] = await redis([
    ['ZREVRANGE', BOARDS.score, 0, SHOW - 1, 'WITHSCORES'],
    ['ZREVRANGE', BOARDS.phd, 0, SHOW - 1, 'WITHSCORES'],
  ]);
  return { score: parse(a), phd: parse(b) };
}

// 닉네임: 제어 문자·꺾쇠 제거, 앞뒤 공백 정리, 최대 12자
function cleanName(s) {
  return Array.from(String(s || '').replace(/[\u0000-\u001f\u007f<>]/g, '').trim()).slice(0, 12).join('');
}

function num(v, min, max) {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!DB_URL || !DB_TOKEN) { res.status(503).json({ error: 'not_configured' }); return; }
  try {
    if (req.method === 'GET') { res.status(200).json(await top()); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'method' }); return; }

    let b = req.body;
    if (typeof b === 'string') { try { b = JSON.parse(b); } catch (e) { b = null; } }
    if (!b || typeof b !== 'object') { res.status(400).json({ error: 'bad_body' }); return; }
    const name = cleanName(b.name);
    const score = num(b.score, 0, 5000000), phd = num(b.phdTime || 0, 0, 36000), level = num(b.level || 1, 1, 999);
    if (!name) { res.status(400).json({ error: 'no_name' }); return; }
    if (score === null || phd === null || level === null) { res.status(400).json({ error: 'bad_value' }); return; }

    // 같은 IP 에서 너무 자주 올리면 잠깐 막는다
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';
    const [count] = await redis([['INCR', 'gs:rl:' + ip], ['EXPIRE', 'gs:rl:' + ip, 60]]);
    if (count > RATE) { res.status(429).json({ error: 'too_many' }); return; }

    const entry = JSON.stringify({
      n: name,
      c: b.char === 'wet' ? 'wet' : 'dry',
      r: b.result === 'job' ? 'job' : b.result === 'phd' ? 'phd' : 'out',
      lv: level,
      t: Date.now(),
      id: Math.random().toString(36).slice(2, 8),
    });
    const cmds = [['ZADD', BOARDS.score, score, entry], ['ZREMRANGEBYRANK', BOARDS.score, 0, -(KEEP + 1)], ['ZREVRANK', BOARDS.score, entry]];
    if (phd > 0) cmds.push(['ZADD', BOARDS.phd, phd, entry], ['ZREMRANGEBYRANK', BOARDS.phd, 0, -(KEEP + 1)]);
    const out = await redis(cmds);
    const rank = out[2];
    res.status(200).json(Object.assign(await top(), { rank: rank === null || rank === undefined ? null : rank + 1 }));
  } catch (e) {
    res.status(500).json({ error: 'server' });
  }
};
