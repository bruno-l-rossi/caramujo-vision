/* Smoke test da v2: carrega audio.js, modules.js, fx.js e app.js com um navegador de
   mentira, roda cada visual em todos os temas e tamanhos, confere o motor de áudio,
   o layout em linhas, os presets, a migração da v1 e as guardas de decisão.
   Uso: node test/smoke.js .   (ou npm test) */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = path.resolve(process.argv[2] || path.join(__dirname, '..'));

let fail = 0, okN = 0;
function check(name, cond, extra) {
  if (cond) { okN++; console.log('  ok: ' + name + (extra ? ' (' + extra + ')' : '')); return; }
  fail++; console.error('  FALHOU: ' + name + (extra ? ' (' + extra + ')' : ''));
}

/* ================= navegador de mentira ================= */
function noopCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return t._canvas;
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'createPattern') return () => ({ setTransform() {} });
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'putImageData' || k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (k === 'measureText') return (s) => ({ width: String(s || '').length * 6 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
function classList() {
  const s = new Set();
  return {
    add(...a) { a.forEach((x) => s.add(x)); }, remove(...a) { a.forEach((x) => s.delete(x)); },
    contains(x) { return s.has(x); },
    toggle(x, f) { const on = f === undefined ? !s.has(x) : !!f; on ? s.add(x) : s.delete(x); return on; }
  };
}
let elId = 0;
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), id: 'el' + (elId++), children: [], parentNode: null,
    style: { setProperty() {}, removeProperty() {} }, dataset: {}, classList: classList(), attributes: {},
    value: '', innerHTML: '', textContent: '', className: '', title: '', type: '',
    width: 300, height: 200, scrollHeight: 120, offsetWidth: 200, offsetHeight: 120, options: [], selectedIndex: 0,
    addEventListener() {}, removeEventListener() {},
    setAttribute(k, v) { this.attributes[k] = String(v); }, getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this.attributes[k]; },
    appendChild(c) { this.children.push(c); c.parentNode = this; return c; },
    removeChild(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); c.parentNode = null; return c; },
    get firstChild() { return this.children[0] || null; },
    insertBefore(c) { this.children.push(c); c.parentNode = this; return c; },
    contains(x) { return x === this; }, closest() { return null; },
    querySelector(sel) { const e = makeEl(sel.replace(/[.#[\]=]/g, '')); return e; },
    querySelectorAll() { return []; },
    getBoundingClientRect() { return { left: 0, top: 0, right: 300, bottom: 200, width: 300, height: 200 }; },
    getContext(kind) { if (kind === '2d') { const c = noopCtx(); c._canvas = el; return c; } return null; },
    captureStream() { return { addTrack() {}, getTracks() { return []; } }; },
    focus() {}, select() {}, blur() {}, click() {}, requestFullscreen() {}
  };
  return el;
}
const g = globalThis;
g.window = g;
const winListeners = {};
g.addEventListener = (ev, fn) => { (winListeners[ev] = winListeners[ev] || []).push(fn); };
g.removeEventListener = () => {};
const byId = {};
g.document = {
  createElement: makeEl,
  getElementById: (id) => byId[id] || (byId[id] = Object.assign(makeEl('div'), { id })),
  querySelectorAll: () => [],
  documentElement: makeEl('html'),
  body: makeEl('body')
};
Object.defineProperty(g, 'navigator', { value: { mediaDevices: { enumerateDevices: async () => [], getUserMedia: async () => { throw new Error('no'); } } }, configurable: true });
const store = {};
g.localStorage = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: (k) => { delete store[k]; }, clear: () => { Object.keys(store).forEach((k) => delete store[k]); } };
g.ResizeObserver = class { observe() {} disconnect() {} };
g.performance = { now: () => Date.now() };
let rafQ = [];
g.requestAnimationFrame = (fn) => { rafQ.push(fn); return rafQ.length; };
g.cancelAnimationFrame = () => {};
g.confirm = () => false;
g.location = { reload() {} };
g.Audio = class { constructor() { this.paused = false; } addEventListener() {} removeEventListener() {} play() { return Promise.reject(new Error('sem arquivo')); } pause() { this.paused = true; } };
g.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
g.MediaRecorder = class { static isTypeSupported() { return false; } start() {} stop() {} };
g.devicePixelRatio = 1;
g.innerWidth = 1400; g.innerHeight = 900;
g.setTimeout = (fn) => { try { fn(); } catch (e) { console.error('timeout:', e.message); } return 0; };
g.clearTimeout = () => {};
g.AudioContext = class {
  constructor() { this.sampleRate = 44100; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() {}
  createAnalyser() {
    return { fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0, connect() {}, disconnect() {},
      getByteFrequencyData(a) { for (let i = 0; i < a.length; i++) a[i] = (Math.sin(i * 0.1) * 0.5 + 0.5) * 200; },
      getFloatTimeDomainData(a) { for (let i = 0; i < a.length; i++) a[i] = Math.sin(i * 0.05) * 0.5; } };
  }
  createGain() { return { gain: { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
  createChannelSplitter() { return { connect() {}, disconnect() {} }; }
  createMediaStreamDestination() { return { stream: { getAudioTracks: () => [] } }; }
  createOscillator() { return { type: '', frequency: { value: 0, setValueAtTime() {}, exponentialRampToValueAtTime() {}, setTargetAtTime() {} }, connect() {}, start() {}, stop() {}, disconnect() {} }; }
  createBiquadFilter() { return { type: '', Q: { value: 0 }, frequency: { value: 0, setValueAtTime() {}, setTargetAtTime() {} }, connect() {}, disconnect() {} }; }
  createBuffer(ch, len) { return { getChannelData: () => new Float32Array(len) }; }
  createBufferSource() { return { buffer: null, connect() {}, start() {}, stop() {}, disconnect() {} }; }
  createStereoPanner() { return { pan: { value: 0 }, connect() {}, disconnect() {} }; }
  createMediaStreamSource() { return { connect() {}, disconnect() {} }; }
  createMediaElementSource() { return { connect() {}, disconnect() {} }; }
};
g.setInterval = () => 0; g.clearInterval = () => {};

/* ================= carrega os arquivos ================= */
const SRC = {};
for (const f of ['js/audio.js', 'js/modules.js', 'js/fx.js', 'js/app.js']) {
  SRC[f] = fs.readFileSync(path.join(BASE, f), 'utf8');
  try { new Function(SRC[f])(); } catch (e) { console.error('FALHA ao carregar ' + f + ': ' + e.stack); process.exit(1); }
  console.log('carregou ' + f);
}
const srcApp = SRC['js/app.js'], srcMods = SRC['js/modules.js'], srcFx = SRC['js/fx.js'], srcAud = SRC['js/audio.js'];
const srcCss = fs.readFileSync(path.join(BASE, 'css/style.css'), 'utf8');
const srcHtml = fs.readFileSync(path.join(BASE, 'index.html'), 'utf8');
const srcMain = fs.readFileSync(path.join(BASE, 'electron/main.js'), 'utf8');
const CV = g.CV, A = g.CVAPP, FX = g.FX;

/* ================= motor ================= */
console.log('motor:');
const engine = g.engine;
engine.ensureCtx();
engine.startSynth();
check('sintetizador de teste liga', engine.sourceKind === 'synth');
engine.togglePlay(); engine.togglePlay();
for (let i = 0; i < 60; i++) engine.update(0.016);
check('motor roda com a rede de segurança (AnalyserNode)', engine.hasSignal() && engine.rms > 0, 'rms=' + engine.rms.toFixed(3));
{
  const E = new g.AudioEngine();
  E.sourceKind = 'system'; E.nativeOn = true; E.sr = 48000; E.binHz = 24000 / 512;
  E.setupLufs(48000); E.setupBeat();
  const sr = 48000, chunk = 800, spb = sr * 60 / 135;
  let beats = 0;
  for (let off = 0; off < sr * 6; off += chunk) {
    const l = new Float32Array(chunk), r = new Float32Array(chunk);
    for (let i = 0; i < chunk; i++) {
      const ph = (off + i) % spb;
      const v = Math.sin(2 * Math.PI * 55 * ph / sr) * Math.exp(-ph / sr * 9) * 0.7 + Math.sin(2 * Math.PI * 1000 * (off + i) / sr) * 0.1;
      l[i] = v; r[i] = v * 0.9;
    }
    E.feed(l, r, chunk); E.update(chunk / sr);
    if (E.beat) beats++;
  }
  check('anel recebeu as amostras', E.wr === sr * 6, E.wr + ' amostras');
  check('espectro em dBFS de verdade', E.freqDb[21] > -60 && E.freqDb[21] < 6, '1kHz = ' + E.freqDb[21].toFixed(1) + ' dBFS');
  check('binHz certo pra 48kHz', Math.abs(E.binHz - 46.875) < 0.01, E.binHz.toFixed(3) + ' Hz');
  check('LUFS na faixa de música real', E.lufsM > -30 && E.lufsM < 0, 'M=' + E.lufsM.toFixed(1) + ' S=' + E.lufsS.toFixed(1) + ' I=' + E.lufsI.toFixed(1));
  check('beat acha os kicks (135 BPM em 6s = 13)', beats >= 11 && beats <= 15, beats + ' detectados');
  check('latência medida e baixa', E.latencyMs > 0 && E.latencyMs < 25, E.latencyMs.toFixed(1) + ' ms');
  for (let off = 0; off < sr; off += chunk) { E.feed(new Float32Array(chunk), new Float32Array(chunk), chunk); E.update(chunk / sr); }
  check('silêncio zera o nível', E.rms < 0.001 && E.level < 0.01, 'rms=' + E.rms.toFixed(5));
  [1024, 4096, 16384].forEach((n) => {
    const buf = new Float32Array(9600);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.sin(2 * Math.PI * 220 * i / 48000) * 0.4;
    E.feed(buf, buf, buf.length, true);       // como o SAB: chega junto do quadro
    E.update(buf.length / 48000);             // o espectro lê onde a cabeça do quadro está
    const db = E.spectrum(n), bin = Math.round(220 / E.specBinHz);
    check('espectro FFT ' + n + ' acha o tom de 220Hz', db.length === n / 2 && db[bin] > -30, db[bin].toFixed(1) + ' dBFS');
  });
}
{
  /* O BUG DO SAB: com o tap no SharedArrayBuffer o hasRing só virava true dentro
     do update(), que o app só chama quando hasSignal() já é true. Tela preta. */
  const E = new g.AudioEngine();
  E.sourceKind = 'system'; E.sab = { ctl: new Int32Array(2), l: new Float32Array(8), r: new Float32Array(8) };
  check('o caminho do SharedArrayBuffer conta como sinal (era tela preta no loopback)', E.hasSignal() === true);
}

/* ================= v2.4: cabeça de leitura ================= */
console.log('cabeça de leitura (tempo real):');
{
  /* A captura do sistema chega em blocos (ScreenCaptureKit: ~1.024 amostras, 21 ms).
     Simula 2 s com relógio de mentira: blocos com tremida de até 3 ms, tela a 120 Hz. */
  const sr = 48000, perf = g.performance, nowOrig = perf.now;
  const simula = (fluidez, B, jitMs, fps) => {
    const E = new g.AudioEngine();
    E.sourceKind = 'system'; E.nativeOn = true; E.sr = sr; E.setupLufs(sr); E.setupBeat(); E.fluidez = fluidez;
    let sim = 0, sement = 7, nS = 0, arr = B / sr + 0.002;
    const rnd = () => { sement = (sement * 1103515245 + 12345) & 0x7fffffff; return sement / 0x7fffffff; };
    const bloco = new Float32Array(B), advs = [];
    perf.now = () => sim * 1000;
    try {
      for (let f = 0; f < fps * 2; f++) {
        const tf = f / fps;
        while (arr <= tf) {
          for (let i = 0; i < B; i++) bloco[i] = 0.3 * Math.sin(2 * Math.PI * 110 * (nS + i) / sr);
          sim = arr; E.feed(bloco, bloco, B); nS += B;
          arr = Math.max(arr + 0.0005, (nS + B) / sr + 0.002 + rnd() * jitMs / 1000);
        }
        sim = tf; E.update(1 / fps);
        if (tf >= 0.5) advs.push(E.adv);
      }
    } finally { perf.now = nowOrig; }
    const media = advs.reduce((a, b) => a + b, 0) / advs.length;
    const desvio = Math.sqrt(advs.reduce((a, b) => a + (b - media) * (b - media), 0) / advs.length);
    return { E, advs, media, desvio, zeros: advs.filter((a) => a === 0).length };
  };
  const im = simula('imediata', 1024, 3, 120), su = simula('suave', 1024, 3, 120), pq = simula('suave', 128, 0.5, 120);
  check('modo imediato com blocos de 21 ms: a maioria dos quadros a 120 Hz fica sem som novo (era o tranco)',
    im.zeros / im.advs.length > 0.45, Math.round(im.zeros / im.advs.length * 100) + '% dos quadros parados');
  check('modo suave: todo quadro anda o mesmo tanto de som (400 amostras a 120 Hz, sem parar nem pular)',
    su.zeros === 0 && Math.abs(su.media - 400) < 8 && su.desvio < 12, 'média ' + su.media.toFixed(0) + ' · desvio ' + su.desvio.toFixed(1));
  check('o recuo da cabeça se ajusta ao bloco: ~1 bloco + tremida (21 ms + 3 ms)',
    su.E.lagMs > 20 && su.E.lagMs < 28 && su.E.underruns <= 4, su.E.lagMs.toFixed(1) + ' ms · ' + su.E.underruns + ' quadros sem som');
  check('bloco pequeno (128 amostras) quase não atrasa nada: recuo abaixo de 5 ms', pq.E.lagMs < 5, pq.E.lagMs.toFixed(1) + ' ms');
  // o caminho do SAB é drenado no próprio quadro: lê no fim, recuo zero
  const Es = new g.AudioEngine(); Es.sourceKind = 'system'; Es.sr = sr;
  for (let q = 0; q < 30; q++) { Es.feed(new Float32Array(400), new Float32Array(400), 400, true); Es.update(1 / 120); }
  check('fonte que chega junto do quadro lê no fim (sem recuo)', Es.pos === Es.wr && Es.lagMs < 0.5, 'pos ' + Es.pos + ' de ' + Es.wr);
  // estéreo de verdade ou mono: o ajuste mostra o que chegou
  const Ee = new g.AudioEngine(); Ee.sourceKind = 'system'; Ee.sr = sr;
  const l = new Float32Array(800), r = new Float32Array(800);
  for (let q = 0; q < 90; q++) { for (let i = 0; i < 800; i++) { l[i] = 0.3 * Math.sin(i * 0.05); r[i] = q < 45 ? l[i] : 0.3 * Math.sin(i * 0.07); } Ee.feed(l, r, 800, true); Ee.update(1 / 60); if (q === 44) Ee._mono = Ee.estereo; }
  check('mede se o caminho é estéreo de verdade (mono = L igual a R)', Ee._mono === false && Ee.estereo === true, 'mono → ' + Ee._mono + ' · estéreo → ' + Ee.estereo);
  // o rastro apaga no relógio: 2 quadros de 120 Hz tiram o mesmo que 1 de 60
  const a60 = g.CV.trailClear(0.62), um120 = 1 - Math.pow(1 - a60, 0.5);
  check('rastro apaga no relógio, não no quadro (2 quadros a 120 Hz = 1 a 60 Hz)', Math.abs((1 - (1 - um120) * (1 - um120)) - a60) < 1e-9, 'fatia a 60: ' + a60.toFixed(3) + ' · a 120: ' + um120.toFixed(3));
}

/* ================= cada visual, em todo tema e tamanho ================= */
console.log('visuais:');
const THEME_IDS = A.themes.map((t) => t[0]);
for (const id of Object.keys(CV.registry)) {
  const def = CV.registry[id];
  const canvas = makeEl('canvas');
  const m = { canvas, ctx: canvas.getContext('2d'), w: 300, h: 200, dpr: 1, st: {}, modId: id, s: Object.assign({}, def.defaults) };
  try {
    def.init(m);
    for (let i = 0; i < 40; i++) { engine.update(0.016); def.draw(m, engine, 0.016, i * 0.016); }
    def.draw(m, null, 0.016, 1);
    m.mouse = { x: 150, y: 100, over: true }; def.draw(m, engine, 0.016, 2); m.mouse.over = false;
    for (const th of THEME_IDS) { CV.theme = th; def.draw(m, engine, 0.016, 3); }
    CV.theme = 'minimeters';
    (def.schema || []).forEach((f) => {
      if (f.type === 'seg' || f.type === 'select') f.opts.forEach((o) => { m.s[f.k] = o[0]; def.draw(m, engine, 0.016, 3.5); });
    });
    m.s = Object.assign({}, def.defaults);
    for (const tam of [[1920, 1080], [64, 400], [400, 60], [1440, 150], [300, 900]]) {
      m.w = tam[0]; m.h = tam[1]; canvas.width = tam[0]; canvas.height = tam[1];
      for (let i = 0; i < 3; i++) { engine.update(0.016); def.draw(m, engine, 0.016, 4 + i * 0.016); }
    }
    okN++; console.log('  ok: ' + id + ' (' + def.name + ')');
  } catch (e) { fail++; console.error('  FALHOU: ' + id + ' -> ' + e.stack.split('\n').slice(0, 3).join(' | ')); }
}
{
  const ruins = [];
  Object.keys(CV.registry).forEach((id) => {
    const d = CV.registry[id];
    if (!d.name || !d.group || !d.desc) ruins.push(id + ' sem nome/grupo/descrição');
    (d.schema || []).forEach((f) => {
      if (!f.k || !f.label) ruins.push(id + '.' + f.k + ' sem rótulo');
      if (f.type === 'seg' || f.type === 'select') { if (!Array.isArray(f.opts) || !f.opts.length) ruins.push(id + '.' + f.k + ' sem opções'); }
      else if (f.type !== 'text' && (f.min === undefined || f.max === undefined)) ruins.push(id + '.' + f.k + ' sem faixa');
      if (d.defaults[f.k] === undefined) ruins.push(id + '.' + f.k + ' sem padrão');
    });
  });
  check('todo controle tem rótulo, opções ou faixa, e padrão', ruins.length === 0, ruins.slice(0, 3).join(' | ') || 'ok');
}
check('17 visuais: os 7 medidores do MiniMeters e as 10 artes', Object.keys(CV.registry).length === 17 &&
  Object.keys(CV.registry).filter((id) => CV.registry[id].group === 'Estúdio').length === 7, Object.keys(CV.registry).join(','));
{
  // VU calibrado: um seno com pico na referência padrão lê 0 VU
  const def = CV.registry.vu, cv = makeEl('canvas');
  const m = { canvas: cv, ctx: cv.getContext('2d'), w: 400, h: 200, dpr: 1, st: {}, modId: 'vu', s: Object.assign({}, def.defaults) };
  def.init(m);
  const ref = def.defaults.ref, amp = Math.pow(10, ref / 20), L = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) L[i] = Math.sin(2 * Math.PI * 1000 * i / 48000) * amp;
  const d = { timeL: L, timeR: L, sr: 48000 };
  for (let i = 0; i < 200; i++) def.draw(m, d, 0.016, i * 0.016);
  const alvo = 1 / 1.4125;
  check('VU: seno com pico em ' + ref + ' dBFS lê 0 VU (ponteiro a 71% do arco)', Math.abs(m.st.p[0] - alvo) < 0.03, (m.st.p[0] * 100).toFixed(1) + '%');
  m.s.estilo = 'barra'; def.draw(m, d, 0.016, 5);
  check('VU tem os dois estilos e a referência de mix', def.schema[0].opts.length === 2 && def.schema[1].opts.some((o) => o[0] === -18));
}

/* ================= v2.2 · reação ao som ================= */
console.log('reação ao som:');
{
  /* beat sintético de rap a 90 BPM: kick (55Hz que cai em 120ms) + 808 segurando (45Hz,
     400ms) + chimbal (ruído curto). O mesmo beat em dois volumes: cheio e -12 dB. */
  const sr = 48000, chunk = 800, spb = Math.round(sr * 60 / 90);
  let semente = 7;
  const rnd = () => { semente = (semente * 16807) % 2147483647; return semente / 2147483647 - 0.5; };
  const beat = (n, ganho) => {
    const l = new Float32Array(n), r = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const ph = i % spb, t = ph / sr, hat = (i % (spb / 2)) / sr;
      const kick = Math.sin(2 * Math.PI * 55 * t) * Math.exp(-t / 0.12) * 0.75;
      const b808 = t < 0.4 ? Math.sin(2 * Math.PI * 45 * t) * 0.35 * (1 - t / 0.4) : 0;
      const ch = rnd() * Math.exp(-hat / 0.02) * 0.12;
      l[i] = (kick + b808 + ch) * ganho; r[i] = (kick + b808 - ch * 0.6) * ganho;
    }
    return [l, r];
  };
  const roda = (ganho, seg) => {
    const E = new g.AudioEngine();
    E.sourceKind = 'system'; E.nativeOn = true; E.sr = sr; E.setupLufs(sr); E.setupBeat();
    const [L, R] = beat(Math.round(sr * seg), ganho), serie = [];
    for (let off = 0; off + chunk <= L.length; off += chunk) {
      E.feed(L.subarray(off, off + chunk), R.subarray(off, off + chunk), chunk);
      E.update(chunk / sr);
      serie.push({ t: off / sr, ph: (off % spb) / sr, grave: E.grave, soco: E.soco, bass: E.bass, energia: E.energia, ondaRef: E.ondaRef, ondaVivo: E.ondaVivo });
    }
    return { E, serie: serie.filter((s) => s.t > 2) };
  };
  const cheio = roda(1, 6), baixo = roda(0.25, 6);
  const noKick = (s) => s.ph < 0.06, noVale = (s) => s.ph > 0.5;
  const media = (a, k) => a.reduce((x, s) => x + s[k], 0) / Math.max(1, a.length);
  const gK = media(cheio.serie.filter(noKick), 'grave'), gV = media(cheio.serie.filter(noVale), 'grave');
  check('o grave novo encosta no 1 no kick e desce no vale', gK > 0.85 && gV < 0.3, 'kick ' + gK.toFixed(2) + ' · vale ' + gV.toFixed(2));
  const bK = media(cheio.serie.filter(noKick), 'bass'), bV = media(cheio.serie.filter(noVale), 'bass');
  check('o d.bass antigo fica perto do talo nos dois (era o visual parado)', bK - bV < gK - gV, 'bass kick ' + bK.toFixed(2) + ' · vale ' + bV.toFixed(2));
  const sK = media(cheio.serie.filter(noKick), 'soco'), sV = media(cheio.serie.filter(noVale), 'soco');
  check('o soco dispara no ataque do kick e some no sustain', sK > 0.5 && sV < 0.08, 'kick ' + sK.toFixed(2) + ' · vale ' + sV.toFixed(2));
  const dif = Math.max.apply(null, cheio.serie.map((s, i) => Math.abs(s.grave - baixo.serie[i].grave)));
  check('o grave não depende do volume (o mesmo beat a -12 dB dá o mesmo desenho)', dif < 0.08, 'maior diferença ' + dif.toFixed(3));
  const rOnda = baixo.serie[baixo.serie.length - 1].ondaRef / cheio.serie[cheio.serie.length - 1].ondaRef;
  check('a régua da forma de onda acompanha o volume (autoganho)', Math.abs(rOnda - 0.25) < 0.03, 'razão ' + rOnda.toFixed(3));

  // cada visual que mudou CRESCE no kick e ocupa boa parte do painel
  function caixaCtx() {
    const cx = { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 }, grad = { addColorStop() {} };
    const pt = (x, y) => { if (!(isFinite(x) && isFinite(y))) return; if (x < cx.x0) cx.x0 = x; if (x > cx.x1) cx.x1 = x; if (y < cx.y0) cx.y0 = y; if (y > cx.y1) cx.y1 = y; };
    const px = new Proxy({}, {
      get(t, k) {
        if (k === '_cx') return cx;
        if (k === 'canvas') return t._canvas;
        if (k in t) return t[k];
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (k === 'measureText') return (s) => ({ width: String(s || '').length * 6 });
        if (k === 'moveTo' || k === 'lineTo') return (x, y) => pt(x, y);
        if (k === 'quadraticCurveTo') return (a, b, x, y) => { pt(a, b); pt(x, y); };
        if (k === 'rect' || k === 'fillRect') return (x, y, w, h) => { if (t.globalCompositeOperation === 'destination-out') return; pt(x, y); pt(x + w, y + h); };
        if (k === 'arc') return (x, y, r) => { pt(x - r, y - r); pt(x + r, y + r); };
        if (k === 'ellipse') return (x, y, rx, ry) => { pt(x - rx, y - ry); pt(x + rx, y + ry); };
        return () => {};
      },
      set(t, k, v) { t[k] = v; return true; }
    });
    return px;
  }
  const W = 480, H = 270;
  const cresce = [];
  ['lissa', 'trace', 'flow', 'wavelayers', 'silk', 'enxame', 'cordas', 'malha', 'gonio', 'scope'].forEach((id) => {
    const def = CV.registry[id], cv = makeEl('canvas');
    cv.width = W; cv.height = H;
    const m = { canvas: cv, ctx: null, w: W, h: H, dpr: 1, st: {}, modId: id, s: Object.assign({}, def.defaults), mouse: { over: false } };
    const E = new g.AudioEngine();
    E.sourceKind = 'system'; E.nativeOn = true; E.sr = sr; E.setupLufs(sr); E.setupBeat();
    const [L, R] = beat(Math.round(sr * 5), 0.5);
    const tamK = [], tamV = [];
    m.ctx = caixaCtx(); m.ctx._canvas = cv; def.init(m);
    for (let off = 0; off + chunk <= L.length; off += chunk) {
      E.feed(L.subarray(off, off + chunk), R.subarray(off, off + chunk), chunk);
      E.update(chunk / sr);
      const ctx = caixaCtx(); ctx._canvas = cv; m.ctx = ctx;
      def.draw(m, E, chunk / sr, off / sr);
      if (off / sr < 2) continue;
      // tamanho = altura ocupada (quem já nasce de borda a borda na largura) ou o maior lado (figura que gira)
      const b = ctx._cx, fw = b.x1 > b.x0 ? Math.min(1, (b.x1 - b.x0) / W) : 0, fh = b.y1 > b.y0 ? Math.min(1, (b.y1 - b.y0) / H) : 0;
      const area = ['trace', 'wavelayers', 'gonio', 'scope', 'malha'].indexOf(id) >= 0 ? fh : Math.max(fw, fh);
      const ph = (off % spb) / sr;
      if (ph > 0.03 && ph < 0.16) tamK.push(area); else if (ph > 0.5) tamV.push(area);
    }
    const k = tamK.reduce((a, b) => a + b, 0) / tamK.length, v = tamV.reduce((a, b) => a + b, 0) / tamV.length;
    cresce.push([id, k, v]);
  });
  /* Os que têm o TAMANHO amarrado ao grave (Lissajous, Traço, Malha, Estéreo,
     Osciloscópio) têm que ser bem maiores no kick do que no vale. Fluxo, Enxame e Cordas
     já moram de borda a borda: neles o grave mexe em velocidade, estouro e vibração.
     v2.2b: Camadas e Fita entraram na conta. Na primeira v2.2 elas davam o mesmo tamanho
     no kick e no vale (Camadas 90/85, Fita 71/73 com este beat): a pilha e o rastro
     seguravam o desenho. Agora a pilha estica e a fita inteira abre no grave de agora.
     Piso no kick: este beat é mono e o kick sintético cai em 120ms, então os números
     ficam abaixo do beat demo. Medido na v2.1 com ESTE beat: Lissajous 20%, Traço 20%,
     Estéreo 27%, Osciloscópio 24%. O piso fica no dobro disso, mais ou menos. */
  const PISO = { lissa: 0.45, trace: 0.35, gonio: 0.45, scope: 0.45 };
  // a Malha é um tecido que já mora quase de borda a borda: cresce menos em proporção
  const CRESCE = { lissa: 1.3, trace: 1.3, gonio: 1.3, scope: 1.3, malha: 1.15, wavelayers: 1.12, silk: 1.12 };
  const ruins = cresce.filter(([id, k, v]) => k < (PISO[id] || 0.6) || (CRESCE[id] && !(k > v * CRESCE[id])));
  check('no kick os visuais de desenho ocupam o painel e os de tamanho crescem com o grave', ruins.length === 0,
    cresce.map(([id, k, v]) => id + ' ' + Math.round(k * 100) + '/' + Math.round(v * 100)).join(' · '));

  // ENCHER x NÍVEL REAL na Onda: com o som baixo, o Encher sobe a forma até a faixa
  const altura = (tamanho) => {
    const def = CV.registry.wavescroll, cv = makeEl('canvas'); cv.width = 400; cv.height = 200;
    const m = { canvas: cv, ctx: cv.getContext('2d'), w: 400, h: 200, dpr: 1, st: {}, modId: 'wavescroll', s: Object.assign({}, def.defaults, { tamanho }) };
    let maior = 0;
    const criar = g.document.createElement;
    g.document.createElement = (tag) => {
      const el = makeEl(tag);
      el.getContext = () => { const c = caixaCtx(); c._canvas = el; return new Proxy(c, { get(t, k) { if (k === 'fillRect') return (x, y, w, h) => { if (h > maior) maior = h; }; return t[k]; }, set(t, k, v) { t[k] = v; return true; } }); };
      return el;
    };
    try {
      def.init(m);
      const E = baixo.E;
      const [L, R] = beat(Math.round(sr * 3), 0.25);
      for (let off = 0; off + chunk <= L.length; off += chunk) { E.feed(L.subarray(off, off + chunk), R.subarray(off, off + chunk), chunk); E.update(chunk / sr); def.draw(m, E, chunk / sr, off / sr); }
    } finally { g.document.createElement = criar; }
    return maior / (m.st.buf ? m.st.buf.height / 2 : 100);
  };
  const aE = altura('encher'), aR = altura('real');
  check('Onda no Encher: com o som a -12 dB a forma sobe até perto da borda da faixa', aE > 0.8 && aE > aR * 2.5, 'encher ' + aE.toFixed(2) + ' · nível real ' + aR.toFixed(2));

  // Reação ao som: os quatro degraus, Forte = 1 e o app nasce nele
  check('Reação ao som tem Leve, Média, Forte e Máxima, e Forte vale 1', CV.REACOES.length === 4 && CV.REACOES.filter((r) => r[0] === 'forte')[0][2] === 1);
  check('o app nasce em Reação Forte', A.state.reacao === 'forte' && CV.reacao === 1);
  check('Reação estragada no estado salvo volta pra Forte', A.normalize({ v: 2, reacao: 'turbo', rows: [] }).reacao === 'forte');
  {
    const m = { s: { sens: 1 }, st: {} };
    CV.reacao = 0.45; const leve = CV.respira(m, 1, 0.5);
    CV.reacao = 1.45; const max = CV.respira(m, 0.7, 0.5);
    CV.reacao = 1;
    check('Leve segura perto do repouso, Máxima encosta no painel antes do kick cheio', leve < 0.75 && max === 1, 'leve ' + leve.toFixed(2) + ' · máxima ' + max.toFixed(2));
  }
  // os medidores de número continuam fora da Reação: nada de autoganho no Espectro, Loudness, VU e Espectrograma
  const trecho = (id) => { const a = srcMods.indexOf("CV.register('" + id + "'"), b = srcMods.indexOf('CV.register(', a + 10); return srcMods.slice(a, b < 0 ? undefined : b); };
  const vaza = ['spectrum', 'loudness', 'vu', 'spectrogram'].filter((id) => /CV\.(rx|som|respira|alvoEncher|ganhoOnda)\(|reacao/.test(trecho(id)));
  check('Espectro, Loudness, VU e Espectrograma seguem calibrados (fora da Reação)', vaza.length === 0, vaza.join(',') || 'os 4 limpos');
  const comTam = ['wavescroll', 'scope', 'gonio'].filter((id) => (CV.registry[id].schema || []).some((f) => f.k === 'tamanho' && f.opts.some((o) => o[0] === 'real')));
  check('Onda, Osciloscópio e Estéreo têm Tamanho: Encher ou Nível real', comTam.length === 3 && ['wavescroll', 'scope', 'gonio'].every((id) => CV.registry[id].defaults.tamanho === 'encher'));
}

/* ================= espectro no molde do MiniMeters (v2.3) =================
   Os números vêm do vídeo do Bruno com o sinal de teste (medicao/): grade, altura,
   tempo de subida e queda, mid/side e o formato da leitura. Se algum destes cair,
   o espectro voltou a ficar diferente do dele. */
console.log('espectro no molde do MiniMeters:');
{
  const sr = 48000, chunk = 800, def = CV.registry.spectrum;
  const ctxFalso = () => new Proxy({}, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
      if (k === 'createPattern') return () => ({ setTransform() {} });
      if (k === 'measureText') return (s) => ({ width: String(s || '').length * 6 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
  // painel do tamanho do dele no vídeo: 714 x 127 em Retina
  const novo = () => {
    const E = new g.AudioEngine();
    E.sourceKind = 'system'; E.nativeOn = true; E.sr = sr; E.setupLufs(sr); E.setupBeat();
    const cv = makeEl('canvas'); cv.width = 1428; cv.height = 254;
    const m = { canvas: cv, ctx: ctxFalso(), w: 714, h: 127, dpr: 2, st: {}, modId: 'spectrum', s: Object.assign({}, def.defaults), mouse: { over: false } };
    def.init(m);
    return { E, m };
  };
  const passa = (o, segs, fl, fr) => {
    const out = [];
    for (let q = 0; q < Math.round(segs * 60); q++) {
      const l = new Float32Array(chunk), r = new Float32Array(chunk);
      for (let i = 0; i < chunk; i++) { const n = o.n++; l[i] = fl ? fl(n) : 0; r[i] = fr ? fr(n) : 0; }
      o.E.feed(l, r, chunk); o.E.update(chunk / sr);
      def.draw(o.m, o.E, 1 / 60, o.n / sr);
      out.push(Float32Array.from(o.m.st.dbS));
    }
    return out;
  };
  const tom = (f, a) => (n) => a * Math.sin(2 * Math.PI * f * n / sr);
  check('padrão igual ao dele: Os dois, 90%, 4,5 dB, FFT 4096, Log, Mid e Side',
    def.defaults.estilo === 'ambos' && def.defaults.smooth === 0.9 && def.defaults.tilt === 4.5 && def.defaults.fft === 4096 && def.defaults.escala === 'log' && def.defaults.canal === 'ms');

  const o = novo(); o.n = 0;
  passa(o, 0.2);
  // grade: 100 Hz, 1 kHz e 10 kHz onde estão as linhas dele (29,7%, 58,6% e 88,7% da largura)
  const L = o.m.st.ax.linhas, perto = (alvo) => L.some((x) => Math.abs(x - alvo * 714) <= 1.6);
  check('grade cai nas linhas dele: 100 Hz, 1 kHz e 10 kHz (eixo log da raia + 1, de 0 Hz ao Nyquist)',
    perto(0.2969) && perto(0.5861) && perto(0.8866) && L.length === 29, L.length + ' linhas');
  // 1 kHz a -30 dBFS: no dele fica a 1/6 do topo
  const sobe = passa(o, 1.0, tom(1000, Math.pow(10, -30 / 20)), tom(1000, Math.pow(10, -30 / 20)));
  const kb = Math.round(1000 / o.E.specBinHz), fim = sobe[sobe.length - 1][kb];
  const v = (fim + 4.5 * Math.log2(kb * o.E.specBinHz / 1000) + 80) / 60;
  check('1 kHz a -30 dBFS fica a 1/6 do topo (janela de -80 a -20 dB)', Math.abs(v - 0.833) < 0.02, 'altura ' + v.toFixed(3));
  check('sobe como o dele: ainda baixo no 1º quadro, a 3 dB do fim em 6 quadros',
    fim - sobe[0][kb] > 10 && fim - sobe[5][kb] < 3, (sobe[0][kb] - fim).toFixed(1) + ' dB · ' + (sobe[5][kb] - fim).toFixed(1) + ' dB');
  const bqTom = o.m.st.bq[Math.floor(o.m.st.ax.xb[kb] * 2)];
  const cai = passa(o, 0.5);
  const queda = (cai[6][kb] - cai[18][kb]) / (12 / 60);
  check('cai como o dele: 86 dB/s em linha reta (τ de 51 ms na potência)', queda > 70 && queda < 102, queda.toFixed(0) + ' dB/s');
  const bqDepois = o.m.st.bq[Math.floor(o.m.st.ax.xb[kb] * 2)];
  passa(o, 0); // nada
  check('barra acende com o som de agora e apaga antes da linha (o rabo é só da linha)', bqTom >= 0 && bqDepois === -1 && cai[cai.length - 1][kb] > -200,
    'cor no tom ' + bqTom + ' · depois ' + bqDepois);

  // mid e side: tom só na esquerda a -12 lê -18 nos dois; tom igual nos dois canais não tem side
  const o2 = novo(); o2.n = 0;
  passa(o2, 0.6, tom(880, Math.pow(10, -12 / 20)), null);
  const k88 = Math.round(880 / o2.E.specBinHz), dbSide = o2.E.spectrum(4096, 's'), dbMid = o2.m.st.dbS;
  check('mid e side: tom só na esquerda a -12 dBFS lê -18 nas duas curvas (é o que o dele mostra)',
    Math.abs(dbMid[k88] + 18) < 1.2 && Math.abs(dbSide[k88] + 18) < 1.2, 'mid ' + dbMid[k88].toFixed(1) + ' · side ' + dbSide[k88].toFixed(1));
  const o3 = novo(); o3.n = 0;
  passa(o3, 0.3, tom(880, 0.25), tom(880, 0.25));
  check('som igual nos dois canais deixa a curva azul no chão', o3.E.spectrum(4096, 's')[k88] < -100, o3.E.spectrum(4096, 's')[k88].toFixed(0) + ' dB');
  check('leitura no formato dele', CV.leituraMM(-6.01, 999.96) === '-6.01dB | 999.96Hz | B5  + 21 Cents' && CV.leituraMM(-24, 12000) === '-24.00dB | 12.00kHz | F#9 + 23 Cents',
    CV.leituraMM(-6.01, 999.96));
}

console.log('medidores no molde do MiniMeters:');
{
  /* Onda, Estéreo, Osciloscópio e Loudness, medidos no mesmo vídeo. Contexto que grava
     as chamadas, pra conferir a geometria e o texto sem pixel. */
  const sr = 48000, chunk = 800;
  const gravaCtx = () => {
    const log = { arc: [], fillText: [], lineTo: 0, fillRect: [] };
    return new Proxy({ _log: log }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'arc') return (x, y) => log.arc.push([x, y]);
        if (k === 'fillText') return (s) => log.fillText.push(String(s));
        if (k === 'fillRect') return (x, y, w, h) => log.fillRect.push([x, y, w, h, t.fillStyle]);
        if (k === 'rect') return (x, y, w, h) => log.arc.push([x + w / 2, y + h / 2]);   // o ponto quadrado conta como ponto
        if (k === 'lineTo') return () => { log.lineTo++; };
        if (k === 'createLinearGradient') return () => ({ addColorStop() {} });
        if (k === 'createPattern') return () => ({ setTransform() {} });
        if (k === 'measureText') return (s) => ({ width: String(s || '').length * 6 });
        return () => {};
      },
      set(t, k, v) { t[k] = v; return true; }
    });
  };
  const roda = (id, w, h, segs, fl, fr, sx) => {
    const E = new g.AudioEngine();
    E.sourceKind = 'system'; E.nativeOn = true; E.sr = sr; E.setupLufs(sr); E.setupBeat();
    const def = CV.registry[id], cv = makeEl('canvas'); cv.width = w * 2; cv.height = h * 2;
    const m = { canvas: cv, ctx: gravaCtx(), w, h, dpr: 2, st: {}, modId: id, s: Object.assign({}, def.defaults, sx || {}), mouse: { over: false } };
    def.init(m);
    let nn = 0;
    for (let q = 0; q < Math.round(segs * 60); q++) {
      const l = new Float32Array(chunk), r = new Float32Array(chunk);
      for (let i = 0; i < chunk; i++) { l[i] = fl(nn); r[i] = fr(nn); nn++; }
      E.feed(l, r, chunk); E.update(chunk / sr);
      if (q === Math.round(segs * 60) - 1) { m.ctx._log.arc.length = 0; m.ctx._log.fillText.length = 0; m.ctx._log.lineTo = 0; m.ctx._log.fillRect.length = 0; }
      def.draw(m, E, 1 / 60, nn / sr);
    }
    m.E = E;
    return m;
  };
  const temaAntes = CV.theme; CV.theme = 'minimeters';
  const tom = (f, a) => (n) => a * Math.sin(2 * Math.PI * f * n / sr), zero = () => 0;
  check('Onda com um canal só por padrão, como a dele (Canal 2: Off)', CV.registry.wavescroll.defaults.ch2 === 'off');
  // e rola na velocidade dele: no beat de 90 BPM do vídeo, um kick a cada 230 px de Retina
  // v2.4: a onda anda pelas amostras que a cabeça de leitura andou (CV.passoAmostras)
  const passoAntes = CV.passoAmostras; let andou = 0;
  CV.passoAmostras = function (mm, p, a, r) { const dx = passoAntes(mm, p, a, r); if (mm.modId === 'wavescroll') andou += dx; return dx; };
  try { roda('wavescroll', 446, 127, 1, tom(440, 0.25), tom(440, 0.25)); } finally { CV.passoAmostras = passoAntes; }
  check('Onda rola como a dele: 345 px de dispositivo por segundo em Retina (a v2.2 fazia 168)', Math.abs(andou - 345) <= 3, andou + ' px em 1 s');
  const c50 = CV.corMultibanda(1, 0.12, 0), c1k = CV.corMultibanda(0.2, 0.9, 0.3), c6k = CV.corMultibanda(0, 0.15, 1);
  check('multibanda dele: grave vermelho, 1 kHz verde, agudo azul (uma cor por coluna, sem camadas)',
    c50[0] > 250 && c50[1] < 110 && c1k[1] > 250 && c1k[0] < 80 && c6k[2] > 250 && c6k[0] < 10,
    [c50, c1k, c6k].map((c) => c.map((v) => v | 0).join(',')).join(' · '));
  // Estéreo: canal sozinho sai a 45° (goniômetro), mono sai em pé
  const ang = (m) => { const a = m.ctx._log.arc, cx = m.st.raiz[0], cy = m.st.raiz[1];
    const v = a.map(([x, y]) => Math.atan2(cy - y, x - cx) * 180 / Math.PI).filter((d) => d > 1).sort((p, q) => p - q); return v.length ? v[v.length >> 1] : NaN; };
  const gL = roda('gonio', 230, 127, 0.5, tom(440, 0.25), zero), gM = roda('gonio', 230, 127, 0.5, tom(440, 0.25), tom(440, 0.25));
  check('Estéreo é goniômetro: canal sozinho a 45° (era deitado no rodapé), mono em pé',
    Math.abs(ang(gL) - 135) < 6 && Math.abs(ang(gM) - 90) < 4, 'esquerda ' + ang(gL).toFixed(0) + '° · mono ' + ang(gM).toFixed(0) + '°');
  // raio em dB (60 dB da raiz à borda): no Nível real, -12 dBFS num canal só vai a 80% do raio, como a linha dele
  const gR = roda('gonio', 268, 127, 0.5, tom(440, 0.25), zero, { tamanho: 'real' });
  const rMax = Math.max(...gR.ctx._log.arc.map(([x, y]) => Math.hypot(x - gR.st.raiz[0], y - gR.st.raiz[1]))) / (127 - 10 - 1);
  check('Estéreo com o raio em dB, como o dele: -12 dBFS num canal só chega a 80% do raio (Nível real)', Math.abs(rMax - 0.8) < 0.03, (rMax * 100).toFixed(1) + '%');
  // Osciloscópio: janela fixa de ~43 ms; a 440 Hz cabem ~19 ciclos (no dele, 20)
  const os = roda('scope', 306, 127, 0.4, tom(440, 0.25), tom(440, 0.25)), Y = os.st.Y, meio = os.h / 2;
  let sob = 0; for (let i = 2; i < Y.length; i += 2) if (Y[i - 2] > meio && Y[i] <= meio) sob++;
  check('Osciloscópio na janela dele: ~43 ms, 18 a 21 ciclos de 440 Hz (o nosso mostrava 3)', sob >= 17 && sob <= 21, sob + ' ciclos');
  // Loudness: a etiqueta azul mostra o CURTO, como a dele (o integrado chegava a 7 LU de diferença)
  // 1 s alto e 3,5 s baixo: o curto já esqueceu o trecho alto, o integrado ainda não
  const desce = (n) => (n < sr ? 0.4 : 0.1) * Math.sin(2 * Math.PI * 1000 * n / sr);
  const lo = roda('loudness', 150, 127, 4.5, desce, desce);
  const et = lo.ctx._log.fillText.find((t) => /LUFS$/.test(t));
  check('Loudness com a etiqueta dele, no número do curto ("-14.3LUFS")', !!et && et === lo.E.lufsS.toFixed(1) + 'LUFS' && lo.E.lufsI - lo.E.lufsS > 3,
    (et || 'sem etiqueta') + ' · curto ' + lo.E.lufsS.toFixed(1) + ' · integrado ' + lo.E.lufsI.toFixed(1));
  // as duas finas são o pico de L e de R: tom de -12 dBFS só na esquerda acende só a da esquerda, em -12
  const lp = roda('loudness', 150, 127, 0.5, tom(440, 0.25), zero), fr2 = lp.ctx._log.fillRect;
  const finaL = fr2.find((r) => r[0] === 36 && r[2] === 4 && r[4] !== '#37638b'), finaR = fr2.find((r) => r[0] === 42 && r[2] === 4 && r[4] !== '#37638b');
  const yAlvo = 9.75 + (12.04 / 60) * (127 - 1 - 9.75);
  check('Loudness: finas de pico por canal, a da esquerda em -12 dB e a da direita apagada',
    !!finaL && Math.abs(finaL[1] - yAlvo) < 1.5 && !finaR, finaL ? 'esquerda y ' + finaL[1].toFixed(1) + ' (alvo ' + yAlvo.toFixed(1) + ')' : 'sem barra');
  CV.theme = temaAntes;
}

/* ================= layout em linhas, presets e estado ================= */
console.log('layout e presets:');
const S = A.state;
check('abre no tema MiniMeters com o preset Barra', S.theme === 'minimeters' && S.preset === 'barra');
check('o preset Barra tem os 5 medidores do MiniMeters', A.viewRows().reduce((n, r) => n + r.cells.length, 0) === 5);
check('acabamento de filme nasce DESLIGADO (custa placa de vídeo o tempo todo)', S.fx.preset === 'off' && FX.DEFAULT.preset === 'off');
check('no navegador a janela começa livre', S.pos === 'free' && A.layoutMode() === 'free');
check('na janela livre o layout tem as linhas do preset', A.viewRows().length === 2);
A.applyPosition('bottom');
check('na barra encaixada as linhas viram uma fileira só', A.layoutMode() === 'row' && A.viewRows().length === 1 && A.viewRows()[0].cells.length === 5);
A.applyPosition('right');
check('na coluna lateral viram uma pilha só', A.layoutMode() === 'col' && A.viewRows().length === 1);
A.applyPosition('free');
check('voltar pra janela livre devolve as linhas', A.viewRows().length === 2);
{
  const pesoBarra = S.rows[0].cells[0].bw, pesoLivre = S.rows[0].cells[0].w;
  check('cada forma guarda o próprio peso (barra não bagunça a janela livre)', pesoBarra !== pesoLivre);
}
A.presets.forEach((p) => {
  A.applyPreset(p.id);
  const n = p.rows.reduce((k, r) => k + r.length - 1, 0);
  const tem = S.rows.reduce((k, r) => k + r.cells.length, 0);
  const ok = tem === n && S.rows.every((r) => r.cells.every((c) => CV.registry[c.mod] && c.s && c.w > 0 && c.bw > 0));
  check('preset ' + p.nome + ' monta ' + n + ' visuais', ok, tem + ' na tela');
});
check('presets cobrem medição, arte e misto', ['Medição', 'Arte', 'Misto'].every((g2) => A.presets.some((p) => p.grupo === g2)));
{
  const vistos = {};
  const rep = A.presets.filter((p) => {
    const k = p.rows.map((r) => r.slice(1).map((c) => c[0]).sort().join('+')).sort().join('|');
    if (vistos[k]) return true; vistos[k] = 1; return false;
  });
  check('nenhum preset repete o conjunto de visuais de outro', rep.length === 0, rep.map((p) => p.nome).join(',') || 'todos diferentes');
}
A.applyPreset('barra');
{
  const antes = S.rows.length, n0 = S.rows.reduce((k, r) => k + r.cells.length, 0);
  const c = A.addModule('vu');
  check('adicionar visual entra na linha com menos visuais', !!c && S.rows.reduce((k, r) => k + r.cells.length, 0) === n0 + 1 && S.rows.length === antes);
  check('preset mexido fica marcado como alterado', S.dirty === true);
  A.replaceCell(c.uid, 'scope');
  check('trocar visual mantém o lugar e zera os ajustes', S.rows.some((r) => r.cells.some((x) => x.uid === c.uid && x.mod === 'scope')));
  A.removeCell(c.uid);
  check('remover tira só aquele', S.rows.reduce((k, r) => k + r.cells.length, 0) === n0);
  // arrastar pra cima de outro abre linha nova (janela livre)
  const a = S.rows[1].cells[0].uid, b = S.rows[0].cells[0].uid;
  A.moveCell(a, b, 'top');
  check('soltar na faixa de cima abre uma linha nova', S.rows.length === 3 && S.rows[0].cells.length === 1 && S.rows[0].cells[0].uid === a);
  A.moveCell(a, S.rows[1].cells[1].uid, 'right');
  check('soltar do lado encaixa na linha e some a linha vazia', S.rows.length === 2 && S.rows[0].cells.length === 3 && S.rows[0].cells[2].uid === a);
  A.applyPosition('bottom');
  const ordem = A.viewRows()[0].cells.map((x) => x.uid);
  A.moveCell(ordem[0], ordem[4], 'right');
  check('na barra, soltar do lado muda a ordem da fileira', A.viewRows()[0].cells[4].uid === ordem[0]);
  A.applyPosition('free');
}
{
  A.applyPreset('mix');
  A.savePresetAs('teste smoke');
  const u = A.userPresets();
  const meu = u.find((p) => p.nome === 'teste smoke');
  check('salvar preset guarda os visuais e o tamanho', !!meu && meu.rows.length === S.rows.length && /^u-/.test(S.preset) && S.dirty === false);
  A.applyPreset('barra');
  A.applyPreset(meu.id);
  check('o preset salvo volta igual', S.rows.map((r) => r.cells.map((c) => c.mod).join('+')).join('|') === meu.rows.map((r) => r.cells.map((c) => c.mod).join('+')).join('|'));
  A.deletePreset(meu.id);
  check('apagar preset some com ele', !A.userPresets().some((p) => p.id === meu.id));
}
{
  A.applyPreset('barra');
  const cel = S.rows[0].cells[1];
  cel.s.smooth = 0.5;
  A.saveNow();
  const salvo = JSON.parse(store['cv2-state']);
  const s1 = salvo.rows[0].cells[1].s;
  check('o estado salva só a DIFERENÇA do padrão (padrão novo chega em quem já usa)', s1.smooth === 0.5 && Object.keys(s1).length === 1, JSON.stringify(s1));
  const n = A.normalize(JSON.parse(JSON.stringify(salvo)));
  check('ao ler, o ajuste volta junto com todos os padrões', n.rows[0].cells[1].s.smooth === 0.5 && n.rows[0].cells[1].s.fft === CV.registry.spectrum.defaults.fft);
  const ruim = A.normalize({ v: 2, theme: 'neon', pos: 'lua', fps: 99, fx: { preset: 'xyz' }, rows: [{ h: 1, cells: [{ mod: 'naoexiste' }] }] });
  check('estado estragado não derruba o app (tema, posição, fps e visual inválidos)',
    ruim.theme === 'minimeters' && A.positions.some((p) => p.id === ruim.pos) && ruim.fps === 0 && ruim.fx.preset === 'off' && ruim.rows.length >= 1);
}

/* ================= migração da v1 ================= */
console.log('migração da v1:');
{
  const r1 = A.rowsFromV1([{ mod: 'spectrum', w: 160, h: 70 }, { mod: 'loudness', w: 40, h: 70 }, { mod: 'gonio', w: 40, h: 70 },
    { mod: 'wavescroll', w: 120, h: 65 }, { mod: 'spectrogram', w: 120, h: 65 }, { mod: 'scope', w: 240, h: 65 }], 'grid');
  check('a grade da v1 vira linhas na mesma ordem', r1.length === 3 && r1[0].cells.length === 3 && r1[1].cells.length === 2 && r1[2].cells[0].mod === 'scope',
    r1.map((r) => r.cells.map((c) => c.mod).join('+')).join(' / '));
  const r2 = A.rowsFromV1([{ mod: 'spectrum', w: 300 }, { mod: 'loudness', w: 100 }], 'row');
  check('a barra da v1 vira uma linha com os mesmos pesos', r2.length === 1 && r2[0].cells[0].bw === 300 && r2[0].cells[1].bw === 100);
  check('visual que não existe mais é ignorado', A.rowsFromV1([{ mod: 'tunnel' }, { mod: 'scope' }], 'row')[0].cells.length === 1);
  store['cv-templates-v1'] = JSON.stringify({
    'faixa · mixagem': { nome: 'mixagem', forma: 'row', panels: [{ mod: 'spectrum', w: 100 }] },
    'tela · meu show': { nome: 'meu show', forma: 'grid', panels: [{ mod: 'psy', w: 120, h: 200 }, { mod: 'flow', w: 120, h: 200 }] }
  });
  delete store['cv2-presets'];
  const st = A.freshState();
  A.migrateV1({ theme: 'carvao', pos: 'dock-top', pinned: true, recSize: '916', layout: 'row', panels: [{ mod: 'spectrum', w: 200 }, { mod: 'scope', w: 120 }] }, st);
  const u = A.userPresets();
  check('tema que saiu da lista cai no vizinho mais próximo', st.theme === 'chumbo', st.theme);
  check('posição, pin e gravação passam direto', st.pos === 'top' && st.pinned === true && st.recSize === '916');
  check('a tela antiga vira o preset "Minha tela antiga"', u.some((p) => p.nome === 'Minha tela antiga' && p.rows[0].cells.length === 2));
  check('template próprio da v1 vira preset; os prontos da v1 não', u.some((p) => p.nome === 'meu show') && !u.some((p) => p.nome === 'mixagem'));
}

/* ================= temas ================= */
console.log('temas:');
check('dez temas na lista: escuros, médios e claros', A.themes.length === 10 &&
  A.themes.filter((t) => CV.themePreview(t[0]).light).length >= 3, A.themes.map((t) => t[0]).join(','));
{
  const sem = A.themes.filter((t) => { const pv = CV.themePreview(t[0]); return !pv.cores || pv.cores.length < 3; });
  check('todo tema tem cor desenhada pros medidores', sem.length === 0, sem.map((t) => t[0]).join(',') || 'todos');
  const m = { modId: 'scope', s: { cmap: 'auto' } };
  CV.theme = 'papel';
  const forte = CV.cmapRgb('cinza', 0), escuro = CV.cmap(m, 0.9), claro = CV.cmap(m, 0.1);
  const lum = (s) => { const n = s.match(/\d+/g).map(Number); return n[0] + n[1] + n[2]; };
  check('no fundo claro o mapa inverte: sinal forte sai escuro', lum(escuro) < lum(claro), escuro + ' vs ' + claro);
  CV.theme = 'minimeters';
  void forte;
}
check('o tema muda o cromo inteiro (barra, menus e ajustes)', /--surface/.test(srcApp) && /var\(--surface\)/.test(srcCss));

/* ================= guardas de decisão ================= */
console.log('guardas:');
check('nenhum desfoque de sombra no desenho', !/shadowBlur/.test(srcMods) && !/shadowBlur/.test(srcFx));
check('sem controle de Brilho sobrando', !/'glow'/.test(srcMods));
check('sem 22050 chumbado (o app roda a 48kHz)', !/22050/.test(srcMods));
check('rastro apaga por opacidade (o véu de 8 bits empacava no 18 e escurecia o painel)',
  /CV\.fade = function/.test(srcMods) && /destination-out/.test(srcMods) && !/fillStyle = CV\.trailFill\(m, s\.trail\);\s*c\.fillRect/.test(srcMods));
{
  const m = { st: {} };
  let a = 0; for (let i = 0; i < 120; i++) a += CV.passo(m, 1.4, 1 / 120);
  const m2 = { st: {} };
  let b = 0; for (let i = 0; i < 60; i++) b += CV.passo(m2, 1.4, 1 / 60);
  check('a onda rola na mesma velocidade a 60 e a 120 quadros', Math.abs(a - b) <= 2, a + ' px contra ' + b + ' px em 1s');
}
check('texto de instrumento cresce no máximo 1,35x (o "1kHz" de 23px brigava com a curva)', CV.fs({ w: 1600, h: 900 }, 10) <= 13.5 + 1e-9);
check('o número do LUFS continua crescendo com o painel', CV.fsBig({ w: 900, h: 300 }, 92) > 140);
{
  /* v2.1 LISO: conta as chamadas de desenho de verdade numa barra de 720x170 em
     Retina. O espectro fazia 8.711 por quadro (um ponto por pixel de dispositivo,
     em reta) e o osciloscópio 2.896. Agora é um ponto a cada 2 pixels de tela, em curva. */
  function contaCtx() {
    const n = {}, grad = { addColorStop() {} };
    const px = new Proxy({}, {
      get(t, k) {
        if (k === '_n') return n;
        if (k === 'canvas') return t._canvas;
        if (k in t) return t[k];
        if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
        if (k === 'createPattern') return () => { n.createPattern = (n.createPattern || 0) + 1; return { setTransform() {} }; };
        if (k === 'measureText') return (s) => ({ width: String(s || '').length * 6 });
        return () => { n[k] = (n[k] || 0) + 1; };
      },
      set(t, k, v) { t[k] = v; return true; }
    });
    return px;
  }
  const mede = (id) => {
    const def = CV.registry[id], cv = makeEl('canvas'), ctx = contaCtx();
    ctx._canvas = cv; cv.width = 1440; cv.height = 340;
    const m = { canvas: cv, ctx, w: 720, h: 170, dpr: 2, st: {}, modId: id, s: Object.assign({}, def.defaults) };
    def.init(m);
    for (let i = 0; i < 30; i++) { engine.update(0.016); def.draw(m, engine, 0.016, i * 0.016); }
    Object.keys(ctx._n).forEach((k) => { ctx._n[k] = 0; });
    engine.update(0.016); def.draw(m, engine, 0.016, 1);
    return ctx._n;
  };
  /* v2.3: o espectro virou o do MiniMeters, reta de raia em raia nas duas curvas (mid e
     side). No agudo, passando de 3 raias por pixel, vai o mínimo e o máximo da coluna:
     2.048 raias viram ~1.000 pontos por curva. As barras saem num polígono só (um ponto
     por coluna de dispositivo, 1.440 + 1 aqui), pintado com a fileira de cores. */
  const sp = mede('spectrum'), segS = (sp.lineTo || 0) + (sp.quadraticCurveTo || 0), segC = segS - 1441;
  check('espectro no molde do MiniMeters sem estourar o desenho: até 1.200 pontos por curva, barras num fill só',
    segC > 0 && segC <= 2400 && (sp.fill || 0) <= 2 && !(sp.rect || 0) && sp.createPattern === 1,
    segC + ' segmentos nas curvas · ' + (sp.fill || 0) + ' fill · ' + (sp.rect || 0) + ' retângulos');
  const sc = mede('scope'), segO = (sc.lineTo || 0) + (sc.quadraticCurveTo || 0);
  // v2.3: no tema MiniMeters o osciloscópio é a janela fixa dele, em reta (um ponto por pixel de tela)
  check('osciloscópio liso: até 900 segmentos (era 2.896 chamadas por quadro), em curva fora do tema MiniMeters',
    segO > 0 && segO <= 900 && ((sc.quadraticCurveTo || 0) > 0 || CV.theme === 'minimeters'), segO + ' segmentos');
  const go = mede('gonio');
  /* v2.4: no tema MiniMeters o ponto é o quadradinho nítido de 2 px dele, num caminho
     por cor (rect + um fill por tom), nunca um fillRect por ponto. Nos outros, bolinha. */
  if (CV.theme === 'minimeters') check('estéreo em quadradinhos de 2x2 px num caminho por cor (o ponto do MiniMeters), sem fillRect por ponto',
    (go.rect || 0) > 500 && (go.fill || 0) <= 30 && (go.fillRect || 0) < 5, (go.rect || 0) + ' pontos · ' + (go.fill || 0) + ' fills');
  else check('estéreo em ponto redondo, sem quadradinho de areia', (go.arc || 0) > 0 && !(go.rect || 0), (go.arc || 0) + ' pontos');
}
check('o desenho dorme no silêncio depois do fade', /dormindo = true/.test(srcApp) && /if \(silFade <= 0 && !gravando\)/.test(srcApp));
check('o fundo vem do CSS: nada de pintar o fundo de todo painel a cada quadro',
  !/globalCompositeOperation = 'destination-over'[\s\S]{0,200}p\.ctx\.fillRect\(0, 0, p\.canvas\.width/.test(srcApp));
check('limite de quadros escolhível (tela, 60, 30)', /\[0, 'Da tela'\], \[60, '60'\], \[30, '30'\]/.test(srcApp) && /0\.92 \/ state\.fps/.test(srcApp));
check('teto de quadros no laço como rede de segurança', /FRAME_MIN = 1 \/ 144/.test(srcApp));
check('o desenho acompanha a tela, sem tirar o teto de quadros', !/^\s*app\.commandLine\.appendSwitch\('disable-frame-rate-limit'\)/m.test(srcMain));
check('janela coberta pelo FL Studio continua desenhando', /backgroundThrottling: false/.test(srcMain) && /disable-backgrounding-occluded-windows/.test(srcMain));
check('sem divisória entre os visuais', !/\.row\s*\{[^}]*gap:\s*[1-9]/.test(srcCss) && !/#grid\s*\{[^}]*gap:\s*[1-9]/.test(srcCss));
{
  const regras = srcCss.split('}').filter((r) => /-webkit-app-region:\s*drag/.test(r));
  check('só a alça do logo arrasta a janela (app-region na barra inteira engole cliques)', regras.length === 1 && /\.tb-grab/.test(regras[0]));
}
check('nada de window.prompt (o Electron não tem)', !/window\.prompt|[^.]prompt\(/.test(srcApp));
check('a barra de ferramentas tem os botões do MiniMeters', ['tbPreset', 'tbPos', 'tbPin', 'tbPause', 'tbSettings', 'tbMin', 'tbClose'].every((id) => srcHtml.indexOf('id="' + id + '"') > 0));
check('ajustes num lugar só, em abas', ['visuais', 'aparencia', 'janela', 'audio', 'gravacao', 'atalhos'].every((t) => srcHtml.indexOf('data-tab="' + t + '"') > 0));
check('menu de contexto no visual (botão direito)', /addEventListener\('contextmenu'/.test(srcApp) && /function panelMenu/.test(srcApp));
check('menu que não cabe na janela baixa vira colunas', /menuEl\.className = 'cols'/.test(srcApp) && /#menu\.cols/.test(srcCss));
check('a barra encaixada usa a espessura escolhida', /ipcMain\.handle\('cv-win-stick', \(e, pos, size\)/.test(srcMain) && /winStick: \(pos, size\)/.test(fs.readFileSync(path.join(BASE, 'electron/preload.js'), 'utf8')));
check('gravação tenta MP4 antes de webm (o Final Cut não abre webm)', srcApp.indexOf("'video/mp4;codecs=avc1") < srcApp.indexOf("'video/webm"));
check('gravação compensa a sincronia do clipe', /setRecordDelayMs\(\(engine\.latencyMs \|\| 0\) \+ presentMs\(\)\)/.test(srcApp));
check('gravação tem as três medidas de rede social', /'916': \[1080, 1920\], '11': \[1080, 1080\], '169': \[1920, 1080\]/.test(srcApp));
check('soltar arquivo de áudio na janela toca a faixa', /addEventListener\('drop'/.test(srcApp) && /engine\.playFile\(f\)/.test(srcApp));
check('espectro guarda uma caixa por tamanho e por canal, side incluído (nenhuma FFT nasce duas vezes)',
  /this\._spec \|\| \(this\._spec = \{\}\)/.test(srcAud) && /var key = \(ch === 'l' \|\| ch === 'r' \|\| ch === 's'\) \? n \+ ch : n;/.test(srcAud));

/* ================= laço principal ================= */
console.log('laço:');
try {
  A.applyPreset('barra');
  for (let i = 0; i < 6 && rafQ.length; i++) { const fns = rafQ; rafQ = []; fns.forEach((fn) => fn(Date.now() + (i + 1) * 40)); }
  check('o laço principal roda sem cair', true);
} catch (e) { check('o laço principal roda sem cair', false, e.stack.split('\n').slice(0, 2).join(' | ')); }
try {
  A.openSettings('visuais'); A.openSettings('aparencia'); A.openSettings('janela'); A.openSettings('audio');
  A.openSettings('gravacao'); A.openSettings('atalhos'); A.closeSettings();
  check('todas as abas de ajustes montam sem cair', true);
} catch (e) { check('todas as abas de ajustes montam sem cair', false, e.stack.split('\n').slice(0, 2).join(' | ')); }
try { A.togglePause(); A.togglePause(); A.setTheme('papel'); A.setTheme('minimeters'); check('pausa e troca de tema', S.theme === 'minimeters'); }
catch (e) { check('pausa e troca de tema', false, e.message); }

/* ================= pós-produção (js/fx.js) ================= */
console.log('acabamento de filme:');
check('as três direções existem e são o MESMO código com números diferentes',
  !!(FX.PRESETS.regua && FX.PRESETS.prata && FX.PRESETS.vidro) && (srcFx.match(/FS_COMP =/g) || []).length === 1);
check('a lista de estágios tem os 7 na ordem', FX.STAGES.join(',') === 'acumulo,halacao,curva,aberracao,grao,vinheta,pontilhado');
{
  const ruins = Object.keys(FX.PRESETS).filter((k) => { const p = FX.PRESETS[k]; return (p.ab * p.meter.ab) !== 0 || (p.blur.frames * p.meter.blur) !== 0; });
  check('aberração e borrão são ZERO nos medidores, nas 3 direções', ruins.length === 0, ruins.join(',') || 'todas limpas');
  const sai = FX.curve(5 / 255, FX.PRESETS.prata.curve, false, 1) * 255;
  check('na PRATA o preto abre: 5/255 sai maior que 5', sai > 5 && sai < 9, sai.toFixed(2) + ' / 255');
  check('intensidade zero devolve a imagem intacta', Math.abs(FX.curve(0.42, FX.PRESETS.vidro.curve, false, 0) - 0.42) < 1e-9);
}
{
  const nomes = {}; const ruins = [], desbal = [];
  Object.keys(FX.SHADERS).forEach((k) => {
    const src = FX.SHADERS[k], decl = new Set();
    (src.match(/uniform\s+\w+\s+([^;]+);/g) || []).forEach((d) => {
      d.replace(/uniform\s+\w+\s+/, '').replace(';', '').split(',').forEach((n) => { const nm = n.trim().split('[')[0]; if (nm) { decl.add(nm); nomes[nm] = 1; } });
    });
    (src.match(/\bu_[A-Za-z0-9_]+/g) || []).forEach((n) => { if (!decl.has(n)) ruins.push(k + '.' + n); });
    let ab = (src.match(/\{/g) || []).length, fe = (src.match(/\}/g) || []).length;
    if (ab !== fe) desbal.push(k + ' ' + ab + '/' + fe);
  });
  check('todo uniforme usado no shader existe declarado', ruins.length === 0, ruins.slice(0, 4).join(' | ') || 'nenhum órfão');
  check('os shaders estão balanceados', desbal.length === 0, desbal.join(' | ') || 'ok');
  const orfaos = (srcFx.match(/u\.u_[A-Za-z0-9_]+/g) || []).map((s) => s.slice(2)).filter((n) => !nomes[n]);
  check('todo uniforme que o app escreve existe em algum shader', orfaos.length === 0, orfaos.slice(0, 4).join(' | ') || 'nenhum órfão');
}
try {
  const sim = require('./fxsim.js')(FX, (w, h) => { const c = makeEl('canvas'); c.width = w; c.height = h; return c; });
  check('a passada roda inteira sem cair (16 painéis x 3 direções + gravação)', sim.erros.length === 0 && sim.draw > 200, sim.erros.slice(0, 2).join(' | ') || sim.draw + ' desenhos');
  check('nenhum uniforme perdido no caminho', sim.nulos === 0, sim.nulos + ' perdidos');
} catch (e) { check('simulação da passada', false, e.message); }

/* ================= app de computador (ponte do Electron de mentira) ================= */
const espera = () => new Promise((r) => setImmediate(r));
(async () => {
console.log('app de computador:');
try {
  const chamadas = [];
  let boundsCb = null;
  g.caramujo = {
    isDesktop: true,
    winStick: (p, sz) => { chamadas.push(['stick', p, sz]); return Promise.resolve(p); },
    winSettings: (open, px, side) => { chamadas.push(['settings', open, px, side]); return Promise.resolve({ x: 0, y: 0, width: 1400, height: 470 }); },
    winPin: (on) => { chamadas.push(['pin', on]); return Promise.resolve(on); },
    winSetBounds: (b) => { chamadas.push(['bounds', b]); return Promise.resolve(); },
    winGetBounds: () => Promise.resolve({ x: 0, y: 0, width: 1400, height: 170 }),
    winMinimize() {}, winClose() {}, winFullscreen() {},
    enableLoopback: () => Promise.resolve(true), disableLoopback: () => Promise.resolve(true),
    nativeAvailable: () => Promise.resolve(false), nativeWhy: () => Promise.resolve({ ok: false, reason: 'teste' }),
    nativeStart: () => Promise.reject(new Error('sem modulo')), nativeStop: () => Promise.resolve(true),
    onNativeAudio() {}, onNativeError() {}, onBounds(cb) { boundsCb = cb; }
  };
  Object.keys(store).forEach((k) => delete store[k]);
  new Function(srcApp)();
  const B = g.CVAPP;
  check('no app a primeira abertura é a barra no rodapé, como o MiniMeters', B.state.pos === 'bottom' && B.layoutMode() === 'row');
  check('a barra encaixa com a espessura padrão', chamadas.some((c) => c[0] === 'stick' && c[1] === 'bottom' && c[2] === 170));
  B.openSettings('visuais');
  check('abrir os ajustes na barra estica a janela (a folha não cobre os visuais)', chamadas.some((c) => c[0] === 'settings' && c[1] === true && c[2] === 300));
  B.closeSettings();
  B.applyPosition('left');
  check('coluna encaixa com a largura padrão', chamadas.some((c) => c[0] === 'stick' && c[1] === 'left' && c[2] === 300));
  B.applyPosition('free');
  await espera(); await espera();
  if (boundsCb) boundsCb({ x: 10, y: 20, width: 900, height: 600 });
  check('a janela livre guarda onde você deixou', B.state.win && B.state.win.width === 900);
  delete g.caramujo;
} catch (e) { check('ponte do app de computador', false, e.stack.split('\n').slice(0, 3).join(' | ')); }

/* ================= processo principal (Electron de mentira) =================
   Carrega o electron/main.js de verdade com um Electron falso e chama os comandos
   de janela: pega erro de digitação e conta errada de borda sem precisar de um Mac. */
console.log('processo principal:');
try {
  const handlers = {};
  const area = { x: 0, y: 25, width: 1512, height: 920 };
  const win = {
    b: { x: 100, y: 100, width: 1440, height: 900 },
    getBounds() { return Object.assign({}, this.b); }, setBounds(x) { this.b = Object.assign({}, this.b, x); },
    isFullScreen() { return false; }, setFullScreen() {}, setAlwaysOnTop(on) { this.top = on; }, setVisibleOnAllWorkspaces() {},
    minimize() {}, isDestroyed() { return false }, setMenuBarVisibility() {}, loadFile() {}, on() {},
    webContents: { send() {}, on() {} }
  };
  const fake = {
    app: { setName() {}, commandLine: { appendSwitch() {} }, whenReady: () => Promise.resolve(), on() {}, quit() {}, getVersion: () => '2.0.0', setAboutPanelOptions() {} },
    BrowserWindow: function () { return win; },
    session: { defaultSession: { setDisplayMediaRequestHandler() {} } },
    desktopCapturer: {}, ipcMain: { handle(n, fn) { handlers[n] = fn; } },
    systemPreferences: { askForMediaAccess: async () => true }, nativeImage: { createFromPath: () => ({ isEmpty: () => true }) },
    screen: { getDisplayMatching: () => ({ workArea: area }), getPrimaryDisplay: () => ({ workArea: area }) }
  };
  fake.BrowserWindow.getAllWindows = () => [win];
  const meuRequire = (id) => (id === 'electron' ? fake : require(id));
  new Function('require', '__dirname', 'process', fs.readFileSync(path.join(BASE, 'electron/main.js'), 'utf8'))(
    meuRequire, path.join(BASE, 'electron'), { argv: [], platform: 'linux', title: '' });
  await espera();
  handlers['cv-win-stick']({}, 'bottom', 170);
  check('barra no rodapé: largura da tela, 170px, colada embaixo', win.b.width === 1512 && win.b.height === 170 && win.b.y === 25 + 920 - 170, JSON.stringify(win.b));
  const g2 = handlers['cv-win-settings']({}, true, 300, false);
  check('ajustes abertos: a janela cresce 300px pra cima, sem sair da tela', win.b.height === 470 && win.b.y === 25 + 920 - 470 && g2.height === 470, JSON.stringify(g2));
  handlers['cv-win-settings']({}, false);
  check('ajustes fechados: a barra volta ao tamanho', win.b.height === 170 && win.b.y === 25 + 920 - 170);
  handlers['cv-win-stick']({}, 'right', 300);
  check('coluna à direita com a largura escolhida', win.b.width === 300 && win.b.x === 1512 - 300 && win.b.height === 920);
  handlers['cv-win-stick']({}, 'off');
  check('desencaixar devolve a janela de antes', win.b.width === 1440 && win.b.height === 900 && win.b.x === 100);
  handlers['cv-win-pin']({}, true);
  check('sempre na frente liga', win.top === true);
} catch (e) { check('processo principal carrega e responde', false, e.stack.split('\n').slice(0, 3).join(' | ')); }

console.log('\n' + okN + ' checagens ok');
console.log(fail === 0 ? 'SMOKE PASSOU' : 'SMOKE FALHOU: ' + fail);
process.exit(fail === 0 ? 0 : 1);
})();
