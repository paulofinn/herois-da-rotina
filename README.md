# Heróis da Rotina

Rotina gamificada para crianças. Roda no navegador, guarda tudo **no próprio aparelho** (nada vai pra internet), funciona offline e instala como app no tablet.

**No ar em:** https://paulofinn.github.io/herois-da-rotina/

## Testar no PC

Na pasta do projeto:

```
python -m http.server 8777
```
Depois abra `http://localhost:8777`.

> Abrir o `index.html` direto (duplo clique) até funciona, mas o Chrome trata `file://` de um jeito
> instável para salvar dados. Prefira sempre o servidor ou a versão publicada.

## Colocar no tablet Android

O jeito bom é publicar numa URL https (o app continua guardando os dados só no tablet):

1. Suba a pasta em qualquer hospedagem estática — Vercel, Netlify ou GitHub Pages servem, todas grátis.
2. Abra o endereço no Chrome do tablet.
3. Menu ⋮ → **Instalar app** / **Adicionar à tela inicial**.
4. Abre em tela cheia, sem barra de navegador, e funciona sem internet depois da primeira vez.

Alternativa sem publicar nada: manter os arquivos num servidor local da casa e acessar pelo IP —
mas aí o app não instala como PWA nem funciona offline.

## Como funciona

- **Tarefas** dão 🪙 moedas (para gastar) e ⭐ XP (só acumula, sobe de nível).
- Tarefas marcadas com "precisa do OK" entram na fila de aprovação dos pais e só pagam depois.
- **Dia perfeito** (todas as diárias do dia) = bônus + 🔥 ofensiva. Um escudo por semana perdoa um dia falho.
- **Baú surpresa**: chance de moedas extras ao fechar o dia. É o item que mais sustenta o hábito — não deixe em 100%.
- **Desafio da semana**: a criança escolhe um; o escolhido vale o dobro.
- **Missão da família**: meta cooperativa semanal, para não virar competição entre irmãos.
- **Loja**: prêmios por faixa de preço; os caros travam por nível.
- **Modo pequeno**: cards e ícones maiores, sem o desafio semanal — para quem ainda não lê.

## Área dos pais

Entra pelo card 🔐 na tela inicial, com PIN de 4 dígitos (padrão `1234`, troque em Ajustes).

Aprovações · Crianças · Tarefas · Prêmios · Ajustes (missão da família, regras, PIN, backup).

## Backup

Ajustes → Backup → **Exportar** baixa um `.json` com tudo. **Importar** restaura.
Vale exportar de vez em quando: limpar os dados do Chrome no tablet apaga o progresso.

## Arquivos

```
index.html            estrutura
css/app.css           visual
js/store.js           estado, persistência e regras do jogo
js/ui.js              modal, formulário, toast, som, confete
js/kid.js             telas da criança
js/admin.js           área dos pais
js/app.js             primeira configuração e inicialização
sw.js                 service worker (offline)
manifest.webmanifest  instalação como app
```
