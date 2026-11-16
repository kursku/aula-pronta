---
description: "Verificar a wiki do exemplo com o Bash liberado: acha a contradição e a lacuna só com Glob, Grep e Read, sem rodar o wiki.mjs nem o conferir; o aviso de contradição entra por Edit, nunca pelo shell"
tags: [wiki, verificar, sem-script, bash]
runs: 2
model: sonnet
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Edit, Bash, Skill]
---
/aula-pronta:wiki-do-curso verificar
