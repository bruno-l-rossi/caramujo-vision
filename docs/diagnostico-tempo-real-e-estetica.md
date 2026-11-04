# Caramujo Vision: diagnóstico de tempo real, desempenho e estética

Rodei o app medindo cada parte. O smoke test passa inteiro (57 checagens). O que segue vem de 3 bancadas de medição que escrevi pra este diagnóstico, não de estimativa.

Resumo em uma frase: o app está sobrando de folga e pagando por ela em qualidade de imagem.

---

## 1. A medição que muda a conversa

Com os 16 visuais abertos, num painel de 720x420 em tela Retina:

| O que | Quanto | Fatia do quadro (60fps) |
| --- | --- | --- |
| Todo o cálculo dos 16 visuais | 596 µs | 3,6% |
| Motor de áudio (nível, LUFS, beat, espectro) | 69 µs | 0,4% |
| Espectro de alta resolução (4096) | 81 µs | 0,5% |
| Pixels desenhados na tela toda | 4,0 Mpx | 0,24 Gpx/s |

Um Mac com chip da série M desenha entre 50 e 100 Gpx por segundo. O app usa 0,24. Ele está a 0,3% do que a máquina aguenta de pintura.

**E mesmo assim os visuais de arte renderizam em resolução reduzida.** O PSY e o Aurora desenham a 50% da resolução da tela e o sistema estica 2x. Os outros visuais de arte desenham a 63% e esticam 1,6x. É por isso que a arte parece macia demais perto dos medidores: ela literalmente tem metade dos pixels.

Levar tudo pra resolução nativa custa 2x mais pixel. Sai de 0,24 para 0,47 Gpx/s. Continua sendo 0,5% do que a placa entrega.

**Esse é o achado principal: o corte de resolução que deixa a arte borrada não está comprando desempenho nenhum.**

---

## 2. Então onde vai o tempo do quadro?

Em duas coisas que não aparecem em nenhum medidor:

### 2.1. Um milhão de chamadas de desenho por segundo

Contei as chamadas de canvas por quadro, uma a uma:

| Visual | Chamadas por quadro |
| --- | --- |
| Enxame | 6.786 |
| Osciloscópio | 2.893 |
| Espectro | 2.222 |
| Ondas em camadas | 1.373 |
| Cordas | 1.261 |
| Lissajous | 712 |
| Espaço estéreo | 551 |
| Campo de fluxo | 537 |
| **Total dos 16** | **17.423** |

17.423 por quadro dá 1,05 milhão por segundo. Cada uma dessas atravessa a fronteira entre o JavaScript e o motor gráfico do navegador, e essa travessia custa em torno de 80 nanossegundos. São 1,4 ms por quadro só em pedágio, 8% do orçamento, antes de qualquer pixel ser pintado.

O código já foi trabalhado nisso (dá pra ver os comentários das rodadas anteriores agrupando traços em lotes). O que sobrou é geometria pura: o Enxame testa 4.005 pares de pontos por quadro e desenha 3.337 fios. Se o Bruno subir o controle "Tamanho do bando" pro máximo, vira 16.110 pares e 32.220 chamadas. Um controle no menu que multiplica o custo por 4.

### 2.2. Dezesseis telas separadas, mais três camadas de desfoque

Cada visual é uma tela própria. São 16 superfícies independentes que o macOS precisa juntar em cada quadro. Além delas, três elementos da interface (a barra do topo, a aba ☰ MENU e os botões de janela) usam desfoque de fundo. Desfoque de fundo obriga o sistema a ler tudo que está atrás e borrar, e o que está atrás são 16 telas que mudam 60 vezes por segundo. Os três ficam com opacidade zero quando escondidos, o que não garante que o desfoque pare de ser calculado.

---

## 3. O delay: o número do HUD está incompleto

O HUD (tecla F) mostra 11 ms. Esse número é honesto no que ele mede, e ele para cedo demais.

A cadeia inteira, do alto-falante até o olho:

| Etapa | Está no HUD? | Quanto |
| --- | --- | --- |
| Buffer da captura do sistema | parcialmente | depende do módulo nativo |
| Travessia entre os dois processos do app | sim | conta no `age` |
| Análise (nível, FFT, beat) | sim | ~1 ms |
| **Desenho até o pixel acender na tela** | **não** | **2 quadros, ~33 ms a 60Hz** |

O caminho normal pra cortar esses 2 quadros é o modo de baixa latência do canvas. Conferi: [ele não funciona no macOS](https://developer.chrome.com/blog/desynchronized). A implementação de buffer único do Chromium ainda não roda em Mac.

Então o delay real hoje é algo em torno de 45 ms, não 11 ms.

**O que resolve de verdade no Mac:**

1. **Rodar a 120Hz.** Se a tela é ProMotion, destravar o limite de quadros corta a espera de composição de 33 ms pra 16 ms. É a maior economia disponível e ela vem de uma configuração de janela, não de reescrever visual nenhum.
2. **Tirar a travessia de processos do áudio.** Hoje cada bloco de som sai do módulo nativo, é copiado, atravessa pro lado da tela e é copiado de novo. Trocar isso por memória compartilhada (o app já usa essa técnica no outro caminho de áudio) tira as cópias e o solavanco.
3. **Mostrar o número certo no HUD**, incluindo o tamanho do bloco de captura e a estimativa de composição. Sem isso não dá pra saber se um ajuste funcionou.

---

## 4. Três defeitos que achei rodando

### 4.1. Dois espectros com FFT diferente custam 5x mais

O cache do espectro é por tamanho de janela, não por painel. Dois painéis de Espectro com tamanhos diferentes (4096 e 8192, por exemplo) fazem o app reconstruir as tabelas de FFT em todo quadro.

| Situação | Custo por quadro |
| --- | --- |
| 2 espectros, mesmo tamanho | 77 µs |
| 2 espectros, tamanhos diferentes | 378 µs |

Conserto: guardar o cache por tamanho num mapa, em vez de uma posição só.

### 4.2. O clipe gravado sai com o visual atrasado

O `●` grava o canvas junto com o áudio ao vivo. O canvas naquele instante mostra o som de 45 ms atrás; a faixa de áudio é a de agora. O clipe exportado nasce com o flash chegando depois do kick.

Conserto: atrasar a faixa de áudio da gravação pelo mesmo tanto da latência medida. O motor já calcula esse número.

### 4.3. O formato de saída não abre no Final Cut

A gravação sai em `.webm` com VP9. O Final Cut Pro não importa `.webm`. Toda gravação exige uma conversão antes de entrar no projeto.

O Chromium do Electron 33 aceita gravar em MP4 com H.264. Vale testar `video/mp4;codecs=avc1.42E01E,mp4a.40.2` e usar quando disponível.

E tem um segundo problema junto: a gravação pega os pixels do canvas, que estão em resolução reduzida. Um painel de 720x1280 grava a 900x1600 na arte e 720x1280 no shader. Reels pede 1080x1920. Nunca sai na medida.

---

## 5. A estética de clipe

O DESIGN.md cortou todo o brilho com uma justificativa correta: o desfoque por traço era refeito centenas de vezes por quadro e derrubava o app. A Fita fazia 345 desfoques por quadro.

Só que a linguagem de clipe moderno é construída em cima de pós-produção. Bloom, grão de filme, aberração cromática, pontilhado contra banda, curva de cor cinematográfica, borrão de movimento. Sem nada disso o visual lê como demo técnica, mesmo bem desenhado.

A diferença está em onde a conta é feita. Desfoque por traço é 345 operações caras no processador. **Uma passada de pós-produção na tela inteira é uma operação só, na placa de vídeo.**

Medi o custo dessa passada:

| Etapa da pós | Pixels por quadro |
| --- | --- |
| Bloom em 1/4 de escala, 3 passes | 0,97 Mpx |
| Composição final (grão, aberração, curva, pontilhado) | 5,2 Mpx |
| **Total** | **6,2 Mpx** |

Dá 0,37 Gpx/s. Somado ao que o app já pinta, fica em 0,6 Gpx/s. Ainda é menos de 1% do que a máquina entrega.

O que entra nessa passada, em ordem de impacto visual:

1. **Pontilhado contra banda.** Os fundos são quase pretos (`#050506`) e todo degradê escuro racha em faixas visíveis. É o defeito mais óbvio nos shaders psicodélicos e some com 4 linhas de código.
2. **Bloom com limiar.** Só o que passa de um certo brilho acende. Devolve o glow que foi cortado, sem o custo que fez cortarem.
3. **Curva de cor cinematográfica.** Faz cor saturada parar de estourar chapado e ganhar a rolagem de highlight que filme tem.
4. **Grão animado.** Amarra as camadas numa imagem só. É o que separa "gravação de tela" de "peça".
5. **Aberração cromática radial.** Desloca vermelho e azul nas bordas. Sutil, e é a assinatura visual de metade dos clipes de rap dos últimos 5 anos.
6. **Borrão de movimento.** Hoje, quando o computador aperta, a arte cai pra 30 quadros por segundo sem borrão nenhum, o que lê como travada. Com acúmulo temporal, 30 vira escolha estética em vez de defeito.

Cada um desses ganha um controle de intensidade por visual, então o `01 mixagem` continua seco e o `04 clipe vertical` fica cheio.

---

## 6. O plano, em três etapas

### Etapa 1: consertar o que está torto (baixo risco)

- Cache do espectro por tamanho, mata os 378 µs.
- Áudio da gravação atrasado pra bater com o visual.
- Gravação em MP4 quando o sistema aceitar.
- Os três desfoques de fundo da interface desligados de verdade quando escondidos.
- HUD mostrando a latência completa, com bloco de captura e composição.
- Teto do Enxame limitado, ou troca do teste de todos contra todos por uma grade de vizinhança.

### Etapa 2: devolver a resolução (o que mais muda a imagem)

- Arte em canvas sobe pra resolução nativa da tela.
- Shaders sobem pra 1,5x ou 2x.
- A qualidade adaptativa passa a cortar resolução antes de pular quadro, porque quadro pulado sem borrão lê pior que resolução menor.
- Modo de gravação com tamanho fixo (1080x1920 pra Reels, 1080x1080 pra feed, 1920x1080 pra YouTube) desenhando fora da tela no tamanho exato.

### Etapa 3: a passada de pós-produção

- Uma camada só por cima de tudo, na placa de vídeo, com os 6 efeitos acima.
- Controle de intensidade por visual e por template.
- Os templates de clipe (`04`, `05`, `08`, `10`) ganham preset de pós; os de estúdio (`01`, `02`, `03`, `11`) ficam limpos.

### Sobre o delay

Entra em paralelo com a etapa 1: 120Hz, memória compartilhada no áudio, HUD honesto. Não depende das outras etapas.

---

## 7. Etapa 1: aplicada e medida

Feito em 3 de agosto. O smoke test passa com 65 checagens (8 novas guardam esta rodada).

| O que mudou | Antes | Depois |
| --- | --- | --- |
| 2 espectros com FFT diferente | 378 µs | 233 µs, com 11 µs de sobra contra o piso teórico |
| Enxame no "Tamanho do bando" máximo | 631 µs, 13.379 fios | 160 µs, 3.500 fios |
| Formato da gravação | `.webm` VP9 | MP4 com H.264, com queda pro webm |
| Sincronia do clipe | visual atrasado em relação ao áudio | áudio da gravação atrasado pelo mesmo tanto |
| HUD | `SOM→TELA 11 MS` | `SOM→OLHO X MS (análise A + tela B) · BLOCO C MS` |
| Limite de quadros | 60 | destravado (120Hz em tela ProMotion) |
| Desfoques da interface | opacidade 0, calculando | escondidos de verdade |

Detalhe de cada um:

**Espectro.** O cache agora guarda uma caixa por tamanho de janela. Cada FFT nasce uma vez na vida. O que sobra (233 µs) é o custo honesto de rodar duas FFTs de tamanhos diferentes, com 11 µs de resíduo contra 150 µs de desperdício antes.

**Enxame.** O alcance do fio se ajusta sozinho pra manter a conta perto de 3.500 fios, que é a densidade do padrão. Ele encolhe quando o bando aperta em volta do alvo e volta quando espalha, num movimento de 0,3s que não pisca. O bando cheio deixa de virar borrão branco e continua constelação.

**Sincronia do clipe.** O áudio da gravação passa por um atraso do tamanho de (análise + tela). O status mostra o número na hora que você aperta o `●`. O monitor e a análise continuam sem atraso nenhum.

**120Hz.** A sincronia com a tela continua ligada, o que sai é o teto de 60. Sem rasgo de imagem. Aperta `F` e confere: se aparecer perto de 120 FPS e o "tela" cair de 33 pra 16, funcionou.

**Ainda de fora da etapa 1.** A memória compartilhada pro áudio nativo (tirar as cópias entre os dois processos do app) ficou pra depois, porque é a mudança de maior risco e o 120Hz entrega mais.

---

## 8. O que eu deixaria como está

- O motor de áudio. LUFS pela norma, beat a cada 2,7 ms, FFT própria. Está certo e está barato (0,4% do quadro).
- A arquitetura de grade, templates e temas. Funciona e o custo é de layout, não de quadro.
- O agrupamento em lotes que as rodadas anteriores fizeram. Foi trabalho bem feito e é o que segura os 596 µs.

---

## Anexo: como reproduzir as medições

As 3 bancadas ficaram em `test/` e rodam sem abrir o app. Da pasta do projeto:

```
node test/bench.js            # custo por visual + chamadas de canvas
node test/bench2.js           # gargalos do motor + armadilha do espectro
node test/bench3.js           # orçamento de pixel e de camadas
```

A primeira aceita tamanho de painel e densidade de tela: `node test/bench.js . 720 420 2`.
