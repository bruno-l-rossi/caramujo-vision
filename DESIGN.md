# DESIGN.md — Caramujo Vision

Visualizador de áudio do rideblan. Vários módulos ao mesmo tempo (referência de layout: MiniMeters), estética dos módulos de arte inspirada no Exo Audio Form Vision. O foco é psicodélico: visual chamativo que prende a atenção, mais arte do que medidor.

## Princípios

1. O visual é a estrela. A interface some: barras finas, controles aparecem no hover, tudo escuro.
2. Todo pixel reage ao som. Nada de animação solta que ignora o áudio. Grave empurra forma, agudo acende brilho.
3. Resiliente a qualquer proporção. Achatado, esticado, tela cheia: o módulo se adapta sem quebrar.
4. Sem cara de IA padrão. Cores saturadas com intenção, grão por cima, glow de fósforo, referência analógica (osciloscópio, VHS, spectro de rack).

## Fundo e interface (MiniMeters + Exo Form Vision)

- Grade de instrumento: painéis colados numa superfície só, divididos por uma linha de 1px quase invisível (`--hair rgba(255,255,255,0.035)`), sem espaçamento, sem sombra, sem canto. Fronteira discreta como no MiniMeters.
- Fundo do app: `#050506`. Painéis: `#060608`, quase preto puro (Exo). O hover só acende uma borda interna fina, sem levantar sombra.
- Barra do topo enxuta: rótulos mono secos no lugar de pílulas, hairline embaixo, some no topo (mouse ou `H`).
- Ajuste de módulo numa faixa no rodapé: abre embaixo e empurra a grade pra cima, então nunca cobre um módulo nem tapa os botões do topo. Vale em qualquer layout e em janela pequena.
- Menu: botão ☰ MENU fixo no canto superior esquerdo (ou tecla H), fecha clicando fora. Ordem: LAYOUT, TEMPLATES, TEMA, + MÓDULO. Sem seletor de fonte (só existe uma) e sem texto de status duplicando o template.
- Mover a janela: arraste a alça ✥ na barra de qualquer painel (janela sem moldura). A alça ⠿ ao lado só reordena o módulo. Os botões de janela (– ⏻) só aparecem com o menu, pra não tapar os botões do painel do canto.
- Posições fixas na grade: cada painel tem lugar fixo (skyline packing), então redimensionar mexe só na borda que você arrasta, a esquerda fica travada e os vizinhos não são empurrados. Pra resize 1D bem limpo, LINHA e COLUNA são os modos ideais.
- Controles diretos: no Rastro, deslizar pra cima = mais rastro. Antes estava invertido.
- Texto de interface: `#8b8b91`, mono (`SF Mono`), caixa alta, espaçamento largo. Acento: `#f0efe9` (branco papel). A cor mora no visual, não na moldura.

## Temas: cada um é um lugar diferente

Tema não é só matiz. Cada um muda o fundo, a cor do texto, a força da grade e a paleta dos traços, então trocar de tema muda o clima da tela inteira. Três âncoras:

- **PRETO**: fundo quase preto, traço branco. O clássico de rack.
- **PAPEL**: o invertido. Fundo claro (`#e9e7e0`), traço quase preto. Grades, rótulos e caixas de leitura escurecem sozinhos (`CV.isLight`).
- **ARDÓSIA**: cinza-azulado médio com traço creme, na linha do MiniMeters.

Os demais (PSY, NEON, VHS, POENTE, GELO, OCEANO, FLORESTA, VAPORWAVE, RUBI, ÂMBAR) têm fundo próprio na sua temperatura, não o mesmo preto com cor diferente por cima.

## Temas globais (paletas dos visuais)

- **EXO (padrão)**: monocromia branca sobre preto, linhas finas, bloom suave, pó de partícula. A referência direta do Form Vision: delicado, cinematográfico, verde fósforo só no osciloscópio.
- **PSY**: matiz girando no tempo. HSL com saturação 90–100%, luz 55–65%. Derretido, arco-íris ácido.
- **NEON**: `#ff2bd6` magenta, `#00e5ff` ciano, `#8b5cf6` roxo, `#00ff9d` verde. Fundo preto puro.
- **VHS / RUA**: `#ff3b30`, `#ff9500`, `#ffd60a`, `#ff2d55`. Quente, com grão forte e scanlines.

Cada módulo pode fugir do tema com matiz própria (slider de cor).

## Textura

Camada global opcional por cima de tudo: **grão** (ruído animado, opacidade 5–8%) ou **VHS** (grão + scanlines + leve aberração). No tema VHS a textura vem ligada por padrão.

## Movimento

- Portão de energia: o áudio é quem molda tudo. Silêncio = tela parada e apagada; o relógio interno de cada módulo de arte só anda quando tem som, no ritmo da energia e do beat.
- 60fps. Decaimento suave (nada corta seco: picos caem com inércia).
- Tempo real: quase sem média entre frames (smoothing 0.2) e ataque quase instantâneo, pra reagir na hora como o MiniMeters; só a queda continua suave.
- Grave (20–150Hz) comanda escala, deformação e pulso. É o som do rideblan, os graves têm que aparecer.
- Beat detectado dispara evento: flash, explosão de partículas, empurrão no fluido.
- Agudos comandam brilho, faísca e detalhe fino.

## Interação

Todo módulo reage ao mouse, além do som. Estúdio informa no hover (frequência, nota, dB). Arte segue o cursor: o líquido do PSY entorta, o Ferro é atraído, os fios da Fita perseguem, o Túnel desloca o centro, o Caleidoscópio gira. A regra: encostar o mouse nunca quebra o visual, só puxa ele.

## Curvas do Estúdio (refino, norte MiniMeters)

Precisão de instrumento sem perder a cor do tema. As curvas seguem quatro regras:

- Linha nítida de 1px é a estrela. O glow virou um respiro (halo curto), nunca um borrão; o slider de brilho continua, mas rende bem menos (glow × 0.4).
- Preenchimento baixo e chapado no lugar do gradientão. Peso visual leve, a curva respira.
- Pico vira fio contínuo (pico-hold), não pontinhos soltos. Grade de Hz legível (100Hz / 1kHz / 10kHz) com régua de base.
- Cor segue o tema global. Mono/EXO deixa tudo branco; NEON, PSY, RUBI pintam a mesma curva.

Vale pro espectro, onda rolante (bloom contido, borda mais dura), osciloscópio (fio de 1px com linha central de referência, verde fósforo vira opção), loudness e espectrograma (mais contraste, piso limpo). A arte psicodélica mantém a alma; só ganhou junta de linha arredondada em todo módulo.

## Arte (refino: menos brilho, menos fade)

Os módulos psicodélicos ficaram mais chamativos pela definição da forma, com o bloom bem menor. O glow caiu perto da metade (fita, traço, harmonógrafo, ondas em camadas), o rastro encurtou (menos ghosting), e os shaders ganharam preto mais fundo com vinheta mais fechada pra dar contraste. A alma continua: cor do tema e portão de energia (silêncio apaga tudo). Junta de linha arredondada em todo módulo. Os pontos fortes que puxei: a disciplina de forma do MiniMeters e a delicadeza cinematográfica do Exo.

## Templates (presets bem distintos)

Cada preset tem seu próprio conjunto de módulos e sua paleta, então diferem bastante entre si. estúdio traz só os medidores em mono; rua junta psy, túnel, traço e ascii no VHS quente; neon noturno é enxame, órbita, fluxo e lissa no neon; maré oceano reúne aurora, maré, ondas e fita nos azuis; psicodélico empilha psy, harmonógrafo, túnel e terreno com a matiz girando. Mais padrão (os 20 módulos) e vazio. Espectro e onda rolante agora puxam a cor do tema, então a tela toda conversa junta.

## Módulos

Estúdio (informativos, bonitos): espectro suave com hover de frequência/nota e guias de faixa, onda rolante macia, loudness LUFS com média e alvo, espaço estéreo (sala com névoa, profundidade e arco de largura), osciloscópio fósforo, espectrograma com hover.

Arte (12): PSY (shader líquido), LISSAJOUS, FITA, TRAÇO (linha viva), CAMPO DE FLUXO (pó de partículas), ONDAS EM CAMADAS, AURORA, ÓRBITA, ENXAME (constelação: nós ligados por fios que se formam quando o bando junta e rompem no beat), CONTORNO (contorno do espectro empilhado, norte Exo), CORDAS (cordas verticais que vibram por banda, tipo harpa), MALHA (tecido 3D que ondula com o som). Removidos por decisão do Bruno: túnel, maré, ascii, terreno, harmonógrafo, tinta, barras 3d, colmeia, vitral, cascata, túnel de fios, nó.
