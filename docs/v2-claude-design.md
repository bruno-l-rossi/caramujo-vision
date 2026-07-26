# Insumo pro Claude Design — Caramujo Vision v2

Documento pra refinar visuais, paletas, temas e módulos no [claude.ai/design](https://claude.ai/design). Cole o **prompt do fim** lá, junto com as partes deste documento que interessarem à rodada.

---

## O produto

Caramujo Vision é um visualizador de áudio em tempo real pra macOS. Ele escuta o som que sai do computador e desenha na tela em painéis simultâneos: medidores de estúdio de um lado, arte que reage à música do outro.

A proposta tem duas pernas ao mesmo tempo, e é isso que diferencia dos concorrentes:

1. **Medição séria.** Espectro, LUFS, imagem estéreo, osciloscópio, espectrograma. Precisa dar pra mixar e masterizar olhando.
2. **Estética e clipe.** Cada painel grava vídeo com o áudio junto. O visual é matéria-prima pra Reels, story e videoclipe.

Dono: rideblan / Caramujo Records. Rap e hip hop, estética de rua, graves muito presentes.

## As duas referências de mercado

**MiniMeters** (minimeters.app) — o padrão de medição. O que puxamos dele:

- Grade de instrumento: painéis colados numa superfície só, divididos por linha de 1px, sem sombra, sem canto arredondado, sem espaçamento.
- Curva nítida de 1px, preenchimento baixo e chapado, grade de Hz legível (100Hz / 1kHz / 10kHz), leitura de dB/Hz/nota no hover.
- Tipografia mono, caixa alta, espaçamento largo, corpo pequeno.
- Fundos que não são só preto: ele usa cinza-azulado, creme, tons médios. Foi daí que saiu o tema ARDÓSIA.
- Modo barra: o app gruda numa borda da tela e vira uma régua.

**Exo Audio Form Vision** (exoaudio.com/plugins/form-vision) — a delicadeza. O que puxamos dele:

- Near-black quase puro, monocromia branca, linha finíssima.
- Bloom suave e contido, nunca borrão.
- Interface que quase some: a moldura não compete com o visual.
- Composição cinematográfica, com muito espaço vazio.

**Onde queremos ir além dos dois:** eles param na medição. A gente quer a mesma precisão, mas com um leque de arte muito maior, temas que mudam o clima da tela inteira, e saída direta pra vídeo.

---

## Regras visuais que já valem (não quebrar)

1. **O áudio é quem molda.** Silêncio = tela parada e apagada. Nada de animação que roda solta ignorando o som. É regra inegociável.
2. **Grave manda na forma.** 20–150Hz comanda escala, deformação e pulso. Agudo comanda brilho e detalhe fino. Beat dispara evento.
3. **Impacto vem da forma, não do brilho.** Glow é um respiro curto, nunca borrão. Rastro curto, sem ghosting.
4. **Linha nítida de 1px é a estrela.** Preenchimento entra baixo e chapado, como apoio.
5. **Nada com cara de IA padrão.** Sem gradiente arco-íris genérico, sem "mira/alvo", sem partícula sem propósito.
6. **Resiliente a qualquer proporção.** O mesmo módulo roda num painel achatado de 240×60 e em tela cheia vertical 9:16.

## O que o Bruno gosta e o que ele corta

**Ama:** ondas em camadas, lissajous, campo de fluxo, PSY (líquido), malha 3D.

**Já cortou (14 módulos):** túnel, maré, ascii, terreno, harmonógrafo, tinta, barras 3D, colmeia, vitral, cascata, túnel de fios, nó, órbita, contorno. Os motivos foram sempre os mesmos: **redundante** com outro que já existe, **amador**, ou **colorido demais sem impacto**.

Quer: menos colorido, mais monocromático, mais impactante. Contraste alto, forma definida.

---

## Estado atual: 16 módulos

**Estúdio (6)**

| Módulo | O que faz |
| --- | --- |
| Espectro | Curva de frequência, grade de Hz por décadas, pico-hold, hover com dB/Hz/nota+cents |
| Onda rolante | Waveform cheia rolando, cor variando por centroide (grave→agudo) |
| Loudness | LUFS com barra, média da sessão e alvo. Número com decay lento |
| Espaço estéreo | Nuvem de amostras L/R, barra de largura. Sem cara de alvo |
| Osciloscópio | Forma de onda com trigger em zero-crossing, linha central |
| Espectrograma | Histórico de frequência rolando, hover com Hz |

**Arte (10)**

| Módulo | Ideia |
| --- | --- |
| PSY | Shader líquido derretendo, domain warping |
| Aurora | Cortinas verticais de luz dobrando |
| Campo de fluxo | Pó de partículas num campo vetorial |
| Enxame | Constelação: nós ligados por fios que se formam e rompem no beat |
| Fita | Fios de seda girando com mola no beat |
| Traço | Uma linha viva com tensão de corda |
| Ondas em camadas | Contornos de waveform empilhados com profundidade |
| Lissajous | Curvas harmônicas em teia (L×R) |
| Cordas | Cordas verticais que vibram por banda de frequência |
| Malha | Tecido 3D em perspectiva que ondula e levanta no grave |

## Estado atual: 14 temas

Cada tema define fundo, cor de texto, força da grade e paleta de 4 cores. Trocar de tema muda o clima da tela inteira.

**Fundo escuro:** PRETO (`#050506`, traço branco), NEON (`#04030e`, magenta/ciano), VHS (`#1c0a06`, vermelho de fita), OCEANO (`#03121f`), FLORESTA (`#08170e`), RUBI (`#19040a`), ÂMBAR (`#191004`), POENTE (`#25101a`), PSY (matiz girando).

**Fundo claro:** PAPEL (`#e9e7e0`, traço quase preto), GELO (`#dbe7ee`, azul profundo), AREIA (`#e0d3bc`, terroso), LAVANDA (`#cfc6e2`, roxo escuro).

**Fundo médio:** ARDÓSIA (`#374545`, traço creme — o do MiniMeters).

Detalhe técnico importante: em fundo claro os módulos **multiplicam** as camadas em vez de somar luz, e o glow é desligado. Somar luz em fundo claro só lava tudo até sumir.

---

## O que a v2 precisa resolver

1. **Módulos novos que não sejam redundantes.** O acerto é baixo: de 14 propostos, 14 foram cortados. Precisa de conceitos claramente distintos entre si e dos 16 que já existem.
2. **Paletas mais autorais.** Hoje são combinações razoáveis, mas sem uma assinatura de marca clara ligando ao Caramujo (estética de rua, periférica, som de grave pesado).
3. **Composição por proporção.** Como cada módulo se comporta em 9:16 (Reels), 1:1 e numa régua de 240×60. Hoje ele só escala.
4. **Identidade do Caramujo no visual.** Nada hoje amarra o visual à marca além do logo espiral bege.

---

## Prompt pra colar no Claude Design

```
Você é diretor de arte de um visualizador de áudio em tempo real chamado
Caramujo Vision, feito por um produtor de rap/hip hop (rideblan, selo Caramujo
Records). O programa roda no macOS e mostra vários painéis ao mesmo tempo:
medidores de estúdio (espectro, LUFS, imagem estéreo, osciloscópio) e módulos
de arte que reagem à música. Cada painel grava vídeo, então o visual também
vira conteúdo pra Reels e videoclipe.

REFERÊNCIAS DE MERCADO
- MiniMeters: precisão de instrumento. Painéis colados numa superfície só,
  divididos por linha de 1px, sem sombra e sem canto. Curva nítida de 1px,
  grade de Hz legível, tipografia mono em caixa alta. Fundos variados, não só
  preto: cinza-azulado, creme, tons médios.
- Exo Audio Form Vision: delicadeza cinematográfica. Near-black, monocromia
  branca, linha finíssima, bloom contido, muito espaço vazio, interface que
  quase some.
Queremos a precisão do primeiro com a delicadeza do segundo, e ir além dos
dois num ponto: variedade de arte e temas que mudam o clima da tela inteira.

REGRAS QUE NÃO SE QUEBRAM
1. O áudio molda tudo. Silêncio = tela parada e apagada.
2. Grave (20-150Hz) comanda forma, escala e pulso. Agudo comanda brilho e
   detalhe fino. O beat dispara eventos.
3. Impacto vem da FORMA, não do brilho. Glow é um respiro curto, nunca borrão.
4. Linha nítida de 1px é a estrela; preenchimento entra baixo e chapado.
5. Mais monocromático que colorido. Contraste alto.
6. O mesmo módulo tem que funcionar num painel 240x60 e em tela cheia 9:16.
7. Nada com cara de IA genérica: sem arco-íris padrão, sem mira/alvo, sem
   partícula solta sem propósito.

O QUE JÁ EXISTE (não repetir)
Estúdio: espectro, onda rolante, loudness LUFS, espaço estéreo, osciloscópio,
espectrograma.
Arte: PSY (líquido/domain warping), aurora (cortinas verticais), campo de fluxo
(pó em campo vetorial), enxame (constelação com fios), fita (fios de seda),
traço (linha viva com tensão), ondas em camadas (contornos empilhados),
lissajous (curvas L×R), cordas (cordas verticais por banda), malha (tecido 3D
em perspectiva).

JÁ FORAM TESTADOS E REJEITADOS (não propor de novo, nem variações próximas):
túnel de mandala, interferência de ondas, arte em ASCII, terreno/montanha,
harmonógrafo, gotas de tinta, barras 3D de equalizador, grade hexagonal,
vitral/voronoi, chuva de luz em colunas, túnel wireframe, nó 3D, órbita
gravitacional, linhas de contorno topográfico.
O motivo do corte foi sempre: redundante com outro módulo, amador, ou colorido
demais sem impacto.

O QUE EU QUERO DE VOCÊ
[escolha uma frente por rodada]

A) MÓDULOS NOVOS
Proponha 3 conceitos de visual reativo a áudio que sejam claramente distintos
entre si e de tudo que já existe. Pra cada um: o nome, a ideia em uma frase, o
que o grave faz, o que o agudo faz, o que o beat dispara, como ele se comporta
em silêncio, e como fica em 9:16 versus numa régua horizontal. Mostre um mockup
estático de cada um em fundo preto com traço branco. Nada de arco-íris.

B) PALETA E TEMAS
Crie 4 temas completos com identidade autoral ligada à estética de rua e
periférica do rap. Cada tema precisa de: cor de fundo (hex), cor de texto da
interface, opacidade da grade, e 4 cores de traço. Pelo menos um de fundo
claro. Mostre cada tema aplicado numa mesma tela de exemplo (uma curva de
espectro + uma onda) pra dar pra comparar lado a lado.

C) COMPOSIÇÃO POR PROPORÇÃO
Pegue 3 dos módulos que já existem e mostre como cada um deveria se recompor
(não só escalar) em três proporções: 9:16 vertical, 1:1 quadrado e 4:1
horizontal. O que entra, o que sai, o que muda de eixo.

D) IDENTIDADE
O selo se chama Caramujo e o logo é uma espiral bege. Proponha como amarrar
essa identidade ao visual do programa sem ficar decorativo nem virar marca
d'água: pode ser na geometria dos módulos, na tipografia, na paleta, na
assinatura de um módulo específico.

FORMATO DA RESPOSTA
Mockups estáticos, escuros por padrão, com a interface reduzida ao mínimo.
Para cada proposta, escreva também em uma linha o motivo dela ser diferente do
que já existe. Se a proposta se parecer com algo da lista de rejeitados, não
mande.
```

---

## Como trazer o resultado de volta

O que sair do Claude Design vira código aqui. Pra cada módulo novo aprovado, o que eu preciso é:

- O nome e a ideia em uma frase.
- O mapeamento: grave faz o quê, agudo faz o quê, beat dispara o quê.
- O comportamento no silêncio.
- Uma imagem de referência (mockup) de como deve ficar.

Com isso eu implemento em `js/modules.js` seguindo os helpers que já existem (`CV.gate` pro portão de energia, `CV.rate` pro relógio suavizado, `CV.pal` pra cor do tema, `CV.trailFill` pro rastro, `CV.blend` pra mistura).

Pra tema novo, preciso de: hex do fundo, hex do painel, cor do texto, opacidade da grade, hex do acento e as 4 cores da paleta em HSL.
