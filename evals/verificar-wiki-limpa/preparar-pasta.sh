#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-limpa.sh"
