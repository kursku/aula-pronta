---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Dados que não bateram(?=(?:(?!\n## )[\s\S])*?Aula 5)(?=(?:(?!\n## )[\s\S])*?\bMuda\b)'
flags: i
---
