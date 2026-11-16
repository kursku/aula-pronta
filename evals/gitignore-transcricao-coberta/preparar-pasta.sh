#!/usr/bin/env bash
# .gitignore com .env, .env.* e a pasta aulas/: a transcricao.md de qualquer aula já está ignorada. Nada a mudar.
set -euo pipefail
printf '.env\n.env.*\naulas/\n' > .gitignore
