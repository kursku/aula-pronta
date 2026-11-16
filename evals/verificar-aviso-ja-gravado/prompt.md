---
description: "Verificar a wiki do exemplo que já tem o aviso da contradição gravado (com outras palavras) e um aviso velho num conceito sem contradição: depois da rodada o aviso certo aparece uma vez só e o velho saiu"
tags: [wiki, verificar, aviso, rodar-de-novo]
runs: 2
model: sonnet
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso verificar
