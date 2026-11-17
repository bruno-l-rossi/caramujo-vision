# Comandos · Caramujo Vision

Cola no Terminal, dentro da pasta do projeto. Pra entrar na pasta:

```
cd ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision
```

## Rodar e testar

```
npm install
npm test
npm start
```

O `npm install` só é preciso depois de atualizar o `package.json` (a v2.5 sobe o Electron pra 45). `npm test` roda as 197 checagens e leva poucos segundos. Se der `SMOKE PASSOU`, nada quebrou. `npm start` abre o app.

Dentro do app: `S` abre os ajustes, `P` pausa, `T` troca o tema, `F` mostra fps e o atraso do som (`C` copia o diagnóstico), `D` troca o detalhe, `1` a `9` trocam o preset, `R` grava o visual sob o mouse, `H` deixa a barra de ferramentas fixa. `Esc` fecha o que estiver aberto.

## Voltar pra uma versão anterior

As pastas de backup foram apagadas na v2.5: o histórico mora no git. Pra voltar, `git log --oneline` acha o commit e `git checkout <commit> -- .` traz os arquivos. Se o Electron 45 der problema no Mac, volte `electron` pra `^33.0.0` e `electron-builder` pra `^24.13.3` no `package.json` e rode `npm install`.

## Tap do Core Audio (menor atraso, macOS 14.2+)

```
brew install cmake
npm install
npm run audio-tap
npm run audio-tap-check
```

Se o `audio-tap` der erro, cole a saída inteira na conversa. Depois, em Ajustes › Áudio, a captura Automática já testa o tap sozinha (ou escolha **Tap**). O macOS pede a permissão de captura de áudio do sistema na primeira vez.

## Medir o custo do acabamento de filme

```
npm run bench4
```

## Empacotar o instalador

```
npm run dist
```

Sai um `.dmg` na pasta `dist/`.

---

## Subir pro GitHub

### Antes de qualquer coisa, confira o que vai subir

```
cd ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision
git status --short
```

Tem que aparecer coisa de código e documento, umas 15 a 25 linhas. Se aparecerem centenas, tem build ou dependência escapando: me chame antes de continuar.

### Primeira vez (o repositório ainda não existe)

Crie o repositório vazio em https://github.com/new com o nome `caramujo-vision`, **sem** marcar "Add a README". Depois:

```
cd ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision
git add -A
git commit -m "Caramujo Vision 2: repaginacao no molde do MiniMeters"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/caramujo-vision.git
git push -u origin main
```

Troque `SEU-USUARIO` pelo seu usuário do GitHub.

### Das próximas vezes

```
cd ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision
npm test
git add -A
git commit -m "o que mudou nesta rodada"
git push
```

O `npm test` antes do commit é de graça e leva 2 segundos. Se ele falhar, não commite.

### Se o push pedir senha

O GitHub não aceita mais senha no terminal. Use um token: em https://github.com/settings/tokens clique em **Generate new token (classic)**, marque `repo`, gere e cole o token no lugar da senha. Ele fica salvo no Keychain e não pede de novo.

---

## O que NÃO vai pro GitHub

O `.gitignore` já segura `node_modules/` e `dist/`. Se o `git add -A` ficar lento, é sinal de que algo pesado escapou: confira com `git status --short | head -30` antes de commitar.
