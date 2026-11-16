---
description: "Se o material e a descrição da aula já existem, a skill não sobrescreve nenhum dos dois e pergunta antes"
tags: [pos-gravacao, seguranca]
runs: 2
model: sonnet
max_turns: 15
timeout_seconds: 600
allowed_tools: [Read, Write, Skill]
---
/aula-pronta:pos-gravacao aulas/01-luz-e-agua
