#!/usr/bin/env bash
# Curso de exemplo com marca própria (nome, cores, rodapé e logo) e o material.md da aula 1 já pronto,
# com um trecho de texto cru (<tag>, <b>, <script>) que não pode virar HTML na página.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
cp "$caso/../../evals-fixtures/01-luz-e-agua/material.md" aulas/01-luz-e-agua/material.md
cat >> aulas/01-luz-e-agua/material.md <<'TEXTO'

## Parte 5: texto cru da gravação
Na gravação apareceu <tag> falada, <b>negrito cru</b> e <script>window.PWNED = 1</script> no meio do texto.
TEXTO
cat > aula-pronta.config <<'CONFIG'
# Marca do curso.
nome-do-curso: Curso Marca Teste
logo: logo.png
cor-principal: #B5179E
cor-secundaria: #0F766E
rodape: Rodapé exclusivo Marca Teste
CONFIG
echo 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > logo.png
