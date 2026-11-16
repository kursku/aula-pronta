---
description: "Consultar a wiki do exemplo sobre algo que nenhuma aula ingerida ensina (poda): diz que não está na wiki, sem aula, sem minuto, sem palpite e sem conhecimento geral"
tags: [wiki, consultar, ausente]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Eu já ensinei a podar as plantas? Em qual aula?
