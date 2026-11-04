/* Caramujo Vision — js/fx.js : a passada de pós-produção (ETAPA 3)

   UMA passada na placa de vídeo por cima de tudo. Os 16 painéis continuam
   desenhando exatamente como sempre; eles viram FONTE, não saída. Cada painel
   sobe pra uma textura própria, os 16 são montados numa imagem só do tamanho da
   tela, e aí roda a passada.

   As três direções (RÉGUA, PRATA, VIDRO) são O MESMO CÓDIGO com vetores de
   número diferentes. Não são três implementações.

   A ORDEM DOS ESTÁGIOS NÃO SE MEXE:
     1 acúmulo de quadros   2 halação   3 curva de cor   4 aberração
     5 grão   6 vinheta   7 pontilhado  ← sempre por último
   O pontilhado é o último de propósito: ele quebra a faixa que a curva de cor
   acabou de criar. Se vier antes, a curva refaz a banda. */

(function () {
  'use strict';

  var FX = window.FX = {};

  /* ---------------- os três presets ----------------
     Nada aqui é chute: são os números que rodaram nos mockups da direção.
     radPct = % da ALTURA do painel · sizePx e ab = px de CSS (multiplica dpr)
     dither = LSB (1/255) · hz = taxa de troca do padrão de grão */
  FX.PRESETS = {
    regua: {
      dither: 1.0,
      bloom:  { thr: 0.88, radPct: 1.2, amt: 0.12, tint: 'baixo', warm: 0.00 },
      curve:  { knee: 0.94, lift: 0.000, con: 1.00 },
      grain:  { amt: 0.015, sizePx: 1.0, hz: 0,  env: 'flat' },
      ab: 0.00,
      blur:   { frames: 0, w: [1, 0.35] },
      vig: 0.06,
      meter:  { bloom: 1.0, grain: 1.0, ab: 1.0, blur: 1.0, vig: 1.0, curve: 1.0 }
    },
    prata: {
      dither: 1.5,
      bloom:  { thr: 0.86, radPct: 2.8, amt: 0.30, tint: 'baixo', warm: 0.08 },
      curve:  { knee: 0.82, lift: 0.010, con: 1.12 },
      grain:  { amt: 0.032, sizePx: 1.4, hz: 14, env: 'meio' },
      ab: 0.35,
      blur:   { frames: 2, w: [1, 0.28] },
      vig: 0.14,
      meter:  { bloom: 0.50, grain: 0.35, ab: 0.0, blur: 0.0, vig: 0.60, curve: 0.60 }
    },
    vidro: {
      dither: 1.0,
      bloom:  { thr: 0.70, radPct: 5.5, amt: 0.45, tint: 'branco', warm: 0.00 },
      curve:  { knee: 0.76, lift: 0.004, con: 1.06 },
      grain:  { amt: 0.020, sizePx: 1.0, hz: 12, env: 'flat' },
      ab: 0.60,
      blur:   { frames: 2, w: [1, 0.35] },
      vig: 0.22,
      meter:  { bloom: 0.35, grain: 0.50, ab: 0.0, blur: 0.0, vig: 0.50, curve: 1.0 }
    }
  };
  FX.LIST = [['regua', 'RÉGUA'], ['prata', 'PRATA'], ['vidro', 'VIDRO'], ['off', 'OFF']];
  /* v2: o acabamento nasce DESLIGADO. Medidor não precisa de luz de cinema e a
     passada custa placa de vídeo o tempo todo; quem quer, liga em Ajustes › Aparência. */
  FX.DEFAULT = { preset: 'off', amount: 0.8 };
  // a ordem, escrita uma vez, pra bater com o shader e com o teste
  FX.STAGES = ['acumulo', 'halacao', 'curva', 'aberracao', 'grao', 'vinheta', 'pontilhado'];

  /* PIVÔ DA CURVA. Em fundo escuro ele mora no FUNDO do painel (0.02), não no
     meio-tom: é o que faz o preto ABRIR em vez de fechar. Em fundo claro o pivô
     sobe pro branco do papel, senão o termo de contraste joga o papel acima de 1
     e o branco estoura chapado (o oposto do "o branco do papel fica firme"). */
  var PIV_DARK = 0.02, PIV_LIGHT = 0.90;

  /* A CURVA DE COR EM JAVASCRIPT: a MESMA conta que roda no shader.
     Existe pra bancada e pro smoke test conferirem o número sem abrir o app.
     O PISO (lift) VEM DEPOIS DA CURVA. Isso não é detalhe, é o conserto de um
     bug: com o piso antes, o contraste puxa tudo que está abaixo do pivô pra
     baixo e o fundo #050506 bate em zero, sem degradê nenhum pro pontilhado
     quebrar. */
  FX.curve = function (v, cv, light, k) {
    if (k === undefined) k = 1;
    var piv = light ? PIV_LIGHT : PIV_DARK;
    var o = (v - piv) * cv.con + piv;
    if (light) {
      // o joelho passa a valer pra SOMBRA: quem rola é o preto
      var kl = 1 - cv.knee;
      if (o < kl && kl > 0) o = kl - kl * Math.tanh((kl - o) / kl);
    } else {
      if (o > cv.knee) o = cv.knee + (1 - cv.knee) * Math.tanh((o - cv.knee) / (1 - cv.knee));
    }
    if (o < 0) o = 0;
    o = cv.lift + (1 - cv.lift) * o;
    return v + (o - v) * k;
  };

  /* ---------------- os shaders ---------------- */
  var VS_QUAD = [
    '#version 300 es',
    'in vec2 a_pos;',            // 0..1
    'uniform vec4 u_rect;',      // x, y, w, h em 0..1 do alvo
    'out vec2 v_uv;',
    'void main(){',
    '  v_uv = a_pos;',
    '  vec2 p = u_rect.xy + a_pos * u_rect.zw;',
    '  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);',
    '}'
  ].join('\n');

  var HEAD = [
    '#version 300 es',
    'precision highp float;',
    'precision highp sampler2D;',
    'in vec2 v_uv;',
    'out vec4 outColor;'
  ].join('\n');

  // ruído barato e estável: nada de textura pra carregar
  var NOISE = [
    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',
    'float hash31(vec2 p, float s){ return hash21(p + vec2(s * 0.7071, s * 1.3319)); }'
  ].join('\n');

  /* O painel entra na imagem JÁ EM CIMA DO FUNDO DELE. Alguns visuais desenham
     em cima de transparência e deixam o fundo por conta do CSS (a onda rolante e
     o espectrograma fazem isso). Sem esta mistura, o pós não pegaria justamente o
     fundo #050506, que é onde o pontilhado e o piso do preto trabalham. */
  var FS_BLIT = HEAD + '\n' + [
    'uniform sampler2D u_tex;',
    'uniform vec4 u_bg;',
    'void main(){',
    '  vec4 c = texture(u_tex, v_uv);',
    '  outColor = vec4(mix(u_bg.rgb, c.rgb, c.a), max(c.a, u_bg.a));',
    '}'
  ].join('\n');

  /* 2. HALAÇÃO, prepasse em 1/3 de resolução: limiar na luminância, joelho
     quadrático, raio curto. Halação, não bloom largo: é o que engrossa a linha
     de 1px em vez de comer ela. */
  var FS_THRESH = HEAD + '\n' + [
    'uniform sampler2D u_img, u_mask;',
    'uniform float u_thr, u_warm, u_tintWhite;',
    'void main(){',
    '  vec4 s = texture(u_img, v_uv);',
    '  vec3 mk = texture(u_mask, v_uv).rgb;',
    '  float light = step(0.5, mk.b);',
    '  float L = dot(s.rgb, vec3(0.299, 0.587, 0.114));',
    '  float lum = mix(L, 1.0 - L, light);',           // fundo claro: o limiar olha a ESCURIDÃO
    '  float t = clamp((lum - u_thr) / max(1e-4, 1.0 - u_thr), 0.0, 1.0);  t = t * t;',
    '  vec3 layer = mix(mix(s.rgb, vec3(1.0), u_tintWhite) * t, (vec3(1.0) - s.rgb) * t, light);',
    '  if (u_warm > 0.0) layer *= vec3(1.0 + u_warm * 1.6, 1.0 + u_warm * 0.4, 1.0 - u_warm * 1.2);',
    '  outColor = vec4(layer * s.a * mk.r, 1.0);',     // painel com pós em zero não acende nada
    '}'
  ].join('\n');

  var FS_BLUR = HEAD + '\n' + [
    'uniform sampler2D u_tex;',
    'uniform vec2 u_step;',                            // direção × passo, em uv
    'void main(){',
    '  vec3 c = texture(u_tex, v_uv).rgb * 0.2270270;',
    '  c += (texture(u_tex, v_uv + u_step * 1.3846).rgb + texture(u_tex, v_uv - u_step * 1.3846).rgb) * 0.3162162;',
    '  c += (texture(u_tex, v_uv + u_step * 3.2307).rgb + texture(u_tex, v_uv - u_step * 3.2307).rgb) * 0.0702702;',
    '  outColor = vec4(c, 1.0);',
    '}'
  ].join('\n');

  /* 1. ACÚMULO DE QUADROS: média ponderada sequencial, NUNCA soma. Soma estoura
     o branco; média deixa o rastro na medida. Zero no medidor, sempre: acúmulo
     mistura o passado com o agora e come o transiente, que é o motivo de existir
     o medidor. O pico-hold já é a memória honesta do painel. */
  var FS_ACCUM = HEAD + '\n' + [
    'uniform sampler2D u_src, u_h1, u_h2, u_mask;',
    'uniform float u_w1, u_w2, u_amount, u_mBlur;',
    'void main(){',
    '  vec4 s = texture(u_src, v_uv);',
    '  vec3 mk = texture(u_mask, v_uv).rgb;',
    '  float k = mk.r * u_amount * mix(1.0, u_mBlur, mk.g);',
    '  vec3 res = s.rgb;',
    // medidor tem borrão zero: ali não se lê o passado, sai direto
    '  if (k > 0.001) {',
    '    float acc = 1.0;',
    '    acc += u_w1;  res = mix(res, texture(u_h1, v_uv).rgb, min(0.7, u_w1 / acc * k));',
    '    acc += u_w2;  res = mix(res, texture(u_h2, v_uv).rgb, min(0.7, u_w2 / acc * k));',
    '  }',
    '  outColor = vec4(res, s.a);',
    '}'
  ].join('\n');

  /* A PASSADA DE COMPOSIÇÃO: estágios 2 a 7 num shader só.
     A aberração desloca R e B; a curva é por canal e pontual, então aplicar a
     curva depois das 3 amostras dá exatamente o mesmo resultado de curva-e-
     depois-aberração, com um passe a menos. */
  var FS_COMP = HEAD + '\n' + NOISE + '\n' + [
    'uniform sampler2D u_img, u_bloom, u_mask;',
    'uniform vec2 u_res, u_center;',
    'uniform float u_amount, u_energy, u_time, u_dpr;',
    'uniform float u_bloomAmt, u_knee, u_lift, u_con;',
    'uniform float u_grainAmt, u_grainSize, u_grainHz, u_grainEnv;',
    'uniform float u_ab, u_vig, u_dither;',
    'uniform float u_mBloom, u_mGrain, u_mAb, u_mVig, u_mCurve;',
    '',
    'float curveCh(float v, float light, float k){',
    '  float piv = mix(' + PIV_DARK.toFixed(3) + ', ' + PIV_LIGHT.toFixed(3) + ', light);',
    '  float o = (v - piv) * u_con + piv;',
    '  float kl = 1.0 - u_knee;',
    '  float lo = (o < kl && kl > 0.0) ? kl - kl * tanh((kl - o) / max(1e-5, kl)) : o;',
    '  float hi = (o > u_knee) ? u_knee + (1.0 - u_knee) * tanh((o - u_knee) / max(1e-5, 1.0 - u_knee)) : o;',
    '  o = mix(hi, lo, light);',
    '  o = max(o, 0.0);',
    '  o = u_lift + (1.0 - u_lift) * o;',   // ← o piso vem DEPOIS da curva
    '  return mix(v, o, k);',
    '}',
    '',
    'void main(){',
    '  vec3 mk = texture(u_mask, v_uv).rgb;',
    '  float dose = mk.r * u_amount;',
    '  float met = mk.g;',
    '  float light = step(0.5, mk.b);',
    /* MEDIDOR NUNCA CEDE: cada preset traz o vetor meter. Aberração e borrão são
       ZERO nos seis medidores em todas as direções. Meio pixel de aberração num
       texto mono de 9px vira franja colorida e desloca a leitura de Hz: ou é
       zero, ou o instrumento mente. */
    '  float kBloom = dose * mix(1.0, u_mBloom, met) * u_energy;',
    '  float kGrain = dose * mix(1.0, u_mGrain, met) * u_energy;',
    '  float kAb    = dose * mix(1.0, u_mAb,    met);',
    '  float kVig   = dose * mix(1.0, u_mVig,   met);',
    '  float kCur   = dose * mix(1.0, u_mCurve, met);',
    '',
    /* 4. ABERRAÇÃO CROMÁTICA radial. O centro é o da TELA (ou o do QUADRO, na
       gravação): é isso que faz a tela ler como uma peça só em vez de 16 fotos
       coladas. */
    '  vec2 d = v_uv - u_center;',
    '  float r2max = max(1e-6, dot(max(u_center, 1.0 - u_center), max(u_center, 1.0 - u_center)));',
    '  float p = pow(clamp(dot(d, d) / r2max, 0.0, 1.0), 1.05);',
    '  vec2 dir = (dot(d, d) > 1e-9) ? normalize(d) : vec2(0.0);',
    '  vec2 off = dir * (u_ab * kAb * u_dpr * p) / u_res;',
    '',
    /* sem aberração (todo medidor, e a RÉGUA inteira) são 2 leituras por pixel
       em vez de 6. O desvio é o mesmo pra imagem e pra halação: a lente desloca
       tudo junto. */
    '  vec4 sG = texture(u_img, v_uv);',
    '  vec3 col = sG.rgb;',
    '  float cov = sG.a;',
    '  bool temAb = dot(off, off) > 1e-12;',
    '  if (temAb) col = vec3(texture(u_img, v_uv + off).r, col.g, texture(u_img, v_uv - off).b);',
    '',
    /* 2. composição da halação: soma de luz em fundo escuro, sangria de tinta
       (multiply) em fundo claro, e ali a dose cai pra 70%. */
    '  vec3 bl = texture(u_bloom, v_uv).rgb;',
    '  if (temAb) bl = vec3(texture(u_bloom, v_uv + off).r, bl.g, texture(u_bloom, v_uv - off).b);',
    '  bl *= u_bloomAmt * kBloom;',
    '  col = mix(col + bl, col * clamp(1.0 - bl * 0.7, 0.0, 1.0), light);',
    '',
    '  col = vec3(curveCh(col.r, light, kCur), curveCh(col.g, light, kCur), curveCh(col.b, light, kCur));',
    '',
    /* 5. GRÃO monocromático. O envelope é o que faz a PRATA funcionar: o grão
       vive no meio-tom e morre no preto puro, então o fundo #050506 fica limpo.
       O padrão troca a hz vezes por segundo (não por quadro): a 14 Hz ele troca
       a cada ~4 quadros e parece emulsão, não chuvisco de TV. */
    '  float L = dot(col, vec3(0.299, 0.587, 0.114));',
    '  float env = mix(1.0, pow(clamp(4.0 * L * (1.0 - L), 0.0, 1.0), 0.7), u_grainEnv);',
    '  float cell = max(1.0, floor(u_grainSize * u_dpr + 0.5));',
    '  float n = (hash31(floor(gl_FragCoord.xy / cell), floor(u_time * u_grainHz)) - 0.5) * 2.0 * u_grainAmt * env * kGrain;',
    '  col = mix(col + n, col * (1.0 + n * 1.275), light);',
    '',
    /* 6. VINHETA. Em fundo claro cai pra 60% e escurece pro QUENTE: vinheta fria
       em papel parece defeito de scanner. */
    '  float vg = u_vig * mix(1.0, 0.6, light) * kVig;',
    '  float f = 1.0 - vg * p;',
    '  col *= f;',
    '  col.b *= mix(1.0, 1.0 - vg * p * 0.12, light);',
    '',
    /* 7. PONTILHADO, ruído triangular, UMA vez, na saída. É ele que mata a faixa
       que todo degradê escuro em #050506 cria hoje. */
    '  float n1 = hash21(gl_FragCoord.xy + vec2(u_time * 13.0, 7.0));',
    '  float n2 = hash21(gl_FragCoord.xy + vec2(3.0, u_time * 11.0) + 17.3);',
    '  col += (n1 - n2) * (u_dither * dose) / 255.0;',
    '',
    '  outColor = vec4(col * cov, cov);',
    '}'
  ].join('\n');

  /* os shaders ficam visíveis pro teste: um nome de uniforme escrito errado não
     quebra nada em tempo de execução (o WebGL ignora calado) e some da imagem */
  FX.SHADERS = { vs: VS_QUAD, blit: FS_BLIT, thresh: FS_THRESH, blur: FS_BLUR, accum: FS_ACCUM, comp: FS_COMP };

  /* ---------------- fábrica ---------------- */
  function compile(gl, type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.error('[fx] shader:', gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  }
  function program(gl, fs) {
    var v = compile(gl, gl.VERTEX_SHADER, VS_QUAD), f = compile(gl, gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    var p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    gl.bindAttribLocation(p, 0, 'a_pos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) { console.error('[fx] link:', gl.getProgramInfoLog(p)); return null; }
    var u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (var i = 0; i < n; i++) { var nm = gl.getActiveUniform(p, i).name.replace('[0]', ''); u[nm] = gl.getUniformLocation(p, nm); }
    return { p: p, u: u };
  }
  function tex(gl, w, h, linear) {
    var t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, Math.max(1, w), Math.max(1, h), 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, linear === false ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, linear === false ? gl.NEAREST : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  }

  /* Uma instância = um alvo. A tela usa uma; a gravação cria a sua, no tamanho
     exato do clipe, e some quando você aperta o ● de novo. */
  FX.create = function (canvas) {
    var gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: true, preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
    } catch (e) { gl = null; }
    if (!gl) return null;

    var P = {
      blit: program(gl, FS_BLIT), thresh: program(gl, FS_THRESH), blur: program(gl, FS_BLUR),
      accum: program(gl, FS_ACCUM), comp: program(gl, FS_COMP)
    };
    if (!P.blit || !P.thresh || !P.blur || !P.accum || !P.comp) return null;

    var vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    var vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    var fbo = gl.createFramebuffer();
    var S = {
      w: 0, h: 0, bw: 0, bh: 0,
      /* ANEL DE 3 IMAGENS em vez de copiar quadro. A imagem montada é refeita do
         zero todo quadro a partir das texturas dos painéis, então dá pra girar
         qual das três é a "de agora" e as outras duas já são o passado. Zero
         cópia de tela cheia por quadro. */
      ring: [null, null, null], ri: 0,
      accum: null, bloomA: null, bloomB: null,
      mask: gl.createTexture(), maskCv: null,
      panelTex: {},          // uma textura por painel
      panelH: 200            // altura média do painel: o raio da halação sai daqui
    };
    gl.bindTexture(gl.TEXTURE_2D, S.mask);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    function alloc(w, h) {
      if (S.w === w && S.h === h) return;
      S.ring.concat([S.accum, S.bloomA, S.bloomB]).forEach(function (t) { if (t) gl.deleteTexture(t); });
      S.w = w; S.h = h;
      S.bw = Math.max(2, Math.round(w / 3)); S.bh = Math.max(2, Math.round(h / 3));
      S.ring = [tex(gl, w, h), tex(gl, w, h), tex(gl, w, h)];
      S.accum = tex(gl, w, h);
      S.bloomA = tex(gl, S.bw, S.bh); S.bloomB = tex(gl, S.bw, S.bh);
    }
    function target(t, w, h) {
      if (t) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }
      gl.viewport(0, 0, w, h);
    }
    function use(pr, rect) {
      gl.useProgram(pr.p);
      gl.uniform4f(pr.u.u_rect, rect ? rect[0] : 0, rect ? rect[1] : 0, rect ? rect[2] : 1, rect ? rect[3] : 1);
      return pr.u;
    }
    function bind(u, name, t, unit) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, t);
      if (u[name]) gl.uniform1i(u[name], unit);
    }
    function draw() { gl.drawArrays(gl.TRIANGLES, 0, 6); }
    function novaTex(srcCanvas) {
      var nt = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, nt);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
      return nt;
    }

    /* MÁSCARA DE DOSE, em 1/8 de resolução, refeita só quando o layout muda.
       Um mecanismo só resolve três coisas: intensidade por visual, por template
       e a dose do medidor.
         canal R = intensidade do pós daquele painel
         canal G = 1 se for medidor
         canal B = 1 se o fundo daquele painel for claro
       A borda sai com degradê natural: em 1/8 de resolução, com filtro linear,
       a fronteira entre um medidor e uma arte vira uma transição de ~8px em vez
       de um corte visível. */
    var inst = {
      gl: gl,
      setLayout: function (rects, cssW, cssH) {
        var mw = Math.max(2, Math.round(cssW / 8)), mh = Math.max(2, Math.round(cssH / 8));
        var cv = S.maskCv;
        if (!cv || cv.width !== mw || cv.height !== mh) {
          cv = S.maskCv = document.createElement('canvas');
          cv.width = mw; cv.height = mh;
        }
        var c = cv.getContext('2d');
        c.clearRect(0, 0, mw, mh);
        var soma = 0, n = 0;
        rects.forEach(function (r) {
          var x = r.x / 8, y = r.y / 8, w = Math.max(1, r.w / 8), h = Math.max(1, r.h / 8);
          c.fillStyle = 'rgba(' + Math.round(Math.max(0, Math.min(1, r.dose)) * 255) + ',' +
            (r.meter ? 255 : 0) + ',' + (r.light ? 255 : 0) + ',255)';
          c.fillRect(x, y, w, h);
          soma += r.h; n++;
        });
        S.panelH = n ? soma / n : cssH;
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, S.mask);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, cv);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      },

      /* O DESENHO DE UM PAINEL SOBE PRA TEXTURA PRÓPRIA DELE.
         DUAS TEXTURAS POR PAINEL, alternadas. A bancada mostrou onde o tempo
         some: o upload em si é barato (0,4 ms os 16), mas quando a passada está
         rodando ele salta pra 2,2 ms. Não é o upload que ficou caro, é o
         processador PARANDO pra esperar a placa terminar de ler aquela mesma
         textura na passada do quadro anterior. Escrevendo numa textura e lendo
         da outra, ninguém espera ninguém.
         Painel que não redesenhou não sobe de novo, e a passada continua lendo a
         última que subiu. */
      upload: function (key, srcCanvas) {
        var t = S.panelTex[key];
        var w = srcCanvas.width, h = srcCanvas.height;
        if (!w || !h) return;
        // sempre na unidade 0: o upload não pode pisar numa textura que uma
        // passada vai usar daqui a pouco (a máscara mora na unidade 2 ou 3)
        gl.activeTexture(gl.TEXTURE0);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        if (!t || t.w !== w || t.h !== h) {
          if (t) { gl.deleteTexture(t.a); gl.deleteTexture(t.b); }
          t = S.panelTex[key] = { a: novaTex(srcCanvas), b: novaTex(srcCanvas), w: w, h: h, cur: 0 };
        } else {
          t.cur ^= 1;
          gl.bindTexture(gl.TEXTURE_2D, t.cur ? t.b : t.a);
          gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, srcCanvas);
        }
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      },
      drop: function (key) {
        var t = S.panelTex[key];
        if (t) { gl.deleteTexture(t.a); gl.deleteTexture(t.b); delete S.panelTex[key]; }
      },

      /* A PASSADA. o = { w, h, dpr, preset, amount, energy, time, rects, center } */
      render: function (o) {
        var pr = FX.PRESETS[o.preset];
        if (!pr) return;
        var W = Math.max(2, Math.round(o.w)), H = Math.max(2, Math.round(o.h));
        alloc(W, H);
        var u, cssW = o.cssW || W, cssH = o.cssH || H;

        // gira o anel: a imagem de agora entra numa das três, as outras duas são o passado
        S.ri = (S.ri + 1) % 3;
        var src = S.ring[S.ri], h1 = S.ring[(S.ri + 2) % 3], h2 = S.ring[(S.ri + 1) % 3];

        // monta os 16 painéis numa imagem só (cada um no retângulo dele)
        target(src, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        u = use(P.blit);
        for (var i = 0; i < o.rects.length; i++) {
          var r = o.rects[i], t = S.panelTex[r.key];
          if (!t) continue;
          // y do OpenGL cresce pra cima: o topo do painel na tela vira a base aqui
          gl.uniform4f(P.blit.u.u_rect, r.x / cssW, 1 - (r.y + r.h) / cssH, r.w / cssW, r.h / cssH);
          var bg = r.bg || [0, 0, 0];
          gl.uniform4f(u.u_bg, bg[0], bg[1], bg[2], 1);
          bind(u, 'u_tex', t.cur ? t.b : t.a, 0);
          draw();
        }

        /* 1. ACÚMULO. Só roda se a direção pede rastro (na RÉGUA são 0 quadros,
           então a passada inteira some daqui). */
        var img = src;
        if (pr.blur.frames > 0 && o.amount > 0) {
          var w1 = pr.blur.w[1], w2 = pr.blur.frames > 1 ? w1 * w1 : 0;
          target(S.accum, W, H);
          u = use(P.accum);
          gl.uniform1f(u.u_w1, w1); gl.uniform1f(u.u_w2, w2);
          gl.uniform1f(u.u_amount, o.amount); gl.uniform1f(u.u_mBlur, pr.meter.blur);
          bind(u, 'u_src', src, 0); bind(u, 'u_h1', h1, 1);
          bind(u, 'u_h2', h2, 2); bind(u, 'u_mask', S.mask, 3);
          draw();
          img = S.accum;
        }

        /* 2. HALAÇÃO: limiar em 1/3 de resolução + desfoque separável.
           sigma = radPct% da ALTURA DO PAINEL × 0.55. Dois pares de passes: um
           par só trunca o rabo do desfoque e a halação vira um anel duro. */
        var sigma = pr.bloom.radPct / 100 * S.panelH * (o.dpr || 1) * 0.55;
        target(S.bloomA, S.bw, S.bh);
        u = use(P.thresh);
        gl.uniform1f(u.u_thr, pr.bloom.thr);
        gl.uniform1f(u.u_warm, pr.bloom.warm);
        gl.uniform1f(u.u_tintWhite, pr.bloom.tint === 'branco' ? 1 : 0);
        bind(u, 'u_img', img, 0); bind(u, 'u_mask', S.mask, 1);
        draw();
        // o kernel de 5 amostras vale sigma≈2 texels; dois pares somam variância
        var sp = Math.max(0.5, (sigma / 3) * 0.354);
        for (var b = 0; b < 2; b++) {
          target(S.bloomB, S.bw, S.bh);
          u = use(P.blur);
          gl.uniform2f(u.u_step, sp / S.bw, 0);
          bind(u, 'u_tex', S.bloomA, 0); draw();
          target(S.bloomA, S.bw, S.bh);
          u = use(P.blur);
          gl.uniform2f(u.u_step, 0, sp / S.bh);
          bind(u, 'u_tex', S.bloomB, 0); draw();
        }

        // 3 a 7: uma passada só
        target(null, W, H);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        u = use(P.comp);
        gl.uniform2f(u.u_res, W, H);
        gl.uniform2f(u.u_center, o.center ? o.center[0] : 0.5, o.center ? o.center[1] : 0.5);
        gl.uniform1f(u.u_amount, o.amount);
        gl.uniform1f(u.u_energy, o.energy === undefined ? 1 : o.energy);
        gl.uniform1f(u.u_time, o.time || 0);
        gl.uniform1f(u.u_dpr, o.dpr || 1);
        gl.uniform1f(u.u_bloomAmt, pr.bloom.amt);
        gl.uniform1f(u.u_knee, pr.curve.knee);
        gl.uniform1f(u.u_lift, pr.curve.lift);
        gl.uniform1f(u.u_con, pr.curve.con);
        gl.uniform1f(u.u_grainAmt, pr.grain.amt);
        gl.uniform1f(u.u_grainSize, pr.grain.sizePx);
        gl.uniform1f(u.u_grainHz, pr.grain.hz);
        gl.uniform1f(u.u_grainEnv, pr.grain.env === 'meio' ? 1 : 0);
        gl.uniform1f(u.u_ab, pr.ab);
        gl.uniform1f(u.u_vig, pr.vig);
        gl.uniform1f(u.u_dither, pr.dither);
        gl.uniform1f(u.u_mBloom, pr.meter.bloom);
        gl.uniform1f(u.u_mGrain, pr.meter.grain);
        gl.uniform1f(u.u_mAb, pr.meter.ab);
        gl.uniform1f(u.u_mVig, pr.meter.vig);
        gl.uniform1f(u.u_mCurve, pr.meter.curve);
        bind(u, 'u_img', img, 0); bind(u, 'u_bloom', S.bloomA, 1); bind(u, 'u_mask', S.mask, 2);
        draw();
      },
      finish: function () { gl.finish(); },
      dispose: function () {
        Object.keys(S.panelTex).forEach(function (k) { gl.deleteTexture(S.panelTex[k].t); });
        S.panelTex = {};
        S.ring.concat([S.accum, S.bloomA, S.bloomB, S.mask]).forEach(function (t) { if (t) gl.deleteTexture(t); });
        try { gl.getExtension('WEBGL_lose_context').loseContext(); } catch (e) {}
      }
    };
    return inst;
  };
})();
