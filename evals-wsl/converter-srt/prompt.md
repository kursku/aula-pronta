---
description: "Aula só com gravacao.srt: a skill roda o script do plugin, gera a transcrição no formato comum e escreve o material"
tags: [pos-gravacao, transcricao, bash]
runs: 2
model: sonnet
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Write, Bash, Skill]
---
/aula-pronta:pos-gravacao aulas/01-luz-e-agua
