---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Próximas aulas a gravar(?=(?:(?!\n## )[\s\S])*?Composto)(?=(?:(?!\n## )[\s\S])*?01:04)(?=(?:(?!\n## )[\s\S])*?02:24)'
flags: i
---
