#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-tres-aulas.sh"
# Só nesta cópia: o aviso certo já gravado e um aviso velho (que já não vale) no Excesso de adubo.
cp "$caso/../../evals-fixtures/wiki-aviso-ja-gravado/frequencia-da-adubacao.md" "$caso/../../evals-fixtures/wiki-aviso-ja-gravado/excesso-de-adubo.md" wiki/conceitos/
grep -q 'quinze dias; \[Aula 5\]' wiki/conceitos/frequencia-da-adubacao.md || { echo 'preparar-pasta: o aviso certo não foi plantado' >&2; exit 1; }
grep -q 'inofensivo' wiki/conceitos/excesso-de-adubo.md || { echo 'preparar-pasta: o aviso velho não foi plantado' >&2; exit 1; }
node "$caso/../../skills/wiki-do-curso/scripts/wiki.mjs" indice >/dev/null
