---
description: "O infoprodutor já aceitou o custo e o serviço não responde: o script repete e desiste; a skill conta o motivo, roda o envio uma vez só, não grava transcrição e não mostra a chave"
tags: [transcrever, groq, falha, retry, bash]
runs: 2
model: sonnet
max_turns: 20
timeout_seconds: 600
allowed_tools: [Read, Write, Bash, Skill]
---
/aula-pronta:transcrever aulas/03-teste-audio

Pode transcrever, aceito o custo.
