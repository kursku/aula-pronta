---
description: "Três aulas com transcrição e wiki vazia: o comando copia as transcrições sem alterar, escreve as páginas de aula e de conceito, o índice, o registro e o arquivo de regras"
tags: [wiki, ingestao, bash]
runs: 2
model: sonnet
max_turns: 90
timeout_seconds: 1500
allowed_tools: [Read, Write, Edit, Bash, Skill]
---
/aula-pronta:wiki-do-curso ingerir
