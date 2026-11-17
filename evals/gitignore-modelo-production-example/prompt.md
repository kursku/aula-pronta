---
description: "Com !.env liberando o segredo e !.env.production.example liberando um modelo, o iniciar acrescenta .env, .env.* e repete só o modelo (!.env.production.example), nunca !.env"
tags: [iniciar, seguranca]
runs: 3
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
