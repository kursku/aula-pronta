#!/usr/bin/env bash
# .gitignore só com .env e .env.local: .env.production e .env.staging ficam rastreáveis.
set -euo pipefail
printf '.env\n.env.local\n' > .gitignore
