/* Bench 3: orcamento de PIXEL (fill rate) e de CAMADAS.
   O JS ja e barato; o custo mora aqui. */
'use strict';
const path = require('path');
const BASE = require('path').resolve(process.argv[2] || require('path').join(__dirname, '..'));
const g = globalThis;
g.window = g;
// stubs minimos so pro modules.js carregar
g.document = { createElement: () => ({ getContext: () => null, width: 2, height: 2 }) };
require(path.join(BASE, 'js', 'modules.js'));
const CV = g.CV;

const WIN_W = 1440, WIN_H = 900, DPR = 2;

// DEFAULT_LAYOUT do app.js (grade 240x200)
const LAYOUT = [
  ['spectrum', 80, 40], ['wavescroll', 80, 40], ['loudness', 20, 40], ['gonio', 60, 40],
  ['scope', 80, 40], ['spectrogram', 80, 40], ['psy', 80, 80], ['flow', 80, 80],
  ['aurora', 80, 80], ['enxame', 80, 80], ['malha', 80, 80], ['lissa', 80, 80],
  ['trace', 160, 40], ['cordas', 80, 40], ['wavelayers', 160, 60], ['silk', 80, 60]
];
// modulos que pintam a tela INTEIRA todo quadro (rastro = fillRect de tela cheia)
const TRAIL = new Set(['gonio', 'scope', 'lissa', 'trace', 'flow', 'silk', 'enxame']);
const BUFFERED = new Set(['wavescroll', 'spectrogram']);

function dprCap(def, artCap) {
  if (def.webgl) return artCap.gl;
  if (def.group === 'Estúdio') return def.buffered ? 1.5 : 2;
  return artCap.art;
}

function report(name, artCap) {
  // area proporcional: soma das celulas / soma total, aplicada a janela
  let cells = 0;
  for (const [, w, h] of LAYOUT) cells += w * h;
  let drawPx = 0, texUploadPx = 0, layers = 0;
  const lines = [];
  for (const [id, gw, gh] of LAYOUT) {
    const def = CV.registry[id];
    const frac = (gw * gh) / cells;
    const cssArea = WIN_W * WIN_H * frac;
    const cap = Math.min(dprCap(def, artCap), DPR);
    const px = cssArea * cap * cap;
    let passes = 1;
    if (TRAIL.has(id)) passes += 1;                 // fillRect de tela cheia + o desenho
    if (BUFFERED.has(id)) passes += 2;              // escreve no offscreen + 2 drawImage de blit
    drawPx += px * passes;
    texUploadPx += px;                              // o compositor sobe a textura do painel
    layers++;
    lines.push([def.name, cap, Math.round(px / 1000), passes]);
  }
  console.log('--- ' + name + ' ---');
  console.log('  camadas de canvas compostas por quadro : ' + layers);
  console.log('  pixels DESENHADOS por quadro           : ' + (drawPx / 1e6).toFixed(1) + ' Mpx');
  console.log('  pixels SUBIDOS pro compositor          : ' + (texUploadPx / 1e6).toFixed(1) + ' Mpx');
  console.log('  a 60fps                                : ' + (drawPx * 60 / 1e9).toFixed(2) + ' Gpx/s de fill');
  return drawPx;
}

console.log('=== ORCAMENTO DE PIXEL: janela ' + WIN_W + 'x' + WIN_H + ' em tela Retina (dpr ' + DPR + '), 16 modulos ===');
console.log('');
const hoje = report('HOJE (arte 1.25x, shader 1x)', { art: 1.25, gl: 1 });
console.log('');
const nativo = report('SE TUDO FOSSE NATIVO (arte 2x, shader 2x)', { art: 2, gl: 2 });
console.log('');
const meio = report('MEIO TERMO (arte 2x, shader 1.5x)', { art: 2, gl: 1.5 });
console.log('');
console.log('  nativo custa ' + (nativo / hoje).toFixed(2) + 'x o de hoje');
console.log('  meio termo custa ' + (meio / hoje).toFixed(2) + 'x o de hoje');
console.log('');
console.log('=== O QUE A ARTE PERDE HOJE ===');
console.log('  shader (psy/aurora): renderiza a ' + (1 / DPR * 100).toFixed(0) + '% da resolucao da tela e o');
console.log('    compositor estica ' + DPR + 'x. Toda borda vira degrade de 2px.');
console.log('  arte canvas       : renderiza a ' + (1.25 / DPR * 100).toFixed(0) + '% e estica ' + (DPR / 1.25).toFixed(2) + 'x.');
console.log('  gravacao          : captureStream pega os pixels DO CANVAS, entao o clipe sai');
console.log('    na resolucao reduzida. Painel de 720x1280 css grava em ' + Math.round(720 * 1.25) + 'x' + Math.round(1280 * 1.25) + ' (arte)');
console.log('    ou ' + 720 + 'x' + 1280 + ' (shader). Reels pede 1080x1920.');
console.log('');
console.log('=== CUSTO DE UM POST-PROCESSING FULLSCREEN (bloom+grao+aberracao+dither+tonemap) ===');
const full = WIN_W * DPR * WIN_H * DPR;
const bloomPx = full * 0.0625 * 3;   // 1/4 de escala nos dois eixos, 3 passes (threshold + 2 blur)
const compPx = full;                 // composicao final
console.log('  tela cheia @dpr2      : ' + (full / 1e6).toFixed(1) + ' Mpx');
console.log('  bloom em 1/4 de escala: ' + (bloomPx / 1e6).toFixed(2) + ' Mpx (3 passes)');
console.log('  composicao final      : ' + (compPx / 1e6).toFixed(1) + ' Mpx');
console.log('  TOTAL do post         : ' + ((bloomPx + compPx) / 1e6).toFixed(1) + ' Mpx/quadro = ' +
  (((bloomPx + compPx) / hoje) * 100).toFixed(0) + '% do que a tela ja desenha hoje');
