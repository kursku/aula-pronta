#!/usr/bin/env bash
# Pasta com um .gitignore do infoprodutor (fim de linha CRLF) que não protege o .env.
set -euo pipefail
printf 'node_modules/\r\n' > .gitignore
