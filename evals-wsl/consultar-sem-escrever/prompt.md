---
description: "Consultar a wiki do exemplo com o Bash liberado: responde só lendo, sem rodar o wiki.mjs nem node e sem escrever na wiki pelo shell"
tags: [wiki, consultar, sem-script, bash]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, Skill]
---
/aula-pronta:wiki-do-curso consultar De quanto em quanto tempo eu adubo?
