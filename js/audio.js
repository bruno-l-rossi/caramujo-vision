/* Caramujo Vision — motor de áudio
   Fontes: demo (beat da semana em assets/, ou sintetizador se faltar o arquivo),
   entrada de áudio (BlackHole/mic), arquivo arrastado.
   Expõe por frame: freq, time, timeL, timeR, rms, peak, bass, mid, high, centroid, beat, level. */

(function () {
  'use strict';

  function AudioEngine() {
    this.ctx = null;
    this.analyser = null;
    this.anL = null;
    this.anR = null;
    this.source = null;
    this.sourceKind = 'none';  // none | demo | synth | mic | file
    this.sourceLabel = '';
    this.stream = null;
    this.demoNodes = [];
    this.demoTimer = null;
    this.synthPaused = false;
    this.fileEl = null;
    this.recordDest = null;

    this.freq = new Uint8Array(1024);
    this.time = new Float32Array(2048);
    this.timeL = new Float32Array(1024);
    this.timeR = new Float32Array(1024);

    this.rms = 0; this.peak = 0; this.level = 0;
    this.bass = 0; this.mid = 0; this.high = 0;
    this.centroid = 0.3;
    this.beat = false; this.beatPulse = 0;
    this._bassHist = []; this._beatCool = 0;
    this._peakHold = 0;
    this._sumSq = 0; this._sumN = 0;
    this.lufsAvgVal = -70;
  }

  AudioEngine.prototype.ensureCtx = function () {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    var AC = window.AudioContext || window.webkitAudioContext;
    // latencyHint 0 = o menor buffer que a placa aceitar; se o navegador não engolir, cai no padrão
    try { this.ctx = new AC({ latencyHint: 0 }); }
    catch (e) { this.ctx = new AC({ latencyHint: 'interactive' }); }
    this.buildGraph();
  };

  /* monta o grafo em cima do this.ctx atual (separado porque a captura nativa
     precisa recriar o contexto na taxa dela, 48kHz, e remontar tudo igual) */
  AudioEngine.prototype.buildGraph = function () {
    this.analyser = this.ctx.createAnalyser();
    // janela menor = menos atraso entre tocar e desenhar (2048 @48k = 42ms; 1024 = 21ms)
    this.analyser.fftSize = 1024;
    this.analyser.smoothingTimeConstant = 0; // zero média entre frames: o mais imediato possível

    this.anL = this.ctx.createAnalyser(); this.anL.fftSize = 1024;
    this.anR = this.ctx.createAnalyser(); this.anR.fftSize = 1024;
    this.anL.smoothingTimeConstant = 0; this.anR.smoothingTimeConstant = 0;

    this.splitter = this.ctx.createChannelSplitter(2);
    this.splitter.connect(this.anL, 0);
    this.splitter.connect(this.anR, 1);

    this.input = this.ctx.createGain(); // tudo entra aqui
    // preserva os 2 canais até o splitter (senão a Web Audio soma tudo e vira mono).
    // try/catch porque nem todo backend aceita: se recusar, segue no padrão em vez de quebrar.
    try {
      this.input.channelCount = 2;
      this.input.channelCountMode = 'explicit';
      this.input.channelInterpretation = 'discrete';
    } catch (e) {}
    // ganho de análise: o loopback do sistema chega mais baixo que apps nativos (tipo MiniMeters).
    // esse ganho sobe só o que os medidores/visuais enxergam, sem mexer no monitor nem na gravação.
    this.analysisGain = this.ctx.createGain();
    this.analysisGain.gain.value = 1.8;
    try {
      this.analysisGain.channelCount = 2;
      this.analysisGain.channelCountMode = 'explicit';
      this.analysisGain.channelInterpretation = 'discrete';
    } catch (e) {}
    this.input.connect(this.analysisGain);
    this.analysisGain.connect(this.analyser);
    this.analysisGain.connect(this.splitter);

    // monitor: liga o som nas caixas pra demo/arquivo, desliga pra entrada (evita eco)
    this.monitor = this.ctx.createGain();
    this.monitor.gain.value = 0;
    this.input.connect(this.monitor);
    this.monitor.connect(this.ctx.destination);

    this.recordDest = this.ctx.createMediaStreamDestination();
    this.input.connect(this.recordDest);

    this.freq = new Uint8Array(this.analyser.frequencyBinCount);
    this.time = new Float32Array(this.analyser.fftSize);
    this.timeL = new Float32Array(this.anL.fftSize);
    this.timeR = new Float32Array(this.anR.fftSize);

    this.setupWorklet();
  };

  /* Medidor de nível no AudioWorklet: lê as amostras na hora que chegam (blocos de 128),
     sem esperar a janela da FFT. É o que faz o nível e o beat responderem em tempo real. */
  AudioEngine.prototype.setupWorklet = function () {
    if (this._workletTried || !this.ctx.audioWorklet) return;
    this._workletTried = true;
    var self = this;
    var code = [
      'class LvlProc extends AudioWorkletProcessor {',
      '  constructor(){ super(); this.acc = 0; this.n = 0; this.pk = 0; }',
      '  process(inputs){',
      '    const inp = inputs[0];',
      '    if (inp && inp.length) {',
      '      const ch = inp[0], L = ch ? ch.length : 0;',
      '      for (let i = 0; i < L; i++) {',
      '        const v = ch[i], a = v < 0 ? -v : v;',
      '        this.acc += v * v; this.n++;',
      '        if (a > this.pk) this.pk = a;',
      '      }',
      '      if (this.n >= 128) {',
      '        this.port.postMessage({ r: Math.sqrt(this.acc / this.n), p: this.pk });',
      '        this.acc = 0; this.n = 0; this.pk = 0;',
      '      }',
      '    }',
      '    return true;',
      '  }',
      '}',
      'registerProcessor("cv-lvl", LvlProc);'
    ].join('\n');
    var url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    this.ctx.audioWorklet.addModule(url).then(function () {
      URL.revokeObjectURL(url);
      var node = new AudioWorkletNode(self.ctx, 'cv-lvl');
      node.port.onmessage = function (e) {
        self.liveRms = e.data.r;
        self.livePeak = e.data.p;
        self._liveAt = performance.now();
      };
      self.analysisGain.connect(node);
      self.workletNode = node;
    }).catch(function () { /* sem worklet: cai pro cálculo por frame, só um tico mais lento */ });
  };

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
    this._sumSq = 0; this._sumN = 0; this.lufsAvgVal = -70;
  };

  /* ---------- DEMO: beat da semana (assets/) com fallback pro sintetizador ----------
     Toca na hora, dentro do clique do usuário (senão o Chrome bloqueia o som).
     wav primeiro na fila. Se o navegador bloquear o autoplay, deixa engatilhado
     e o botão ▶ destrava. */
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
        el.play().then(function () {
          wire(el); // toca já; o roteamento entra em seguida, mesmo áudio
          resolve('beat');
        }).catch(function (err) {
          if (err && err.name === 'NotAllowedError') {
            // arquivo existe, navegador travou o autoplay: engatilha e espera o ▶
            wire(el);
            resolve('blocked');
          } else {
            tryNext(); // formato não existe: tenta o próximo
          }
        });
      }
      tryNext();
    });
  };

  /* sintetizador interno: 135 BPM em Gm (o LEGO da vez), audível */
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

    var nb = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
    var nd = nb.getChannelData(0);
    for (var i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    var bpm = 135, stepDur = 60 / bpm / 2, step = 0;
    var notes = [49, 49, 58.3, 49, 43.7, 49, 73.4, 58.3]; // Gm

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

  /* ---------- play/pause da fonte atual ---------- */
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

  /* ---------- ÁUDIO DO SISTEMA: loopback nativo (sem driver, sem mic) ----------
     Só roda no app de computador. Pede ao processo principal pra ligar o loopback,
     puxa o som que sai das caixas via getDisplayMedia, joga fora o vídeo e escuta.
     Não passa pelo microfone: é uma cópia direta do que o Mac está tocando. */
  AudioEngine.prototype.startSystemLoopback = function () {
    this.ensureCtx();
    var self = this;
    if (!(window.caramujo && window.caramujo.enableLoopback)) {
      return Promise.reject(new Error('sem-loopback-nativo'));
    }
    return window.caramujo.enableLoopback().then(function () {
      // audio: true e nada mais. Constraint exigente aqui faz o backend REJEITAR a captura inteira
      // (foi o que quebrou o áudio numa rodada). O estéreo a gente tenta depois, sem risco.
      return navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    }).then(function (stream) {
      // o getDisplayMedia exige pedir vídeo; a gente descarta e fica só com o áudio
      stream.getVideoTracks().forEach(function (tk) { try { tk.stop(); } catch (e) {} stream.removeTrack(tk); });
      return Promise.resolve(window.caramujo.disableLoopback()).catch(function () {}).then(function () {
        var tracks = stream.getAudioTracks();
        if (!tracks.length) throw new Error('loopback-sem-audio');
        // tentativa de estéreo DEPOIS que a trilha existe: se falhar, não derruba a captura
        try {
          if (tracks[0].applyConstraints) {
            tracks[0].applyConstraints({ channelCount: 2 }).catch(function () {});
          }
        } catch (e) {}
        self.stopSource();
        self.stream = stream;
        self.source = self.ctx.createMediaStreamSource(stream);
        self.source.connect(self.input);
        self.monitor.gain.value = 0; // já sai nas caixas; não devolve pra não dar eco
        self.sourceKind = 'system';
        self.sourceLabel = 'ÁUDIO DO COMPUTADOR';
        return 'native';
      });
    }).catch(function (err) {
      try { window.caramujo.disableLoopback(); } catch (e) {}
      throw err;
    });
  };

  /* ---------- CAPTURA NATIVA (ESTÉREO de verdade, sem driver externo) ----------
     O processo principal capta pelo ScreenCaptureKit e manda PCM 16-bit intercalado.
     Aqui a gente desintercala em L/R e injeta no grafo por um worklet-fonte, então
     todo o resto do app (espectro, espaço estéreo, gravação) funciona igual. */
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
      self.ensureCtxAtRate(rate);
      self.stopSource();
      return self.makeSrcNode().then(function (node) {
        self.srcNode = node;
        node.connect(self.input);
        self.monitor.gain.value = 0; // já sai nas caixas
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
    });
  };

  // o contexto precisa rodar na mesma taxa do áudio nativo, senão o som "desafina" no tempo
  AudioEngine.prototype.ensureCtxAtRate = function (rate) {
    if (this.ctx && Math.abs(this.ctx.sampleRate - rate) < 1) { this.ensureCtx(); return; }
    if (this.ctx) { try { this.ctx.close(); } catch (e) {} this.ctx = null; this._workletTried = false; this.srcNode = null; }
    var AC = window.AudioContext || window.webkitAudioContext;
    try { this.ctx = new AC({ latencyHint: 0, sampleRate: rate }); }
    catch (e) { try { this.ctx = new AC({ sampleRate: rate }); } catch (e2) { this.ctx = new AC(); } }
    this.buildGraph();
  };

  // worklet-fonte: guarda os pedaços que chegam e entrega amostra por amostra pro grafo
  AudioEngine.prototype.makeSrcNode = function () {
    var self = this;
    if (!this.ctx.audioWorklet) return Promise.reject(new Error('sem-audioworklet'));
    var code = [
      'class SrcProc extends AudioWorkletProcessor {',
      '  constructor(){ super(); this.q = []; this.cur = null; this.pos = 0;',
      // fila curta = menos delay. Se acumular (a captura vem mais rápido que o consumo),
      // joga fora o mais VELHO: melhor um micro-salto do que visual atrasado.
      '    this.port.onmessage = (e) => { this.q.push(e.data); while (this.q.length > 3) this.q.shift(); };',
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

  // PCM 16-bit intercalado (L,R,L,R...) → dois Float32 separados
  AudioEngine.prototype.pushNativePCM = function (buf) {
    if (!this.srcNode || !buf) return;
    var u8 = (buf instanceof Uint8Array) ? buf : new Uint8Array(buf.buffer || buf);
    var i16 = new Int16Array(u8.buffer, u8.byteOffset, Math.floor(u8.byteLength / 2));
    var ch = this.nativeChannels || 2;
    var frames = Math.floor(i16.length / ch);
    if (frames <= 0) return;
    var l = new Float32Array(frames), r = new Float32Array(frames);
    for (var i = 0; i < frames; i++) {
      l[i] = i16[i * ch] / 32768;
      r[i] = ch > 1 ? i16[i * ch + 1] / 32768 : l[i];
    }
    try { this.srcNode.port.postMessage({ l: l, r: r }, [l.buffer, r.buffer]); } catch (e) {}
  };

  /* ---------- ENTRADA (BlackHole / mic) — plano B ---------- */
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
      self.monitor.gain.value = 0; // já está saindo nas caixas; sem eco
      self.sourceKind = 'mic';
    });
  };

  /* ---------- ARQUIVO (mp3/wav arrastado) ---------- */
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

  /* ---------- ANÁLISE POR FRAME ---------- */
  AudioEngine.prototype.update = function (dt) {
    if (!this.ctx) return;
    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getFloatTimeDomainData(this.time);
    this.anL.getFloatTimeDomainData(this.timeL);
    this.anR.getFloatTimeDomainData(this.timeR);

    var f = this.freq, n = f.length;
    var binHz = (this.ctx.sampleRate / 2) / n;
    var bEnd = Math.max(2, Math.round(150 / binHz));
    var mEnd = Math.round(2000 / binHz);
    var hEnd = Math.round(10000 / binHz);

    var bass = 0, mid = 0, high = 0, sum = 0, wsum = 0, i;
    for (i = 1; i < bEnd; i++) bass += f[i];
    for (i = bEnd; i < mEnd; i++) mid += f[i];
    for (i = mEnd; i < Math.min(hEnd, n); i++) high += f[i];
    for (i = 1; i < n; i++) { sum += f[i]; wsum += f[i] * i; }
    bass /= (bEnd - 1) * 255;
    mid /= (mEnd - bEnd) * 255;
    high /= Math.max(1, Math.min(hEnd, n) - mEnd) * 255;
    this.centroid = sum > 0 ? (wsum / sum) / n : 0.3;

    var k = 1 - Math.pow(0.0001, dt);
    // ataque quase instantâneo (segue o som na hora), queda ainda suave
    this.bass += (bass - this.bass) * (bass > this.bass ? 0.9 : k * 0.9);
    this.mid += (mid - this.mid) * (mid > this.mid ? 0.9 : k * 0.9);
    this.high += (high - this.high) * (high > this.high ? 0.9 : k * 0.9);

    var t = this.time, rms = 0, peak = 0, a;
    for (i = 0; i < t.length; i++) { a = Math.abs(t[i]); rms += a * a; if (a > peak) peak = a; }
    rms = Math.sqrt(rms / t.length);
    // se o worklet está vivo, o nível vem dele: chega antes da janela da FFT (menos delay)
    if (this.liveRms !== undefined && (performance.now() - this._liveAt) < 120) {
      rms = this.liveRms;
      if (this.livePeak > peak) peak = this.livePeak;
    }
    this.rms = rms; this.peak = peak;
    this._peakHold = Math.max(peak, this._peakHold - dt * 0.3);
    this.level += (rms - this.level) * (rms > this.level ? 0.92 : k);

    // média de sessão (ignora silêncio)
    if (rms > 0.001) {
      this._sumSq += rms * rms; this._sumN++;
      this.lufsAvgVal = 20 * Math.log10(Math.sqrt(this._sumSq / this._sumN)) - 0.7;
    }

    this._bassHist.push(bass);
    if (this._bassHist.length > 43) this._bassHist.shift();
    var avg = 0; for (i = 0; i < this._bassHist.length; i++) avg += this._bassHist[i];
    avg /= Math.max(1, this._bassHist.length);
    this._beatCool -= dt;
    this.beat = false;
    if (bass > 0.12 && bass > avg * 1.45 && this._beatCool <= 0) {
      this.beat = true; this.beatPulse = 1; this._beatCool = 0.12;
    }
    this.beatPulse = Math.max(0, this.beatPulse - dt * 3.2);
  };

  AudioEngine.prototype.lufsApprox = function () {
    if (this.rms <= 0.00001) return -70;
    return Math.max(-70, 20 * Math.log10(this.rms) - 0.7);
  };

  window.AudioEngine = AudioEngine;
})();
