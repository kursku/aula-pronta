#!/usr/bin/env bash
# Monta a pasta de um curso já iniciado: cópia do curso de exemplo, com dois arquivos
# editados pelo infoprodutor e a wiki ausente. O iniciar deve criar só a wiki.
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cp -R "$caso/../../exemplo/horta-em-casa/." .
echo "TEXTO DO INFOPRODUTOR" > lotes/LEIAME.md
echo "rodape: RODAPE EDITADO PELO INFOPRODUTOR" >> aula-pronta.config
rm -r wiki
