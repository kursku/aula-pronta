---
description: "Aula só com gravacao.wav e sem .env: a skill roda o script, que para; explica como configurar a chave e não cria transcrição nem .env"
tags: [transcrever, groq, sem-chave, bash]
runs: 2
model: sonnet
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Write, Bash, Skill]
---
/aula-pronta:transcrever aulas/03-teste-audio
