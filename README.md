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

Abre a janela dedicada do Caramujo Vision, com ícone e permissão de microfone já pedida. Pra gerar o instalador .dmg de verdade:

```
npm run dist
```

O instalador sai na pasta `dist/`.

## Rodar no navegador

Dois cliques no `index.html` (Chrome) também funcionam. Clique na tela pra começar.

## Fontes de áudio (seletor na barra)

- **LEGO · BEAT DA SEMANA**: na primeira vez pede o arquivo (wav/mp3 exportado do FL) e guarda dentro do app; depois toca direto, com play/pause no `▶`.
- **UPLOAD DE FAIXA…**: escolhe qualquer mp3/wav e toca em loop. Arrastar o arquivo pra tela também funciona.
- **ÁUDIO DO COMPUTADOR…**: captura tudo que sai das caixas. Precisa do driver gratuito BlackHole (uma vez só); passo a passo no botão `?`.
- **BEAT DEMO (SINTÉTICO)**: beat interno em 135 BPM, sem depender de arquivo.

Regra de ouro dos visuais: o áudio é quem molda. Silêncio = tela parada e apagada; grave e beat empurram o relógio interno de cada módulo.

## Módulos (16)

Estúdio: Espectro (nivelamento de volume pra curva uniforme, hover com Hz/nota/dB, guias de faixa), Onda rolante (cor desliza do grave pro agudo conforme o conteúdo, cores ajustáveis), Loudness (LUFS, média da sessão e alvo), Espaço estéreo (nuvem orgânica com névoa e barra de largura), Osciloscópio (verde fósforo ou branco, até 3 camadas), Espectrograma (hover com frequência).

Arte: PSY (líquido psicodélico), Túnel, Caleidoscópio, Ferro (fluido magnético com acabamento 3D: especular, sombreamento, textura de pele), Lissajous, Fita, Traço (linha viva), Campo de fluxo (pó de partículas), ASCII (símbolos configuráveis, escreva o que quiser), Ondas em camadas.

Todos reagem ao mouse: estúdio informa, arte segue o cursor.

## Controles

- Passe o mouse num painel: `⚙` abre a **gaveta de ajustes** na lateral (nunca cobre o visual), `‹ › ˄ ˅` tamanho, `●` gravar, `⛶` tela cheia, `✕` fechar.
- Arraste o painel **pela barra do título** pra reordenar.
- `+ MÓDULO` adiciona qualquer módulo, quantas vezes quiser.
- Temas: EXO (padrão, mono estilo Form Vision), PSY, NEON, VHS. Textura de grão/VHS opcional.
- Cada módulo pode usar cor própria (gaveta → Cor → Própria).
- Layout e ajustes ficam salvos; `↺` restaura o padrão.

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
electron/main.js  janela do programa de computador
test/smoke.js     teste de fumaça
DESIGN.md         identidade visual (norte: Exo Form Vision)
docs/contexto-continuidade.md  contexto pra retomar o projeto em outro chat
assets/logo.png   logo espiral · build/icon.png ícone do app
```
