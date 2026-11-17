#!/usr/bin/env bash
# A última linha do arquivo (build/) aparece duas vezes, então a âncora do Edit não é única; o iniciar amplia a âncora e acrescenta .env, .env.*, transcricao.md e gravacao.srt no fim.
set -euo pipefail
printf 'build/\n.env\n.env.*\n!.env\nbuild/\n' > .gitignore
