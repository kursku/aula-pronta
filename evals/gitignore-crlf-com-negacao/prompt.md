---
description: "Arquivo com fim de linha do Windows (CRLF) e !.env: o iniciar acrescenta .env, .env.*, !.env.example, transcricao.md e gravacao.srt no fim, com CRLF, sem mexer nas linhas antigas"
tags: [iniciar, seguranca]
runs: 3
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
