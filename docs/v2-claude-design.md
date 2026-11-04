# Insumo pro Claude Design — Caramujo Vision

Documento pra dirigir rodadas no [claude.ai/design](https://claude.ai/design). Cole o **prompt da rodada ativa** lá, junto com as partes deste documento que interessarem.

**Rodada ativa: PÓS-PRODUÇÃO.** Atualizado em 3 de agosto de 2026, depois da rodada de tempo real (ver `diagnostico-tempo-real-e-estetica.md`).

---

## O produto

Caramujo Vision é um visualizador de áudio em tempo real pra macOS. Ele escuta o som que sai do computador e desenha na tela em painéis simultâneos: medidores de estúdio de um lado, arte que reage à música do outro.

A proposta tem duas pernas ao mesmo tempo, e é isso que separa dos concorrentes:

1. **Medição séria.** Espectro, LUFS pela norma ITU-R BS.1770, imagem estéreo, osciloscópio, espectrograma. Precisa dar pra mixar e masterizar olhando.
2. **Estética e clipe.** Cada painel grava vídeo com o áudio junto, em MP4. O visual é matéria-prima pra Reels, story e videoclipe.

Dono: rideblan / Caramujo Records. Rap e hip hop, estética de rua, graves muito presentes.

## As duas referências de mercado, nesta ordem

**MiniMeters** (minimeters.app) é a primeira. O que puxamos:

- Grade de instrumento: painéis colados numa superfície só, sem divisória, sem sombra, sem canto arredondado, sem espaçamento. A tela lê como uma coisa só.
- Curva nítida de 1px, preenchimento baixo e chapado, grade de Hz legível (100Hz / 1kHz / 10kHz), leitura de dB/Hz/nota+cents no hover.
- Tipografia mono, caixa alta, espaçamento largo, corpo pequeno.
- Fundos que fogem do preto: cinza-azulado, creme, tons médios. Foi daí que saiu o tema ARDÓSIA.
- Modo barra: o app gruda numa borda da tela e vira uma régua.

**Exo Audio Form Vision** (exoaudio.com/plugins/form-vision) é a segunda. O que puxamos:

- Near-black quase puro, monocromia branca, linha finíssima.
- Interface que quase some: a moldura não compete com o visual.
- Composição cinematográfica, com muito espaço vazio.

**Onde queremos ir além dos dois:** eles param na medição. A gente quer a mesma precisão, com um leque de arte muito maior, temas que mudam o clima da tela inteira, e saída direta pra vídeo.

---

## Regras visuais que já valem (não quebrar)

1. **O áudio é quem molda.** Silêncio = tela parada e apagada. Nada de animação que roda solta ignorando o som. Regra inegociável.
2. **Grave manda na forma.** 20 a 150Hz comanda escala, deformação e pulso. Agudo comanda brilho e detalhe fino. Beat dispara evento.
3. **A forma dá o impacto, e o brilho vem depois, de uma vez só.** O desenho de cada painel sai com linha nítida e sem halo nenhum. O brilho entra numa passada única por cima da tela inteira, com limiar. Essa regra mudou nesta rodada: até agora o app não tinha brilho nenhum, porque o desfoque por traço custava caro demais (a Fita fazia 345 por quadro). Feito de uma vez só na placa de vídeo, o custo cai pra menos de 1% da máquina.
4. **Linha nítida de 1px é a estrela.** Preenchimento entra baixo e chapado, como apoio.
5. **Nada com cara de IA padrão.** Sem gradiente arco-íris genérico, sem "mira/alvo", sem partícula sem propósito.
6. **Resiliente a qualquer proporção.** O mesmo módulo roda num painel achatado de 240x60 e em tela cheia vertical 9:16.

## O que o Bruno gosta e o que ele corta

**Ama:** ondas em camadas, lissajous, campo de fluxo, PSY (líquido), malha 3D.

**Já cortou (14 módulos):** túnel, maré, ascii, terreno, harmonógrafo, tinta, barras 3D, colmeia, vitral, cascata, túnel de fios, nó, órbita, contorno. Os motivos foram sempre os mesmos: **redundante** com outro que já existe, **amador**, ou **colorido demais sem impacto**.

Quer: menos colorido, mais monocromático, mais impactante. Contraste alto, forma definida.

---

## Estado atual: 16 módulos

**Estúdio (6)**

| Módulo | O que faz hoje |
| --- | --- |
| Espectro | Janela de 4096, um ponto por pixel (pico afiado), tilt em dB por oitava, escala Mel/Log/Linear, pico-hold como fio contínuo, preenchimento pintado pelo Color Map na vertical, fio fino na cor do tema, leitura dB \| Hz \| nota+cents no hover |
| Onda rolante | Canal escolhível (Esq/Dir/Mid/Side), até 2 faixas, cor por banda (grave vermelho, médio verde, agudo laranja, com peso ao quadrado), ataque instantâneo e queda controlada |
| Loudness | LUFS pela ITU-R BS.1770 com o filtro K do libebur128. Momentâneo, Curto Prazo e Integrado, 2 barras, régua 0/6/12/24/36/50, alvo tracejado, caixa com o número |
| Espaço estéreo | Cúpula (Scaled-Unipolar): ângulo pelo balanço L/R, raio pela amplitude, cor pelo raio. Barra de largura estéreo na base. Modo Lissajous como alternativa |
| Osciloscópio | Trava no tom por YIN (acha o período fundamental, a onda fica imóvel), forma cheia ou linha, min/max por coluna, 1 ou 3 ciclos, mostra Hz e nota |
| Espectrograma | Rola em anel, energia direto no Color Map, contraste ajustável, hover com Hz e nota |

**Arte (10)**

| Módulo | Ideia |
| --- | --- |
| PSY | Shader líquido com domain warping, fbm de 3 oitavas, o mouse entorta o fluido |
| Aurora | Shader de 3 cortinas verticais de luz dobrando, shimmer no agudo |
| Campo de fluxo | 520 partículas num campo vetorial, desenhadas em lotes de cor e opacidade |
| Enxame | Constelação: 90 nós perseguem um alvo que passeia, fios entre vizinhos, o beat espanta o bando. Orçamento de 3.500 fios por quadro |
| Fita | 5 fios de seda girando com mola, rastro dividido em 6 pedaços de idade |
| Traço | Uma linha de 140 pontos com tensão de corda, pontas presas nas bordas |
| Ondas em camadas | 14 retratos da onda empilhados com profundidade |
| Lissajous | L×R em 3 camadas deslocadas, ou modo harmônico com razão vinda do grave e do agudo |
| Cordas | 28 cordas verticais, cada uma numa banda de frequência, vibrando no modo 1, 2 ou 3 |
| Malha | Tecido 3D 16x16 em perspectiva, ondula e levanta no grave |

## Estado atual: 14 temas

Cada tema define fundo, cor de texto, força da grade e paleta de 4 cores. Trocar de tema muda o clima da tela inteira.

O que separa um tema do outro vai além da matiz. Cada um varia quatro eixos ao mesmo tempo: luminância do fundo, quanto o painel se destaca do fundo, força da grade e amplitude da paleta.

| Grupo | Temas | Fundo | Grade |
| --- | --- | --- | --- |
| Muito escuros, grade quase invisível | PRETO, RUBI, FLORESTA, PSY | luz 4 a 10 | 0.05 a 0.07 |
| Escuros com painel destacado | NEON, OCEANO | luz 5 a 13 | 0.14 a 0.16 |
| Médios quentes, levantados do preto | VHS, ÂMBAR, POENTE, ARDÓSIA | luz 24 a 65 | 0.18 a 0.22 |
| Claros, em três níveis de luz | PAPEL, GELO, AREIA, LAVANDA | luz 181 a 231 | 0.30 a 0.42 |

A paleta também varia de amplitude: RUBI tem um branco no meio dos vermelhos pra contraste, FLORESTA é dessaturada e fechada, ÂMBAR tem faixa larga de luz, VHS tem pouca variação de propósito (cara de fita velha).

Detalhe importante: em fundo claro os módulos **multiplicam** as camadas em vez de somar luz. Somar luz em fundo claro só lava tudo até sumir.

## Estado atual: Color Map, o segundo eixo de cor

Tema e cor do traço são coisas separadas, e essa separação veio do MiniMeters.

O **Tema** manda no cromo: fundo, texto, grade. O **Color Map** é um gradiente contínuo que cada módulo aplica na SUA própria grandeza. O espectro pinta por magnitude, o espectrograma por energia, a onda por banda, o estéreo por amplitude, a arte por índice de paleta. Mesmo mapa, resultado diferente em cada painel.

São 14 mapas (Viridis, Magma, Inferno, Plasma, Rocket, Mako, Crest, Flare, Cubehelix, Turbo, Fogo, Gelo, Cinza, Rua) mais a opção "Do tema", que puxa o padrão de cada tema.

## Estado atual: 19 templates

Numerados de 01 a 19. Cada um guarda os visuais, os ajustes de cada um, o tema e onde a janela fica na tela.

- **Estúdio:** `01 mixagem` (preto, leitura seca), `02 master` (papel, LUFS grande), `03 grave` (ardósia, foco no sub), `11 válvula` (âmbar).
- **Clipe:** `04 clipe vertical` (proporção de Reels), `05 show` (neon), `06 ambiente` (floresta), `08 rua` (VHS), `09 submerso` (oceano), `10 brasa` (rubi), `12 neve` (gelo), `13 deserto` (areia), `14 sonho` (lavanda).
- **Misto:** `07 produção` (poente, metade e metade).
- **Encaixados na borda da tela:** `15 régua no rodapé`, `16 faixa no topo`, `17 coluna à direita`, `18 torre à esquerda`.
- **Do zero:** `19 tela limpa`.

---

## O que ESTA rodada precisa resolver

O app desenha bem e não tem acabamento. Medindo, sobra folga de máquina: os 16 visuais juntos gastam 3,6% do orçamento de um quadro, e a pintura fica em 0,24 Gpx/s numa máquina que entrega 50 ou mais. Uma passada de pós-produção na tela inteira custa 0,37 Gpx/s, menos de 1% do total.

Então a pergunta deixou de ser se cabe. A pergunta é como esse acabamento tem que parecer, num app que precisa continuar servindo pra mixar.

**A restrição que faz disso um problema de verdade:** o pós entra em TUDO, medidores incluídos. O Espectro tem uma linha de 1px e texto mono de 9px que precisam continuar legíveis com bloom, grão e aberração cromática por cima. O MiniMeters não tem pós nenhum, e é justamente isso que dá confiança de leitura. A direção tem que achar a dose que faz a tela virar uma peça só sem transformar o instrumento em enfeite.

---

## Prompt da rodada ativa: PÓS-PRODUÇÃO

```
Você é diretor de fotografia de um visualizador de áudio em tempo real chamado
Caramujo Vision, feito por um produtor de rap/hip hop (rideblan, selo Caramujo
Records). O programa roda no macOS e mostra vários painéis ao mesmo tempo:
medidores de estúdio (espectro, LUFS, imagem estéreo, osciloscópio,
espectrograma) e módulos de arte que reagem à música. Cada painel grava vídeo em
MP4 com o áudio junto, então o visual também vira conteúdo pra Reels, story e
videoclipe.

O DESENHO JÁ ESTÁ PRONTO. O que falta é o ACABAMENTO: a camada de pós-produção
que passa por cima da tela inteira e transforma um desenho correto numa imagem
que parece filmada. É só disso que eu quero falar nesta rodada.

REFERÊNCIAS, NESTA ORDEM
1. MiniMeters (minimeters.app). É a primeira referência. Precisão de
   instrumento: painéis colados numa superfície só, sem divisória, sem sombra,
   sem canto. Curva nítida de 1px, grade de Hz legível, tipografia mono em caixa
   alta e corpo pequeno. Fundos variados, não só preto: cinza-azulado, creme,
   tons médios.
2. Exo Audio Form Vision (exoaudio.com/plugins/form-vision). É a segunda.
   Delicadeza cinematográfica: near-black, monocromia branca, linha finíssima,
   muito espaço vazio, interface que quase some.

O clima que eu quero é LIMPO E CINEMATOGRÁFICO. Quase preto, brilho contido,
cor controlada, muito espaço. Nada de neon estourado nem de grão sujo de VHS
como padrão (o app já tem um tema VHS pra quando eu quiser isso).

IMPORTANTE: não fique preso nessas duas referências. Elas são o piso, não o
teto. Depois de responder no espírito delas, quero que você proponha PELO MENOS
UMA direção autoral própria, que não venha de nenhum plugin de áudio, e me
explique de onde ela vem. Pode vir de cinema, de fotografia analógica, de
impressão, de qualquer lugar. Se ela for melhor que a linha das referências,
me diga isso na cara.

A RESTRIÇÃO QUE FAZ DISSO UM PROBLEMA DE VERDADE
O pós entra em TUDO, medidores incluídos. O espectro tem uma linha de 1px e
texto mono de 9px que precisam continuar LEGÍVEIS com bloom, grão e aberração
cromática por cima. O MiniMeters não usa pós nenhum, e é isso que dá confiança
de leitura. Eu quero a tela inteira lendo como uma peça só, e ainda assim
conseguir mixar olhando pra ela. Achar essa dose é o trabalho.

O QUE COMPÕE A PASSADA DE PÓS (me dê a direção de cada um)
1. Pontilhado contra banda. Os fundos são quase pretos (#050506 e #08080a) e
   todo degradê escuro racha em faixas visíveis. Isso é o defeito mais óbvio
   hoje, principalmente nos módulos de shader.
2. Bloom com limiar. Só o que passa de um certo brilho acende. Hoje o app não
   tem brilho nenhum.
3. Curva de cor. Como o highlight rola em vez de estourar chapado, quanto o
   preto abre (ou se ele fica fechado mesmo), quanto de contraste.
4. Grão animado. Intensidade, tamanho, se é monocromático ou colorido.
5. Aberração cromática radial. Deslocamento de vermelho e azul crescendo do
   centro pra borda.
6. Borrão de movimento por acúmulo de quadros.
7. Vinheta.

O QUE EU PRECISO DE VOLTA
Mockups LADO A LADO: o mesmo painel sem pós e com pós, na mesma imagem, pra eu
comparar e apontar. Faça isso pra 3 painéis diferentes:
- ESPECTRO: curva de frequência com pico afiado, grade de Hz com rótulos
  100Hz/1kHz/10kHz no rodapé, fio de pico-hold, caixa de leitura pequena. É o
  teste de legibilidade.
- PSY: campo líquido de shader, cor girando, fundo quase preto. É o teste de
  banda e de bloom.
- ENXAME: constelação de pontos ligados por fios de 1px sobre fundo quase
  preto. É o teste de como o brilho trata linha fina e ponto pequeno.

Mostre cada um em dois temas de luminância oposta: PRETO (fundo #050506, traço
branco) e PAPEL (fundo #e9e7e0, traço quase preto). O pós tem que funcionar nos
dois, e em fundo claro somar luz só lava tudo, então lá a lógica precisa ser
outra.

Pra CADA efeito, junto do mockup, me dê os números:
- Bloom: a partir de que brilho acende (0 a 1), raio em % da altura do painel,
  intensidade, e se o halo é branco ou pega a cor de baixo.
- Grão: intensidade em %, tamanho em pixels, se anima e a que velocidade.
- Aberração: deslocamento em pixels na borda.
- Curva de cor: onde fica o joelho do highlight, quanto o preto levanta, o
  contraste.
- Pontilhado: intensidade.
- Borrão de movimento: quantos quadros de acúmulo e com que peso.
- Vinheta: força.
E a DOSE DO MEDIDOR: quanto de cada um desses o espectro recebe, comparado com
o que a arte recebe. Se algum efeito tiver que ser zero no medidor, diga qual e
por quê.

RESTRIÇÕES QUE NÃO SE QUEBRAM
- O áudio molda tudo. Silêncio = tela parada e apagada.
- O desenho de cada painel sai sem halo nenhum. O brilho é uma passada única
  por cima da tela inteira, com limiar.
- Linha nítida de 1px continua sendo a estrela.
- Mais monocromático que colorido. Contraste alto.
- Nada com cara de IA genérica: sem arco-íris padrão, sem mira/alvo, sem
  partícula solta sem propósito, sem glow roxo de dashboard.
- O mesmo painel roda num retângulo de 240x60 e em tela cheia 9:16.

FORMATO DA RESPOSTA
Mockups estáticos em par (sem pós / com pós). Para cada direção que você
propuser, escreva em uma linha o que ela faz que a outra não faz. No fim,
recomende UMA das direções como padrão do app e diga por quê.
```

---

## Próximas rodadas (prompts guardados)

Uma frente por rodada. Estes ficam prontos pra quando a de pós fechar.

### B) Paletas autorais da Caramujo

```
Crie 4 temas completos com identidade autoral ligada à estética de rua e
periférica do rap brasileiro. Cada tema precisa de: cor de fundo (hex), cor do
painel (hex, um pouco diferente do fundo), cor de texto da interface, opacidade
da grade (0.05 a 0.45), cor de acento e 4 cores de traço em HSL.
IMPORTANTE: os temas têm que diferir em MAIS do que a matiz. Varie também a
luminância do fundo (de quase preto a claro), o quanto o painel se destaca do
fundo, a força da grade e a amplitude interna da paleta (alguns com cores
próximas entre si, outros com muito contraste). Pelo menos um de fundo claro e
um de fundo médio.
O app já tem 14 temas: PRETO, PAPEL, ARDÓSIA, GELO, AREIA, LAVANDA, NEON, VHS,
OCEANO, FLORESTA, RUBI, ÂMBAR, POENTE, PSY. Os novos precisam ocupar um espaço
que nenhum desses ocupa.
Mostre cada tema aplicado numa mesma tela de exemplo (uma curva de espectro
mais uma onda rolante) pra dar pra comparar lado a lado.
```

### C) Presets de gravação

```
O app grava cada painel em vídeo. Hoje ele grava no tamanho que o painel está na
tela, e eu quero 3 tamanhos fixos: 1080x1920 (Reels e story), 1080x1080 (feed) e
1920x1080 (YouTube).
Pegue 3 painéis que já existem (espectro, PSY e ondas em camadas) e mostre como
cada um deveria SE RECOMPOR nesses 3 tamanhos, em vez de só esticar. O que
entra, o que sai, o que muda de eixo, o que muda de tamanho relativo, onde fica
o espaço vazio. Um mockup por combinação, 9 no total.
Considere que em 1080x1920 o vídeo vai ter legenda ou nome de faixa por cima em
algum momento, então precisa sobrar respiro em algum lugar previsível.
```

### D) Módulos novos

```
Proponha 3 conceitos de visual reativo a áudio, claramente distintos entre si e
de tudo que já existe. Pra cada um: o nome, a ideia em uma frase, o que o grave
faz, o que o agudo faz, o que o beat dispara, como fica em silêncio, e como se
comporta em 9:16 versus numa régua horizontal. Mockup estático de cada um em
fundo preto com traço branco. Nada de arco-íris.

JÁ EXISTE (não repetir): espectro, onda rolante, loudness LUFS, espaço estéreo,
osciloscópio, espectrograma, PSY (líquido com domain warping), aurora (cortinas
verticais), campo de fluxo (pó em campo vetorial), enxame (constelação com
fios), fita (fios de seda com mola), traço (linha viva com tensão), ondas em
camadas (contornos empilhados), lissajous (curvas L×R), cordas (cordas
verticais por banda), malha (tecido 3D em perspectiva).

JÁ FOI TESTADO E REJEITADO (não propor nem variação próxima): túnel de mandala,
interferência de ondas, arte em ASCII, terreno/montanha, harmonógrafo, gotas de
tinta, barras 3D de equalizador, grade hexagonal, vitral/voronoi, chuva de luz
em colunas, túnel wireframe, nó 3D, órbita gravitacional, linhas de contorno
topográfico. O motivo do corte foi sempre: redundante com outro módulo,
amador, ou colorido demais sem impacto.
```

### E) Identidade da Caramujo no visual

```
O selo se chama Caramujo e o logo é uma espiral bege. Proponha como amarrar essa
identidade ao visual do programa sem ficar decorativo nem virar marca d'água.
Pode ser na geometria de um módulo, na tipografia, na paleta, no comportamento
de uma animação, na forma da grade. Quero 3 caminhos diferentes, e pra cada um
uma frase dizendo por que ele é reconhecível como Caramujo e não como "app de
áudio genérico".
```

---

## Como trazer o resultado de volta

O que sair do Claude Design vira código aqui.

**Pra pós-produção**, eu preciso dos números por efeito (limiar e raio do bloom, intensidade e tamanho do grão, deslocamento da aberração, joelho e lift da curva, quadros de acúmulo do borrão, força da vinheta), mais a dose separada pro medidor, mais as imagens de referência dos pares sem pós / com pós. Com isso eu monto a passada única na placa de vídeo e ligo os controles de intensidade por visual e por template.

**Pra módulo novo:** o nome, a ideia em uma frase, o mapeamento (grave faz o quê, agudo faz o quê, beat dispara o quê), o comportamento no silêncio e um mockup. Eu implemento em `js/modules.js` usando os helpers que já existem (`CV.gate` pro portão de energia, `CV.rate` pro relógio suavizado, `CV.pal` pra cor do tema, `CV.cmap` pro Color Map, `CV.trailFill` pro rastro, `CV.blend` pra mistura).

**Pra tema novo:** hex do fundo, hex do painel, cor do texto, opacidade da grade, hex do acento e as 4 cores da paleta em HSL.

**Pra preset de gravação:** os mockups nos 3 tamanhos e a lista do que entra e do que sai em cada um.
