#!/usr/bin/env bash
# Com !.env liberando o segredo e !.env.production.example liberando um modelo, o iniciar acrescenta .env, .env.* e repete só o modelo (!.env.production.example), nunca !.env.
set -euo pipefail
printf 'node_modules/\n.env\n.env.*\n!.env\n!.env.production.example\ntranscricao.md\ngravacao.srt\n' > .gitignore
