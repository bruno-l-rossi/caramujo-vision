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
- Estado: localStorage 'cv-state-v7'. Templates: 'cv-templates-v1', seed 'cv-tpl-seed' = 'v14'. Subir a versão da chave reseta.
- Templates prontos (seed v14): 19, numerados com ZERO À ESQUERDA (01..19) pra não desordenar na lista alfabética. Cada um guarda `pos` e ao ser escolhido já encaixa a janela. Cobrem perfis (mixagem/master/grave/válvula), visual (clipe vertical, show, ambiente, rua, submerso, brasa, neve, deserto, sonho), misto (produção), encaixados (régua no rodapé, faixa no topo, coluna à direita, torre à esquerda) e tela limpa.
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
</contexto_continuidade>
