#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
base="$caso/../../exemplo/horta-em-casa"
wiki="node $caso/../../skills/wiki-do-curso/scripts/wiki.mjs"
conv() { node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$1/gravacao.srt" "aulas/$1/transcricao.md" >/dev/null; }
# Wiki com as aulas 3 a 5 já ingeridas (bloco 1, em 2026-11-01) e a aula 6 nova, só com a transcrição.
cp "$base/.gitignore" "$base/aula-pronta.config" .
cp -R "$base/lotes" "$base/wiki" .
mkdir aulas
cp "$base/aulas/LEIAME.md" aulas/
for a in 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas; do cp -R "$base/aulas/$a" aulas/; conv "$a"; done
cp -R "$caso/../../evals-fixtures/quarta-aula/06-colhendo-no-ponto" aulas/
conv 06-colhendo-no-ponto
$wiki preparar >/dev/null
cp -R "$caso/../../evals-fixtures/wiki-tres-aulas/aulas/." wiki/aulas/
cp -R "$caso/../../evals-fixtures/wiki-tres-aulas/conceitos/." wiki/conceitos/
$wiki copiar 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas >/dev/null
# As páginas prontas atestam a transcrição de que saíram: o hash da cópia entra no cabeçalho.
for a in 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas; do
  h="$(sha256sum "wiki/raw/$a/transcricao.md" | cut -d' ' -f1)"
  sed -i "s/^transcricao-sha256: .*/transcricao-sha256: $h/" "wiki/aulas/$a.md"
done
$wiki registrar 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas --data 2026-11-01 >/dev/null
$wiki indice >/dev/null
