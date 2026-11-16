#!/usr/bin/env bash
# Cópia do curso de exemplo, mais uma aula só com gravacao.wav (áudio fictício de 7 s, voz sintética).
# .env: chave FICTÍCIA e URL apontando para uma porta local sem servidor: nada chega ao Groq, nem se a skill rodar --transcrever.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
mkdir -p aulas/03-teste-audio
cp "$caso/../../evals-fixtures/transcrever/aula-curta.wav" aulas/03-teste-audio/gravacao.wav
printf 'GROQ_API_KEY=gsk_FICTICIA_eval_nao_e_chave_real\nAULA_PRONTA_GROQ_URL=http://127.0.0.1:9/x\n' > .env
