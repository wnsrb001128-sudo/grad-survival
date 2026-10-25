// 소개 영상 내보내기 (개발용 도구, 게임에는 포함되지 않음)
// js/intro.js 의 기본 소개 영상을 한 장씩 그려 MP4(H.264, 1280×720, 30fps)로 저장한다. 크롬·엣지에서 열 것
// 영상 내용은 js/intro.js 의 SCENES 에서 고친다. 만든 파일을 media/intro.mp4 로 넣으면 게임에서는 그 파일이 재생된다
(function (GS) {
  'use strict';
  const W = 1280, H = 720, FPS = 30, BITRATE = 4000000;
  const RR = GS.R;
  const canvas = document.getElementById('game');
  const R = new GS.Renderer(canvas);
  // 영상은 창 크기와 상관없이 1280×720 고정
  R.resize = function () {
    this.dpr = 1;
    this.cssW = W;
    this.cssH = H;
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = '';
    canvas.style.height = '';
    this.zoom = 1;
    this.viewW = W;
    this.viewH = H;
    this.ui = 1;
    if (this.res !== 2) { this.res = 2; this.cache.clear(); }
  };
  R.resize();

  async function fonts() {
    const title = GS.Intro.texts(); // 영상에 나오는 모든 글자의 웹 글꼴을 미리 불러온다
    await Promise.all([
      document.fonts.load('40px "Black Han Sans"', title),
      ...[600, 700, 800, 900].map((w) => document.fonts.load(`${w} 26px "Pretendard"`, title)),
    ]).catch(() => {});
    document.fonts.forEach((f) => { if (f.family.replace(/["']/g, '') === 'Black Han Sans' && f.status === 'loaded') RR.hasDisplay = true; });
    R.cache.clear();
  }

  let busy = false;
  async function preview() {
    if (busy) return;
    busy = true;
    await fonts();
    const d = GS.Intro.create(R);
    setStatus('미리보기 재생 중');
    let last = performance.now();
    d.update(0);
    await new Promise((done) => {
      const step = (now) => {
        d.update(Math.min(0.05, (now - last) / 1000));
        last = now;
        bar.style.width = ((d.time / d.total) * 100).toFixed(1) + '%';
        if (d.finished) done();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    busy = false;
    setStatus(`미리보기 끝 (${d.total.toFixed(1)}초)`);
  }

  // 화면을 한 장씩 그려 H.264 로 압축 → MP4 파일(Blob)
  async function make(onProgress) {
    if (typeof VideoEncoder === 'undefined') throw new Error('이 브라우저는 영상 만들기를 지원하지 않아요. 크롬이나 엣지에서 열어 주세요.');
    await fonts();
    const d = GS.Intro.create(R);
    const chunks = [];
    let desc = null, failed = null;
    const enc = new VideoEncoder({
      output(chunk, meta) {
        if (meta && meta.decoderConfig && meta.decoderConfig.description) desc = new Uint8Array(meta.decoderConfig.description);
        const data = new Uint8Array(chunk.byteLength);
        chunk.copyTo(data);
        chunks.push({ data, key: chunk.type === 'key' });
      },
      error(e) { failed = e; },
    });
    let config = null;
    for (const codec of ['avc1.640028', 'avc1.4d0028', 'avc1.42001f']) {
      const c = { codec, width: W, height: H, bitrate: BITRATE, framerate: FPS, avc: { format: 'avc' } };
      if ((await VideoEncoder.isConfigSupported(c)).supported) { config = c; break; }
    }
    if (!config) throw new Error('이 브라우저는 H.264 영상을 만들 수 없어요. 크롬이나 엣지에서 열어 주세요.');
    enc.configure(config);
    const total = Math.round(d.total * FPS);
    for (let i = 0; i < total; i++) {
      d.update(i ? 1 / FPS : 0);
      const vf = new VideoFrame(canvas, { timestamp: Math.round((i * 1e6) / FPS), duration: Math.round(1e6 / FPS) });
      enc.encode(vf, { keyFrame: i % (FPS * 2) === 0 });
      vf.close();
      while (enc.encodeQueueSize > 4) await new Promise((r) => enc.addEventListener('dequeue', r, { once: true }));
      if (failed) throw failed;
      if (onProgress) onProgress((i + 1) / total);
    }
    await enc.flush();
    enc.close();
    if (failed) throw failed;
    return muxMp4(chunks, desc);
  }

  // ───────── MP4 파일 만들기 (H.264 영상 트랙 하나, 재생 정보 moov 를 앞에 둔다) ─────────
  function muxMp4(chunks, avcC) {
    const n = chunks.length, timescale = FPS * 1000, delta = 1000, dur = n * delta;
    const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    const u16 = (v) => [(v >>> 8) & 255, v & 255];
    const str = (s) => Array.from(s, (c) => c.charCodeAt(0));
    const zeros = (k) => new Array(k).fill(0);
    const bytes = (arr) => new Uint8Array(arr);
    function box(type, ...parts) {
      let size = 8;
      for (const p of parts) size += p.length;
      const out = new Uint8Array(size);
      out.set(u32(size), 0);
      out.set(str(type), 4);
      let o = 8;
      for (const p of parts) { out.set(p, o); o += p.length; }
      return out;
    }
    const full = (type, ver, flags, ...parts) => box(type, bytes([ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255]), ...parts);
    const matrix = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000].flatMap(u32);
    const keys = [];
    chunks.forEach((c, i) => { if (c.key) keys.push(i + 1); });
    let dataSize = 0;
    for (const c of chunks) dataSize += c.data.length;
    const ftyp = box('ftyp', bytes([...str('isom'), ...u32(512), ...str('isom'), ...str('iso2'), ...str('avc1'), ...str('mp41')]));
    const moovFor = (offset) => box('moov',
      full('mvhd', 0, 0, bytes([...u32(0), ...u32(0), ...u32(timescale), ...u32(dur), ...u32(0x00010000), ...u16(0x0100), ...u16(0), ...zeros(8), ...matrix, ...zeros(24), ...u32(2)])),
      box('trak',
        full('tkhd', 0, 3, bytes([...u32(0), ...u32(0), ...u32(1), ...u32(0), ...u32(dur), ...zeros(8), ...u16(0), ...u16(0), ...u16(0), ...u16(0), ...matrix, ...u32(W * 65536), ...u32(H * 65536)])),
        box('mdia',
          full('mdhd', 0, 0, bytes([...u32(0), ...u32(0), ...u32(timescale), ...u32(dur), ...u16(0x55c4), ...u16(0)])),
          full('hdlr', 0, 0, bytes([...u32(0), ...str('vide'), ...zeros(12), ...str('VideoHandler'), 0])),
          box('minf',
            full('vmhd', 0, 1, bytes(zeros(8))),
            box('dinf', full('dref', 0, 0, bytes(u32(1)), full('url ', 0, 1))),
            box('stbl',
              full('stsd', 0, 0, bytes(u32(1)), box('avc1',
                bytes([...zeros(6), ...u16(1), ...zeros(16), ...u16(W), ...u16(H), ...u32(0x00480000), ...u32(0x00480000), ...u32(0), ...u16(1), ...zeros(32), ...u16(0x0018), ...u16(0xffff)]),
                box('avcC', avcC))),
              full('stts', 0, 0, bytes([...u32(1), ...u32(n), ...u32(delta)])),
              full('stss', 0, 0, bytes([...u32(keys.length), ...keys.flatMap(u32)])),
              full('stsc', 0, 0, bytes([...u32(1), ...u32(1), ...u32(n), ...u32(1)])),
              full('stsz', 0, 0, bytes([...u32(0), ...u32(n), ...chunks.flatMap((c) => u32(c.data.length))])),
              full('stco', 0, 0, bytes([...u32(1), ...u32(offset)])))))));
    const moov = moovFor(ftyp.length + moovFor(0).length + 8); // 영상 데이터는 ftyp + moov + mdat 머리 뒤에서 시작
    const mdatHead = bytes([...u32(8 + dataSize), ...str('mdat')]);
    return new Blob([ftyp, moov, mdatHead, ...chunks.map((c) => c.data)], { type: 'video/mp4' });
  }

  // ───────── 화면 버튼 ─────────
  const status = document.getElementById('status'), bar = document.getElementById('bar'), dl = document.getElementById('dl');
  function setStatus(s) { status.textContent = s; }
  document.getElementById('preview').onclick = preview;
  document.getElementById('make').onclick = async () => {
    if (busy) return;
    busy = true;
    try {
      setStatus('영상 만드는 중…');
      const blob = await make((k) => { bar.style.width = (k * 100).toFixed(1) + '%'; });
      if (dl.href) URL.revokeObjectURL(dl.href);
      dl.href = URL.createObjectURL(blob);
      dl.hidden = false;
      setStatus(`완성: ${(blob.size / 1024 / 1024).toFixed(2)}MB. 내려받은 파일을 media/intro.mp4 로 넣으면 게임에서 이 영상이 재생돼요`);
    } catch (e) {
      setStatus('실패: ' + e.message);
    }
    busy = false;
  };
  window.IntroMaker = { preview, make };
})(window.GS = window.GS || {});
