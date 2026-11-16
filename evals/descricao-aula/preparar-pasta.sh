#!/usr/bin/env bash
# Aula 1 com o material já escrito (fictício, em evals-fixtures/) e a transcrição gerada pelo script do plugin. Sem descrição.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" aulas/01-luz-e-agua/gravacao.srt aulas/01-luz-e-agua/transcricao.md
cp "$caso/../../evals-fixtures/01-luz-e-agua/material.md" aulas/01-luz-e-agua/material.md
