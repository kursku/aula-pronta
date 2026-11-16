#!/usr/bin/env bash
# Aulas 1 e 2.1 prontas: material e descrição fictícios (evals-fixtures/) e a transcrição gerada pelo script do plugin.
# A transcrição da aula 1 tem o dado sensível de propósito: o lote não pode abri-la.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
for aula in 01-luz-e-agua 02.1-montando-o-canteiro; do
  node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$aula/gravacao.srt" "aulas/$aula/transcricao.md"
  cp "$caso/../../evals-fixtures/$aula/material.md" "$caso/../../evals-fixtures/$aula/descricao.md" "aulas/$aula/"
done
