#!/usr/bin/env bash
# Aula 1 pronta e a pasta bonus sem número, só com a gravação: sem material.md nem descricao.md.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
cp "$caso/../../evals-fixtures/01-luz-e-agua/material.md" "$caso/../../evals-fixtures/01-luz-e-agua/descricao.md" aulas/01-luz-e-agua/
mkdir aulas/bonus
cp aulas/01-luz-e-agua/gravacao.srt aulas/bonus/
