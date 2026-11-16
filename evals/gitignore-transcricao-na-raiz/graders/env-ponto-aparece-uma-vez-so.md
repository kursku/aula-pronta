---
type: regex
target:
  source: file
  path: .gitignore
flags: m
match: not_contains
pattern: '^\.env\.\*\r?$[\s\S]*^\.env\.\*\r?$'
---
