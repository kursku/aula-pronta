#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-tres-aulas.sh"
# Só nesta cópia: a receita da calda de sabão está em [01:50] na página da aula e na do conceito, mas a transcrição a tem em [01:20].
grep -q '^\[01:20\] A solução que eu uso é a calda de sabão' wiki/raw/05-folhas-amarelas-e-pragas/transcricao.md || { echo 'preparar-pasta: a transcrição mudou' >&2; exit 1; }
sed -i 's/\[01:20\]/[01:50]/g' wiki/aulas/05-folhas-amarelas-e-pragas.md wiki/conceitos/calda-de-sabao.md
grep -q '\[01:50\]' wiki/aulas/05-folhas-amarelas-e-pragas.md || { echo 'preparar-pasta: o minuto errado não entrou na aula' >&2; exit 1; }
grep -q '\[01:50\]' wiki/conceitos/calda-de-sabao.md || { echo 'preparar-pasta: o minuto errado não entrou no conceito' >&2; exit 1; }
! grep -q '\[01:20\]' wiki/aulas/05-folhas-amarelas-e-pragas.md wiki/conceitos/calda-de-sabao.md || { echo 'preparar-pasta: sobrou o minuto certo' >&2; exit 1; }
