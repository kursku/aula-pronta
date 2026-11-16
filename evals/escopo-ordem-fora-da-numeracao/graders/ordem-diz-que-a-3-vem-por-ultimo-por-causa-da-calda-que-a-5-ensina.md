---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*3[.)](?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Calda de sabão)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Aula 5)'
flags: i
---
