---
description: "Verificar uma wiki com duas citações que só valem de um lado (a aula 5 cita o húmus e o conceito não lista a aula 5; o conceito excesso de adubo lista a aula 5 e a aula 5 não o lista): aponta as duas e não corrige nada"
tags: [wiki, verificar, citacao-nos-dois-sentidos]
runs: 2
model: sonnet
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso verificar
