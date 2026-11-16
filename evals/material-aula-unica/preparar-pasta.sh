#!/usr/bin/env bash
# Cópia do curso de exemplo (a gravação .srt de cada aula, sem transcrição).
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
conv() { node "$caso/../../skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "$1/gravacao.srt" "$1/transcricao.md"; }
# A transcrição já vem pronta, gerada pelo script do plugin: a skill não precisa de Bash.
conv aulas/01-luz-e-agua
