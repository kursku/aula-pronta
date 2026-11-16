#!/usr/bin/env bash
# Cópia do curso de exemplo, mais uma aula só com gravacao.wav (áudio fictício de 7 s, voz sintética).
# .env: não existe (sem chave).
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
mkdir -p aulas/03-teste-audio
cp "$caso/../../evals-fixtures/transcrever/aula-curta.wav" aulas/03-teste-audio/gravacao.wav
