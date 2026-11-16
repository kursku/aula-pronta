#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-tres-aulas.sh"
# Só nesta cópia: o aviso da contradição da frequência da adubação já gravado pela verificação.
cp "$caso/../../evals-fixtures/wiki-aviso-ja-gravado/frequencia-da-adubacao.md" wiki/conceitos/
grep -q 'quinze dias; \[Aula 5\]' wiki/conceitos/frequencia-da-adubacao.md || { echo 'preparar-pasta: o aviso não foi plantado' >&2; exit 1; }
node "$caso/../../skills/wiki-do-curso/scripts/wiki.mjs" indice >/dev/null
