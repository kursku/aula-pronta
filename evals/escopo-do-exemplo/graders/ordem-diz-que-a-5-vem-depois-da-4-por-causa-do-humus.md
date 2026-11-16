---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?:(?!\n## )[\s\S])*?\n\s*3[.)](?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?Aula 4)(?=(?:(?!\n\s*\d+[.)]|\n## )[\s\S]){0,500}?(?:Húmus|Excesso de adubo))'
flags: i
---
