---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*\d+[.)][\s*\[]*(?:[Aa]s? )?Aulas? (?:3|5)\b'
match: not_contains
---
