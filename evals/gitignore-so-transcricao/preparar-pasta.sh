#!/usr/bin/env bash
# .gitignore com o .env protegido (.env e .env.*) e a gravacao.srt, sem a transcricao.md.
set -euo pipefail
printf '.env\n.env.*\ngravacao.srt\n' > .gitignore
