---
type: regex
target:
  source: file
  path: .gitignore
flags: m
match: not_contains
pattern: '^transcricao\.md\r?$[\s\S]*^transcricao\.md\r?$'
---
