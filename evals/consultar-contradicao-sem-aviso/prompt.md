---
description: "Consultar a wiki do exemplo sem aviso gravado (a verificação ainda não rodou): a definição do conceito traz os dois valores, e a resposta mostra as duas aulas e os dois minutos sem escolher"
tags: [wiki, consultar, contradicao]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Qual a frequência da adubação que eu ensino?
