---
description: "Consultar a wiki do exemplo sobre uma aula que não foi ingerida (aula 9): diz que não consta na wiki, repete só o número que foi digitado, sem minuto, sem palpite e sem inventar conteúdo"
tags: [wiki, consultar, ausente, aula]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar O que eu falei na aula 9?
