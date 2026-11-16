---
description: "Pasta de aula sem gravacao.srt e sem transcricao.md: a skill para, explica o que falta e não cria arquivo"
tags: [pos-gravacao, erro]
runs: 2
model: sonnet
max_turns: 15
timeout_seconds: 300
allowed_tools: [Read, Write, Skill]
---
/aula-pronta:pos-gravacao aulas/03-sem-srt
