---
description: "Verificar uma wiki sem nenhum problema (duas aulas dão frequências de rega diferentes para plantas diferentes: contexto, não contradição): relata que não achou nada e não inventa achado"
tags: [wiki, verificar, negativo]
runs: 2
model: sonnet
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso verificar
