---
type: regex
target:
  source: file
  path: wiki/escopo.md
pattern: '\n## Lacunas(?:(?!\n## )[\s\S])*?conceitos/(?!composto\.md)'
match: not_contains
---
