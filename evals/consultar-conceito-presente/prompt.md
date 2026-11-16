---
description: "Consultar a wiki do exemplo sobre um conceito que ela tem (calda de sabão): responde com a aula e o minuto certos, só lendo, sem escrever nada"
tags: [wiki, consultar, conceito-presente]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Já falei de calda de sabão? Em que aula e em que minuto eu ensino a receita?
