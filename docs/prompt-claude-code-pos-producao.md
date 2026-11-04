# Prompt pro Claude Code — Caramujo Vision, ETAPA 3: passada de pós-produção

> **APLICADO EM 4 DE AGOSTO DE 2026, junto com a ETAPA 2.** O que foi feito, o que
> mudou em relação a este plano e por quê está em `docs/contexto-continuidade.md`,
> seção `<etapa2_e_3_aplicadas>`. Este arquivo fica como o registro da direção que
> foi aprovada. Falta o número da bancada: `npm run bench4`.

Cole tudo daqui pra baixo no Claude Code, dentro da pasta `OUTPUTS/caramujo-vision/`.

---

## Contexto

Você está no Caramujo Vision, visualizador de áudio em tempo real em Electron (macOS). Leia antes de escrever qualquer linha:

- `docs/contexto-continuidade.md` — estado do projeto, decisões que não se desfazem
- `docs/diagnostico-tempo-real-e-estetica.md` — a medição que autorizou esta etapa
- `DESIGN.md` — identidade obrigatória
- `js/app.js` (grade, temas, gravação, qualidade adaptativa), `js/modules.js` (os 16 visuais + helpers CV.*), `js/audio.js` (motor), `electron/main.js`, `test/smoke.js`

Modo de trabalho: eu decido o que o produto faz, você decide todo o técnico. Plano antes de obra. Sem jargão comigo — me fale em "o que vou ver na tela".

Esta é a **ETAPA 3** do diagnóstico, já aprovada: a passada de pós-produção. A ETAPA 1 está aplicada. A ETAPA 2 (resolução e tamanho fixo de gravação) pode não estar — confira antes e me diga.

## O que foi decidido nesta rodada de direção

Rodou uma rodada de direção de fotografia com três direções mockadas e medidas. **A direção escolhida como padrão do app é a PRATA** (cópia em gelatina de prata: grão amarrado à luminância, halação em vez de bloom largo, aberração cromática zero).

As três direções são **o mesmo código com vetores de número diferentes**. Não são três implementações.

- **RÉGUA** — acabamento que não toca em informação. Vai nos templates de estúdio: `01 mixagem`, `02 master`, `03 grave`, `11 válvula`.
- **PRATA** — o padrão do app, e dose cheia nos templates de clipe `04`, `05`, `08`, `10`.
- **VIDRO** — intensidade extra, opcional, pros templates `05 show` e `09 submerso`.

### Os vetores (copie como estão)

```js
// js/fx.js — os três presets. Nada aqui é chute: são os números que rodaram nos mockups.
const FX_PRESETS = {
  regua: {
    dither: 1.0,                                              // em LSB (unidades de 1/255)
    bloom:  { thr: 0.88, radPct: 1.2, amt: 0.12, tint: 'baixo', warm: 0.00 },
    curve:  { knee: 0.94, lift: 0.000, con: 1.00 },
    grain:  { amt: 0.015, sizePx: 1.0, hz: 0,  env: 'flat' },
    ab: 0.00,
    blur:   { frames: 0, w: [1, 0.35] },
    vig: 0.06,
    meter:  { bloom: 1.0, grain: 1.0, ab: 1.0, blur: 1.0, vig: 1.0, curve: 1.0 }
  },
  prata: {
    dither: 1.5,
    bloom:  { thr: 0.86, radPct: 2.8, amt: 0.30, tint: 'baixo', warm: 0.08 },
    curve:  { knee: 0.82, lift: 0.010, con: 1.12 },
    grain:  { amt: 0.032, sizePx: 1.4, hz: 14, env: 'meio' },
    ab: 0.35,
    blur:   { frames: 2, w: [1, 0.28] },
    vig: 0.14,
    meter:  { bloom: 0.50, grain: 0.35, ab: 0.0, blur: 0.0, vig: 0.60, curve: 0.60 }
  },
  vidro: {
    dither: 1.0,
    bloom:  { thr: 0.70, radPct: 5.5, amt: 0.45, tint: 'branco', warm: 0.00 },
    curve:  { knee: 0.76, lift: 0.004, con: 1.06 },
    grain:  { amt: 0.020, sizePx: 1.0, hz: 12, env: 'flat' },
    ab: 0.60,
    blur:   { frames: 2, w: [1, 0.35] },
    vig: 0.22,
    meter:  { bloom: 0.35, grain: 0.50, ab: 0.0, blur: 0.0, vig: 0.50, curve: 1.0 }
  }
};
```

Leitura das unidades: `radPct` é % da ALTURA do painel (não da tela). `ab` é deslocamento em px na borda. `sizePx` e `ab` são em px de CSS, multiplique pelo dpr. `dither` é em LSB. `hz` é a taxa de troca do padrão de grão (não é por quadro: a 14 Hz o padrão troca a cada ~4 quadros a 60fps, e é isso que faz parecer emulsão em vez de chuvisco de TV).

## A ordem da passada, e por que ela é essa

```
1  acúmulo de quadros      (média ponderada, não soma)
2  bloom / halação         (com limiar)
3  curva de cor
4  aberração cromática
5  grão
6  vinheta
7  pontilhado              ← último, sempre
```

O pontilhado é o último de propósito: ele existe pra quebrar a faixa que a curva de cor acabou de criar. Se vier antes, a curva refaz a banda e o conserto vira enfeite. Não reordene.

## A matemática, estágio por estágio

Tudo em float linear-ish no espaço 0..1 do valor de tela (não converta pra linear de verdade, os números foram calibrados em sRGB direto).

**1. Acúmulo.** Média ponderada sequencial, nunca soma:
```
acc = 1
para cada quadro anterior i (1..frames):
    acc += w[i]
    alpha = min(0.7, w[i]/acc * intensidade)
    resultado = mix(resultado, quadro_i, alpha)
```

**2. Halação / bloom.** Limiar na luminância, curva de joelho quadrática, raio curto:
```
L   = dot(cor, vec3(0.299, 0.587, 0.114))
t   = clamp((L - thr) / (1 - thr), 0, 1);  t = t*t
camada = tint=='branco' ? vec3(t) : cor * t
se warm > 0:  camada *= vec3(1 + warm*1.6, 1 + warm*0.4, 1 - warm*1.2)
```
Desfoque em 1/3 de resolução, gaussiano separável, sigma = radPct/100 * altura_do_painel * 0.55.
Composição: `soma de luz` em tema escuro, `multiply` em tema claro.

**3. Curva de cor.** Por canal, com LUT de 256 casas (não faça tanh por pixel na CPU; no shader é indiferente):
```
// tema escuro — piv = 0.02
v = (v - piv) * con + piv
se v > knee:  v = knee + (1-knee) * tanh((v-knee)/(1-knee))
v = max(v, 0)
v = lift + (1 - lift) * v        // ← o piso vem DEPOIS da curva
```
**Esse último passo não é detalhe, é o conserto de um bug que eu já cometi.** Se o piso vier antes da curva, o termo de contraste puxa tudo que está abaixo do pivô pra baixo e o fundo #050506 bate em zero — o contrário do que a direção pede, e sem degradê nenhum pro pontilhado quebrar. O pivô mora no FUNDO do painel (0.02), não no meio-tom.

**4. Aberração cromática.** Radial, centro da TELA (não do painel — ver "uma imagem, uma lente" abaixo):
```
p    = pow(r2/r2max, 1.05)
desl = ab * dpr * p * direção_radial
R = amostra(canal R, uv + desl)
G = amostra(canal G, uv)
B = amostra(canal B, uv - desl)
```
Amostragem bilinear. Zero em qualquer painel de medição, sem exceção.

**5. Grão.** Monocromático, somado em fundo escuro e multiplicado em fundo claro:
```
env = 1
se env=='meio':  env = pow(clamp(4*L*(1-L), 0, 1), 0.7)
n   = (ruído(floor(px/cell), floor(py/cell), semente_do_tempo) - 0.5) * 2 * amt * env
cell = round(sizePx * dpr)
escuro: cor += n
claro:  cor *= (1 + n/200)
```
`semente_do_tempo = floor(tempo * hz)`. O envelope é o que faz a direção PRATA funcionar: o grão vive no meio-tom e morre no preto puro, então o fundo #050506 continua limpo.

**6. Vinheta.**
```
f = 1 - vig * pow(r2/r2max, 1.05)
cor.rgb *= f
em tema claro:  vig *= 0.6   e   cor.b *= (f - vig*p*0.12)   // desvio quente
```
Vinheta fria em fundo claro parece defeito de scanner. Em fundo escuro não tem desvio.

**7. Pontilhado.** Ruído triangular, uma vez, na saída:
```
n = (rand(a) - rand(b)) * dither / 255
cor += n
```

## Fundo claro inverte quatro coisas

Vale pros temas PAPEL, GELO, AREIA, LAVANDA, e pra qualquer tema que o `◐` (CV.bgAdj) tenha clareado além de 128 de luminância — o app já resolve isso em `CV.isLight(m)` / `o.light`. Use esse mesmo discriminador, não crie outro.

1. O bloom vira **sangria de tinta**: o limiar olha a escuridão (`1-L`) em vez do brilho, e a camada MULTIPLICA em vez de somar luz. Intensidade × 0,7.
2. O joelho passa a valer pra sombra: quem rola é o preto, o branco do papel é que fica firme.
3. O grão multiplica. Somado, ele clareia o papel e desaparece.
4. A vinheta cai pra 60% e escurece pro quente.

## Dose do medidor

Medidor nunca cede — regra da rodada de desempenho, e vale pra estética também. Cada preset traz um vetor `meter` de multiplicadores. Aberração e borrão são **zero** nos seis medidores, sempre, em todas as direções:

- **aberração**: ela desloca exatamente o pixel que carrega o valor. Meio pixel num texto mono de 9px vira franja colorida, e num pico afiado desloca a leitura de Hz. Não existe dose segura: ou é zero, ou o instrumento mente.
- **borrão**: acúmulo mistura o passado com o agora e come o transiente, que é o motivo de existir o medidor. O pico-hold já é a memória honesta do painel.

Quem é medidor: use o discriminador que já existe no registry (`grupo: 'estudio'` / os seis `spectrum, wavescroll, loudness, gonio, scope, spectrogram`), o mesmo que a resolução por tipo já usa. Não invente um campo novo.

## Como isso entra na arquitetura — e o ponto onde você tem que pensar antes de digitar

O diagnóstico já decidiu: **uma passada por cima de tudo**, 6,2 Mpx por quadro, menos de 1% da máquina. Hoje são 16 telas separadas e o compositor do macOS junta.

Proposta a validar comigo antes de implementar:

1. Um `<canvas id="fx">` de tela cheia, WebGL2, `pointer-events: none`, por cima da grade. Os 16 canvases dos painéis continuam desenhando exatamente como hoje, e passam a ser **fonte**, não saída.
2. Cada quadro, sobe o retângulo de cada painel que redesenhou pra uma textura única do tamanho da viewport (`texSubImage2D` por painel). Painel que não redesenhou naquele quadro (arte com ART_SKIP) não sobe de novo.
3. Prepasse do bloom em 1/3 de resolução (limiar → dois desfoques 1D).
4. Passada de composição: estágios 3 a 7 num fragment shader só.

**Meça o custo do upload antes de comemorar.** 6,2 Mpx de `texSubImage2D` por quadro no macOS não é grátis, e é o único número desta etapa que o diagnóstico NÃO mediu. Use `test/bench3.js` como base e me traga o número em ms por quadro antes de seguir. Se o upload for caro, a alternativa é rodar o pós por painel num contexto WebGL compartilhado — perde a barateza de "uma passada", e nesse caso eu quero decidir, não descobrir depois.

### Uma imagem, uma lente

Vinheta e aberração ficam centradas na **TELA**, não em cada painel. É isso que faz a tela ler como uma peça só em vez de 16 fotos coladas. Consequência: os mockups da rodada de direção foram feitos por painel, então o resultado na tela cheia vai parecer mais suave nos painéis do meio e mais forte nos das pontas. É esperado, e é melhor.

### Máscara de dose

Pra dar dose diferente por painel numa passada única, gere uma **máscara de dose** em 1/8 de resolução, atualizada só quando o layout muda (não por quadro):

- canal R = intensidade do pós daquele painel (0..1)
- canal G = 1 se for medidor
- borda dos painéis com 2px de degradê, senão a fronteira entre um medidor e uma arte vira um corte visível

O shader amostra a máscara e escolhe o multiplicador. Isso resolve intensidade por visual, por template e a dose do medidor com um mecanismo só.

## Controles na interface

Um controle novo, não sete. Na gaveta `#settings`:

- **Coluna global "PÓS"**: seletor `type: 'seg'` com `RÉGUA / PRATA / VIDRO / OFF`, e um `range` **Intensidade** 0..100%, `fmt: 'pct'`, padrão 100.
- **Por visual**: um `range` **Pós** 0..100% no bloco genérico de cada painel, ao lado da Espessura. Multiplica a intensidade global.
- **Por template**: o template guarda a direção e a intensidade junto com o resto.

Regras da casa que o smoke test cobra: TODO campo novo precisa de padrão em `defs()`, controle de opção é `type: 'seg'` e não menu, e nenhum menu pode ter altura fixa (modo barra de 190px).

## Persistência, e o cuidado com os templates

- Estado novo em `state.fx = { preset: 'prata', amount: 1 }` e `s.fx` por painel. Faça merge com os padrões no boot: **não suba a versão de `cv-state-v7`**, senão o Bruno perde layout, tema e tamanhos.
- Templates precisam de campo novo. Subir `cv-tpl-seed` pra `'v15'` **RESETA os 19 templates dele** — não faça isso sem me perguntar. O caminho certo é migrar em silêncio: template sem campo `fx` recebe `regua` se for de estúdio (01, 02, 03, 11), `prata` se for de clipe (04, 05, 08, 10), `prata` com intensidade 60% no resto.

## Gravação — a armadilha

Cada painel grava vídeo em MP4 direto do canvas dele. Se o pós é uma passada por cima de TUDO, **a gravação sai sem pós** e não vai parecer nada com o que ele viu na tela. Isso precisa estar resolvido no mesmo commit, não depois.

Caminho: no `beginRec()`, o painel gravado passa a ser desenhado num alvo fora da tela no tamanho exato do preset (1080x1920 / 1080x1080 / 1920x1080, ETAPA 2), a passada de pós roda nesse alvo com a dose daquele painel, e o `MediaRecorder` captura o resultado. A vinheta e a aberração aí ficam centradas no QUADRO gravado, não na tela — no clipe, o quadro É a imagem.

Não mexa em `setRecordDelayMs` nem no `recDelay`: a sincronia do áudio já está calibrada. Se a passada de pós adicionar quadro de latência, some no `presentMs()`, não no delay do áudio.

## O que não se quebra

- **Portão de energia.** Silêncio = tela parada e apagada. O pós não pode acender nada no silêncio: sem sinal, halação e grão vão a zero junto com o desenho. Regra inegociável.
- **Nenhum `shadowBlur` volta pro `modules.js`.** O brilho agora é a passada única. O smoke test falha se `shadowBlur` ou `'glow'` reaparecer, e essa guarda fica.
- **Linha nítida de 1px continua a estrela.** O desenho de cada painel sai sem halo nenhum, como hoje.
- Nada de `22050` chumbado, nada de `flexGrow` com peso no resize, nada de `window.prompt`.
- Não reintroduza cascata no resize. Não ressuscite os 14 módulos cortados.
- Qualidade adaptativa: se o quadro apertar, corte resolução da arte ANTES de pular quadro, e o medidor nunca entra na conta. Se apertar mais, o pós cai de intensidade antes de qualquer coisa do medidor mudar.

## Ordem de trabalho

Se der pra fazer duas coisas primeiro, faça **pontilhado e halação**. O pontilhado conserta um defeito que já se vê hoje nos shaders (todo degradê escuro em #050506 racha em faixas). A halação é o que faz a tela parecer filmada. Os outros cinco são tempero.

1. `js/fx.js` novo: presets, máscara de dose, contexto WebGL, os shaders. Sem tocar em `modules.js`.
2. Bancada: `test/bench4.js` medindo upload + prepasse + composição em ms por quadro, com 16 painéis abertos. Me traga o número.
3. Liga só pontilhado + halação, com o controle global. Eu olho.
4. Curva, grão, vinheta.
5. Aberração e borrão (só na arte).
6. Gravação com pós no alvo fora da tela.
7. Controles por visual e por template + migração silenciosa dos 19.
8. `test/smoke.js`: novas checagens — todo campo do schema tem padrão; `ab` e `blur` são zero pra todo painel de estúdio nos três presets; o piso do preto é aplicado depois da curva (uma checagem numérica: entrada 5/255 no preset prata em tema escuro tem que sair MAIOR que 5); a ordem dos estágios é a da lista.

## Como eu sei que ficou certo

Estes números foram medidos nos mockups da direção. Use como critério de aceitação, num painel de 560x368 px de dispositivo:

- **O preto abre, não fecha.** Preset PRATA, tema PRETO: a média do painel SOBE com o pós. Medido: enxame 13,3 → 15,8 · psy 31,2 → 34,9 · espectro 27,0 → 29,1. Um fundo #050506 (5,5,6) tem que sair em 5..8, nunca em 0.
- **RÉGUA e VIDRO fecham o preto de propósito** (5,5,6 → 3,3,4). Isso é certo, não é bug.
- **Fundo claro:** canto do painel em PAPEL (233,231,224) sai em 205 no VIDRO, 217 na PRATA, 223 na RÉGUA. Se sair mais escuro, os 60% da vinheta clara não estão aplicados.
- **Legibilidade:** com a PRATA na dose de medidor, o texto mono de 9px do espectro tem que ficar mais legível COM pós do que sem — a halação de raio curto engrossa a linha em vez de comê-la. Se estiver mais difícil de ler, o raio está grande ou o limiar está baixo.
- **Orçamento:** a passada inteira abaixo de 1,5 ms por quadro com 16 painéis abertos. O diagnóstico previu 0,37 Gpx/s, menos de 1% da máquina; o risco é o upload, não o shader.

## O que eu quero de volta

Antes de escrever código: o plano em português, sem jargão, dizendo onde entra cada coisa e o que pode dar errado. Depois de cada etapa da lista: o que mudou, o número da bancada, e o que eu tenho que olhar na tela pra aprovar. Se algum número da direção não sobreviver ao contato com a tela cheia, me diga qual e por quê — eu mudo o número, não a decisão.
