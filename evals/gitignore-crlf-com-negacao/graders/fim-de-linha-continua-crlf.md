---
type: regex
target:
  source: file
  path: .gitignore
match: not_contains
pattern: '(?<!\r)\n'
---
