#!/usr/bin/env bash
# .gitignore com .env, .env.* e /transcricao.md (só a raiz): os arquivos das aulas ficam rastreáveis.
set -euo pipefail
printf '.env\n.env.*\n/transcricao.md\n' > .gitignore
