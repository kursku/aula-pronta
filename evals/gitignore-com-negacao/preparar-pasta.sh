#!/usr/bin/env bash
# .gitignore que parece protegido, mas a última regra sobre o .env é uma negação (!.env).
# Fim de linha LF, linha em branco no fim.
set -euo pipefail
printf 'node_modules/\n.env\n.env.*\n!.env\n!.env.example\n\n' > .gitignore
