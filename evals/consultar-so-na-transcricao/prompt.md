---
description: "Consultar a wiki do exemplo com uma palavra que não está no texto (inseto) sobre algo que só aparece na transcrição e no resumo da aula, sem página de conceito (formigas, aula 5): a busca por sinônimo acha, e a resposta traz a aula e o minuto em vez de dizer que não está na wiki"
tags: [wiki, consultar, busca]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Já falei de algum inseto que sobe pelas plantas?
