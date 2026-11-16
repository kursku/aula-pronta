#!/usr/bin/env bash
# Quatro aulas prontas (material e descrição fictícios em evals-fixtures/): 2, 2.2, 2.10 e 10.
# Na ordem alfabética das pastas sai 10, 2, 2.10, 2.2; na numérica, 2, 2.2, 2.10, 10.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
for aula in 2-planejando-a-horta 2.2-escolhendo-a-terra 2.10-podando-as-plantas 10-fechando-a-colheita; do
  mkdir -p "aulas/$aula"
  cp "$caso/../../evals-fixtures/$aula/material.md" "$caso/../../evals-fixtures/$aula/descricao.md" "aulas/$aula/"
done
