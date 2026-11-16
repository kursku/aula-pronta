---
description: "Wiki com três aulas já ingeridas e uma quarta aula nova: só a quarta é processada, e o registro prova (as três primeiras linhas intactas, a quarta no bloco 2)"
tags: [wiki, incremental, bash]
runs: 2
model: sonnet
max_turns: 50
timeout_seconds: 1200
allowed_tools: [Read, Write, Edit, Bash, Skill]
---
/aula-pronta:wiki-do-curso ingerir
