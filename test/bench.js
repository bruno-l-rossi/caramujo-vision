/* Bench headless do Caramujo Vision.
   Mede: (a) custo do motor de audio por quadro, (b) custo JS de cada modulo,
   (c) contagem de chamadas de canvas por quadro (proxy do custo de GPU/Skia). */
'use strict';
const fs = require('fs');
const path = require('path');
const BASE = require('path').resolve(process.argv[2] || require('path').join(__dirname, '..'));
const PANEL_W = +(process.argv[3] || 720);
const PANEL_H = +(process.argv[4] || 420);
const DPR = +(process.argv[5] || 2);

/* ---------- contexto 2D instrumentado ---------- */
const OPS = ['clearRect','fillRect','strokeRect','beginPath','moveTo','lineTo','rect','arc',
  'quadraticCurveTo','bezierCurveTo','closePath','fill','stroke','fillText','strokeText',
  'save','restore','translate','rotate','scale','setTransform','setLineDash','drawImage',
  'measureText','createLinearGradient','createRadialGradient','clip','ellipse'];

function makeCtx(canvas) {
  const counts = Object.create(null);
  const grad = { addColorStop() {} };
  const ctx = { canvas, _counts: counts };
  for (const op of OPS) {
    ctx[op] = function () {
      counts[op] = (counts[op] || 0) + 1;
      if (op === 'measureText') return { width: String(arguments[0] || '').length * 6 };
      if (op === 'createLinearGradient' || op === 'createRadialGradient') return grad;
      return undefined;
    };
  }
  ctx.createImageData = (w, h) => ({ data: new Uint8ClampedArray(w * h * 4) });
  ctx.getImageData = (x, y, w, h) => ({ data: new Uint8ClampedArray(Math.max(1, w * h) * 4) });
  ctx.putImageData = () => {};
  ctx.fillStyle = '#000'; ctx.strokeStyle = '#000'; ctx.lineWidth = 1;
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.font = '10px monospace'; ctx.textAlign = 'left'; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  return ctx;
}

let elId = 0;
function makeEl(tag) {
  const el = {
    tagName: (tag || 'div').toUpperCase(), id: 'el' + (elId++), children: [], style: {},
    dataset: {}, classList: { add() {}, remove() {}, contains() { return false; }, toggle() {} },
    attributes: {}, value: '', innerHTML: '', textContent: '',
    width: 300, height: 200, options: [], selectedIndex: 0,
    addEventListener() {}, removeEventListener() {},
    setAttribute(k, v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k]; },
    appendChild(c) { this.children.push(c); return c; }, insertBefore() {}, remove() {},
    querySelector(s) { return makeEl(s.replace(/[.#]/g, '')); },
    querySelectorAll() { return { forEach() {} }; },
    getBoundingClientRect() { return { width: 300, height: 200, left: 0, top: 0 }; },
    getContext(kind) { if (kind === '2d') return (el._ctx = el._ctx || makeCtx(el)); return null; },
    requestFullscreen() {}, click() {}
  };
  return el;
}

const g = globalThis;
g.window = g;
g.addEventListener = () => {}; g.removeEventListener = () => {};
g.document = { createElement: makeEl, getElementById: (id) => { const e = makeEl('div'); e.id = id; return e; },
  documentElement: makeEl('html'), body: makeEl('body') };
Object.defineProperty(g, 'navigator', { value: { mediaDevices: { enumerateDevices: async () => [], getUserMedia: async () => { throw new Error('no'); } } }, configurable: true });
g.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
g.ResizeObserver = class { observe() {} disconnect() {} };
g.requestAnimationFrame = () => 1; g.cancelAnimationFrame = () => {};
g.confirm = () => false; g.location = { reload() {} };
g.Audio = class { constructor() { this.paused = false; } addEventListener(e, f) { if (e === 'error') setTimeout(f, 0); } removeEventListener() {} play() { return Promise.resolve(); } pause() {} };
g.URL = { createObjectURL: () => 'blob:x', revokeObjectURL() {} };
g.MediaRecorder = class { static isTypeSupported() { return false; } };
g.devicePixelRatio = DPR; g.innerWidth = 1440; g.innerHeight = 900;
g.AudioContext = undefined;

require(path.join(BASE, 'js', 'audio.js'));
require(path.join(BASE, 'js', 'modules.js'));

const CV = g.CV;
const AudioEngine = g.AudioEngine;

/* ---------- sinal de teste: kick 135bpm + baixo + hats, 48kHz estereo ---------- */
const SR = 48000;
function makeSignal(seconds) {
  const n = SR * seconds, L = new Float32Array(n), R = new Float32Array(n);
  const stepDur = 60 / 135 / 2;
  for (let i = 0; i < n; i++) {
    const tt = i / SR;
    const step = Math.floor(tt / stepDur);
    const inStep = tt - step * stepDur;
    let v = 0;
    if (step % 4 === 0 && inStep < 0.3) {
      const env = Math.exp(-inStep * 14);
      v += Math.sin(2 * Math.PI * (150 * Math.exp(-inStep * 10) + 42) * inStep) * env * 0.9;
    }
    v += Math.sin(2 * Math.PI * 49 * tt) * 0.22;
    v += Math.sin(2 * Math.PI * 220 * tt) * 0.1;
    if (inStep < 0.05) v += (Math.random() * 2 - 1) * 0.08 * Math.exp(-inStep * 60);
    L[i] = v; R[i] = v * 0.92 + Math.sin(2 * Math.PI * 330 * tt) * 0.06;
  }
  return { L, R };
}

const sig = makeSignal(8);

function newEngine() {
  const e = new AudioEngine();
  e.sr = SR; e.binHz = (SR / 2) / 512;
  e.setupLufs(SR); e.setupBeat();
  e.sourceKind = 'system'; e.nativeOn = true;
  return e;
}

function feedFrames(e, from, frames) {
  e.feed(sig.L.subarray(from, from + frames), sig.R.subarray(from, from + frames), frames);
}

function bench(label, fn, iters) {
  fn(); fn();                       // aquece
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < iters; i++) fn();
  const t1 = process.hrtime.bigint();
  return { label, us: Number(t1 - t0) / 1000 / iters };
}

console.log('=== MOTOR DE AUDIO ===');
console.log('sinal: 135bpm, 48kHz, painel ' + PANEL_W + 'x' + PANEL_H + ' @dpr' + DPR);

{
  const e = newEngine();
  let pos = 0;
  const CHUNK = 800;              // ~16.7ms de audio por quadro
  const r = bench('engine.update(dt) sem espectro', () => {
    feedFrames(e, pos, CHUNK); pos = (pos + CHUNK) % (sig.L.length - CHUNK - 1);
    e.update(1 / 60);
  }, 600);
  console.log('  update() por quadro: ' + r.us.toFixed(1) + ' us');
}
for (const N of [1024, 2048, 4096, 8192, 16384]) {
  const e = newEngine();
  let pos = 0; const CHUNK = 800;
  feedFrames(e, 0, 40000); e.update(1 / 60);
  const r = bench('spectrum ' + N, () => {
    e._frame = (e._frame || 0) + 1;
    e.spectrum(N);
  }, 400);
  console.log('  spectrum(' + N + '): ' + r.us.toFixed(1) + ' us');
}

/* ---------- custo dos modulos ---------- */
console.log('');
console.log('=== MODULOS: custo JS por quadro + chamadas de canvas ===');

const engine = newEngine();
{
  let pos = 0;
  for (let f = 0; f < 200; f++) { feedFrames(engine, pos, 800); pos += 800; engine.update(1 / 60); }
}

function makePanel(id) {
  const def = CV.registry[id];
  const canvas = makeEl('canvas');
  canvas.width = Math.round(PANEL_W * (def.webgl ? 1 : def.group === 'Estúdio' ? Math.min(def.buffered ? 1.5 : 2, DPR) : Math.min(1.25, DPR)));
  canvas.height = Math.round(PANEL_H * (def.webgl ? 1 : def.group === 'Estúdio' ? Math.min(def.buffered ? 1.5 : 2, DPR) : Math.min(1.25, DPR)));
  const m = {
    id: 'p' + id, modId: id, def, canvas,
    w: PANEL_W, h: PANEL_H, dpr: canvas.width / PANEL_W,
    s: Object.assign({}, def.defaults), st: {},
    mouse: { x: 0, y: 0, over: false }, el: makeEl('div')
  };
  if (!def.webgl) m.ctx = canvas.getContext('2d');
  def.init(m);
  return m;
}

const rows = [];
let posGlobal = 0;
for (const id of CV.order) {
  const def = CV.registry[id];
  const m = makePanel(id);
  // aquece 40 quadros (particulas nascem, historicos enchem)
  for (let f = 0; f < 40; f++) {
    feedFrames(engine, posGlobal, 800); posGlobal = (posGlobal + 800) % (sig.L.length - 900);
    engine.update(1 / 60);
    try { def.draw(m, engine, 1 / 60, f / 60); } catch (e) { }
  }
  function zero(c) { if (c && c._counts) for (const k in c._counts) c._counts[k] = 0; }
  zero(m.ctx);
  for (const k in m.st) { const o = m.st[k]; if (o && o._ctx) zero(o._ctx); }
  let t = 40 / 60;
  const ITER = 300;
  const t0 = process.hrtime.bigint();
  for (let f = 0; f < ITER; f++) {
    engine._frame = (engine._frame || 0) + 1;
    t += 1 / 60;
    try { def.draw(m, engine, 1 / 60, t); } catch (e) { }
  }
  const t1 = process.hrtime.bigint();
  const us = Number(t1 - t0) / 1000 / ITER;
  let calls = 0;
  if (m.ctx) for (const k in m.ctx._counts) calls += m.ctx._counts[k];
  // contexto offscreen (wavescroll/spectrogram usam)
  let offCalls = 0;
  for (const k in m.st) {
    const o = m.st[k];
    if (o && o._ctx && o._ctx._counts) { for (const kk in o._ctx._counts) offCalls += o._ctx._counts[kk]; }
  }
  const top = m.ctx ? Object.entries(m.ctx._counts).sort((a, b) => b[1] - a[1]).slice(0, 4)
    .map(([k, v]) => k + ':' + Math.round(v / ITER)).join(' ') : '(webgl)';
  rows.push({ id, name: def.name, group: def.group, gl: !!def.webgl, us,
    calls: Math.round(calls / ITER), off: Math.round(offCalls / ITER), top });
}

rows.sort((a, b) => b.us - a.us);
console.log('modulo'.padEnd(20) + 'grupo'.padEnd(10) + 'us/frame'.padStart(10) + 'chamadas'.padStart(10) + '  top ops');
for (const r of rows) {
  console.log(r.name.padEnd(20) + (r.gl ? 'WebGL' : r.group).padEnd(10) +
    r.us.toFixed(1).padStart(10) + String(r.calls + r.off).padStart(10) + '  ' + r.top);
}
const totalUs = rows.reduce((s, r) => s + r.us, 0);
const totalCalls = rows.reduce((s, r) => s + r.calls + r.off, 0);
console.log('');
console.log('TOTAL 16 modulos: ' + totalUs.toFixed(0) + ' us de JS por quadro (' +
  (totalUs / 16666 * 100).toFixed(1) + '% do orcamento de 60fps)');
console.log('TOTAL chamadas de canvas por quadro: ' + totalCalls);
console.log('(nota: WebGL nao roda aqui, entao psy/aurora contam ~0 no JS)');
