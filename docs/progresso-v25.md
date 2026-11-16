<progresso_v25>
LEIA junto com docs/plano-v25-fluidez-detalhe-latencia.md. Atualizado a cada etapa. Se a conversa cair, retomar da primeira etapa sem [x].
<decisoes_bruno data="2026-11-16">
D1 Detalhe Alto = padrao (todos os temas). D4 subir Electron: sim. D3 modulo de captura proprio (L4): NAO, por enquanto. D6 apagar instaladores e backups antigos: sim, sempre manter so a versao mais atual salva. D2 e D5: ele mandou seguir todas as fases (captura Automatica entra; faixa rapida entra como opcao).
</decisoes_bruno>
<etapas>
[x] F0 medicao/diagnostico/bancada (feito 16/nov; bancada puppeteer NAO recriada: node sem Chrome aqui, ficou test/bench5.js)
[x] F1 detalhe Alto dos medidores (feito 16/nov; E5 estereo pulado de proposito)
[x] F2 atraso, captura Automatica, Electron
[x] F3/F4 arte e usabilidade
[x] F5 faxina, 2.5.0, docs
</etapas>
<log>
16/nov F0: HUD ganhou linha 'js X ms · tela N Hz · 3 paineis mais caros'; diagText()/copiaDiag() em app.js (botao 'Copiar diagnostico' na aba Audio e tecla C com HUD aberto); p.ms = media movel do draw por painel; telaHz medido no laco.
16/nov F1 audio.js: FFT(N, W) com janela W dentro de FFT N (zero-padding), normalizacao 2/wsum (dB igual em qualquer pad); engine.spectrum(n,ch,pad), spectrumPw (mag2), specCalc(n,ch,pad,endIdx) (cache por n+canal+pad; endIdx>=0 = sem cache de quadro, usado pelo espectrograma).
16/nov F1 modules.js: CV.detalhe ('alto' padrao | 'padrao'), CV.detalhePad(n) (n<=4096 x4, 8192 x2, 16384 x1); espectro usa pad + media direto na potencia; EIXO usa dRaia = sr/n (raia da JANELA, nao do pad) pra 100 Hz/1 kHz/10 kHz ficarem em 29,7/58,6/88,7%; osciloscopio 1 ponto por px no Alto (fora do tema MM); onda le do anel (d.ringL ate d.pos) em vez de timeL; espectrograma colunaPx (1 FFT por coluna ate 4, ImageData, CV.cmapLut); fallback antigo mantido.
16/nov F1 app.js: dprCap 2x tambem pra onda/espectrograma; state.detalhe (normalize migra pra 'alto'); controle Detalhe na aba Visuais; atalho D.
16/nov F1 smoke: 176 checagens ok (8 novas: pad nao muda dB, 4x pontos, tom entre raias, potencia=dB, padrao Alto, migracao, eixo, espectrograma ImageData). Guarda do espectro subiu de 1.200 pra 1.600 pontos por curva (Alto). Cache por tamanho/canal/pad.
16/nov F1 custo (node, test/bench5.js): Mid+Side 4096 pad x1 149 us, x2 331 us, x4 840 us por quadro (~10% de um quadro a 120 Hz). MEDIR NO MAC.
</log>
</progresso_v25>

## F2 — atraso som→olho, captura Automática, Electron novo (feito, 181 checagens ok)
- `js/audio.js`: trilha "reação rápida" (`rapido`, `rdB`): pra fontes assíncronas (nativa) o beat/reação lê até `wr` (bloco mais novo) em vez da cabeça de leitura; LUFS/onda/espectro seguem na cabeça (calibração intacta).
- `js/app.js`: estado `rapido` (padrão ligado), `captura:'auto'` (padrão; migração única via `v25`), `capAuto` guarda a decisão. `startComputerAudio()` automático: toca nativa, espera 3 s de som, mede estéreo e atraso; atraso ≤ 14 ms e estéreo = fica nativa; senão testa "Do sistema" 3 s (estéreo = fica; senão volta nativa). Reconectar refaz o teste.
- Aba Áudio: seg Automática/Nativa/Do sistema, toggle Reação rápida, linha "Som → olho" ao vivo (`#audlat`, atualizada no `uiTick`). Diagnóstico (D/C) mostra `auto → decisão`.
- `package.json`: version 2.5.0, electron ^45.3.3, electron-builder ^26.18.0. **`npm install` NÃO foi rodado na VM** (corromperia node_modules do Mac). Bruno roda no Mac; rollback: voltar para `^33.0.0` / `^24.13.3` e `npm install`.
- Pendente de medição no Mac: atraso real do modo Automática e do Electron 45 (HUD F).

## F3/F4 — arte e usabilidade (feito, 184 checagens ok)
- Camadas: retrato por tempo (50 ms / velocidade, acumulador) em vez de contagem de quadros; retrato que sai da pilha é reciclado (sem alocação). Arte com detalhe extra: não mexida (sem medição no Mac, guarda de desempenho).
- Atalhos: 1–9 aplicam os presets na ordem; R grava o visual sob o mouse; botão Reconectar na tela de erro (`#emptyretry`); janela oculta/minimizada não desenha (`document.hidden`).
- Aba Atalhos atualizada.

## F5 — faxina, versão, docs (feito)
- Apagados: dist/ 1.0.0–2.3.0 (+blockmaps), backup-antes-otimizacao, backup-v1, backup-v2.0, test/.fuse_hidden*. Ficou dist/…2.4.0 (o 2.5.0 nasce com `npm run dist` no Mac e deve substituir o 2.4.0 então).
- README (seção v2.5, atalhos, 184), COMANDOS (install, atalhos, voltar via git), DESIGN (Detalhe e tempo real v2.5), contexto-continuidade (bloco v25 no topo).
- Pendente: medições no Mac (ver contexto-continuidade).
