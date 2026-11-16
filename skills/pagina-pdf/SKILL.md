---
name: pagina-pdf
description: Transforma o material.md de uma aula em página web e PDF com a marca do curso (nome, logo, cores e rodapé do aula-pronta.config) e confere o PDF página por página. Use quando o infoprodutor pedir o PDF ou a página web do material do aluno.
argument-hint: aulas/01-nome-da-aula
allowed-tools: Read Edit Bash(node:*)
---

# Página web e PDF do material do aluno

Você fala com um infoprodutor que não é programador: português simples, sem jargão, só os termos do glossário (aula, material do aluno, curso, aluno). Você nunca envia nada a ninguém.

O `material.md` é a fonte. A página `material.html` e o PDF `material.pdf` são gerados dele, com o mesmo conteúdo, a cada execução: não pergunte antes de sobrescrevê-los, e diga que mudanças vão no `material.md`.

## Qual aula

A aula vem em `$ARGUMENTS`, como `aulas/01-luz-e-agua` (o nome sozinho vira `aulas/<nome>`; se passou um arquivo, use a pasta dele). Sem argumento: pergunte qual aula e pare. Só trabalhe na pasta cujo pai real é `aulas/` dentro do curso; o comando pode ser chamado de outro diretório. Recuse `..`, caminho fora dela e atalhos para outra aula. Nome de pasta com aspas simples (`'`): peça para renomear e pare.

## Passo 1: gerar

Rode, com a pasta entre aspas simples (`--so-pagina` só se o infoprodutor pediu só a página web, e então pule o Passo 2):

```
node '${CLAUDE_SKILL_DIR}/scripts/gerar-material.mjs' '<pasta da aula>'
```

O script lê o `material.md` e o `aula-pronta.config`, escreve `material.html` e `material.pdf` na pasta da aula e diz quantas páginas o PDF tem. Se ele reclamar de algo, conte o motivo em português e pare. Se o `node` não existir, diga que precisa do Node.js (nodejs.org).

- **Falta o pandoc** (o script diz "Falta o pandoc"): **pare e explique** que ele é o programa que monta a página. Pergunte se pode instalar (no Windows pelo `winget`, no Mac pelo `brew`) e **espere o "sim"**. Só depois do "sim", rode `node '${CLAUDE_SKILL_DIR}/scripts/gerar-material.mjs' --instalar-pandoc` e repita o Passo 1. Nunca instale sem o "sim" e nunca rode `winget` nem `brew` você mesmo. Se o script disser que não sabe instalar neste sistema, passe a instrução dele.
- **Faltam o Chrome e o Edge**: a página já saiu; explique que o PDF precisa de um dos dois (Google Chrome ou Microsoft Edge) e pare.
- **O navegador falhou**: conte o motivo em português e pare. Não dê o PDF como pronto.

## Passo 2: conferir o PDF página por página

Leia o `material.pdf` com `Read`. Até 10 páginas, leia sem `pages`: o `Read` devolve todas as páginas. Com mais de 10, leia com `pages` em blocos de até 10 (se o `Read` disser que falta o `pdftoppm`, avise o infoprodutor de que só conferiu o que o `Read` deixou ver e diga quais páginas não viu).

Em cada página, procure: **tabela cortada**, **título quebrado** (título no pé de uma página, longe do texto dele), **código saindo da margem** e **página quase vazia** (só uma ou duas linhas, fora a última página). Confira também que a marca está lá: o nome do curso no alto da primeira página (só nela) e o rodapé com o número em toda página.

Achou problema: corrija o `material.md` com `Edit`, só na forma (encurtar uma célula, dividir uma tabela larga, quebrar uma linha de código longa, tirar uma linha em branco sobrando). O material é só Markdown (HTML dentro dele aparece como texto, então não use HTML para quebrar página). **Nunca mude o que o material diz** e nunca coloque dado sensível. Rode o Passo 1 de novo e leia de novo. No máximo três rodadas: se ainda sobrar problema, diga qual.

## Passo 3: relatório

Última mensagem, em português simples: os arquivos (`material.html`, `material.pdf` e quantas páginas), o que você corrigiu no `material.md` para o PDF ficar certo (nada: diga "Nada"), e o que sobrou. Lembre que a página e o PDF são refeitos a partir do `material.md`: o que o infoprodutor quiser mudar, muda lá e roda o comando de novo.
