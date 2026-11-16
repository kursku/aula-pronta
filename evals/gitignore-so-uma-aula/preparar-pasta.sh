#!/usr/bin/env bash
# .gitignore com .env, .env.* e a pasta de uma aula só: os arquivos das outras aulas ficam rastreáveis.
set -euo pipefail
printf '.env\n.env.*\naulas/01-exemplo/\n' > .gitignore
