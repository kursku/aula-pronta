#!/usr/bin/env bash
# Arquivo com fim de linha do Windows (CRLF) e !.env: o iniciar acrescenta .env, .env.*, !.env.example, transcricao.md e gravacao.srt no fim, com CRLF, sem mexer nas linhas antigas.
set -euo pipefail
printf 'node_modules/\r\n.env\r\n.env.*\r\n!.env\r\n!.env.example\r\n' > .gitignore
