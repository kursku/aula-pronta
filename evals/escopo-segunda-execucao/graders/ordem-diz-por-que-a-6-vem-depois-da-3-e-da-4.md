---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*4[.)](?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Aula 6)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?\bMuda\b)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Aula 3)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Adubo org)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Aula 4)'
flags: i
---
