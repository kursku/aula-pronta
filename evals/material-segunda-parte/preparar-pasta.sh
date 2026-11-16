#!/usr/bin/env bash
# Cópia do curso de exemplo (a gravação .srt de cada aula, sem transcrição).
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
conv() { node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "$1/gravacao.srt" "$1/transcricao.md"; }
conv aulas/02.1-montando-o-canteiro
conv aulas/02.2-escolhendo-a-terra
