#!/usr/bin/env bash
# Aula 1 pronta (material e descrição) e aula 2.1 só com o material: falta a descrição dela.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
cp "$caso/../../evals-fixtures/01-luz-e-agua/material.md" "$caso/../../evals-fixtures/01-luz-e-agua/descricao.md" aulas/01-luz-e-agua/
cp "$caso/../../evals-fixtures/02.1-montando-o-canteiro/material.md" aulas/02.1-montando-o-canteiro/
