#!/usr/bin/env bash
# .gitignore com .env, .env.* e transcricao.md, mas uma negação depois libera a transcrição de uma aula.
set -euo pipefail
printf '.env\n.env.*\ntranscricao.md\n!aulas/02.2-x/transcricao.md\n' > .gitignore
