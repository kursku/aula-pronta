#!/usr/bin/env bash
# Com .env/ e .env*/ (regra de pasta), o arquivo .env não está protegido; o iniciar acrescenta .env e .env.* no fim sem mexer nas linhas do usuário.
set -euo pipefail
printf 'node_modules/\n.env/\n.env*/\ntranscricao.md\ngravacao.srt\n' > .gitignore
