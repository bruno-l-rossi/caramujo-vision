<plano_v25 projeto="caramujo-vision" escrito="2026-11-15" base="v2.4.0, commit 28a0878, arvore limpa, smoke 168 ok (rodado nesta analise)">

<uso>
Guia de implementacao pra outra conversa. Leitor: IA. Ler ANTES: ABOUT ME/ (about-me-pessoal + anti-ai-writing-style), docs/contexto-continuidade.md (blocos v2.4 e v2.3 primeiro), DESIGN.md.
Modo: projeto pessoal do Bruno (rideblan), vibe-coding CEO/CTO. Falar com ele em pt-BR, sem jargao, plano antes de obra, so sobre o que da pra ver/clicar/decidir. Decisoes D1..D5 abaixo sao dele: perguntar com AskUserQuestion antes da fase que depende.
Marcas de confianca: [LIDO] = conferido no codigo nesta analise. [EST] = estimativa, medir antes de confiar. [HIP] = hipotese nao testada.
</uso>

<pedido_do_bruno>
1. Chegar mais perto do norte (MiniMeters em fluidez e fidelidade + arte + clipe).
2. Mais quadros/frequencias onde fizer sentido. Exemplo dele: espectro com mais frequencias pra picos e movimento ficarem lisos.
3. Visuais mais fluidos e detalhados SEM degradar desempenho.
4. Melhorar usabilidade/interface e eficiencia geral.
5. Diminuir o atraso entre o som do computador e o visual.
</pedido_do_bruno>

<estado_verificado>
- Electron ^33 (Chromium 130; estavel atual e 45, Chromium 156). JS puro, sem build. Arquivos: js/audio.js 1182 linhas, js/modules.js 2732, js/app.js 1872, js/fx.js 577, electron/main.js 296, css/style.css 729.
- Motor: anel 32768, FFT propria (Blackman-Harris 4 termos), FFT rapida 1024 pro nivel/arte, engine.spectrum(n, ch) 1024..16384 com cache por tamanho+canal, LUFS por amostra, beat a cada 128 amostras, cabeca de leitura (avancaCabeca) com recuo = 2o maior intervalo dos ultimos 48 blocos + 1 ms.
- Captura padrao: native-recorder-nodejs 1.2.0 (ScreenCaptureKit) no processo principal, PCM int16 por IPC (webContents.send 'cv-native-audio', buf, hora). Alternativa ja no app: Captura "Do sistema" (loopback do Chromium, flag MacCatapSystemAudioLoopbackCapture, chega por worklet 'cv-tap' + SharedArrayBuffer, drenado no quadro, recuo 0).
- 17 visuais (7 medidores, 10 arte), 10 temas, pos (fx.js) desligado por padrao, dorme no silencio.
- PENDENCIA DA v2.4 AINDA ABERTA: ninguem leu o HUD (F) no Mac com musica. Bloco real, recuo, underruns e fps sao desconhecidos. Tudo de latencia abaixo depende disso.
- BANCADA PERDIDA: lab/ (harness.html, blocos.js, kv.js, compara.py, app-test.js) citada no contexto NAO existe na pasta. Vivia no sandbox de conversas antigas. So restam test/bench.js, bench2.js, bench3.js, bench4.html, fxsim.js, smoke.js e medicao/ (sinal-de-teste.wav, gera_sinal.py, LEIA.md, 2 mp4, 2 png).
</estado_verificado>

<diagnostico>

<latencia>
Cadeia som > olho hoje [EST], caminho nativo, modo Suave:
 a) buffer interno do ScreenCaptureKit: desconhecido
 b) bloco de captura: fixo pelo SO. native/mac/SCKAudioCapture.mm linhas 50-60 so configura sampleRate 48000 e channelCount 2; nao existe parametro de tamanho de bloco. Tipico ~960-1024 amostras = 20-21 ms [HIP, medir]
 c) IPC principal > tela: copia do Buffer + fila de eventos da tela (tremida vira recuo)
 d) recuo da cabeca: ~bloco + tremida + 1 ms = 21-24 ms [EST da bancada antiga]
 e) fila de composicao do macOS: PRESENT_FRAMES = 2 (app.js ~1730) e CHUTE fixo, nunca medido. 16,7 ms a 120 Hz, 33 ms a 60 Hz. +1 quadro com pos ligado.
 Total [EST]: ~45-55 ms a 120 Hz, ~65-75 ms a 60 Hz. MiniMeters: bloco 256-512 (5-11 ms), medido no video.
FATO MATEMATICO [LIDO em avancaCabeca]: pra cabeca nunca parar, recuo >= intervalo entre blocos. O recuo atual ja e o minimo. NAO gastar rodada afinando recuoAlvo. A unica alavanca do item (d) e bloco menor.
Alavancas reais, em ordem de custo:
 L1 [zero codigo] Testar Captura "Do sistema": recuo 0 por construcao. Falta saber bloco e se chega estereo (engine.estereo ja mede).
 L2 [baixo] Faixa rapida: beat/reacao/nivel (processBeat, updateReacao, rms) lidos ate wr (bloco mais novo) em vez de ate pos; formas de onda, espectro e LUFS continuam na cabeca. O pulso da arte adianta ~1 recuo (~20 ms) [EST]. Risco: ataque quantizado no bloco (tremida de ate 1 bloco no instante do flash). Fazer com chave interna e medir.
 L3 [medio] Subir Electron (33 > 4x). O caminho Catap do Chromium amadureceu desde o 130 [HIP]. native-recorder so tem binario pronto ate Electron 40; acima disso compila (o Mac do Bruno ja tem cmake: existe node_modules/native-recorder-nodejs/build/). Rodar smoke + teste manual de captura, DnD, encaixe, gravacao MP4.
 L4 [alto] Addon nativo proprio (N-API, Obj-C++) com Core Audio process tap (AudioHardwareCreateProcessTap + aggregate device, macOS 14.2+) pedindo buffer de 128-256 quadros (kAudioDevicePropertyBufferFrameSize) [HIP: confirmar que o aggregate aceita]. Carregado no PRELOAD da tela (sandbox: false), escrevendo float32 num ArrayBuffer criado por napi_create_arraybuffer (external arraybuffer e proibido no Electron >= 21) com contador atomico. A tela drena no quadro como o SAB: sem IPC, sem tremida, recuo 0, async=false. E a "memoria compartilhada" que o contexto deixou fora de escopo em agosto. Riscos conhecidos de taps: buffers zerados ate recriar tap+aggregate, atenuacao por numero de saidas, permissao propria (NSAudioCaptureUsageDescription ja esta no package.json), excluir o proprio processo.
 L5 [baixo] Medir (e) de verdade: iPhone em camera lenta 240 qps filmando a tela + caixa com o clique de medicao/sinal-de-teste.wav (clique em 2,0 s). E o unico numero som > olho honesto; gravacao de tela nao enxerga a fila de composicao.
NAO resolve: canvas desynchronized (nao funciona no macOS, ja conferido), disable-frame-rate-limit (PROIBIDO, causou 630 fps e travamento).
</latencia>

<fluidez_e_detalhe>
E1 ESPECTRO (modules.js 837-1194) [LIDO]. FFT 4096 a 48 kHz = 11,72 Hz por raia. Eixo log(f/delta+1): 0-100 Hz ocupa 29,7% da largura com 9 raias; 100 Hz-1 kHz ocupa 28,9% com 77. A linha e reta de raia em raia: no terco grave vira poligono de 9 vertices e o pico PULA de raia em raia em vez de deslizar. E o "pouco fluido" que ele ve.
 Conserto: zero-padding. Janela continua 4096 (mesma resposta no tempo, mesmo tau 51 ms, mesma leitura de dB), FFT de 16384 = 2,93 Hz por ponto, ~34 pontos em 0-100 Hz. Sao frequencias de verdade (interpolacao sinc do espectro), pico desliza continuo.
 Bonus: reduz a perda entre raias; fecha a pendencia "tom fora do centro sai ~1 dB abaixo do dele" e melhora a parabola da leitura.
 Implementar: FFT(Nfft, Njanela) em audio.js. Normalizar pela SOMA DA JANELA (hoje sc = winGain*2/N com winGain = N/wsum, ou seja 2/wsum: manter 2/wsum com wsum da janela de 4096, nao do tamanho da FFT). engine.spectrum(n, ch, pad) com chave de cache n+ch+pad. specBinHz = sr/Nfft.
 Custo [EST]: FFT 16384 ~0,3-0,4 ms cada (1024 = 14 us medido); Mid+Side ~0,7 ms por quadro = 8% de um quadro de 120 Hz. Medir em test/bench2.js. Se pesar: pad x2 (8192), ou Side em x2 e Mid em x4.
 Otimizacao que paga parte disso: hoje o motor faz 20*log10 por raia e o modulo desfaz com Math.pow(10, db*0.1) por raia por curva (funcao media). Expor potencia (mag^2) do motor e fazer a media direto nela; 1 log por raia so no fim.
 O desenho ja aguenta: 'denso' colapsa pra min/max por coluna de dispositivo acima de 3 raias por pixel. Conferir ax.sig (depende de nb e binHz, refaz sozinho).
E2 ESPECTROGRAMA (modules.js 1745-1830) [LIDO]. Uma FFT por quadro repetida em dx colunas (fillRect(x, y, dx, rh)): a 60 qps saem blocos de 1-2 colunas iguais. Ate 720 fillRect por coluna. Buffer em dpr 1,5.
 Conserto: uma FFT por COLUNA, em posicoes intermediarias entre a cabeca anterior e a atual (API nova engine.spectrumEm(n, fim) sem cache de quadro); coluna pintada em ImageData (1 putImageData no lugar de ate 720 fillRect); dpr 2.
E3 ONDA (modules.js 1217-1301) [LIDO].
 a) app.js dprCap: medidor com buffer = 1,5x. Em Retina 2x a faixa tem 259 colunas/s esticadas 1,33x (borrao). O dele: 345 px de dispositivo/s. Subir pra 2x da 345 colunas/s nitidas. Custo: buffer 1,78x maior, so blit.
 b) BUG: fresh = Math.min(n, adv) com n = timeL.length = 1024. Com limite de 30 qps (1600 amostras por quadro) ou qualquer engasgo, 36% do som some da faixa. Ler direto do anel (d.ringL/ringR ate d.pos), como o osciloscopio MM ja faz.
E4 OSCILOSCOPIO (1614-1742) [LIDO]. Fora do tema MiniMeters: pts = min(700, w/2), media de caixa. Subir pra 1 ponto por px de tela (teto ~1400) mantendo CV.curva. Tema MiniMeters: nao mexer (medido).
E5 ESTEREO (1438-1608) [LIDO]. Janela fixa de 1024 (timeL/timeR). A 30 qps perde som entre quadros. Janela = clamp(adv, 1024, 2048) lida do anel. Tema MiniMeters: manter 1024 quadradinhos 2x2 (medido) quando adv <= 1024.
E6 MOTOR: timeL/timeR 1024 e time 2048 sao copias por quadro. Com E3/E5 lendo do anel, ficam so pra arte.
E7 ARTE [parcial, VERIFICAR antes]: contagens por CV.det(m, base, teto): trace 140-420, wavelayers 96-288 por camada, flow 520-1600, cordas 28, malha grade 16. Arte ja em dpr 2, shader (psy, aurora) em 1,5x. Candidatos: tetos maiores no trace/wavelayers (1 ponto a cada 2 px em painel largo), shader 2x com a qualidade adaptativa segurando, cordas/malha lendo spectrum(4096) no lugar de d.freq (FFT 1024, raia de 46,9 Hz: as cordas graves dividem a mesma raia) [conferir no codigo das cordas, linha ~2590]. NAO trocar d.freq/d.bass globais: a cara de toda arte depende deles.
E8 LOUDNESS, VU: nada a ganhar.
</fluidez_e_detalhe>

<desempenho>
P1 Sem numero do Mac. Os ms do contexto (espectro 12,3 ms etc.) sao de Chrome SEM GPU. Instrumentar: tempo de JS por quadro e por painel (performance.now em volta do def.draw, media de 0,25 s) no HUD.
P2 Recriar lab/ DENTRO do projeto (e decidir: commitar ou .gitignore). Minimo: harness.html que alimenta o AudioEngine com WAV em blocos e relogio falso (runBlocos), desenha 1 modulo, exporta PNG e metricas; script puppeteer-core headless (--disable-accelerated-2d-canvas obrigatorio pra getImageData).
P3 Janela minimizada/escondida: backgroundThrottling false + 3 switches mantem o laco a 120 qps mesmo minimizado [HIP]. Pausar desenho em 'minimize'/'hide' (IPC) ou document.hidden. Coberta pelo FL Studio continua desenhando (decisao antiga, manter).
P4 Faxina: dist/ 689 MB (todo .dmg desde 1.0.0), 3 pastas backup-*, test/.fuse_hidden* (lixo de FUSE), backup-v1/test idem. Tudo fora do git. Apagar exige device_request_delete_permission; perguntar ao Bruno.
P5 Electron 33 esta 12 versoes atras e sem suporte. Ver L3.
P6 CAMADAS (wavelayers, modules.js ~2260) [LIDO]: o retrato novo entra a cada N QUADROS (++m.st.skip % round(3/speed)), nao no relogio. A 120 Hz a pilha anda 2x mais rapido que a 60 Hz: fura a regra da v2.4 "mesmo comportamento a 60 e a 120". Trocar por acumulador de dt (1 retrato a cada 50 ms / speed). No mesmo trecho: aloca Float32Array por retrato (reusar um anel de K arrays) e decima sem filtro (td[i*stp], stp ~7: serrilha no agudo; usar media ou min/max do pedaco).
</desempenho>

<usabilidade>
Lido: index.html, tabVisuais, tabAparencia, tabJanela, tabAudio, HUD, laco. NAO lido: css inteiro, menus, DnD. Itens abaixo sao propostas, nao defeitos medidos.
U1 Diagnostico copiavel: botao "Copiar diagnostico" (aba Audio e HUD) que poe no clipboard fps, bloco, recuo, intervalo, underruns, via, estereo/mono, JS por painel, versao, macOS, tela Hz. Mata a pendencia "Bruno ler o HUD": ele cola na conversa.
U2 Captura "Automatica" (novo padrao): no boot testa Nativa e Do sistema ~2 s cada, escolhe por (estereo, menor bloco+recuo), mostra o escolhido. Tira dele uma decisao tecnica. Manter as duas opcoes manuais.
U3 Aba Audio mostrar o atraso ao vivo ("som > olho 48 ms") ao lado de Fluidez/Captura, pra ele ver o efeito do clique.
U4 Controle unico "Detalhe: Padrao | Alto" no topo de Visuais, ao lado de Reacao ao som. Liga E1-E5 (e E7 se entrar). Um lugar so, no espirito do DESIGN.md (menos controle, mais assertivo).
U5 Atalhos [LIDO, app.js 1646-1667]: hoje so S, P, T, H, F, Esc e ⌘,. Faltam: 1-9 troca preset, R grava o visual sob o mouse, D alterna Detalhe.
U6 Estado "erro" do #empty com botao Reconectar direto (hoje so leva aos ajustes).
U7 Backlog estrategico ja discutido e nao feito: gravar a composicao inteira (hoje so por painel), contagem regressiva, mais arte na linha malha/contorno.
</usabilidade>

</diagnostico>

<decisoes_do_bruno>
D1 Detalhe Alto como padrao em todos os temas, inclusive MiniMeters? Recomendo sim: eixo, janela de dB, tempos e cores medidos nao mudam; so a linha ganha pontos. Opcao Padrao fica pra comparar lado a lado.
D2 Captura Automatica como padrao (U2)? Recomendo sim.
D3 Addon nativo proprio (L4)? So propor se F0 mostrar bloco >= ~15 ms nos DOIS caminhos. Maior risco do plano.
D4 Subir o Electron (L3)? Recomendo sim, em rodada isolada.
D5 Faixa rapida (L2): pulso da arte ~20 ms adiantado em relacao a onda desenhada. Recomendo testar e ele decidir olhando.
D6 Apagar dist/ antigos e backups (P4)?
</decisoes_do_bruno>

<fases>
Regra de toda fase: npm test verde antes e depois; checagens novas no smoke pro que mudou; bloco novo NO TOPO de docs/contexto-continuidade.md (pedido, o que mudou, numeros, pendente); DESIGN.md/README.md quando muda comportamento visivel; versao no package.json e no Sobre; so depois sugerir commit e npm run dist. Nao commitar sem ele pedir.

<fase id="F0" nome="Medir no Mac" risco="baixo" depende="nada">
1. HUD: JS por quadro e 3 paineis mais caros (P1). Hz da tela (media de rAF).
2. U1 Copiar diagnostico.
3. Recriar lab/ (P2).
4. Pedir ao Bruno 3 leituras com musica, 20 s cada, colando o diagnostico: Nativa+Suave, Nativa+Imediata, Do sistema. Opcional: L5 (camera lenta).
Saida: tabela bloco/recuo/underruns/estereo/fps por cenario. Decide a arvore de F2.
</fase>

<fase id="F1" nome="Detalhe e fluidez dos medidores" risco="medio" depende="D1; nao depende de F0">
1. audio.js: FFT com zero-padding + saida em potencia (E1). Teste: tom 1 kHz -6 dBFS le o mesmo dB com pad 1, 2, 4 (tolerancia 0,05 dB); tom entre raias (1005,9 Hz) le mais perto do real com pad 4.
2. Espectro: pad pelo Detalhe (Alto = x4, cai pra x2 em FFT >= 8192; teto de FFT interna 16384, ja e o limite de spectrum()). Media em potencia direto.
3. dprCap: buffered 1,5 > 2 (E3a). Onda e Estereo lendo do anel (E3b, E5).
4. Espectrograma: FFT por coluna + ImageData (E2).
5. Osciloscopio fora do tema MM: 1 ponto por px (E4).
6. U4 controle Detalhe (state.detalhe, normalize, padrao conforme D1). Sem migracao que zere ajustes.
7. Bench antes/depois: node test/bench.js . 720 170 2 e bench2.js. Orcamento: soma dos 5 medidores do preset Barra <= +1,0 ms de JS por quadro [meta]; smoke do limite de chamadas do espectro (<= 1.500 segmentos) continua valendo ou e recalibrado com justificativa.
Aceite visual (bancada + Mac): varredura 20 Hz-20 kHz do sinal de teste (18-30 s) com o pico deslizando sem degrau abaixo de 200 Hz; "espectro no molde do MiniMeters" (9 checagens) e "medidores no molde" (8) verdes; onda sem buraco com limite de 30 qps.
</fase>

<fase id="F2" nome="Atraso som > olho" risco="medio a alto" depende="F0, D2, D3, D4, D5">
Arvore:
 - Do sistema chega estereo com bloco <= 512: virar padrao via Automatica (U2). Recuo 0. Fim do grosso.
 - Do sistema mono ou bloco grande, Nativa ~20 ms: L2 (faixa rapida) + L3 (Electron novo, remedir Do sistema).
 - Ainda >= ~15 ms nos dois: propor L4 ao Bruno (D3).
Sempre: U3 (atraso ao vivo na aba), PRESENT_FRAMES validado por L5 se ele filmar.
Aceite: som > olho do HUD cai e o numero filmado (se houver) acompanha; underruns ~0 em 60 s; estereo preservado; gravacao continua sincronizada (setRecordDelayMs usa latencyMs + presentMs: conferir depois de qualquer mudanca de caminho).
</fase>

<fase id="F3" nome="Detalhe da arte" risco="medio" depende="F1; gostos do Bruno">
P6 primeiro (Camadas no relogio). Depois E7, um visual por vez, com folha de contato antes/depois e medida de custo. Ordem pelos que ele ama: wavelayers, lissa, flow, psy, malha. Shader 2x so se o HUD do Mac mostrar folga. Guardas do smoke "ocupam e crescem" (CRESCE) nao podem cair.
</fase>

<fase id="F4" nome="Usabilidade" risco="baixo" depende="F0 pra U1; resto livre">
U2 (se nao entrou em F2), U5, U6, P3. U7 so se ele puxar.
</fase>

<fase id="F5" nome="Fechamento" risco="baixo">
P4 (com D6), versao 2.5.0, README secao "v2.5", contexto atualizado, npm test, npm run dist, commit.
</fase>
</fases>

<guardas>
Nunca (cada uma ja quebrou o app ou e decisao dele; o smoke cobra varias):
- shadowBlur / 'glow' em modules.js. disable-frame-rate-limit. window.prompt. -webkit-app-region: drag fora da alca do logo. flexGrow com peso no layout. 22050 chumbado. Subir/zerar chave de estado (cv2-state, cv-state-v7): padrao novo entra por normalize/merge.
- Reacao ao som em Espectro, Loudness, VU, Espectrograma. Trocar d.freq/d.bass/d.mid/d.high/d.level (escala legada da arte). Ressuscitar visuais cortados. Cascata no resize.
- Constraint exigente em getDisplayMedia; channelCount em no de origem.
- Mexer no molde medido do MiniMeters (eixo, -80..-20 dB pos-tilt 4,5, 0,9 a cada 256 amostras, cores, leitura, estereo 2x2, LUFS curto na etiqueta) sem medicao nova.
- Apagar startSynth/startDemo/playFile (smoke usa).
- Entregar com cara de IA, texto corporativo ou travessao pro Bruno.
Medidor nunca cede qualidade; so a arte entra na qualidade adaptativa. fps alto demais e sintoma.
</guardas>

<nao_inferir>
- Bloco de 20 ms do nativo, custo da FFT 16384, ganho de L2/L3/L4 e os totais de latencia sao estimativas. F0 existe pra trocar por numero.
- Nao foi lido: css/style.css, fx.js, smoke.js, menus/DnD do app.js, arte linha a linha. Conferir antes de afirmar.
- Nao assumir que o MiniMeters usa Core Audio tap; so se sabe (video) que o bloco dele e 256-512.
</nao_inferir>

<fontes>
Codigo e docs da pasta (lidos em 2026-11-15). Electron estavel 45.x: https://releases.electronjs.org/ . Core Audio process taps (macOS 14.2+, tap dentro de aggregate device): https://www.recall.ai/blog/core-audio-taps , https://github.com/insidegui/AudioCap . Tap entregando zeros ate recriar: https://developer.apple.com/forums/thread/825780 . Atenuacao por saidas: https://developer.apple.com/forums/thread/806799 . SCStreamConfiguration (so sampleRate e channelCount no audio): https://developer.apple.com/documentation/screencapturekit/scstreamconfiguration
</fontes>

</plano_v25>
