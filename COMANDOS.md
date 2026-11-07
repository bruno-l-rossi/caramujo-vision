# Comandos · Caramujo Vision

Cola no Terminal, dentro da pasta do projeto. Pra entrar na pasta:

```
cd ~/Documents/Claude\ Cowork/OUTPUTS/caramujo-vision
```

## Rodar e testar

```
npm test
npm start
```

`npm test` roda as 168 checagens e leva poucos segundos. Se der `SMOKE PASSOU`, nada quebrou. `npm start` abre o app.

Dentro do app: `S` abre os ajustes, `P` pausa, `T` troca o tema, `F` mostra fps e o atraso do som, `H` deixa a barra de ferramentas fixa. `Esc` fecha o que estiver aberto.

## Voltar pra v1

A v1 inteira está guardada na pasta `backup-v1/`, do jeito que estava antes da repaginação. Pra voltar, copie os arquivos de lá por cima dos daqui (e rode `npm test` depois). O estado salvo da v1 (`cv-state-v7`) continua intacto no app: a v2 lê ele, mas não apaga.

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
