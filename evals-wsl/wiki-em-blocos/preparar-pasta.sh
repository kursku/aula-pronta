#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
base="$caso/../../exemplo/horta-em-casa"
wiki="node $caso/../../skills/wiki-do-curso/scripts/wiki.mjs"
conv() { node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$1/gravacao.srt" "aulas/$1/transcricao.md" >/dev/null; }
# Curso de exemplo completo (6 aulas) com as transcrições prontas e a wiki vazia.
cp -R "$base/." .
for a in 01-luz-e-agua 02.1-montando-o-canteiro 02.2-escolhendo-a-terra 03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas; do conv "$a"; done
