---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '(?:\n## Lacunas|\n## Próximas aulas a gravar)(?:(?!\n## )[\s\S])*?(?:Ponto de colheita|Colheita d[ao])'
match: not_contains
---
