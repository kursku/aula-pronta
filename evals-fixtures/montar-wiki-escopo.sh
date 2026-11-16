#!/usr/bin/env bash
# Monta, na pasta atual, a wiki do curso de exemplo para os casos do escopo. Uso: montar-wiki-escopo.sh <variante>
#   exemplo       aulas 3 a 5 ingeridas (a contradição da adubação e a lacuna do composto já vêm do curso de exemplo)
#   ordem         a Aula 3 cita a Calda de sabão, que só a Aula 5 ensina: a ordem de assistir sai 4, 5, 3
#   ciclo         além disso a Aula 5 cita a Muda, que só a Aula 3 ensina: as aulas 3 e 5 se usam uma à outra
#   ciclo-professor  como o ciclo, mas a Aula 4 também ensina a Muda: a Aula 5 fica pronta depois da 4, a ordem sai 4, 5, 3 e não há ciclo
#   dado-solto    a Aula 5 lista a Muda em "só cita", mas a página da Muda não lista a Aula 5 (dado que não bate)
#   quarta-aula   a Aula 6 já ingerida (bloco 2) e um escopo.md da execução anterior, com uma anotação à mão
#   vazia         pasta do curso sem nenhuma aula na wiki (só o LEIAME.md)
# Os planos são só nesta cópia: o curso de exemplo do repositório não muda. O escopo lê as páginas da wiki, não a
# transcrição, então a citação plantada vive só nas páginas.
set -euo pipefail
raiz="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
base="$raiz/exemplo/horta-em-casa"
wiki() { node "$raiz/skills/wiki-do-curso/scripts/wiki.mjs" "$@"; }
planta() { grep -q "$2" "$1" || { echo "montar-wiki-escopo: não plantou em $1" >&2; exit 1; }; }
variante="${1:?uso: montar-wiki-escopo.sh <exemplo|ordem|ciclo|ciclo-professor|dado-solto|quarta-aula|vazia>}"
case "$variante" in
  exemplo|ordem|ciclo|ciclo-professor|dado-solto|quarta-aula|vazia) ;;
  *) echo "montar-wiki-escopo: variante desconhecida \"$variante\" (use exemplo, ordem, ciclo, ciclo-professor, dado-solto, quarta-aula ou vazia)" >&2; exit 1 ;;
esac

if [ "$variante" = vazia ]; then
  cp "$base/.gitignore" "$base/aula-pronta.config" .
  cp -R "$base/lotes" "$base/wiki" .
  mkdir aulas
  cp "$base/aulas/LEIAME.md" aulas/
  exit 0
fi

bash "$raiz/evals-fixtures/montar-wiki-tres-aulas.sh"

if [ "$variante" = ordem ] || [ "$variante" = ciclo ] || [ "$variante" = ciclo-professor ]; then
  sed -i '/^## Conceitos que só cita$/{n;s/^Nenhum\.$/- [Calda de sabão](..\/conceitos\/calda-de-sabao.md) [03:30]: aparece de passagem, como o que se usa se a muda for atacada por praga./}' wiki/aulas/03-plantando-as-mudas.md
  planta wiki/aulas/03-plantando-as-mudas.md 'calda-de-sabao.md) \[03:30\]'
  sed -i '/^- \[Aula 5: /i - [Aula 3: Plantando as mudas](../aulas/03-plantando-as-mudas.md) [03:30]: cita' wiki/conceitos/calda-de-sabao.md
  planta wiki/conceitos/calda-de-sabao.md 'Aula 3: Plantando as mudas.*\[03:30\]: cita'
fi

if [ "$variante" = ciclo ] || [ "$variante" = ciclo-professor ]; then
  sed -i '/^## Conceitos que só cita$/a - [Muda](../conceitos/muda.md) [02:50]: lembra que a muda sadia aguenta melhor a praga.' wiki/aulas/05-folhas-amarelas-e-pragas.md
  planta wiki/aulas/05-folhas-amarelas-e-pragas.md 'muda.md) \[02:50\]'
  sed -i '/^- \[Aula 3: .*: ensina$/a - [Aula 5: Folhas amarelas e pragas](../aulas/05-folhas-amarelas-e-pragas.md) [02:50]: cita' wiki/conceitos/muda.md
  planta wiki/conceitos/muda.md 'Aula 5: Folhas amarelas e pragas.*\[02:50\]: cita'
fi

if [ "$variante" = ciclo-professor ]; then
  sed -i '/^## Conceitos que ensina$/a - [Muda](../conceitos/muda.md) [03:10]: Depois do plantio, a muda só recebe adubo quando já pegou no canteiro.' wiki/aulas/04-adubando-a-horta.md
  planta wiki/aulas/04-adubando-a-horta.md 'muda.md) \[03:10\]'
  sed -i '/^- \[Aula 3: .*: ensina$/a - [Aula 4: Adubando a horta](../aulas/04-adubando-a-horta.md) [03:10]: ensina' wiki/conceitos/muda.md
  planta wiki/conceitos/muda.md 'Aula 4: Adubando a horta.*\[03:10\]: ensina'
fi

if [ "$variante" = dado-solto ]; then
  sed -i '/^## Conceitos que só cita$/a - [Muda](../conceitos/muda.md) [02:50]: lembra que a muda sadia aguenta melhor a praga.' wiki/aulas/05-folhas-amarelas-e-pragas.md
  planta wiki/aulas/05-folhas-amarelas-e-pragas.md 'muda.md) \[02:50\]'
  ! grep -q 'Aula 5' wiki/conceitos/muda.md || { echo 'montar-wiki-escopo: a página da Muda já lista a Aula 5' >&2; exit 1; }
fi

if [ "$variante" = quarta-aula ]; then
  a=06-colhendo-no-ponto
  mkdir "aulas/$a"
  cp "$raiz/evals-fixtures/quarta-aula/$a/gravacao.srt" "aulas/$a/"
  node "$raiz/skills/pos-gravacao/scripts/srt-para-transcricao.mjs" "aulas/$a/gravacao.srt" "aulas/$a/transcricao.md" >/dev/null
  cp "$raiz/evals-fixtures/wiki-escopo-quarta-aula/aulas/$a.md" wiki/aulas/
  cp "$raiz/evals-fixtures/wiki-escopo-quarta-aula/conceitos/"*.md wiki/conceitos/
  wiki copiar "$a" >/dev/null
  h="$(sha256sum "wiki/raw/$a/transcricao.md" | cut -d' ' -f1)"
  sed -i "s/^transcricao-sha256: .*/transcricao-sha256: $h/" "wiki/aulas/$a.md"
  planta "wiki/aulas/$a.md" "^transcricao-sha256: $h\$"
  sed -i '/^- \[Aula 3: .*: ensina$/a - [Aula 6: Colhendo no ponto](../aulas/06-colhendo-no-ponto.md) [01:57]: cita' wiki/conceitos/muda.md
  planta wiki/conceitos/muda.md 'Aula 6: Colhendo no ponto.*\[01:57\]: cita'
  sed -i '/^- \[Aula 4: .*: ensina$/a - [Aula 6: Colhendo no ponto](../aulas/06-colhendo-no-ponto.md) [01:57]: cita' wiki/conceitos/adubo-organico.md
  planta wiki/conceitos/adubo-organico.md 'Aula 6: Colhendo no ponto.*\[01:57\]: cita'
  wiki registrar "$a" --data 2026-11-02 >/dev/null
  # O escopo da execução anterior (só com as aulas 3 a 5), com uma anotação escrita à mão que a nova execução não pode manter.
  cp "$raiz/evals-fixtures/wiki-escopo-quarta-aula/escopo-anterior.md" wiki/escopo.md
  planta wiki/escopo.md 'sobre poda'
fi

wiki indice >/dev/null
