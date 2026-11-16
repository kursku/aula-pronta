---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Próximas aulas a gravar(?:(?!\n## )[\s\S])*?(?:Pulgão|Calda de sabão|Transplante|Espaçamento|Inspeção da horta)'
match: not_contains
---
