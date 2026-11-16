---
description: "Verificar uma wiki com um link quebrado (aula 3 liga a um conceito que não existe) e uma página solta (conceito que nenhuma página liga, mas que o índice lista): aponta os dois e não corrige nada (só grava o aviso de contradição no conceito)"
tags: [wiki, verificar, link-quebrado, pagina-solta]
runs: 2
model: sonnet
max_turns: 40
timeout_seconds: 900
allowed_tools: [Read, Glob, Grep, Write, Edit, Skill]
---
/aula-pronta:wiki-do-curso verificar
