<contexto_continuidade>
<uso>Retomar o projeto Caramujo Vision em outro chat. Ler antes de mexer em qualquer coisa. Projeto pessoal do Bruno (rideblan / Caramujo Records): aplicar about-me-pessoal + anti-ai-writing-style, modo vibe-coding (CEO↔CTO: ele decide o que o produto faz, a IA decide todo o técnico, plano antes de obra, sem jargão).</uso>

<projeto>
Caramujo Vision: visualizador de áudio em tempo real. Vários módulos simultâneos em grade (layout tipo MiniMeters), estética moldada no Exo Audio Form Vision (exoaudio.com/plugins/form-vision): preto quase puro, monocromia branca delicada, linha fina, bloom suave, interface que some. Tema EXO é o padrão; PSY/NEON/VHS alternativos. Identidade: logo espiral bege (caramujo) + "CARAMUJO VISION" sem separador. Acento da interface: branco papel #f0efe9 (o verde ácido foi removido de propósito).
Pasta: OUTPUTS/caramujo-vision/. Arquivos: index.html, css/style.css, js/audio.js (motor), js/modules.js (16 módulos), js/app.js (grade/gaveta/temas/gravação/fontes), electron/main.js + package.json (app desktop), test/smoke.js (roda com `node test/smoke.js .`, stubs de navegador, sem dependências), DESIGN.md (identidade obrigatória), build/icon.png, assets/logo.png.
</projeto>

<conceitos_chave>
- Portão de energia (CV.gate): áudio molda tudo; silêncio = módulos de arte param e apagam; o relógio interno (m.st.pt) só anda com energia/beat. Regra inegociável do Bruno.
- Fontes de áudio: BEAT DA SEMANA (arquivo escolhido 1x e salvo em IndexedDB 'cv-store'/files/'beat'; hoje é o LEGO, 135 BPM Gm, o áudio vive só no SoundCloud dele), UPLOAD DE FAIXA, ÁUDIO DO COMPUTADOR (getUserMedia + BlackHole 2ch, passo a passo no modal ?), BEAT DEMO sintético 135 BPM Gm. Armadilha conhecida: abrindo por file://, o Chrome silencia MediaElementSource de arquivo da pasta (CORS) — por isso IndexedDB/upload; via https funciona assets/demo-beat.wav.
- Módulos (id → nome): spectrum (nivelar volume compensa agudos; hover = Hz/nota/dB; guias), wavescroll (cor grave→agudo por centroide, sliders corGrave/corAgudo), loudness (só LUFS: barra + média + alvo), gonio "Espaço estéreo" (nuvem orgânica SEM anéis/mira: Bruno detestou cara de alvo; barra de largura na base), scope (fosforo 0 = branco), spectrogram, psy (WebGL líquido), tunnel, kaleido, ferro (goo blur+contrast, acabamento 3D: especular, sombreamento esférico, textura granular, glint; Bruno achava amador), lissa, trace "Traço" (linha viva), flow "Campo de fluxo" (pó de partículas), ascii (símbolos configuráveis, input text no ⚙), wavelayers "Ondas em camadas", silk "Fita".
- Shaders compartilham GLSL_LIB (noise/fbm/pal + uniforms u_res u_mouse u_t u_bass u_mid u_high u_beat u_hue u_sat u_a u_b u_gate) via CV.glSetup/CV.glFrame.
- Ajustes: gaveta lateral fixa (#drawer), nunca cobre o visual; grid ganha margin-right quando aberta. Arrasto de painel só pela barra de título (senão rouba o drag dos sliders).
- Interação: todo módulo reage ao mouse (estúdio informa, arte segue/entorta o cursor).
- Estado no localStorage 'cv-state-v3' (tema, textura, painéis+ajustes). Mudou default? Sobe a versão da chave pra resetar.
- Gravação por painel: canvas.captureStream + trilha de áudio do recordDest, sai .webm.
</conceitos_chave>

<gostos_do_bruno>
Ama: wavelayers, lissajous, flow, psy; quer mais nessa linha unindo performance e visual. Detesta: visual que anima solto do áudio, cara de mira/alvo, ferro sem textura, menu cobrindo o gráfico, IA com cara de IA. Beat de referência: LEGO 135 BPM Gm (hard).
</gostos_do_bruno>

<pendencias>
1. Ideias de visuais novos oferecidas (aguardando escolha): TERRENO (montanhas de onda em perspectiva, wavelayers com profundidade), HARMONÓGRAFO (pêndulos desenhando teias finas), ENXAME (bando de pontos com comportamento coletivo, beat espanta), AURORA (cortinas de luz em shader), ÓRBITA (partículas gravitando centro que pulsa no grave), MARÉ (anéis de interferência por banda).
2. Subir repo GitHub (comandos no README) + ligar Cloudflare Pages (guiar clique a clique).
3. Bruno instalar BlackHole pra captura do sistema (modal ? tem o passo a passo).
4. Desktop: `npm install` + `npm start` roda; `npm run dist` empacota dmg (electron-builder). Não testado em máquina real ainda.
5. Conferir visual real dos módulos novos contra o site do Exo (teste foi só smoke, sem render).
</pendencias>
</contexto_continuidade>
