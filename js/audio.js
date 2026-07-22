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
    this.ctx = new AC({ latencyHint: 'interactive' });

    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.78;

    this.anL = this.ctx.createAnalyser(); this.anL.fftSize = 2048;
    this.anR = this.ctx.createAnalyser(); this.anR.fftSize = 2048;
    this.anL.smoothingTimeConstant = 0; this.anR.smoothingTimeConstant = 0;

    this.splitter = this.ctx.createChannelSplitter(2);
    this.splitter.connect(this.anL, 0);
    this.splitter.connect(this.anR, 1);

    this.input = this.ctx.createGain(); // tudo entra aqui
    this.input.connect(this.analyser);
    this.input.connect(this.splitter);

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
  };

  AudioEngine.prototype.stopSource = function () {
    if (this.demoTimer) { clearInterval(this.demoTimer); this.demoTimer = null; }
    this.demoNodes.forEach(function (n) { try { n.stop ? n.stop() : 0; } catch (e) {} try { n.disconnect(); } catch (e) {} });
    this.demoNodes = [];
    if (this.source) { try { this.source.disconnect(); } catch (e) {} this.source = null; }
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
    return this.sourceKind === 'mic';
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
    this.bass += (bass - this.bass) * (bass > this.bass ? 0.6 : k * 0.9);
    this.mid += (mid - this.mid) * (mid > this.mid ? 0.6 : k * 0.9);
    this.high += (high - this.high) * (high > this.high ? 0.6 : k * 0.9);

    var t = this.time, rms = 0, peak = 0, a;
    for (i = 0; i < t.length; i++) { a = Math.abs(t[i]); rms += a * a; if (a > peak) peak = a; }
    rms = Math.sqrt(rms / t.length);
    this.rms = rms; this.peak = peak;
    this._peakHold = Math.max(peak, this._peakHold - dt * 0.3);
    this.level += (rms - this.level) * (rms > this.level ? 0.5 : k);

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
      this.beat = true; this.beatPulse = 1; this._beatCool = 0.18;
    }
    this.beatPulse = Math.max(0, this.beatPulse - dt * 3.2);
  };

  AudioEngine.prototype.lufsApprox = function () {
    if (this.rms <= 0.00001) return -70;
    return Math.max(-70, 20 * Math.log10(this.rms) - 0.7);
  };

  window.AudioEngine = AudioEngine;
})();
