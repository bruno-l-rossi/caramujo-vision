# Caramujo Vision

Medidor de áudio em tempo real pra macOS, no molde do MiniMeters. Abre como uma barra de medidores colada no rodapé da tela e já mede o que sai do computador: FL Studio, YouTube, Spotify, qualquer coisa.

E faz o que o MiniMeters não faz: arte que reage à música e gravação de qualquer visual em MP4 com o áudio junto, pronto pra Reels e YouTube.

Feito pelo rideblan / Caramujo Records.

---

## Instalar

Abra o `Caramujo Vision.dmg`, arraste o app pra pasta **Aplicativos** e abra pelo Launchpad.

Na primeira vez o macOS pede duas coisas:

1. **Permitir abrir o app.** Botão direito no ícone, **Abrir**, **Abrir**. Só na primeira vez.
2. **Permissão de gravação de tela.** É o que libera a captura do som do sistema. Autorize e abra o app de novo.

Não precisa de driver nem de terminal.

## Primeiro uso

Toque um som. A barra reage na hora.

Passe o mouse pela janela e a barra de ferramentas aparece no canto de cima, à esquerda. Tire o mouse e ela some. Quando você está no FL Studio, ela não existe.

Tudo que dá pra mudar mora em dois lugares:

- **Barra de ferramentas**: o que se troca toda hora (preset, tema, posição, pausa).
- **Ajustes** (tecla `S`): o resto, em seis abas.

O app reabre exatamente como você fechou.

## A barra de ferramentas

| Botão | O que faz |
| --- | --- |
| Caramujo | Arraste pra mover a janela |
| **Barra** ▾ | O preset: troca os visuais de uma vez. Salva os seus, desfaz alteração |
| ◐ | Tema (a tecla `T` passa pro próximo) |
| ▭ | Posição: janela livre, barra no topo, barra no rodapé, coluna à esquerda ou à direita |
| Alfinete | Sempre na frente das outras janelas |
| ‖ | Pausa e congela a tela (`P`) |
| Ajustes | Abre a folha de ajustes (`S`) |
| ⋯ | Adicionar visual, tela cheia, desempenho, último vídeo no Finder, atalhos |
| – × | Minimizar e fechar |

Um pontinho do lado do nome do preset quer dizer que você mexeu nele. O menu do preset oferece salvar as alterações ou desfazer.

## Mexendo nos visuais

Passe o mouse num visual: aparece o nome dele e quatro botões no canto de baixo, à direita.

- **⋮⋮** arraste pra trocar de lugar. Soltou do lado de outro visual, encaixa na mesma linha. Soltou na faixa de cima ou de baixo, abre uma linha nova.
- **Ajustes** abre a folha direto nos controles daquele visual.
- **●** grava vídeo daquele visual.
- **×** tira da tela.

O **botão direito** em qualquer visual abre o mesmo menu, com mais duas opções: trocar por outro visual no mesmo lugar e adicionar um ao lado.

**Tamanho:** a divisória entre dois visuais acende quando o mouse chega perto. Arraste e só os dois vizinhos mudam; o resto da tela fica parado. Duplo clique na divisória iguala os tamanhos.

## Presets

O preset guarda quais visuais estão na tela e o tamanho de cada um. Tema e posição ficam de fora, então trocar de preset não desmancha a cara que você escolheu.

| Grupo | Presets |
| --- | --- |
| Medição | **Barra** (o padrão: Onda, Espectro, Loudness, Estéreo e Osciloscópio), Quad, Mixagem, Master, Analógico |
| Arte | Clipe, Show, Ambiente |
| Misto | Produção |

Na barra encaixada as linhas do preset viram uma fileira só; na coluna lateral, uma pilha só. Cada forma guarda o próprio tamanho: arrumar a barra não bagunça a janela livre.

**Salvar como novo preset** no menu guarda a sua montagem com um nome. Ela aparece em **Meus presets**.

## Os visuais

**Medidores (7).** Os mesmos sete do MiniMeters.

| Visual | O que mostra |
| --- | --- |
| Onda | A forma de onda passando em três bandas (grave, médio e agudo), um canal em cada faixa |
| Espectro | Frequências em tempo real, duas curvas (esquerda e direita). O preenchimento acende onde toca forte. Com o mouse em cima, lê dB, Hz e nota |
| Loudness | LUFS pela ITU-R BS.1770: CURTO (3 segundos) e MÉDIO (desde que o som começou). O número grande é o médio |
| Estéreo | A nuvem de largura e balanço da mixagem, em ponto redondo |
| Osciloscópio | A onda parada no tom, em curva lisa, com a nota |
| Espectrograma | O histórico das frequências |
| VU | Ponteiro analógico com balística de 300 ms. **Novo na v2** |

O VU nasce calibrado com 0 VU em -8 dBFS, que é onde um beat masterizado dança em volta do 0. Pra mixar, troque pra -18 nos ajustes dele.

**Arte (10).** PSY, Lissajous, Traço, Fluxo, Camadas, Fita, Enxame, Aurora, Cordas, Malha. Todos seguem a mesma regra: o áudio é quem manda, e no silêncio a tela para e apaga. O grave comanda o tamanho: no kick cada um cresce até quase o painel inteiro.

## Reação ao som

Em **Ajustes › Visuais**, no topo: **Leve**, **Média**, **Forte** ou **Máxima**. É quanto a música, principalmente o grave, mexe em todos os visuais. Nasce em **Forte**.

- Cada visual de arte tem a sua **Reação** nos ajustes dele, pra ajuste fino (100% = o que vale pra tela inteira).
- Onda, Osciloscópio e Estéreo têm **Tamanho**: **Encher** (o padrão: a forma enche o painel em qualquer volume) ou **Nível real** (o ganho fixo, pra ler a folga da mixagem).
- Espectro, Loudness, VU e Espectrograma ficam fora da Reação e continuam batendo com o MiniMeters.

O grave se ajusta sozinho ao volume do que está tocando. Um master a -8 LUFS e um YouTube baixinho fazem o mesmo desenho.

## Temas

Dez temas, do mais escuro pro mais claro: **MiniMeters**, Preto, Fósforo, Planta, Ardósia, Chumbo, Tijolo, Areia, Gelo, Papel.

Cada tema traz uma cor desenhada pra cada medidor, além do fundo, do texto e da grade. Barra de ferramentas, menus e ajustes saem das mesmas cores: trocar de tema é trocar de aparelho.

No tema MiniMeters a onda e o estéreo saem por banda (grave vermelho, médio verde, agudo azul), como no app dele. Nos outros, saem na cor do tema: a onda vira três tons da mesma cor. Dá pra trocar em cada visual.

## Gravar vídeo

Passe o mouse num visual e clique no **●**. Clique de novo pra parar. O vídeo sai em MP4 com o áudio junto, já sincronizado, e vai direto pra pasta **Downloads**.

Em **Ajustes › Gravação** você escolhe a medida antes de gravar:

| Escolha | Sai em | Pra que |
| --- | --- | --- |
| Tamanho do painel | o tamanho que o visual tem na tela | rascunho |
| 9:16 Reels | 1080x1920 | Reels, Stories, Shorts |
| 1:1 Feed | 1080x1080 | feed |
| 16:9 YouTube | 1920x1080 | YouTube |

Com medida fixa o visual é redesenhado fora da tela no tamanho exato. Sai pronto, sem reenquadrar no Final Cut.

**Dica de clipe:** solte um arquivo de áudio na janela. Ele toca, os visuais reagem, e você grava o clipe da faixa pronta.

## Acabamento de filme

Em **Ajustes › Aparência** tem a passada de luz de cinema por cima de tudo: halação, grão e vinheta. **Régua** é o acabamento discreto pros medidores; **Prata** e **Vidro** são pra clipe e show.

Nasce desligado. Ele custa placa de vídeo o tempo todo, e medidor não precisa de luz de cinema. Os medidores nunca recebem borrão nem aberração cromática, em nenhuma das três direções.

## Atalhos

| Tecla | Ação |
| --- | --- |
| `S` | Abre e fecha os ajustes |
| `P` | Pausa e continua |
| `T` | Passa pro próximo tema |
| `H` | Barra de ferramentas sempre visível |
| `F` | Mostra fps e o atraso do som até a tela |
| `Esc` | Fecha o que estiver aberto |
| `⌘Q` | Fecha o programa |

## Desempenho

O app abre com 5 medidores (a v1 abria com 16 visuais) e com o acabamento de filme desligado. Isso sozinho tira a maior parte do trabalho da placa de vídeo.

Quando o som para, os medidores apagam em 2 segundos e o app **para de desenhar** até o som voltar. É o caso mais comum: o FL Studio parado com o Caramujo aberto do lado. O motor de áudio continua ouvindo pra acordar no primeiro kick.

Em **Ajustes › Janela** dá pra limitar os quadros por segundo: **Da tela** acompanha o monitor (120 numa tela ProMotion, 60 numa comum); **30** economiza bateria e deixa a máquina livre pro FL Studio.

Aperte `F` pra ver os quadros por segundo e quanto tempo o som leva pra chegar na tela.

## v2.3: medidores no molde do MiniMeters

- O espectro foi medido contra o MiniMeters num vídeo, quadro a quadro, com um sinal de teste. Eixo, escala de dB, subida e queda batem com os dele.
- Duas curvas, como as dele: Mid vermelha e Side azul. O controle **Curvas** troca pra Só Mid ou pra L e R.
- Barras de cor por baixo da linha. Acendem com o som de agora e apagam antes da linha descer.
- A leitura fica parada no pico, no formato dele (dB, Hz, nota e cents). Com o mouse em cima, segue o mouse.
- A onda pinta cada coluna com a cor das três bandas, como a multibanda do MiniMeters, e nasce com um canal só.
- O estéreo virou goniômetro: um canal sozinho sai inclinado a 45°. No tema MiniMeters o raio é em dB e não fica rastro, como no dele.
- No tema MiniMeters o loudness fica igual ao dele: pico de L e R em barras finas, o curto numa barra larga e o número do curto na etiqueta azul. O número bate com o dele na casa decimal. O médio continua nos outros temas.
- No tema MiniMeters o osciloscópio é a linha verde dele, numa janela fixa de 43 ms.
- Saiu o **Brilho na batida** do espectro (o MiniMeters não tem).

## v2.2: reação ao som

- O grave voltou a mandar. O sinal que a arte usava vivia no talo (no beat demo a mediana era 0,997 de 1), então o kick não tinha pra onde subir. Agora ele encosta no 1 no kick e desce no vale.
- Os visuais crescem até quase o painel inteiro no kick e voltam no vale. Numa barra larga, Lissajous, Fita e Estéreo usam a largura toda (o Lissajous ocupava 6% da barra de 1440x170).
- **Reação ao som** nos ajustes, nascendo em Forte, e **Tamanho** (Encher ou Nível real) na Onda, no Osciloscópio e no Estéreo.
- O PSY escurece no vale e explode no kick (antes acendia igual o tempo todo).
- Camadas e Fita respiram inteiras: a pilha estica no kick e a fita abre com o rastro junto. Na primeira versão da 2.2 as duas ficavam do mesmo tamanho no kick e no vale.
- Consertado: a Malha perdia pedaços. O relevo caía fora das três faixas de profundidade e a linha sumia.

## v2.1: medidores lisos

- Espectro e osciloscópio desenhados em curva. Os sete medidores juntos fazem um quarto das chamadas de desenho da v2.0 (3.162 contra 12.934 por quadro), e a barra roda a 60 quadros por segundo no teste, contra 55 a 58 da v2.0.
- O preenchimento do espectro ficou leve: acende onde a frequência toca forte e some em direção ao rodapé. O brilho na batida continua e pode ser desligado nos ajustes do Espectro.
- A onda virou três bandas em camadas, como a onda multibanda do MiniMeters, e rola lisa, sem tranco.
- O número do loudness perdeu a caixa de cor.
- O estéreo ganhou ponto redondo e mais pontos em painel grande.
- O osciloscópio para de pular pra nota aguda quando entra chimbal.

## Da v1 pra v2

- A interface foi refeita no molde do MiniMeters: uma barra de ferramentas pequena que some sozinha e os ajustes num lugar só, em abas.
- O layout virou linhas de visuais. Nenhuma tela fica com buraco ou com um visual por cima do outro.
- **A sua tela da v1 virou o preset "Minha tela antiga"**, a um clique no menu de presets. Templates que você salvou com nome próprio também viraram presets.
- Os 13 temas viraram 10, cada um com cor desenhada por medidor. Quem estava em Carvão, Musgo ou Jornal cai no vizinho mais próximo.
- Templates, Color Map global e o ajuste de fundo (◐) saíram da interface. A cor por visual continua nos ajustes de cada um.
- Entrou o VU, o sétimo medidor do MiniMeters.
- Gravação salva direto em Downloads, sem janela de "Salvar como".
- Consertado: no caminho de áudio sem o módulo nativo, a tela podia ficar preta mesmo com som chegando.

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

Sai um `.dmg` na pasta `dist/`.

### Captura em estéreo

O app capta em estéreo por um módulo nativo. Sem ele, cai sozinho num modo mono e continua funcionando. Pra instalar o módulo a partir do código:

```
xcode-select --install
brew install cmake
npm install -g cmake-js
npm run audio-nativo
npm run audio-nativo-check
```

Em **Ajustes › Áudio** o estado mostra **Estéreo nativo** quando ele está ativo.

### Testes

```
npm test
```

Roda 161 checagens em poucos segundos: motor de áudio, a reação ao grave (um beat sintético em dois volumes), o espectro e os medidores contra as medidas do MiniMeters, os 17 visuais em todos os temas e tamanhos, layout, presets, migração da v1, o processo da janela e as guardas de decisão. Se der `SMOKE PASSOU`, nada quebrou.

## Estrutura

```
index.html            página única
css/style.css         interface
js/audio.js           captura e análise de áudio
js/modules.js         os 17 visuais e os temas
js/fx.js              acabamento de filme (uma passada na placa de vídeo)
js/app.js             layout, barra de ferramentas, ajustes, presets, gravação
electron/main.js      janela, encaixe na borda e captura nativa
test/smoke.js         o npm test
DESIGN.md             identidade visual
```
