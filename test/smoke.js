/* Smoke test: carrega audio.js, modules.js, app.js com stubs de navegador
   e roda cada módulo por 60 frames com dados de áudio falsos. */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = process.argv[2];

/* ---------- stubs ---------- */
function noopCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({}, {
    get(t, k) {
      if (k === 'canvas') return t._canvas;
      if (k in t) return t[k];
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return () => grad;
      if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
      if (k === 'putImageData' || k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      if (k === 'measureText') return () => ({ width: 10 });
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}

let elId = 0;
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(),
    id: 'el' + (elId++),
    children: [],
    style: {},
    dataset: {},
    classList: { add() {}, remove() {}, contains() { return true; } },
    attributes: {},
    draggable: false,
    value: '',
    innerHTML: '',
    textContent: '',
    width: 300, height: 200,
    options: [], selectedIndex: 0,
    addEventListener() {},
    removeEventListener() {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; },
    appendChild(c) { this.children.push(c); return c; },
    insertBefore() {},
    remove() {},
    querySelector(sel) { return makeEl(sel.replace(/[.#]/g, '')); },
    querySelectorAll() { return { forEach() {} }; },
    getBoundingClientRect() { return { width: 300, height: 200 }; },
    getContext(kind) {
      if (kind === '2d') { const c = noopCtx(); c._canvas = el; return c; }
      return null; // webgl indisponível no teste: exercita o fallback
    },
    requestFullscreen() {},
    click() {}
  };
  return el;
}

const g = globalThis;
g.window = g;
g.addEventListener = () => {};
g.removeEventListener = () => {};
g.document = {
  createElement: makeEl,
  getElementById: (id) => { const e = makeEl('div'); e.id = id; return e; },
  documentElement: makeEl('html'),
  body: makeEl('body')
};
Object.defineProperty(g, 'navigator', { value: { mediaDevices: { enumerateDevices: async () => [], getUserMedia: async () => { throw new Error('no'); } } }, configurable: true });
g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
g.ResizeObserver = class { observe() {} disconnect() {} };
g.performance = { now: () => Date.now() };
let rafQ = [];
g.requestAnimationFrame = (fn) => { rafQ.push(fn); return 1; };
g.confirm = () => false;
g.location = { reload() {} };
g.Audio = class {
  constructor() { this._h = {}; this.paused = false; }
  addEventListener(ev, fn) { this._h[ev] = fn; if (ev === 'error') setTimeout(() => fn(), 0); } // sem arquivo: cai no sintetizador
  removeEventListener() {}
  play() { this.paused = false; return Promise.resolve(); }
  pause() { this.paused = true; }
};
g.URL = { createObjectURL: () => 'blob:x' };
g.MediaRecorder = class { static isTypeSupported() { return false; } };
g.devicePixelRatio = 1;
g.innerWidth = 1400; g.innerHeight = 900;
g.AudioContext = class {
  constructor() { this.sampleRate = 44100; this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  resume() {}
  createAnalyser() {
    return {
      fftSize: 2048, frequencyBinCount: 1024, smoothingTimeConstant: 0,
      connect() {}, disconnect() {},
      getByteFrequencyData(a) { for (let i = 0; i < a.length; i++) a[i] = (Math.sin(i * 0.1) * 0.5 + 0.5) * 200; },
      getFloatTimeDomainData(a) { for (let i = 0; i < a.length; i++) a[i] = Math.sin(i * 0.05) * 0.5; }
    };
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

/* ---------- carrega os arquivos ---------- */
for (const f of ['js/audio.js', 'js/modules.js', 'js/app.js']) {
  const src = fs.readFileSync(path.join(BASE, f), 'utf8');
  try { new Function(src)(); } catch (e) { console.error('FALHA ao carregar ' + f + ': ' + e.stack); process.exit(1); }
  console.log('carregou ' + f);
}

/* ---------- roda o motor ---------- */
const engine = g.engine;
engine.ensureCtx();
engine.startSynth();
if (engine.sourceKind !== 'synth') { console.error('FALHA: synth nao ligou'); process.exit(1); }
engine.togglePlay(); engine.togglePlay(); // pausa e volta
for (let i = 0; i < 60; i++) engine.update(0.016);
console.log('engine ok: bass=' + engine.bass.toFixed(3) + ' rms=' + engine.rms.toFixed(3) + ' lufs=' + engine.lufsApprox().toFixed(1) + ' med=' + engine.lufsAvgVal.toFixed(1));

/* ---------- roda cada módulo direto, sem try/catch ---------- */
const CV = g.CV;
let fail = 0;
for (const id of Object.keys(CV.registry)) {
  const def = CV.registry[id];
  const canvas = makeEl('canvas');
  const m = { canvas, ctx: canvas.getContext('2d'), w: 300, h: 200, dpr: 1, st: {}, s: Object.assign({}, def.defaults) };
  try {
    def.init(m);
    for (let i = 0; i < 60; i++) {
      engine.update(0.016);
      engine.beat = i % 20 === 0;
      def.draw(m, engine, 0.016, i * 0.016);
    }
    def.draw(m, null, 0.016, 1); // sem áudio também
    m.s.colorMode = 'custom';
    def.draw(m, engine, 0.016, 2);
    m.mouse = { x: 150, y: 100, over: true }; // hover: leitura de frequência e reação ao cursor
    def.draw(m, engine, 0.016, 2.5);
    m.mouse.over = false;
    for (const th of ['psy', 'neon', 'vhs', 'mono']) { CV.theme = th; def.draw(m, engine, 0.016, 3); }
    console.log('modulo ok: ' + id);
  } catch (e) {
    fail++;
    console.error('MODULO FALHOU: ' + id + ' -> ' + e.stack.split('\n').slice(0, 3).join(' | '));
  }
}

/* ---------- roda o loop principal algumas vezes ---------- */
try {
  for (let i = 0; i < 5 && rafQ.length; i++) {
    const fns = rafQ; rafQ = [];
    fns.forEach((fn) => fn(performance.now() + i * 16));
  }
  console.log('loop principal ok');
} catch (e) { fail++; console.error('LOOP FALHOU: ' + e.stack); }

console.log(fail === 0 ? 'SMOKE PASSOU' : 'SMOKE FALHOU: ' + fail);
process.exit(fail === 0 ? 0 : 1);
