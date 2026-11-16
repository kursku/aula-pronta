---
description: "A regra /transcricao.md pega só a raiz e não as transcrições das aulas; o iniciar acrescenta transcricao.md e gravacao.srt no fim"
tags: [iniciar, seguranca]
runs: 2
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Edit, Skill]
---
/aula-pronta:iniciar
