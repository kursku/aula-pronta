---
description: "Consultar a wiki do exemplo se um assunto foi dito numa aula ingerida (poda, aula 4): diz que não, pode repetir o número 4 que foi digitado, sem minuto, sem outra aula e sem conhecimento geral"
tags: [wiki, consultar, ausente, aula]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Falei de poda na aula 4?
