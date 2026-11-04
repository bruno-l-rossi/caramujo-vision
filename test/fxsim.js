/* WebGL2 de mentira pra rodar a passada de pós inteira sem placa de vídeo.

   Não desenha nada (não tem como): o que ele pega é o erro que aparece sem GPU
   nenhuma e derruba a imagem calado — uniforme que não existe no shader, número
   inválido indo pro shader, e qualquer exceção no caminho. É o mesmo espírito do
   contexto 2D falso que o smoke test usa nos 16 módulos. */
'use strict';

function makeGl(calls) {
  let uid = 1;
  const progU = new Map(), shaderSrc = new Map();
  const gl = {
    TEXTURE_2D: 1, RGBA8: 2, RGBA: 3, UNSIGNED_BYTE: 4, LINEAR: 5, NEAREST: 6, CLAMP_TO_EDGE: 7,
    TEXTURE_MIN_FILTER: 8, TEXTURE_MAG_FILTER: 9, TEXTURE_WRAP_S: 10, TEXTURE_WRAP_T: 11,
    FRAMEBUFFER: 12, COLOR_ATTACHMENT0: 13, ARRAY_BUFFER: 14, STATIC_DRAW: 15, FLOAT: 16,
    TRIANGLES: 17, COLOR_BUFFER_BIT: 18, VERTEX_SHADER: 19, FRAGMENT_SHADER: 20,
    COMPILE_STATUS: 21, LINK_STATUS: 22, ACTIVE_UNIFORMS: 23, TEXTURE0: 100, UNPACK_FLIP_Y_WEBGL: 24,
    createShader(t) { return { id: uid++, t }; },
    shaderSource(s, src) { shaderSrc.set(s, src); },
    compileShader() {}, getShaderParameter() { return true; }, getShaderInfoLog() { return ''; },
    createProgram() { return { id: uid++, sh: [] }; },
    attachShader(p, s) { p.sh.push(s); }, bindAttribLocation() {},
    linkProgram(p) {
      const u = [];
      p.sh.forEach((s) => {
        const src = shaderSrc.get(s) || '';
        (src.match(/uniform\s+\w+\s+([^;]+);/g) || []).forEach((d) => {
          d.replace(/uniform\s+\w+\s+/, '').replace(';', '').split(',').forEach((n) => {
            const nm = n.trim().split('[')[0];
            if (nm && u.indexOf(nm) < 0) u.push(nm);
          });
        });
      });
      progU.set(p, u);
    },
    getProgramParameter(p, k) { return k === 22 ? true : (progU.get(p) || []).length; },
    getActiveUniform(p, i) { return { name: (progU.get(p) || [])[i] }; },
    getUniformLocation(p, n) { return { p, n }; }, getProgramInfoLog() { return ''; },
    createVertexArray() { return {}; }, bindVertexArray() {}, createBuffer() { return {}; },
    bindBuffer() {}, bufferData() {}, enableVertexAttribArray() {}, vertexAttribPointer() {},
    createFramebuffer() { return {}; }, bindFramebuffer() {}, framebufferTexture2D() {},
    createTexture() { return { id: uid++ }; }, bindTexture() {},
    texImage2D() { calls.tex++; }, texSubImage2D() { calls.sub++; },
    texParameteri() {}, activeTexture() {}, pixelStorei() {}, deleteTexture() {},
    viewport() {}, clearColor() {}, clear() {}, useProgram() {},
    uniform1f(l, v) { if (!l) calls.nulos++; if (typeof v !== 'number' || isNaN(v)) calls.erros.push('numero invalido em ' + (l && l.n)); },
    uniform2f(l, a, b) { if (!l) calls.nulos++; if (isNaN(a) || isNaN(b)) calls.erros.push('numero invalido em ' + (l && l.n)); },
    uniform4f(l, a, b, c, d) { if (!l) calls.nulos++; if ([a, b, c, d].some((v) => typeof v !== 'number' || isNaN(v))) calls.erros.push('numero invalido em ' + (l && l.n)); },
    uniform1i(l) { if (!l) calls.nulos++; },
    drawArrays() { calls.draw++; }, finish() {}, getExtension() { return null; }
  };
  return gl;
}

/* roda 4 quadros com os 3 presets, mais uma gravação em 1080x1920 */
module.exports = function rodar(FX, mkCanvas) {
  const calls = { draw: 0, tex: 0, sub: 0, nulos: 0, erros: [] };
  const gl = makeGl(calls);
  try {
    const tela = FX.create({ width: 2880, height: 1800, getContext: () => gl });
    if (!tela) { calls.erros.push('FX.create devolveu nulo'); return calls; }
    const rects = [];
    for (let i = 0; i < 16; i++) {
      rects.push({
        key: 'p' + i, x: (i % 4) * 360, y: Math.floor(i / 4) * 225, w: 360, h: 225,
        dose: i % 3 === 0 ? 0 : 1, bg: [0.02, 0.02, 0.024],
        meter: i < 6 ? 1 : 0, light: i === 7 ? 1 : 0
      });
    }
    tela.setLayout(rects, 1440, 900);
    for (let f = 0; f < 4; f++) {
      rects.forEach((r) => tela.upload(r.key, mkCanvas(720, 450)));
      ['regua', 'prata', 'vidro'].forEach((preset) => {
        tela.render({
          w: 2880, h: 1800, cssW: 1440, cssH: 900, dpr: 2,
          preset: preset, amount: 1, energy: 0.8, time: f * 0.016, rects: rects, center: [0.5, 0.5]
        });
      });
    }
    tela.drop('p3');
    // gravação: instância própria, um painel só, centro do QUADRO
    const rec = FX.create({ width: 1080, height: 1920, getContext: () => gl });
    const rr = [{ key: 'rec', x: 0, y: 0, w: 540, h: 960, dose: 1, bg: [0.02, 0.02, 0.024], meter: 0, light: 0 }];
    rec.setLayout(rr, 540, 960);
    rec.upload('rec', mkCanvas(1080, 1920));
    rec.render({
      w: 1080, h: 1920, cssW: 540, cssH: 960, dpr: 2,
      preset: 'prata', amount: 1, energy: 1, time: 1, rects: rr, center: [0.5, 0.5]
    });
    rec.dispose();
  } catch (e) {
    calls.erros.push('caiu: ' + String(e && e.message || e));
  }
  return calls;
};
