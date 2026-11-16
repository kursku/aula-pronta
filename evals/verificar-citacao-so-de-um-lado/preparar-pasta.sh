#!/usr/bin/env bash
set -euo pipefail
caso="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
bash "$caso/../../evals-fixtures/montar-wiki-tres-aulas.sh"
# Só nesta cópia: o conceito Húmus de minhoca perde a linha da aula 5, e a aula 5 perde o Excesso de adubo em "só cita".
sed -i '/^- \[Aula 5: Folhas amarelas e pragas\]/d' wiki/conceitos/humus-de-minhoca.md
! grep -q '05-folhas-amarelas-e-pragas' wiki/conceitos/humus-de-minhoca.md || { echo 'preparar-pasta: a linha da aula 5 continua no húmus' >&2; exit 1; }
sed -i '/^- \[Excesso de adubo\](..\/conceitos\/excesso-de-adubo.md) \[00:42\]/d' wiki/aulas/05-folhas-amarelas-e-pragas.md
! grep -q '^- \[Excesso de adubo\]' wiki/aulas/05-folhas-amarelas-e-pragas.md || { echo 'preparar-pasta: o excesso de adubo continua na aula 5' >&2; exit 1; }
grep -q 'Excesso de adubo' wiki/conceitos/excesso-de-adubo.md || { echo 'preparar-pasta: o conceito sumiu' >&2; exit 1; }
