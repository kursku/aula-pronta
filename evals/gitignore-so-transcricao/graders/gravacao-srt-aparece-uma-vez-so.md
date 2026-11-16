---
type: regex
target:
  source: file
  path: .gitignore
flags: m
match: not_contains
pattern: '^gravacao\.srt\r?$[\s\S]*^gravacao\.srt\r?$'
---
