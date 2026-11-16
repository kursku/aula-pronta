---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?[Ss]em ordem poss'
match: not_contains
flags: i
---
