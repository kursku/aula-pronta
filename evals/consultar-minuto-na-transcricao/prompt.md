---
description: "Consultar a wiki do exemplo quando a página da aula e a do conceito trazem um minuto errado (plantado só na cópia): a resposta traz o minuto da transcrição, não o da página"
tags: [wiki, consultar, transcricao]
runs: 2
model: sonnet
max_turns: 30
timeout_seconds: 600
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso consultar Em que minuto eu explico a receita da calda de sabão?
