#!/usr/bin/env bash
# Monta, na pasta atual, um curso fictício de duas aulas com a wiki já ingerida e SEM nenhum problema:
# todo conceito citado é ensinado, todo link leva a um arquivo, nenhuma página está solta, a citação vale nos dois
# sentidos. As duas aulas dão regras diferentes sobre a frequência da rega (alface todo dia, tomate dia sim, dia não),
# mas é diferença de contexto (planta), não contradição. Serve ao caso negativo de verificar a wiki.
set -euo pipefail
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base="$raiz/exemplo/horta-em-casa"
fix="$raiz/evals-fixtures/wiki-limpa"
wiki() { node "$raiz/skills/wiki-do-curso/scripts/wiki.mjs" "$@"; }
aulas="01-regando-as-mudas 02-regando-no-calor"
cp "$base/.gitignore" "$base/aula-pronta.config" .
cp -R "$base/lotes" "$base/wiki" .
mkdir aulas
cp "$base/aulas/LEIAME.md" aulas/
for a in $aulas; do
  cp -R "$fix/gravacoes/$a" aulas/
  node "$raiz/skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$a/gravacao.srt" "aulas/$a/transcricao.md" >/dev/null
done
wiki preparar >/dev/null
cp -R "$fix/aulas/." wiki/aulas/
cp -R "$fix/conceitos/." wiki/conceitos/
wiki copiar $aulas >/dev/null
for a in $aulas; do
  h="$(sha256sum "wiki/raw/$a/transcricao.md" | cut -d' ' -f1)"
  sed -i "s/^transcricao-sha256: .*/transcricao-sha256: $h/" "wiki/aulas/$a.md"
  grep -q "^transcricao-sha256: $h$" "wiki/aulas/$a.md" || { echo "montar-wiki: o hash não entrou em $a" >&2; exit 1; }
done
wiki registrar $aulas --data 2026-11-01 >/dev/null
wiki indice >/dev/null
