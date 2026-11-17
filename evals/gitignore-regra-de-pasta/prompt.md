---
description: "Com .env/ e .env*/ (regra de pasta), o arquivo .env não está protegido; o iniciar acrescenta .env e .env.* no fim sem mexer nas linhas do usuário"
tags: [iniciar, seguranca]
runs: 3
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
