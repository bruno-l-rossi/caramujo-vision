# Caramujo Vision

Visualizador de áudio em tempo real do rideblan / Caramujo Records. Vários módulos na mesma tela (layout inspirado no MiniMeters), estética moldada no Exo Audio Form Vision: preto quase puro, monocromia delicada, linha fina, bloom suave. Escuta qualquer som do computador: FL Studio, YouTube, player, tudo.

## Rodar como programa de computador

Uma vez (peça pro Claude Code rodar na pasta do projeto):

```
npm install
```

Depois, sempre que quiser abrir:

```
npm start
```

Abre a janela do Caramujo Vision (sem moldura, direto nos visuais), com o ícone do caramujo. Pra gerar o instalador .dmg de verdade:

```
npm run dist
```

O instalador sai na pasta `dist/`.

## Rodar no navegador

Dois cliques no `index.html` (Chrome) também funcionam. Clique na tela pra começar.

## Fonte de áudio

Uma fonte só: **o áudio do computador**. Ele capta tudo que sai das caixas (FL Studio, YouTube, Spotify, o que for) direto, **sem driver nenhum** e sem passar pelo microfone. Na primeira vez o Mac pode pedir a permissão de gravação de tela (é só liberar; serve pra pegar o som do sistema, não pra gravar a tela). Se a captura nativa não pegar, ele cai sozinho pro BlackHole (passo a passo no `?`). O seletor da barra ainda deixa escolher um dispositivo de entrada específico, se você quiser.

Regra de ouro dos visuais: o áudio é quem molda. Silêncio = tela parada e apagada; grave e beat empurram o relógio interno de cada módulo.

## Módulos (20)

Estúdio: Espectro (grade de Hz por décadas, curva principal preenchida + curva secundária, nivelamento de volume, hover com dB/Hz/nota+cents), Onda rolante (waveform cheia rolando, cor do grave pro agudo conforme o conteúdo), Loudness (LUFS, média da sessão e alvo), Espaço estéreo (nuvem orgânica com névoa e barra de largura), Osciloscópio (verde fósforo ou branco, até 3 camadas), Espectrograma (hover com frequência).

Arte: PSY (líquido psicodélico), Túnel, Lissajous, Fita, Traço (linha viva), Campo de fluxo (pó de partículas), ASCII (símbolos configuráveis, escreva o que quiser), Ondas em camadas, Terreno (as ondas viram montanhas em perspectiva 3D, o grave levanta o relevo), Harmonógrafo (pêndulos desenhando teias finas que se acumulam), Enxame (bando de pontos: o beat espanta, a música reagrupa), Aurora (cortinas de luz verticais dobrando, irmã calma do PSY), Órbita (partículas gravitando um sol que pulsa no grave, rastros longos), Maré (ondas de várias fontes se cruzando, interferência por banda).

Todos reagem ao mouse: estúdio informa, arte segue o cursor.

## Controles

O programa abre no modo visual: só os gráficos. **O menu do topo aparece quando o mouse encosta no topo da tela** (ou aperte `H` pra fixar). Os botões de **minimizar (–)** e **fechar (⏻)** ficam sempre no canto superior direito, independente do menu. A janela não tem moldura: arrasta ela pela barra do topo (⌘Q também fecha).

- Passe o mouse num painel: `⚙` (em destaque) abre a **gaveta de ajustes** na lateral, `●` grava vídeo, `✕` fecha o painel. A gaveta tem um **✕ FECHAR** claro no topo.
- **Redimensionar**: arraste as bordas do painel, em passos finos (dá pra ajustar quase pixel a pixel). Na grade, a borda direita muda a largura, a de baixo a altura e o canto os dois. Na LINHA você só mexe na largura; na COLUNA só na altura.
- **Trocar de lugar**: arraste o painel **por qualquer ponto dele** e solte perto de outro. Uma linha marca onde ele vai entrar (como mover uma linha de planilha). Segurar numa borda redimensiona em vez de arrastar.
- `+ MÓDULO` adiciona qualquer módulo, quantas vezes quiser.
- **LAYOUT**: GRADE (padrão), LINHA → (tudo numa fila horizontal) ou COLUNA ↓ (tudo empilhado). Estica a janela como quiser: os visuais escalam junto.
- **Tela cheia** de um módulo: deixe só ele na tela (dica: template **vazio** + esse módulo) e dê `⛶` no topo.
- Temas: EXO (mono estilo Form Vision), PSY, NEON, VHS, POENTE, GELO, OCEANO, FLORESTA, VAPORWAVE, RUBI, ÂMBAR.
- Cor e **tema por módulo**: na gaveta de cada módulo dá pra escolher um tema próprio (ou seguir o global) e cor própria. Dá pra **mesclar temas** na mesma tela.
- Layout e ajustes ficam salvos sozinhos. `⏻` fecha o app.

## Templates

Personalizou os gráficos, o layout e o tamanho da janela do jeito que gosta? Salva num template e volta pra ele com um clique.

- `⭑` salva a personalização atual (visuais, ajustes de cada um, tema, layout e tamanho da janela) com um nome.
- O seletor de **templates** carrega qualquer um salvo.
- `🗑` apaga o template selecionado.

Vem com dois prontos: **padrão** (os 20 módulos na tela) e **vazio** (tela limpa pra montar do zero). As variações de cor ficam nos **temas** (seletor ao lado), não como templates.

Cada módulo tem ajustes próprios que fazem sentido pra ele (a `⚙` abre a gaveta): o espectro tem grade de Hz e cores das duas curvas, a onda rolante tem cor do grave/agudo e rolagem, a órbita tem gravidade do sol, a aurora tem dobra e número de cortinas, a maré tem ondulação, e assim por diante.

## Gravar vídeo

O `●` grava aquele painel com o áudio junto, em `.webm`. Estica o painel na proporção do destino (Reels, YouTube) antes de gravar, ou usa tela cheia. Pra converter pra mp4: peça pro Claude Code.

## Teste

```
npm test
```

Roda os 16 módulos com áudio falso e acusa erro de código. Sem dependência externa.

## Estrutura

```
index.html        página única do app
css/style.css     interface
js/audio.js       captura e análise de áudio
js/modules.js     os 16 módulos visuais
js/app.js         grade, gaveta de ajustes, temas, gravação, fontes
electron/main.js  janela do programa (sem moldura, loopback de áudio, controles)
electron/preload.js  ponte segura tela↔sistema (loopback + janela)
test/smoke.js     teste de fumaça
DESIGN.md         identidade visual (norte: Exo Form Vision)
docs/contexto-continuidade.md  contexto pra retomar o projeto em outro chat
assets/logo.png   logo espiral · build/icon.png ícone do app
```
