---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*3[.)](?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?\bMuda\b)'
match: not_contains
flags: i
---
