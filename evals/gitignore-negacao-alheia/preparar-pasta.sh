#!/usr/bin/env bash
# .gitignore protegido (.env, transcricao.md e gravacao.srt), com uma negação de outro arquivo (!README.md). Rodar o iniciar não deve mudar nada.
set -euo pipefail
printf '.env\n.env.*\n!README.md\ntranscricao.md\ngravacao.srt\n' > .gitignore
