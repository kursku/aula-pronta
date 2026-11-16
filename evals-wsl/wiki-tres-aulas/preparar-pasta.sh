#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
base="$caso/../../exemplo/horta-em-casa"
wiki="node $caso/../../skills/wiki-do-curso/scripts/wiki.mjs"
conv() { node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$1/gravacao.srt" "aulas/$1/transcricao.md" >/dev/null; }
# Curso de exemplo só com as aulas 3 a 5 (transcrições prontas) e a wiki vazia.
cp "$base/.gitignore" "$base/aula-pronta.config" .
cp -R "$base/lotes" "$base/wiki" .
mkdir aulas
cp "$base/aulas/LEIAME.md" aulas/
for a in 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas; do cp -R "$base/aulas/$a" aulas/; conv "$a"; done
