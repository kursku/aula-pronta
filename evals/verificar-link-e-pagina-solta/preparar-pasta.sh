#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-tres-aulas.sh"
# Só nesta cópia: um link para um conceito que não existe e uma página que nenhuma outra página liga.
sed -i '/^A aula mostra como escolher uma muda/ s|$| A primeira rega é detalhada em [Rega inicial](../conceitos/rega-inicial.md).|' wiki/aulas/03-plantando-as-mudas.md
grep -q 'rega-inicial\.md' wiki/aulas/03-plantando-as-mudas.md || { echo 'preparar-pasta: o link quebrado não foi plantado' >&2; exit 1; }
cp "$caso/../../evals-fixtures/wiki-pagina-solta/vermiculita.md" wiki/conceitos/
test -f wiki/conceitos/vermiculita.md || { echo 'preparar-pasta: a página solta não foi plantada' >&2; exit 1; }
node "$caso/../../skills/wiki-do-curso/scripts/wiki.mjs" indice >/dev/null
