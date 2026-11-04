<v21_medidores_lisos_novembro_2026>
LEIA JUNTO COM O BLOCO DA v2. Segunda rodada do mesmo mês. PEDIDO DO BRUNO (resumo): os visuais ainda estavam pesados; ele quer clima smooth e pleasing, MiniMeters como referência forte (até copiar a disposição dos visuais), e tudo bonito, leve, liso e responsivo.

O QUE PESAVA (medido com test/bench.js . 720 170 2): espectro 8.711 chamadas de canvas por quadro (lineTo por pixel de dispositivo), osciloscópio 2.896 (envelope mín/máx por pixel), estéreo 1.024 rect de 1 a 3px (textura de areia), onda com cor nova por coluna e RMS por cima (fita de ruído), loudness com caixa sólida de cor e número de até 160px. Os 7 medidores somavam 12.934 chamadas por quadro; agora somam 3.162.

REGRAS NOVAS (modules.js, bloco "v2.1 · MEDIDORES LISOS", ids iguais):
- CV.curva(c, X, Y, n): quadrática pelo ponto médio de cada par. Espectro e osciloscópio usam 1 ponto a cada 2 px de TELA (N = w/2, 64 a 1000).
- CV.rgba(rgb, a) com cache; misturaRgb(a, b, t, o) aceita array de saída (sem lixo no laço do quadro); corMedidor(m, idx, posMapa) = cor do tema > mapa do painel > paleta.
- CV.scrollRing.blit(m, key, buf, c, w, h, frac): rola em FRAÇÃO de pixel (frac = m.st._pa, o resto do CV.passo). O pedaço velho estica 1 px por cima da emenda, senão abre um fio transparente (testado com pixel lido: zero furo em frac 0, 0,25, 0,5 e 0,8).

POR MEDIDOR:
- ESPECTRO: máximo por trecho de raias; no grave (menos raia que ponto) Catmull-Rom entre raias. 1-2-1 entre vizinhos. Ataque 16ms, queda 0,06 + suavidade x 0,86 s. Janela -66/52 e subgrave -14dB/oit continuam. Preenchimento PELA ALTURA: degradê horizontal de 48 paradas, da sombra do tema (curva baixa) ao vivo (curva alta), alfa 0,07 a 0,38; depois um degradê destination-out apaga em direção ao rodapé (até ali o canvas só tem o preenchimento). Estilo Barras enche até a curva da esquerda (não tem a da direita). "Brilho na batida" (campo novo acende, padrão 1): 48 faixas contra a própria média lenta; acende o véu e clareia o traço. Grade: décadas 100/1k/10k com rótulo, intermediárias quase sumidas. Nota do pico só entre 30Hz e 5kHz, na SEGUNDA linha (na primeira batia no rótulo 10k). Leitura completa (dB, Hz, nota e cents) só no hover.
- ONDA: três bandas em camadas, como a multibanda do MiniMeters. Dois filtros de um polo por amostra (220Hz e 2400Hz). Atrás o sinal inteiro (#fd5648), no meio 220-2400Hz (verde), na frente acima de 2400Hz (#4da9fc). Modo 'banda' no tema MiniMeters; nos outros, cor do tema em 3 opacidades (0,3 / 0,58 / 0,95). Opções: Do tema, Bandas, Uma cor, Mapa. Saiu o campo smooth.
- LOUDNESS: régua 0/6/12/24/36/50, barras de até 30px com trilho e marca de pico (segura 1,5s), CURTO a 62% e MÉDIO cheio, nome inteiro só se couber no passo da barra. Número do MÉDIO na cor do medidor, peso 500, SEM caixa, até 64px; LUFS e "curto / mom" pequenos embaixo.
- ESTÉREO: ponto REDONDO (arc no mesmo caminho, 5 cores x 4 opacidades). O carimbo com degradê via drawImage ficou mais bonito e custou 1ms de JS por quadro (medido no perfmods); voltar pra ele só se a placa justificar. Pontos: 300 + raiz(w*h) x 0,9, até 1024. Guias saíram do esquema (Estilo, Cor, Ponto, igual ao MiniMeters).
- OSCILOSCÓPIO: média de cada pedaço (passa-baixa de caixa, some o chiado), curva lisa, véu até o centro na cor de cheio do tema (80%). Trava YIN só aceita vale abaixo de 0,3: chimbal e chiado jogavam a trava pra 2kHz e a tela virava reta.
- ESPECTROGRAMA: rola em fração de pixel; grave interpolado entre raias (degradê no lugar de degrau); leitura do mouse em todo quadro (antes só nos quadros com coluna nova, piscava a 120Hz). A coluna nova mora em CV.registry.spectrogram.coluna.

NÚMEROS (Chromium de teste, software): barra 1512x170 Retina, 60 quadros/s contra 55,5 a 57,6 da v2.0, JS mediano igual (1,4ms). Bench 720x170: medidores 1.355µs → 1.185µs de JS.

TESTES: smoke com 131 checagens. A guarda do gradiente de 192 paradas saiu (o código não existe mais) e entraram três que CONTAM chamadas num contexto de mentira: espectro <= 1.500 segmentos e em curva, osciloscópio <= 900 e em curva, estéreo em arc sem rect. e2e (28) e teste de sono passaram.

ACESSO NEGADO NESTA RODADA: tentei ler ~/Library/Preferences/MiniMeters (Themes/_TEMPLATE.txt, temas e Presets) pra copiar as cores e a disposição exatas. O pedido de pasta foi negado e não contornei. Se o Bruno copiar essa pasta pra dentro do Cowork, dá pra conferir cor por cor.
</v21_medidores_lisos_novembro_2026>

<v2_repaginacao_novembro_2026>
LEIA ISTO PRIMEIRO. A v2 refez a interface inteira no molde do MiniMeters. As seções <interface>, <interface_v2>, <rodada_temas_posicao_template> e tudo que fala de templates, POSIÇÃO > TEMPLATE > TEMA, gaveta, grade de 240 colunas, ◐ e Color Map global são HISTÓRICO da v1. Motor de áudio, módulos, pós e as decisões de medidor continuam valendo.

PEDIDO DO BRUNO: "repaginação e otimização total, o mais parecido possível com a experiência do MiniMeters; simples, prático e bonito; liberdade total". Backup da v1 inteira em backup-v1/ (fora do git).

INTERFACE (index.html, css/style.css, js/app.js reescritos):
- #toolbar no canto de cima à esquerda: alça do logo (ÚNICO lugar com -webkit-app-region: drag), preset ▾, tema, posição, pin, pausa, ajustes, ⋯, – ×. Aparece com mousemove na janela, some em 1,8s. H fixa (state.toolbar='fixo'). Ícones SVG em ICONS no app.js.
- Pílula do painel (.pctl) no canto de BAIXO à direita: nome, alça ⋮⋮ (span draggable), ajustes, ●, ×. Botão direito = panelMenu (ajustes, gravar, trocar por, adicionar ao lado, remover).
- CUIDADO DnD: não esconder a alça nem o painel durante o arrasto (opacity/pointer-events). O Chromium cancela o arrasto na hora (medido). Só o canvas apaga (.panel.dragging > canvas). As classes entram num setTimeout depois do dragstart.
- #menu único, reaproveitado (openMenu). Janela baixa: vira colunas (classe cols). menuToggle evita reabrir no clique que fechou.
- #settings: folha com abas (visuais, aparencia, janela, audio, gravacao, atalhos). Na barra encaixada a janela cresce (cv-win-settings, SET_H 300) e o grid fica travado no tamanho; no RODAPÉ a folha abre EM CIMA da barra (body.set-top) pros medidores não saírem do lugar. Coluna e janela grande: a folha só encolhe o grid. Controle com when:[campo, valor] só aparece quando o outro bate (Mapa da onda só com Cor=Mapa).
- #toast (avisos curtos) e #empty (sem áudio = botão pros ajustes de áudio; silêncio > 6s = "Aguardando som" discreto).

LAYOUT (state.rows): lista de linhas {h, cells:[{uid, mod, w, bw, ch, s}]}. Livre = linhas; barra (topo/rodapé) = achata numa fileira (peso bw); coluna = pilha (peso ch). renderLayout() reaproveita os painéis por uid (canvas e WebGL sobrevivem à troca de linha). Divisória .dv (entre vizinhos) e .dh (entre linhas): só os dois trocam espaço, a soma não muda; duplo clique iguala. moveCell: lado = encaixa na linha; topo/baixo (24%) = linha nova na janela livre.

ESTADO: chave nova 'cv2-state' (v:2). s salvo é só a DIFERENÇA do padrão (diffS) e normalize() junta com os defaults: padrão novo de medidor chega em quem já usa SEM migração do tipo mm4. Presets do usuário em 'cv2-presets'. Primeira abertura lê 'cv-state-v7' (migrateV1): tema (carvão>chumbo, musgo/jornal>areia), posição, pin, janela, gravação; a tela antiga vira o preset "Minha tela antiga"; templates com nome próprio viram preset. 'cv-state-v7' NÃO é apagado (dá pra voltar pra v1).

PRESETS (PRESETS no app.js): Barra (padrão: wavescroll, spectrum / loudness, gonio, scope), Quad, Mixagem, Master, Analógico, Clipe, Show, Ambiente, Produção. Cada visual [mod, w, bw]. Preset não carrega tema nem posição. Teste cobra: nenhum preset repete o conjunto de outro.

TEMAS: 10 na lista (minimeters, preto, fosforo, planta, ardosia, chumbo, tijolo, areia, gelo, papel). Todos ganharam THEME_BG[tema].cor por módulo (spectrum [L, R, sombra], loudness [barra, trilho], scope [linha, cheio], gonio [miolo, ponta], wavescroll, vu [agulha, vermelho]). CV.themePreview() alimenta os cartões. Onda e estéreo com cor 'auto': banda/RGB no MiniMeters, cor do tema nos outros. CV.cmap inverte no fundo claro (sem mapa escolhido no painel). applyThemeChrome() escreve --surface, --line, --accent etc. pro cromo inteiro.

MÓDULOS: 17. Novo VU (agulha em tensão, 0 VU a 71%, 300ms, ref padrão -8 dBFS, opção -18 mix; estilo barra). Nomes curtos: Onda, Estéreo, Fluxo, Camadas, Fita, PSY; todo módulo tem desc. CV.fs teto 1,35x (CV.fsBig só pro número do LUFS). CV.fade (destination-out) no lugar do véu trailFill: o véu empacava em 8 bits e escurecia o painel. Osciloscópio com rastro 0 limpa de verdade (a nota ficava em fantasma). CV.passo: rolagem da onda e do espectrograma em TEMPO, pode dar passo 0 a 120Hz (o dt acumula pra nenhuma amostra sumir).

DESEMPENHO: pós (fx) nasce DESLIGADO (FX.DEFAULT off). Fundo do painel vem do CSS: saiu o destination-over que pintava todo canvas a cada quadro (só a gravação direta ainda pinta, fillBg). Dorme no silêncio: depois do fade limpa uma vez e para de desenhar (dormindo) até o som voltar. Gradiente do highlight do espectro com no máximo ~192 paradas (era até 640; o Skia não usa mais que ~256). [v2.1: virou 48 paradas, ver o bloco acima.] Limite de quadros escolhível (Da tela / 60 / 30). Medido no Chromium de teste (software): JS por quadro 60ms na v1 padrão contra 2,5ms na v2 padrão.

BUG CONSERTADO: hasSignal() ignorava o SharedArrayBuffer. No loopback sem módulo nativo o hasRing só virava true dentro do update(), que só rodava com hasSignal() true: tela preta pra sempre. Agora conta this.sab.

ELECTRON: cv-win-stick(pos, size) usa a espessura do usuário (state.barH 170 / state.colW 300, lidas do 'resized' quando encaixado) e a tela onde a janela está (getDisplayMatching). cv-win-settings devolve os bounds. minWidth 120 / minHeight 48. Gravação vai direto pra Downloads (will-download + setSavePath), aviso 'cv-download', 'cv-show-file' abre no Finder.

TESTES: test/smoke.js reescrito (129 checagens, ~1s): motor, 17 visuais x 10 temas x 5 tamanhos x todas as opções, layout, presets, migração, guardas, fx (fxsim) e o electron/main.js de verdade com Electron de mentira. Fora do repo, rodei teste de ponta a ponta no Chromium (arrastar divisória, reordenar, menus, salvar preset, gravar MP4, recarregar) e fotos de todos os temas.

PENDENTE / PRÓXIMO: testar no Mac de verdade (npm start) a janela crescendo com os ajustes na barra do rodapé e o encaixe em dois monitores; empacotar (npm run dist); estéreo nativo continua dependendo do módulo instalado.
</v2_repaginacao_novembro_2026>

<contexto_continuidade>
<uso>Retomar o Caramujo Vision em outro chat. Ler antes de mexer em qualquer coisa. Projeto pessoal do Bruno (rideblan / Caramujo Records): aplicar about-me-pessoal + anti-ai-writing-style, modo vibe-coding (CEO↔CTO: ele decide o que o produto faz, a IA decide todo o técnico, plano antes de obra, sem jargão).</uso>

<projeto>
Caramujo Vision: visualizador de áudio em tempo real, app de desktop (Electron). Vários módulos simultâneos em grade/linha/coluna. Referências de mercado: MiniMeters (precisão e grade de instrumento) e Exo Audio Form Vision (near-black, monocromia delicada, linha fina).
PROPOSTA COMPETITIVA: mesmas funções de medição dos concorrentes, mas com visuais muito mais variados e estéticos, servindo também pra CRIAR CLIPES (gravação por painel). Medição + estética + criação de conteúdo.
Pasta: OUTPUTS/caramujo-vision/. Arquivos: index.html, css/style.css, js/audio.js (motor), js/modules.js (módulos), js/app.js (grade/gaveta/temas/gravação), electron/main.js + preload.js + package.json (app desktop), test/smoke.js (`node test/smoke.js .`), DESIGN.md (identidade obrigatória), build/icon.png, assets/logo.png.
</projeto>

<estado_atual>
- 16 módulos. Estúdio (6): spectrum, wavescroll, loudness, gonio (espaço estéreo), scope, spectrogram. Arte (10): psy, lissa, trace, flow, wavelayers, silk, enxame, aurora, cordas, malha.
- REMOVIDOS por decisão do Bruno (deletados do registry no fim do modules.js, código inerte): terreno, tunnel, mare, ascii, harmonografo, tinta, barras, colmeia, vitral, cascata, tunelfio, no, orbita, contorno. NÃO ressuscitar sem ele pedir.
- ARQUIVOS: index.html · css/style.css · js/audio.js (motor) · js/modules.js (16 módulos + temas) · js/fx.js (pós-produção, ETAPA 3) · js/app.js (grade, gaveta, temas, gravação, pós) · electron/main.js + preload.js · test/smoke.js (139 checagens, `npm test`) · test/bench.js, bench2.js, bench3.js (modelo) e bench4.html (`npm run bench4`, GPU de verdade) · COMANDOS.md (rodar, testar, subir pro GitHub).
- CHAVES SALVAS: estado 'cv-state-v7' (NÃO subir a versão: apaga layout, tema e tamanhos; mudança nova entra por merge). Templates 'cv-templates-v1', seed 'cv-tpl-seed' = 'v15'. Migrações de uma vez só, dentro do próprio state: `mmv2` (medidores v2), `mm4` (rodada MiniMeters), `res` (grade fina), `fx` (pós por merge).
- 13 TEMAS numa escada de luz de fundo: fosforo 0 · preto 5 · minimeters 24 · planta 29 · ardosia 65 · carvao 93 · chumbo 116 · tijolo 141 · musgo 184 · areia 199 · jornal 211 · gelo 228 · papel 231. Cada tema muda luz do fundo, força da grade, ESPESSURA do traço (0,75 a 1,45), paleta e mapa de cor. CV.themeMigra() converte tema antigo.
- 17 TEMPLATES agrupados por FORMA (faixa/coluna/tela), filtrados pela posição escolhida. Template NÃO carrega tema.
- FLUXO DA INTERFACE: 1 POSIÇÃO → 2 TEMPLATE → 3 TEMA, nessa ordem na barra do topo.
</estado_atual>

<decisoes_de_design>
- Curvas refinadas (norte MiniMeters): linha nítida 1px, glow só como respiro (×0.4), preenchimento baixo e chapado, pico-hold como fio contínuo, grade de Hz com régua de base.
- Arte: menos glow e menos fade que o original; impacto vem da forma definida, não do bloom. Preto mais fundo e vinheta fechada nos shaders.
- Interface: grade de instrumento, painéis colados por hairline quase invisível (0.035), sem sombra, sem canto, fundo #050506.
- Cor: TUDO segue o tema global (espectro e onda rolante também). Cor própria só se escolher "Própria" na gaveta.
- Portão de energia (CV.gate): silêncio = arte para e apaga. Regra inegociável.
- Rastro INTUITIVO: slider 0..1, maior = mais rastro. Converte via CV.trailClear(v) = 0.5 - 0.47v (alpha de limpeza). Se criar módulo com rastro, usar essa função.
</decisoes_de_design>

<interface>
- Barra do topo escondida. Ordem dos grupos: marca | TEMPLATES | POSIÇÃO | TEMA | + VISUAL | 📌 ⛶. Ver <interface_v2> pro comportamento atual do menu.
- Seletor de fonte de áudio REMOVIDO da UI (só existe uma fonte). Os elementos #source e #play seguem no HTML escondidos porque o app.js ainda os referencia.
- Status foi pro canto inferior esquerdo (antes sobrepunha os botões de janela). Mensagens de template removidas (info duplicada).
- Botões de janela (#winctl: – e ⏻) só aparecem com o menu aberto, senão tapavam o ⚙ do painel do canto superior direito. CUIDADO: o handler de "clicar fora fecha o menu" precisa IGNORAR o #winctl, senão o menu some antes do clique chegar e o ⏻ não fecha o app (bug que já aconteceu). O ⏻ chama cv-win-close, que hoje faz app.quit() direto (antes era win.close()).
- Mover a janela: alça ✥ na barra de cada painel (-webkit-app-region: drag). Reordenar: alça ⠿ (draggable). ATENÇÃO: NUNCA colocar app-region drag na barra inteira, isso engole cliques/mousemove no Electron e quebra o menu e o reorder (já aconteceu).
- Gaveta de ajustes: faixa no RODAPÉ (188px) que encolhe a altura da grade. Não cobre módulo nem botão, funciona em janela pequena.
- ENCAIXE (barra fixa, tipo Stick do MiniMeters): main.js cv-win-stick(pos) com off/bottom/top/left/right. Horizontal = altura 190 e largura da tela; lateral = largura 260 e altura da tela. Guarda o bounds anterior pra voltar. NÃO mexe em alwaysOnTop (isso é o 📌, cv-win-pin).
- Menu: aba ☰ MENU no TOPO-CENTRO (onde nenhum painel tem botão). Invisível até o mouse chegar a 34px do topo (body.peek). O topbar tem padding-right 104px pra não passar por baixo dos botões de janela.
- JANELA ESTREITA (barra lateral): body.narrow quando innerWidth < 560. O topbar vira coluna rolável (grupos empilhados com divisória em cima), winctl vai pro rodapé e a gaveta ocupa 62% da altura. Sem isso o menu ficava inacessível no modo lateral.
- TEMA muda o FUNDO também: THEME_BG em modules.js (bg/panel/grid por tema) + applyThemeChrome() no app.js escrevendo as CSS vars --bg/--panel/--hair. Os módulos usam CV.bgOf(m) pro fundo e CV.trailFill(m, v) pro véu de rastro, então o rastro também toma a cor do tema (antes era preto fixo, por isso os temas mudavam pouco).
- Grade: posições fixas via packLayout() (skyline best-fit). Ver <interface_v2> pro resize de fronteira.
</interface>

<audio>
- Fonte única: loopback do sistema. main.js liga as flags: MacLoopbackAudioForScreenShare, MacCatapSystemAudioLoopbackCapture (Core Audio taps, macOS 15+, o caminho que PODE dar estéreo), MacSckSystemAudioLoopbackOverride, PulseaudioLoopbackForScreenShare. Plano B: BlackHole via startInput.
- CAPTURA NATIVA (estéreo, implementada): dependência `native-recorder-nodejs` (ScreenCaptureKit, binários prontos N-API, sem driver externo). No macOS entrega ESTÉREO fixo, PCM 16-bit LE, 48kHz. main.js tem cv-native-available/start/stop e manda os buffers por 'cv-native-audio'. audio.js: startNativeCapture() → ensureCtxAtRate(48000) (recria o contexto na taxa do nativo e chama buildGraph) → makeSrcNode() cria um worklet-fonte 'cv-src' com fila, e pushNativePCM() desintercala L/R. Ordem de tentativa em startComputerAudio(): NATIVO → loopback do Chromium (mono) → BlackHole. Status mostra "ESTÉREO NATIVO" quando dá certo.
- CUIDADO (já quebrou o áudio uma vez): NÃO passar constraint exigente pro getDisplayMedia (channelCount/latency) — o backend rejeita a captura inteira. E NÃO setar channelCountMode/channelCount em nó de origem (MediaStreamAudioSourceNode não tem entrada, lança erro). Só em nós de ganho, e dentro de try/catch.
- LATÊNCIA: analyser.fftSize 1024 (era 2048), smoothing 0 (zero média entre quadros), latencyHint 0, ataque quase instantâneo. A fila do worklet-fonte guarda no MÁXIMO 3 blocos e descarta o mais velho quando enche (era 24: isso sozinho segurava dezenas de ms). O worklet de nível reporta a cada 128 amostras. AudioWorklet ('cv-lvl', criado via Blob URL em audio.js setupWorklet) calcula RMS/pico a cada 256 amostras e alimenta engine.liveRms/livePeak: o nível não espera a janela da FFT. O resto do delay é o buffer da captura do sistema, só resolve com captura nativa.
- analysisGain = 1.8 (o loopback chega mais baixo que o MiniMeters). Não mexe no monitor nem na gravação.
- IMPORTANTE: audio.js MANTÉM startSynth/startDemo/playFile porque test/smoke.js usa engine.startSynth(). Não apagar.
</audio>

<minimeters_v3>
RODADA "COPIAR O MINIMETERS". Decisões do Bruno nesta rodada, todas já aplicadas:
espectro copiado por inteiro (FFT 4096), controles antigos TROCADOS pelos dele, config
inspirada nele (menos controle por visual, porém mais assertivos e por tipo de módulo).

1. RESIZE NA BARRA (era a dor principal, "mexer num mexe em todos"):
   A CAUSA: em row/col cada painel tinha um peso e a largura era peso ÷ SOMA de todos.
   Arrastar a borda do ÚLTIMO painel mudava a soma sem compensação, então todos mudavam
   de tamanho. Adicionar/fechar módulo fazia o mesmo.
   O CONSERTO: largura por PORCENTAGEM FIXA. No mousedown, pixelizeWeights() converte
   todos os pesos pro pixel que já ocupam; o arrasto só troca pixels entre o painel e o
   vizinho (soma constante por construção); applyBarSizes() escreve flex: 0 0 X%.
   A alça do ÚLTIMO painel some (.nolast), porque não existe vizinho pra trocar espaço.
   NÃO voltar a usar flexGrow com o peso: o smoke test tem guarda contra isso.

2. CONFIGURAÇÕES: #drawer virou #settings, faixa no rodapé com TODAS as colunas de uma
   vez (uma por visual) + colunas globais Visuais / Tema / Color Map. Controles são
   botões de opção (type: 'seg'), não menus. A JANELA CRESCE enquanto está aberta:
   electron/main.js cv-win-settings(open, px, side) guarda o bounds, estica pra baixo
   (ou alarga, no encaixe lateral) e restaura no fechar. Era o pedido: ver o gráfico
   mudando enquanto mexe no controle. Botão ⚙ CONFIG na barra do topo abre sem painel.

3. SCHEMA DE CONTROLE ganhou 'type': 'seg' (botões de opção, com opts [[valor,rótulo]]),
   'select', 'text' ou 'range' (padrão, com fmt 'pct'/'db'/'int'). TODO campo precisa de
   um padrão em defaults, senão o smoke test falha.

4. COLOR MAPS: 15 mapas (viridis, magma, inferno, plasma, rocket, mako, crest, flare,
   cubehelix, turbo, fogo, gelo, cinza, rua). CV.cmap(m, v, alpha) devolve string CSS com
   cache; CV.cmapRgb(name, v) devolve RGB. Cada tema tem seu mapa padrão (THEME_CMAP) e
   'auto' usa ele. CV.pal() sai do MAPA quando o módulo escolhe um, e CV.isMono() devolve
   false se houver mapa escolhido (sem isso fluxo/enxame/cordas/malha continuavam brancos
   no tema preto e o mapa não fazia nada: era metade da monotonia).

5. OS 6 MEDIDORES, o que mudou e por quê:
   · ESPECTRO: FFT 4096 própria (engine.spectrum(n), roda 1x por quadro mesmo com vários
     painéis), UM PONTO POR PIXEL com lineTo (a curva macia de 220 pontos era o que
     deixava sem pico afiado), entre bins pega o MAIOR e não a média (senão os agudos
     perdem o pico), tilt em dB/oitava, escalas Mel/Log/Linear, estilo FFT/Barras/Ambos.
     As barras são um FILL só com gradiente vertical do color map: como a altura É a
     magnitude, o gradiente vertical dá exatamente a cor por magnitude dele, sem pintar
     barra por barra. Rótulos de Hz no RODAPÉ (no topo a caixa de leitura os tapava).
   · LOUDNESS: padrão CURTO PRAZO (era Momentâneo), 2 barras (M e S), régua 0/6/12/24/36/50
     e a caixa com o número, igual ao print dele.
   · ESPAÇO ESTÉREO: modo CÚPULA (Scaled-Unipolar) como padrão. Ângulo = balanço L/R,
     raio = amplitude. A cor sai do RAIO, não do balanço (com mixagem quase mono o balanço
     não varia e a nuvem sairia de uma cor só). Lissajous continua como opção.
   · OSCILOSCÓPIO: trava no tom por YIN (diferença acumulada normalizada). A correlação
     crua puxava pro lag pequeno e travava num HARMÔNICO (mostrava 2kHz num baixo de 63Hz).
     Desenho por MIN/MAX POR COLUNA de pixel: decimar um sinal com hi-hat virava ruído.
     Forma cheia por padrão, ciclo múltiplo/único.
   · ONDA ROLANTE: canal 1 e 2 (Esq/Dir/Mid/Side/Off) em faixas, cor Fixa/Banda/Mapa.
     A cor por banda usa peso AO QUADRADO: com peso linear a mistura ficava sempre no
     dourado e a faixa virava uma fita de uma cor só. Ataque do envelope é instantâneo
     (suavizar o ataque arredondava o transiente).
   · ESPECTROGRAMA: energia direto no color map.

6. SEM DIVISÓRIA entre módulos (#grid gap: 0, fundo var(--panel)) e o hover não acende
   mais moldura, senão viraria a divisória que acabou de sair.

7. MIGRAÇÃO: state.mmv2 zera o `s` salvo SÓ dos 6 medidores no primeiro boot. Os nomes
   coincidiam com significado diferente (o 'smooth' antigo era divisor, o novo é
   porcentagem: 1.0 salvo deixaria o espectro parado). Layout, tamanhos, tema e os
   módulos de arte ficam intactos.
</minimeters_v3>

<performance_v2>
LEIA ESTA SEÇÃO ANTES DA <performance> ANTIGA: ela está mantida só como histórico. A v2 substituiu quase tudo.

DECISÕES DO BRUNO NESTA RODADA (não desfazer sem ele pedir):
1. BRILHO TIRADO DE VEZ. Zero shadowBlur no app, e o slider "Brilho" saiu de todos os schemas e do defs(). Era o item mais caro da tela: 356 desfoques por quadro somando os 16 painéis (21 mil por segundo), e a Fita sozinha fazia 345. O smoke test tem uma GUARDA que falha se `shadowBlur` ou `'glow'` voltar pro modules.js.
2. Medidor nunca cede. A qualidade adaptativa só mexe nos módulos de Arte.
3. Os 14 visuais cortados foram APAGADOS do arquivo (modules.js caiu de 1982 pra ~1480 linhas). O loop `delete CV.registry[...]` no fim do arquivo não existe mais. O smoke test tem guarda pra isso também.

MOTOR DE ÁUDIO V2 (js/audio.js reescrito): o som não passa mais pelo motor do navegador pra ser medido.
- ANEL DE MEMÓRIA (ring buffer, 32768 amostras). Quem alimenta: (a) captura nativa → PCM do IPC direto no anel, e nesse caminho o AudioContext NEM EXISTE até você apertar ● (gravar); (b) loopback/mic/arquivo/demo → worklet 'cv-tap' que escreve num SharedArrayBuffer (zero mensagem) ou manda blocos de 512; (c) rede de segurança: AnalyserNode, o caminho da v1, se não houver AudioWorklet (é o que o smoke test exercita).
- FFT PRÓPRIA (radix-2, tabelas prontas, janela de Hann, zero alocação): 14 µs por chamada de 1024 pontos = 0,8 ms de CPU por segundo a 60fps. Substituiu o AnalyserNode. `window.CV_FFT` fica exposto pro teste.
- MORREU A FILA DE 3 BLOCOS do worklet-fonte (era o maior atraso). O 'cv-src' só existe agora pra alimentar a GRAVAÇÃO, com fila de 2, criado sob demanda por `engine.ensureRecordFeed()` (app.js chama no startRec).
- `d.freq` continua na ESCALA LEGADA de propósito (piso -100, teto -30, mais os +5,1dB do antigo analysisGain 1.8). É o que todo módulo de arte usa pra reagir; mudar ali mudaria a cara de tudo. O eixo honesto vive em `d.freqDb` (dBFS de verdade), usado pelo Espectro e pela leitura do hover. O hover da v1 fazia 20*log10(byte/255) e mostrava um número sem significado.
- `d.binHz` novo e OBRIGATÓRIO. A v1 chumbava `22050 / n` em 3 módulos e errava 8,8% a 48kHz (a nota do hover saía 1,5 semitom acima). O smoke test falha se aparecer 22050 no modules.js.
- LUFS: filtro K do libebur128 (coeficientes recalculados pra taxa real), rodando por AMOSTRA em biquads com estado, sub-blocos de 100ms e HISTOGRAMA de 751 casas pro portão do integrado. A v1 relia 9 mil blocos a cada 400ms. Conferido: tom pleno estéreo = 0.0 LUFS, -20dBFS = -20.0, só no L = -3.0. A V1 LIA 0,69 dB BAIXO (o shelf dela tinha ganho 0 em 1kHz, e a norma espera +0,691 pra o offset -0,691 cancelar).
- BEAT em taxa de áudio (passo de 128 amostras = 2,7ms), com três portões: SUBINDO + acima de um seguidor de pico que decai em 0,25s + acima da média de 0,7s com piso. Nunca perde kick entre quadros e não conta 808 de cauda longa duas vezes. Medido: 12/12, 18/18, 23-24/23 em 90/135/174 BPM, 0 falso positivo no silêncio.
- `engine.hasSignal()` no lugar de checar `engine.ctx`. `engine.latencyMs` alimenta o HUD.

DESENHO (js/modules.js):
- CV.hsla COM CACHE (cor arredondada em 0,5°/1%/1÷128 e string reaproveitada). Era o 3º gargalo: Fluxo montava 520 frases de cor por quadro. Ganho duplo, porque o navegador reconhece a string por identidade e não re-interpreta a cor. Total do app: 1322 → 135 trocas de cor por quadro.
- LOTES em gonio (342 pontos) e flow (520): agrupa por cor × faixa de opacidade e faz um caminho por faixa. Em enxame NÃO vale a pena (só 90 nós): lá são 8 passes sobre a lista, sem alocar. Medido antes de decidir.
- CV.scrollRing: onda rolante e espectrograma escrevem numa coluna que anda em círculo e a tela é montada com 2 recortes. A v1 copiava o buffer inteiro sobre si mesmo a cada quadro. IMPORTANTE: `next()` limpa a sobra antes de voltar ao começo, senão fica uma tira congelada.
- CV.binTable / CV.binTableFull: tabela de bins e de Hz pronta (eram 408 Math.pow por quadro em 3 módulos). Espectro tem tabela própria (_sp) com posição fracionária e inclinação.
- NUNCA MAIS PONTOS QUE PIXELS: N do Espectro segue a largura do painel; linhas do espectrograma seguem a altura; gonio amostra por passo calculado.
- Fita: rastro em 6 pedaços de idade, um traço contínuo cada (era um traço por segmento, 345 por quadro). Ficou 6,1x mais rápida e a linha não quebra mais.
- fbm do GLSL caiu de 5 pra 3 oitavas (com fator 1.143 de compensação). O PSY chama fbm 5 vezes por pixel: 25 amostras de ruído viraram 15. As 2 oitavas cortadas só somavam detalhe do tamanho de um pixel.
- WebGL: preserveDrawingBuffer FALSE (era true e forçava uma cópia do buffer por quadro), alpha/depth/stencil false, powerPreference high-performance.

APP (js/app.js):
- RESOLUÇÃO POR TIPO: shader 1x, arte 1,25x, medidor 2x (1,5x se usa buffer: wavescroll e spectrogram têm `buffered: true`). A v1 usava 1,5x pra todo mundo.
- QUALIDADE ADAPTATIVA v2: MEDIANA dos últimos 45 quadros (não média de 1s). Primeiro degrau: arte desenha a cada 2 quadros (ART_SKIP), recebendo dt somado pra não ir em câmera lenta. Só depois a resolução da arte cai, até 60%. Medidor nunca entra na conta.
- ARRASTO DE BORDA: `window.CV_DRAGGING` impede recriar bitmap durante o arrasto (era recriar 16 canvases por milímetro de mouse = o travamento), mousemove vira UM por quadro via rAF, e no soltar recria tudo uma vez. ResizeObserver passa por `resizeSoon` (agrupado por quadro), o que também mata o engasgo da animação de altura da gaveta.
- resizePanel(p, force): sem `force` ele não realoca se o tamanho não mudou.
- TEXTURA GLOBAL REMOVIDA (canvas + CSS + JS). Estava sempre off, mas o canvas de tela cheia com mix-blend-mode: overlay obrigava a GPU a misturar a camada com a tela toda em cada quadro.
- HUD na tecla F (#hud): fps, som→tela em ms, e por qual caminho o áudio entrou (NATIVO / DIRETO / TAP / RESERVA). É o número pra comparar com o MiniMeters aberto do lado.

ELECTRON (electron/main.js): backgroundThrottling: false + as chaves disable-renderer-backgrounding, disable-background-timer-throttling, disable-backgrounding-occluded-windows. O macOS freava o app quando outra janela cobria a nossa, e o Bruno fica com o FL Studio em cima o tempo todo. SharedArrayBuffer entrou na lista de enable-features.

MEDIDO (canvas real, 360x220, 90 quadros, mesmo áudio nos dois lados):
fita 6,1x · fluxo 2,6x · espaço estéreo 2,2x · onda rolante 1,7x · espectrograma 1,4x · espectro e cordas 1,3x · resto igual ou pouco melhor. Soma dos 14 módulos de canvas: 4,34ms → 2,68ms por quadro (38% menos), e isso SEM contar os 356 desfoques por quadro que sumiram, que é o custo que mais pesa no navegador de verdade.

BACKUP: backup-antes-otimizacao/ tem os arquivos como estavam antes desta rodada.
</performance_v2>

<performance>
- dpr limitado a 1.5 (era 2) e multiplicado por window.CV_QUALITY. Textura só roda se state.texture !== 'off' (hoje sempre 'off').
- QUALIDADE ADAPTATIVA (app.js watchPerf): mede o tempo médio de quadro por segundo; abaixo de ~42fps baixa CV_QUALITY em passos até 0.55 e redimensiona os canvases; acima de ~66fps devolve. Tem cooldown pra não oscilar.
- Otimizações de desenho feitas (a regra é: agrupar traços, evitar shadowBlur por item, fillRect no lugar de arc):
  · enxame: os fios viram 4 traços agrupados por faixa de opacidade (eram ~4000 beginPath/stroke por quadro) e os nós saem em 2 passes (comuns / estrelas com brilho ligado uma vez).
  · malha: uma linha inteira por traço, em 3 faixas de profundidade (eram ~600 chamadas por quadro).
  · flow: parou de ligar/desligar shadowBlur por partícula (era o gargalo); estrela virou ponto maior.
  · gonio: fillRect no lugar de arc (~340 arcos por quadro).
- Módulos ainda mais caros: flow (~520 partículas), enxame (O(n²) na distância, cuidado ao subir densidade), psy/aurora (shaders, custo é de GPU).
</performance>

<gostos_do_bruno>
Ama: wavelayers, lissajous, flow, psy, malha, contorno. Quer visual impactante com POUCO brilho e pouco fade, mais monocromático que colorido. Detesta: visual que anima solto do áudio, cara de mira/alvo, menu cobrindo o gráfico, IA com cara de IA, módulos redundantes entre si (por isso cortou vários), visual "amador".
Ao propor módulo novo: tem que ser claramente diferente do que já existe e visualmente forte. Ele testa e corta sem dó.
</gostos_do_bruno>

<pendencias>
1. ESTÉREO NATIVO: código pronto, INSTALAÇÃO ainda falhando na máquina do Bruno. Node 25.x não tem binário pronto do native-recorder-nodejs, então precisa compilar, e faltava cmake/cmake-js. Além disso o `npm install` diz "up to date" e PULA o pacote (dependência opcional que já falhou antes) — por isso o script usa --force --foreground-scripts. Passos no README: xcode-select --install + brew install cmake + npm i -g cmake-js, depois `npm run audio-nativo` e `npm run audio-nativo-check` (esse último diz se o módulo carrega e lista os devices). Enquanto não resolve, roda em mono pelo loopback. Status mostra "NATIVO OFF: <motivo>" e o console tem o diagnóstico (cv-native-why). Alternativa que funciona sem compilar: BlackHole 2ch (plano B já implementado).
2. Instalador: `npm run dist` gera o .dmg (arm64 + x64) em dist/. Ainda NÃO testado numa máquina real. Sem assinatura Apple, o usuário precisa do "abrir mesmo assim" na primeira vez (ver README).
3. Subir repo GitHub + Cloudflare Pages (opcional, versão web).
4. Ideias estratégicas discutidas: presets de exportação pra Reels/YouTube (proporção fixa antes de gravar), gravação em tela cheia, mais visuais na linha malha/contorno.
</pendencias>

<interface_v2>
- POSIÇÃO: um seletor só (LAYOUTS em app.js) que junta arranjo + encaixe da janela: JANELA grade/linha/coluna e BARRA topo/rodapé/esquerda/direita. Antes eram dois menus redundantes (layout + barra). applyPosition(id, skipDock) aplica os dois lados; cada item é [id, rótulo, dock, layout].
- PIN (📌) separado: cv-win-pin liga alwaysOnTop. O encaixe (cv-win-stick) não mexe mais em alwaysOnTop.
- Seletores mostram a CATEGORIA quando fechados (TEMPLATES, POSIÇÃO, TEMA, + VISUAL) e a lista com ✓ no atual quando abertos. Helper fillSelect(el, label, items, current); o valor volta pra '' depois de escolher. Ao mudar algo, chamar fillSelect de novo pra atualizar o ✓.
- MENU: encostar no topo só REVELA a aba ☰ MENU (body.peek). O menu abre no CLIQUE e fica até clicar fora. Não abre mais no hover, senão cobria os botões dos módulos da fileira de cima.
- RESIZE na GRADE: arrastar uma borda mexe nos DOIS painéis que se encostam nela (nbR à direita, nbB embaixo), o lado oposto fica parado. Em linha/coluna o vizinho é o próximo da fila.
- Splash tem 3 passos numerados pra quem abre pela 1ª vez.
</interface_v2>

<temas_v2>
- THEME_BG (modules.js) agora tem bg, panel, grid, text, ink e light. applyThemeChrome() no app.js escreve --bg/--panel/--text/--accent/--hair/--border e liga body.light.
- Temas novos: PAPEL (fundo claro #e9e7e0 com traço quase preto, o invertido) e ARDÓSIA (cinza-azulado com creme, inspirado no print do MiniMeters). Os outros ganharam fundos bem mais distintos entre si.
- Tema claro: CV.isLight(m) diz se o fundo é claro. CV.gridInk(m, a) devolve tinta preta ou branca pra grades/réguas, label(...) recebe `m` e escurece sozinho, e os textos/caixas de hover invertem. CSS tem um bloco body.light pro cromo do app.
- CV.isMono continua só pro tema 'mono'; o PAPEL passa pela paleta (PALETTES.papel devolve tons escuros), então nenhum módulo precisou de código extra.
</temas_v2>

<suavidade>
- CV.rate(m, d, dt, base, gateAmt, beatAmt) devolve a velocidade do relógio interno JÁ SUAVIZADA. O beatPulse pula de 0 a 1 num degrau: usado cru, aurora/malha davam trancos. Usar sempre CV.rate em módulo novo com movimento contínuo.
- Malha também suaviza amp/bass/mid (m.st.ampS/bassS/midS).
- Loudness: número com ataque 2.2 e queda 0.45 (bem lento), pra não oscilar a cada segundo.
- Espaço estéreo: 'Ambiente' (névoa) vem em 0 por padrão.
</suavidade>

<v3_final>
- TEMAS (14): o que separa um do outro NÃO é só a matiz. Cada um varia 4 eixos: luminância do fundo (de 4 a 231 numa escala 0-255), quanto o painel se destaca do fundo, força da grade (0.05 a 0.42) e a paleta. Grupos: muito escuros com grade quase invisível (preto, rubi, floresta, psy); escuros com painel destacado e grade forte (neon, oceano); médios quentes bem levantados do preto (vhs, ambar, poente, ardosia); claros em 3 níveis de luz (papel 231, gelo 228, areia 199, lavanda 181). THEME_BG define bg, panel, grid, text, ink e light. PALETTES tem 4 cores por tema, e a AMPLITUDE dentro da paleta também varia (rubi tem um branco de contraste, floresta é dessaturada e fechada, ambar tem faixa larga de luz). Nos temas claros as cores são ESCURAS.
- CV.blend(m, c, on): mistura adaptativa. Fundo escuro usa 'lighter' (soma luz); fundo claro usa 'multiply' (as camadas escurecem). Era o motivo do tema papel ficar lavado. TODO módulo novo deve usar CV.blend em vez de globalCompositeOperation direto. O glow (shadowBlur) é zerado nos temas claros.
- 'mono' foi renomeado pra 'preto' (migração automática no boot). CV.isMono aceita os dois.
- POSIÇÃO: 5 opções só (TELA NORMAL + 4 barras). As opções "janela linha/coluna" saíram: quem quer linha/coluna usa uma barra.
- RESIZE na grade (robusto): no mousedown tira uma FOTO de todos os painéis (snap). A cada mousemove restaura a foto e recalcula do zero, então o resultado depende só de onde o mouse está agora (não acumula erro). Move junto TODOS os que encostam na borda (nbRs/nbBs) e respeita uma BARREIRA: o painel mais próximo à frente que ainda não encosta, pra não invadir ao cruzar uma fronteira nova no meio do arrasto. No mouseup, se ainda houver sobreposição (hasOverlap()), chama packLayout() como rede de segurança.
- window.prompt NÃO EXISTE no Electron (por isso o ⭑ não salvava). Agora tem a caixinha #ask (askName/askClose) no lugar. Não voltar a usar prompt().
- Botão ? (#helpbtn) no #winctl, à esquerda do minimizar: modal MÍNIMO (o Bruno pediu sucinto) com uma linha do que é o produto, o seletor de entrada de áudio, o estado (estéreo/mono/sem sinal) e o contato. Sem tutorial.
- SPLASH REMOVIDO: o app abre direto nos visuais e o áudio inicia sozinho; um listener de clique único destrava o contexto caso o navegador exija gesto.
- Distribuição: package.json com mac.identity=null e hardenedRuntime=false (build local sem conta Apple), dmg com artifactName Caramujo-Vision-${version}-${arch}.dmg, compression maximum, arm64 + x64.
- docs/v2-claude-design.md: insumo + prompt pronto pro Bruno refinar visuais/paletas/módulos no Claude Design na v2.
</v3_final>

<ajustes_v3>
- ESPECTRO, normalização: tinha `if (v>1) v=1` (corte reto) com baseH 0.92 → topo achatado e dinâmica comida, ainda mais com analysisGain 1.8. Agora: expoente 1.25 (era 1.4), divisão por `teto` (slider "Teto (folga)", 1..3, padrão 1.5) e LIMITE MACIO (função soft, joelho em 0.72, assíntota em 1) em vez de clamp. baseH subiu pra 0.97. Resultado medido: sinal 1.5x/2x/3x agora dá 0.865/0.943/0.990 (antes todos 1.00 grudados).
- MATIZ: o slider só valia com Cor = "Própria", então parecia quebrado. Agora mexer no Matiz LIGA colorMode='custom' sozinho e atualiza o select na gaveta.
- GAVETA DE AJUSTES: fecha sozinha ao clicar fora (mousedown). Ficam de fora da regra: a própria gaveta e o painel que está sendo ajustado (pra poder clicar nele sem perder os controles).
</ajustes_v3>

<ajustes_v4>
- LUFS AGORA É A NORMA (ITU-R BS.1770, igual MiniMeters). audio.js buildLufsChain(): PONDERAÇÃO K por canal (highshelf 1500Hz +4dB → highpass 38Hz Q0.5 → analyser próprio pra L e pra R) e SOMA das energias dos canais (não é a média do mono, isso dava ~3dB de erro). updateLufs(dt) calcula: M (janela 400ms), S (3s) e I (integrado com os dois portões: absoluto -70 LUFS e relativo -10dB da média). Fórmula: -0.691 + 10*log10(zL+zR). Conferido: tom pleno estéreo = -0.69, -20dBFS estéreo = -20.69, -20dBFS só no L = -23.70. engine.lufsApprox() devolve o M; lufsAvgVal virou o I. O módulo mostra M grande e "S x.x  I x.x" embaixo. A cadeia é montada dentro de try/catch (o stub do smoke não tem AudioParam).
- FONTES ESCALÁVEIS: CV.fs(m, base) e CV.font(m, base, weight) escalam pela raiz da área do painel (referência 340x200), com piso 7px e teto 2.6x. Módulo novo com texto deve usar CV.font, nunca px fixo.
- FUNDO CUSTOMIZÁVEL (botão ◐ ao lado do TEMA): CV.bgAdj = {l, s, h, c} (claridade, saturação, matiz, contraste) aplicado por cima do tema em CV.themeBg() via CV.adjHex(). Se o ajuste clarear o fundo além de 128 de luminância, o tema passa a se comportar como CLARO sozinho (o.light = 1), então a mistura vira multiply e o glow desliga. Salvo em state.bgAdj.
- RESIZE EM CASCATA: o vizinho no tamanho mínimo não trava mais o arrasto, ele é EMPURRADO e quem cede é o próximo da fila. chain(dir) monta a cadeia de painéis alinhados, chainRoom() soma quanto a cadeia inteira pode ceder, applyChain() distribui o empurrão elo a elo. Conferido em simulação.
- SESSÃO RESTAURADA: state.win guarda bounds da janela (main.js manda 'cv-bounds' nos eventos resized/moved). No boot, restoreSession() reaplica posição/encaixe, e o pin (state.pinned) volta ligado. Junto com tema, bgAdj, painéis e tamanhos que já eram salvos, o app reabre exatamente como fechou.
</ajustes_v4>

<menus_sempre_visiveis>
- REGRA: nenhum menu pode ter altura fixa. Em modo barra (janela de ~190px) tudo estourava e o botão de fechar sumia.
- Gaveta de ajustes: height min(188px, 66vh); abaixo de 380px de altura vira 100vh e o grid vai a zero (a barra fina precisa dos controles mais do que do visual naquele instante). O .dhead é sticky no topo, então o ✕ FECHAR nunca sai da vista. CUIDADO com especificidade: `body.narrow #drawer` ganha de `#drawer`, então a media query precisa listar os dois seletores.
- Caixas centrais (#modal .box, .askbox do template e do ◐): max-height 88vh (96vh em janela baixa) com overflow-y auto, e a linha de botões (.askrow / .close-row) é sticky no rodapé da caixa.
- #topbar: max-height 100vh com overflow-y auto; abaixo de 260px de altura ele quebra em linhas.
- Colunas da gaveta: auto-fill minmax(170px) em janela baixa, 1 coluna abaixo de 420px de largura.
- ESC: fecha na ordem caixa aberta → gaveta de ajustes → menu, e tira o foco do controle. Uma tecla sempre volta pros visuais.
</menus_sempre_visiveis>

<ajustes_v5>
- ESPECTRO REESCRITO PRA ESCALA EM dB (o desenho não batia com FL Studio / MiniMeters). Antes: magnitude 0..255 elevada a uma potência com "teto" e limite macio, o que achatava pico e inflava o meio. Agora: usa d.freqDb (dBFS de verdade) e mapeia LINEARMENTE entre piso e teto em dB, com INCLINAÇÃO em dB por oitava (referência 1kHz), que é o "tilt" dos analisadores. Controles novos: Piso (dBFS), Teto (dBFS), Inclinação (dB/oit, padrão 4.5), Ganho (em dB, -12..+12), Espessura, Opacidade do preenchimento, 2ª curva, Linha de pico. Se o motor não tiver freqDb, converte a escala legada como fallback.
- RESIZE: voltou a ser DIVISÓRIA SIMPLES. A cascata (empurrar o vizinho no mínimo e passar pro próximo) mexia em painéis longe da borda e o Bruno achou confuso. Agora só os painéis que ENCOSTAM na fronteira mudam, com limite no mínimo e barreira pra não invadir quem está à frente. Não reintroduzir cascata.
- APAGAR TEMPLATE não funcionava: fillSelect zera o value do select depois de escolher, então elTpl.value vinha ''. Agora o nome escolhido fica em state.tpl. Qualquer botão que dependa da escolha de um select precisa ler do state, nunca do .value.
- PSY / shaders com COR PRÓPRIA: a paleta GLSL era um arco-íris fixo (cos), então mexer no Matiz só girava a fase e parecia não funcionar. Entrou o uniform u_lock (1 quando colorMode='custom') e a função hue2rgb: com cor própria o shader varia LUMINÂNCIA da matiz escolhida em vez do arco-íris.
- ESPESSURA: CV.lw(m, base) multiplica todo lineWidth pelo controle do usuário (slider "Espessura" no bloco genérico da gaveta, vale pra qualquer visual). A grade de Hz do espectro NÃO usa CV.lw de propósito (é régua, não desenho).
- AJUSTAR TEMA SEM ESCURECER: o painel do ◐ deixou de ser modal com fundo preto e virou caixa flutuante no canto (pointer-events none no container, auto na caixa). Dá pra ver a cor real dos visuais enquanto mexe.
- LIMPEZA (norte MiniMeters): grade do espectro mais fraca quando o mouse não está no painel, e os rótulos de Hz só aparecem se o painel tiver mais de 90px de altura.
</ajustes_v5>
</contexto_continuidade>

<rodada_tempo_real_agosto_2026>
DIAGNÓSTICO COMPLETO EM docs/diagnostico-tempo-real-e-estetica.md. Ler antes de mexer em desempenho ou estética.

MEDIÇÃO QUE MUDA A CONVERSA: com os 16 visuais abertos o app gasta 596 µs de JS por quadro (3,6% do orçamento de 60fps) e pinta 0,24 Gpx/s numa máquina que entrega 50+. O teto de resolução da arte (1x no shader, 1,25x no canvas) NÃO está comprando desempenho: subir tudo pra nativo custa 2x o pixel, que a máquina tem de sobra. O custo real mora em 17.423 chamadas de canvas por quadro (1 milhão por segundo, ~80ns de pedágio cada) e em 16 telas separadas pro compositor juntar.

BANCADAS: test/bench.js (custo por visual + chamadas), test/bench2.js (motor + espectro), test/bench3.js (orçamento de pixel). Rodam sem abrir o app: `node test/bench.js`.

LATÊNCIA: o HUD antigo media só até o quadro ser DESENHADO (11ms) e ignorava os 2 quadros da fila de composição do macOS (33ms a 60Hz). O modo de baixa latência do canvas (desynchronized) NÃO funciona no macOS, conferido. O caminho no Mac é 120Hz.

ETAPA 1 APLICADA (3/ago):
1. audio.js spectrum(): cache por TAMANHO (this._spec = {}), cada FFT nasce uma vez. Era 378µs com 2 painéis de tamanhos diferentes, virou 233µs. NÃO voltar pra _specN/_specFft de posição única.
2. audio.js buildGraph(): DelayNode (this.recDelay) entre input e recordDest, só pra gravação. setRecordDelayMs(ms) compensa a sincronia do clipe. Vem em try/catch porque o smoke test não tem createDelay.
3. app.js beginRec(): lista REC_MIMES tenta MP4/H.264 antes de webm (Final Cut não abre webm), e chama setRecordDelayMs(latencyMs + presentMs()).
4. app.js presentMs(): 2 quadros de fila de composição. Entra no HUD e na sincronia.
5. app.js drawHud(): mostra SOM→OLHO total, análise + tela separados, e o tamanho do bloco de captura.
6. electron/main.js: switch 'disable-frame-rate-limit' (120Hz em ProMotion). Vsync continua ligado, sem rasgo.
7. css: #topbar, #edgetop e #winctl com visibility:hidden quando escondidos. Os três têm backdrop-filter e ficavam calculando desfoque em cima de 16 telas que mudam 60x por segundo.
8. modules.js enxame: LINK_BUDGET 3500 com realimentação em m.st.dk. No slider máximo eram 631µs e 13.379 fios, virou 160µs e 3.500. O alcance do fio encolhe quando o bando aperta.
Smoke test: 65 checagens, 8 novas guardando esta rodada.

ETAPAS 2 e 3 APLICADAS (4/ago) — ver <etapa2_e_3_aplicadas> no fim do arquivo.

PRÓXIMAS ETAPAS (aprovadas pelo Bruno na ordem do documento):
ETAPA 2, resolução: arte em canvas pra dpr nativo, shaders pra 1,5x ou 2x, qualidade adaptativa cortando resolução ANTES de pular quadro (quadro pulado sem borrão lê pior), e modo de gravação com tamanho fixo (1080x1920 Reels, 1080x1080 feed, 1920x1080 YouTube) desenhando fora da tela no tamanho exato.
ETAPA 3, pós-produção: uma passada só na placa de vídeo por cima de tudo, custa 6,2 Mpx por quadro (0,37 Gpx/s, menos de 1% da máquina). Ordem de impacto: pontilhado contra banda (os fundos são #050506 e todo degradê escuro racha em faixas), bloom com limiar, curva de cor cinematográfica, grão animado, aberração cromática radial, borrão de movimento. Intensidade por visual e por template: templates de clipe (04, 05, 08, 10) com pós, templates de estúdio (01, 02, 03, 11) limpos.
FORA DE ESCOPO POR ORA: memória compartilhada pro áudio nativo (tirar as cópias entre main e renderer). Maior risco, menor ganho que o 120Hz.
</rodada_tempo_real_agosto_2026>

<etapa2_e_3_aplicadas>
Aplicadas em 4/ago, nesta ordem, com o Bruno decidindo fazer as duas de uma vez.
Fonte: docs/prompt-claude-code-pos-producao.md (a direção de fotografia aprovada).
Smoke test: 75 checagens.

ETAPA 2 (js/app.js):
- dprCap: arte 1,25x → 2x (tamanho REAL da tela), shader 1x → 1,5x. Medidor fica
  como estava (2x, 1,5x se usa buffer). O corte de resolução da arte não estava
  comprando desempenho: o app pintava 0,24 Gpx/s numa máquina que entrega 50.
- Qualidade adaptativa INVERTIDA: cede primeiro a intensidade do pós (fxAuto,
  até 50%), depois a resolução da arte (até 60%), e só então pula quadro da arte.
  Quadro pulado sem borrão lê como travada. Medidor nunca entra na conta.
- GRAVAÇÃO EM TAMANHO FIXO: state.recSize (tela / 916 / 11 / 169 → REC_PX
  1080x1920, 1080x1080, 1920x1080). makeRecPanel(p,w,h) cria uma INSTÂNCIA
  SEPARADA do módulo (st próprio, mesmo objeto s por referência) desenhando num
  canvas fora da tela em REC_DPR=2. Instância separada é obrigatória: desenhar o
  mesmo m em dois tamanhos realoca o offscreen do CV.scrollRing todo quadro.
  O clipe é desenhado TODO quadro mesmo com a arte da tela em 1/2.

ETAPA 3, A PASSADA DE PÓS (js/fx.js novo, ~470 linhas):
- FX.PRESETS: regua/prata/vidro, os números da rodada de direção, sem alterar
  nenhum. FX.DEFAULT = prata 100%. FX.STAGES = a ordem, escrita uma vez.
- ARQUITETURA: canvas #fx de tela cheia, WebGL2, pointer-events none, z-index 20.
  Cada painel sobe pra uma TEXTURA PRÓPRIA (texImage2D/texSubImage2D do canvas
  dele) e é desenhado num retângulo da imagem montada. Textura por painel em vez
  do texSubImage2D posicionado do plano original: resolve sozinho a diferença de
  resolução entre painéis (medidor 2x, shader 1,5x) sem forçar todo mundo ao
  mesmo dpr.
- O painel entra JÁ EM CIMA DO FUNDO DELE (u_bg no FS_BLIT). A onda rolante e o
  espectrograma desenham sobre transparência e deixam o fundo pro CSS; sem essa
  mistura o pós não pegaria justamente o #050506, que é onde o pontilhado e o
  piso do preto trabalham.
- ANEL DE 3 IMAGENS pro acúmulo de quadros, sem cópia de tela cheia: a imagem
  montada é refeita do zero todo quadro, então dá pra girar qual das três é a de
  agora e as outras duas já são o passado. Pesos: w[1] e w[1]² (leitura
  geométrica do vetor [1, 0.28]).
- MÁSCARA DE DOSE em 1/8, refeita só quando o layout muda (+1x a cada 30 quadros
  como rede): R = dose do painel, G = 1 se medidor, B = 1 se o fundo é claro. O
  filtro linear em 1/8 já dá a transição de ~8px que o plano pedia.
- ORDEM: acúmulo → halação (limiar 1/3 + 2 pares de desfoque separável) → curva →
  aberração → grão → vinheta → pontilhado. Estágios 3 a 7 num shader só.
  A aberração é feita com 3 amostras ANTES da curva de propósito: a curva é por
  canal e pontual, então o resultado é idêntico a curva-e-depois-aberração com
  um passe a menos.
- PIVÔ DA CURVA: 0.02 no escuro (é o que faz o preto ABRIR) e 0.90 no claro. O
  0.90 é decisão desta rodada: com o pivô no fundo, o con 1.12 joga o papel
  acima de 1 e o branco estoura chapado. O plano só dizia "o joelho passa a valer
  pra sombra".
- GRÃO NO FUNDO CLARO: cor *= (1 + n*1.275). O plano escrevia n/200, que só faz
  sentido se n estivesse em 0..255; a 0..1 o grão sumiria do papel.
- O piso (lift) é aplicado DEPOIS da curva. Não inverter: com o piso antes, o
  termo de contraste puxa tudo abaixo do pivô e o #050506 bate em zero.
- GRAVAÇÃO COM PÓS: instância própria de FX no canvas de saída, no tamanho do
  clipe, vinheta e aberração centradas no QUADRO. Desligar o pós no meio da
  gravação roda a passada com intensidade 0 (imagem intacta) em vez de congelar.
- setRecordDelayMs NÃO foi tocado: a sincronia do áudio já estava calibrada.

INTERFACE:
- Coluna PÓS na gaveta (RÉGUA/PRATA/VIDRO/OFF + Intensidade) e coluna GRAVAÇÃO
  (TELA/9:16/1:1/16:9). Dose por visual: campo genérico 'fx' desenhado pelo
  app.js em toda coluna de painel (não entra em def.schema; o padrão vive em
  defs() do modules.js e em FX_FIELD).
- CSS: .pbar z-index 30 e .rz 31, ACIMA do #fx (20), senão os botões do painel
  somem embaixo da tela do pós. O z-index do .panel:hover foi REMOVIDO pelo mesmo
  motivo (criava camada própria e prendia os filhos embaixo).
- Durante o arrasto de borda o pós sai do caminho (CV_DRAGGING).

PERSISTÊNCIA: state.fx entra por MERGE, chave 'cv-state-v7' INTACTA. Templates:
'cv-tpl-seed' continua 'v14'; tplFx(nome) migra em silêncio na hora de abrir
(01|02|03|11 → régua, 04|05|08|10 → prata, resto → prata 60%).

NÚMEROS CONFERIDOS (smoke test roda a mesma conta da direção, sem GPU):
enxame 13,3 → 15,95 (medido 15,8) · psy 31,2 → 34,91 (34,9) · espectro na dose de
medidor 27,0 → 29,13 (29,1) · #050506 na prata sai em 7,5/255 · papel no canto
203/214/225 pra vidro/prata/régua (medido 205/217/223).

O plano previa cair pro pós por painel se o upload fosse caro; essa saída NÃO
existe, porque as duas formas sobem a mesma quantidade de pixel.
</etapa2_e_3_aplicadas>

<bancada4_e_o_travamento>
BANCADA RODADA NA MÁQUINA DO BRUNO (4/ago, MacBook, janela 1440x900, tela 2x):
  só os 16 painéis (sem pós)      0,40 ms/quadro
  painéis + subir pra placa       0,80 ms/quadro
  painéis + subir + RÉGUA         2,80 ms/quadro
  painéis + subir + PRATA         3,00 ms/quadro
  painéis + subir + VIDRO         3,30 ms/quadro
  CPU dentro do laço de upload    2,20 ms   ← aqui mora o problema
  CPU emitindo a passada          0,10 ms

O QUE O NÚMERO DIZ: subir os 16 painéis custa 0,40 ms quando ninguém lê essas
texturas, e 2,20 ms quando a passada está rodando. O upload não ficou caro; o
processador é que PARA e espera a placa. Duas esperas somadas:
  (a) o painel acabou de ser desenhado, e o navegador precisa terminar aquele
      desenho antes de copiar pra textura;
  (b) a textura de destino é a mesma que a passada do quadro anterior ainda pode
      estar lendo.
Com painéis de bancada (desenho trivial) isso deu 2,2 ms. No app de verdade, com
17 mil chamadas de desenho por quadro, a espera (a) é muito maior: foi o que
deixou o app travado no `npm start` do Bruno.

CONSERTOS APLICADOS NA MESMA RODADA:
1. UPLOAD NO COMEÇO DO QUADRO (app.js fxUpload, chamado antes dos painéis
   desenharem). Sobe o desenho do quadro ANTERIOR, que a placa já terminou faz
   tempo. Mata a espera (a). Preço: um quadro de atraso, que entrou no
   presentMs() (PRESENT_FRAMES + 1 com o pós ligado) e NÃO no atraso do áudio.
2. EXCEÇÃO PRO PSY E PRO AURORA (app.js fxUploadJa): o buffer de um canvas WebGL
   com preserveDrawingBuffer:false é APAGADO depois de aparecer na tela, então
   adiar o upload deles pegaria tela vazia. Esses dois sobem na hora, dentro do
   quadro em que desenharam. São 2 de 16 e o desenho deles é um comando só.
3. DUAS TEXTURAS POR PAINEL, alternadas (fx.js upload, t.cur ^= 1). Escreve numa
   e a passada lê a outra. Mata a espera (b).
4. Menos leitura por pixel: sem aberração (todo medidor, RÉGUA inteira) a
   composição faz 2 amostras em vez de 6; o acúmulo sai fora onde o borrão é zero.
5. QUANDO NÃO COUBER, O PÓS DESLIGA (fxDesliga). A qualidade adaptativa tinha
   como 1º degrau baixar a INTENSIDADE do pós, o que não devolve tempo nenhum:
   intensidade menor pinta a mesma quantidade de pixel. Agora o 1º degrau é
   desligar, com aviso no status. Não volta sozinho (piscar é pior); pra voltar,
   escolher uma direção no menu.

SEGUNDA RODADA DA BANCADA (depois dos consertos):
  só os 16 painéis        0,40 ms   ·  + subir  0,80 ms
  + passada RÉGUA  1,50   ·  PRATA  1,80   ·  VIDRO  2,20
  tempo parado subindo: 0,00 ms sem passada, 0,10 ms com PRATA
O pós inteiro caiu de 2,60 pra 1,40 ms por quadro e a espera sumiu. Fim do assunto
do upload.

E ENTÃO O TRAVAMENTO DE VERDADE: NÃO ERA O PÓS, NEM A ETAPA 2.
Com o app aberto, o HUD mostrou **630 FPS** e PÓS PRATA 0,04 ms. Desligar o pós
não mudava nada. O culpado é a chave 'disable-frame-rate-limit', que entrou na
ETAPA 1 pra "destravar os 120Hz": ela não levanta o teto de 60 pra 120, ela TIRA
O TETO. O app desenhava 630 quadros por segundo numa tela que mostra 120, ou seja
5 de cada 6 quadros iam pro lixo, e a máquina ficava sem um respiro entre um
quadro e outro. Mouse, menu e sistema disputando espaço com isso é o que se sente
como travamento. Também explica por que o HUD mostrava "tela 3 ms": ele
multiplicava o tempo do quadro RENDERIZADO (1,6 ms) por 2, mas a fila de
composição se mede em quadros da TELA. O número honesto a 120Hz é 3 x 8,3 = 25 ms.

CONSERTO:
- electron/main.js: a chave saiu (comentada, com o porquê ao lado). O desenho
  volta a acompanhar o vsync: 120/s em ProMotion, 60/s em tela comum, que é o que
  a etapa 1 queria desde o começo.
- js/app.js: FRAME_MIN = 1/144 no laço, como rede de segurança. Com o vsync no
  lugar ele nunca dispara; existe pra nenhuma configuração de máquina soltar o
  laço de novo.
LIÇÃO PRA PRÓXIMA RODADA DE DESEMPENHO: fps alto demais é sintoma, não conquista.

A ETAPA 2 continua de pé: arte 2x e shader 1,5x, 1,87x o pixel de antes
(4,0 → 7,5 Mpx por quadro, test/bench3.js). Se algum dia apertar de verdade, o
caminho é shader 1,25x e arte 1,75x.

INTERFACE: a gaveta de ajustes ganhou barra de rolagem visível (#setbody e .scol).
Com 16 visuais abertos são 21 colunas, e o macOS escondia a barra até você rolar.
</bancada4_e_o_travamento>

<rodada_temas_posicao_template>
DECISÕES DO BRUNO (respondidas por ele, não inferidas):
1. TELA NORMAL fica como 5ª posição, com templates próprios.
2. Template escolhe os VISUAIS; o tema é separado e não vem junto.
3. Os 8 temas que eram só troca de matiz saem; ele deu autonomia pros novos.
4. Espectro e os outros medidores: copiar o MiniMeters de perto, com print.

TEMAS: 14 → 9. SAÍRAM neon, vhs, oceano, floresta, rubi, âmbar, poente, psy (eram
o mesmo tema escuro com outra matiz) e lavanda (era o papel com outro tom).
FICARAM preto, ardósia, gelo, areia, papel. ENTRARAM fósforo, planta, carvão, jornal.
Cada tema muda CINCO coisas, e nenhuma é só a matiz:
  luz do fundo (escada 0·5·29·65·93·199·211·228·231), força da grade (0,06 a 0,50),
  ESPESSURA DO TRAÇO (0,75 a 1,45), paleta e mapa de cor padrão.
  · fósforo: preto absoluto, traço gordo 1,45, verde de tubo, grade média
  · preto:   quase preto, grade que some, fio 1,0 (o padrão limpo)
  · planta:  azul de blueprint, GRADE 0,50 é a estrela, fio 0,75 de nanquim
  · ardósia: cinza-azulado com creme
  · carvão:  chapa de grafite CLARA (93 de luz), grade fraca, branco quente 1,25
  · areia / jornal / gelo / papel: quatro claros com grades de personalidade
    diferente (0,22 fraca · 0,30 · 0,45 milimetrado · 0,14 quase nenhuma)
A espessura por tema entra num lugar só: CV.lw lê THEME_BG[tema].lw. NÃO usar
CV.themeBg ali dentro (ele refaz contas de cor e o CV.lw roda a cada traço).
CV.themeMigra(tema) converte o que saiu no mais próximo, sem apagar nada salvo.
O smoke test tem uma regra: nenhum par de temas pode ser parecido em luz, grade E
espessura ao mesmo tempo. Foi o que faltou na leva antiga.

POSIÇÃO → TEMPLATE → TEMA, nessa ordem, e a barra do topo está nessa ordem com os
passos numerados. A POSIÇÃO filtra a lista de templates pela FORMA, não pela borda:
  faixa (row)  = topo ou rodapé · coluna (col) = esquerda ou direita · tela (grid)
Assim topo e rodapé compartilham os mesmos templates, que é o certo: a forma é que
manda no que cabe. applyPosition() chama refreshTplSelect().

TEMPLATES: 19 → 17, seed 'cv-tpl-seed' = 'v15' (os antigos entraram na lista de
limpeza; os templates com nome próprio dele ficam intactos).
  faixa:  mixagem · master · grave · espectro · fita · rua
  coluna: medição · grave · loudness · teia · cordas
  tela:   estúdio · clipe · show · ambiente · produção · limpa
Chave = 'forma · nome', e o seletor mostra só o nome. applyTemplate NÃO mexe mais
em tema nem em posição. Regra nova no smoke: dois templates da mesma forma não
podem ter o mesmo conjunto de visuais.

ESPECTRO, primeira rodada com o print do MiniMeters lado a lado:
- DUAS CURVAS, uma por canal. audio.js spectrum(n, ch) com ch 'l'/'r'/nada, cache
  por tamanho E por canal (a chave vira n+'l'). Conferido: tom só no L aparece só
  na curva do L.
- O PREENCHIMENTO SAIU DO PADRÃO. Era um gradiente do color map a 92% que virava
  mancha e engolia pico, grade e rótulo. Agora é véu de 14% e tem controle.
- Rótulos de Hz no TOPO (a caixa de leitura desceu pra 30px pra não brigar).
- Pico-hold virou opcional e nasce DESLIGADO: no print dele não existe fio cinza
  por cima das curvas.
- Suavidade 0,90 → 0,72 (ele achou o nosso menos imediato que o dele).
ESPAÇO ESTÉREO: as guias de 45° e a régua L—R viraram controle e nascem
desligadas. No print dele o painel é só a nuvem.

</rodada_temas_posicao_template>

<rodada_controles_iguais_ao_minimeters>
O Bruno mandou o print do PAINEL DE CONFIGURAÇÕES inteiro do MiniMeters. A lista
de controles dele, por módulo, é curtíssima, e agora a nossa é a mesma:
  Waveform      : Canal 1 · Canal 2 · Cor · Velocidade        (+ nosso Mapa)
  Loudness      : Modo                                        (+ nosso Cor)
  Stereometer   : Estilo · Cor · Ponto                        (+ nosso Mapa)
  Oscilloscope  : Trava · Ciclo                               (+ nosso Cor)
  Spectrum      : Estilo · Suavidade · Tilt · FFT · Escala    (+ nosso Cor)
SAÍRAM: Piso, Grade, Linha de pico, Canais e Preenchimento do espectro; Ganho e
Suavidade da onda; Barras e Alvo do loudness; Ganho, Rastro, Guias e Régua do
estéreo; Forma, Ganho e Rastro do osciloscópio.
REGRA DESTA RODADA: piso de dB, compensação de ganho e afins são NÚMERO INTERNO,
não decisão de quem está mixando. Viraram fixos (piso -100 dBFS, grade sempre
ligada, as duas curvas sempre ligadas, osciloscópio sempre cheio). Os defaults
seguem no `defaults` de cada módulo, então o comportamento não mudou: sumiu só o
controle. Quem quiser mexer, mexe no código.

O QUE FALTAVA NO ESPECTRO ("o dele é mais imediatista"): a suavidade era
SIMÉTRICA. Subir e descer levavam o mesmo tempo, e é isso que fazia o nosso
parecer mole. Agora o ataque é quase instantâneo (kUp com smooth*0.28) e a queda
é que segue o controle. Suavidade voltou pra 0,90, que é o valor do print dele.
Estilo padrão voltou pra 'ambos' (curva + preenchimento) porque é o que ele usa;
o preenchimento agora pinta por magnitude, escuro embaixo e aceso só onde a curva
sobe, em vez do gradiente a 92% que virava mancha.

TEMAS: 9 → 13. Queixa dele: "maioria tem fundo escuro". A faixa entre 93 e 199 de
luz estava vazia. Entraram CHUMBO (116, cinza-azulado de meio-tom, traço claro),
TIJOLO (141, barro claro, o primeiro que inverte pra traço escuro) e MUSGO (184,
verde-oliva desbotado com grade forte).
E entrou MINIMETERS (18): réplica do print dele pra comparar lado a lado. Fundo
quase preto neutro e uma cor por módulo, na ordem que os nossos leem a paleta:
0 = curva esquerda do espectro (vermelho), 1 = osciloscópio (verde), 2 = curva
direita (azul), 3 = estéreo (laranja).
Escada de luz agora: 0 · 5 · 18 · 29 · 65 · 93 · 116 · 141 · 184 · 199 · 211 · 228 · 231.
O smoke test cobra que a faixa do meio não fique vazia de novo.
COMPARAÇÃO LADO A LADO, 2ª rodada (print dos dois um em cima do outro):
- MEDIDO ANTES DE MEXER: a calibração do espectro está CERTA. Tom de fundo de
  escala lê -0,6 dBFS, -20dBFS lê -20,6. Nada estoura: com música de rap
  sintética o grave chega a 75% de altura, o agudo a 78%. O paredão no grave NÃO
  era número errado.
- O PAREDÃO ERA O PREENCHIMENTO. Ele era desenhado sob a curva do canal esquerdo,
  e onde os dois canais divergem no grave a área virava um bloco sólido. Agora o
  preenchimento segue o MENOR dos dois canais: ele para de invadir a curva de cima.
- LINHA "MAIS SMOOTH E DETALHADA": a curva usava CV.lw, que multiplica pela
  espessura do TEMA. Medidor é instrumento: agora é 1 pixel de dispositivo fixo
  (c.lineWidth = 1 / m.dpr). Dois harmônicos vizinhos param de virar borrão.
- ONDA ROLANTE SEM DETALHE: era UMA coluna por QUADRO com o mínimo e o máximo do
  quadro inteiro. A 120fps, um ciclo de 50Hz (20ms) cabia em duas colunas, então
  nunca dava pra ver a oscilação, só o envelope. Agora as amostras novas são
  repartidas entre TODAS as colunas que couberam no quadro (função `fatia`), uma
  coluna por pixel.
- CORES: um mapa de cor por tema não copia o MiniMeters, porque lá o loudness é
  azul, o osciloscópio verde, o estéreo amarelo e o espectro vermelho AO MESMO
  TEMPO. Entrou THEME_MOD_CMAP: mapa por módulo dentro do tema. Só o tema
  MINIMETERS usa por enquanto. A escolha por painel continua tendo a última
  palavra. A banda aguda da onda virou CIANO (195°), era laranja (38°): no print
  dele o transiente sai azul.
- LUFS: NÃO tem erro. O print dele mostra -13,2 no CURTO PRAZO; o nosso mostra
  -13,7 no INTEGRADO (o rodapé do nosso painel diz S -13,3). Curto contra curto,
  a diferença é 0,1 dB. É comparação de modos diferentes, não de medição.
3ª RODADA LADO A LADO (a lista dele, item por item):
- ESPAÇO ESTÉREO ABERTO: era o pan de VALOR ABSOLUTO, (|R|-|L|)/soma. Com valor
  absoluto, duas amostras fora de fase caem no mesmo lugar de uma mixagem mono, e
  é justo a fase que espalha a nuvem. Agora é (R-L)/soma, COM SINAL. Foi a maior
  diferença que ele sentiu.
- CLIP NO TOPO: o corte reto em 1 virava platô chapado. Entrou teto macio
  (tanh acima de 0,86).
- SUBGRAVE: abaixo de 45Hz cai 14 dB/oitava. O que mora ali é rumble e vazamento
  de janela, e o analisador dele não mostra. Se um dia ele quiser ver sub, é este
  o número pra mexer.
- ATAQUE/QUEDA EM SEGUNDOS, não em potência de quadro: ataque fixo 22ms, queda de
  60ms a 900ms pelo controle de Suavidade. Antes o resultado mudava com o fps.
- BARRAS QUE PISCAM: o preenchimento era UM polígono com gradiente (uma mancha
  que subia inteira). Agora são colunas agrupadas em 14 degraus de magnitude,
  cada degrau num preenchimento só (14 chamadas, não 1400).
- GRADE E RÓTULOS mais visíveis (0,10 e 0,26 de tinta, rótulo em 62%).
- LOUDNESS igual ao dele: saíram a linha tracejada de alvo, o marcador do
  integrado e o rótulo do modo. A caixa do número foi pro LADO das barras,
  seguindo a altura do valor.
- ONDA ROLANTE COLORIDA: a matiz vinha da mistura de 3 pesos e só passeava entre
  duas cores. Agora vem do CENTRO DE MASSA do som: 60Hz vermelho → 250Hz laranja
  → 900Hz verde → 3kHz ciano → 8kHz azul.
- SILÊNCIO LIMPA TUDO (app.js, no laço): 0,35s de espera e apaga em 0,5s, com
  destination-out por cima do que o módulo desenhou. O módulo não precisa saber.
- FUNDO DO TEMA MINIMETERS mais claro e fosco (#17181b).
- BUG DO SLIDER que redimensionava a tela: .srow era flex, então o texto do valor
  mudando de "5%" pra "100%" empurrava o controle e a coluna inteira recalculava.
  Virou grade de larguras fixas (74px · resto · 46px), .scol com largura fixa de
  232px e scrollbar-gutter: stable.
AINDA DIFERENTE: as curvas vermelha e azul do espectro dele se separam mais que as
nossas. Se o áudio for o mesmo, isso é diferença de fonte (mono no loopback dá
duas curvas idênticas) ou ele desenha Mid/Side em vez de L/R. Confirmar com ele.
4ª RODADA: CORES MEDIDAS NO VÍDEO, NÃO ESTIMADAS.
O Bruno mandou uma gravação de tela de 52s com os dois lado a lado. Dá pra extrair
quadros com ffmpeg e AMOSTRAR OS PIXELS. Foi assim que estas cores entraram:
  fundo #191919 · onda #fd5648 · loudness #4da9fc sobre trilho #1e2529
  osciloscópio #6fb87b sobre #3e6944 · estéreo #e5003a com creme #f0e0cc
  espectro #fc4c69 (esq) e #3a93fb (dir) · grade #4c4c4c
MECANISMO NOVO: THEME_BG[tema].cor[modulo] = lista de cores exatas, lida por
CV.corMod(m, idx, alpha). Devolve null quando o tema não define (aí segue pela
paleta/mapa) e SEMPRE devolve null quando o painel escolheu mapa próprio ou cor
própria. É o que permite copiar um app inteiro sem torcer o color map.
COMO REPETIR ISSO: ffmpeg -ss N -i video.mov -frames:v 1 f.png, e um script com
PIL contando os pixels mais saturados por faixa horizontal. Vale muito mais que
olhar o print.

CONSERTOS DA MESMA RODADA:
- ESTÉREO agora é CARTESIANO (x = balanço na largura toda, y = amplitude). Em
  polar, o raio era a amplitude, então amostra baixa caía perto do CENTRO por mais
  desencontrada que estivesse: era esse o motivo de a nuvem viver espremida numa
  coluna fina enquanto a dele abre em leque. Duas rodadas tentando consertar isso
  pelo ângulo; o problema era o sistema de coordenadas.
- ONDA ROLANTE, cor COLUNA POR COLUNA: a matiz vinha de uma conta por QUADRO, e
  todas as colunas do quadro saíam da mesma cor. Agora cada coluna calcula a
  própria luz do som (soma da diferença entre amostras ÷ rms, que custa uma
  subtração por amostra) e vira matiz: grave vermelho → agudo azul, com o
  transiente estourando pro branco.
- OSCILOSCÓPIO: forma cheia ESPELHADA (envelope em cima e embaixo da linha do
  meio) e rastro zerado. Eram duas linhas soltas com rastro, e com grave forte
  viravam dois rabiscos.
- ESPECTRO: sem preenchimento por padrão (estilo 'fft'), um ponto por pixel de
  DISPOSITIVO (era um a cada dois em Retina, o "quadriculado"), e a curva acende
  até 22% a mais no transiente.
- LOUDNESS: régua e trilho na cor do medidor, barra mais larga, e o número sobe
  em 0,25s e desce em 1,5s (a descida era de 2s e parecia presa).
- FADE DO SILÊNCIO: 0,5s de espera e 2,2s pra sumir (era 0,35 e 0,5).
5ª RODADA: ANÁLISE QUADRO A QUADRO DO VÍDEO, MÓDULO POR MÓDULO.
Método (repetir sempre que ele mandar vídeo): ffmpeg extrai quadros, um script
com PIL acha as bordas dos painéis (colunas sem conteúdo), recorta cada módulo
DELE em cima e o NOSSO embaixo, amplia e salva pra olhar. Foi assim que estes
cinco erros apareceram, e três deles eram o contrário do que a gente tinha feito:

1. FUNDO PRETO PURO: medido, o nosso painel estava em #000000 e o dele em
   #191919. Os módulos limpam o canvas e deixam o fundo por conta do CSS, e
   qualquer coisa no caminho (ajuste ◐, passada de pós, regra de CSS) muda esse
   fundo sem o módulo saber. CONSERTO: o app pinta CV.bgOf(p) por baixo do que o
   módulo desenhou (destination-over), depois do draw. A cor do painel passa a ser
   exatamente a do tema, sempre.

2. NADA DO QUE FOI ACERTADO APARECIA: mudar o padrão de um controle NÃO mexe em
   painel que já existe. Os ajustes salvos dele (preenchimento no espectro, rastro
   no osciloscópio, cor por mapa na onda) continuavam por cima. CONSERTO: migração
   `state.mm4` zera o `s` dos 6 medidores uma vez. LIÇÃO: toda rodada que muda
   padrão de medidor precisa da migração junto, senão o trabalho não aparece.

3. OSCILOSCÓPIO: espelhar foi ERRO meu. A onda dele é assimétrica (a serrilha do
   agudo cavalga o corpo do grave) e o espelho virava um olho simétrico que não
   existe. Voltou pro envelope real min/max preenchido.

4. ESPAÇO ESTÉREO: cartesiano foi ERRO meu. A nuvem dele é um ARCO de meia-lua,
   pontas embaixo e topo no meio, o que só sai de polar (raio = amplitude, ângulo
   = balanço). O cartesiano empilhou tudo na borda de baixo e deixou o painel
   vazio. Voltou pro polar com balanço de valor absoluto (Scaled-Unipolar).
   OBS: se o áudio entrar MONO, o arco vira uma coluna fina por construção, e
   nenhum ajuste de desenho resolve. Conferir no HUD (F): NATIVO = estéreo.

5. VALES RASOS NO ESPECTRO: não era suavização nem piso, era VAZAMENTO DE JANELA.
   A Hann espalha o lóbulo lateral 31 dB abaixo do principal e essa saia enche
   todo vale perto de um harmônico forte. Trocada por BLACKMAN-HARRIS de 4 termos
   (-92 dB): medido, a saia a 5 bins do pico caiu de ~-40 pra -105 dB. Os vales
   abrem e a serrilha de harmônicos aparece separada, como no dele. Custa lóbulo
   principal mais largo, troca que vale muito.

6. ONDA ROLANTE BICOLOR: a saturação caía com o volume, então tudo alto virava
   branco e tudo baixo virava roxo. Agora a saturação segura em 92 e só os
   últimos 18% de pico estouram pro branco. A matiz continua vindo da luz do som.
7. Preenchimento do espectro: chapado e escuro (sombra), sem gradiente.
8. Loudness: número FIXO no alto ao lado das barras (seguir o valor era o que
   deixava difícil de ler) e fonte maior.
6ª RODADA (vídeo 3): ESPAÇO ESTÉREO E ESPECTRO, medidos.
ESTÉREO, três coisas somadas, nenhuma delas o formato:
  1. PONTO. Medido no vídeo: o dele tem 4-5 px, o nosso tinha 1-2. Metade da
     diferença de impacto era só o tamanho do ponto. Auto passou a ser
     sqrt(w*h)/78 (2 a 6 px) e o passo de amostragem caiu, pra dar nuvem legível
     em vez de poeira.
  2. COR. A nossa pintava pelo RAIO através do mapa de cor, e saía uma coluna
     arco-íris (roxo embaixo, amarelo em cima) que não existe no analisador dele.
     Agora a matiz vem da BANDA (grave vermelho, médio verde, agudo azul, como o
     modo "RGB" dele) e a luz vem do raio: perto do topo do arco lava pro branco,
     que é o miolo claro que a nuvem dele tem.
  3. ABERTURA. No mesmo trecho, a nuvem dele ocupa ~5x a largura da nossa. Ganho
     de 2,4 no ângulo, com limite em ±90°.
ESPECTRO:
  4. A JANELA VERTICAL era o erro grande. A nossa ia de -100 a 0 dBFS, e uma raia
     de FFT de 4096 num master alto quase nunca passa de -35: 60% da altura do
     painel NUNCA era usada, e por isso a curva vivia espremida embaixo enquanto a
     dele encosta no alto. Agora é uma janela de 60 dB de -96 a -36.
  5. O HIGHLIGHT que ele pedia é o PREENCHIMENTO POR COLUNA: onde a frequência
     toca forte a coluna acende no vermelho vivo, onde está fraca fica a sombra.
     12 degraus de magnitude, 12 chamadas de preenchimento (não 1400), e a cor
     interpola entre a sombra #4a0a1c e o vivo #fc4c69 DO TEMA (CV.corRGB), não
     pelo mapa de cor.

7ª RODADA: PARAR DE OLHAR E COMEÇAR A MEDIR.
Técnica que resolveu o que 3 rodadas de olho não resolveram: EXTRAIR AS DUAS
CURVAS PIXEL A PIXEL do mesmo quadro de vídeo (o topo aceso de cada coluna, com
os dois apps mostrando o mesmo áudio no mesmo instante) e rodar uma REGRESSÃO
entre as duas alturas. Como as duas leem o mesmo dB, a reta que liga uma à outra
entrega a janela dele.
  Resultado: dele = 2,04 x nosso - 0,73 em 939 colunas (R² 0,62).
  Com a nossa janela sendo -100..0 dB, isso põe a dele em piso -64, span 49.
  ADOTADO: piso -66, span 52. É isso que faz a curva encostar no alto E os vales
  ficarem fundos (o que está abaixo de -66 some da tela).
ESTÉREO, medido no mesmo quadro: a nuvem dele ocupa 25% da largura do painel, a
nossa 7%. Em ângulo: ±18° contra ±3,7°, expansão de quase 5x. Ganho reto de 5x
faria tudo com balanço acima de 0,2 grudar na borda, então é RAIZ (expoente 0,45):
0,05 vira 0,26 · 0,2 vira 0,48 · 1 continua 1. Abre o miolo sem mentir na ponta.
Ponto: 4 px medidos no dele, 1-2 px no nosso. Auto virou sqrt(w*h)/78.

COMO REPETIR A MEDIÇÃO (vale pra qualquer módulo de curva):
  1. ffmpeg -ss N -i video.mov -frames:v 1 f.png
  2. achar a divisória entre os dois apps (linha de luminância quase zero)
  3. por coluna, o primeiro pixel de cima que tem a cor da curva
  4. altura = (base - y) / (base - topo), pros dois
  5. regressão linear de um contra o outro, ignorando as pontas saturadas

8ª RODADA (pedidos diretos dele, sem vídeo):
- ESPAÇO ESTÉREO VIRADO: a cúpula agora tem a base no ALTO e o leque abre pra
  BAIXO (cy = 2, py = cy + cos(ang)*rr). Foi pedido dele, não medição.
- LOUDNESS mais rápido e liso: o número sobe em 0,09s e desce em 0,45s (era
  0,25/1,5, e a descida longa deixava o número parado enquanto a música já tinha
  mudado). As BARRAS ganharam inércia curta própria (0,06s subindo, 0,22s
  descendo) pra deslizar em vez de pular de quadro em quadro. Quem manda no valor
  continua sendo a janela do LUFS, então isto não mente na leitura.
- LOUDNESS ENCOSTADO NA ESQUERDA (x0 = max(fonte*2,4, w*6%)), como o painel dele:
  régua, barras, e só depois o número. Centralizado, a régua ficava solta.
- ESPECTRO QUE BRILHA: cada coluna guarda o quanto SUBIU desde o quadro anterior
  (m.st.fl), isso acende e apaga em 180ms, e as colunas acesas saem por cima em
  3 camadas quase brancas. É o piscar da batida que ele apontou no vídeo: antes a
  faixa só mudava de altura, agora ela acende.
</rodada_controles_iguais_ao_minimeters>
