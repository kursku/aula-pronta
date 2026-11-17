---
description: "Com !.env.prod (nome fora da lista fixa) liberando um arquivo de chaves, o .env.prod não está protegido; o iniciar acrescenta .env e .env.* no fim e não repete !.env.prod"
tags: [iniciar, seguranca]
runs: 3
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
