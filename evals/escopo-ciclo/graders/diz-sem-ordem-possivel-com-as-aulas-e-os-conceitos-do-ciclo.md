---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Ordem de assistir(?=(?:(?!\n## )[\s\S])*?(?:[Ss]em ordem poss|[Cc]iclo))(?=(?:(?!\n## )[\s\S])*?Aula 3)(?=(?:(?!\n## )[\s\S])*?Aula 5)(?=(?:(?!\n## )[\s\S])*?Calda de sabão)(?=(?:(?!\n## )[\s\S])*?\bMuda\b)'
flags: i
---
