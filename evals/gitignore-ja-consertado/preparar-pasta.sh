#!/usr/bin/env bash
# .gitignore que sai do caso gitignore-com-negacao: ainda tem a linha !.env, mas o bloco
# acrescentado no fim volta a ignorar tudo, inclusive transcricao.md e gravacao.srt. Rodar o iniciar de novo não deve mudar nada.
set -euo pipefail
printf 'node_modules/\n.env\n.env.*\n!.env\n!.env.example\n\n.env\n.env.*\n!.env.example\ntranscricao.md\ngravacao.srt\n' > .gitignore
