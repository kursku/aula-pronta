---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Próximas aulas a gravar(?:(?!\n## )[\s\S])*?\n(?:#{3,4}\s|\d+[.)]\s)(?![^\n]*Composto)'
match: not_contains
flags: i
---
