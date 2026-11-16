/* v2.5: custo do zero-padding no espectro (Mid + Side por quadro). node test/bench5.js */
global.window = global;
require('../js/audio.js');
const sr = 48000, E = new AudioEngine(); E.sr = sr;
const x = new Float32Array(sr);
for (let i = 0; i < sr; i++) x[i] = 0.4 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.1 * (Math.random() - 0.5);
E.feed(x, x, sr, true); E.pos = E.wr;
function bench(fn, n) { for (let i = 0; i < 50; i++) fn(); const t = process.hrtime.bigint(); for (let i = 0; i < n; i++) fn(); return Number(process.hrtime.bigint() - t) / n / 1000; }
let f = 0;
[1, 2, 4].forEach((pad) => {
  const us = bench(() => { E._frame = ++f; E.spectrum(4096, undefined, pad); E.spectrumPw(4096, undefined, pad); E.spectrum(4096, 's', pad); }, 300);
  console.log('Mid+Side 4096 pad x' + pad + ': ' + us.toFixed(0) + ' us por quadro (' + (us / 8333 * 100).toFixed(1) + '% de um quadro a 120 Hz)');
});
