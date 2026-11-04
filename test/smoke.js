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
    E._frame = (E._frame || 0) + 1;
    const buf = new Float32Array(9600);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.sin(2 * Math.PI * 220 * i / 48000) * 0.4;
    E.feed(buf, buf, buf.length);
    E._frame++;
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
  const sp = mede('spectrum'), segS = (sp.lineTo || 0) + (sp.quadraticCurveTo || 0);
  check('espectro liso: um ponto a cada 2 pixels, em curva (era 8.711 chamadas por quadro)', segS > 0 && segS <= 1500 && (sp.quadraticCurveTo || 0) > 0, segS + ' segmentos');
  const sc = mede('scope'), segO = (sc.lineTo || 0) + (sc.quadraticCurveTo || 0);
  check('osciloscópio liso: linha em curva (era 2.896 chamadas por quadro)', segO > 0 && segO <= 900 && (sc.quadraticCurveTo || 0) > 0, segO + ' segmentos');
  const go = mede('gonio');
  check('estéreo em ponto redondo, sem quadradinho de areia', (go.arc || 0) > 0 && !(go.rect || 0), (go.arc || 0) + ' pontos');
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
check('espectro guarda uma caixa por tamanho e por canal (nenhuma FFT nasce duas vezes)',
  /this\._spec \|\| \(this\._spec = \{\}\)/.test(srcAud) && /var key = \(ch === 'l' \|\| ch === 'r'\) \? n \+ ch : n;/.test(srcAud));

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
