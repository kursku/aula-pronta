---
description: "Consultar a wiki limpa (duas aulas fictícias de rega) sobre um conceito cujas aulas dão valores de contextos diferentes, alface todo dia e tomate dia sim dia não: mostra cada valor com o seu contexto, a aula e o minuto, sem falar em contradição"
tags: [wiki, consultar, contexto]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar De quanto em quanto tempo eu preciso regar?
