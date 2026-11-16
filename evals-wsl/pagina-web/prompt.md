---
description: "Aula com material.md pronto e marca própria no aula-pronta.config: a skill roda o script do plugin e gera a página web com a marca e o mesmo conteúdo"
tags: [pagina-pdf, pagina-web, marca, bash]
runs: 2
model: sonnet
max_turns: 25
timeout_seconds: 600
allowed_tools: [Read, Write, Edit, Bash, Skill]
---
/aula-pronta:pagina-pdf aulas/01-luz-e-agua

Quero só a página web, sem o PDF.
