#!/usr/bin/env bash
# .gitignore com .env, .env.* e transcricao.md: falta a gravacao.srt.
set -euo pipefail
printf '.env\n.env.*\ntranscricao.md\n' > .gitignore
