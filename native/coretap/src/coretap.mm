/* coretap: captura do som do sistema pelo "process tap" do Core Audio (macOS 14.2+).
   Diferença pro ScreenCaptureKit: aqui o TAMANHO DO BLOCO é nosso (kAudioDevicePropertyBufferFrameSize),
   então o som chega em blocos de 128 a 512 amostras (2,7 a 10,7 ms) em vez dos 20 ms fixos.

   Caminho: CATapDescription (tap global estéreo, sem mutar nada) → dispositivo agregado privado
   com o tap dentro → IOProc em tempo real copia pra um anel sem trava → uma thread de
   drenagem converte pra int16 intercalado e entrega pro JS (mesmo formato do módulo nativo).

   API JS:
     isSupported()            → bool (macOS >= 14.2)
     permission()             → 'authorized' | 'denied' | 'unknown'
     start({frames}, cb)      → { sampleRate, channels, frames, name }   (lança Error com a causa)
                                cb(tipo, buffer): tipo 0 = bloco PCM int16 intercalado, tipo 1 = a saída padrão mudou
     stop()                   → void */
#import <Foundation/Foundation.h>
#import <CoreAudio/CoreAudio.h>
#if __has_include(<CoreAudio/CATapDescription.h>) && __has_include(<CoreAudio/AudioHardwareTapping.h>)
#import <CoreAudio/AudioHardwareTapping.h>
#import <CoreAudio/CATapDescription.h>
#define CV_TEM_TAP 1
#else
#define CV_TEM_TAP 0   // SDK antigo (Command Line Tools < macOS 14.2): compila, mas o tap responde "sdk-sem-tap"
#endif
#include <napi.h>
#include <cstdio>
#include <atomic>
#include <thread>
#include <vector>
#include <string>
#include <cmath>
#include <dlfcn.h>
#include <dispatch/dispatch.h>

namespace {

const size_t kRing = 1 << 15;                 // quadros (potência de 2): ~680 ms a 48 kHz

struct Pacote { int tipo; std::vector<int16_t> pcm; };

struct Estado {
  AudioObjectID tap = kAudioObjectUnknown;
  AudioObjectID agg = kAudioObjectUnknown;
  AudioDeviceIOProcID proc = nullptr;
  Napi::ThreadSafeFunction tsfn;
  bool ativo = false;
  std::atomic<bool> rodando{false};
  std::thread dreno;
  dispatch_semaphore_t sem = nullptr;
  std::vector<float> anel;                    // L,R intercalado
  std::atomic<uint64_t> w{0}, r{0};
  UInt32 canais = 2;
  bool naoIntercalado = false;
  AudioObjectPropertyListenerBlock ouvinte = nil;
  AudioObjectPropertyAddress endSaida = { kAudioHardwarePropertyDefaultOutputDevice, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
};
// vazado de propósito: se o processo sair sem stop(), o destrutor da thread não derruba o app
Estado& E = *new Estado();

bool temTap() {
#if CV_TEM_TAP
  if (@available(macOS 14.2, *)) return true;
#endif
  return false;
}

void entrega(int tipo, std::vector<int16_t>&& pcm) {
  if (!E.ativo) return;
  auto* p = new Pacote{tipo, std::move(pcm)};
  napi_status st = E.tsfn.NonBlockingCall(p, [](Napi::Env env, Napi::Function cb, Pacote* d) {
    if (d->tipo == 0 && !d->pcm.empty()) {
      auto buf = Napi::Buffer<uint8_t>::Copy(env, reinterpret_cast<uint8_t*>(d->pcm.data()), d->pcm.size() * sizeof(int16_t));
      cb.Call({Napi::Number::New(env, 0), buf});
    } else {
      cb.Call({Napi::Number::New(env, d->tipo), env.Undefined()});
    }
    delete d;
  });
  if (st != napi_ok) delete p;               // fila cheia: perde o bloco, nunca trava o áudio
}

void drena() {
  while (E.rodando.load(std::memory_order_acquire)) {
    dispatch_semaphore_wait(E.sem, dispatch_time(DISPATCH_TIME_NOW, 200 * NSEC_PER_MSEC));
    uint64_t w = E.w.load(std::memory_order_acquire), r = E.r.load(std::memory_order_relaxed);
    if (w == r) continue;
    size_t n = (size_t)(w - r);
    std::vector<int16_t> pcm(n * 2);
    for (size_t i = 0; i < n; i++) {
      size_t k = (size_t)((r + i) & (kRing - 1)) * 2;
      for (int c = 0; c < 2; c++) {
        float v = E.anel[k + c];
        v = v > 1.f ? 1.f : (v < -1.f ? -1.f : v);
        pcm[i * 2 + c] = (int16_t)lrintf(v * 32767.f);
      }
    }
    E.r.store(w, std::memory_order_release);
    entrega(0, std::move(pcm));
  }
}

std::string erroOS(const char* oque, OSStatus st) {
  char b[96];
  snprintf(b, sizeof b, "%s (OSStatus %d)", oque, (int)st);
  return b;
}

void desmonta() {
  E.rodando.store(false, std::memory_order_release);
  if (E.sem) dispatch_semaphore_signal(E.sem);
  if (E.dreno.joinable()) E.dreno.join();
  if (E.ouvinte) {
    AudioObjectRemovePropertyListenerBlock(kAudioObjectSystemObject, &E.endSaida, dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), E.ouvinte);
    E.ouvinte = nil;
  }
  if (E.agg != kAudioObjectUnknown && E.proc) {
    AudioDeviceStop(E.agg, E.proc);
    AudioDeviceDestroyIOProcID(E.agg, E.proc);
  }
  E.proc = nullptr;
  if (E.agg != kAudioObjectUnknown) { AudioHardwareDestroyAggregateDevice(E.agg); E.agg = kAudioObjectUnknown; }
#if CV_TEM_TAP
  if (@available(macOS 14.2, *)) {
    if (E.tap != kAudioObjectUnknown) { AudioHardwareDestroyProcessTap(E.tap); }
  }
#endif
  E.tap = kAudioObjectUnknown;
  if (E.ativo) { E.tsfn.Release(); E.ativo = false; }
  E.sem = nullptr;
}

Napi::Value IsSupported(const Napi::CallbackInfo& info) {
  return Napi::Boolean::New(info.Env(), temTap());
}

/* Permissão "Captura de áudio do sistema" (TCC). Não existe API pública: lê pelo framework privado
   do TCC, como os apps de captura fazem. Se não achar, devolve 'unknown' e o app tenta mesmo assim. */
Napi::Value Permission(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  void* h = dlopen("/System/Library/PrivateFrameworks/TCC.framework/Versions/A/TCC", RTLD_NOW);
  if (!h) return Napi::String::New(env, "unknown");
  typedef int (*Fn)(CFStringRef, CFDictionaryRef);
  Fn fn = (Fn)dlsym(h, "TCCAccessPreflight");
  if (!fn) return Napi::String::New(env, "unknown");
  int r = fn(CFSTR("kTCCServiceAudioCapture"), NULL);
  return Napi::String::New(env, r == 0 ? "authorized" : (r == 1 ? "denied" : "unknown"));
}

Napi::Value Stop(const Napi::CallbackInfo& info) {
  desmonta();
  return info.Env().Undefined();
}

Napi::Value Start(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  if (!temTap()) { Napi::Error::New(env, "so-macos-14.2").ThrowAsJavaScriptException(); return env.Undefined(); }
  if (info.Length() < 2 || !info[1].IsFunction()) { Napi::TypeError::New(env, "start(opts, cb)").ThrowAsJavaScriptException(); return env.Undefined(); }
  desmonta();                                  // um tap por vez

  UInt32 frames = 256;
  if (info[0].IsObject()) {
    Napi::Value f = info[0].As<Napi::Object>().Get("frames");
    if (f.IsNumber()) { double v = f.As<Napi::Number>().DoubleValue(); if (v >= 32 && v <= 4096) frames = (UInt32)v; }
  }

  std::string falha;
  double taxa = 48000; UInt32 canais = 2, framesReal = frames;
  std::string nomeSaida = "ÁUDIO DO COMPUTADOR";

  @autoreleasepool {
#if CV_TEM_TAP
    if (@available(macOS 14.2, *)) {
      // 1) saída padrão: o agregado precisa de um relógio
      AudioDeviceID saida = kAudioObjectUnknown; UInt32 sz = sizeof(saida);
      OSStatus st = AudioObjectGetPropertyData(kAudioObjectSystemObject, &E.endSaida, 0, nullptr, &sz, &saida);
      if (st != noErr || saida == kAudioObjectUnknown) falha = erroOS("sem-saida-padrao", st);
      NSString* uidSaida = nil;
      if (falha.empty()) {
        AudioObjectPropertyAddress ua = { kAudioDevicePropertyDeviceUID, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
        CFStringRef uid = NULL; sz = sizeof(uid);
        st = AudioObjectGetPropertyData(saida, &ua, 0, nullptr, &sz, &uid);
        if (st != noErr || !uid) falha = erroOS("sem-uid-da-saida", st); else uidSaida = (__bridge_transfer NSString*)uid;
        AudioObjectPropertyAddress na = { kAudioObjectPropertyName, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
        CFStringRef nm = NULL; sz = sizeof(nm);
        if (AudioObjectGetPropertyData(saida, &na, 0, nullptr, &sz, &nm) == noErr && nm) nomeSaida = std::string([(__bridge_transfer NSString*)nm UTF8String] ?: "");
      }
      // 2) o tap: global estéreo, sem silenciar nada, privado do processo
      CATapDescription* desc = nil;
      if (falha.empty()) {
        desc = [[CATapDescription alloc] initStereoGlobalTapButExcludeProcesses:@[]];
        desc.name = @"Caramujo Vision";
        desc.muteBehavior = CATapUnmuted;
        @try { [desc setValue:@YES forKey:@"privateTap"]; } @catch (NSException* ex) {}   // tap só deste processo; se a chave mudar, segue público
        st = AudioHardwareCreateProcessTap(desc, &E.tap);
        if (st != noErr) falha = erroOS("tap-recusado", st);
      }
      // 3) agregado privado com o tap dentro
      if (falha.empty()) {
        NSString* uidTap = [desc.UUID UUIDString];
        NSDictionary* agg = @{
          @kAudioAggregateDeviceNameKey: @"Caramujo Vision Tap",
          @kAudioAggregateDeviceUIDKey: [[NSUUID UUID] UUIDString],
          @kAudioAggregateDeviceMainSubDeviceKey: uidSaida,
          @kAudioAggregateDeviceIsPrivateKey: @YES,
          @kAudioAggregateDeviceIsStackedKey: @NO,
          @kAudioAggregateDeviceTapAutoStartKey: @YES,
          @kAudioAggregateDeviceSubDeviceListKey: @[ @{ @kAudioSubDeviceUIDKey: uidSaida } ],
          @kAudioAggregateDeviceTapListKey: @[ @{ @kAudioSubTapDriftCompensationKey: @YES, @kAudioSubTapUIDKey: uidTap } ]
        };
        st = AudioHardwareCreateAggregateDevice((__bridge CFDictionaryRef)agg, &E.agg);
        if (st != noErr) falha = erroOS("agregado-recusado", st);
      }
      // 4) formato do tap
      if (falha.empty()) {
        AudioObjectPropertyAddress fa = { kAudioTapPropertyFormat, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
        AudioStreamBasicDescription asbd = {}; sz = sizeof(asbd);
        st = AudioObjectGetPropertyData(E.tap, &fa, 0, nullptr, &sz, &asbd);
        if (st != noErr) falha = erroOS("sem-formato-do-tap", st);
        else if (asbd.mFormatID != kAudioFormatLinearPCM || !(asbd.mFormatFlags & kAudioFormatFlagIsFloat) || asbd.mBitsPerChannel != 32) falha = "formato-do-tap-inesperado";
        else {
          taxa = asbd.mSampleRate; canais = asbd.mChannelsPerFrame ? asbd.mChannelsPerFrame : 2;
          E.canais = canais; E.naoIntercalado = (asbd.mFormatFlags & kAudioFormatFlagIsNonInterleaved) != 0;
        }
      }
      // 5) bloco pequeno (se o dispositivo não aceitar, fica com o que ele der)
      if (falha.empty()) {
        AudioObjectPropertyAddress ba = { kAudioDevicePropertyBufferFrameSize, kAudioObjectPropertyScopeGlobal, kAudioObjectPropertyElementMain };
        AudioObjectSetPropertyData(E.agg, &ba, 0, nullptr, sizeof(frames), &frames);
        UInt32 lido = 0; sz = sizeof(lido);
        if (AudioObjectGetPropertyData(E.agg, &ba, 0, nullptr, &sz, &lido) == noErr && lido > 0) framesReal = lido;
      }
      // 6) anel, thread de drenagem e IOProc
      if (falha.empty()) {
        E.anel.assign(kRing * 2, 0.f);
        E.w.store(0); E.r.store(0);
        E.sem = dispatch_semaphore_create(0);
        E.tsfn = Napi::ThreadSafeFunction::New(env, info[1].As<Napi::Function>(), "coretap", 64, 1);
        E.ativo = true;
        E.rodando.store(true, std::memory_order_release);
        E.dreno = std::thread(drena);
        st = AudioDeviceCreateIOProcIDWithBlock(&E.proc, E.agg, nullptr,
          ^(const AudioTimeStamp* t1, const AudioBufferList* entrada, const AudioTimeStamp* t2, AudioBufferList* saidaBuf, const AudioTimeStamp* t3) {
            // tempo real: nada de alocar, nada de ObjC, nada de JS aqui
            if (!entrada || entrada->mNumberBuffers == 0) return;
            const AudioBuffer& b0 = entrada->mBuffers[0];
            const float* L = (const float*)b0.mData;
            const float* R = L;
            size_t n, passo;
            if (!L) return;
            if (E.naoIntercalado && entrada->mNumberBuffers >= 2) {
              n = b0.mDataByteSize / sizeof(float); passo = 1;
              if (entrada->mBuffers[1].mData) R = (const float*)entrada->mBuffers[1].mData;
            } else {
              UInt32 ch = b0.mNumberChannels ? b0.mNumberChannels : E.canais;
              if (ch == 0) return;
              n = b0.mDataByteSize / (sizeof(float) * ch); passo = ch;
              if (ch > 1) R = L + 1;
            }
            uint64_t w = E.w.load(std::memory_order_relaxed), r = E.r.load(std::memory_order_acquire);
            if (w + n - r > kRing) return;               // anel cheio: descarta o bloco, não trava
            for (size_t i = 0; i < n; i++) {
              size_t k = (size_t)((w + i) & (kRing - 1)) * 2;
              E.anel[k] = L[i * passo]; E.anel[k + 1] = R[i * passo];
            }
            E.w.store(w + n, std::memory_order_release);
            dispatch_semaphore_signal(E.sem);
          });
        if (st != noErr) falha = erroOS("ioproc-recusado", st);
        else {
          st = AudioDeviceStart(E.agg, E.proc);
          if (st != noErr) falha = erroOS("start-recusado", st);
        }
      }
      // 7) saída padrão trocou (fone, AirPods): avisa pro JS recomeçar
      if (falha.empty()) {
        E.ouvinte = ^(UInt32 n, const AudioObjectPropertyAddress* a) { entrega(1, {}); };
        AudioObjectAddPropertyListenerBlock(kAudioObjectSystemObject, &E.endSaida, dispatch_get_global_queue(QOS_CLASS_USER_INITIATED, 0), E.ouvinte);
      }
    } else {
      falha = "so-macos-14.2";
    }
#else
    falha = "sdk-sem-tap";
#endif
  }

  if (!falha.empty()) {
    desmonta();
    Napi::Error::New(env, falha).ThrowAsJavaScriptException();
    return env.Undefined();
  }
  Napi::Object o = Napi::Object::New(env);
  o.Set("sampleRate", Napi::Number::New(env, taxa));
  o.Set("channels", Napi::Number::New(env, 2));      // sempre entregue em estéreo intercalado
  o.Set("frames", Napi::Number::New(env, framesReal));
  o.Set("name", Napi::String::New(env, nomeSaida));
  return o;
}

Napi::Object Init(Napi::Env env, Napi::Object exports) {
  exports.Set("isSupported", Napi::Function::New(env, IsSupported));
  exports.Set("permission", Napi::Function::New(env, Permission));
  exports.Set("start", Napi::Function::New(env, Start));
  exports.Set("stop", Napi::Function::New(env, Stop));
  return exports;
}

}  // namespace

NODE_API_MODULE(coretap, Init)
