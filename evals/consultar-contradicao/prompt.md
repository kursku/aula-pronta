---
description: "Consultar a wiki do exemplo com o aviso de contradição já gravado, com outras palavras (de quanto em quanto tempo eu adubo): mostra as duas aulas e os dois minutos, sem escolher um lado"
tags: [wiki, consultar, contradicao, outras-palavras]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar De quanto em quanto tempo eu adubo?
