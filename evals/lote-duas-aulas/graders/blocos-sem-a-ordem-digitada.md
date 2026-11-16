---
type: regex
target:
  source: file
  path: lotes/lote-01-02.1.md
flags: m
match: not_contains
pattern: '^#+[ \t]*Aula 2\.1\b[\s\S]*^#+[ \t]*Aula 1\b'
---
