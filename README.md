# Caramujo Vision

Visualizador de áudio em tempo real pra macOS. Ele escuta o som que sai do seu computador (FL Studio, YouTube, Spotify, qualquer coisa) e desenha na tela: medidores de estúdio de um lado, arte que reage à música do outro.

Serve pra duas coisas ao mesmo tempo. Mixar e masterizar olhando espectro, LUFS e imagem estéreo. E gerar visual pra clipe, Reels e story, gravando qualquer painel em vídeo com o áudio junto.

Feito pelo rideblan / Caramujo Records.

---

## Instalar

Abra o `Caramujo Vision.dmg`, arraste o app pra pasta **Aplicativos** e abra pelo Launchpad.

Na primeira vez o macOS pede duas coisas:

1. **Permitir abrir o app.** Clique com o botão direito no ícone → **Abrir** → **Abrir**. Só na primeira vez.
2. **Permissão de gravação de tela.** É o que libera a captura do som do sistema. Autorize e abra o app de novo.

Pronto. Não precisa de driver, nem de configuração de áudio, nem de terminal.

---

## Como usar

Toque um som qualquer no computador. Os visuais reagem na hora.

- **Menu**: leve o mouse ao topo da tela. Aparece a aba **☰ MENU**; clique nela pra abrir a barra, clique fora pra fechar (a tecla `H` também abre).
- **Ajuda**: o **?** no canto superior direito tem o resumo de uso, o estado do áudio, a troca de entrada e o contato.
- **Começar rápido**: no menu, abra **TEMPLATES** e escolha um pronto. É o caminho mais fácil.
- **Ajustar um visual**: passe o mouse no painel e clique no **⚙**. Os controles abrem numa faixa embaixo, sem cobrir nada.
- **Mudar o tamanho**: arraste as bordas do painel. Só a borda que você puxa se move; o vizinho cede o espaço.
- **Trocar de lugar**: arraste o painel pela alça **⠿**.
- **Mover a janela**: arraste pela alça **✥**.

## O menu

| Comando | O que faz |
| --- | --- |
| **TEMPLATES** | Combinações prontas de visuais, cores e formato. `⭑` salva a sua, `🗑` apaga. |
| **POSIÇÃO** | Onde a janela fica e como os visuais se arrumam: tela normal, ou grudada no topo, rodapé, esquerda ou direita da tela. |
| **TEMA** | 14 temas. Cada um muda fundo, texto, grade e cor dos traços: PRETO, PAPEL e GELO (claros), ARDÓSIA, NEON, VHS, OCEANO e mais. |
| **+ VISUAL** | Adiciona mais um módulo à tela. |
| **📌** | Mantém o app na frente das outras janelas. |
| **⛶** | Tela cheia. |

## Templates prontos

Escolher um template ajusta tudo junto: visuais, tema e até onde a janela fica.

**Estúdio** — `01 mixagem` (preto, leitura seca), `02 master` (papel, LUFS grande), `03 grave` (ardósia, foco no sub), `11 válvula` (âmbar).

**Visual e clipe** — `04 clipe vertical` (proporção de Reels), `05 show` (neon), `06 ambiente` (floresta), `08 rua` (VHS), `09 submerso` (oceano), `10 brasa` (rubi), `12 neve` (gelo), `13 deserto` (areia), `14 sonho` (lavanda).

**Misto** — `07 produção` (poente, metade e metade).

**Encaixados na tela** — `15 régua no rodapé`, `16 faixa no topo`, `17 coluna à direita`, `18 torre à esquerda`.

**Do zero** — `19 tela limpa`.

O `⭑` salva a sua montagem com um nome e ela entra na lista.

## Os visuais

**Estúdio (6).** Espectro (grade de Hz, leitura de dB/nota no hover), Onda rolante, Loudness (LUFS), Espaço estéreo, Osciloscópio, Espectrograma.

**Arte (10).** PSY (líquido psicodélico), Aurora, Campo de fluxo, Enxame, Fita, Traço, Ondas em camadas, Lissajous, Cordas, Malha.

Todos seguem a mesma regra: o áudio é quem manda. No silêncio a tela para e apaga.

## Gravar vídeo

O botão **●** na barra do painel grava aquele visual em `.webm`, com o áudio junto. Ajuste o painel na proporção que você quer (vertical pra Reels, quadrado pra feed) antes de gravar.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `H` | Abre e fecha o menu |
| `⌘Q` | Fecha o programa |

---

## Rodar a partir do código

Precisa do [Node.js](https://nodejs.org).

```
npm install
npm start
```

Empacotar o instalador:

```
npm run dist
```

Sai um `.dmg` na pasta `dist/`, pronto pra distribuir.

### Captura em estéreo

O app capta em estéreo por um módulo nativo. Se ele não estiver disponível, cai sozinho num modo mono e continua funcionando. Pra instalar o módulo a partir do código:

```
xcode-select --install
brew install cmake
npm install -g cmake-js
npm run audio-nativo
npm run audio-nativo-check
```

O status no canto inferior esquerdo mostra **ESTÉREO NATIVO** quando está ativo.

### Testes

```
npm test
```

## Estrutura

```
index.html            página única
css/style.css         interface
js/audio.js           captura e análise de áudio
js/modules.js         os 16 visuais
js/app.js             grade, ajustes, temas, templates, gravação
electron/main.js      janela e captura nativa
DESIGN.md             identidade visual
```
