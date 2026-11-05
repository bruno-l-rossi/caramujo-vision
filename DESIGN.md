# DESIGN.md · Caramujo Vision

Medidor de áudio do rideblan. Norte da v2 (novembro de 2026): **a experiência do MiniMeters**. Abre e já mede, numa barra colada na borda da tela; a interface aparece quando o mouse chega e some quando ele sai. Por cima disso, o que o MiniMeters não tem: arte que reage à música, na linha do Exo Audio Form Vision, e gravação de clipe.

## Princípios

1. O visual é a tela inteira. A interface é uma barra de ferramentas pequena num canto e uma pílula no canto de cada visual, as duas só no hover.
2. Tudo que muda mora em dois lugares: a barra de ferramentas (o que se troca toda hora) e a folha de Ajustes (o resto). Nada de menu de três passos.
3. Todo pixel reage ao som. Nada de animação solta que ignora o áudio. Grave empurra forma, agudo acende brilho.
4. Resiliente a qualquer proporção. Barra de 100px, coluna de 300px, tela cheia: o visual se adapta sem quebrar.
5. Sem cara de IA padrão. Cor com intenção, referência analógica (osciloscópio, VU, espectro de rack), traço seco de instrumento.

## Interface (v2)

- **Barra de ferramentas** no canto de cima à esquerda, como a do MiniMeters: logo (alça de arrastar a janela), preset, tema, posição, sempre na frente, pausa, ajustes, mais, minimizar e fechar. Ícones de traço fino em SVG na cor do tema, nada de emoji. Aparece quando o mouse mexe dentro da janela e some 1,8s depois; `H` deixa fixa.
- **Só a alça do logo arrasta a janela.** `-webkit-app-region: drag` na barra inteira engole clique e quebra os menus (já aconteceu na v1). O smoke test cobra.
- **Pílula do visual** no canto de baixo à direita: nome, ⋮⋮ (arrastar), ajustes, ● (gravar), ×. Embaixo de propósito: o canto de cima à esquerda é da barra de ferramentas, então os dois nunca brigam.
- **Botão direito** no visual: ajustes, gravar, trocar por outro, adicionar ao lado, remover.
- **Ajustes** numa folha com seis abas: Visuais, Aparência, Janela, Áudio, Gravação, Atalhos. Controle é botão de opção (um clique) ou deslizador; nunca rótulo cortado. Na barra encaixada a janela cresce pra folha caber; no rodapé ela abre **por cima** da barra, então os medidores não saem do lugar na tela.
- **Menus** que não cabem na janela baixa viram colunas. Nada de último item fora da tela numa barra de 170px.
- **Fonte**: a do sistema (SF Pro) na interface, em caixa normal; SF Mono só em número de instrumento.
- **Avisos** curtos no rodapé (toast) e um aviso discreto no meio da tela quando não chega áudio nenhum.
- **Sem divisória entre os visuais** (decisão do Bruno): a tela lê como uma peça só. A divisória só existe pro mouse: acende quando ele chega perto.

## Layout em linhas

O layout é uma lista de linhas, cada linha uma lista de visuais com peso. Toda tela fica preenchida, sem buraco e sem sobreposição, por construção. Saiu a grade de 240 colunas com encaixe (skyline), que pedia foto, barreira e rede de segurança pra não sobrepor.

- **Janela livre:** as linhas como estão.
- **Barra no topo ou no rodapé:** as linhas viram uma fileira só, na ordem.
- **Coluna lateral:** viram uma pilha só.
- Cada forma guarda o próprio peso (`w` na janela livre, `bw` na barra, `ch` na coluna). Arrumar a barra não bagunça a janela livre.
- **Divisória:** só os dois vizinhos trocam espaço; a soma dos pesos dos dois não muda. Duplo clique iguala.
- **Arrastar pela alça:** solto do lado encaixa na linha; solto na faixa de cima ou de baixo (24% da altura) abre linha nova.

## Temas: dez aparelhos

Trocar de tema tem que dar a sensação de trocar de aparelho. Cada tema muda o fundo, a grade, a espessura do traço, a paleta da arte e, na v2, **a cor de cada medidor**: o tema diz "o espectro é este creme, o loudness é aquele, o VU tem este vermelho". É como os temas do MiniMeters funcionam, e foi o que acabou com o osciloscópio sumindo no papel (a cor saía do topo claro do mapa de cor, branco em cima de branco).

| Tema | Fundo | Cara |
| --- | --- | --- |
| MINIMETERS | #191919 | réplica medida no vídeo dele: espectro vermelho e azul, loudness azul, osciloscópio verde, onda e estéreo por banda |
| PRETO | quase preto | tudo branco e cinza, o traço sozinho |
| FÓSFORO | preto absoluto | tubo verde, traço gordo |
| PLANTA | azul de blueprint | creme de nanquim, a grade é o desenho |
| ARDÓSIA | cinza-azulado | creme quente, estéreo âmbar |
| CHUMBO | cinza médio | branco frio |
| TIJOLO | barro claro | tinta marrom escura |
| AREIA | bege | tinta sépia, estéreo ferrugem |
| GELO | branco frio | azul petróleo, papel milimetrado |
| PAPEL | branco | tinta preta, quase sem grade |

Quatro escuros, dois médios, quatro claros. Carvão, Musgo e Jornal saíram da lista (eram vizinhos de outros); continuam no código e quem estava num deles cai no mais próximo.

**Auto por tema.** A cor padrão da onda e do estéreo é "Do tema": no MiniMeters sai por banda, como no app dele; nos outros sai na cor do tema. O Bruno prefere mais monocromático que colorido.

**Barra, menus e ajustes saem do tema também** (superfície, linha, destaque), calculados do fundo do painel em `applyThemeChrome()`.

## Color Map: a cor que muda de módulo pra módulo

O **Color Map** é um gradiente que cada módulo aplica na SUA grandeza: o espectrograma por energia, a onda (no modo Mapa) pela luz do som. 15 mapas. Na v2 o mapa é escolha por visual (o controle Cor de cada um); o mapa global saiu da interface.

Escolher um mapa no visual passa por cima da cor do tema. Sem escolha, vale a cor desenhada do tema.

**Fundo claro inverte o mapa.** Os mapas vão do escuro pro claro; no papel o sinal forte saía quase branco em cima de branco. Com o mapa do tema, no fundo claro o forte vira escuro.

## Paleta de cada tema

Quatro cores por tema, e a AMPLITUDE dentro da paleta também varia. Fósforo é uma cor só em quatro luzes, como tubo de verdade se comporta. Planta é creme e branco de nanquim: a cor mora no fundo, não no traço. Jornal tem faixa curta de luz, porque impressão barata não tem contraste. Nos temas claros as cores são escuras, senão o traço some no papel.

Cada visual pode fugir do tema escolhendo um mapa de cor no controle Cor dele.

## Textura

A camada de textura global saiu do app. O grão, a aberração e o resto do acabamento vivem agora na passada de pós-produção, logo abaixo.

## Sem brilho: a forma é que dá o impacto

Não existe halo em volta de traço nenhum. A linha nítida de 1px é o desenho inteiro, e o peso visual vem da forma, da densidade e do contraste com o fundo. Isso era um desfoque que o computador refazia em cada traço (a Fita fazia 345 por quadro), e tirá-lo deixou o app mais rápido e o desenho mais legível: no Lissajous e na Fita dá pra ver a estrutura, onde antes tinha um borrão branco.

Consequência de interface: o controle "Brilho" não existe mais em nenhum módulo.

## Pós-produção: a luz volta, agora numa passada só

**v2: nasce desligado** (Ajustes › Aparência › Acabamento). Medidor não precisa de luz de cinema, e a passada custa placa de vídeo o tempo todo: na bancada da máquina do Bruno eram 1,5 a 2,2 ms por quadro só nela. Quem quer, liga pro clipe.

O desenho de cada painel continua seco. A luz de filme entra depois, numa camada única por cima da tela inteira, na placa de vídeo. Sete estágios, nesta ordem, que não se mexe:

`acúmulo de quadros · halação · curva de cor · aberração cromática · grão · vinheta · pontilhado`

O pontilhado é o último de propósito: ele quebra a faixa que a curva de cor acabou de criar. Antes dela, a curva refaz a banda.

**Três direções, o mesmo código com números diferentes.**

| Direção | O que é | Onde vai |
| --- | --- | --- |
| RÉGUA | Acabamento que não toca em informação | Templates de medição (mixagem, master, grave, estúdio) |
| PRATA | Cópia em gelatina de prata: grão amarrado à luminância, halação em vez de bloom largo, sem aberração no medidor. **O padrão do app** | Dose cheia nos templates de arte (clipe, show, rua, teia) |
| VIDRO | Intensidade extra | Quando o clipe pede mais lente |

Regras que não mudam:

- **O preto abre, não fecha.** O piso é aplicado DEPOIS da curva. Um fundo `#050506` sai entre 5 e 8, nunca em zero: sem esse degradê o pontilhado não teria o que quebrar.
- **Medidor nunca cede, aqui também.** Aberração cromática e borrão de movimento são zero nos seis medidores, em todas as direções. Meio pixel de aberração num texto de 9px vira franja colorida e desloca a leitura de Hz.
- **Uma imagem, uma lente.** Vinheta e aberração ficam centradas na TELA, não em cada painel. É o que faz a tela ler como uma peça só em vez de 16 fotos coladas. Na gravação o centro passa a ser o do quadro: no clipe, o quadro é a imagem.
- **O portão de energia vale pro pós.** Silêncio apaga halação e grão junto com o desenho.
- **Fundo claro inverte quatro coisas:** a halação vira sangria de tinta (multiplica em vez de somar), o joelho da curva passa a rolar a sombra, o grão multiplica e a vinheta cai pra 60% escurecendo pro quente. Vinheta fria em papel parece defeito de scanner.

Controle: um só. `PÓS` na gaveta, com RÉGUA / PRATA / VIDRO / OFF e uma intensidade global, mais uma dose por visual ao lado dos ajustes dele.

## Movimento

- Portão de energia: o áudio é quem molda tudo. Silêncio = tela parada e apagada; o relógio interno de cada módulo de arte só anda quando tem som, no ritmo da energia e do beat.
- 60fps nos medidores, sempre. Quando o computador aperta, a arte é que simplifica; o medidor nunca cede.
- Decaimento suave (nada corta seco: picos caem com inércia).
- Tempo real: o som é medido direto, sem intermediário, e o nível sai de uma janela de 5 milésimos de segundo. O beat é detectado a cada 2,7 milésimos, não a cada quadro. Ataque quase instantâneo, queda suave.
- Grave (20–160Hz) comanda escala, deformação e pulso. É o som do rideblan, os graves têm que aparecer. Desde a v2.2 esse grave **se ajusta ao volume da música**: encosta no 1 no kick e desce no vale, em qualquer volume de entrada (ver "Reação ao som").
- Beat detectado dispara evento: flash, explosão de partículas, empurrão no fluido.
- Agudos comandam brilho, faísca e detalhe fino.
- **Dorme no silêncio.** Depois do fade (0,5s de espera, 2,2s pra sumir) o app limpa os painéis uma vez e para de desenhar até o som voltar. O motor de áudio continua ouvindo.
- **Rolagem em tempo, não em quadro.** A onda e o espectrograma andam na mesma velocidade a 60Hz, 120Hz ou com o limite de 30 quadros, e deslizam em fração de pixel (v2.1).
- **Rastro apaga por opacidade** (`CV.fade`, destination-out). O véu na cor do fundo empacava em 8 bits (parava em 18 quando o tema pede 25) e todo painel com rastro virava um quadrado mais escuro que os vizinhos.

## Reação ao som (v2.2)

Pedido do Bruno: a música mexendo mais nos visuais, principalmente o grave, e cada visual crescendo até ocupar boa parte do painel. Isso é configurável, mas o padrão é esse.

**A causa era o sinal.** O grave que a arte usava saía do mapa de dB da v1, onde qualquer raia acima de -35 dBFS vira 255. Num master de rap o grave passa disso o tempo todo: no beat demo (-12 LUFS) a mediana era 0,997 de 1 e o p75 era 1,000. Entre um kick e outro o sinal já estava no máximo, então o kick não tinha pra onde subir. O PSY recebia 1,4 cravado e acendia igual o tempo inteiro.

**O sinal novo.** O motor mede cada banda em amplitude a cada 128 amostras, alisa em ~20ms e divide por uma régua que acompanha o volume da música (sobe em 50ms, desce ~2 dB/s). Medido no beat demo: o grave vai de 0 no vale a 1 no kick, e o mesmo beat 12 dB mais baixo dá o mesmo desenho, ponto por ponto.

| Sinal | O que é | Quem usa |
| --- | --- | --- |
| grave | até 160Hz, solta em 170ms | escala, empurrão, relevo, o raio da órbita |
| soco | o ataque do grave: dispara no kick, zera no sustain do 808 | estouro, coice, palhetada |
| energia | o som inteiro, solta em 240ms | tamanho de base: parte cheia ocupa mais que a quebra |
| medio, agudo | 160Hz a 2,5kHz e acima | enrugado, tremor, faísca |
| ondaVivo / ondaRef | pico de amostra recente (desce em 0,8s / 3s) | autoganho de quem desenha a forma de onda |

**As regras de desenho:**

- Quanto o som mexe = **Reação ao som** (Ajustes › Visuais: Leve 0,45, Média 0,7, **Forte 1**, Máxima 1,45) vezes a **Reação** do visual.
- Tamanho que respira: cada visual tem um repouso (a fração do painel sem batida) e o kick leva ele até o painel inteiro. Em Leve ele fica perto do repouso; em Máxima encosta na borda antes do kick cheio.
- Forma de onda entra com autoganho: o pico recente da música vira a borda. A arte usa a régua viva (0,8s), então numa quebra sem grave a figura volta a encher em menos de 1s.
- Na borda entra um joelho macio: até 75% do limite passa reto, e daí em diante o visual encosta devagar.
- Barra larga ganha figura larga: Lissajous, Fita e Estéreo usam um raio por eixo, do formato do painel. Numa barra de 1440x170 o Lissajous ocupava 6% da largura e a Fita 14%.
- **Os quatro medidores de número ficam de fora.** Espectro, Loudness, VU e Espectrograma continuam batendo com o MiniMeters, e o teste cobra que nenhum deles leia a Reação.
- Onda, Osciloscópio e Estéreo ganharam **Tamanho**: Encher (padrão: o pico recente vai a 95% da faixa na Reação Forte) ou Nível real (o ganho fixo de antes, pra ler a folga).

**O que o grave faz em cada visual:**

| Visual | No kick |
| --- | --- |
| PSY | o líquido derrete até quase o dobro, a mancha cresce (o zoom cai até ~40%) e a vinheta abre |
| Aurora | a cortina sobe: o pé desce e o topo sobe, e a luz toma o painel |
| Lissajous | a figura vai de 72% a 100% do painel e gira mais rápido; o miolo abre (raio^0,65) |
| Traço | a ondulação lenta cresce com o grave e o kick estufa a corda inteira |
| Fluxo | o pó acelera, engorda e abre a partir do centro; no vale se recolhe devagar |
| Camadas | cada retrato nasce com o tamanho do grave daquele instante, e a pilha inteira respira: o topo sobe de 20% pra 4% da altura e todas as cristas estufam (v2.2b) |
| Fita | a órbita abre numa elipse do tamanho do painel, o soco dá o coice pra fora e a fita inteira, rastro junto, abre com o grave de agora; no vale recolhe pra 2/3 (v2.2b) |
| Enxame | o bando afrouxa enquanto o grave segura e estoura no beat, do tamanho do kick |
| Cordas | as cordas abaixo de 160Hz seguem o grave e levam a palhetada; a vibração passa do vão (até 1,8 vão) |
| Malha | o relevo levanta e o tecido estica de 66% a 86% da altura |
| Onda | (Encher) enche a faixa em qualquer volume |
| Osciloscópio | (Encher) a curva bate em 95% da metade do painel, pela própria régua |
| Estéreo | (Encher) cúpula em meia elipse do formato do painel, nuvem com autoganho, ponto engorda no grave |

## Interação

Todo módulo reage ao mouse, além do som. Estúdio informa no hover (frequência, nota, dB). Arte segue o cursor: o líquido do PSY entorta, o Ferro é atraído, os fios da Fita perseguem, o Túnel desloca o centro, o Caleidoscópio gira. A regra: encostar o mouse nunca quebra o visual, só puxa ele.

## Medidores lisos (v2.1)

O Bruno achou os visuais pesados e pediu clima smooth, no molde do MiniMeters. O peso tinha causa medida: numa barra de 720x170 em Retina o espectro fazia 8.711 chamadas de desenho por quadro e o osciloscópio 2.896, tudo em reta, um ponto por pixel de dispositivo. Os sete medidores somavam 12.934 chamadas. Agora somam 3.162.

**Curva no lugar de reta.** Um ponto a cada 2 pixels de tela, ligado por quadrática que passa pelo meio de cada par (`CV.curva`). Sai mais liso com menos ponto. No grave, onde há mais ponto que raia de FFT, o espectro interpola entre raias (Catmull-Rom) e o bico de cada raia some.

**Preenchimento pela altura.** Debaixo de cada trecho a cor vai da sombra do tema (curva baixa) ao vivo (curva alta), num degradê de 48 paradas, e um segundo degradê apaga o preenchimento em direção ao rodapé. O que toca forte acende e o resto fica escuro, como no MiniMeters. O mais aceso fica em 38% de opacidade; a v2.0 chegava a 92%, com listras por cima.

**Brilho na batida, sem listra.** As 48 faixas se comparam com a própria média lenta. Onde passou, o véu acende e o traço clareia. Liga e desliga nos ajustes do Espectro.

**Onda em três bandas.** O sinal inteiro atrás, de 220 a 2400Hz no meio e o agudo na frente, cada camada com a própria altura. No tema MiniMeters sai vermelho, verde e azul; nos outros temas, a cor do tema em três opacidades. A v2.0 trocava a cor a cada coluna e a faixa virava ruído colorido.

**Rolagem em fração de pixel.** A onda e o espectrograma deslizam pelo resto fracionário do passo (`CV.scrollRing.blit` com `frac`), sem o tranco de 1 e 2 pixels. Na emenda do anel o pedaço velho estica 1 pixel, senão aparece um fio transparente andando pela tela.

**Loudness sem bloco.** O número do MÉDIO fica na cor do medidor, peso 500, até 64px, sem a caixa sólida. Barras de até 30px com trilho e uma marca de pico que segura 1,5s.

**Estéreo em ponto redondo.** Círculo pequeno com borda suavizada, todos no mesmo caminho, em 5 cores e 4 opacidades. Painel grande ganha mais pontos, até as 1024 amostras do quadro. O carimbo com degradê ficou bonito e custava 1ms de JavaScript por quadro; o círculo custa um quarto.

**Osciloscópio liso e parado.** Cada ponto é a média de um pedaço do som, o que tira o chiado, e a curva ganha um véu até a linha do meio. A trava só troca de tom quando o período é claro: chimbal jogava a trava pra 2kHz e a tela virava uma reta.

**Texto.** Rótulo pequeno e apagado. Leitura completa do espectro (dB, Hz, nota e cents) só com o mouse em cima; parado, só a nota do pico, procurada entre 30Hz e 5kHz.

## Curvas do Estúdio (refino, norte MiniMeters)

*Histórico da v2.0. O que mudou na v2.1 está na seção acima.*

Precisão de instrumento sem perder a cor do tema. As curvas seguem quatro regras:

- Linha nítida de 1px é a estrela, e é só ela: sem halo, sem borrão (ver a seção "Sem brilho").
- Preenchimento baixo e chapado no lugar do gradientão. Peso visual leve, a curva respira.
- Pico vira fio contínuo (pico-hold), não pontinhos soltos. Grade de Hz legível (100Hz / 1kHz / 10kHz) com régua de base.
- Cor segue o tema: cada tema desenha a cor de cada medidor (ver Temas).

Vale pro espectro, onda rolante (bloom contido, borda mais dura), osciloscópio (fio de 1px com linha central de referência, verde fósforo vira opção), loudness e espectrograma (mais contraste, piso limpo). A arte psicodélica mantém a alma; só ganhou junta de linha arredondada em todo módulo.

### A rodada de agosto: quatro coisas

**A faixa que toca acende.** O espectro reparte a curva em faixas: uma a cada 1,5 pixel de largura, entre 240 e 640. Passou por 64 (bloco de 9 pixels, não dava pra dizer se bateu em 100 ou em 160Hz), por 224 (ainda quadriculado, cada faixa era um retângulo de 4,5 pixels) e por 420. Num painel de 600px o campo tem 400 pontos, mais fino que o pixel de tela.

**Nada de retângulo: o highlight é gradiente e polígono.** A luz das faixas vira um gradiente horizontal, uma parada de cor por faixa, e o navegador interpola o que está entre duas paradas. Com ele se pintam duas formas que seguem a curva, não colunas: o polígono debaixo da curva num alpha baixo, e uma fita de 3 a 5 pixels colada em cima dela no alpha cheio. A borda entre uma faixa e a vizinha deixou de existir: onde havia degrau de alpha agora há rampa desenhada pela placa.

O degrau entre paradas vizinhas é medido no teste e tem que ficar abaixo de 0,34 de opacidade. Com uma parada por faixa dá 0,20; agrupando de duas em duas ele dobrava e o quadriculado voltava, mais fino. Por isso o teto de paradas é 700: acima do maior campo possível, então o passo é sempre 1.

**O preenchimento também perdeu a escada.** Ele era uma pilha de 12 degraus de magnitude, cada um num retângulo chapado, então a mancha embaixo da curva tinha 12 listras horizontais que dava pra contar numa tela grande. Virou um gradiente vertical (escuro no rodapé, vivo no alto) e um polígono só. Mesma leitura, sem degrau, e 2 chamadas de desenho no lugar de 12 caminhos com 1400 retângulos.

**Uma mecânica de brilho, não duas.** A camada que pintava coluna por coluna quando ela subia saiu. Fazia o mesmo trabalho do highlight de faixa e fazia pior: 3 degraus de opacidade em retângulo de 1 pixel é serrilha, e somada ao highlight virava a segunda grade da tela.

Cada faixa se compara COM ELA MESMA no tempo: carrega uma média lenta do próprio nível (sobe em 0,55s, desce em 1,6s), e o que acende é o quanto ela passou dessa média. "Esta frequência está mais alta do que costuma estar" é a definição de bateu agora.

**A força do pisco é o dB do pico.** O nível normalizado da faixa não é um número solto: ele é a posição dela na janela vertical do espectro, que vai de -66 a -14 dBFS. Elevar isso a 1,25 é o que faz pico alto piscar muito mais que pico baixo em vez de os dois estourarem igual. Medido: um pico de -8dBFS pisca em 1,00 de opacidade e um de -42dBFS pisca em 0,27, no mesmo painel e com a mesma entrada.

Passando de 0,62 a crista também anda pro branco (pro preto em fundo claro) e engorda de 3 pra 5 pixels. Só subir o alpha não resolvia: acima de 1 não existe alpha, e a cor do tema tem um teto de luz.

O ombro que espalha a luz pras faixas vizinhas sai por MÁXIMO, não por média. A média dividia a soma por 2,1, então uma faixa acesa sozinha perdia metade da luz justo no caso que mais interessa, o pico isolado. Agora a faixa fica com o valor cheio e as vizinhas herdam 60% e 30%.

A primeira versão media relevo contra as faixas VIZINHAS, e não acendia no grave. A conta que explica: com FFT de 4096 a 48kHz cada raia vale 11,7Hz, então entre 20Hz e 68Hz existem quatro raias, e o eixo log espalha essas quatro em doze faixas. Faixas vizinhas leem a mesma raia, o topo delas é o mesmo número, e a subtração dá zero por construção. O kick nunca ia acender. Comparação no tempo não depende de resolução, então funciona igual em 60Hz e em 6kHz.

O nível ainda entra como brasa: faixa alta e parada fica em 26% do brilho, e quem se destaca da própria média vai a 100%. O efeito não é o brilho máximo, é a distância entre os dois. Medido no teste com um tom de 60Hz: 0,90 de opacidade no ataque contra 0,26 depois de 2 segundos parado.

A luz apaga em 200 milésimos, e a cor sai do tema em vez do rosa que estava fixo no código.

**Pra piscar mais forte, sobe a folga da batida, não a brasa.** A conta é `força × (0,20 + 1,15 × movimento)`, e o resultado passa de 1 e satura. Se a brasa subisse junto, tudo ficaria claro e o pico deixaria de se destacar; com a folga acima de 1, pico alto em dB chega no talo e fica lá enquanto o médio nunca chega. A crista multiplica por 2,1 e começa a lavar pro branco em 0,55, engordando de 3,4 pra 6,6 pixels.

O teto de saturação é medido em FRAÇÃO do campo, não em contagem (o campo cresce com a largura do painel, então contar pontos não compara nada entre tamanhos). Com música de verdade, 30% do campo chega no talo por quadro, lembrando que cada pico de verdade conta como uns 3 a 5 pontos porque o ombro em volta também passa de 0,8.

**A cúpula do estéreo nasce embaixo.** A raiz vai pro rodapé e o leque abre pra cima: mono sobe reto, tudo à esquerda deita pra esquerda. É o sentido em que se lê medidor, o silêncio mora embaixo. O ponto caiu de 4-6px pra 1-3px e entram todas as 1024 amostras do quadro, então a nuvem mostra a granulação da fase em vez de virar mancha.

**O LUFS médio é o número da tela.** O grande é sempre o Integrado, a média medida desde que o som começou, que é o que se compara com um alvo de master. Ele cresce até o que couber no painel: 92px num painel de 420x200 e 158px num de 900x300, contra 15px fixos da primeira versão. Quem limita é a sobra de largura ao lado das barras ou 72% da altura do trilho, o que vier primeiro; numa coluna estreita a caixa encosta na borda em vez de vazar.

O seletor "Destaque" saiu. Ele deixava a caixa mostrar um valor e as barras outro, e era metade da confusão de não saber o que a tela estava medindo. Sobrou um controle no painel: a cor.

**As duas barras são as pontas da escala de tempo, e têm nome.** Eram Momentâneo e Curto Prazo, duas leituras rápidas quase idênticas lado a lado, sem rótulo: a segunda não contava nada que a primeira já não contasse, e ninguém sabia qual era qual. Agora é CURTO à esquerda (3 segundos, o que está tocando agora) e MÉDIO à direita (o integrado), cada uma com o nome embaixo, em uma letra só quando a barra é estreita demais pra palavra. A distância entre as duas é a leitura de master: diz se a faixa está batendo o alvo ou se foi um trecho isolado que subiu. O Momentâneo continua na tela, na linha pequena embaixo da caixa.

**Detalhe proporcional ao painel.** As contagens da arte eram fixas, escolhidas num painel de 340x200: 140 pontos numa linha de 1400px são 10 pixels por ponto e a curva mostra os cantos. Agora traço, campo de fluxo, ondas em camadas, enxame, fita e lissajous escalam pela raiz da área, com piso no valor antigo e teto. O espectrograma subiu de 160 pra até 400 linhas e cada linha leva o maior do intervalo dela, em vez do bin mais próximo (era o que apagava prato e chimbal).

## Arte (refino: menos brilho, menos fade)

Os módulos psicodélicos são chamativos pela definição da forma, sem bloom nenhum. O rastro é curto (pouco ghosting) e os shaders têm preto fundo com vinheta fechada pra dar contraste. A alma continua: cor do tema e portão de energia (silêncio apaga tudo). Junta de linha arredondada em todo módulo. Os pontos fortes que puxei: a disciplina de forma do MiniMeters e a delicadeza cinematográfica do Exo.

## Presets

Preset = quais visuais estão na tela e o tamanho de cada um. Tema e posição ficam de fora (decisão do Bruno na v1, mantida). Nove prontos, cada um com um conjunto de visuais diferente de todos os outros (o teste cobra):

- **Medição:** Barra (o padrão, os 5 do MiniMeters), Quad, Mixagem, Master, Analógico (VU na frente).
- **Arte:** Clipe, Show, Ambiente.
- **Misto:** Produção.

Mais os do usuário em "Meus presets". A tela da v1 e os templates com nome próprio viraram preset na primeira abertura da v2.

## Módulos (17)

Medidores (7, os do MiniMeters): onda (três bandas em camadas, um canal por faixa, linha de zero por pista), espectro (duas curvas lisas, preenchimento pela altura, brilho na batida, leitura de dBFS e nota no hover), loudness (LUFS pela ITU-R BS.1770, curto e médio, o médio em número grande sem caixa), estéreo (cúpula com a raiz no rodapé, ponto redondo), osciloscópio (trava no tom, curva lisa com véu), espectrograma, **VU** (novo na v2: agulha com escala linear em tensão, 0 VU a 71% do arco, balística de 300 ms, referência -8 dBFS com opção de -18 pra mixar, estilo barra pra tira estreita).

Arte (10): PSY (shader líquido), AURORA (cortinas), LISSAJOUS, FITA, TRAÇO, FLUXO (pó de partículas), CAMADAS (ondas em relevo), ENXAME (constelação que junta e rompe no beat), CORDAS (harpa por banda), MALHA (tecido 3D). Todos crescem no kick e respondem à Reação ao som (v2.2).

Cortados por decisão do Bruno e apagados do código: túnel, maré, ascii, terreno, harmonógrafo, tinta, barras 3d, colmeia, vitral, cascata, túnel de fios, nó, órbita, contorno.
