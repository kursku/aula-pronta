#!/usr/bin/env bash
# Com ' .env' e ' .env.*' (espaço no começo), as linhas não casam com o arquivo de chaves; o iniciar acrescenta .env e .env.* no fim sem mexer nas linhas do usuário.
set -euo pipefail
printf 'node_modules/\n .env\n .env.*\ntranscricao.md\ngravacao.srt\n' > .gitignore
