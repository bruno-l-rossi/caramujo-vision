# DESIGN.md — Caramujo Vision

Visualizador de áudio do rideblan. Vários módulos ao mesmo tempo (referência de layout: MiniMeters), estética dos módulos de arte inspirada no Exo Audio Form Vision. O foco é psicodélico: visual chamativo que prende a atenção, mais arte do que medidor.

## Princípios

1. O visual é a estrela. A interface some: barras finas, controles aparecem no hover, tudo escuro.
2. Todo pixel reage ao som. Nada de animação solta que ignora o áudio. Grave empurra forma, agudo acende brilho.
3. Resiliente a qualquer proporção. Achatado, esticado, tela cheia: o módulo se adapta sem quebrar.
4. Sem cara de IA padrão. Cores saturadas com intenção, grão por cima, glow de fósforo, referência analógica (osciloscópio, VHS, spectro de rack).

## Fundo e interface (norte: Exo Form Vision)

- Fundo do app: `#080809`. Painéis: `#050506`, quase preto puro.
- Borda dos painéis: linha fina `rgba(255,255,255,0.07)`, raio 10px. Interface que quase some.
- Texto de interface: `#8f8f95`, mono (`SF Mono`), caixa alta, espaçamento largo (2.5px nos rótulos, 8px de corpo).
- Acento da interface: `#f0efe9` (branco papel). Sem cor gritando na moldura; a cor mora no visual.

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
- Grave (20–150Hz) comanda escala, deformação e pulso. É o som do rideblan, os graves têm que aparecer.
- Beat detectado dispara evento: flash, explosão de partículas, empurrão no fluido.
- Agudos comandam brilho, faísca e detalhe fino.

## Interação

Todo módulo reage ao mouse, além do som. Estúdio informa no hover (frequência, nota, dB). Arte segue o cursor: o líquido do PSY entorta, o Ferro é atraído, os fios da Fita perseguem, o Túnel desloca o centro, o Caleidoscópio gira. A regra: encostar o mouse nunca quebra o visual, só puxa ele.

## Módulos

Estúdio (informativos, bonitos): espectro suave com hover de frequência/nota e guias de faixa, onda rolante macia, loudness LUFS com média e alvo, espaço estéreo (sala com névoa, profundidade e arco de largura), osciloscópio fósforo, espectrograma com hover.

Arte: PSY (shader líquido derretendo), TÚNEL (mandala infinita), CALEIDOSCÓPIO (espelhos líquidos), FERRO (fluido magnético com acabamento 3D), LISSAJOUS (curvas harmônicas em teia), FITA (fios de seda), e os quatro na linguagem do Form Vision: TRAÇO (linha viva com tensão), CAMPO DE FLUXO (pó de partículas em campo vetorial), ASCII (rasterização em caracteres, símbolos configuráveis), ONDAS EM CAMADAS (contornos de forma de onda empilhados).
