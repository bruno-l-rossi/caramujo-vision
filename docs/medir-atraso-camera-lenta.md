# Medir o atraso som → olho de verdade (câmera lenta)

Serve pra trocar um chute por número: o `PRESENT_FRAMES = 2` (app.js) assume 2 quadros de fila entre o desenho e o pixel acender. Hoje o HUD diz "som → olho 26 ms (análise 9,3 + tela 17)" e os 17 ms da tela são essa suposição. Gravação de tela não serve: ela não enxerga a fila de composição. Só uma câmera filmando a tela e a caixa.

## O que preparar

- iPhone em câmera lenta 240 qps (Câmera › Lenta). Se só tiver 120 qps, funciona, com erro de ±8 ms.
- O Mac tocando pela caixa embutida ou por uma caixa com cabo (não Bluetooth: ele atrasa o som e estraga a medida).
- O Caramujo com o preset Barra, captura **Tap** (ou a que a Automática escolheu), Fluidez **Suave**, Reação rápida ligada.
- Volume alto o bastante pra aparecer a onda do clique no vídeo (o iPhone grava o áudio junto).

## Como medir

1. Abra o HUD (`F`) e deixe no canto. Anote o "som → olho" que ele mostra.
2. Posicione o iPhone de modo que enquadre **a tela do Caramujo e a caixa de som** ao mesmo tempo, parado num apoio.
3. Comece a gravar em câmera lenta.
4. No Terminal: `afplay ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision/medicao/sinal-de-teste.wav`
5. O clique de 5 ms acontece em **2,0 s** do arquivo. Repita 3 vezes (3 cliques por vídeo se der, ou 3 vídeos).

## Como ler

1. No app do iPhone (Fotos › Editar) ou no QuickTime, ande quadro a quadro.
2. Ache o quadro em que a **onda do clique aparece no áudio** (pico na forma de onda da faixa de áudio do vídeo). Esse é o instante T_som.
3. Ache o primeiro quadro em que o **espectro ou a onda do Caramujo reage ao clique**. Esse é T_olho.
4. Atraso = (T_olho − T_som) em ms. Com 240 qps cada quadro vale 4,2 ms.
5. Tire a média dos 3 cliques.

## O que fazer com o número

O áudio que o iPhone ouve já saiu da caixa, então a medida inclui o atraso da própria caixa (embutida: uns 10 a 20 ms). O que importa é a diferença entre o número filmado e o do HUD:

- Filmado ≈ HUD + 10 a 20 ms: a suposição de 2 quadros está boa. Nada a mudar.
- Filmado bem **acima** disso: a fila é maior que 2 quadros. Suba `PRESENT_FRAMES` e a gravação de vídeo (`setRecordDelayMs`) passa a compensar certo.
- Filmado **abaixo**: a fila é menor. Baixe `PRESENT_FRAMES` pra 1.

Cole os 3 valores (e o HUD da hora, com `C`) numa conversa que eu ajusto o `PRESENT_FRAMES` com número.
