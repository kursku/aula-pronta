---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*2[.)][^\n]*?Aula 5\b(?=[^\n]*?\bMuda\b)(?=[^\n]*?Aula 4\b)'
---
