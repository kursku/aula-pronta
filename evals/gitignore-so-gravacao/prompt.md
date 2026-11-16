---
description: "Com .env, .env.* e transcricao.md já protegidos, o iniciar acrescenta só gravacao.srt no fim (*.md protegeria só a transcrição, não a gravação)"
tags: [iniciar, seguranca]
runs: 2
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
