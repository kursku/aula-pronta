#!/usr/bin/env bash
# Com !.env.prod (nome fora da lista fixa) liberando um arquivo de chaves, o .env.prod não está protegido; o iniciar acrescenta .env e .env.* no fim e não repete !.env.prod.
set -euo pipefail
printf 'node_modules/\n.env\n.env.*\n!.env.prod\ntranscricao.md\ngravacao.srt\n' > .gitignore
