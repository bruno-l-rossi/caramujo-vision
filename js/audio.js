/* Caramujo Vision — motor de áudio (v2: caminho curto)

   IDEIA CENTRAL, e é a diferença toda em relação à v1:
   o som NÃO passa mais pelo motor de áudio do navegador pra ser medido.
   As amostras caem num anel de memória (ring buffer) e a análise é feita
   aqui, em JS, na hora que o quadro vai ser desenhado. Sem fila de blocos,
   sem AnalyserNode, sem esperar a janela da FFT do navegador.

   Custo medido da FFT própria: 14 µs por chamada de 1024 pontos.
   Uma por quadro a 60fps = 0,8 ms de processador por SEGUNDO. É de graça.

   Fontes de amostra pro anel:
     1. captura nativa (ScreenCaptureKit) → PCM chega por IPC e vai direto pro anel.
        Nesse caminho o AudioContext só nasce se você mandar GRAVAR vídeo.
     2. loopback / mic / arquivo / demo → um "tap" (AudioWorklet) copia as amostras
        do grafo pro anel. Com SharedArrayBuffer é escrita direta, sem mensagem.
     3. rede de segurança: se não houver AudioWorklet, cai num AnalyserNode
        (o caminho da v1). Mais lento, mas o app nunca fica sem imagem.

   Expõe por quadro:
     freq      (0..255, escala legada: TODO módulo de arte depende dela pra reagir igual)
     freqDb    (dBFS de verdade, -120..0; usado pelo Espectro e pela leitura do hover)
     binHz     (largura do bin — a v1 chutava 22050/n e errava 8,8% a 48kHz)
     time, timeL, timeR, rms, peak, level, bass, mid, high, centroid
     beat, beatPulse   (detectados a cada 128 amostras, não a cada quadro)
     lufsM/lufsS/lufsI (ITU-R BS.1770, filtro K rodando por amostra)
     latencyMs (do som chegar até este quadro; é o número do HUD)
*/

(function () {
  'use strict';

  /* ================= FFT radix-2, tabelas prontas, zero alocação ================= */
  function FFT(N) {
    this.N = N;
    var levels = Math.round(Math.log(N) / Math.LN2);
    this.cos = new Float32Array(N / 2);
    this.sin = new Float32Array(N / 2);
    for (var i = 0; i < N / 2; i++) {
      this.cos[i] = Math.cos(2 * Math.PI * i / N);
      this.sin[i] = Math.sin(2 * Math.PI * i / N);
    }
    this.rev = new Uint32Array(N);
    for (i = 0; i < N; i++) {
      var x = i, r = 0;
      for (var j = 0; j < levels; j++) { r = (r << 1) | (x & 1); x >>= 1; }
      this.rev[i] = r;
    }
    this.re = new Float32Array(N);
    this.im = new Float32Array(N);
    /* JANELA BLACKMAN-HARRIS DE 4 TERMOS, no lugar da Hann.
       É a diferença que faltava pro espectro parecer com o dele: entre dois
       harmônicos, o vale do nosso parava 30 dB abaixo do pico e o dele descia até
       sumir. Isso não é suavização nem piso, é VAZAMENTO DE JANELA. A Hann espalha
       o lóbulo lateral 31 dB abaixo do principal, e essa saia enche todo vale
       perto de um harmônico forte. A Blackman-Harris joga o lóbulo lateral pra
       92 dB abaixo: os vales abrem e a serrilha de harmônicos aparece separada,
       que é exatamente o que se vê no analisador dele. Custa um lóbulo principal
       um pouco mais largo (pico levemente mais gordo), troca que vale muito. */
    this.win = new Float32Array(N);
    var wsum = 0;
    var a0 = 0.35875, a1c = 0.48829, a2 = 0.14128, a3 = 0.01168;
    for (i = 0; i < N; i++) {
      var ph = 2 * Math.PI * i / (N - 1);
      this.win[i] = a0 - a1c * Math.cos(ph) + a2 * Math.cos(2 * ph) - a3 * Math.cos(3 * ph);
      wsum += this.win[i];
    }
    this.winGain = N / wsum;         // ≈ 2,79 na Blackman-Harris
    this.mag = new Float32Array(N / 2);
  }
  /* lê N amostras do anel terminando em endIdx (exclusivo) e devolve magnitude normalizada */
  FFT.prototype.runRing = function (ring, endIdx) {
    var N = this.N, re = this.re, im = this.im, rev = this.rev, win = this.win;
    var mask = ring.length - 1, base = (endIdx - N) & mask, i, k;
    for (i = 0; i < N; i++) { re[rev[i]] = ring[(base + i) & mask] * win[i]; im[rev[i]] = 0; }
    for (var size = 2; size <= N; size <<= 1) {
      var half = size >> 1, step = N / size;
      for (i = 0; i < N; i += size) {
        for (var j = i, kk = 0; j < i + half; j++, kk += step) {
          var l = j + half;
          var tre = re[l] * this.cos[kk] + im[l] * this.sin[kk];
          var tim = -re[l] * this.sin[kk] + im[l] * this.cos[kk];
          re[l] = re[j] - tre; im[l] = im[j] - tim;
          re[j] += tre; im[j] += tim;
        }
      }
    }
    var half2 = N / 2, sc = this.winGain * 2 / N, mag = this.mag;
    for (k = 0; k < half2; k++) mag[k] = Math.sqrt(re[k] * re[k] + im[k] * im[k]) * sc;
    return mag;
  };

  /* ================= biquad de 2ª ordem, estado por canal (pro filtro K do LUFS) ================= */
  function Biquad() { this.b0 = 1; this.b1 = 0; this.b2 = 0; this.a1 = 0; this.a2 = 0; this.x1 = 0; this.x2 = 0; this.y1 = 0; this.y2 = 0; }
  Biquad.prototype.step = function (x) {
    var y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  };
  Biquad.prototype.reset = function () { this.x1 = this.x2 = this.y1 = this.y2 = 0; };

  /* coeficientes do filtro K da BS.1770, recalculados pra taxa real
     (a v1 usava shelf/highpass "no olho"; estes são os do libebur128, a
     mesma biblioteca que o MiniMeters usa) */
  function kStage1(rate) {
    var f0 = 1681.974450955533, G = 3.999843853973347, Q = 0.7071752369554196;
    var K = Math.tan(Math.PI * f0 / rate);
    var Vh = Math.pow(10, G / 20), Vb = Math.pow(Vh, 0.4996667741545416);
    var a0 = 1 + K / Q + K * K, q = new Biquad();
    q.b0 = (Vh + Vb * K / Q + K * K) / a0;
    q.b1 = 2 * (K * K - Vh) / a0;
    q.b2 = (Vh - Vb * K / Q + K * K) / a0;
    q.a1 = 2 * (K * K - 1) / a0;
    q.a2 = (1 - K / Q + K * K) / a0;
    return q;
  }
  function kStage2(rate) {
    var f0 = 38.13547087602444, Q = 0.5003270373238773;
    var K = Math.tan(Math.PI * f0 / rate), a0 = 1 + K / Q + K * K, q = new Biquad();
    q.b0 = 1; q.b1 = -2; q.b2 = 1;
    q.a1 = 2 * (K * K - 1) / a0;
    q.a2 = (1 - K / Q + K * K) / a0;
    return q;
  }

  var RING = 32768;          // 0,68s a 48kHz: sobra pra atrasos de quadro
  var FFT_N = 1024;          // 21ms de janela (igual à v1, pra o espectro não mudar de cara)
  var FAST_N = 256;          // 5ms: é daqui que sai o nível instantâneo
  var HOP = 128;             // passo do detector de beat (2,7ms)
  var DISP_FLOOR = -100;     // piso do eixo de dB honesto
  var LEGACY_FLOOR = -100, LEGACY_TOP = -30, LEGACY_GAIN_DB = 5.1; // o mapa da v1 (analysisGain 1.8)

  function AudioEngine() {
    this.ctx = null;
    this.source = null;
    this.sourceKind = 'none';  // none | demo | synth | mic | file | system
    this.sourceLabel = '';
    this.stream = null;
    this.demoNodes = [];
    this.demoTimer = null;
    this.synthPaused = false;
    this.fileEl = null;
    this.recordDest = null;

    this.sr = 48000;
    this.ringL = new Float32Array(RING);
    this.ringR = new Float32Array(RING);
    this.wr = 0;               // total de amostras escritas (cresce sempre)
    this.rd = 0;               // já consumido pelo LUFS/beat
    this.lastFeedAt = 0;       // quando o último bloco chegou (pra medir latência)
    this.chunkMs = 0;          // tamanho do bloco da captura, em ms
    this.hasRing = false;

    this.fft = new FFT(FFT_N);
    this.freq = new Float32Array(FFT_N / 2);
    this.freqDb = new Float32Array(FFT_N / 2);
    this.binHz = (this.sr / 2) / (FFT_N / 2);
    this.time = new Float32Array(2048);
    this.timeL = new Float32Array(1024);
    this.timeR = new Float32Array(1024);

    this.rms = 0; this.peak = 0; this.level = 0;
    this.bass = 0; this.mid = 0; this.high = 0;
    this.centroid = 0.3;
    this.beat = false; this.beatPulse = 0;
    this.latencyMs = 0;
    this.lufsM = -70; this.lufsS = -70; this.lufsI = -70;
    this.lufsAvgVal = -70;

    this.setupLufs(this.sr);
    this.setupBeat();
  }

  /* ================= anel: quem alimenta e quem lê ================= */

  AudioEngine.prototype.feed = function (l, r, frames) {
    var L = this.ringL, R = this.ringR, mask = RING - 1, w = this.wr & mask;
    for (var i = 0; i < frames; i++) {
      L[(w + i) & mask] = l[i];
      R[(w + i) & mask] = r ? r[i] : l[i];
    }
    this.wr += frames;
    this.hasRing = true;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    // média móvel do tamanho do bloco: entra no cálculo de latência
    var ms = frames / this.sr * 1000;
    this.chunkMs = this.chunkMs ? this.chunkMs * 0.9 + ms * 0.1 : ms;
    this.lastFeedAt = now;
  };

  // PCM 16-bit intercalado (L,R,L,R…) direto no anel, sem passar pelo grafo
  AudioEngine.prototype.pushNativePCM = function (buf) {
    if (!buf) return;
    var u8 = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf.buffer || buf);
    var i16 = new Int16Array(u8.buffer, u8.byteOffset, Math.floor(u8.byteLength / 2));
    var ch = this.nativeChannels || 2, frames = Math.floor(i16.length / ch);
    if (frames <= 0) return;
    var L = this.ringL, R = this.ringR, mask = RING - 1, w = this.wr & mask;
    for (var i = 0; i < frames; i++) {
      var a = i16[i * ch] / 32768;
      L[(w + i) & mask] = a;
      R[(w + i) & mask] = ch > 1 ? i16[i * ch + 1] / 32768 : a;
    }
    this.wr += frames;
    this.hasRing = true;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var ms = frames / this.sr * 1000;
    this.chunkMs = this.chunkMs ? this.chunkMs * 0.9 + ms * 0.1 : ms;
    this.lastFeedAt = now;
    // alimenta a gravação, se estiver ligada (só então o grafo existe)
    if (this.srcNode) {
      var fl = new Float32Array(frames), fr = new Float32Array(frames);
      for (i = 0; i < frames; i++) { fl[i] = i16[i * ch] / 32768; fr[i] = ch > 1 ? i16[i * ch + 1] / 32768 : fl[i]; }
      try { this.srcNode.port.postMessage({ l: fl, r: fr }, [fl.buffer, fr.buffer]); } catch (e) {}
    }
  };

  /* O SAB ENTRA NA CONTA. Sem ele, o caminho do loopback travava: o hasRing só
     vira true dentro do drainSab(), que só roda dentro do update(), que o app só
     chama quando hasSignal() já é true. Com o SAB no ar a tela ficava preta pra
     sempre, mesmo com som chegando no anel compartilhado. */
  AudioEngine.prototype.hasSignal = function () {
    return this.sourceKind !== 'none' && (this.hasRing || !!this.analyser || !!this.sab);
  };

  /* ================= LUFS pela norma, rodando por amostra ================= */
  AudioEngine.prototype.setupLufs = function (rate) {
    this.k1L = kStage1(rate); this.k2L = kStage2(rate);
    this.k1R = kStage1(rate); this.k2R = kStage2(rate);
    this.subLen = Math.round(rate * 0.1);   // sub-bloco de 100ms
    this.subAcc = 0; this.subN = 0;
    this.subs = new Float32Array(64);       // circular: 6,4s de sub-blocos
    this.subW = 0; this.subCount = 0;
    // histograma de 0,1 LU de -70 a +5 (é assim que o libebur128 faz o portão)
    this.hist = new Int32Array(751);
    this.histN = 0;
    this.lufsM = -70; this.lufsS = -70; this.lufsI = -70;
  };
  function energyToLufs(z) { return z > 1e-14 ? -0.691 + 10 * Math.log10(z) : -70; }

  AudioEngine.prototype.processLufs = function (from, to) {
    var mask = RING - 1, L = this.ringL, R = this.ringR;
    var k1L = this.k1L, k2L = this.k2L, k1R = this.k1R, k2R = this.k2R;
    var acc = this.subAcc, n = this.subN, need = this.subLen;
    for (var i = from; i < to; i++) {
      var idx = i & mask;
      var a = k2L.step(k1L.step(L[idx]));
      var b = k2R.step(k1R.step(R[idx]));
      acc += a * a + b * b;      // soma das energias dos canais (pesos 1.0)
      n++;
      if (n >= need) {
        this.pushSub(acc / n);
        acc = 0; n = 0;
      }
    }
    this.subAcc = acc; this.subN = n;
  };

  AudioEngine.prototype.pushSub = function (z) {
    this.subs[this.subW & 63] = z;
    this.subW++; this.subCount++;
    var i, s;
    // M = 400ms (4 sub-blocos) · S = 3s (30 sub-blocos)
    s = 0; for (i = 0; i < 4 && i < this.subCount; i++) s += this.subs[(this.subW - 1 - i) & 63];
    this.lufsM = energyToLufs(s / Math.min(4, this.subCount));
    s = 0; for (i = 0; i < 30 && i < this.subCount; i++) s += this.subs[(this.subW - 1 - i) & 63];
    this.lufsS = energyToLufs(s / Math.min(30, this.subCount));
    /* INTEGRADO: bloco de 400ms a cada 100ms (sobreposição de 75%, como manda a norma),
       jogado num histograma. Os dois portões (absoluto -70 e relativo -10) saem de uma
       varredura de 751 casas, não dos 9 mil blocos que a v1 relia a cada 400ms. */
    if (this.subCount >= 4) {
      s = 0; for (i = 0; i < 4; i++) s += this.subs[(this.subW - 1 - i) & 63];
      var lb = energyToLufs(s / 4);
      if (lb > -70) {
        var bin = Math.round((lb + 70) * 10);
        if (bin < 0) bin = 0; if (bin > 750) bin = 750;
        this.hist[bin]++; this.histN++;
        this.lufsI = this.integrated();
      }
    }
  };

  AudioEngine.prototype.integrated = function () {
    if (!this.histN) return -70;
    var h = this.hist, i, cnt = 0, sum = 0, z;
    for (i = 0; i <= 750; i++) {
      if (!h[i]) continue;
      z = Math.pow(10, ((i / 10 - 70) + 0.691) / 10);
      sum += z * h[i]; cnt += h[i];
    }
    var relGate = energyToLufs(sum / cnt) - 10;
    var gi = Math.round((relGate + 70) * 10);
    cnt = 0; sum = 0;
    for (i = Math.max(0, gi); i <= 750; i++) {
      if (!h[i]) continue;
      z = Math.pow(10, ((i / 10 - 70) + 0.691) / 10);
      sum += z * h[i]; cnt += h[i];
    }
    return cnt ? energyToLufs(sum / cnt) : -70;
  };

  AudioEngine.prototype.resetLufs = function () {
    this.k1L.reset(); this.k2L.reset(); this.k1R.reset(); this.k2R.reset();
    this.subAcc = 0; this.subN = 0; this.subW = 0; this.subCount = 0;
    this.hist = new Int32Array(751); this.histN = 0;
    this.lufsM = this.lufsS = this.lufsI = -70;
    this.lufsAvgVal = -70;
  };

  /* ================= beat em taxa de áudio (não perde kick entre quadros) ================= */
  AudioEngine.prototype.setupBeat = function () {
    this.bLp1 = 0; this.bLp2 = 0;
    this.hopAcc = 0; this.hopN = 0;
    this.hopHist = new Float32Array(256);   // ~0,7s de passos a 48k
    this.hopW = 0; this.hopFill = 0;
    this.hopSum = 0;
    this.beatCool = 0;
    this.beatHit = false;
    this.bassFast = 0;
    this.bf = 0;        // seguidor de pico: decai devagar, mata o duplo-disparo do 808
    this.ePrev = 0;     // energia do passo anterior: exige que o som esteja SUBINDO
    this.setupReacao();
  };
  AudioEngine.prototype.processBeat = function (from, to) {
    var mask = RING - 1, L = this.ringL, R = this.ringR;
    // dois pólos a ~160Hz: pega o corpo do 808/kick sem o resto da mixagem
    var a = Math.exp(-2 * Math.PI * 160 / this.sr);
    if (!this.bfDecay) this.bfDecay = Math.exp(-(HOP / this.sr) / 0.25);
    // v2.2: um polo em 2,5kHz separa o médio do agudo (o grave é o mesmo lp2 do beat)
    if (this._aMsr !== this.sr) { this._aMsr = this.sr; this._aM = Math.exp(-2 * Math.PI * 2500 / this.sr); }
    var aM = this._aM, lpM = this.lpM, accF = this.accF, accM = this.accM, accH = this.accH, wpk = this.wPk;
    var lp1 = this.bLp1, lp2 = this.bLp2, acc = this.hopAcc, n = this.hopN;
    for (var i = from; i < to; i++) {
      var idx = i & mask, sl = L[idx], sr = R[idx], x = (sl + sr) * 0.5;
      lp1 += (x - lp1) * (1 - a);
      lp2 += (lp1 - lp2) * (1 - a);
      lpM += (x - lpM) * (1 - aM);
      acc += lp2 * lp2; n++;
      var vm = lpM - lp2, vh = x - lpM;
      accF += x * x; accM += vm * vm; accH += vh * vh;
      if (sl < 0) sl = -sl; if (sr < 0) sr = -sr;
      if (sl > wpk) wpk = sl; if (sr > wpk) wpk = sr;
      if (n >= HOP) {
        var e = Math.sqrt(acc / n);
        /* v2.2: energia de cada banda alisada em ~20ms e o MAIOR valor desde o último
           quadro (o kick nunca cai entre dois quadros). Sem o alisamento, 128 amostras
           são menos que um ciclo de um 808 de 50Hz (960 amostras): o valor do passo
           dependia da fase da onda e o grave tremia 15% de quadro pra quadro. */
        var kh = this._kh;
        if (!kh || kh.sr !== this.sr) {
          var hd = n / this.sr;
          kh = this._kh = { sr: this.sr, B: 1 - Math.exp(-hd / 0.022), F: 1 - Math.exp(-hd / 0.022), M: 1 - Math.exp(-hd / 0.012), H: 1 - Math.exp(-hd / 0.008) };
        }
        this.sB += (acc / n - this.sB) * kh.B;
        this.sF += (accF / n - this.sF) * kh.F;
        this.sM += (accM / n - this.sM) * kh.M;
        this.sH += (accH / n - this.sH) * kh.H;
        var hB = Math.sqrt(this.sB), hF = Math.sqrt(this.sF), hM = Math.sqrt(this.sM), hH = Math.sqrt(this.sH);
        if (hB > this.pkB) this.pkB = hB;
        if (hF > this.pkF) this.pkF = hF;
        if (hM > this.pkM) this.pkM = hM;
        if (hH > this.pkH) this.pkH = hH;
        accF = 0; accM = 0; accH = 0;
        acc = 0; n = 0;
        var avg = this.hopFill ? this.hopSum / this.hopFill : 0;
        var dtHop = HOP / this.sr;
        this.beatCool -= dtHop;
        /* três portões, e é a combinação que resolve o 808 de cauda longa:
           1) SUBINDO (a cauda de um kick nunca sobe, então nunca vira um segundo kick)
           2) acima do seguidor de pico (que decai em ~0,25s, mais devagar que qualquer cauda)
           3) acima da média móvel de 0,7s, com um piso pra o silêncio não disparar */
        this.bf *= this.bfDecay;
        var rising = e > this.ePrev * 1.08;
        var thr = this.bf * 1.2;
        if (avg * 1.35 > thr) thr = avg * 1.35;
        if (thr < 0.012) thr = 0.012;
        if (rising && e > thr && this.beatCool <= 0) {
          this.beatHit = true; this.beatPulse = 1; this.beatCool = 0.07;
        }
        if (e > this.bf) this.bf = e;
        this.ePrev = e;
        // média móvel O(1)
        var old = this.hopHist[this.hopW & 255];
        if (this.hopFill >= 256) this.hopSum -= old; else this.hopFill++;
        this.hopHist[this.hopW & 255] = e; this.hopSum += e; this.hopW++;
        this.bassFast = e;
      }
    }
    this.bLp1 = lp1; this.bLp2 = lp2; this.hopAcc = acc; this.hopN = n;
    this.lpM = lpM; this.accF = accF; this.accM = accM; this.accH = accH; this.wPk = wpk;
  };

  /* ================= v2.2 · REAÇÃO: o grave que se ajusta ao volume =================
     O d.bass que a arte usava sai do mapa legado de dB (piso -100, teto -30), onde
     qualquer raia acima de -35 dBFS vira 255. Num master de rap o grave passa disso o
     tempo todo: medido no demo-beat.wav (-12 LUFS), mediana 0,997 e p75 1,000. Entre
     um kick e outro o sinal já estava no máximo, então o kick não tinha pra onde subir
     e a arte não pulsava. O d.bass continua lá, igual, pra quem depende dele.

     Aqui cada banda é medida em AMPLITUDE de verdade a cada 128 amostras e dividida
     por uma referência que acompanha o volume da música: sobe em 50ms quando o som
     passa dela e desce devagar (~2 dB/s) quando ele fica abaixo. O kick encosta no 1,
     o vale entre kicks desce, e isso vale pro master a -8 LUFS e pro YouTube baixinho.
       grave   (até 160Hz)   o que comanda escala, empurrão e pulso
       soco    o ATAQUE do grave: pico no kick, zero no sustain do 808
       energia (o som inteiro) o tamanho de base: parte cheia ocupa mais que a quebra
       medio / agudo         deformação e brilho
       ondaRef / ondaVivo   pico de amostra recente: autoganho de quem desenha a onda */
  //            grave   cheio   médio   agudo
  var REAC_SOLTA = [0.17, 0.24, 0.14, 0.09];     // queda do envelope, em segundos
  var REAC_EXP = [1.7, 1.0, 1.3, 1.3];           // expoente: o grave ganha contraste entre kick e vale
  var REAC_PISO = [0.010, 0.012, 0.005, 0.0025]; // amplitude RMS mínima da régua (o chiado não vira música)
  var REAC_SOBE = 0.05, REAC_DESCE = 4.0;
  AudioEngine.prototype.setupReacao = function () {
    this.lpM = 0; this.accF = 0; this.accM = 0; this.accH = 0;
    this.sB = 0; this.sF = 0; this.sM = 0; this.sH = 0;
    this.pkB = 0; this.pkF = 0; this.pkM = 0; this.pkH = 0; this.wPk = 0;
    this.rxEnv = new Float64Array(4);
    this.rxRef = new Float64Array(REAC_PISO);
    this.rxOut = new Float64Array(4);
    this.rxLento = 0;
    this.grave = 0; this.energia = 0; this.medio = 0; this.agudo = 0; this.soco = 0;
    this.ondaRef = 0.05; this.ondaVivo = 0.05;
  };
  AudioEngine.prototype.updateReacao = function (dt) {
    if (!this.rxEnv) this.setupReacao();
    if (!(dt > 0)) dt = 1 / 60;
    var kSobe = 1 - Math.exp(-dt / REAC_SOBE), kDesce = Math.exp(-dt / REAC_DESCE);
    var envs = this.rxEnv, refs = this.rxRef, out = this.rxOut;
    for (var b = 0; b < 4; b++) {
      var pk = b === 0 ? this.pkB : b === 1 ? this.pkF : b === 2 ? this.pkM : this.pkH;
      // ataque instantâneo (o pico do passo), queda no tempo da banda. É max(): com
      // "pico > env ? pico : env x queda" o valor alternava 9% quadro sim, quadro não.
      var env = Math.max(pk, envs[b] * Math.exp(-dt / REAC_SOLTA[b])), ref = refs[b];
      if (env > ref) ref += (env - ref) * kSobe; else ref *= kDesce;
      if (ref < REAC_PISO[b]) ref = REAC_PISO[b];
      envs[b] = env; refs[b] = ref;
      var v = env / ref; if (v > 1) v = 1;
      out[b] = REAC_EXP[b] === 1 ? v : Math.pow(v, REAC_EXP[b]);
    }
    this.grave = out[0]; this.energia = out[1]; this.medio = out[2]; this.agudo = out[3];
    /* SOCO: o quanto o grave está acima da própria média de 120ms. No ataque do kick
       ele dispara; no sustain longo do 808 o envelope e a média se encontram e ele
       volta pro zero. É o que deixa o pulso seco mesmo com 808 que não para de soar. */
    var envB = envs[0];
    this.rxLento += (envB - this.rxLento) * (1 - Math.exp(-dt / 0.12));
    var sobe = (envB - this.rxLento) / refs[0] * 2.4;
    if (sobe < 0) sobe = 0; else if (sobe > 1) sobe = 1;
    this.soco = Math.max(sobe, this.soco * Math.exp(-dt / 0.11));
    /* pico de amostra, duas réguas, piso em -32 dBFS (o chiado não vira onda):
       ondaRef desce em ~3s (medidores: a quebra continua parecendo quebra) e
       ondaVivo desce em 0,8s (arte: numa quebra sem grave a figura volta a encher
       em menos de 1s, em vez de virar um pontinho no meio do painel). */
    var wp = this.wPk, kA = 1 - Math.exp(-dt / 0.02);
    if (wp > this.ondaRef) this.ondaRef += (wp - this.ondaRef) * kA;
    else this.ondaRef *= Math.exp(-dt / 3.0);
    if (this.ondaRef < 0.025) this.ondaRef = 0.025;
    if (wp > this.ondaVivo) this.ondaVivo += (wp - this.ondaVivo) * kA;
    else this.ondaVivo *= Math.exp(-dt / 0.8);
    if (this.ondaVivo < 0.025) this.ondaVivo = 0.025;
    this.pkB = 0; this.pkF = 0; this.pkM = 0; this.pkH = 0; this.wPk = 0;
  };

  /* ================= o grafo (só pra tocar, monitorar e GRAVAR) ================= */
  AudioEngine.prototype.ensureCtx = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new AC({ latencyHint: 0 }); }
    catch (e) { this.ctx = new AC({ latencyHint: 'interactive' }); }
    this.buildGraph();
  };

  AudioEngine.prototype.buildGraph = function () {
    var ctx = this.ctx;
    /* na captura nativa o contexto só existe pra GRAVAR: ele não manda na taxa
       de amostragem nem pode zerar o LUFS que já está rodando */
    if (!this.nativeOn) {
      this.sr = ctx.sampleRate || 48000;
      this.binHz = (this.sr / 2) / (FFT_N / 2);
      this.setupLufs(this.sr);
    }

    this.input = ctx.createGain();      // tudo entra aqui
    try {
      this.input.channelCount = 2;
      this.input.channelCountMode = 'explicit';
      this.input.channelInterpretation = 'discrete';
    } catch (e) {}

    // monitor: som nas caixas pra demo/arquivo; desligado pra entrada ao vivo (sem eco)
    this.monitor = ctx.createGain();
    this.monitor.gain.value = 0;
    this.input.connect(this.monitor);
    this.monitor.connect(ctx.destination);

    /* SINCRONIA DO CLIPE. O canvas naquele instante mostra o som de alguns
       milésimos atrás (análise + o tempo que a tela leva pra acender). A faixa de
       áudio da gravação é a de AGORA, então o clipe exportado nasce com o flash
       chegando depois do kick. Aqui o áudio da gravação passa por um atraso do
       mesmo tamanho e as duas coisas voltam a bater. Só a gravação passa por
       aqui: o monitor e a análise continuam sem atraso nenhum. */
    this.recordDest = ctx.createMediaStreamDestination();
    this.recDelay = null;
    try {
      this.recDelay = ctx.createDelay(0.5);
      this.recDelay.delayTime.value = 0;
      this.input.connect(this.recDelay);
      this.recDelay.connect(this.recordDest);
    } catch (e) {
      // motor de áudio sem atraso disponível: grava sem compensar, nunca sem gravar
      this.recDelay = null;
      this.input.connect(this.recordDest);
    }

    this.setupTap();
  };

  /* atraso de sincronia, em ms. Chamado pelo app na hora de apertar ● */
  AudioEngine.prototype.setRecordDelayMs = function (ms) {
    if (!this.recDelay || !this.ctx) return 0;
    var s = Math.max(0, Math.min(0.5, (ms || 0) / 1000));
    try { this.recDelay.delayTime.setValueAtTime(s, this.ctx.currentTime); }
    catch (e) { this.recDelay.delayTime.value = s; }
    return s * 1000;
  };

  /* TAP: copia as amostras do grafo pro anel.
     Com SharedArrayBuffer é escrita direta (zero mensagem, zero atraso).
     Sem SAB, manda blocos de 512 amostras (10,7ms) — ainda muito menor que
     a fila de 3 blocos da v1. */
  AudioEngine.prototype.setupTap = function () {
    if (this._tapTried) return;
    this._tapTried = true;
    var self = this, ctx = this.ctx;
    if (!ctx.audioWorklet) { this.setupAnalyserFallback(); return; }

    var sab = null;
    try {
      if (typeof SharedArrayBuffer === 'function') {
        sab = { buf: new SharedArrayBuffer(RING * 8 + 8) };
        sab.l = new Float32Array(sab.buf, 8, RING);
        sab.r = new Float32Array(sab.buf, 8 + RING * 4, RING);
        sab.ctl = new Int32Array(sab.buf, 0, 2);
      }
    } catch (e) { sab = null; }

    var code = [
      'const RING = ' + RING + ';',
      'class Tap extends AudioWorkletProcessor {',
      '  constructor(o){ super();',
      '    const p = (o && o.processorOptions) || {};',
      '    this.sab = p.sab || null;',
      '    if (this.sab) { this.ctl = new Int32Array(this.sab, 0, 2);',
      '      this.sl = new Float32Array(this.sab, 8, RING);',
      '      this.sr2 = new Float32Array(this.sab, 8 + RING*4, RING); }',
      '    this.bl = new Float32Array(512); this.br = new Float32Array(512); this.n = 0;',
      '    this.w = 0;',
      '  }',
      '  process(inputs){',
      '    const inp = inputs[0];',
      '    if (!inp || !inp.length) return true;',
      '    const a = inp[0], b = inp.length > 1 ? inp[1] : inp[0];',
      '    const L = a ? a.length : 0;',
      '    if (this.sab) {',
      '      for (let i = 0; i < L; i++) { const k = (this.w + i) & (RING - 1); this.sl[k] = a[i]; this.sr2[k] = b[i]; }',
      '      this.w += L;',
      '      Atomics.store(this.ctl, 0, this.w | 0);',
      '      return true;',
      '    }',
      '    for (let i = 0; i < L; i++) {',
      '      this.bl[this.n] = a[i]; this.br[this.n] = b[i]; this.n++;',
      '      if (this.n >= 512) {',
      '        this.port.postMessage({ l: this.bl.slice(0), r: this.br.slice(0) });',
      '        this.n = 0;',
      '      }',
      '    }',
      '    return true;',
      '  }',
      '}',
      'registerProcessor("cv-tap", Tap);'
    ].join('\n');

    var url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    ctx.audioWorklet.addModule(url).then(function () {
      URL.revokeObjectURL(url);
      var node = new AudioWorkletNode(ctx, 'cv-tap', {
        numberOfInputs: 1, numberOfOutputs: 0,
        processorOptions: { sab: sab ? sab.buf : null }
      });
      if (sab) {
        self.sab = sab;
        self.sabRead = 0;
      } else {
        node.port.onmessage = function (e) {
          if (self.nativeOn) return;   // no nativo o anel já vem do PCM: não duplica
          self.feed(e.data.l, e.data.r, e.data.l.length);
        };
      }
      self.input.connect(node);
      self.tapNode = node;
      self.dropAnalyser();             // tap funcionou: a rede de segurança sai de cena
    }).catch(function () { self.setupAnalyserFallback(); });
  };

  /* copia o que o worklet escreveu no SAB pro anel local (memcpy, sem alocar) */
  AudioEngine.prototype.drainSab = function () {
    var sab = this.sab;
    if (!sab || this.nativeOn) return;
    var w = (typeof Atomics !== 'undefined') ? Atomics.load(sab.ctl, 0) : sab.ctl[0];
    var avail = w - this.sabRead;
    if (avail <= 0) return;
    if (avail > RING) { this.sabRead = w - RING; avail = RING; }
    var mask = RING - 1, from = this.sabRead;
    var L = this.ringL, R = this.ringR, wr = this.wr & mask;
    for (var i = 0; i < avail; i++) {
      var s = (from + i) & mask, d = (wr + i) & mask;
      L[d] = sab.l[s]; R[d] = sab.r[s];
    }
    this.wr += avail;
    this.sabRead = w;
    this.hasRing = true;
    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    this.chunkMs = 2.7;   // o SAB entrega a cada bloco de render (128 amostras)
    this.lastFeedAt = now;
  };

  AudioEngine.prototype.dropAnalyser = function () {
    if (!this.analyser) return;
    try { this.analyser.disconnect(); this.anL.disconnect(); this.anR.disconnect(); this.fbSplit.disconnect(); } catch (e) {}
    this.analyser = null; this.anL = null; this.anR = null; this.fbSplit = null;
    this.usedFallback = false;
  };

  /* REDE DE SEGURANÇA: sem AudioWorklet, volta pro AnalyserNode da v1.
     Mais delay, mas a tela nunca fica preta. */
  AudioEngine.prototype.setupAnalyserFallback = function () {
    if (this.analyser || !this.ctx || this.tapNode || this.nativeOn) return;
    var ctx = this.ctx;
    try {
      this.analyser = ctx.createAnalyser();
      this.analyser.fftSize = FFT_N;
      this.analyser.smoothingTimeConstant = 0;
      // faixa de dB CORRIGIDA: o padrão do navegador é -100..-30 e satura tudo
      try { this.analyser.minDecibels = -100; this.analyser.maxDecibels = 0; } catch (e) {}
      this.anL = ctx.createAnalyser(); this.anL.fftSize = 2048; this.anL.smoothingTimeConstant = 0;
      this.anR = ctx.createAnalyser(); this.anR.fftSize = 2048; this.anR.smoothingTimeConstant = 0;
      this.fbSplit = ctx.createChannelSplitter(2);
      this.input.connect(this.analyser);
      this.input.connect(this.fbSplit);
      this.fbSplit.connect(this.anL, 0);
      this.fbSplit.connect(this.anR, 1);
      this.fbFreq = new Uint8Array(this.analyser.frequencyBinCount);
      this.fbL = new Float32Array(this.anL.fftSize);
      this.fbR = new Float32Array(this.anR.fftSize);
    } catch (e) { this.analyser = null; }
  };

  /* feed do grafo pro anel usando o fallback (uma vez por quadro).
     Só entra a fatia NOVA (sr × dt). Empurrar as 2048 amostras inteiras a cada
     quadro contaria a energia 2,5 vezes e estragaria o LUFS e o beat. */
  AudioEngine.prototype.feedFromAnalyser = function (dt) {
    if (!this.analyser) return false;
    this.anL.getFloatTimeDomainData(this.fbL);
    this.anR.getFloatTimeDomainData(this.fbR);
    var total = this.fbL.length;
    var n = Math.round(this.sr * (dt || 1 / 60));
    if (n < 64) n = 64; if (n > total) n = total;
    var off = total - n;
    this.feed(this.fbL.subarray(off), this.fbR.subarray(off), n);
    this.usedFallback = true;
    return true;
  };

  /* ================= gravação: o grafo só nasce quando você aperta ● ================= */
  AudioEngine.prototype.ensureRecordFeed = function () {
    this.ensureCtx();
    if (this.sourceKind !== 'system' || !this.nativeOn || this.srcNode) return Promise.resolve();
    var self = this;
    return this.makeSrcNode().then(function (node) {
      self.srcNode = node;
      node.connect(self.input);
    }).catch(function () {});
  };

  // worklet-fonte: só existe pra a GRAVAÇÃO receber o áudio nativo. Fila de 2 blocos.
  AudioEngine.prototype.makeSrcNode = function () {
    var self = this;
    if (!this.ctx.audioWorklet) return Promise.reject(new Error('sem-audioworklet'));
    var code = [
      'class SrcProc extends AudioWorkletProcessor {',
      '  constructor(){ super(); this.q = []; this.cur = null; this.pos = 0;',
      '    this.port.onmessage = (e) => { this.q.push(e.data); while (this.q.length > 2) this.q.shift(); };',
      '  }',
      '  process(_, outputs){',
      '    const out = outputs[0]; if (!out || !out.length) return true;',
      '    const L = out[0], R = out.length > 1 ? out[1] : null, n = L.length;',
      '    for (let i = 0; i < n; i++) {',
      '      if (!this.cur || this.pos >= this.cur.l.length) { this.cur = this.q.shift() || null; this.pos = 0; }',
      '      if (!this.cur) { L[i] = 0; if (R) R[i] = 0; continue; }',
      '      L[i] = this.cur.l[this.pos]; if (R) R[i] = this.cur.r[this.pos];',
      '      this.pos++;',
      '    }',
      '    return true;',
      '  }',
      '}',
      'registerProcessor("cv-src", SrcProc);'
    ].join('\n');
    var url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    return this.ctx.audioWorklet.addModule(url).then(function () {
      URL.revokeObjectURL(url);
      return new AudioWorkletNode(self.ctx, 'cv-src', { numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2] });
    });
  };

  /* ================= trocar de fonte ================= */
  AudioEngine.prototype.stopSource = function () {
    if (this.demoTimer) { clearInterval(this.demoTimer); this.demoTimer = null; }
    this.demoNodes.forEach(function (n) { try { n.stop ? n.stop() : 0; } catch (e) {} try { n.disconnect(); } catch (e) {} });
    this.demoNodes = [];
    if (this.source) { try { this.source.disconnect(); } catch (e) {} this.source = null; }
    if (this.srcNode) { try { this.srcNode.disconnect(); } catch (e) {} this.srcNode = null; }
    if (this.nativeOn && window.caramujo && window.caramujo.nativeStop) {
      this.nativeOn = false;
      try { window.caramujo.nativeStop(); } catch (e) {}
    }
    if (this.stream) { this.stream.getTracks().forEach(function (t) { t.stop(); }); this.stream = null; }
    if (this.fileEl) { this.fileEl.pause(); this.fileEl = null; }
    this.sourceKind = 'none';
    this.synthPaused = false;
    this.hasRing = false;
    this.wr = 0; this.rd = 0; this.sabRead = 0;
    if (this.sab && typeof Atomics !== 'undefined') { try { Atomics.store(this.sab.ctl, 0, 0); } catch (e) {} }
    this.resetLufs();
    this.setupBeat();
  };

  /* ---------- DEMO: beat da semana (assets/) com queda pro sintetizador ---------- */
  AudioEngine.prototype.startDemo = function () {
    this.ensureCtx();
    var self = this;
    return new Promise(function (resolve) {
      var tried = 0, exts = ['wav', 'mp3', 'm4a'];
      function wire(el) {
        self.stopSource();
        self.fileEl = el;
        self.source = self.ctx.createMediaElementSource(el);
        self.source.connect(self.input);
        self.monitor.gain.value = 1;
        self.sourceKind = 'demo';
        self.sourceLabel = 'LEGO · BEAT DA SEMANA';
      }
      function tryNext() {
        if (tried >= exts.length) { self.startSynth(); resolve('synth'); return; }
        var el = new Audio();
        el.preload = 'auto';
        el.loop = true;
        el.src = 'assets/demo-beat.' + exts[tried];
        tried++;
        el.play().then(function () { wire(el); resolve('beat'); })
          .catch(function (err) {
            if (err && err.name === 'NotAllowedError') { wire(el); resolve('blocked'); }
            else tryNext();
          });
      }
      tryNext();
    });
  };

  /* sintetizador interno: 135 BPM em Gm */
  AudioEngine.prototype.startSynth = function () {
    this.ensureCtx(); this.stopSource();
    var ctx = this.ctx, input = this.input, self = this;
    var bus = ctx.createGain(); bus.gain.value = 0.8; bus.connect(input);
    this.demoNodes.push(bus);
    this.synthBus = bus;
    this.monitor.gain.value = 1;

    var bassOsc = ctx.createOscillator(); bassOsc.type = 'sawtooth';
    var bassFlt = ctx.createBiquadFilter(); bassFlt.type = 'lowpass'; bassFlt.frequency.value = 150; bassFlt.Q.value = 9;
    var bassGain = ctx.createGain(); bassGain.gain.value = 0.22;
    bassOsc.connect(bassFlt); bassFlt.connect(bassGain); bassGain.connect(bus);
    bassOsc.start(); this.demoNodes.push(bassOsc, bassFlt, bassGain);

    var nb = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate);
    var nd = nb.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    var bpm = 135, stepDur = 60 / bpm / 2, step = 0;
    var notes = [49, 49, 58.3, 49, 43.7, 49, 73.4, 58.3];

    function tick() {
      if (self.synthPaused) return;
      var t = ctx.currentTime + 0.02;
      if (step % 4 === 0) {
        var k = ctx.createOscillator(), kg = ctx.createGain();
        k.type = 'sine';
        k.frequency.setValueAtTime(150, t);
        k.frequency.exponentialRampToValueAtTime(42, t + 0.12);
        kg.gain.setValueAtTime(1.0, t);
        kg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
        k.connect(kg); kg.connect(bus);
        k.start(t); k.stop(t + 0.32);
      }
      var h = ctx.createBufferSource(), hg = ctx.createGain(), hf = ctx.createBiquadFilter();
      h.buffer = nb; hf.type = 'highpass'; hf.frequency.value = 7500;
      var open = (step % 8 === 6);
      hg.gain.setValueAtTime(open ? 0.15 : 0.07, t);
      hg.gain.exponentialRampToValueAtTime(0.001, t + (open ? 0.2 : 0.05));
      h.connect(hf); hf.connect(hg);
      var pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      if (pan) { pan.pan.value = (step % 4 === 1) ? -0.6 : 0.6; hg.connect(pan); pan.connect(bus); }
      else hg.connect(bus);
      h.start(t);
      bassOsc.frequency.setTargetAtTime(notes[step % notes.length], t, 0.02);
      bassFlt.frequency.setTargetAtTime(110 + 280 * Math.abs(Math.sin(step * 0.7)), t, 0.05);
      step++;
    }
    tick();
    this.demoTimer = setInterval(tick, stepDur * 1000);
    this.sourceKind = 'synth';
    this.sourceLabel = 'DEMO SINTÉTICO 135BPM';
  };

  AudioEngine.prototype.canPause = function () {
    return this.sourceKind === 'demo' || this.sourceKind === 'file' || this.sourceKind === 'synth';
  };
  AudioEngine.prototype.isPlaying = function () {
    if (this.fileEl) return !this.fileEl.paused;
    if (this.sourceKind === 'synth') return !this.synthPaused;
    return this.sourceKind === 'mic' || this.sourceKind === 'system';
  };
  AudioEngine.prototype.togglePlay = function () {
    if (this.fileEl) {
      this.fileEl.paused ? this.fileEl.play() : this.fileEl.pause();
      return !this.fileEl.paused;
    }
    if (this.sourceKind === 'synth') {
      this.synthPaused = !this.synthPaused;
      if (this.synthBus) this.synthBus.gain.setTargetAtTime(this.synthPaused ? 0 : 0.8, this.ctx.currentTime, 0.03);
      return !this.synthPaused;
    }
    return true;
  };

  /* ---------- ÁUDIO DO SISTEMA: loopback nativo (sem driver, sem mic) ---------- */
  AudioEngine.prototype.startSystemLoopback = function () {
    this.ensureCtx();
    var self = this;
    if (!(window.caramujo && window.caramujo.enableLoopback)) {
      return Promise.reject(new Error('sem-loopback-nativo'));
    }
    return window.caramujo.enableLoopback().then(function () {
      // constraint exigente aqui faz o backend REJEITAR a captura inteira
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }).then(function (stream) {
      stream.getVideoTracks().forEach(function (tk) { try { tk.stop(); } catch (e) {} stream.removeTrack(tk); });
      return Promise.resolve(window.caramujo.disableLoopback()).catch(function () {}).then(function () {
        var tracks = stream.getAudioTracks();
        if (!tracks.length) throw new Error('loopback-sem-audio');
        try {
          if (tracks[0].applyConstraints) tracks[0].applyConstraints({ channelCount: 2 }).catch(function () {});
        } catch (e) {}
        self.stopSource();
        self.stream = stream;
        self.source = self.ctx.createMediaStreamSource(stream);
        self.source.connect(self.input);
        self.monitor.gain.value = 0;
        self.sourceKind = 'system';
        self.sourceLabel = 'ÁUDIO DO COMPUTADOR';
        return 'native';
      });
    }).catch(function (err) {
      try { window.caramujo.disableLoopback(); } catch (e) {}
      throw err;
    });
  };

  /* ---------- CAPTURA NATIVA: PCM direto no anel, sem AudioContext ---------- */
  AudioEngine.prototype.startNativeCapture = function () {
    var self = this;
    if (!(window.caramujo && window.caramujo.nativeStart)) {
      return Promise.reject(new Error('sem-ponte-nativa'));
    }
    return Promise.resolve(window.caramujo.nativeAvailable()).then(function (ok) {
      if (!ok) throw new Error('modulo-nativo-nao-instalado');
      return window.caramujo.nativeStart();
    }).then(function (info) {
      var rate = (info && info.sampleRate) || 48000;
      self.stopSource();
      self.sr = rate;
      self.binHz = (rate / 2) / (FFT_N / 2);
      self.setupLufs(rate);
      self.setupBeat();
      self.sourceKind = 'system';
      self.sourceLabel = (info && info.name) || 'ÁUDIO DO COMPUTADOR';
      self.nativeChannels = (info && info.channels) || 2;
      self.nativeOn = true;
      if (!self._nativeWired) {
        self._nativeWired = true;
        window.caramujo.onNativeAudio(function (buf) { self.pushNativePCM(buf); });
        if (window.caramujo.onNativeError) window.caramujo.onNativeError(function () {});
      }
      return 'native';
    });
  };

  /* ---------- ENTRADA (BlackHole / mic) ---------- */
  AudioEngine.prototype.listInputs = function () {
    return navigator.mediaDevices.enumerateDevices().then(function (devs) {
      return devs.filter(function (d) { return d.kind === 'audioinput'; });
    });
  };

  AudioEngine.prototype.startInput = function (deviceId) {
    this.ensureCtx();
    var self = this;
    var constraints = {
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, noiseSuppression: false, autoGainControl: false,
        channelCount: 2
      }
    };
    return navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      self.stopSource();
      self.stream = stream;
      self.source = self.ctx.createMediaStreamSource(stream);
      self.source.connect(self.input);
      self.monitor.gain.value = 0;
      self.sourceKind = 'mic';
    });
  };

  /* ---------- ARQUIVO ---------- */
  AudioEngine.prototype.playFile = function (file) {
    this.ensureCtx(); this.stopSource();
    var el = new Audio();
    el.src = URL.createObjectURL(file);
    el.loop = true;
    this.fileEl = el;
    this.source = this.ctx.createMediaElementSource(el);
    this.source.connect(this.input);
    this.monitor.gain.value = 1;
    this.sourceKind = 'file';
    this.sourceLabel = file.name.toUpperCase();
    return el.play();
  };

  /* ================= ANÁLISE DO QUADRO ================= */
  AudioEngine.prototype.update = function (dt) {
    if (this.sourceKind === 'none') return;
    this._frame = (this._frame || 0) + 1;   // marca o quadro: o espectro grande roda 1x só

    // 1) puxa o que chegou desde o último quadro
    if (this.sab) this.drainSab();
    if (!this.tapNode && !this.nativeOn) {
      // sem tap: rede de segurança (AnalyserNode). Uma leitura por quadro.
      if (!this.analyser) this.setupAnalyserFallback();
      this.feedFromAnalyser(dt);
    }
    if (!this.hasRing) return;

    var now = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
    var mask = RING - 1, i;

    // 2) LUFS e beat: TODAS as amostras novas, sem pular nem repetir
    var from = this.rd, to = this.wr;
    if (to - from > RING) from = to - RING;         // ficou parado demais: pula o que já perdeu
    if (to > from) {
      this.processLufs(from, to);
      this.processBeat(from, to);
      this.rd = to;
    }
    this.beat = this.beatHit;
    this.beatHit = false;
    this.beatPulse = Math.max(0, this.beatPulse - dt * 3.2);
    this.updateReacao(dt);
    this.lufsAvgVal = this.lufsI;

    // 3) recortes de tempo (o mais NOVO no fim, como o AnalyserNode entregava)
    var t = this.time, n2 = t.length, base = (this.wr - n2) & mask;
    var L = this.ringL, R = this.ringR;
    for (i = 0; i < n2; i++) { var k = (base + i) & mask; t[i] = (L[k] + R[k]) * 0.5; }
    var nl = this.timeL.length, bl = (this.wr - nl) & mask;
    for (i = 0; i < nl; i++) { var k2 = (bl + i) & mask; this.timeL[i] = L[k2]; this.timeR[i] = R[k2]; }

    // 4) nível instantâneo: janela de 5ms, não de 21ms
    var fastN = Math.min(FAST_N, this.wr), fb = (this.wr - fastN) & mask, rms = 0, pk = 0;
    for (i = 0; i < fastN; i++) {
      var kk = (fb + i) & mask, v = (L[kk] + R[kk]) * 0.5, a = v < 0 ? -v : v;
      rms += v * v; if (a > pk) pk = a;
    }
    rms = fastN ? Math.sqrt(rms / fastN) : 0;
    this.rms = rms; this.peak = pk;

    // 5) espectro: FFT própria nas amostras mais novas
    var mag = this.fft.runRing(t, n2);      // t já é o mono mais recente, alinhado no fim
    var nb = mag.length, freq = this.freq, fdb = this.freqDb;
    var legacySpan = LEGACY_TOP - LEGACY_FLOOR;   // 70
    var dispSpan = 0 - DISP_FLOOR;                // 100
    for (i = 0; i < nb; i++) {
      var m2 = mag[i];
      var db = m2 > 1e-7 ? 20 * Math.log10(m2) : -140;
      fdb[i] = db;
      /* freq[] segue o MAPA DA V1 de propósito (piso -100, teto -30, +5,1dB do antigo
         analysisGain 1.8). É o que todo módulo de arte usa pra reagir: mudar aqui mudaria
         a cara de tudo. O eixo honesto vive em freqDb[]. */
      var lv = (db + LEGACY_GAIN_DB - LEGACY_FLOOR) / legacySpan;
      freq[i] = lv <= 0 ? 0 : lv >= 1 ? 255 : lv * 255;
    }

    // 6) bandas e centroide (mesma conta da v1, agora com o binHz certo)
    var binHz = this.binHz = (this.sr / 2) / nb;
    var bEnd = Math.max(2, Math.round(150 / binHz));
    var mEnd = Math.min(nb, Math.round(2000 / binHz));
    var hEnd = Math.min(nb, Math.round(10000 / binHz));
    var bass = 0, mid = 0, high = 0, sum = 0, wsum = 0;
    for (i = 1; i < bEnd; i++) bass += freq[i];
    for (i = bEnd; i < mEnd; i++) mid += freq[i];
    for (i = mEnd; i < hEnd; i++) high += freq[i];
    for (i = 1; i < nb; i++) { sum += freq[i]; wsum += freq[i] * i; }
    bass /= Math.max(1, bEnd - 1) * 255;
    mid /= Math.max(1, mEnd - bEnd) * 255;
    high /= Math.max(1, hEnd - mEnd) * 255;
    this.centroid = sum > 0 ? (wsum / sum) / nb : 0.3;

    var kd = 1 - Math.pow(0.0001, dt);
    this.bass += (bass - this.bass) * (bass > this.bass ? 0.9 : kd * 0.9);
    this.mid += (mid - this.mid) * (mid > this.mid ? 0.9 : kd * 0.9);
    this.high += (high - this.high) * (high > this.high ? 0.9 : kd * 0.9);
    this.level += (rms - this.level) * (rms > this.level ? 0.92 : kd);

    // 7) latência honesta: idade da amostra mais nova + metade da janela rápida
    var age = Math.max(0, now - this.lastFeedAt);
    var lat = age + this.chunkMs * 0.5 + (FAST_N * 0.5 / this.sr) * 1000;
    if (this.usedFallback) lat += (FFT_N * 0.5 / this.sr) * 1000;
    this.latencyMs = this.latencyMs ? this.latencyMs * 0.85 + lat * 0.15 : lat;
  };

  /* ---------- ESPECTRO DE ALTA RESOLUÇÃO (o do MiniMeters) ----------
     A FFT rápida de 1024 é o que alimenta nível, bandas e beat: é ela que mantém a
     reação instantânea. O ESPECTRO pede outra coisa: janela grande pra separar as
     frequências (4096 = 85ms). No MiniMeters isso é uma configuração DO espectro,
     não do app, e aqui é igual. Roda no máximo uma vez por quadro, mesmo com vários
     painéis de espectro abertos. */
  /* ch: undefined = mistura dos dois canais (como sempre foi), 'l' ou 'r' = um canal
     só. O MiniMeters desenha DUAS curvas, uma por canal, e é isso que dá a leitura
     de estéreo no espectro. Cada canal tem a sua caixa de cache, então nenhuma FFT
     nasce duas vezes. */
  AudioEngine.prototype.spectrum = function (n, ch) {
    n = n || 4096;
    if (n < 1024) n = 1024; if (n > 16384) n = 16384;
    /* CACHE POR TAMANHO, não uma posição só. Com uma posição só, dois painéis de
       Espectro em tamanhos diferentes (4096 e 8192) reconstruíam as tabelas da FFT
       em TODO quadro: 378 µs contra 77 µs, 5x mais caro, e as tabelas de seno,
       cosseno e bit-reverse eram jogadas fora duas vezes por quadro. Agora cada
       tamanho tem a sua caixa e a FFT nasce uma vez na vida. */
    var slots = this._spec || (this._spec = {});
    var key = (ch === 'l' || ch === 'r') ? n + ch : n;
    var sl = slots[key];
    if (!sl) sl = slots[key] = { fft: new FFT(n), buf: new Float32Array(n), db: new Float32Array(n / 2), frame: -1 };
    // o módulo lê specBinHz logo depois de chamar: precisa valer também no cache quente
    this.specBinHz = (this.sr / 2) / (n / 2);
    this._specN = n; this._specDb = sl.db;    // compatibilidade com quem lia esses nomes
    if (sl.frame === this._frame) return sl.db;
    var mask = RING - 1, L = this.ringL, R = this.ringR, buf = sl.buf;
    var have = Math.min(this.wr, n), base = (this.wr - have) & mask;
    var i, pad = n - have;
    for (i = 0; i < pad; i++) buf[i] = 0;
    if (ch === 'l') { for (i = 0; i < have; i++) buf[pad + i] = L[(base + i) & mask]; }
    else if (ch === 'r') { for (i = 0; i < have; i++) buf[pad + i] = R[(base + i) & mask]; }
    else { for (i = 0; i < have; i++) { var k = (base + i) & mask; buf[pad + i] = (L[k] + R[k]) * 0.5; } }
    var mag = sl.fft.runRing(buf, n);
    var db = sl.db;
    for (i = 0; i < mag.length; i++) db[i] = mag[i] > 1e-7 ? 20 * Math.log10(mag[i]) : -140;
    sl.frame = this._frame;
    return db;
  };

  // valor principal do medidor: LUFS momentâneo (400ms), como manda a BS.1770
  AudioEngine.prototype.lufsApprox = function () {
    return this.lufsM !== undefined ? Math.max(-70, this.lufsM) : -70;
  };

  window.AudioEngine = AudioEngine;
  window.CV_FFT = FFT;            // usado pelo teste
})();
