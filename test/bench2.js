/* Bench 2: gargalos especificos + a armadilha do espectro duplo */
'use strict';
const path = require('path');
const BASE = require('path').resolve(process.argv[2] || require('path').join(__dirname, '..'));
const g = globalThis;
g.window = g;
g.performance = { now: () => Number(process.hrtime.bigint() / 1000n) / 1000 };
require(path.join(BASE, 'js', 'audio.js'));
const AudioEngine = g.AudioEngine, FFT = g.CV_FFT;

const SR = 48000;
const L = new Float32Array(SR * 4), R = new Float32Array(SR * 4);
for (let i = 0; i < L.length; i++) {
  const t = i / SR;
  L[i] = Math.sin(2 * Math.PI * 49 * t) * 0.3 + Math.sin(2 * Math.PI * 220 * t) * 0.2 + (Math.random() * 2 - 1) * 0.05;
  R[i] = L[i] * 0.9;
}
function newE() {
  const e = new AudioEngine();
  e.sr = SR; e.binHz = (SR / 2) / 512; e.setupLufs(SR); e.setupBeat();
  e.sourceKind = 'system'; e.nativeOn = true;
  return e;
}
function bench(fn, iters) { fn(); fn(); const a = process.hrtime.bigint(); for (let i = 0; i < iters; i++) fn(); return Number(process.hrtime.bigint() - a) / 1000 / iters; }

console.log('=== DENTRO DO engine.update() ===');
{
  const e = newE(); let p = 0;
  const C = 800;
  console.log('  feed(800 amostras)      : ' + bench(() => { e.feed(L.subarray(p, p + C), R.subarray(p, p + C), C); p = (p + C) % (L.length - C); }, 2000).toFixed(1) + ' us');
}
{
  const e = newE(); e.feed(L, R, L.length);
  let from = 0;
  console.log('  processLufs(800)        : ' + bench(() => { e.processLufs(from, from + 800); from = (from + 800) % (L.length - 900); }, 2000).toFixed(1) + ' us');
}
{
  const e = newE(); e.feed(L, R, L.length);
  let from = 0;
  console.log('  processBeat(800)        : ' + bench(() => { e.processBeat(from, from + 800); from = (from + 800) % (L.length - 900); }, 2000).toFixed(1) + ' us');
}
{
  const e = newE(); e.feed(L, R, L.length);
  console.log('  FFT 1024 (freq/quadro)  : ' + bench(() => e.fft.runRing(e.time, e.time.length), 3000).toFixed(1) + ' us');
}
{
  const e = newE(); e.feed(L, R, L.length);
  console.log('  copia time/timeL/timeR  : ' + bench(() => {
    const mask = 32767, t = e.time, n2 = t.length, base = (e.wr - n2) & mask;
    for (let i = 0; i < n2; i++) { const k = (base + i) & mask; t[i] = (e.ringL[k] + e.ringR[k]) * 0.5; }
    const nl = e.timeL.length, bl = (e.wr - nl) & mask;
    for (let i = 0; i < nl; i++) { const k2 = (bl + i) & mask; e.timeL[i] = e.ringL[k2]; e.timeR[i] = e.ringR[k2]; }
  }, 3000).toFixed(1) + ' us');
}

console.log('');
console.log('=== 2 espectros com FFT diferente (era a armadilha) ===');
console.log('  (o cache guarda uma caixa por TAMANHO: cada FFT nasce uma vez e nao e mais realocada)');
for (const n of [4096, 8192, 16384]) {
  console.log('  new FFT(' + n + ') do zero  : ' + bench(() => { new FFT(n); }, 200).toFixed(1) + ' us');
}
{
  const e = newE(); e.feed(L, R, L.length);
  let f = 0;
  const alt = bench(() => { e._frame = ++f; e.spectrum(4096); e._frame = f; e.spectrum(8192); }, 200);
  const same = bench(() => { e._frame = ++f; e.spectrum(4096); e._frame = f; e.spectrum(4096); }, 400);
  const only4 = bench(() => { e._frame = ++f; e.spectrum(4096); }, 400);
  const only8 = bench(() => { e._frame = ++f; e.spectrum(8192); }, 400);
  const piso = only4 + only8;
  console.log('  2 paineis, MESMO tamanho: ' + same.toFixed(1) + ' us/quadro (cache quente no 2o)');
  console.log('  2 paineis, tamanho DIF. : ' + alt.toFixed(1) + ' us/quadro');
  console.log('  piso teorico (4096+8192): ' + piso.toFixed(1) + ' us/quadro');
  const waste = alt - piso;
  console.log('  desperdicio de tabela    : ' + waste.toFixed(1) + ' us  ' +
    (waste < 30 ? '<<< OK, a FFT nasce uma vez so' : '<<< AINDA REALOCANDO'));
}

console.log('');
console.log('=== ENXAME: os fios sao O(n2) ===');
for (const dens of [0.5, 1, 1.5, 2]) {
  const n = Math.round(90 * dens);
  console.log('  densidade ' + dens + ' -> ' + n + ' nos = ' + (n * (n - 1) / 2) + ' pares testados/quadro, ate ' + (n * (n - 1) / 2 * 2) + ' chamadas de path');
}

console.log('');
console.log('=== ORCAMENTO DE QUADRO ===');
const budgets = [[60, 16.67], [90, 11.1], [120, 8.33]];
for (const [fps, ms] of budgets) console.log('  ' + fps + 'fps = ' + ms + ' ms por quadro (CPU + GPU + composicao)');
