---
type: regex
target:
  source: file
  path: aulas/01-luz-e-agua/material.html
flags: i
match: not_contains
pattern: '<script|<tag>|<b>negrito'
---
