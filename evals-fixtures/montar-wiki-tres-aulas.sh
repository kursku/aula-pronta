#!/usr/bin/env bash
# Monta, na pasta atual, o curso de exemplo com as aulas 3 a 5 já ingeridas na wiki (bloco 1, 2026-11-01).
# Serve aos casos de verificar a wiki: a contradição (frequência da adubação, aulas 4 e 5) e a lacuna (composto)
# já vêm do curso de exemplo. Cada caso planta o resto (link quebrado, página solta...) depois, só nesta cópia.
set -euo pipefail
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base="$raiz/exemplo/horta-em-casa"
wiki() { node "$raiz/skills/wiki-do-curso/scripts/wiki.mjs" "$@"; }
conv() { node "$raiz/skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$1/gravacao.srt" "aulas/$1/transcricao.md" >/dev/null; }
aulas="03-plantando-as-mudas 04-adubando-a-horta 05-folhas-amarelas-e-pragas"
cp "$base/.gitignore" "$base/aula-pronta.config" .
cp -R "$base/lotes" "$base/wiki" .
mkdir aulas
cp "$base/aulas/LEIAME.md" aulas/
for a in $aulas; do cp -R "$base/aulas/$a" aulas/; conv "$a"; done
wiki preparar >/dev/null
cp -R "$raiz/evals-fixtures/wiki-tres-aulas/aulas/." wiki/aulas/
cp -R "$raiz/evals-fixtures/wiki-tres-aulas/conceitos/." wiki/conceitos/
wiki copiar $aulas >/dev/null
# As páginas prontas atestam a transcrição de que saíram: o hash da cópia entra no cabeçalho.
for a in $aulas; do
  h="$(sha256sum "wiki/raw/$a/transcricao.md" | cut -d' ' -f1)"
  sed -i "s/^transcricao-sha256: .*/transcricao-sha256: $h/" "wiki/aulas/$a.md"
  grep -q "^transcricao-sha256: $h$" "wiki/aulas/$a.md" || { echo "montar-wiki: o hash não entrou em $a" >&2; exit 1; }
done
wiki registrar $aulas --data 2026-11-01 >/dev/null
wiki indice >/dev/null
